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
  const [callFrom, setCallFrom] = useState("");


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
    if (mediaRecorder) {
      mediaRecorder.onstop = () => {
        if (recordedChunks.length > 0) {
          const blob = new Blob(recordedChunks, { type: "video/webm" });
          setRecordedBlob(blob);

          const sendVideoToPipeline = async (videoBlob) => {
            try {
              const formData = new FormData();
              formData.append("file", videoBlob, "recorded_video.webm");
              const apiLanguage = language_mapping[selectedLanguage] || "en";
              formData.append("language", apiLanguage);

              const response = await fetch(
                "https://421b-35-234-14-117.ngrok-free.app/process_video/",
                {
                  method: "POST",
                  body: formData,
                  mode: "cors",
                }
              );

              if (response.ok) {
                const blob = await response.blob();
                const videoURL = URL.createObjectURL(blob);
                setProcessedVideoURL(videoURL);

                const reader = new FileReader();
                reader.onloadend = () => {
                  const base64data = reader.result;
                  
                  // Debug için detaylı loglar
                  console.log("Video göndermeye hazırlanıyor...");
                  console.log("Benim ID'm:", me);
                  console.log("Arayan mıyım?", !receivingCall);
                  console.log("Caller ID:", caller);
                  console.log("CallFrom:", callFrom);
                  console.log("IdToCall:", idToCall);

                  // Hedef ID'yi belirle
                  let targetId;
                  if (receivingCall) {
                    // Eğer ben aranan tarafsam, arayana gönder
                    targetId = caller;
                    console.log("Aranan taraf olarak gönderiliyor. Hedef:", targetId);
                  } else {
                    // Eğer ben arayan tarafsam, aranana gönder
                    targetId = idToCall;
                    console.log("Arayan taraf olarak gönderiliyor. Hedef:", targetId);
                  }

                  socket.emit("sendProcessedVideo", {
                    to: targetId,
                    videoData: base64data,
                    from: me
                  });
                };
                reader.readAsDataURL(blob);
              }
            } catch (error) {
              console.error("Video işleme/gönderme hatası:", error);
            }
          };

          sendVideoToPipeline(blob);
          setRecordedChunks([]);
        }
      };
      mediaRecorder.stop();
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

    socket.on("callUser", ({ signal, from, name }) => {
      setCallFrom(from);
      setCallerName(name);
      setReceivingCall(true);
      setCaller(from);
      setCallerSignal(signal);
    });

    socket.on("tokenUpdated", (data) => {
      setTokenOwner(data.tokenOwner);
    });

    socket.on("receiveProcessedVideo", ({ videoData, from }) => {
      console.log("Video alındı!");
      console.log("Gönderen ID:", from);
      console.log("Benim ID'm:", me);
      console.log("Arayan mıyım?", !receivingCall);
      console.log("Video data uzunluğu:", videoData?.length);
      
      if (remoteProcessedVideoURL) {
        URL.revokeObjectURL(remoteProcessedVideoURL);
      }
      
      try {
        const byteString = atob(videoData.split(',')[1]);
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) {
          ia[i] = byteString.charCodeAt(i);
        }
        const blob = new Blob([ab], { type: 'video/webm' });
        const newVideoURL = URL.createObjectURL(blob);
        console.log("Yeni video URL oluşturuldu:", newVideoURL);
        setRemoteProcessedVideoURL(newVideoURL);
      } catch (error) {
        console.error("Video dönüştürme hatası:", error);
      }
    });

    return () => {
      socket.off("me");
      socket.off("callUser");
      socket.off("receiveProcessedVideo");
      socket.off("tokenUpdated");
    };
  }, [me, receivingCall]); // receivingCall'ı dependency olarak ekledik

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
    setCallFrom(caller); // Arayanın ID'sini burada da set edelim

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

    // Debug için log ekleyelim
    console.log("Çağrı yanıtlandı:");
    console.log("Benim ID'm (aranan):", me);
    console.log("Arayanın ID'si:", caller);
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
        <div style={{ display: "flex" }}>
          <div>
            <VideoContainer
              myVideo={myVideo}
              userVideo={userVideo}
              stream={stream}
              callAccepted={callAccepted}
              callEnded={callEnded}
            />
            <RecordedVideos 
              recordedBlob={recordedBlob} 
              processedVideoURL={processedVideoURL}
              remoteProcessedVideoURL={remoteProcessedVideoURL} 
            />
          </div>
          <div style={{ marginLeft: "100px", width: "400px" }}>
            <MyId
              me={me}
              name={name}
              setName={setName}
              idToCall={idToCall}
              setIdToCall={setIdToCall}
              callUser={callUser}
              callAccepted={callAccepted}
              callEnded={callEnded}
              leaveCall={leaveCall}
            />
            <TokenActions 
              tokenOwner={tokenOwner} 
              me={me} 
              socket={socket} 
              stopRecording={stopRecording} 
            />
          </div>
        </div>
        {!callAccepted && (
          <CallNotifications 
            receivingCall={receivingCall} 
            name={callerName} 
            answerCall={answerCall} 
          />
        )}
      </div>
    </>
  );
}

export default App;