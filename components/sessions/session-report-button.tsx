"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { shortSessionId } from "@/lib/sessions/presentation";
import {
  sessionDurationSeconds,
  type SupportSession,
  type SupportSessionDiagnosticSample,
} from "@/lib/sessions/types";

export function SessionReportButton({
  session,
  samples,
}: {
  session: SupportSession;
  samples: SupportSessionDiagnosticSample[];
}) {
  function download() {
    const report = {
      session: shortSessionId(session.id),
      roomId: session.id,
      reference: session.reference,
      customer: session.customer_name,
      agent: session.agent_name,
      status: session.status,
      createdAt: session.created_at,
      startedAt: session.started_at,
      endedAt: session.ended_at,
      durationSeconds: sessionDurationSeconds(session, new Date().getTime()),
      qualityScore: session.quality_score,
      diagnostics: {
        averageLatencyMs: session.average_latency_ms,
        averagePacketLossPercent: session.average_packet_loss_percent,
        averageSendBitrateKbps: session.average_send_bitrate_kbps,
        averageReceiveBitrateKbps: session.average_receive_bitrate_kbps,
        reconnectCount: session.reconnect_count,
        localCandidateType: session.local_candidate_type,
        remoteCandidateType: session.remote_candidate_type,
        transportProtocol: session.transport_protocol,
        mediaSent: session.media_sent,
        mediaReceived: session.media_received,
      },
      timeline: samples,
    };
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(report, null, 2)], { type: "application/json" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${shortSessionId(session.id).toLowerCase()}-report.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Button variant="outline" onClick={download}>
      <Download />
      Download report
    </Button>
  );
}
