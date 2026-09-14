"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { serverMessageSchema, type ClientMessage, type RoomSnapshot, type SignalMessage } from "@support-room/shared";
import { readHostRoom, signalingUrl } from "@/lib/signaling/client";

type ConnectionStatus = "connecting" | "connected" | "disconnected" | "error" | "closed" | "declined";

export function useSignaling({ roomId, role, name, enabled = true }: { roomId: string; role: "host" | "customer"; name: string; enabled?: boolean }) {
  const socketRef = useRef<WebSocket | null>(null);
  const signalListeners = useRef(new Set<(message: SignalMessage) => void>());
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [room, setRoom] = useState<RoomSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const socket = new WebSocket(signalingUrl());
    let joined = false;
    socketRef.current = socket;
    const timeout = setTimeout(() => {
      setStatus("error");
      setError("The signaling server did not respond. Check your connection and try again.");
      socket.close();
    }, 10000);

    socket.onopen = () => {
      setStatus("connecting");
      const token = role === "host" ? readHostRoom(roomId)?.hostToken : new URLSearchParams(window.location.hash.slice(1)).get("token");
      setRoom(null);
      setError(null);
      if (!token) {
        clearTimeout(timeout);
        setStatus("error");
        setError(role === "host" ? "Create a room from the dashboard in this browser tab first." : "This invitation is missing its access token. Ask the agent for a new link.");
        socket.close();
        return;
      }
      socket.send(JSON.stringify({ type: "join-room", roomId, token, role, name }));
    };
    socket.onmessage = (event) => {
      let json: unknown;
      try { json = JSON.parse(event.data); } catch { return; }
      const parsed = serverMessageSchema.safeParse(json);
      if (!parsed.success) return;
      const message = parsed.data;
      clearTimeout(timeout);
      switch (message.type) {
        case "room-state": joined = true; setRoom(message.room); setStatus("connected"); break;
        case "error":
          setError(message.message);
          if (!joined) { setStatus("error"); socket.close(); }
          break;
        case "declined": setStatus("declined"); break;
        case "room-closed": setStatus("closed"); setError(message.reason === "expired" ? "This room has expired." : "The support agent ended this room."); break;
        case "offer": case "answer": case "ice-candidate":
          signalListeners.current.forEach((listener) => listener(message));
          break;
      }
    };
    socket.onerror = () => { clearTimeout(timeout); setStatus("error"); setError("Cannot reach the signaling server. Check that it is running."); };
    socket.onclose = () => {
      clearTimeout(timeout);
      setStatus((previous) => ["error", "closed", "declined"].includes(previous) ? previous : "disconnected");
    };
    return () => {
      clearTimeout(timeout);
      socket.onopen = null;
      socket.onmessage = null;
      socket.onerror = null;
      socket.onclose = null;
      socket.close();
      if (socketRef.current === socket) socketRef.current = null;
    };
  }, [enabled, name, role, roomId]);

  const send = useCallback((message: ClientMessage) => {
    if (socketRef.current?.readyState !== WebSocket.OPEN) {
      setError("The signaling connection is not open.");
      return false;
    }
    socketRef.current.send(JSON.stringify(message));
    return true;
  }, []);

  const leave = useCallback(() => {
    if (socketRef.current?.readyState === WebSocket.OPEN) socketRef.current.send(JSON.stringify({ type: "leave" }));
    socketRef.current?.close();
    setStatus("closed");
    setRoom(null);
  }, []);

  const subscribeToSignals = useCallback((listener: (message: SignalMessage) => void) => {
    signalListeners.current.add(listener);
    return () => { signalListeners.current.delete(listener); };
  }, []);

  return { status: enabled ? status : "idle" as const, room: enabled ? room : null, error: enabled ? error : null, send, leave, subscribeToSignals };
}
