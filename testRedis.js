// test-redis.js
const { createClient } = require("redis");

const client = createClient({ url: "redis://192.168.1.17:6379" });

client.connect().then(() => {
  console.log("✅ Connected to Redis!");
  return client.ping();
}).then((pong) => {
  console.log("Redis responded:", pong);
  client.quit();
}).catch((err) => {
  console.error("❌ Failed to connect to Redis:", err);
});
