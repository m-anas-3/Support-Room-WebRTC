export type RoomCreationIdentity = {
  agentId: string;
};

export type RoomCreationAuthenticator = (accessToken: string) => Promise<RoomCreationIdentity | null>;

type Fetch = (input: string | URL, init?: RequestInit) => Promise<Response>;

const E2E_ACCESS_TOKEN = "supportroom-e2e-room-creation-token";

export function createSupabaseRoomCreationAuthenticator({
  supabaseUrl,
  publishableKey,
  fetchImpl = fetch,
}: {
  supabaseUrl: string;
  publishableKey: string;
  fetchImpl?: Fetch;
}): RoomCreationAuthenticator {
  const authUrl = new URL("/auth/v1/user", normalizedSupabaseUrl(supabaseUrl));

  return async (accessToken) => {
    const response = await fetchImpl(authUrl, {
      method: "GET",
      headers: {
        apikey: publishableKey,
        Authorization: `Bearer ${accessToken}`,
      },
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return null;
    const user: unknown = await response.json();
    if (!user || typeof user !== "object" || !("id" in user) || typeof user.id !== "string" || !user.id) return null;
    return { agentId: user.id };
  };
}

export function roomCreationAuthenticatorFromEnv(env: NodeJS.ProcessEnv): RoomCreationAuthenticator {
  if (env.SUPPORTROOM_E2E === "1") {
    return async (accessToken) => accessToken === E2E_ACCESS_TOKEN ? { agentId: "development-agent" } : null;
  }

  const supabaseUrl = env.SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = env.SUPABASE_PUBLISHABLE_KEY ?? env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !publishableKey) {
    throw new Error("Room creation requires SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY on the signaling server.");
  }
  return createSupabaseRoomCreationAuthenticator({ supabaseUrl, publishableKey });
}

function normalizedSupabaseUrl(value: string) {
  const url = new URL(value);
  if (url.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(url.hostname)) {
    throw new Error("SUPABASE_URL must use HTTPS outside local development.");
  }
  return url;
}
