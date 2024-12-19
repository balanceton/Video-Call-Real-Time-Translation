import React from "react";
import { CopyToClipboard } from "react-copy-to-clipboard";
import TextField from "@material-ui/core/TextField";
import Button from "@material-ui/core/Button";
import AssignmentIcon from "@material-ui/icons/Assignment";

const MyId = ({ me, name, setName, idToCall, setIdToCall, callUser, callAccepted, callEnded, leaveCall }) => {
  return (
    <div className="myId">
      <TextField
        label="Name"
        variant="filled"
        value={name}
        onChange={(e) => setName(e.target.value)}
        style={{ marginBottom: "20px" }}
      />
      <CopyToClipboard text={me} style={{ marginBottom: "2rem" }}>
        <Button variant="contained" color="primary" startIcon={<AssignmentIcon fontSize="large" />}>
          Copy ID
        </Button>
      </CopyToClipboard>
      <TextField
        label="ID to call"
        variant="filled"
        value={idToCall}
        onChange={(e) => setIdToCall(e.target.value)}
      />
      <div className="call-button">
        {callAccepted && !callEnded ? (
          <Button variant="contained" color="secondary" onClick={leaveCall}>
            End Call
          </Button>
        ) : (
          <Button variant="contained" color="primary" onClick={() => callUser(idToCall)}>
            Call
          </Button>
        )}
      </div>
    </div>
  );
};

export default MyId;
