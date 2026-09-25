# Supabase agent authentication

SupportRoom uses Supabase Auth for agent accounts. Customers continue to join through invitation URLs without creating accounts.

## Request flow

1. The login form submits email and password to a Next.js Server Action.
2. Supabase verifies the credentials and `@supabase/ssr` writes the session to cookies.
3. Next.js 16 `proxy.ts` refreshes and verifies the access token with `getClaims()` before protected requests continue.
4. The `(agent)` route-group layout verifies the claims again close to the protected UI and provides the authenticated identity to client components.
5. Sign-out revokes the local Supabase session, clears its cookies, and redirects to `/login`.

The protected URLs are `/dashboard`, `/playground`, `/sessions`, `/settings`, and `/room/*`. The `/login` and `/join/*` routes remain public. Route groups change source organization without changing these URLs.

## Supabase project setup

1. Create or open a Supabase project.
2. In the project **Connect** dialog, copy the Project URL and publishable key.
3. Add them to `.env.local` for local development and to the Vercel project settings for deployment:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

4. In **Authentication → Users**, create the first support agent. Set the user's display name in metadata under `full_name` if you want a friendly name in the app; otherwise SupportRoom derives a name from the email address.
5. Keep email/password authentication enabled. SupportRoom does not expose public sign-up, so agents must be provisioned by an administrator.
6. Redeploy Vercel after changing either `NEXT_PUBLIC_*` value because Next.js includes public environment variables in the browser build.

The publishable key is intended for browser use. Never put the Supabase secret key or legacy service-role key in a `NEXT_PUBLIC_*` variable.

## Authorization boundary

Proxy performs an early redirect for usability, while the agent layout verifies the claims again. Future session and room tables must also enable Row Level Security and restrict rows with `auth.uid()`; protecting a page does not replace database authorization.

The automated browser tests set `SUPPORTROOM_E2E=1` on their isolated local web server so they can continue testing WebRTC without contacting an external Supabase project. This bypass is server-only and is not configured by the application deployment examples.

## Concepts to learn

- **Authentication** proves which agent is signing in.
- **Session management** keeps the verified login available across requests and refreshes expiring access tokens.
- **Authorization** decides which routes and database rows that identity may access.
- **Access token and refresh token** have different jobs: the short-lived access token proves current identity, while the refresh token obtains a replacement.
- **Server Action** handles a form mutation on the server and can write the resulting auth cookies before redirecting.
- **Proxy** runs before matched Next.js routes and refreshes cookies on both the incoming request and outgoing response.
- **RLS** is the eventual database boundary. Each agent-owned table should compare its owner column with `(select auth.uid())`.

## Authoritative references

- [Supabase: Server-Side Rendering](https://supabase.com/docs/guides/auth/server-side)
- [Supabase: Creating an SSR client for Next.js](https://supabase.com/docs/guides/auth/server-side/creating-a-client?framework=nextjs)
- [Supabase: Password-based authentication](https://supabase.com/docs/guides/auth/passwords)
- [Supabase: Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Next.js: Authentication](https://nextjs.org/docs/app/guides/authentication)
- [Next.js: Proxy](https://nextjs.org/docs/app/getting-started/proxy)
