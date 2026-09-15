"use client";

import { Badge } from "@/components/ui/badge";
import type { CandidateDetails, PeerDiagnostics } from "@/lib/webrtc/diagnostics";

type PeerState = {
  connectionState: string;
  iceConnectionState: string;
  iceGatheringState: string;
  signalingState: string;
  remoteStream: MediaStream | null;
  diagnostics: PeerDiagnostics;
};

export function ConnectionDiagnostics({ signalingStatus, peer }: { signalingStatus: string; peer: PeerState }) {
  const connected = peer.connectionState === "connected";
  const stats = peer.diagnostics;
  const route = candidateRoute(stats.localCandidate, stats.remoteCandidate);

  return <div className="space-y-5">
    <div className="flex items-center justify-between gap-3">
      <div><p className="text-sm font-medium">Connection</p><p className="mt-0.5 text-xs text-slate-400">Peer-to-peer media</p></div>
      <Badge className={connected ? "bg-emerald-400/10 text-emerald-300" : "bg-white/10 text-slate-300"}>{peer.connectionState}</Badge>
    </div>

    <div className="grid grid-cols-2 gap-3">
      <Diagnostic label="Round-trip time" value={formatLatency(stats.roundTripTimeMs)} testId="diagnostic-latency" />
      <Diagnostic label="Receive loss" value={formatPercent(stats.incomingPacketLossPercent)} testId="diagnostic-packet-loss" />
      <Diagnostic label="Send bitrate" value={formatBitrate(stats.sendBitrateKbps)} testId="diagnostic-send-bitrate" />
      <Diagnostic label="Receive bitrate" value={formatBitrate(stats.receiveBitrateKbps)} testId="diagnostic-receive-bitrate" />
    </div>

    <div className="space-y-3 border-t border-white/10 pt-5">
      <p className="text-xs font-medium text-slate-300">Media activity</p>
      <ActivityRow label="Microphone" sent={stats.sending.audio} received={stats.receiving.audio} />
      <ActivityRow label="Video" sent={stats.sending.video} received={stats.receiving.video} />
      <InfoRow label="Remote-reported send loss" value={formatPercent(stats.outgoingPacketLossPercent)} />
    </div>

    <div className="space-y-3 border-t border-white/10 pt-5">
      <p className="text-xs font-medium text-slate-300">Selected ICE route</p>
      <InfoRow label="Candidate pair" value={route} testId="diagnostic-ice-route" />
      <InfoRow label="Protocol" value={candidateProtocol(stats.localCandidate)} />
      <InfoRow label="Local endpoint" value={candidateEndpoint(stats.localCandidate)} />
      <InfoRow label="Remote endpoint" value={candidateEndpoint(stats.remoteCandidate)} />
      <InfoRow label="Est. upload capacity" value={formatBitrate(stats.availableOutgoingBitrateKbps)} />
    </div>

    <div className="space-y-3 border-t border-white/10 pt-5">
      <InfoRow label="Signaling socket" value={signalingStatus} />
      <InfoRow label="SDP state" value={peer.signalingState} />
      <InfoRow label="ICE gathering" value={peer.iceGatheringState} />
      <InfoRow label="ICE connection" value={peer.iceConnectionState} />
      <InfoRow label="Remote tracks" value={String(peer.remoteStream?.getTracks().length ?? 0)} />
      <InfoRow label="Last sample" value={formatSampleTime(stats.sampledAt)} />
    </div>

    <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
      <p className="text-xs font-medium">{diagnosticSummary(connected, stats)}</p>
      <p className="mt-1.5 text-xs leading-5 text-slate-400">Statistics refresh every two seconds. Short changes between samples may not appear.</p>
    </div>
  </div>;
}

function Diagnostic({ label, value, testId }: { label: string; value: string; testId: string }) {
  return <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3"><p className="text-[11px] text-slate-400">{label}</p><p className="mt-1 text-sm font-medium tabular-nums" data-testid={testId}>{value}</p></div>;
}

function ActivityRow({ label, sent, received }: { label: string; sent: boolean | null; received: boolean | null }) {
  return <div className="flex items-center justify-between gap-3 text-xs"><span className="text-slate-400">{label}</span><div className="flex gap-3"><Activity label="Send" active={sent} /><Activity label="Receive" active={received} /></div></div>;
}

function Activity({ label, active }: { label: string; active: boolean | null }) {
  const state = active === null ? "Waiting" : active ? "Active" : "Idle";
  return <span className="flex items-center gap-1.5" data-testid={`diagnostic-${label.toLowerCase()}-${state.toLowerCase()}`}><span className={`size-1.5 rounded-full ${active === null ? "bg-slate-500" : active ? "bg-emerald-400" : "bg-amber-400"}`} /><span className="text-slate-300">{label}</span></span>;
}

function InfoRow({ label, value, testId }: { label: string; value: string; testId?: string }) {
  return <div className="flex items-start justify-between gap-4 text-xs"><span className="shrink-0 text-slate-400">{label}</span><span className="min-w-0 break-all text-right font-mono text-slate-200" data-testid={testId}>{value}</span></div>;
}

function formatBitrate(value: number | null) {
  if (value === null) return "—";
  if (value < 1000) return `${Math.round(value)} kbps`;
  return `${(value / 1000).toFixed(value < 10_000 ? 1 : 0)} Mbps`;
}

function formatLatency(value: number | null) {
  if (value === null) return "—";
  return value < 1 ? "< 1 ms" : `${Math.round(value)} ms`;
}

function formatPercent(value: number | null) {
  if (value === null) return "—";
  if (value > 0 && value < 0.1) return "< 0.1%";
  return `${value.toFixed(value < 10 ? 1 : 0)}%`;
}

function candidateType(candidate: CandidateDetails | null) {
  switch (candidate?.type) {
    case "host": return "Host";
    case "srflx": return "Server reflexive";
    case "prflx": return "Peer reflexive";
    case "relay": return "Relay";
    default: return "—";
  }
}

function candidateRoute(local: CandidateDetails | null, remote: CandidateDetails | null) {
  if (!local && !remote) return "—";
  return `${candidateType(local)} → ${candidateType(remote)}`;
}

function candidateProtocol(candidate: CandidateDetails | null) {
  if (!candidate?.protocol) return "—";
  const transport = candidate.protocol.toUpperCase();
  return candidate.relayProtocol ? `${transport} · TURN/${candidate.relayProtocol.toUpperCase()}` : transport;
}

function candidateEndpoint(candidate: CandidateDetails | null) {
  if (!candidate) return "—";
  const address = candidate.address ?? "Address hidden";
  return candidate.port === null ? address : `${address}:${candidate.port}`;
}

function formatSampleTime(timestamp: number | null) {
  if (timestamp === null) return "Waiting";
  return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function diagnosticSummary(connected: boolean, stats: PeerDiagnostics) {
  if (!connected) return "Waiting for media connection";
  if (stats.error) return stats.error;
  if (stats.localCandidate?.type === "relay" || stats.remoteCandidate?.type === "relay") return "Media is using a TURN relay";
  if (stats.localCandidate || stats.remoteCandidate) return "A direct ICE route is selected";
  return "Collecting live connection statistics";
}
