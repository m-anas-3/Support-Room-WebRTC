export function getRtcConfiguration(): RTCConfiguration {
  // This development default is also used in the official WebRTC samples.
  // An empty value permits local-network tests without an external STUN service.
  const urls = (process.env.NEXT_PUBLIC_STUN_URLS ?? "stun:stun.l.google.com:19302")
    .split(",").map((url) => url.trim()).filter(Boolean);
  if (urls.some((url) => !/^stuns?:/.test(url))) {
    throw new Error("NEXT_PUBLIC_STUN_URLS must contain comma-separated stun: or stuns: URLs.");
  }
  return { iceServers: urls.length ? [{ urls }] : [] };
}
