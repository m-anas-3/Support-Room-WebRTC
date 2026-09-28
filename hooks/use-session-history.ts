"use client";

import { useCallback, useEffect, useRef } from "react";
import { emptyPeerDiagnostics, type PeerDiagnostics } from "@/lib/webrtc/diagnostics";
import {
  completeSessionRecord,
  hasSessionRecord,
  markSessionActive,
  markSessionWaiting,
} from "@/lib/sessions/client";
import {
  addDiagnosticsSample,
  captureDiagnosticSample,
  emptyDiagnosticsAccumulator,
  maxDiagnosticSamples,
  summarizeDiagnostics,
  type CapturedDiagnosticSample,
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
  const samplesRef = useRef<CapturedDiagnosticSample[]>([]);
  const lastSampleRef = useRef<number | null>(null);
  const lastConnectionStateRef = useRef(connectionState);
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
    if (!enabled.current) return;
    const hasNewDiagnostics = diagnostics.sampledAt !== null && diagnostics.sampledAt !== lastSampleRef.current;
    const connectionChanged = connectionState !== lastConnectionStateRef.current;
    if (!hasNewDiagnostics && !connectionChanged) return;
    lastConnectionStateRef.current = connectionState;
    if (hasNewDiagnostics) {
      lastSampleRef.current = diagnostics.sampledAt;
      addDiagnosticsSample(diagnosticsRef.current, diagnostics, recoveryAttempts);
    }
    if (samplesRef.current.length < maxDiagnosticSamples) {
      samplesRef.current.push(captureDiagnosticSample(
        hasNewDiagnostics ? diagnostics : emptyPeerDiagnostics,
        connectionState,
        recoveryAttempts,
        samplesRef.current.length,
      ));
    }
  }, [connectionState, diagnostics, recoveryAttempts]);

  const complete = useCallback(async (endedReason = "host-ended") => {
    if (!enabled.current || completedRef.current) return;
    completedRef.current = true;
    await queueRef.current.catch(() => undefined);
    try {
      await completeSessionRecord(
        roomId,
        summarizeDiagnostics(diagnosticsRef.current),
        samplesRef.current,
        endedReason,
      );
    } catch {
      reportError();
    }
  }, [reportError, roomId]);

  return { complete };
}
