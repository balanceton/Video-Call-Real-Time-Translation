import React, { useEffect } from "react";

const RecordedVideos = ({
  processedVideoURL,
  remoteProcessedVideoURL,
  translatedText,
  remoteTranslatedText
}) => {
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
          {translatedText && (
            <p className="translated-text text-white mt-2">{translatedText}</p>
          )}
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
          {remoteTranslatedText && (
            <p className="translated-text text-white mt-2">{remoteTranslatedText}</p>
          )}
        </div>
      )}
    </div>
  );
};

export default RecordedVideos;