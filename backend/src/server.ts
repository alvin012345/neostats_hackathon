import http from "http";
import dotenv from "dotenv";
import { Server as SocketIOServer } from "socket.io";
import { createApp } from "./app";
import { setupSocketGateway } from "./sockets/socketManager";

dotenv.config();

const port = process.env.PORT || 5000;
const app = createApp();
const server = http.createServer(app);

const allowedOrigin = process.env.CLIENT_ORIGIN || "http://localhost:3000";

export const io = new SocketIOServer(server, {
  cors: {
    origin: allowedOrigin,
    credentials: true,
  },
});

// Initialize Socket Gateway with auth, rooms, and event handlers
setupSocketGateway(io);

if (process.env.NODE_ENV !== "test") {
  server.listen(port, () => {
    console.log(`===============================================`);
    console.log(` NeoStats Backend Server running on port ${port}`);
    console.log(` Health check: http://localhost:${port}/api/health`);
    console.log(` WebSocket ready with Socket.IO`);
    console.log(`===============================================`);
  });
}

export { server };
