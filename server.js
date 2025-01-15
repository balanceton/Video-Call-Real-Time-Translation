const express = require("express")
const http = require("http")
const app = express()
const server = http.createServer(app)
const io = require("socket.io")(server, {
  cors: {
		origin: "http://localhost:3000",
		methods: [ "GET", "POST" ]
	}
})

let tokenOwner = null;

io.on("connection", (socket) => {
  console.log("Yeni bağlantı:", socket.id);

  socket.emit("me", socket.id);

  socket.on("disconnect", () => {
    console.log("Bağlantı koptu:", socket.id);
    if (socket.id === tokenOwner) {
      tokenOwner = null;
      io.emit("tokenUpdated", { tokenOwner: null });
    }
    socket.broadcast.emit("callEnded");
  });

  socket.on("callUser", (data) => {
		io.to(data.userToCall).emit("callUser", { signal: data.signalData, from: data.from, name: data.name });
  });

  socket.on("answerCall", (data) => {
    io.to(data.to).emit("callAccepted", data.signal);
  });

  socket.on("requestToken", ({ requesterId }) => {
    if (!tokenOwner) {
      tokenOwner = requesterId;
      io.emit("tokenUpdated", { tokenOwner });
    }
  });

  socket.on("releaseToken", ({ ownerId }) => {
    if (tokenOwner === ownerId) {
      tokenOwner = null;
      io.emit("tokenUpdated", { tokenOwner: null });
    }
  });

  socket.on("sendProcessedVideo", ({ to, videoData, from }) => {
    console.log("Video transfer isteği:");
    console.log("Gönderen:", from);
    console.log("Alıcı:", to);

    io.to(to).emit("receiveProcessedVideo", { videoData, from });
  });
});

server.listen(5000, () => console.log("server is running on port 5000"))
