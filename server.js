const fs = require("fs");
const https = require("https");
const express = require("express")
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
		origin: [
			"https://192.168.1.107:3000",
			"https://192.168.1.107:5000",
			"http://localhost:3000",
			"http://localhost:5000",
			"http://127.0.0.1:3000",
			"http://127.0.0.1:5000"
		], methods: ["GET", "POST"],
		credentials: true
	}
});

let tokenOwner = null;
const videoChunks = new Map(); // Her bağlantı için chunk'ları saklar
const transferTimeouts = new Map();

io.on("connection", (socket) => {
	console.log("Yeni bağlantı:", socket.id);

	socket.emit("me", socket.id);

	socket.on("startVideoTransfer", ({ to, totalChunks, from }) => {
		const key = `${from}_${to}`;
		videoChunks.set(key, new Array(totalChunks));

		// 30 saniye timeout
		const timeout = setTimeout(() => {
			if (videoChunks.has(key)) {
				videoChunks.delete(key);
				console.log(`Transfer timeout: ${key}`);
				io.to(to).emit("videoTransferError", { error: "Transfer timeout" });
			}
		}, 30000);

		transferTimeouts.set(key, timeout);
	});

	socket.on("disconnect", () => {
		console.log("Bağlantı koptu:", socket.id);
		if (socket.id === tokenOwner) {
			tokenOwner = null;
			io.emit("tokenUpdated", { tokenOwner: null });
		}

		for (const [key, timeout] of transferTimeouts) {
			if (key.includes(socket.id)) {
				clearTimeout(timeout);
				transferTimeouts.delete(key);
				videoChunks.delete(key);
			}
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

	socket.on("sendTranslatedText", ({ to, text, from }) => {
		console.log(`Text transfer başladı: ${from} -> ${to}`);
		io.to(to).emit("receiveTranslatedText", { text, from });
		console.log("Text transfer tamamlandı");
	});

	socket.on("sendVideoChunk", ({ to, chunk, chunkIndex, totalChunks, from }) => {
		const key = `${from}_${to}`;

		if (!videoChunks.has(key)) {
			console.log(`Video transfer başlatılmamış: ${key}`);
			return;
		}

		const chunks = videoChunks.get(key);
		chunks[chunkIndex] = chunk;

		// Progress kontrolü
		const receivedChunks = chunks.filter(c => c !== undefined).length;
		const progress = (receivedChunks / totalChunks) * 100;

		console.log(`Transfer progress: ${progress.toFixed(2)}% (${receivedChunks}/${totalChunks})`);

		// Tüm chunk'lar geldi mi kontrol et
		if (!chunks.includes(undefined)) {
			clearTimeout(transferTimeouts.get(key));
			transferTimeouts.delete(key);

			const completeVideo = chunks.join('');
			io.to(to).emit("receiveProcessedVideo", {
				videoData: completeVideo,
				from: from
			});

			videoChunks.delete(key);
			console.log(`Video transfer tamamlandı: ${key}`);
		}
	});

	socket.on("sendProcessedVideo", ({ to, videoData, from }) => {
		console.log(`Video transfer başladı: ${from} -> ${to}`);
		console.log("Video data boyutu:", videoData.length);
		io.to(to).emit("receiveProcessedVideo", { videoData, from });

		console.log("Video transfer tamamlandı");
	});
});

server.listen(5000, "192.168.1.107", () => {
	console.log("HTTPS server is running on https://192.168.1.107:5000");
});