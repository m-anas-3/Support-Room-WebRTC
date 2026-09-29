import type { PeerDiagnostics } from "./diagnostics";

export type ConnectionHealthLevel = "checking" | "excellent" | "good" | "fair" | "poor";

export type ConnectionHealthIssue = {
  id: "reconnecting" | "packet-loss" | "latency" | "jitter" | "outgoing-media" | "incoming-media";
  title: string;
  guidance: string;
};

export type ExpectedMedia = {
  audio: boolean;
  video: boolean;
};

export function assessConnectionHealth({
  connected,
  reconnecting,
  recoveryAttempts,
  diagnostics,
  localMedia,
  remoteMedia,
}: {
  connected: boolean;
  reconnecting: boolean;
  recoveryAttempts: number;
  diagnostics: PeerDiagnostics;
  localMedia: ExpectedMedia;
  remoteMedia: ExpectedMedia;
}) {
  const issues: ConnectionHealthIssue[] = [];
  const loss = maximum(diagnostics.incomingPacketLossPercent, diagnostics.outgoingPacketLossPercent);

  if (reconnecting) {
    issues.push({
      id: "reconnecting",
      title: "The media connection is recovering",
      guidance: "Keep the room open while SupportRoom tests a new network route.",
    });
  }
  if (loss !== null && loss >= 3) {
    issues.push({
      id: "packet-loss",
      title: `${formatNumber(loss)}% packet loss detected`,
      guidance: "Move closer to Wi-Fi, pause large transfers, or change networks if media breaks up.",
    });
  }
  if (diagnostics.roundTripTimeMs !== null && diagnostics.roundTripTimeMs >= 250) {
    issues.push({
      id: "latency",
      title: `${Math.round(diagnostics.roundTripTimeMs)} ms round-trip latency`,
      guidance: "A nearer or less busy network may reduce conversation delay.",
    });
  }
  if (diagnostics.jitterMs !== null && diagnostics.jitterMs >= 30) {
    issues.push({
      id: "jitter",
      title: `${Math.round(diagnostics.jitterMs)} ms packet jitter`,
      guidance: "Unstable packet arrival can affect audio. Try a stronger Wi-Fi or wired connection.",
    });
  }
  if (isExpectedButIdle(localMedia, diagnostics.sending)) {
    issues.push({
      id: "outgoing-media",
      title: "Expected outgoing media is idle",
      guidance: "Check the selected camera or microphone and confirm that another app is not using it.",
    });
  }
  if (isExpectedButIdle(remoteMedia, diagnostics.receiving)) {
    issues.push({
      id: "incoming-media",
      title: "Expected incoming media is idle",
      guidance: "Ask the other participant to check their device, then review the selected ICE route.",
    });
  }

  return {
    level: healthLevel({ connected, reconnecting, recoveryAttempts, diagnostics, loss }),
    issues,
  };
}

function healthLevel({ connected, reconnecting, recoveryAttempts, diagnostics, loss }: {
  connected: boolean;
  reconnecting: boolean;
  recoveryAttempts: number;
  diagnostics: PeerDiagnostics;
  loss: number | null;
}): ConnectionHealthLevel {
  if (!connected || diagnostics.sampledAt === null) return "checking";
  if (reconnecting || (loss !== null && loss >= 8) || atLeast(diagnostics.roundTripTimeMs, 500) || atLeast(diagnostics.jitterMs, 60)) return "poor";
  if ((loss !== null && loss >= 3) || atLeast(diagnostics.roundTripTimeMs, 250) || atLeast(diagnostics.jitterMs, 30) || recoveryAttempts > 0) return "fair";
  if ((loss !== null && loss >= 1) || atLeast(diagnostics.roundTripTimeMs, 150) || atLeast(diagnostics.jitterMs, 20)) return "good";
  return "excellent";
}

function isExpectedButIdle(expected: ExpectedMedia, activity: PeerDiagnostics["sending"] | PeerDiagnostics["receiving"]) {
  return (expected.audio && activity.audio === false) || (expected.video && activity.video === false);
}

function maximum(...values: Array<number | null>) {
  const available = values.filter((value): value is number => value !== null);
  return available.length ? Math.max(...available) : null;
}

function atLeast(value: number | null, threshold: number) {
  return value !== null && value >= threshold;
}

function formatNumber(value: number) {
  return value < 10 ? value.toFixed(1) : Math.round(value).toString();
}
