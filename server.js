const fs = require("fs");
const https = require("https");
const express = require("express")
const { IP_ADDRESS, PORT_3000, PORT_5000 } = require("./constants");
const app = express()
app.get('/', (req, res) => {
	res.send('Server is running');
});
const privateKey = fs.readFileSync("server.key", "utf8");
const certificate = fs.readFileSync("server.cert", "utf8");
const credentials = { key: privateKey, cert: certificate };

const server = https.createServer(credentials, app);
const io = require("socket.io")(server, {
	cors: {
		origin: [`https://${IP_ADDRESS}:${PORT_3000}`],
		methods: ["GET", "POST"]
	}
});

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

server.listen(PORT_5000, IP_ADDRESS, () => {
	console.log(`HTTPS server is running on https://${IP_ADDRESS}:${PORT_5000}`);
});