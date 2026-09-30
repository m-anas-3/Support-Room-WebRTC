# Browser media security

SupportRoom sends response headers from `next.config.ts` on every frontend route. The media-related Permissions Policy allows the application’s own origin to request camera, microphone, display capture, speaker selection, fullscreen, autoplay, and a screen wake lock. Unused device and location capabilities are disabled.

Permissions Policy defines which documents may ask to use a capability. It does not bypass the browser’s camera, microphone, screen-sharing, or speaker permission prompts. Screen sharing still requires a current user action, and screen wake lock remains advisory: the browser or operating system may release or deny it because of visibility, battery, or power-saving conditions.

During an admitted call, each participant requests a screen wake lock so supported phones and computers do not dim or lock during an otherwise hands-free conversation. SupportRoom releases the lock when the call view is left. Browsers automatically release it when the document becomes hidden, so the hook requests it again when the call page becomes visible.

The frontend also sends these general response protections:

- `X-Frame-Options: DENY` prevents the call UI from being embedded in another page.
- `X-Content-Type-Options: nosniff` disables MIME-type guessing.
- `Referrer-Policy: strict-origin-when-cross-origin` limits cross-origin referrer details.
- `Strict-Transport-Security` is included in production responses.
- The default Next.js `X-Powered-By` response header is disabled.

## Vercel frontend

Configure these production variables and redeploy after changing a `NEXT_PUBLIC_*` value:

```env
NEXT_PUBLIC_SIGNALING_URL=wss://your-signaling-service.onrender.com/signal
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
SUPPORTROOM_SITE_URL=https://your-supportroom-domain.example
```

Add `https://your-supportroom-domain.example/auth/callback` to the Supabase redirect allow list. Keep `SUPABASE_SECRET_KEY` and TURN shared secrets out of Vercel because the browser application does not need them.

## Render signaling service

Create a Node web service from the repository root with:

```text
Build command: pnpm install --frozen-lockfile && pnpm build:signaling
Start command: pnpm --filter @support-room/signaling start
Health check path: /health
```

Set `ALLOWED_ORIGINS` to the exact comma-separated Vercel and custom-domain origins. Configure the signaling-side Supabase and TURN values from `.env.example`. Render supplies `PORT`; the server binds to `0.0.0.0` by default.

`/health` reports uptime, active rooms, connected WebSockets, and the Render deployment revision without exposing room tokens or participant data. Structured logs include lifecycle event names and the Cloudflare `CF-Ray` identifier when available. Tokens, SDP, ICE candidates, names, and media data are intentionally excluded.

Run exactly one signaling instance for this MVP. Room admission and active WebSocket membership remain in memory, so a deployment or platform restart ends active rooms. The server drains connections with close code `1012`, finalizes session history, and clients surface the interruption. Multiple instances require shared room state and cross-instance message routing through a system such as Redis.

Add an external HTTPS uptime probe for `/health` and alert on non-2xx responses. Render also uses this path to reject unhealthy deploys and restart an unresponsive service.

## Authoritative references

- [Next.js headers configuration](https://nextjs.org/docs/app/api-reference/config/next-config-js/headers)
- [MDN Permissions Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Permissions-Policy)
- [W3C Screen Capture permissions integration](https://www.w3.org/TR/screen-capture/#permissions-policy-integration)
- [W3C Audio Output Devices permissions policy](https://www.w3.org/TR/audio-output/#permissions-policy)
- [W3C Screen Wake Lock API](https://www.w3.org/TR/screen-wake-lock/)
- [Render WebSockets](https://render.com/docs/websocket)
- [Render health checks](https://render.com/docs/health-checks)
