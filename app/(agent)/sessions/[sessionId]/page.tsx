import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, Clock3, MonitorUp, Wifi } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { SessionReportButton } from "@/components/sessions/session-report-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  customerDisplayName,
  formatBitrate,
  formatMetric,
  formatSessionDuration,
  qualityTone,
  sessionQuality,
  shortSessionId,
} from "@/lib/sessions/presentation";
import { getSupportSession } from "@/lib/sessions/server";

export default async function SessionDetailPage({ params }: PageProps<"/sessions/[sessionId]">) {
  const { sessionId } = await params;
  const result = await getSupportSession(sessionId);

  if (result.error) {
    return <AppShell title="Session report" description="Connection diagnostics"><div className="mx-auto w-full max-w-5xl space-y-6"><Button variant="ghost" render={<Link href="/sessions" />}><ArrowLeft />Back to sessions</Button><div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{result.error}</div></div></AppShell>;
  }
  if (!result.session) notFound();

  const session = result.session;
  const referenceTime = new Date().getTime();
  const quality = sessionQuality(session);
  const candidateRoute = [session.local_candidate_type, session.remote_candidate_type].filter(Boolean).join(" → ") || "Not captured";
  const mediaFlow = activityLabel(session.media_sent, session.media_received);

  return (
    <AppShell title={shortSessionId(session.id)} description={formatTimestamp(session.created_at)} actions={<SessionReportButton session={session} />}>
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <Button variant="ghost" render={<Link href="/sessions" />}><ArrowLeft />Back to sessions</Button>

        <section className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div><div className="flex flex-wrap items-center gap-2"><h2 className="text-2xl font-semibold tracking-tight">{customerDisplayName(session)}</h2><Badge variant="outline" className={statusTone(session.status)}>{capitalize(session.status)}</Badge></div><p className="mt-1 text-sm text-muted-foreground">{session.reference || "No reference"} · {formatSessionDuration(session, referenceTime)}</p></div>
          <p className="text-sm text-muted-foreground">Hosted by <span className="font-medium text-foreground">{session.agent_name}</span></p>
        </section>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Quality score" value={session.quality_score === null ? "Not rated" : `${session.quality_score} / 100`} />
          <Stat label="Average latency" value={formatMetric(session.average_latency_ms, "ms")} />
          <Stat label="Packet loss" value={formatMetric(session.average_packet_loss_percent, "%", 2)} />
          <Stat label="Reconnects" value={String(session.reconnect_count)} />
        </div>

        <Card className="border shadow-sm ring-0">
          <CardHeader><CardTitle>Connection report</CardTitle><CardDescription>Average diagnostics collected from the host peer connection during this call</CardDescription></CardHeader>
          <CardContent>
            <Tabs defaultValue="overview">
              <TabsList><TabsTrigger value="overview">Overview</TabsTrigger><TabsTrigger value="network">Network</TabsTrigger><TabsTrigger value="media">Media</TabsTrigger></TabsList>
              <TabsContent value="overview" className="pt-5">
                <div className="grid gap-6 lg:grid-cols-[1fr_.8fr]">
                  <div className="rounded-xl border p-5"><div className="flex items-center justify-between gap-4 text-sm"><span className="font-medium">Overall quality</span><Badge variant="outline" className={qualityTone(session.quality_score)}>{quality}</Badge></div>{session.quality_score === null ? <p className="mt-4 text-sm leading-6 text-muted-foreground">The call ended before enough network samples were collected for a quality score.</p> : <><Progress value={session.quality_score} className="mt-4" /><p className="mt-4 text-sm leading-6 text-muted-foreground">The score combines average latency, incoming packet loss, and connection recovery attempts. Bitrate is recorded separately because healthy bitrate depends on the media being sent.</p></>}</div>
                  <div className="space-y-3"><ReportRow icon={Wifi} label="Selected ICE route" value={candidateRoute} /><ReportRow icon={MonitorUp} label="Media flow" value={mediaFlow} /><ReportRow icon={Clock3} label="Call window" value={lifecycleWindow(session.started_at, session.ended_at)} /><ReportRow icon={CheckCircle2} label="Ended reason" value={session.ended_reason ? humanize(session.ended_reason) : "Not recorded"} /></div>
                </div>
              </TabsContent>
              <TabsContent value="network" className="pt-5"><DetailGrid items={[
                ["Local candidate", session.local_candidate_type ?? "Not captured"],
                ["Remote candidate", session.remote_candidate_type ?? "Not captured"],
                ["Transport", session.transport_protocol?.toUpperCase() ?? "Not captured"],
                ["Average round-trip time", formatMetric(session.average_latency_ms, "ms")],
                ["Average packet loss", formatMetric(session.average_packet_loss_percent, "%", 2)],
                ["Recovery attempts", String(session.reconnect_count)],
              ]} /></TabsContent>
              <TabsContent value="media" className="pt-5"><DetailGrid items={[
                ["Average send bitrate", formatBitrate(session.average_send_bitrate_kbps)],
                ["Average receive bitrate", formatBitrate(session.average_receive_bitrate_kbps)],
                ["Outgoing media", activityValue(session.media_sent)],
                ["Incoming media", activityValue(session.media_received)],
              ]} /></TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return <Card className="border shadow-xs ring-0"><CardContent><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1.5 text-xl font-semibold tracking-tight">{value}</p></CardContent></Card>;
}

function ReportRow({ icon: Icon, label, value }: { icon: typeof Wifi; label: string; value: string }) {
  return <div className="flex items-center gap-3 rounded-lg border p-3"><span className="grid size-8 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground"><Icon className="size-4" /></span><div className="min-w-0"><p className="text-xs text-muted-foreground">{label}</p><p className="truncate text-sm font-medium">{value}</p></div></div>;
}

function DetailGrid({ items }: { items: string[][] }) {
  return <div className="grid gap-3 sm:grid-cols-2">{items.map(([label, value]) => <div key={label} className="flex items-center justify-between gap-4 rounded-lg border p-3 text-sm"><span className="text-muted-foreground">{label}</span><span className="text-right font-mono font-medium">{value}</span></div>)}</div>;
}

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(new Date(value)) + " UTC";
}

function lifecycleWindow(start: string | null, end: string | null) {
  if (!start) return "Call did not start";
  const time = (value: string) => new Intl.DateTimeFormat("en", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" }).format(new Date(value));
  return `${time(start)}${end ? ` – ${time(end)} UTC` : " – active"}`;
}

function activityLabel(sent: boolean | null, received: boolean | null) {
  if (sent === true && received === true) return "Sent and received";
  if (sent === true) return "Outgoing detected";
  if (received === true) return "Incoming detected";
  return "Not captured";
}

function activityValue(value: boolean | null) {
  return value === null ? "Not captured" : value ? "Activity detected" : "No activity detected";
}

function statusTone(status: string) {
  return status === "completed" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : status === "active" ? "border-blue-200 bg-blue-50 text-blue-700" : "border-slate-200 bg-slate-50 text-slate-700";
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function humanize(value: string) {
  return value.split("-").map(capitalize).join(" ");
}
