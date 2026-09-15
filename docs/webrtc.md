# WebRTC peer connection milestone

SupportRoom now connects two browser participants with native WebRTC audio and video after the agent admits the customer.

## What changed

- `hooks/use-peer-connection.ts` starts and disposes a connection while the participant has local media, an admitted room, and an open signaling channel.
- `lib/webrtc/peer-connection.ts` owns the native connection, SDP operations, ICE queues, remote stream, and connection-state subscriptions. React reads its event-driven snapshots with `useSyncExternalStore`.
- `lib/webrtc/config.ts` configures STUN from `NEXT_PUBLIC_STUN_URLS`. The development default matches the official WebRTC samples. An empty value disables external STUN for local-network testing.
- `components/room/video-tile.tsx` attaches a stream to `video.srcObject`. Local video is muted and mirrored; remote video plays the other participant's audio. A playback button handles browsers that block autoplay.
- `components/room/call-controls.tsx` controls actual tracks and provides explicit leave/end actions.
- The customer changes from preflight to call view on the same page, preserving the existing media stream and signaling connection.

## Connection flow

1. Both participants explicitly start their camera and microphone preview.
2. The customer asks to join, and the host admits them.
3. Each browser creates one `RTCPeerConnection`, attaches tracks with `addTrack()`, installs its signal listener, and sends `peer-ready`.
4. Once both are ready, the server sends `peers-ready`. The host calls `createOffer()`, saves the result with `setLocalDescription()`, and sends the SDP.
5. The customer calls `setRemoteDescription()` with the offer, creates an answer, saves it locally, and sends it back. The host saves that answer as its remote description.
6. Each browser sends newly gathered ICE candidates through signaling. Received candidates wait until the remote description exists before `addIceCandidate()` applies them.
7. The `track` event supplies remote tracks. They are collected into a `MediaStream` for playback.

SDP operations and incoming ICE messages are processed sequentially. Local candidates are buffered until the matching SDP has been sent. Pending asynchronous work checks whether its connection has already been disposed before applying results.

## Concepts to learn

**Stream and track:** a stream groups media tracks. Camera and microphone tracks are separate; `addTrack()` attaches them to the connection for transmission.

**Signaling and media:** WebSockets exchange instructions. `RTCPeerConnection` carries media over the selected network path. SDP describes the session, including media capabilities and transport information; it does not contain video frames.

**Local and remote descriptions:** local means this browser's offer or answer. Remote means the description received from the other browser. These descriptions govern the SDP signaling state.

**ICE, STUN, and TURN:** ICE gathers and tests possible network paths. STUN helps discover a public-facing address. TURN relays media when a usable direct path is unavailable. A STUN-only configuration does not guarantee connectivity across all networks.

**Three states:** SDP signaling state tracks offer/answer progress; ICE state tracks network-path establishment; overall connection state reports whether the connection is usable. These are distinct from the WebSocket's connection state.

**Mute and release:** setting `track.enabled = false` keeps the track alive and sends silence or black video. `track.stop()` ends capture. Closing the peer connection ends its transport but does not replace stopping the local device tracks. Room leave handles both.

## Validation and current limits

`pnpm test:signaling` checks admission, role and token enforcement, readiness, isolation, expiry, and the host reconnect window. `pnpm test:e2e` runs real Chromium peer connections with fake camera/microphone devices, checks inbound audio/video RTP bytes and rendered video, exercises track controls, and verifies cleanup.

The tests use a separate `.next-e2e` directory and local test ports. They do not establish cross-network reliability. TURN, screen sharing, automatic recovery, numeric `getStats()` diagnostics, production identity, and persistent history remain future work.

## Authoritative resources

- [MDN: signaling and video calling](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Signaling_and_video_calling)
- [MDN: addIceCandidate and its remote-description requirement](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/addIceCandidate)
- [MDN: receiving remote tracks](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/track_event)
- [MDN: MediaStreamTrack.enabled](https://developer.mozilla.org/en-US/docs/Web/API/MediaStreamTrack/enabled)
- [MDN: closing a peer connection](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/close)
- [Official WebRTC peer connection sample](https://webrtc.github.io/samples/src/content/peerconnection/pc1/)
