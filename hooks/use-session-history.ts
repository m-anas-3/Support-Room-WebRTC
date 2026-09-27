"use client";

import { useCallback, useEffect, useRef } from "react";
import type { PeerDiagnostics } from "@/lib/webrtc/diagnostics";
import {
  completeSessionRecord,
  hasSessionRecord,
  markSessionActive,
  markSessionWaiting,
} from "@/lib/sessions/client";
import {
  addDiagnosticsSample,
  emptyDiagnosticsAccumulator,
  summarizeDiagnostics,
} from "@/lib/sessions/types";

export function useSessionHistory({
  roomId,
  customerName,
  customerState,
  connectionState,
  diagnostics,
  recoveryAttempts,
  onPersistenceError,
}: {
  roomId: string;
  customerName: string | null;
  customerState: "absent" | "waiting" | "admitted" | null;
  connectionState: RTCPeerConnectionState | "idle";
  diagnostics: PeerDiagnostics;
  recoveryAttempts: number;
  onPersistenceError?: () => void;
}) {
  const enabled = useRef(hasSessionRecord(roomId));
  const diagnosticsRef = useRef(emptyDiagnosticsAccumulator());
  const lastSampleRef = useRef<number | null>(null);
  const lastRoomStateRef = useRef<string | null>(null);
  const activeRef = useRef(false);
  const completedRef = useRef(false);
  const errorReportedRef = useRef(false);
  const queueRef = useRef(Promise.resolve());

  const reportError = useCallback(() => {
    if (errorReportedRef.current) return;
    errorReportedRef.current = true;
    onPersistenceError?.();
  }, [onPersistenceError]);

  const enqueue = useCallback((operation: () => Promise<void>) => {
    queueRef.current = queueRef.current
      .catch(() => undefined)
      .then(operation)
      .catch(() => reportError());
  }, [reportError]);

  useEffect(() => {
    if (!enabled.current || customerState !== "waiting") return;
    const stateKey = `${customerState}:${customerName ?? ""}`;
    if (lastRoomStateRef.current === stateKey) return;
    lastRoomStateRef.current = stateKey;
    enqueue(() => markSessionWaiting(roomId, customerName));
  }, [customerName, customerState, enqueue, roomId]);

  useEffect(() => {
    if (!enabled.current || connectionState !== "connected" || activeRef.current) return;
    activeRef.current = true;
    enqueue(() => markSessionActive(roomId, customerName));
  }, [connectionState, customerName, enqueue, roomId]);

  useEffect(() => {
    if (!enabled.current || diagnostics.sampledAt === null || diagnostics.sampledAt === lastSampleRef.current) return;
    lastSampleRef.current = diagnostics.sampledAt;
    addDiagnosticsSample(diagnosticsRef.current, diagnostics, recoveryAttempts);
  }, [diagnostics, recoveryAttempts]);

  const complete = useCallback(async (endedReason = "host-ended") => {
    if (!enabled.current || completedRef.current) return;
    completedRef.current = true;
    await queueRef.current.catch(() => undefined);
    try {
      await completeSessionRecord(roomId, summarizeDiagnostics(diagnosticsRef.current), endedReason);
    } catch {
      reportError();
    }
  }, [reportError, roomId]);

  return { complete };
}
