export type MediaKind = "audio" | "video";
export type ActivityState = Record<MediaKind, boolean | null>;

export type CandidateDetails = {
  type: string | null;
  protocol: string | null;
  address: string | null;
  port: number | null;
  relayProtocol: string | null;
};

export type PeerDiagnostics = {
  sampledAt: number | null;
  sendBitrateKbps: number | null;
  receiveBitrateKbps: number | null;
  incomingPacketLossPercent: number | null;
  outgoingPacketLossPercent: number | null;
  roundTripTimeMs: number | null;
  jitterMs: number | null;
  availableOutgoingBitrateKbps: number | null;
  localCandidate: CandidateDetails | null;
  remoteCandidate: CandidateDetails | null;
  sending: ActivityState;
  receiving: ActivityState;
  error: string | null;
};

type CounterSample = {
  timestamp: number;
  bytes?: number;
  packetsReceived?: number;
  packetsLost?: number;
};

export type DiagnosticsHistory = Map<string, CounterSample>;

type StatsRecord = RTCStats & Record<string, unknown>;

export const emptyPeerDiagnostics: PeerDiagnostics = {
  sampledAt: null,
  sendBitrateKbps: null,
  receiveBitrateKbps: null,
  incomingPacketLossPercent: null,
  outgoingPacketLossPercent: null,
  roundTripTimeMs: null,
  jitterMs: null,
  availableOutgoingBitrateKbps: null,
  localCandidate: null,
  remoteCandidate: null,
  sending: { audio: null, video: null },
  receiving: { audio: null, video: null },
  error: null,
};

function numberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function mediaKind(stat: StatsRecord): MediaKind | null {
  const kind = stat.kind ?? stat.mediaType;
  return kind === "audio" || kind === "video" ? kind : null;
}

function candidateDetails(stat: StatsRecord | undefined): CandidateDetails | null {
  if (!stat) return null;
  return {
    type: stringValue(stat.candidateType),
    protocol: stringValue(stat.protocol),
    address: stringValue(stat.address),
    port: numberValue(stat.port) ?? null,
    relayProtocol: stringValue(stat.relayProtocol),
  };
}

function rateKbps(bytes: number, previous: CounterSample | undefined, timestamp: number) {
  if (previous?.bytes === undefined || bytes < previous.bytes) return null;
  const seconds = (timestamp - previous.timestamp) / 1000;
  return seconds > 0 ? ((bytes - previous.bytes) * 8) / seconds / 1000 : null;
}

