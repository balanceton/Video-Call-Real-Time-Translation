import React, { useEffect } from "react";

const RecordedVideos = ({ processedVideoURL, remoteProcessedVideoURL }) => {
  return (
    <div className="video-container" style={{ 
      display: "flex", 
      justifyContent: "flex-start", 
      gap: "2rem",
      marginLeft: "80px"
    }}>
      {processedVideoURL && (
        <div className="video">
          <h3 className="text-lg font-semibold mb-2 text-white">Sizin Çevrilmiş Konuşmanız:</h3>
          <video 
            key={processedVideoURL} 
            controls 
            autoPlay
            style={{ width: "400px" }}
          >
            <source src={processedVideoURL} type="video/webm" />
            Tarayıcınız video etiketini desteklemiyor.
          </video>
        </div>
      )}
      {remoteProcessedVideoURL && (
        <div className="video">
          <h3 className="text-lg font-semibold mb-2 text-white">Karşı Tarafın Çevrilmiş Konuşması:</h3>
          <video 
            key={remoteProcessedVideoURL} 
            controls 
            autoPlay
            style={{ width: "400px" }}
          >
            <source src={remoteProcessedVideoURL} type="video/webm" />
            Tarayıcınız video etiketini desteklemiyor.
          </video>
        </div>
      )}
    </div>
  );
};

export default RecordedVideos;