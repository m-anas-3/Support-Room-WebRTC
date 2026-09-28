"use client";

import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/client";
import { calculateQualityScore, type CapturedDiagnosticSample, type SessionDiagnosticsSummary } from "./types";

const persistenceKey = (roomId: string) => `supportroom:history:${roomId}`;

export async function createSessionRecord(input: {
  roomId: string;
  agentId: string;
  agentName: string;
  reference: string;
}) {
  if (!isSupabaseConfigured()) return false;
  const supabase = createClient();
  const { error } = await supabase.from("support_sessions").insert({
    id: input.roomId,
    agent_id: input.agentId,
    agent_name: input.agentName,
    reference: input.reference.trim(),
    status: "created",
  });
  if (error) throw new Error(readableDatabaseError(error.message));
  sessionStorage.setItem(persistenceKey(input.roomId), "1");
  return true;
}

export function hasSessionRecord(roomId: string) {
  return typeof window !== "undefined"
    && isSupabaseConfigured()
    && sessionStorage.getItem(persistenceKey(roomId)) === "1";
}

export async function markSessionWaiting(roomId: string, customerName: string | null) {
  const supabase = createClient();
  const { error } = await supabase
    .from("support_sessions")
    .update({ status: "waiting", customer_name: customerName })
    .eq("id", roomId)
    .in("status", ["created", "waiting"]);
  if (error) throw error;
}

export async function markSessionActive(roomId: string, customerName: string | null) {
  const supabase = createClient();
  const { error: startError } = await supabase
    .from("support_sessions")
    .update({ started_at: new Date().toISOString() })
    .eq("id", roomId)
    .is("started_at", null);
  if (startError) throw startError;

  const { error } = await supabase
    .from("support_sessions")
    .update({ status: "active", customer_name: customerName })
    .eq("id", roomId);
  if (error) throw error;
}

export async function completeSessionRecord(
  roomId: string,
  summary: SessionDiagnosticsSummary,
  samples: CapturedDiagnosticSample[],
  endedReason: string,
) {
  const supabase = createClient();
  let sampleError: unknown = null;
  try {
    for (let offset = 0; offset < samples.length; offset += 200) {
      const batch = samples.slice(offset, offset + 200).map((sample) => ({ ...sample, session_id: roomId }));
      const { error } = await supabase.from("support_session_diagnostic_samples").insert(batch);
      if (error) throw error;
    }
  } catch (error) {
    sampleError = error;
  }

  const { error } = await supabase
    .from("support_sessions")
    .update({
      status: "completed",
      ended_at: new Date().toISOString(),
      quality_score: calculateQualityScore(summary),
      average_latency_ms: summary.averageLatencyMs,
      average_packet_loss_percent: summary.averagePacketLossPercent,
      average_send_bitrate_kbps: summary.averageSendBitrateKbps,
      average_receive_bitrate_kbps: summary.averageReceiveBitrateKbps,
      reconnect_count: summary.reconnectCount,
      local_candidate_type: summary.localCandidateType,
      remote_candidate_type: summary.remoteCandidateType,
      transport_protocol: summary.transportProtocol,
      media_sent: summary.mediaSent,
      media_received: summary.mediaReceived,
      ended_reason: endedReason,
    })
    .eq("id", roomId);
  if (error) throw error;
  sessionStorage.removeItem(persistenceKey(roomId));
  if (sampleError) throw sampleError;
}

function readableDatabaseError(message: string) {
  if (message.includes("support_sessions")) {
    return "Room created, but session history is not ready. Apply the Supabase migration and try again.";
  }
  return "Room created, but its session history could not be saved.";
}
