import "server-only";

import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import type { SupportSession } from "./types";

export type SessionQueryResult = {
  sessions: SupportSession[];
  error: string | null;
};

export async function getSupportSessions(limit = 500): Promise<SessionQueryResult> {
  if (!isSupabaseConfigured()) return { sessions: [], error: null };
  const supabase = await createClient();
  const agentId = await currentAgentId(supabase);
  if (!agentId) return { sessions: [], error: "Your sign-in session has expired." };

  const { data, error } = await supabase
    .from("support_sessions")
    .select("*")
    .eq("agent_id", agentId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return { sessions: [], error: sessionQueryError(error.message) };
  return { sessions: (data ?? []) as SupportSession[], error: null };
}

export async function getSupportSession(sessionId: string) {
  if (!isSupabaseConfigured()) return { session: null, error: null };
  const supabase = await createClient();
  const agentId = await currentAgentId(supabase);
  if (!agentId) return { session: null, error: "Your sign-in session has expired." };

  const { data, error } = await supabase
    .from("support_sessions")
    .select("*")
    .eq("id", sessionId)
    .eq("agent_id", agentId)
    .maybeSingle();

  if (error) return { session: null, error: sessionQueryError(error.message) };
  return { session: data as SupportSession | null, error: null };
}

async function currentAgentId(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data, error } = await supabase.auth.getClaims();
  return error || !data?.claims?.sub ? null : String(data.claims.sub);
}

function sessionQueryError(message: string) {
  if (message.includes("support_sessions")) {
    return "Session history is not ready yet. Apply the Supabase migration to enable it.";
  }
  return "Session history is temporarily unavailable.";
}
