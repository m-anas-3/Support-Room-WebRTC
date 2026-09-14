# Signaling milestone

This milestone adds an in-memory WebSocket signaling service for one host and one customer. It creates rooms, checks separate host and invitation tokens, tracks the waiting state, lets the host admit or decline the customer, and forwards WebRTC offer, answer, and ICE candidate messages after admission.

The signaling server does not carry audio or video. Those media tracks will flow through an `RTCPeerConnection` in the next milestone. The current room screen deliberately leaves bitrate, packet loss, latency, and ICE fields empty until `getStats()` can supply real values.

## Concepts to learn

1. **Signaling** is the exchange of connection instructions between browsers. WebRTC does not prescribe the signaling transport; this project uses WebSockets.
2. An **SDP offer** describes a proposed media session, including codecs and transport details. The other browser returns an **SDP answer**. Neither message contains the video itself.
3. An **ICE candidate** describes a possible network path. The browsers exchange candidates and test paths; STUN helps discover addresses and TURN can relay media when a direct path is unavailable.
4. **Admission** is an application rule. This server blocks offer, answer, and candidate forwarding until the host admits the customer.

The server is ready to forward these messages. Creating SDP and gathering ICE candidates belongs to the upcoming peer-connection hook.

## Run locally

Use two terminals from the repository root:

```bash
pnpm dev:signaling
pnpm dev
```

Open the dashboard, create a room, copy the invitation link, and open the host room. Open the invitation in a separate browser profile or private window so it has a separate session. The customer name and admission state now travel through the signaling server.

The default WebSocket endpoint is `ws://localhost:8080/signal`. Set `NEXT_PUBLIC_SIGNALING_URL` for another endpoint. The server accepts `PORT`, `HOST`, and a comma-separated `ALLOWED_ORIGINS` environment variable.

## Current boundaries

- Rooms live in memory and disappear when the server restarts.
- The host secret stays in `sessionStorage`; the customer secret uses the URL fragment so it is not included in HTTP request URLs.
- A host disconnect closes its room. Reconnection and session persistence come later.
- Production identity checks will be added with Supabase authentication. Dashboard statistics and session history still use example data.
