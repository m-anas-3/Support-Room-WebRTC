import { WebSocket } from "ws";
import type { ServerMessage } from "@support-room/shared";

export function send(socket: WebSocket | null, message: ServerMessage) {
  if (socket?.readyState !== WebSocket.OPEN) return;
  // Slow consumers should reconnect instead of growing a send buffer forever.
  if (socket.bufferedAmount > 1024 * 1024) {
    socket.close(1013, "Slow connection");
    return;
  }
  socket.send(JSON.stringify(message));
}

export function sendError(socket: WebSocket, code: string, message: string) {
  send(socket, { type: "error", code, message });
}
