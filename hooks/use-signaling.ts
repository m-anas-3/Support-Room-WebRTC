"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  serverMessageSchema,
  type ClientMessage,
  type IceConfiguration,
  type RoomSnapshot,
  type SignalMessage,
} from "@support-room/shared";
import {
  forgetHostRoom,
  readHostRoom,
  signalingUrl,
} from "@/lib/signaling/client";

type ConnectionStatus =
  | "connecting"
  | "connected"
  | "reconnecting"
  | "disconnected"
  | "error"
  | "closed"
  | "declined";

const INITIAL_RETRY_LIMIT = 3;
const RECONNECT_WINDOW_MS = 25_000;
const RESPONSE_TIMEOUT_MS = 5_000;
const MAX_RETRY_DELAY_MS = 4_000;

export function useSignaling({
  roomId,
  role,
  name,
  enabled = true,
  onDisconnect,
}: {
  roomId: string;
  role: "host" | "customer";
  name: string;
  enabled?: boolean;
  onDisconnect?: () => void;
}) {
  const socketRef = useRef<WebSocket | null>(null);
  const intentionalCloseRef = useRef(false);
  const onDisconnectRef = useRef(onDisconnect);
  const signalListeners = useRef(new Set<(message: SignalMessage) => void>());
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [room, setRoom] = useState<RoomSnapshot | null>(null);
  const [iceConfiguration, setIceConfiguration] =
    useState<IceConfiguration | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);

  useEffect(() => {
    onDisconnectRef.current = onDisconnect;
  }, [onDisconnect]);

  useEffect(() => {
    if (!enabled) return;

    let active = true;
    let socket: WebSocket | null = null;
    let responseTimer: ReturnType<typeof setTimeout> | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let joinedThisSocket = false;
    let hasJoined = false;
    let retryCount = 0;
    let reconnectStartedAt: number | null = null;
    let terminal = false;
    let disconnectNotified = false;
    intentionalCloseRef.current = false;

    const clearResponseTimer = () => {
      if (responseTimer) clearTimeout(responseTimer);
      responseTimer = null;
    };
    const notifyDisconnect = () => {
      if (disconnectNotified) return;
      disconnectNotified = true;
      onDisconnectRef.current?.();
    };
    const stopWithError = (message: string) => {
      terminal = true;
      setStatus("error");
      setError(message);
      setReconnectAttempt(0);
      notifyDisconnect();
    };
    const accessToken = () =>
      role === "host"
        ? readHostRoom(roomId)?.hostToken
        : new URLSearchParams(window.location.hash.slice(1)).get("token");

    const scheduleReconnect = () => {
      if (!active || terminal || intentionalCloseRef.current) return;
      const now = Date.now();
      if (hasJoined) reconnectStartedAt ??= now;
      const recoveryExpired =
        hasJoined &&
        reconnectStartedAt !== null &&
        now - reconnectStartedAt >= RECONNECT_WINDOW_MS;
      if (
        recoveryExpired ||
        (!hasJoined && retryCount >= INITIAL_RETRY_LIMIT)
      ) {
        stopWithError(
          hasJoined
            ? "The signaling connection could not be restored. Check your network and rejoin the room."
            : "Cannot reach the signaling server. Check your network and try again.",
        );
        return;
      }

      retryCount += 1;
      const delay = Math.min(500 * 2 ** (retryCount - 1), MAX_RETRY_DELAY_MS);
      setReconnectAttempt(retryCount);
      setStatus(hasJoined ? "reconnecting" : "connecting");
      setError(hasJoined ? "Signaling was interrupted. Reconnecting…" : null);
      retryTimer = setTimeout(connect, delay);
    };

    const handleTerminalMessage = (
      nextStatus: "closed" | "declined",
      message: string,
    ) => {
      if (role === "host" && nextStatus === "closed") forgetHostRoom(roomId);
      terminal = true;
      setStatus(nextStatus);
      setRoom(null);
      setIceConfiguration(null);
      setReconnectAttempt(0);
      setError(message);
      notifyDisconnect();
    };

    function connect() {
      if (!active || terminal || intentionalCloseRef.current) return;
      if (!hasJoined && retryCount === 0) {
        setStatus("connecting");
        setRoom(null);
        setIceConfiguration(null);
        setError(null);
        setReconnectAttempt(0);
      }
      joinedThisSocket = false;
      clearResponseTimer();
      try {
        socket = new WebSocket(signalingUrl());
      } catch {
        stopWithError("The signaling server URL is invalid.");
        return;
      }

      const activeSocket = socket;
      socketRef.current = activeSocket;
      responseTimer = setTimeout(
        () => activeSocket.close(),
        RESPONSE_TIMEOUT_MS,
      );

      activeSocket.onopen = () => {
        const token = accessToken();
        if (!token) {
          clearResponseTimer();
          stopWithError(
            role === "host"
              ? "Create a room from the dashboard in this browser tab first."
              : "This invitation is missing its access token. Ask the agent for a new link.",
          );
          activeSocket.close();
          return;
        }
        activeSocket.send(
          JSON.stringify({ type: "join-room", roomId, token, role, name }),
        );
      };

      activeSocket.onmessage = (event) => {
        let json: unknown;
        try {
          json = JSON.parse(event.data);
        } catch {
          return;
        }
        const parsed = serverMessageSchema.safeParse(json);
        if (!parsed.success) return;
        const message = parsed.data;
        clearResponseTimer();
        switch (message.type) {
          case "ice-configuration":
            setIceConfiguration(message);
            break;
          case "room-state":
            joinedThisSocket = true;
            hasJoined = true;
            retryCount = 0;
            reconnectStartedAt = null;
            setReconnectAttempt(0);
            setRoom(message.room);
            setStatus("connected");
            setError(null);
            break;
          case "error":
            if (
              role === "host" &&
              ["ROOM_UNAVAILABLE", "INVALID_TOKEN"].includes(message.code)
            )
              forgetHostRoom(roomId);
            setError(message.message);
            if (!joinedThisSocket) {
              terminal = true;
              setStatus("error");
              notifyDisconnect();
              activeSocket.close();
            }
            break;
          case "declined":
            handleTerminalMessage(
              "declined",
              "The support agent declined your request.",
            );
            signalListeners.current.forEach((listener) => listener(message));
            break;
          case "room-closed":
            handleTerminalMessage(
              "closed",
              message.reason === "expired"
                ? "This room has expired."
                : "The support agent ended this room.",
            );
            signalListeners.current.forEach((listener) => listener(message));
            break;
          case "offer":
          case "answer":
          case "ice-candidate":
          case "ice-restart-request":
          case "screen-share-state":
          case "media-state":
          case "peers-ready":
          case "peer-left":
            signalListeners.current.forEach((listener) => listener(message));
            break;
        }
      };

      activeSocket.onerror = () => {
        clearResponseTimer();
      };
      activeSocket.onclose = () => {
        clearResponseTimer();
        if (socketRef.current === activeSocket) socketRef.current = null;
        if (!active || terminal || intentionalCloseRef.current) return;
        scheduleReconnect();
      };
    }

    // React development checks may set up and immediately clean up an effect.
    // Deferring the connection lets that cleanup cancel before joining as host.
    retryTimer = setTimeout(connect, 0);
    return () => {
      active = false;
      clearResponseTimer();
      if (retryTimer) clearTimeout(retryTimer);
      if (!socket) return;
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
    intentionalCloseRef.current = true;
    if (socketRef.current?.readyState === WebSocket.OPEN)
      socketRef.current.send(JSON.stringify({ type: "leave" }));
    socketRef.current?.close();
    setStatus("closed");
    setRoom(null);
    setIceConfiguration(null);
    setReconnectAttempt(0);
    if (role === "host") forgetHostRoom(roomId);
  }, [role, roomId]);

  const subscribeToSignals = useCallback(
    (listener: (message: SignalMessage) => void) => {
      signalListeners.current.add(listener);
      return () => {
        signalListeners.current.delete(listener);
      };
    },
    [],
  );

  return {
    status: enabled ? status : ("idle" as const),
    room: enabled ? room : null,
    iceConfiguration: enabled ? iceConfiguration : null,
    error: enabled ? error : null,
    reconnectAttempt: enabled ? reconnectAttempt : 0,
    send,
    leave,
    subscribeToSignals,
  };
}
