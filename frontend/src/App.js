import React, { useEffect, useRef, useState, useCallback } from "react";
import Peer from "simple-peer";
import io from "socket.io-client";
import VideoContainer from "./components/VideoContainer";
import MyId from "./components/MyId";
import CallNotifications from "./components/CallNotifications";
import TokenActions from "./components/TokenActions";
import RecordedVideos from "./components/RecordedVideos";
import "./App.css";

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

  // ** Stop Recording Logic **
  const stopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.onstop = () => {
        if (recordedChunks.length > 0) {
          const blob = new Blob(recordedChunks, { type: "video/webm" });

          // Free old blob URL if exists
          if (recordedBlob) {
            URL.revokeObjectURL(URL.createObjectURL(recordedBlob));
          }

          setRecordedBlob(blob);

          // Send recorded video to server
          const sendVideoToPipeline = async (videoBlob) => {
            const formData = new FormData();
            formData.append("file", videoBlob, "recorded_video.webm");

            try {
              const response = await fetch(
                "https://a0f2-34-124-178-241.ngrok-free.app/process_video/",
                {
                  method: "POST",
                  body: formData,
                  mode: "cors",
                }
              );

              if (response.ok) {
                const videoURL = URL.createObjectURL(await response.blob());
                setProcessedVideoURL(videoURL);
              } else {
                console.error("Error processing video:", await response.text());
              }
            } catch (error) {
              console.error("Error uploading video:", error);
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

    socket.on("me", (id) => setMe(id));

    socket.on("callUser", (data) => {
      setReceivingCall(true);
      setCaller(data.from);
      setName(data.name);
      setCallerSignal(data.signal);
    });

    socket.on("tokenUpdated", (data) => {
      setTokenOwner(data.tokenOwner);
    });
  }, []);

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
        <VideoContainer
          myVideo={myVideo}
          userVideo={userVideo}
          stream={stream}
          callAccepted={callAccepted}
          callEnded={callEnded}
        />
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
        <CallNotifications receivingCall={receivingCall} name={name} answerCall={answerCall} />
        <TokenActions tokenOwner={tokenOwner} me={me} socket={socket} stopRecording={stopRecording} />
        <RecordedVideos recordedBlob={recordedBlob} processedVideoURL={processedVideoURL} />
      </div>
    </>
  );
}

export default App;
