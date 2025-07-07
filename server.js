const http = require("http");
const fs = require("fs");
const path = require("path");
const WebSocket = require("ws");
const { createClient } = require("redis");

const PORT = 3000;
const REDIS_URL = process.env.REDIS_URL || "redis://192.168.181.81:6379";
const serverId = process.env.SERVER_ID || "Server-1";

// Static file handler
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

// Redis clients (pub and sub)
const pubClient = createClient({ url: REDIS_URL });
const subClient = pubClient.duplicate();

async function setupRedis() {
  try {
    await pubClient.connect();
    await subClient.connect();
    console.log(`[${serverId}] Connected to Redis at ${REDIS_URL}`);

    await subClient.subscribe("chat_channel", (message) => {
      const data = JSON.parse(message);
      if (data.origin !== serverId) {
        console.log(`[${serverId}] Received message from Redis:`, data);
        broadcast(data, false); // false = jangan publish ulang ke Redis
      }
    });
    console.log(`[${serverId}] Subscribed to Redis channel 'chat_channel'`);
  } catch (err) {
    console.error(`[${serverId}] Failed to connect to Redis:`, err);
  }
}

// Broadcast to local clients
function broadcast(data, publishToRedis = true) {
  console.log(`[${serverId}] Broadcasting:`, data);

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(JSON.stringify(data));
      } catch (err) {
        console.error(`[${serverId}] Error sending to client:`, err);
      }
    }
  });

  if (publishToRedis) {
    const clone = { ...data, origin: serverId };
    pubClient.publish("chat_channel", JSON.stringify(clone));
  }
}

wss.on("connection", (ws, req) => {
  console.log(`[${serverId}] Client connected from ${req.socket.remoteAddress}`);
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

setupRedis().then(() => {
  server.listen(PORT, () => {
    console.log(`[${serverId}] WebSocket server listening on port ${PORT}`);
  });
});
