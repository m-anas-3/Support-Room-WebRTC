# Session history

SupportRoom stores one `support_sessions` row for each signaling room created by an authenticated agent. The signaling service still owns short-lived room tokens and WebRTC negotiation. Supabase owns durable business history and the final connection summary.

## Apply the schema

The Supabase CLI generated the project configuration and migration in `supabase/`. For an existing hosted project:

```bash
pnpm exec supabase login
pnpm exec supabase link --project-ref YOUR_PROJECT_ID
pnpm exec supabase db push --dry-run
pnpm exec supabase db push
```

Find the project ID in the Supabase dashboard URL. `db push --dry-run` is the review step; it does not change the remote database. Do not run `db reset --linked` against production because it deletes remote data.

For local development, start a Docker-compatible runtime and run:

```bash
pnpm supabase:start
pnpm supabase:reset
pnpm supabase:types
```

Run `supabase:types` after every schema change so application queries stay aligned with PostgreSQL. The generated `supabase/config.toml`, timestamped migrations, database tests, seed file, and TypeScript types belong in version control. CLI state under `supabase/.temp` is ignored.

## Lifecycle

1. The signaling server creates an in-memory room and returns its UUID and access tokens.
2. The signed-in browser inserts a `support_sessions` row with the same UUID. The invitation secret is never stored in Supabase.
3. When a customer enters the waiting room, the row changes from `created` to `waiting` and records the customer name.
4. When the peer connection reaches `connected`, the row changes to `active`. `started_at` is written only when it is still empty, so WebRTC reconnection does not reset the call duration.
5. The host collects one `getStats()` sample every two seconds in memory.
6. When the host ends the room, the app releases media immediately, closes signaling, averages the samples, and writes the completed report.
7. If the browser disappears before step 6, the signaling service finalizes the unfinished row after the host reconnect window, room expiry, or server shutdown. These records keep empty diagnostic fields because the browser was no longer available to upload its in-memory samples.

History persistence is deliberately separate from the media path. If Supabase is unavailable, room creation and the call can still proceed, and the agent sees a warning that history was not saved.

## Security model

The table enables Row Level Security and grants only `select`, `insert`, and `update` to the `authenticated` role. Each policy checks that `(select auth.uid()) = agent_id`. There is no `anon` access, so customers joining with invitation links never reach the session table.

The UI also filters queries by `agent_id`. RLS remains the authorization boundary; the explicit filter helps PostgreSQL use the `(agent_id, created_at)` index efficiently.

The browser uses the Supabase publishable key. The signaling server can use a backend-only Supabase secret key to reconcile abandoned sessions. Secret keys bypass RLS, so the reconciliation request scopes every update by both the authenticated agent ID and room ID and refuses to overwrite rows that are already completed.

Never expose `SUPABASE_SECRET_KEY` or the legacy service-role key to the Next.js client, a `NEXT_PUBLIC_*` variable, logs, or source control. Supabase recommends a separate `sb_secret_…` key for each backend component so it can be rotated independently.

## Diagnostic summary

The completed row records averages for round-trip latency, incoming packet loss, send bitrate, and receive bitrate. It also records the highest recovery-attempt count, selected local and remote ICE candidate types, transport protocol, and whether outgoing and incoming media activity was observed.

The quality score starts at 100 and applies bounded penalties for latency above 80 ms, packet loss, and ICE recovery attempts. Bitrate is shown in the report but is not scored because a valid audio-only or camera-off call naturally uses much less bandwidth than an HD video call.

These values describe samples observed by the host browser. They are useful for troubleshooting trends, but they are not server-side monitoring. Reconciled sessions show why the room closed and when it ended, while diagnostic averages remain unavailable if the browser crashed before uploading them.