export function collectPeerDiagnostics(report: RTCStatsReport, previous: DiagnosticsHistory): {
  diagnostics: PeerDiagnostics;
  history: DiagnosticsHistory;
} {
  const stats = new Map<string, StatsRecord>();
  report.forEach((value) => { stats.set(value.id, value as StatsRecord); });

  const history: DiagnosticsHistory = new Map();
  const sending: ActivityState = { audio: null, video: null };
  const receiving: ActivityState = { audio: null, video: null };
  let sampledAt: number | null = null;
  let sendBitrate = 0;
  let receiveBitrate = 0;
  let hasSendRate = false;
  let hasReceiveRate = false;
  let receivedPackets = 0;
  let lostPackets = 0;
  let hasLossInterval = false;
  const outgoingLossFractions: number[] = [];
  const mediaRoundTrips: number[] = [];
  const inboundJitters: number[] = [];

  for (const stat of stats.values()) {
    sampledAt = Math.max(sampledAt ?? 0, stat.timestamp);
    const kind = mediaKind(stat);
    if (stat.type === "outbound-rtp" && kind) {
      const bytes = numberValue(stat.bytesSent);
      if (bytes === undefined) continue;
      const prior = previous.get(stat.id);
      const rate = rateKbps(bytes, prior, stat.timestamp);
      if (rate !== null) {
        sendBitrate += rate;
        hasSendRate = true;
        sending[kind] = Boolean(sending[kind]) || bytes > (prior?.bytes ?? bytes);
      }
      history.set(stat.id, { timestamp: stat.timestamp, bytes });
    }

    if (stat.type === "inbound-rtp" && kind) {
      const bytes = numberValue(stat.bytesReceived);
      const packets = numberValue(stat.packetsReceived);
      const lost = numberValue(stat.packetsLost);
      const jitter = numberValue(stat.jitter);
      if (jitter !== undefined && jitter >= 0) inboundJitters.push(jitter);
      if (bytes === undefined) continue;
      const prior = previous.get(stat.id);
      const rate = rateKbps(bytes, prior, stat.timestamp);
      if (rate !== null) {
        receiveBitrate += rate;
        hasReceiveRate = true;
        receiving[kind] = Boolean(receiving[kind]) || bytes > (prior?.bytes ?? bytes);
      }
      if (prior && packets !== undefined && lost !== undefined && prior.packetsReceived !== undefined && prior.packetsLost !== undefined) {
        const receivedDelta = Math.max(0, packets - prior.packetsReceived);
        const lostDelta = Math.max(0, lost - prior.packetsLost);
        if (receivedDelta + lostDelta > 0) {
          receivedPackets += receivedDelta;
          lostPackets += lostDelta;
          hasLossInterval = true;
        }
      }
      history.set(stat.id, { timestamp: stat.timestamp, bytes, packetsReceived: packets, packetsLost: lost });
    }

    if (stat.type === "remote-inbound-rtp") {
      const fractionLost = numberValue(stat.fractionLost);
      const roundTripTime = numberValue(stat.roundTripTime);
      if (fractionLost !== undefined && fractionLost >= 0) outgoingLossFractions.push(fractionLost);
      if (roundTripTime !== undefined && roundTripTime >= 0) mediaRoundTrips.push(roundTripTime);
    }
  }

  let selectedPair: StatsRecord | undefined;
  for (const stat of stats.values()) {
    if (stat.type !== "transport") continue;
    const selectedId = stringValue(stat.selectedCandidatePairId);
    if (selectedId) {
      selectedPair = stats.get(selectedId);
      if (selectedPair) break;
    }
  }
  // `selected` is retained as a compatibility fallback for older engines.
  if (!selectedPair) {
    selectedPair = [...stats.values()].find((stat) => stat.type === "candidate-pair" && (stat.selected === true || (stat.nominated === true && stat.state === "succeeded")));
  }

  const localCandidateId = selectedPair ? stringValue(selectedPair.localCandidateId) : null;
  const remoteCandidateId = selectedPair ? stringValue(selectedPair.remoteCandidateId) : null;
  const pairRoundTrip = selectedPair ? numberValue(selectedPair.currentRoundTripTime) : undefined;
  const roundTripSeconds = pairRoundTrip ?? (mediaRoundTrips.length ? mediaRoundTrips.reduce((total, value) => total + value, 0) / mediaRoundTrips.length : undefined);
  const availableOutgoingBitrate = selectedPair ? numberValue(selectedPair.availableOutgoingBitrate) : undefined;

  return {
    diagnostics: {
      sampledAt,
      sendBitrateKbps: hasSendRate ? sendBitrate : null,
      receiveBitrateKbps: hasReceiveRate ? receiveBitrate : null,
      incomingPacketLossPercent: hasLossInterval ? (lostPackets / (receivedPackets + lostPackets)) * 100 : null,
      outgoingPacketLossPercent: outgoingLossFractions.length ? (outgoingLossFractions.reduce((total, value) => total + value, 0) / outgoingLossFractions.length) * 100 : null,
      roundTripTimeMs: roundTripSeconds === undefined ? null : roundTripSeconds * 1000,
      jitterMs: inboundJitters.length ? (inboundJitters.reduce((total, value) => total + value, 0) / inboundJitters.length) * 1000 : null,
      availableOutgoingBitrateKbps: availableOutgoingBitrate === undefined ? null : availableOutgoingBitrate / 1000,
      localCandidate: candidateDetails(localCandidateId ? stats.get(localCandidateId) : undefined),
      remoteCandidate: candidateDetails(remoteCandidateId ? stats.get(remoteCandidateId) : undefined),
      sending,
      receiving,
      error: null,
    },
    history,
  };
}
