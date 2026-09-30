# SupportRoom

SupportRoom is a browser application for private one-to-one video support calls. The frontend is built with Next.js, TypeScript, Tailwind CSS, and shadcn/ui. A Node.js `ws` service handles room creation, waiting-room admission, and WebRTC negotiation messages.

The current implementation includes the frontend screens, Supabase agent authentication, password recovery, session history with abandoned-room reconciliation, authenticated room creation, persisted agent profiles, call defaults, and notification preferences, real camera and microphone previews, WebSocket room signaling, and one-to-one WebRTC audio/video after admission. Calls include microphone/camera controls, in-call device switching, supported-browser speaker routing, screen sharing for either participant, complete media-track cleanup, ICE and WebSocket recovery, signaling-issued short-lived TURN credentials, browser alerts, and live connection diagnostics from `getStats()`.

## Development

Install dependencies once:

```bash
pnpm install
```

Copy the variables from `.env.example` into `.env.local` and add your Supabase project URL and publishable key. Create the first agent from the Supabase Authentication dashboard; public sign-up is intentionally disabled.

Apply the tracked database migration to your Supabase project before testing session history:

```bash
pnpm exec supabase login
pnpm exec supabase link --project-ref YOUR_PROJECT_ID
pnpm exec supabase db push --dry-run
pnpm exec supabase db push
```

The dry run shows the exact schema changes before anything reaches the remote database. See `docs/session-history.md` for the data model, RLS policies, and local workflow.

Run the signaling service and web application in separate terminals:

```bash
pnpm dev:signaling
pnpm dev
```

Then open [http://localhost:3000](http://localhost:3000). Create a room from the dashboard and open its invitation link in another browser profile or a private window.

Prepare the agent's devices, then start the customer's preview and ask to join. Admit the customer from the agent room to establish the media connection.

## Workspace

- `app`, `components`, `hooks`, `lib`: Next.js web application
- `apps/signaling`: WebSocket signaling service
- `packages/shared`: validated message schemas and shared TypeScript types
- `docs/signaling.md`: signaling flow, configuration, and current boundaries
- `docs/webrtc.md`: peer connection implementation and learning concepts
- `docs/diagnostics.md`: metric calculations, interpretation, and tradeoffs
- `docs/authentication.md`: agent sign-in, session refresh, protected routes, and Supabase setup
- `docs/session-history.md`: persistent call lifecycle, diagnostic summaries, RLS, and migrations
- `docs/deployment-security.md`: browser media policies, response headers, and screen wake-lock lifecycle
- `docs/release-checklist.md`: deployed smoke tests, physical-device coverage, and TURN verification

## Validation

```bash
pnpm lint
pnpm test:signaling
pnpm exec playwright install chromium
pnpm test:e2e
pnpm build:signaling
pnpm exec next build --webpack
```

The browser tests use fake media devices and separate test servers on ports 3100 and 8081. Camera and microphone removal recover independently without rebuilding the call. TURN servers can be configured through the documented environment variables, and failed ICE paths use host-led restart offers with two controlled recovery attempts. A real TURN deployment and the Supabase migration still require testing against your deployed infrastructure.
