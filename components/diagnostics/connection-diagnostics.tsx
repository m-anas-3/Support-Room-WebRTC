"use client";

import {
  CircleAlert,
  CircleCheck,
  LoaderCircle,
  TriangleAlert,
} from "lucide-react";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import {
  assessConnectionHealth,
  type ConnectionHealthLevel,
  type ExpectedMedia,
} from "@/lib/webrtc/connection-health";
import type {
  CandidateDetails,
  PeerDiagnostics,
} from "@/lib/webrtc/diagnostics";

type PeerState = {
  connectionState: string;
  iceConnectionState: string;
  iceGatheringState: string;
  signalingState: string;
  recoveryState: "idle" | "reconnecting" | "recovered";
  recoveryAttempts: number;
  remoteStream: MediaStream | null;
  diagnostics: PeerDiagnostics;
};

export function ConnectionDiagnostics({
  signalingStatus,
  peer,
  localMedia,
  remoteMedia,
}: {
  signalingStatus: string;
  peer: PeerState;
  localMedia: ExpectedMedia;
  remoteMedia: ExpectedMedia;
}) {
  const connected = peer.connectionState === "connected";
  const stats = peer.diagnostics;
  const route = candidateRoute(stats.localCandidate, stats.remoteCandidate);
  const health = assessConnectionHealth({
    connected,
    reconnecting: peer.recoveryState === "reconnecting",
    recoveryAttempts: peer.recoveryAttempts,
    diagnostics: stats,
    localMedia,
    remoteMedia,
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">Connection</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Peer-to-peer media
          </p>
        </div>
        <Badge
          className={
            connected
              ? "bg-emerald-400/10 text-emerald-300"
              : "bg-muted text-foreground/80"
          }
        >
          {peer.connectionState}
        </Badge>
      </div>

      <HealthSummary level={health.level} issues={health.issues} />

      <div className="grid grid-cols-2 gap-3">
        <Diagnostic
          label="Round-trip time"
          value={formatLatency(stats.roundTripTimeMs)}
          testId="diagnostic-latency"
        />
        <Diagnostic
          label="Packet jitter"
          value={formatLatency(stats.jitterMs)}
          testId="diagnostic-jitter"
        />
        <Diagnostic
          label="Receive loss"
          value={formatPercent(stats.incomingPacketLossPercent)}
          testId="diagnostic-packet-loss"
        />
        <Diagnostic
          label="Send loss"
          value={formatPercent(stats.outgoingPacketLossPercent)}
          testId="diagnostic-send-packet-loss"
        />
        <Diagnostic
          label="Send bitrate"
          value={formatBitrate(stats.sendBitrateKbps)}
          testId="diagnostic-send-bitrate"
        />
        <Diagnostic
          label="Receive bitrate"
          value={formatBitrate(stats.receiveBitrateKbps)}
          testId="diagnostic-receive-bitrate"
        />
      </div>

      <div className="space-y-3 border-t border-border pt-5">
        <p className="text-xs font-medium text-foreground/80">Media activity</p>
        <ActivityRow
          label="Microphone"
          sent={stats.sending.audio}
          received={stats.receiving.audio}
          sendExpected={localMedia.audio}
          receiveExpected={remoteMedia.audio}
        />
        <ActivityRow
          label="Video"
          sent={stats.sending.video}
          received={stats.receiving.video}
          sendExpected={localMedia.video}
          receiveExpected={remoteMedia.video}
        />
      </div>

      <Accordion>
        <AccordionItem value="network">
          <AccordionTrigger>Network route</AccordionTrigger>
          <AccordionContent className="space-y-3">
            <InfoRow
              label="Candidate pair"
              value={route}
              testId="diagnostic-ice-route"
            />
            <InfoRow
              label="Protocol"
              value={candidateProtocol(stats.localCandidate)}
            />
            <InfoRow
              label="Local endpoint"
              value={candidateEndpoint(stats.localCandidate)}
            />
            <InfoRow
              label="Remote endpoint"
              value={candidateEndpoint(stats.remoteCandidate)}
            />
            <InfoRow
              label="Est. upload capacity"
              value={formatBitrate(stats.availableOutgoingBitrateKbps)}
            />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="technical">
          <AccordionTrigger>Technical details</AccordionTrigger>
          <AccordionContent className="space-y-3">
            <InfoRow label="Signaling socket" value={signalingStatus} />
            <InfoRow label="SDP state" value={peer.signalingState} />
            <InfoRow label="ICE gathering" value={peer.iceGatheringState} />
            <InfoRow label="ICE connection" value={peer.iceConnectionState} />
            <InfoRow
              label="Recovery"
              value={recoveryLabel(peer.recoveryState, peer.recoveryAttempts)}
              testId="diagnostic-recovery"
            />
            <InfoRow
              label="Remote tracks"
              value={String(peer.remoteStream?.getTracks().length ?? 0)}
            />
            <InfoRow
              label="Last sample"
              value={formatSampleTime(stats.sampledAt)}
            />
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <div className="rounded-lg border border-border bg-muted/40 p-3">
        <p className="text-xs font-medium">
          {diagnosticSummary(connected, stats)}
        </p>
        <p className="mt-1.5 text-xs leading-5 text-muted-foreground">
          Statistics refresh every two seconds. Short changes between samples
          may not appear.
        </p>
      </div>
    </div>
  );
}

function HealthSummary({
  level,
  issues,
}: {
  level: ConnectionHealthLevel;
  issues: ReturnType<typeof assessConnectionHealth>["issues"];
}) {
  const presentation = healthPresentation(level);
  const Icon = presentation.icon;
  return (
    <section
      className={`rounded-xl border p-3.5 ${presentation.container}`}
      aria-labelledby="connection-health-title"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Icon
            className={`size-4 ${level === "checking" ? "animate-spin" : ""}`}
          />
          <p id="connection-health-title" className="text-sm font-medium">
            Connection health
          </p>
        </div>
        <Badge className={presentation.badge} data-testid="diagnostic-health">
          {presentation.label}
        </Badge>
      </div>
      {issues.length ? (
        <ul className="mt-3 space-y-3">
          {issues.map((issue) => (
            <li key={issue.id} className="text-xs leading-5">
              <p className="font-medium">{issue.title}</p>
              <p className="text-muted-foreground">{issue.guidance}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-xs leading-5 text-muted-foreground">
          {level === "checking"
            ? "Collecting enough statistics to assess this connection."
            : "No connection problems are visible in the latest sample."}
        </p>
      )}
    </section>
  );
}

function healthPresentation(level: ConnectionHealthLevel) {
  if (level === "excellent")
    return {
      label: "Excellent",
      icon: CircleCheck,
      container: "border-emerald-400/20 bg-emerald-400/[0.06] text-emerald-200",
      badge: "bg-emerald-400/15 text-emerald-200",
    };
  if (level === "good")
    return {
      label: "Good",
      icon: CircleCheck,
      container: "border-blue-400/20 bg-blue-400/[0.06] text-blue-200",
      badge: "bg-blue-400/15 text-blue-200",
    };
  if (level === "fair")
    return {
      label: "Fair",
      icon: TriangleAlert,
      container: "border-amber-400/20 bg-amber-400/[0.06] text-amber-200",
      badge: "bg-amber-400/15 text-amber-200",
    };
  if (level === "poor")
    return {
      label: "Poor",
      icon: CircleAlert,
      container: "border-red-400/20 bg-red-400/[0.06] text-red-200",
      badge: "bg-red-400/15 text-red-200",
    };
  return {
    label: "Checking",
    icon: LoaderCircle,
    container: "border-border bg-muted/40 text-foreground",
    badge: "bg-muted text-foreground/80",
  };
}

function recoveryLabel(state: PeerState["recoveryState"], attempts: number) {
  if (state === "reconnecting")
    return `Reconnecting · attempt ${attempts || 1} of 2`;
  if (state === "recovered")
    return `Recovered after ${attempts} ${attempts === 1 ? "attempt" : "attempts"}`;
  return "Not needed";
}

function Diagnostic({
  label,
  value,
  testId,
}: {
  label: string;
  value: string;
  testId: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-muted/40 p-3">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium tabular-nums" data-testid={testId}>
        {value}
      </p>
    </div>
  );
}

function ActivityRow({
  label,
  sent,
  received,
  sendExpected,
  receiveExpected,
}: {
  label: string;
  sent: boolean | null;
  received: boolean | null;
  sendExpected: boolean;
  receiveExpected: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <div className="flex gap-3">
        <Activity label="Send" active={sent} expected={sendExpected} />
        <Activity
          label="Receive"
          active={received}
          expected={receiveExpected}
        />
      </div>
    </div>
  );
}

function Activity({
  label,
  active,
  expected,
}: {
  label: string;
  active: boolean | null;
  expected: boolean;
}) {
  const state = !expected
    ? "Off"
    : active === null
      ? "Waiting"
      : active
        ? "Active"
        : "Idle";
  return (
    <span
      className="flex items-center gap-1.5"
      data-testid={`diagnostic-${label.toLowerCase()}-${state.toLowerCase()}`}
    >
      <span
        className={`size-1.5 rounded-full ${!expected || active === null ? "bg-muted-foreground" : active ? "bg-emerald-400" : "bg-amber-400"}`}
      />
      <span className="text-foreground/80">
        {label}: {state}
      </span>
    </span>
  );
}

function InfoRow({
  label,
  value,
  testId,
}: {
  label: string;
  value: string;
  testId?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 text-xs">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span
        className="min-w-0 break-all text-right font-mono text-foreground"
        data-testid={testId}
      >
        {value}
      </span>
    </div>
  );
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
    case "host":
      return "Host";
    case "srflx":
      return "Server reflexive";
    case "prflx":
      return "Peer reflexive";
    case "relay":
      return "Relay";
    default:
      return "—";
  }
}

function candidateRoute(
  local: CandidateDetails | null,
  remote: CandidateDetails | null,
) {
  if (!local && !remote) return "—";
  return `${candidateType(local)} → ${candidateType(remote)}`;
}

function candidateProtocol(candidate: CandidateDetails | null) {
  if (!candidate?.protocol) return "—";
  const transport = candidate.protocol.toUpperCase();
  return candidate.relayProtocol
    ? `${transport} · TURN/${candidate.relayProtocol.toUpperCase()}`
    : transport;
}

function candidateEndpoint(candidate: CandidateDetails | null) {
  if (!candidate) return "—";
  const address = candidate.address ?? "Address hidden";
  return candidate.port === null ? address : `${address}:${candidate.port}`;
}

function formatSampleTime(timestamp: number | null) {
  if (timestamp === null) return "Waiting";
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function diagnosticSummary(connected: boolean, stats: PeerDiagnostics) {
  if (!connected) return "Waiting for media connection";
  if (stats.error) return stats.error;
  if (
    stats.localCandidate?.type === "relay" ||
    stats.remoteCandidate?.type === "relay"
  )
    return "Media is using a TURN relay";
  if (stats.localCandidate || stats.remoteCandidate)
    return "A direct ICE route is selected";
  return "Collecting live connection statistics";
}
