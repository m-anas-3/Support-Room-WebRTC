# WebRTC peer connection milestone

SupportRoom now connects two browser participants with native WebRTC audio and video after the agent admits the customer. Either participant can replace their outgoing camera video with a shared screen.

## What changed

- `hooks/use-peer-connection.ts` starts and disposes a connection while the participant has local media, an admitted room, and an open signaling channel.
- `lib/webrtc/peer-connection.ts` owns the native connection, SDP operations, ICE queues, remote stream, and connection-state subscriptions. React reads its event-driven snapshots with `useSyncExternalStore`.
- `lib/webrtc/config.ts` configures STUN and optional TURN servers from environment variables. `NEXT_PUBLIC_ICE_TRANSPORT_POLICY=relay` can temporarily force relay candidates while verifying a TURN deployment.
- `components/room/video-tile.tsx` attaches a stream to `video.srcObject`. Local video is muted and mirrored; remote video plays the other participant's audio. A playback button handles browsers that block autoplay.
- `components/room/call-controls.tsx` controls actual tracks and provides explicit leave/end actions.
- `hooks/use-local-media.ts` manages camera and microphone tracks independently, releases camera capture when video is turned off, and attempts a same-kind fallback when hardware disappears.
- `hooks/use-outgoing-media.ts` synchronizes replacement tracks and explicit camera/microphone state without rebuilding the peer connection.
- `hooks/use-screen-share.ts` owns display capture, camera restoration, browser stop-sharing events, and display-track cleanup.
- `lib/webrtc/diagnostics.ts` turns cumulative WebRTC statistics into interval bitrate, packet loss, media activity, latency, and ICE-route details.
- The customer changes from preflight to call view on the same page, preserving the existing media stream and signaling connection.

## Screen-sharing flow

1. The participant clicks **Share screen**. The click is important because browsers require a fresh user action before `getDisplayMedia()` can show its source picker.
2. The browser returns a new display `MediaStream` after the participant chooses a screen, window, or tab.
3. The app finds the existing video `RTCRtpSender` and calls `replaceTrack(displayTrack)`. The microphone sender remains unchanged, and a normal same-kind replacement does not need a second SDP offer/answer exchange.
4. A small `screen-share-state` message tells the other participant to label and fit the remote video as a presentation. The screen pixels still travel through WebRTC rather than the WebSocket.
5. Clicking the app control or the browser's own stop-sharing control restores the live camera track and stops every display-capture track.

The display stream is separate from the camera/microphone stream. This keeps ownership clear: `useLocalMedia` releases device tracks, while `useScreenShare` releases display tracks.

The sharer's self tile continues to show their camera with a **Presenting** label. SupportRoom does not render the captured display back inside the tab being captured, because doing so creates the recursive screen-within-screen mirror when the user shares the current tab, browser window, or monitor.

## Device lifecycle and recovery

- Turning the camera off removes its track from the local stream, calls `RTCRtpSender.replaceTrack(null)`, and stops the track so the browser can release the camera hardware.
- Turning the camera back on requests a new video-only track and attaches it to the existing sender with `replaceTrack()`. The peer connection, microphone, and selected ICE route remain in place.
- Video and audio replacements are serialized so camera-off, camera-on, recovery, and screen-sharing operations cannot overwrite one another out of order. The remote media state is announced only after the matching sender replacement succeeds.
- A transient sender replacement failure is retried once. A persistent failure is shown in the call instead of leaving the local preview on while silently sending no video.
- Remote video listens for the receiver track's `mute` and `unmute` events. It shows a reconnecting state while frames are unavailable and explicitly resumes playback when media starts flowing again.
- Microphone mute remains a soft mute through `track.enabled = false`. This provides immediate unmute while sending silence instead of microphone samples.
- Camera and microphone `ended` events are handled separately. If one device is unplugged, the other track and the call remain active while the app tries the selected device and then the system default.
- `devicechange` refreshes the available device list and retries a wanted device that was previously unavailable.
- A small `media-state` signaling message lets the remote interface distinguish intentional camera/microphone state from network loss. It contains no media.

## Connection flow

1. Both participants explicitly start their camera and microphone preview.
2. The customer asks to join, and the host admits them.
3. Each browser creates one `RTCPeerConnection`, attaches tracks with `addTrack()`, installs its signal listener, and sends `peer-ready`.
4. Once both are ready, the server sends `peers-ready`. The host calls `createOffer()`, saves the result with `setLocalDescription()`, and sends the SDP.
5. The customer calls `setRemoteDescription()` with the offer, creates an answer, saves it locally, and sends it back. The host saves that answer as its remote description.
6. Each browser sends newly gathered ICE candidates through signaling. Received candidates wait until the remote description exists before `addIceCandidate()` applies them.
7. The `track` event supplies remote tracks. They are collected into a `MediaStream` for playback.

## TURN and connection recovery

