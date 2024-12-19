import React from "react";

const RecordedVideos = ({ recordedBlob, processedVideoURL }) => {
  return (
    <div>
      {recordedBlob && (
        <div className="video">
          <h3>Recorded Video:</h3>
          <video autoPlay controls style={{ width: "400px" }}>
            <source src={URL.createObjectURL(recordedBlob)} type="video/webm" />
            Your browser does not support the video tag.
          </video>
        </div>
      )}
      {processedVideoURL && (
        <div>
          <h3>Processed Video:</h3>
          <video controls style={{ width: "400px" }}>
            <source src={processedVideoURL} type="video/webm" />
            Your browser does not support the video tag.
          </video>
        </div>
      )}
    </div>
  );
};

export default RecordedVideos;
