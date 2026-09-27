import type { IceConfiguration } from "@support-room/shared";

export function getRtcConfiguration(): RTCConfiguration {
  const stunUrls = splitUrls(process.env.NEXT_PUBLIC_STUN_URLS ?? "stun:stun.l.google.com:19302");
  const turnUrls = splitUrls(process.env.NEXT_PUBLIC_TURN_URLS ?? "");
  if (stunUrls.some((url) => !/^stuns?:/i.test(url))) {
    throw new Error("NEXT_PUBLIC_STUN_URLS must contain comma-separated stun: or stuns: URLs.");
  }
  if (turnUrls.some((url) => !/^turns?:/i.test(url))) {
    throw new Error("NEXT_PUBLIC_TURN_URLS must contain comma-separated turn: or turns: URLs.");
  }

  const iceServers: RTCIceServer[] = [];
  if (stunUrls.length) iceServers.push({ urls: stunUrls });
  if (turnUrls.length) {
    const username = process.env.NEXT_PUBLIC_TURN_USERNAME?.trim();
    const credential = process.env.NEXT_PUBLIC_TURN_CREDENTIAL?.trim();
    if (!username || !credential) throw new Error("TURN URLs require a username and credential.");
    iceServers.push({ urls: turnUrls, username, credential });
  }

  const policy = process.env.NEXT_PUBLIC_ICE_TRANSPORT_POLICY;
  if (policy && policy !== "all" && policy !== "relay") {
    throw new Error("NEXT_PUBLIC_ICE_TRANSPORT_POLICY must be all or relay.");
  }
  const iceTransportPolicy: RTCIceTransportPolicy = policy === "relay" ? "relay" : "all";
  return { iceServers, iceTransportPolicy };
}

export function resolveRtcConfiguration(configuration: IceConfiguration | null): RTCConfiguration {
  if (!configuration) return getRtcConfiguration();
  if (configuration.expiresAt <= Date.now()) {
    throw new Error("The TURN credentials have expired. Reconnect to the room and try again.");
  }
  return {
    iceServers: configuration.iceServers,
    iceTransportPolicy: configuration.iceTransportPolicy,
  };
}

function splitUrls(value: string) {
  return value.split(",").map((url) => url.trim()).filter(Boolean);
}