- Set `NEXT_PUBLIC_TURN_URLS`, `NEXT_PUBLIC_TURN_USERNAME`, and `NEXT_PUBLIC_TURN_CREDENTIAL` to add relay candidates. TURN credentials must reach the browser, so production credentials should be short-lived and regularly rotated rather than permanent shared secrets.
- Keep `NEXT_PUBLIC_ICE_TRANSPORT_POLICY=all` in normal operation. Set it to `relay` only during a controlled test to prove that media can travel through TURN.
- A temporary ICE `disconnected` state gets a four-second grace period because browsers often recover brief network interruptions themselves.
- A `failed` state, or a disconnection that survives the grace period, starts connection recovery. The host remains the offerer and creates an ICE-restart offer, while the customer can send an `ice-restart-request` through signaling.
- Each side keeps its current senders, tracks, and remote stream during renegotiation. Recovery gets two attempts before the call reports a terminal error.
- SDP and candidates are re-buffered for each new local description so candidates from an ICE restart cannot overtake its offer or answer on the signaling channel.

SDP operations and incoming ICE messages are processed sequentially. Local candidates are buffered until the matching SDP has been sent. Pending asynchronous work checks whether its connection has already been disposed before applying results.

## Concepts to learn

**Stream and track:** a stream groups media tracks. Camera and microphone tracks are separate; `addTrack()` attaches them to the connection for transmission.

**Signaling and media:** WebSockets exchange instructions. `RTCPeerConnection` carries media over the selected network path. SDP describes the session, including media capabilities and transport information; it does not contain video frames.

**Local and remote descriptions:** local means this browser's offer or answer. Remote means the description received from the other browser. These descriptions govern the SDP signaling state.

**ICE, STUN, and TURN:** ICE gathers and tests possible network paths. STUN helps discover a public-facing address. TURN relays media when a usable direct path is unavailable. A STUN-only configuration does not guarantee connectivity across all networks.

**Three states:** SDP signaling state tracks offer/answer progress; ICE state tracks network-path establishment; overall connection state reports whether the connection is usable. These are distinct from the WebSocket's connection state.

**Mute and release:** setting `track.enabled = false` keeps a track alive and sends silence or black video. SupportRoom uses this for fast microphone mute. Camera-off uses `track.stop()` for stronger hardware release, then obtains a new track when video resumes. Closing the peer connection ends its transport but does not replace stopping local device tracks.

**Track replacement:** `replaceTrack()` changes the source used by an existing RTP sender. Camera and screen are both video tracks, so the transport, transceiver, and negotiated video media section can usually stay in place.

**Transient permission:** screen-sharing permission cannot be saved for later. The browser must ask again and the call must originate from a current user action each time sharing starts.

## Validation and current limits

`pnpm test:signaling` checks admission, role and token enforcement, readiness, isolation, expiry, the host reconnect window, media-state relay, and customer-to-host ICE restart requests. `pnpm test:e2e` runs real Chromium peer connections with fake camera/microphone devices, checks inbound audio/video RTP bytes, verifies the live diagnostics panel, proves normal and rapid camera restarts resume incoming video without a new peer connection, verifies screen sharing sends the display track while the local tile stays on the camera, simulates device removal and recovery, and verifies cleanup.

The tests use a separate `.next-e2e` directory and local test ports. Headless Chromium receives a separate fake native video track in place of the operating-system source picker, allowing the test to verify sender replacement, state relay, camera restoration, and display-track cleanup. Automated tests do not prove cross-network reliability or exercise a deployed TURN service. Production identity and persistent history remain future work.

## Authoritative resources

- [MDN: signaling and video calling](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Signaling_and_video_calling)
- [MDN: addIceCandidate and its remote-description requirement](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/addIceCandidate)
- [MDN: receiving remote tracks](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/track_event)
- [MDN: MediaStreamTrack.enabled](https://developer.mozilla.org/en-US/docs/Web/API/MediaStreamTrack/enabled)
- [MDN: MediaStreamTrack.stop](https://developer.mozilla.org/en-US/docs/Web/API/MediaStreamTrack/stop)
- [MDN: MediaDevices devicechange](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/devicechange_event)
- [MDN: closing a peer connection](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/close)
- [MDN: getDisplayMedia](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getDisplayMedia)
- [MDN: replaceTrack](https://developer.mozilla.org/en-US/docs/Web/API/RTCRtpSender/replaceTrack)
- [MDN: MediaStreamTrack ended event](https://developer.mozilla.org/en-US/docs/Web/API/MediaStreamTrack/ended_event)
- [MDN: MediaStreamTrack mute event](https://developer.mozilla.org/en-US/docs/Web/API/MediaStreamTrack/mute_event)
- [W3C: WebRTC Statistics API](https://www.w3.org/TR/webrtc-stats/)
- [MDN: RTCPeerConnection.getStats](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/getStats)
- [MDN: RTCPeerConnection.restartIce](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/restartIce)
- [WebRTC.org: TURN server](https://webrtc.org/getting-started/turn-server)
- [Official WebRTC peer connection sample](https://webrtc.github.io/samples/src/content/peerconnection/pc1/)
