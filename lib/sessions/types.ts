import type { PeerDiagnostics } from "@/lib/webrtc/diagnostics";
import type { Tables } from "@/lib/supabase/database.types";

export type SupportSession = Tables<"support_sessions">;
export type SupportSessionStatus = SupportSession["status"];

export type SessionDiagnosticsSummary = {
  averageLatencyMs: number | null;
  averagePacketLossPercent: number | null;
  averageSendBitrateKbps: number | null;
  averageReceiveBitrateKbps: number | null;
  reconnectCount: number;
  localCandidateType: string | null;
  remoteCandidateType: string | null;
  transportProtocol: string | null;
  mediaSent: boolean | null;
  mediaReceived: boolean | null;
};

type Totals = {
  total: number;
  count: number;
};

export type DiagnosticsAccumulator = {
  latency: Totals;
  packetLoss: Totals;
  sendBitrate: Totals;
  receiveBitrate: Totals;
  reconnectCount: number;
  localCandidateType: string | null;
  remoteCandidateType: string | null;
  transportProtocol: string | null;
  mediaSent: boolean | null;
  mediaReceived: boolean | null;
};

export function emptyDiagnosticsAccumulator(): DiagnosticsAccumulator {
  return {
    latency: { total: 0, count: 0 },
    packetLoss: { total: 0, count: 0 },
    sendBitrate: { total: 0, count: 0 },
    receiveBitrate: { total: 0, count: 0 },
    reconnectCount: 0,
    localCandidateType: null,
    remoteCandidateType: null,
    transportProtocol: null,
    mediaSent: null,
    mediaReceived: null,
  };
}

export function addDiagnosticsSample(
  accumulator: DiagnosticsAccumulator,
  diagnostics: PeerDiagnostics,
  reconnectCount: number,
) {
  addValue(accumulator.latency, diagnostics.roundTripTimeMs);
  addValue(accumulator.packetLoss, diagnostics.incomingPacketLossPercent);
  addValue(accumulator.sendBitrate, diagnostics.sendBitrateKbps);
  addValue(accumulator.receiveBitrate, diagnostics.receiveBitrateKbps);
  accumulator.reconnectCount = Math.max(accumulator.reconnectCount, reconnectCount);
  accumulator.localCandidateType = diagnostics.localCandidate?.type ?? accumulator.localCandidateType;
  accumulator.remoteCandidateType = diagnostics.remoteCandidate?.type ?? accumulator.remoteCandidateType;
  accumulator.transportProtocol = diagnostics.localCandidate?.protocol
    ?? diagnostics.remoteCandidate?.protocol
    ?? accumulator.transportProtocol;
  accumulator.mediaSent = combineActivity(accumulator.mediaSent, diagnostics.sending.audio, diagnostics.sending.video);
  accumulator.mediaReceived = combineActivity(accumulator.mediaReceived, diagnostics.receiving.audio, diagnostics.receiving.video);
}

export function summarizeDiagnostics(accumulator: DiagnosticsAccumulator): SessionDiagnosticsSummary {
  return {
    averageLatencyMs: average(accumulator.latency),
    averagePacketLossPercent: average(accumulator.packetLoss),
    averageSendBitrateKbps: average(accumulator.sendBitrate),
    averageReceiveBitrateKbps: average(accumulator.receiveBitrate),
    reconnectCount: accumulator.reconnectCount,
    localCandidateType: accumulator.localCandidateType,
    remoteCandidateType: accumulator.remoteCandidateType,
    transportProtocol: accumulator.transportProtocol,
    mediaSent: accumulator.mediaSent,
    mediaReceived: accumulator.mediaReceived,
  };
}

export function calculateQualityScore(summary: SessionDiagnosticsSummary) {
  const hasNetworkSample = summary.averageLatencyMs !== null || summary.averagePacketLossPercent !== null;
  if (!hasNetworkSample) return null;

  let score = 100;
  const latency = summary.averageLatencyMs ?? 0;
  const packetLoss = summary.averagePacketLossPercent ?? 0;
  if (latency > 80) score -= Math.min(25, (latency - 80) / 8);
  score -= Math.min(45, packetLoss * 7);
  score -= Math.min(20, summary.reconnectCount * 5);
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function qualityLabel(score: number | null) {
  if (score === null) return "Not rated";
  if (score >= 90) return "Excellent";
  if (score >= 75) return "Good";
  if (score >= 55) return "Fair";
  return "Poor";
}

export function sessionDurationSeconds(session: Pick<SupportSession, "started_at" | "ended_at">, referenceTime?: number) {
  if (!session.started_at) return 0;
  const start = new Date(session.started_at).getTime();
  const end = session.ended_at ? new Date(session.ended_at).getTime() : referenceTime ?? start;
  return Math.max(0, Math.round((end - start) / 1000));
}

function addValue(totals: Totals, value: number | null) {
  if (value === null || !Number.isFinite(value)) return;
  totals.total += value;
  totals.count += 1;
}

function average(totals: Totals) {
  return totals.count ? Math.round((totals.total / totals.count) * 100) / 100 : null;
}

function combineActivity(current: boolean | null, ...values: Array<boolean | null>) {
  if (current === true || values.some((value) => value === true)) return true;
  if (current === false || values.some((value) => value === false)) return false;
  return null;
}
