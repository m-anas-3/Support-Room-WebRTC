"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { serverMessageSchema, type ClientMessage, type RoomSnapshot, type SignalMessage } from "@support-room/shared";
import { readHostRoom, signalingUrl } from "@/lib/signaling/client";

type ConnectionStatus = "connecting" | "connected" | "disconnected" | "error" | "closed" | "declined";

export function useSignaling({ roomId, role, name, enabled = true, onDisconnect }: { roomId: string; role: "host" | "customer"; name: string; enabled?: boolean; onDisconnect?: () => void }) {
  const socketRef = useRef<WebSocket | null>(null);
  const signalListeners = useRef(new Set<(message: SignalMessage) => void>());
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [room, setRoom] = useState<RoomSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let socket: WebSocket | null = null;
    let responseTimer: ReturnType<typeof setTimeout> | null = null;
    let joined = false;
    const clearResponseTimer = () => { if (responseTimer) clearTimeout(responseTimer); responseTimer = null; };
    // React development checks may set up and immediately clean up an effect.
    // Let that cleanup cancel connection creation before it joins as the host.
    const connectTimer = setTimeout(() => {
      try { socket = new WebSocket(signalingUrl()); }
      catch {
        setStatus("error");
        setError("The signaling server URL is invalid.");
        onDisconnect?.();
        return;
      }
      const activeSocket = socket;
      socketRef.current = activeSocket;
      responseTimer = setTimeout(() => {
        setStatus("error");
        setError("The signaling server did not respond. Check your connection and try again.");
        activeSocket.close();
      }, 10000);
      activeSocket.onopen = () => {
        setStatus("connecting");
        const token = role === "host" ? readHostRoom(roomId)?.hostToken : new URLSearchParams(window.location.hash.slice(1)).get("token");
        setRoom(null);
        setError(null);
        if (!token) {
          clearResponseTimer();
          setStatus("error");
          setError(role === "host" ? "Create a room from the dashboard in this browser tab first." : "This invitation is missing its access token. Ask the agent for a new link.");
          activeSocket.close();
          return;
        }
        activeSocket.send(JSON.stringify({ type: "join-room", roomId, token, role, name }));
      };
      activeSocket.onmessage = (event) => {
        let json: unknown;
        try { json = JSON.parse(event.data); } catch { return; }
        const parsed = serverMessageSchema.safeParse(json);
        if (!parsed.success) return;
        const message = parsed.data;
        clearResponseTimer();
        switch (message.type) {
          case "room-state": joined = true; setRoom(message.room); setStatus("connected"); setError(null); break;
          case "error":
            setError(message.message);
            if (!joined) { setStatus("error"); activeSocket.close(); }
            break;
          case "declined":
            setStatus("declined"); setRoom(null);
            signalListeners.current.forEach((listener) => listener(message));
            break;
          case "room-closed":
            setStatus("closed"); setRoom(null);
            setError(message.reason === "expired" ? "This room has expired." : "The support agent ended this room.");
            signalListeners.current.forEach((listener) => listener(message));
            break;
          case "offer": case "answer": case "ice-candidate": case "screen-share-state": case "peers-ready": case "peer-left":
            signalListeners.current.forEach((listener) => listener(message));
            break;
        }
      };
      activeSocket.onerror = () => { clearResponseTimer(); setStatus("error"); setError("Cannot reach the signaling server. Check that it is running."); };
      activeSocket.onclose = () => {
        clearResponseTimer();
        onDisconnect?.();
        setStatus((previous) => ["error", "closed", "declined"].includes(previous) ? previous : "disconnected");
      };
    }, 0);
    return () => {
      clearTimeout(connectTimer);
      clearResponseTimer();
      if (!socket) return;
      socket.onopen = null;
      socket.onmessage = null;
      socket.onerror = null;
      socket.onclose = null;
      socket.close();
      if (socketRef.current === socket) socketRef.current = null;
    };
  }, [enabled, name, onDisconnect, role, roomId]);

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
