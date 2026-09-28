import type { RoomClosure } from "./rooms.js";

export type SessionFinalizer = (closure: RoomClosure) => Promise<void>;

type Fetch = (input: string | URL, init?: RequestInit) => Promise<Response>;

export function createSupabaseSessionFinalizer({
  supabaseUrl,
  secretKey,
  fetchImpl = fetch,
}: {
  supabaseUrl: string;
  secretKey: string;
  fetchImpl?: Fetch;
}): SessionFinalizer {
  const endpoint = new URL("/rest/v1/support_sessions", normalizedSupabaseUrl(supabaseUrl));

  return async (closure) => {
    const url = new URL(endpoint);
    url.searchParams.set("id", `eq.${closure.roomId}`);
    url.searchParams.set("agent_id", `eq.${closure.agentId}`);
    url.searchParams.set("status", "neq.completed");
    const response = await fetchImpl(url, {
      method: "PATCH",
      headers: {
        apikey: secretKey,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        status: "completed",
        ended_at: closure.endedAt,
        ended_reason: closure.reason,
      }),
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) throw new Error(`Supabase session reconciliation failed with status ${response.status}.`);
  };
}

export function sessionFinalizerFromEnv(env: NodeJS.ProcessEnv): SessionFinalizer | null {
  const secretKey = env.SUPABASE_SECRET_KEY ?? env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secretKey) return null;
  const supabaseUrl = env.SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) throw new Error("SUPABASE_SECRET_KEY requires SUPABASE_URL on the signaling server.");
  return createSupabaseSessionFinalizer({ supabaseUrl, secretKey });
}

function normalizedSupabaseUrl(value: string) {
  const url = new URL(value);
  if (url.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(url.hostname)) {
    throw new Error("SUPABASE_URL must use HTTPS outside local development.");
  }
  return url;
}
