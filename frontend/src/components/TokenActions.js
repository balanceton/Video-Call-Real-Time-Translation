import React from "react";
import Button from "@material-ui/core/Button";

const TokenActions = ({ tokenOwner, me, socket, stopRecording }) => {
  return (
    <div className="button">
      {tokenOwner === me ? (
        <Button
          variant="contained"
          color="secondary"
          onClick={() => {
            socket.emit("releaseToken", { ownerId: me });
            stopRecording();
          }}
        >
          Leave Token
        </Button>
      ) : (
        <Button
          variant="contained"
          color="primary"
          onClick={() => {
            socket.emit("requestToken", { requesterId: me });
          }}
        >
          Request Token
        </Button>
      )}
    </div>
  );
};

export default TokenActions;
