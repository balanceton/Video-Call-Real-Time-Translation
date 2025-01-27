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


const socket = io.connect("https://192.168.1.107:8080", {
  secure: true,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 60000,
  pingTimeout: 30000,
  pingInterval: 5000,
  rejectUnauthorized: false
});

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
  const [translatedText, setTranslatedText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [remoteTranslatedText, setRemoteTranslatedText] = useState("");

  const [transferProgress, setTransferProgress] = useState(0);
  const [transferError, setTransferError] = useState(null);

  const myVideo = useRef();
  const userVideo = useRef();
  const connectionRef = useRef();
  const recordedChunksRef = useRef([]);
  const mediaRecorderRef = useRef(null);

  // ** Start Recording Logic **
  const startRecording = useCallback(() => {
    if (stream) {
      recordedChunksRef.current = []; // Her kayıt başlangıcında temizle
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      recorder.start();
      console.log("Recording started");
    } else {
      console.error("No stream available to record.");
    }
  }, [stream]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      // onstop handler'ı burada tanımlayalım
      mediaRecorderRef.current.onstop = () => {
        if (recordedChunksRef.current.length > 0) {
          const blob = new Blob(recordedChunksRef.current, { type: "video/webm" });
          setRecordedBlob(blob);

          const sendVideoToPipeline = async (videoBlob) => {
            try {
              const formData = new FormData();
              formData.append("file", videoBlob, "recorded_video.webm");
              const apiLanguage = language_mapping[selectedLanguage] || "en";
              formData.append("language", apiLanguage);

              const response = await fetch(
                "https://192.168.1.107:8080/process_video/",
                {
                  method: "POST",
                  body: formData,
                  mode: "cors",
                  credentials: "include",
                  headers: {
                    "Accept": "application/json",
                  },
                }
              );

              if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
              }

              if (response.ok) {
                const translatedText = response.headers.get("X-Translated-Text");
                console.log("Received translated text:", translatedText);
                setTranslatedText(translatedText);

                const blob = await response.blob();
                const videoURL = URL.createObjectURL(blob);
                setProcessedVideoURL(videoURL);
                console.log("Processed video URL:", videoURL);

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
                  let targetId;
                  if (receivingCall) {
                    targetId = callFrom;
                  } else {
                    targetId = idToCall;
                  }
                  console.log("Video gönderiliyor - Hedef:", targetId, "Gönderen:", me);
                  const chunkSize = 256 * 1024;
                  const chunks = Math.ceil(base64data.length / chunkSize);

                  console.log(`Video ${chunks} parçada gönderilecek. Toplam boyut: ${base64data.length} bytes`);

                  socket.emit("startVideoTransfer", {
                    to: targetId,
                    totalChunks: chunks,
                    from: me
                  });

                  socket.emit("sendTranslatedText", {
                    to: targetId,
                    text: translatedText,
                    from: me
                  });

                  for (let i = 0; i < chunks; i++) {
                    const chunk = base64data.slice(i * chunkSize, (i + 1) * chunkSize);

                    socket.emit("sendVideoChunk", {
                      to: targetId,
                      chunk: chunk,
                      chunkIndex: i,
                      totalChunks: chunks,
                      from: me
                    });

                    console.log(`Chunk ${i + 1}/${chunks} gönderildi`);

                  }
                };
                reader.readAsDataURL(blob);
              }
            } catch (error) {
              console.error("Video işleme/gönderme hatası:", error);
            }
          };

          sendVideoToPipeline(blob);
          recordedChunksRef.current = []; // Chunks'ları temizle
        }
      };
    }
  }, [receivingCall, caller, idToCall, me, selectedLanguage]);

  useEffect(() => {
    let reconnectTimeout;

    socket.on("connect", () => {
      console.log("Socket.io bağlantısı kuruldu");
      clearTimeout(reconnectTimeout);
    });

    socket.on("disconnect", () => {
      console.log("Socket.io bağlantısı koptu");
      reconnectTimeout = setTimeout(() => {
        console.log("Yeniden bağlanmaya çalışılıyor...");
        socket.connect();
      }, 1000);
    });

    socket.on("connect_error", (error) => {
      console.error("Bağlantı hatası:", error);
    });

    socket.on("videoTransferError", ({ error }) => {
      console.error("Video transfer hatası:", error);
      setTransferError(error);
    });

    socket.on("receiveTranslatedText", ({ text, from }) => {
      console.log(`Text alındı - Gönderen: ${from}, Text: ${text}`);
      setRemoteTranslatedText(text);
    });

    return () => {
      clearTimeout(reconnectTimeout);
      socket.off("connect");
      socket.off("disconnect");
      socket.off("connect_error");
      socket.off("videoTransferError");
      socket.off("receiveTranslatedText");
    }
  }, [me, receivingCall]);
  // ** UseEffect to start recording when tokenOwner matches me **
  useEffect(() => {
    if (tokenOwner === me && !isRecording) {
      startRecording();
    } else if (tokenOwner !== me && isRecording) {
      stopRecording();
    }
  }, [tokenOwner, me, isRecording, startRecording, stopRecording]);

  const tokenActionsProps = {
    tokenOwner,
    me,
    socket,
    onReleaseToken: () => {
      stopRecording();
      socket.emit("releaseToken", { ownerId: me });
    }
  };

  // ** Handle incoming stream mute toggle **
  useEffect(() => {
    if (stream) {
      stream.getAudioTracks()[0].enabled = tokenOwner === me;
    }
  }, [tokenOwner, me, stream]);

  // ** Socket IO Logic **
  useEffect(() => {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .then((stream) => {
          setStream(stream);
          myVideo.current.srcObject = stream;
        })
        .catch((error) => {
          console.error("Error accessing media devices:", error);
        });
    } else {
      console.error("getUserMedia is not supported in this browser.");
    }

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
      console.log(`Video alındı - Gönderen: ${from}`);
      if (!videoData) {
        console.error("Video data boş!");
        return;
      }
      console.log("Benim ID'm:", me);
      console.log("Arayan mıyım?", !receivingCall);
      console.log("Video data uzunluğu:", videoData?.length);

      try {
        // Buffer boyutu kontrolü
        const maxBufferSize = 50 * 1024 * 1024; // 50MB
        if (videoData.length > maxBufferSize) {
          console.error("Video boyutu çok büyük!");
          return;
        }

        // Base64 formatı kontrolü
        if (!videoData.startsWith('data:')) {
          videoData = 'data:video/webm;base64,' + videoData;
        }
        const byteString = atob(videoData.split(',')[1]);
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) {
          ia[i] = byteString.charCodeAt(i);
        }
        const blob = new Blob([ab], { type: 'video/webm' });
        if (blob.size === 0) {
          console.error("Oluşturulan blob boş!");
          return;
        }
        const newVideoURL = URL.createObjectURL(blob);

        if (remoteProcessedVideoURL) {
          URL.revokeObjectURL(remoteProcessedVideoURL);
        }
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
  }, [me, receivingCall, remoteProcessedVideoURL]);

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
              translatedText={translatedText}
              remoteTranslatedText={remoteTranslatedText}
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
            <TokenActions {...tokenActionsProps} />
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