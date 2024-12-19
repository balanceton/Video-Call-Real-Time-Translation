import React from "react";
import Button from "@material-ui/core/Button";

const CallNotifications = ({ receivingCall, name, answerCall }) => {
  return (
    <div>
      {receivingCall && (
        <div className="caller">
          <h1>{name} is calling...</h1>
          <Button variant="contained" color="primary" onClick={answerCall}>
            Answer
          </Button>
        </div>
      )}
    </div>
  );
};

export default CallNotifications;
