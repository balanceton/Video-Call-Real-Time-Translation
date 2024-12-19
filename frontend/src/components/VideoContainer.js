import React from "react";

const VideoContainer = ({ myVideo, userVideo, stream, callAccepted, callEnded }) => {
  return (
    <div className="video-container">
      <div className="video">
        {stream && (
          <video playsInline muted ref={myVideo} autoPlay style={{ width: "400px" }} />
        )}
      </div>
      <div className="video">
        {callAccepted && !callEnded && (
          <video playsInline ref={userVideo} autoPlay style={{ width: "400px" }} />
        )}
      </div>
    </div>
  );
};

export default VideoContainer;
