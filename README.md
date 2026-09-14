# SupportRoom

SupportRoom is a browser application for private one-to-one video support calls. The frontend is built with Next.js, TypeScript, Tailwind CSS, and shadcn/ui. A Node.js `ws` service handles room creation, waiting-room admission, and WebRTC negotiation messages.

The current implementation includes the complete frontend, real local camera and microphone previews, and the signaling milestone. The next milestone is the browser-to-browser `RTCPeerConnection` that carries audio and video.

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

## Workspace

- `app`, `components`, `hooks`, `lib`: Next.js web application
- `apps/signaling`: WebSocket signaling service
- `packages/shared`: validated message schemas and shared TypeScript types
- `docs/signaling.md`: signaling flow, configuration, and current boundaries

## Validation

```bash
pnpm lint
pnpm test:signaling
pnpm build:signaling
pnpm exec next build --webpack
```
