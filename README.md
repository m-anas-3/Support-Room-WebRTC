# SupportRoom

SupportRoom is a browser application for private one-to-one video support calls. The frontend is built with Next.js, TypeScript, Tailwind CSS, and shadcn/ui. A Node.js `ws` service handles room creation, waiting-room admission, and WebRTC negotiation messages.

The current implementation includes the frontend screens, real camera and microphone previews, WebSocket room signaling, and one-to-one WebRTC audio/video after admission. Calls include microphone/camera controls, screen sharing for either participant, complete media-track cleanup, and live connection diagnostics from `getStats()`.

## Development

Install dependencies once:

```bash
pnpm install
```

Run the signaling service and web application in separate terminals:

```bash
pnpm dev:signaling
pnpm dev
```

Then open [http://localhost:3000](http://localhost:3000). Create a room from the dashboard and open its invitation link in another browser profile or a private window.

Start the agent's camera, then start the customer's preview and ask to join. Admit the customer from the agent room to establish the media connection.

## Workspace

- `app`, `components`, `hooks`, `lib`: Next.js web application
- `apps/signaling`: WebSocket signaling service
- `packages/shared`: validated message schemas and shared TypeScript types
- `docs/signaling.md`: signaling flow, configuration, and current boundaries
- `docs/webrtc.md`: peer connection implementation and learning concepts
- `docs/diagnostics.md`: metric calculations, interpretation, and tradeoffs

## Validation

```bash
pnpm lint
pnpm test:signaling
pnpm exec playwright install chromium
pnpm test:e2e
pnpm build:signaling
pnpm exec next build --webpack
```

The browser tests use fake media devices and separate test servers on ports 3100 and 8081. Camera and microphone removal now recover independently without rebuilding the call. Calls across restricted networks may still require TURN, which is not configured yet. ICE/network recovery, Supabase authentication, and persistent history are subsequent milestones.
