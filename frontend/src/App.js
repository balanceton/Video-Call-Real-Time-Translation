import React, { useEffect, useRef, useState, useCallback } from "react";
import Peer from "simple-peer";
import io from "socket.io-client";
import VideoContainer from "./components/VideoContainer";
import MyId from "./components/MyId";
import CallNotifications from "./components/CallNotifications";
import TokenActions from "./components/TokenActions";
import RecordedVideos from "./components/RecordedVideos";
import "./App.css";
import LanguageSelector from "./components/LanguageSelector";


const language_mapping = {
  "English": "en",
  "Turkish": "tr",
  "Spanish": "es",
  "French": "fr",
  "Arabic": "ar",
  "Hindi": "hi",
  "German": "de",
};


const socket = io.connect("http://localhost:5000");

function App() {
  const [me, setMe] = useState("");
  const [stream, setStream] = useState();
  const [receivingCall, setReceivingCall] = useState(false);
  const [caller, setCaller] = useState("");
  const [callerSignal, setCallerSignal] = useState();
  const [callAccepted, setCallAccepted] = useState(false);
  const [callEnded, setCallEnded] = useState(false);
  const [idToCall, setIdToCall] = useState("");
  const [name, setName] = useState("");
  const [tokenOwner, setTokenOwner] = useState(null);
  const [recordedChunks, setRecordedChunks] = useState([]);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [processedVideoURL, setProcessedVideoURL] = useState(null);
  const [selectedLanguage, setSelectedLanguage] = useState(null); 
  const [remoteProcessedVideoURL, setRemoteProcessedVideoURL] = useState(null);
  const [callerName, setCallerName] = useState("");


  const myVideo = useRef();
  const userVideo = useRef();
  const connectionRef = useRef();

  // ** Start Recording Logic **
  const startRecording = useCallback(() => {
    if (stream) {
      const recorder = new MediaRecorder(stream);
      setMediaRecorder(recorder);

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          setRecordedChunks((prev) => [...prev, event.data]);
        }
      };

      recorder.start();
      console.log("Recording started");
    } else {
      console.error("No stream available to record.");
    }
  }, [stream]);

  const stopRecording = () => {
    console.log("Recording stopped");
    if (mediaRecorder) {
      mediaRecorder.onstop = () => {
        if (recordedChunks.length > 0) {
          const blob = new Blob(recordedChunks, { type: "video/webm" });
  
          if (recordedBlob) {
            URL.revokeObjectURL(URL.createObjectURL(recordedBlob));
          }
  
          setRecordedBlob(blob);
  
          const sendVideoToPipeline = async (videoBlob) => {
            const formData = new FormData();
            formData.append("file", videoBlob, "recorded_video.webm");
            const apiLanguage = language_mapping[selectedLanguage] || "en";
            formData.append("language", apiLanguage);
  
            try {
              console.log("Video gönderiliyor, alıcı ID:", idToCall);
              console.log("Benim ID'm:", me);
              
              const response = await fetch(
                  "https://1fb0-34-143-237-34.ngrok-free.app/process_video/",
                {
                  method: "POST",
                  body: formData,
                  mode: "cors",
                }
              );
  
              if (response.ok) {
                const blob = await response.blob();
                
                if (processedVideoURL) {
                  URL.revokeObjectURL(processedVideoURL);
                }
                const videoURL = URL.createObjectURL(blob);
                setProcessedVideoURL(videoURL);

                console.log("Video işlendi, karşı tarafa gönderiliyor...");
                socket.emit("sendProcessedVideo", {
                  to: idToCall,
                  videoBlob: blob,
                  from: me
                });
                
                console.log("Video gönderildi");
              } else {
                console.error("Video işleme hatası:", await response.text());
              }
            } catch (error) {
              console.error("Video yükleme hatası:", error);
            }
          };
  
          sendVideoToPipeline(blob);
          setRecordedChunks([]); // Clear chunks
        } else {
          console.warn("No recorded chunks available.");
        }
      };
  
      mediaRecorder.stop();
      console.log("Recording stopped");
    }
  };
  

  // ** UseEffect to start recording when tokenOwner matches me **
  useEffect(() => {
    if (tokenOwner === me) {
      startRecording();
    }
  }, [tokenOwner, me, startRecording]);

  // ** Handle incoming stream mute toggle **
  useEffect(() => {
    if (stream) {
      stream.getAudioTracks()[0].enabled = tokenOwner === me;
    }
  }, [tokenOwner, me, stream]);

  // ** Socket IO Logic **
  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((stream) => {
      setStream(stream);
      myVideo.current.srcObject = stream;
    });

    socket.on("me", (id) => {
      setMe(id);
      console.log("Benim ID'm:", id);
    });

    socket.on("callUser", (data) => {
      console.log("Arama alındı:", data);
      setReceivingCall(true);
      setCaller(data.from);
      setCallerName(data.name);
      setCallerSignal(data.signal);
    });

    socket.on("tokenUpdated", (data) => {
      setTokenOwner(data.tokenOwner);
    });

    socket.on("receiveProcessedVideo", ({ videoBlob, from }) => {
      console.log("Video alındı, gönderen ID:", from);
      console.log("Benim ID'm:", me);
      
      if (from !== me) {
        if (remoteProcessedVideoURL) {
          URL.revokeObjectURL(remoteProcessedVideoURL);
        }
        const newVideoURL = URL.createObjectURL(new Blob([videoBlob], { type: 'video/webm' }));
        setRemoteProcessedVideoURL(newVideoURL);
      }
    });

    return () => {
      socket.off("me");
      socket.off("callUser");
      socket.off("receiveProcessedVideo");
    };
  }, [caller, me, remoteProcessedVideoURL]);

  // ** Call a User **
  const callUser = (id) => {
    const peer = new Peer({
      initiator: true,
      trickle: false,
      stream: stream,
    });

    peer.on("signal", (data) => {
      socket.emit("callUser", {
        userToCall: id,
        signalData: data,
        from: me,
        name: name,
      });
    });

    peer.on("stream", (stream) => {
      userVideo.current.srcObject = stream;
    });

    socket.on("callAccepted", (signal) => {
      setCallAccepted(true);
      peer.signal(signal);
    });

    connectionRef.current = peer;
  };

  // ** Answer a Call **
  const answerCall = () => {
    setCallAccepted(true);

    const peer = new Peer({
      initiator: false,
      trickle: false,
      stream: stream,
    });

    peer.on("signal", (data) => {
      socket.emit("answerCall", { signal: data, to: caller });
    });

    peer.on("stream", (stream) => {
      userVideo.current.srcObject = stream;
    });

    peer.signal(callerSignal);
    connectionRef.current = peer;
  };

  // ** Leave a Call **
  const leaveCall = () => {
    setCallEnded(true);
    connectionRef.current.destroy();
    connectionRef.current = null;
  };

  return (
    <>
      <h1 style={{ textAlign: "center", color: "#fff" }}>Video Call</h1>
      <div className="container">
      {selectedLanguage == null && (
  <LanguageSelector
    selectedLanguage={selectedLanguage}
    setSelectedLanguage={setSelectedLanguage}
  />
)}

        <VideoContainer
          myVideo={myVideo}
          userVideo={userVideo}
          stream={stream}
          callAccepted={callAccepted}
          callEnded={callEnded}
        />
        { (<MyId
          me={me}
          name={name}
          setName={setName}
          idToCall={idToCall}
          setIdToCall={setIdToCall}
          callUser={callUser}
          callAccepted={callAccepted}
          callEnded={callEnded}
          leaveCall={leaveCall}
        /> )}
        { !callAccepted && (<CallNotifications receivingCall={receivingCall} name={callerName} answerCall={answerCall} />)}
        <TokenActions tokenOwner={tokenOwner} me={me} socket={socket} stopRecording={stopRecording} />
        <RecordedVideos 
          recordedBlob={recordedBlob} 
          processedVideoURL={processedVideoURL}
          remoteProcessedVideoURL={remoteProcessedVideoURL} 
        />
      </div>
    </>
  );
}

export default App;