# SupportRoom release checklist

Run the automated checks before testing deployed devices:

```bash
pnpm lint
pnpm exec tsc --noEmit
pnpm test:signaling
pnpm build:signaling
pnpm exec next build --webpack
pnpm test:e2e
```

## Deployment smoke test

1. Open the Vercel frontend and confirm sign-in, password recovery, dashboard, settings, and session history load without console errors.
2. Open the Render `/health` URL. Confirm `status` is `ok`, the revision matches the deployment, and room/connection counts change during a test.
3. Create a room and confirm the invitation uses the deployed HTTPS frontend and a URL fragment token.
4. End the room and confirm the session appears in history with its close reason and diagnostic summary.

## Physical device matrix

Use the Mac as the agent and test each customer device separately:

- macOS Chrome to iPhone Safari
- macOS Safari to Android Chrome
- both devices on the same Wi-Fi
- Mac on Wi-Fi and phone on cellular data

For every pair, verify:

1. Camera and microphone preview, waiting-room notification, admission, and two-way audio/video.
2. Mute/unmute and camera off/on propagate without rebuilding the peer connection.
3. Remove and reconnect wired or Bluetooth headphones; confirm outgoing audio resumes and the device selector updates.
4. Switch cameras where the device provides more than one input.
5. Share and stop the Mac screen; confirm the customer sees one stable presentation and the camera resumes afterward.
6. Rotate and briefly background the phone, then return to the call.
7. Disable Wi-Fi or change networks and confirm signaling/ICE recovery or a clear failure message.
8. Leave from the customer and end from the host; confirm camera, microphone, screen-sharing, and wake-lock indicators stop.
9. Review diagnostics and session history after the call.

## TURN verification

In a controlled deployment window, set the signaling service `ICE_TRANSPORT_POLICY=relay`, redeploy it, and make a cross-network call. The diagnostics panel must show a relay candidate and two-way media. Restore the value to `all` after the test. A successful same-network call does not prove TURN is configured correctly.

## Known MVP boundary

The signaling service is intentionally single-instance and keeps active rooms in memory. A Render deployment or instance replacement ends those rooms. Do not scale horizontally until shared room state and message routing are implemented.
