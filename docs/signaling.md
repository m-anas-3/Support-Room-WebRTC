# Signaling milestone

This milestone adds an in-memory WebSocket signaling service for one host and one customer. It authenticates agent room creation, checks separate host and invitation tokens, tracks the waiting state, lets the host admit or decline the customer, issues short-lived TURN credentials, and forwards WebRTC offer, answer, ICE candidate, screen-share state, and camera/microphone state messages after admission.

The signaling server does not carry audio or video. Media flows through the browser's `RTCPeerConnection`, while the diagnostics panel reads live connection metrics and the selected candidate pair from `getStats()`.

## Concepts to learn

1. **Signaling** is the exchange of connection instructions between browsers. WebRTC does not prescribe the signaling transport; this project uses WebSockets.
2. An **SDP offer** describes a proposed media session, including codecs and transport details. The other browser returns an **SDP answer**. Neither message contains the video itself.
3. An **ICE candidate** describes a possible network path. The browsers exchange candidates and test paths; STUN helps discover addresses and TURN can relay media when a direct path is unavailable.
4. **Admission** is an application rule. This server blocks offer, answer, and candidate forwarding until the host admits the customer.

The peer-connection hook now creates SDP and gathers ICE candidates. Each browser sends `peer-ready` only after preparing its connection and installing its signal listener. The server sends `peers-ready` when both are ready, and only the host initiates an offer.

## Run locally

Use two terminals from the repository root:

```bash
pnpm dev:signaling
pnpm dev
```

Open the dashboard, create a room, copy the invitation link, and open the host room. Open the invitation in a separate browser profile or private window so it has a separate session. The customer name and admission state now travel through the signaling server.

The default WebSocket endpoint is `ws://localhost:8080/signal`. Set `NEXT_PUBLIC_SIGNALING_URL` for another endpoint. The server accepts `PORT`, `HOST`, a comma-separated `ALLOWED_ORIGINS` environment variable, and `HOST_RECONNECT_GRACE_MS` (30 seconds by default).

## Agent authentication

Creating a room requires the signed-in agent's Supabase access token. The signaling server sends that token to the project's `/auth/v1/user` endpoint with the publishable key and creates the room only after Supabase confirms the session. Joining with an existing host or customer room capability is unchanged, so customers still do not need accounts.

This verification path follows [Supabase's JWT verification guidance](https://supabase.com/docs/guides/auth/jwts) for projects that may use either asymmetric signing keys or the legacy shared-secret signing key. The access token travels only over `wss://` in production, is never stored in room state, and is not forwarded to the other participant.

Set these values on the signaling service. They identify the same project used by the frontend; the publishable key is intentionally safe to use for this verification request.

```text
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
SUPABASE_SECRET_KEY=YOUR_BACKEND_ONLY_SECRET_KEY
```

Local signaling startup reads `.env.local` when it exists and also accepts the frontend names `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Production startup fails when neither public-key pair is configured, preventing an accidentally unprotected room-creation endpoint. The secret key is optional during development; when configured, it finalizes unfinished session rows after a host disconnect, room expiry, or signaling shutdown. The legacy `SUPABASE_SERVICE_ROLE_KEY` remains a compatibility fallback, but new deployments should use `SUPABASE_SECRET_KEY`.

For production TURN, configure these variables on the signaling service, such as Render:

```text
STUN_URLS=stun:stun.l.google.com:19302
TURN_URLS=turn:turn.example.com:3478?transport=udp,turns:turn.example.com:5349?transport=tcp
TURN_SHARED_SECRET=the-same-random-secret-used-by-coturn
TURN_CREDENTIAL_TTL_SECONDS=3600
ICE_TRANSPORT_POLICY=all
HOST_RECONNECT_GRACE_MS=30000
```

Configure coturn with `use-auth-secret` and the same value as `static-auth-secret`. The shared secret stays on servers. Each joined browser receives only a time-limited derived credential. Set `ICE_TRANSPORT_POLICY=relay` temporarily when verifying TURN, then restore `all` so ICE can prefer a direct path.

## Current boundaries

- Rooms live in memory and disappear when the server restarts.
- The host secret stays in `sessionStorage`; the customer secret uses the URL fragment so it is not included in HTTP request URLs.
- A temporary signaling disconnect starts bounded exponential-backoff retries in the browser. Camera and microphone tracks remain available during this recovery window instead of being released immediately.
- A disconnected host has 30 seconds to rejoin using the same host secret. After either participant rejoins, the customer returns to waiting and must be admitted again before a fresh peer connection is negotiated. End room still closes immediately.
- When a room closes, the signaling service reconciles its unfinished Supabase history row without overwriting a report the host browser already completed.
- Rooms still live in memory, so a signaling-service restart closes active rooms. Supabase stores durable session history but does not restore live WebSocket membership or peer negotiation.
