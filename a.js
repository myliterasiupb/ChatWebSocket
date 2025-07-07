const http = require("http");
const fs = require("fs");
const path = require("path");
const WebSocket = require("ws");

const PORT = 3000;
const serverId = process.env.SERVER_ID || "Server-1";

const server = http.createServer((req, res) => {
  let filePath = path.join(__dirname, "public", req.url === "/" ? "index.html" : req.url);
  let extname = path.extname(filePath);
  let contentType = "text/html";

  switch (extname) {
    case ".js": contentType = "text/javascript"; break;
    case ".css": contentType = "text/css"; break;
    case ".json": contentType = "application/json"; break;
    case ".png": contentType = "image/png"; break;
    case ".jpg": contentType = "image/jpg"; break;
  }

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404);
      res.end("Not Found");
    } else {
      res.writeHead(200, { "Content-Type": contentType });
      res.end(content, "utf-8");
    }
  });
});

const wss = new WebSocket.Server({ server });
let users = [];

function broadcast(data) {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
}

wss.on("connection", (ws, req) => {
  console.log("Client connected from", req.socket.remoteAddress);
  ws.send(JSON.stringify({ type: "server_info", server: serverId }));

  ws.on("message", (message) => {
    const data = JSON.parse(message);

    if (data.type === "join") {
      ws.userId = data.userId;
      ws.username = data.username;
      users.push({ id: data.userId, username: data.username, server: serverId });
      broadcast({ type: "user_joined", users });
    } else if (data.type === "chat") {
      broadcast({
        type: "chat",
        text: data.text,
        username: ws.username,
        userId: ws.userId,
        timestamp: Date.now(),
        server: serverId
      });
    } else if (data.type === "typing") {
      broadcast({
        type: "typing",
        isTyping: data.isTyping,
        userId: ws.userId,
        username: ws.username
      });
    }
  });

  ws.on("close", () => {
    users = users.filter((u) => u.id !== ws.userId);
    broadcast({ type: "user_left", users });
  });
});

server.listen(PORT, () => {
  console.log(`${serverId} listening on port ${PORT}`);
});
