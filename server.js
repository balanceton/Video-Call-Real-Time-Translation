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
	socket.emit("me", socket.id);

	socket.on("disconnect", () => {
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

	socket.on("requestToken", () => {
		if (tokenOwner === null || tokenOwner === socket.id) {
			tokenOwner = socket.id;
			io.emit("tokenUpdated", { tokenOwner });
		}
	});

	socket.on("releaseToken", () => {
		if (socket.id === tokenOwner) {
			tokenOwner = null; 
			io.emit("tokenUpdated", { tokenOwner: null });
		}
	});
});

server.listen(5000, () => console.log("server is running on port 5000"))
