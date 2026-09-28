import "server-only";

import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import type { SupportSession, SupportSessionDiagnosticSample } from "./types";

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
  if (!isSupabaseConfigured()) return { session: null, samples: [], error: null, samplesError: null };
  const supabase = await createClient();
  const agentId = await currentAgentId(supabase);
  if (!agentId) return { session: null, samples: [], error: "Your sign-in session has expired.", samplesError: null };

  const { data, error } = await supabase
    .from("support_sessions")
    .select("*")
    .eq("id", sessionId)
    .eq("agent_id", agentId)
    .maybeSingle();

  if (error) return { session: null, samples: [], error: sessionQueryError(error.message), samplesError: null };
  if (!data) return { session: null, samples: [], error: null, samplesError: null };

  const { data: samples, error: samplesError } = await supabase
    .from("support_session_diagnostic_samples")
    .select("*")
    .eq("session_id", sessionId)
    .order("sequence", { ascending: true })
    .limit(900);

  return {
    session: data as SupportSession,
    samples: (samples ?? []) as SupportSessionDiagnosticSample[],
    error: null,
    samplesError: samplesError ? diagnosticSamplesQueryError(samplesError.message) : null,
  };
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

function diagnosticSamplesQueryError(message: string) {
  if (message.includes("support_session_diagnostic_samples")) {
    return "The diagnostics timeline is not ready. Apply the latest Supabase migration to enable it.";
  }
  return "The diagnostics timeline is temporarily unavailable.";
}
