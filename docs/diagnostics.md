# Live WebRTC diagnostics

The agent room samples `RTCPeerConnection.getStats()` every two seconds and converts the browser's raw cumulative counters into troubleshooting information.

## Data flow

1. `PeerConnectionStore` owns the active `RTCPeerConnection`, so it also owns the polling timer and stops it when the connection closes.
2. `getStats()` returns an `RTCStatsReport`. This is a graph of records connected through IDs, rather than one flat connection object.
3. `lib/webrtc/diagnostics.ts` reads RTP counters, finds the active ICE candidate pair, calculates interval values, and returns a UI-safe snapshot.
4. React receives that snapshot through the existing `useSyncExternalStore` subscription. Diagnostics polling does not cause SDP negotiation or signaling traffic.

## Calculations

### Bitrate

`bytesSent` and `bytesReceived` count bytes since the RTP stream began. Current bitrate requires two samples:

```text
bitrate in kbps = (new bytes - old bytes) × 8 ÷ elapsed seconds ÷ 1000
```

The panel combines audio and video RTP bitrates for each direction. The first report shows a dash because one sample cannot produce an interval rate.

### Packet loss

Receive loss uses the change in local `inbound-rtp` packet counters:

```text
receive loss % = lost packet delta ÷ (received packet delta + lost packet delta) × 100
```

Send loss comes from `remote-inbound-rtp.fractionLost`. It is the loss reported by the other browser through RTCP receiver reports, so it may appear later than local receive loss.

### Round-trip time

The preferred value is `currentRoundTripTime` from the selected ICE candidate pair. The browser reports it in seconds, and the UI converts it to milliseconds. If that field is absent, the collector falls back to round-trip measurements from remote inbound RTP reports.

### Selected ICE route

The transport record points to its active candidate pair through `selectedCandidatePairId`. The pair then points to local and remote candidate records through `localCandidateId` and `remoteCandidateId`.

Candidate types have different meanings:

- `host`: an address discovered directly on the device or local network.
- `srflx`: a server-reflexive public address discovered through STUN.
- `prflx`: a peer-reflexive address discovered during ICE checks.
- `relay`: an address allocated by TURN; media is being relayed.

Browsers can hide or replace candidate addresses for privacy. The candidate type and transport protocol are usually more useful than the exact IP address.

### Media activity

Audio and video are marked active only when their RTP byte counters increase between samples. This answers whether packets moved during the latest interval. It does not prove that a microphone contains speech or that a video frame contains visible motion.

## Why poll every two seconds

A shorter interval reacts faster but causes more `getStats()` calls, more React updates, and noisier values. A longer interval is cheaper and smoother but hides brief network changes. Two seconds is a practical troubleshooting default for a one-to-one call. A future history graph can retain samples without changing the collector.

## Interpretation limits

- A low RTT does not guarantee good media; packet loss, jitter, decoding performance, and bandwidth also matter.
- Bitrate depends on content. A static screen share can have a much lower bitrate than a moving camera while still looking clear.
- Zero packet loss in one sample means no loss was observed during that interval. It is not a guarantee about the whole call.
- `availableOutgoingBitrate` is the browser's estimate of available sending capacity, not a promised speed.
- A relay candidate is expected on restrictive networks and does not by itself mean the call is unhealthy.
- Browsers may omit optional fields. The UI displays a dash until a valid measurement is available.

## Authoritative references

- [W3C WebRTC Statistics API](https://www.w3.org/TR/webrtc-stats/)
- [W3C RTCPeerConnection.getStats() definition](https://www.w3.org/TR/webrtc/#dom-rtcpeerconnection-getstats)
- [MDN RTCPeerConnection.getStats()](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/getStats)
