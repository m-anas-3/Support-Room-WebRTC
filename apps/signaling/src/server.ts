import { createServer } from "node:http";
import { loadEnvFile } from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { WebSocket, WebSocketServer } from "ws";
import { clientMessageSchema } from "@support-room/shared";
import { RoomRegistry } from "./rooms.js";
import { send, sendError } from "./messages.js";
import { iceConfigurationFromEnv, issueIceConfiguration, type IceConfigurationOptions } from "./ice.js";
import { roomCreationAuthenticatorFromEnv, type RoomCreationAuthenticator } from "./auth.js";
import { sessionFinalizerFromEnv, type SessionFinalizer } from "./history.js";
import { createLogger, type Logger } from "./logger.js";

export function createSignalingServer(options: { allowedOrigins: string[]; authenticateRoomCreation: RoomCreationAuthenticator; finalizeSession?: SessionFinalizer; roomTtlMs?: number; maxRooms?: number; hostReconnectGraceMs?: number; iceConfiguration?: IceConfigurationOptions; logger?: Logger; revision?: string }) {
  const logger = options.logger ?? createLogger("support-room-signaling", options.revision);
  const startedAt = Date.now();
  let draining = false;
  let closeOperation: Promise<void> | null = null;
  const pendingFinalizations = new Set<Promise<void>>();
  const scheduleFinalization = options.finalizeSession ? (closure: Parameters<SessionFinalizer>[0]) => {
    const operation = Promise.resolve()
      .then(() => options.finalizeSession!(closure))
      .catch(() => logger.error("session_finalization_failed", { roomId: closure.roomId, reason: closure.reason }))
      .finally(() => pendingFinalizations.delete(operation));
    pendingFinalizations.add(operation);
  } : null;
  const iceOptions = options.iceConfiguration;
  const issuer = iceOptions
    ? (roomId: string, role: "host" | "customer") => issueIceConfiguration(iceOptions, `${roomId}:${role}`)
    : null;
  const rooms = new RoomRegistry(options.roomTtlMs, options.maxRooms, options.hostReconnectGraceMs, issuer, scheduleFinalization, (roomEvent) => {
    logger.info(roomEvent.event, roomEvent);
  });
  const server = createServer((request, response) => {
    if (request.url === "/health") {
      const status = draining ? "draining" : "ok";
      response.writeHead(draining ? 503 : 200, { "Content-Type": "application/json", "Cache-Control": "no-store" });
      response.end(JSON.stringify({
        status,
        service: "support-room-signaling",
        uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
        activeRooms: rooms.activeRoomCount,
        connections: wss.clients.size,
        ...(options.revision ? { revision: options.revision } : {}),
      }));
    } else { response.writeHead(404); response.end(); }
  });
  const wss = new WebSocketServer({ noServer: true, maxPayload: 65536, perMessageDeflate: false });

  server.on("upgrade", (request, socket, head) => {
    const rayId = headerValue(request.headers["cf-ray"]);
    if (draining) {
      logger.warn("upgrade_rejected", { reason: "draining", rayId });
      socket.end("HTTP/1.1 503 Service Unavailable\r\nConnection: close\r\n\r\n");
      return;
    }
    if (request.url !== "/signal" || !request.headers.origin || !options.allowedOrigins.includes(request.headers.origin)) {
      logger.warn("upgrade_rejected", { reason: "origin_or_path", rayId });
      socket.end("HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n");
      return;
    }
    wss.handleUpgrade(request, socket, head, (client) => wss.emit("connection", client, request));
  });

  wss.on("connection", (socket, request) => {
    const rayId = headerValue(request.headers["cf-ray"]);
    logger.info("websocket_connected", { rayId, connections: wss.clients.size });
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
    socket.on("error", () => { logger.warn("websocket_error", { rayId }); socket.terminate(); });
    socket.on("close", (code) => { clearInterval(heartbeat); rooms.leave(socket); logger.info("websocket_disconnected", { rayId, code, connections: wss.clients.size }); });

    socket.on("message", async (data, isBinary) => {
      if (Date.now() - windowStarted > 10000) { count = 0; windowStarted = Date.now(); }
      if (++count > 100) { logger.warn("message_rate_limited", { rayId }); socket.close(1008, "Rate limit exceeded"); return; }
      if (isBinary) { logger.warn("invalid_message", { rayId, reason: "binary" }); return sendError(socket, "INVALID_MESSAGE", "Only JSON text messages are accepted."); }
      let json: unknown;
      try { json = JSON.parse(data.toString()); }
      catch { logger.warn("invalid_message", { rayId, reason: "json" }); return sendError(socket, "INVALID_MESSAGE", "Invalid JSON message."); }
      const parsed = clientMessageSchema.safeParse(json);
      if (!parsed.success) { logger.warn("invalid_message", { rayId, reason: "schema" }); return sendError(socket, "INVALID_MESSAGE", "The message does not match the signaling protocol."); }
      const message = parsed.data;
      if (message.type === "create-room") {
        if (++createdRooms > 5) { logger.warn("room_creation_rate_limited", { rayId }); return sendError(socket, "ROOM_LIMIT", "Too many rooms created on this connection."); }
        let identity;
        try {
          identity = await options.authenticateRoomCreation(message.accessToken);
        } catch {
          logger.error("room_authentication_unavailable", { rayId });
          return sendError(socket, "AUTH_UNAVAILABLE", "Agent authentication is temporarily unavailable. Try again.");
        }
        if (!identity) { logger.warn("room_authentication_rejected", { rayId }); return sendError(socket, "AUTH_REQUIRED", "Sign in again before creating a support room."); }
        if (socket.readyState !== WebSocket.OPEN) return;
        const created = rooms.create(message.requestId, message.reference, identity.agentId);
        if (!created) { logger.warn("room_capacity_reached", { rayId }); return sendError(socket, "SERVER_BUSY", "The server is at capacity. Try again later."); }
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
      logger.info("server_started", { port, host });
    },
    async close() {
      if (closeOperation) return closeOperation;
      closeOperation = (async () => {
        draining = true;
        logger.info("server_draining", { activeRooms: rooms.activeRoomCount, connections: wss.clients.size });
        clearInterval(expiryTimer);
        rooms.closeAll();
        for (const client of wss.clients) if (client.readyState === WebSocket.OPEN) client.close(1012, "Service restarting");
        await waitForClients(wss, 1000);
        for (const client of wss.clients) client.terminate();
        await Promise.allSettled([...pendingFinalizations]);
        await new Promise<void>((resolve) => wss.close(() => resolve()));
        if (server.listening) await new Promise<void>((resolve) => server.close(() => resolve()));
        logger.info("server_stopped");
      })();
      return closeOperation;
    },
  };
}

function headerValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

async function waitForClients(wss: WebSocketServer, timeoutMs: number) {
  if (wss.clients.size === 0) return;
  await Promise.race([
    Promise.all([...wss.clients].map((client) => new Promise<void>((resolve) => client.once("close", () => resolve())))),
    new Promise<void>((resolve) => setTimeout(resolve, timeoutMs)),
  ]);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { loadEnvFile(fileURLToPath(new URL("../../../.env.local", import.meta.url))); } catch (error) {
    if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error;
  }
  const iceConfiguration = iceConfigurationFromEnv(process.env);
  const authenticateRoomCreation = roomCreationAuthenticatorFromEnv(process.env);
  // Browser tests run isolated local rooms and must never reconcile them into a
  // developer's configured Supabase project.
  const finalizeSession = process.env.SUPPORTROOM_E2E === "1" ? null : sessionFinalizerFromEnv(process.env);
  const hostReconnectGraceMs = Number(process.env.HOST_RECONNECT_GRACE_MS ?? 30000);
  if (!Number.isInteger(hostReconnectGraceMs) || hostReconnectGraceMs < 5000 || hostReconnectGraceMs > 120000) {
    throw new Error("HOST_RECONNECT_GRACE_MS must be an integer between 5000 and 120000.");
  }
  const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? "http://localhost:3000,http://localhost:3001,http://127.0.0.1:3000,http://127.0.0.1:3001").split(",").map((origin) => origin.trim()).filter(Boolean);
  if (!allowedOrigins.length || allowedOrigins.some((origin) => { try { return new URL(origin).origin !== origin; } catch { return true; } })) {
    throw new Error("ALLOWED_ORIGINS must contain valid comma-separated origins.");
  }
  const revision = process.env.RENDER_GIT_COMMIT?.slice(0, 12);
  const app = createSignalingServer({
    allowedOrigins,
    authenticateRoomCreation,
    ...(finalizeSession ? { finalizeSession } : {}),
    hostReconnectGraceMs,
    ...(revision ? { revision } : {}),
    ...(iceConfiguration ? { iceConfiguration } : {}),
  });
  const port = Number(process.env.PORT ?? 8080);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("PORT must be an integer between 1 and 65535.");
  await app.listen(port, process.env.HOST ?? "0.0.0.0");
  let shuttingDown = false;
  const shutdown = () => {
    if (shuttingDown) return;
    shuttingDown = true;
    void app.close().then(() => process.exit(0));
  };
  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}
