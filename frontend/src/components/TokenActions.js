import React from "react";
import Button from "@material-ui/core/Button";

const TokenActions = ({ tokenOwner, me, socket, onReleaseToken }) => {
  return (
    <div className="button">
      {tokenOwner === me ? (
        <Button
          variant="contained"
          color="secondary"
          onClick={onReleaseToken}
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