import { createHmac } from "node:crypto";
import type { IceConfiguration } from "@support-room/shared";

export type IceConfigurationOptions = {
  stunUrls: string[];
  turnUrls: string[];
  sharedSecret: string;
  ttlSeconds: number;
  transportPolicy: "all" | "relay";
};

export function iceConfigurationFromEnv(env: NodeJS.ProcessEnv): IceConfigurationOptions | null {
  const turnUrls = splitUrls(env.TURN_URLS ?? "");
  if (!turnUrls.length) return null;
  validateUrls(turnUrls, /^turns?:/i, "TURN_URLS", "turn: or turns:");

  const sharedSecret = env.TURN_SHARED_SECRET?.trim();
  if (!sharedSecret) throw new Error("TURN_URLS requires TURN_SHARED_SECRET on the signaling server.");

  const stunUrls = splitUrls(env.STUN_URLS ?? "stun:stun.l.google.com:19302");
  validateUrls(stunUrls, /^stuns?:/i, "STUN_URLS", "stun: or stuns:");

  const ttlSeconds = readTtl(env.TURN_CREDENTIAL_TTL_SECONDS);
  const transportPolicy = env.ICE_TRANSPORT_POLICY?.trim() || "all";
  if (transportPolicy !== "all" && transportPolicy !== "relay") {
    throw new Error("ICE_TRANSPORT_POLICY must be all or relay.");
  }

  return { stunUrls, turnUrls, sharedSecret, ttlSeconds, transportPolicy };
}

export function issueIceConfiguration(
  options: IceConfigurationOptions,
  subject: string,
  nowMs = Date.now(),
): IceConfiguration {
  const expiresAtSeconds = Math.floor(nowMs / 1000) + options.ttlSeconds;
  const username = `${expiresAtSeconds}:${subject}`;
  const credential = createHmac("sha1", options.sharedSecret).update(username).digest("base64");
  const iceServers: IceConfiguration["iceServers"] = [];
  if (options.stunUrls.length) iceServers.push({ urls: options.stunUrls });
  iceServers.push({ urls: options.turnUrls, username, credential });

  return {
    type: "ice-configuration",
    iceServers,
    iceTransportPolicy: options.transportPolicy,
    expiresAt: expiresAtSeconds * 1000,
  };
}

function readTtl(value: string | undefined) {
  if (!value?.trim()) return 3600;
  const ttl = Number(value);
  if (!Number.isInteger(ttl) || ttl < 600 || ttl > 86400) {
    throw new Error("TURN_CREDENTIAL_TTL_SECONDS must be an integer between 600 and 86400.");
  }
  return ttl;
}

function splitUrls(value: string) {
  return value.split(",").map((url) => url.trim()).filter(Boolean);
}

function validateUrls(urls: string[], pattern: RegExp, variable: string, protocols: string) {
  if (urls.some((url) => !pattern.test(url))) {
    throw new Error(`${variable} must contain comma-separated ${protocols} URLs.`);
  }
}
