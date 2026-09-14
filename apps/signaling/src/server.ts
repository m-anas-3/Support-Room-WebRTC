import { createServer } from "node:http";
import { pathToFileURL } from "node:url";
import { WebSocketServer } from "ws";
import { clientMessageSchema } from "@support-room/shared";
import { RoomRegistry } from "./rooms.js";
import { send, sendError } from "./messages.js";

export function createSignalingServer(options: { allowedOrigins: string[]; roomTtlMs?: number; maxRooms?: number }) {
  const rooms = new RoomRegistry(options.roomTtlMs, options.maxRooms);
  const server = createServer((request, response) => {
    if (request.url === "/health") {
      response.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" });
      response.end(JSON.stringify({ status: "ok" }));
    } else { response.writeHead(404); response.end(); }
  });
  const wss = new WebSocketServer({ noServer: true, maxPayload: 65536, perMessageDeflate: false });

  server.on("upgrade", (request, socket, head) => {
    if (request.url !== "/signal" || !request.headers.origin || !options.allowedOrigins.includes(request.headers.origin)) {
      socket.end("HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n");
      return;
    }
    wss.handleUpgrade(request, socket, head, (client) => wss.emit("connection", client));
  });

  wss.on("connection", (socket) => {
    let alive = true;
    let count = 0;
    let windowStarted = Date.now();
    let createdRooms = 0;
    const heartbeat = setInterval(() => {
      if (!alive) return socket.terminate();
      alive = false;
      socket.ping();
    }, 30000);
    socket.on("pong", () => { alive = true; });
    socket.on("error", () => { socket.terminate(); });
    socket.on("close", () => { clearInterval(heartbeat); rooms.leave(socket); });

    socket.on("message", (data, isBinary) => {
      if (Date.now() - windowStarted > 10000) { count = 0; windowStarted = Date.now(); }
      if (++count > 100) { socket.close(1008, "Rate limit exceeded"); return; }
      if (isBinary) return sendError(socket, "INVALID_MESSAGE", "Only JSON text messages are accepted.");
      let json: unknown;
      try { json = JSON.parse(data.toString()); }
      catch { return sendError(socket, "INVALID_MESSAGE", "Invalid JSON message."); }
      const parsed = clientMessageSchema.safeParse(json);
      if (!parsed.success) return sendError(socket, "INVALID_MESSAGE", "The message does not match the signaling protocol.");
      const message = parsed.data;
      if (message.type === "create-room") {
        if (++createdRooms > 5) return sendError(socket, "ROOM_LIMIT", "Too many rooms created on this connection.");
        const created = rooms.create(message.requestId, message.reference);
        if (!created) return sendError(socket, "SERVER_BUSY", "The server is at capacity. Try again later.");
        send(socket, created);
      } else if (message.type === "join-room") rooms.join(socket, message);
      else rooms.handle(socket, message);
    });
  });
  const expiryTimer = setInterval(() => rooms.expire(), 1000);

  return {
    server,
    async listen(port = 8080, host = "127.0.0.1") {
      await new Promise<void>((resolve, reject) => {
        server.once("error", reject);
        server.listen(port, host, () => { server.removeListener("error", reject); resolve(); });
      });
    },
    async close() {
      clearInterval(expiryTimer);
      rooms.closeAll();
      for (const client of wss.clients) client.terminate();
      await new Promise<void>((resolve) => wss.close(() => resolve()));
      if (server.listening) await new Promise<void>((resolve) => server.close(() => resolve()));
    },
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const app = createSignalingServer({
    allowedOrigins: (process.env.ALLOWED_ORIGINS ?? "http://localhost:3000,http://localhost:3001,http://127.0.0.1:3000,http://127.0.0.1:3001").split(",").map((origin) => origin.trim()),
  });
  const port = Number(process.env.PORT ?? 8080);
  await app.listen(port, process.env.HOST ?? "127.0.0.1");
  console.log(`SupportRoom signaling listening on port ${port}`);
  const shutdown = () => { void app.close().then(() => process.exit(0)); };
  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}
