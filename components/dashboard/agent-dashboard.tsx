"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { ArrowRight, Clock3, History, Link2, Signal, Users } from "lucide-react";
import { useAgentIdentity } from "@/components/auth/agent-identity";
import { AppShell } from "@/components/layout/app-shell";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  customerDisplayName,
  formatDuration,
  formatSessionDuration,
  initials,
  qualityTone,
  sessionQuality,
} from "@/lib/sessions/presentation";
import { sessionDurationSeconds, type SupportSession } from "@/lib/sessions/types";
import { CreateRoomDialog } from "./create-room-dialog";

const noopSubscribe = () => () => undefined;

export function AgentDashboard({ sessions, historyError, referenceTime }: { sessions: SupportSession[]; historyError: string | null; referenceTime: string }) {
  const agent = useAgentIdentity();
  const hydrated = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const referenceDate = new Date(referenceTime);
  const now = referenceDate.getTime();
  const startOfToday = hydrated
    ? new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate()).getTime()
    : Date.UTC(referenceDate.getUTCFullYear(), referenceDate.getUTCMonth(), referenceDate.getUTCDate());
  const todaySessions = sessions.filter((session) => new Date(session.created_at).getTime() >= startOfToday);
  const recent30 = sessions.filter((session) => new Date(session.created_at).getTime() >= now - 30 * 86_400_000);
  const completed30 = recent30.filter((session) => session.status === "completed");
  const totalTalkSeconds = completed30.reduce((total, session) => total + sessionDurationSeconds(session, now), 0);
  const rated = recent30.filter((session) => session.quality_score !== null);
  const healthy = rated.filter((session) => (session.quality_score ?? 0) >= 75).length;
  const recentWeek = sessions.filter((session) => new Date(session.created_at).getTime() >= now - 7 * 86_400_000);
  const recent = sessions.slice(0, 5);

  return (
    <AppShell title="Overview" description="Your support workspace" actions={<CreateRoomDialog />}>
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <section className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div><p className="font-medium text-primary">Agent workspace</p><h2 className="mt-1.5 text-[1.75rem] font-semibold leading-tight sm:text-[2rem]">Welcome back, {agent.name}</h2><p className="mt-2 text-muted-foreground">Everything is ready for your next support call.</p></div>
        </section>

        {historyError && <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{historyError}</div>}

        <section className="grid gap-4 md:grid-cols-3">
          <Metric icon={Users} label="Sessions today" value={String(todaySessions.length)} helper="Rooms created today" />
          <Metric icon={Clock3} label="Average duration" value={completed30.length ? formatDuration(Math.round(totalTalkSeconds / completed30.length)) : "—"} helper="Completed calls · last 30 days" />
          <Metric icon={Signal} label="Healthy connections" value={rated.length ? `${Math.round((healthy / rated.length) * 100)}%` : "—"} helper={rated.length ? `Across ${rated.length} rated sessions` : "Waiting for diagnostic reports"} />
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.35fr_.65fr]">
          <Card className="border shadow-sm ring-0">
            <CardHeader className="border-b"><div className="flex items-center justify-between gap-4"><div><CardTitle>Start a support call</CardTitle><CardDescription>Create a private room and invite one customer</CardDescription></div><Badge variant="secondary">Ready</Badge></div></CardHeader>
            <CardContent><div className="flex flex-col gap-5 sm:flex-row sm:items-center"><span className="grid size-11 place-items-center rounded-full bg-blue-50 text-blue-700"><Link2 className="size-5" /></span><div className="min-w-0 flex-1"><p className="font-medium">No customer is waiting</p><p className="mt-0.5 text-sm text-muted-foreground">Use New room to generate a secure invitation link.</p></div></div></CardContent>
          </Card>

          <Card className="border shadow-sm ring-0">
            <CardHeader><CardTitle>Last 7 days</CardTitle><CardDescription>Your recorded session activity</CardDescription></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <ActivityRow label="Rooms created" value={String(recentWeek.length)} />
              <ActivityRow label="Calls completed" value={String(recentWeek.filter((session) => session.status === "completed").length)} />
              <ActivityRow label="Talk time" value={formatDuration(recentWeek.reduce((total, session) => total + sessionDurationSeconds(session, now), 0))} />
            </CardContent>
          </Card>
        </section>

        <Card className="overflow-hidden border shadow-sm ring-0">
          <CardHeader className="flex-row items-center justify-between border-b"><div><CardTitle>Recent sessions</CardTitle><CardDescription>Your latest support rooms and completed calls</CardDescription></div><Button variant="ghost" nativeButton={false} render={<Link href="/sessions" />}>View all <ArrowRight /></Button></CardHeader>
          <CardContent className="p-0">
            {recent.length ? (
              <Table><TableHeader><TableRow><TableHead>Customer</TableHead><TableHead className="hidden md:table-cell">Reference</TableHead><TableHead>Time</TableHead><TableHead className="hidden sm:table-cell">Duration</TableHead><TableHead>Quality</TableHead></TableRow></TableHeader><TableBody>{recent.map((session) => {
                const customer = customerDisplayName(session);
                return <TableRow key={session.id}><TableCell><div className="flex items-center gap-3"><Avatar size="sm"><AvatarFallback className="text-[11px]">{initials(customer)}</AvatarFallback></Avatar><span className="max-w-44 truncate font-medium">{customer}</span></div></TableCell><TableCell className="hidden max-w-64 truncate text-muted-foreground md:table-cell">{session.reference || "No reference"}</TableCell><TableCell className="whitespace-nowrap text-muted-foreground">{relativeDate(session.created_at, now, hydrated)}</TableCell><TableCell className="hidden text-muted-foreground sm:table-cell">{formatSessionDuration(session, now)}</TableCell><TableCell><Badge variant="outline" className={qualityTone(session.quality_score)}>{sessionQuality(session)}</Badge></TableCell></TableRow>;
              })}</TableBody></Table>
            ) : (
              <Empty className="min-h-56 border-0"><EmptyHeader><EmptyMedia variant="icon"><History /></EmptyMedia><EmptyTitle>No support sessions yet</EmptyTitle><EmptyDescription>Create your first room. New sessions and their connection reports will appear here.</EmptyDescription></EmptyHeader></Empty>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

function Metric({ icon: Icon, label, value, helper }: { icon: typeof Users; label: string; value: string; helper: string }) {
  return <Card className="border shadow-sm ring-0"><CardContent><div className="flex items-start justify-between"><div><p className="text-muted-foreground">{label}</p><p className="mt-2 text-[1.65rem] font-semibold leading-none tracking-[-0.035em]">{value}</p><p className="mt-2 text-xs text-muted-foreground">{helper}</p></div><span className="grid size-10 place-items-center rounded-lg bg-primary/8 text-primary"><Icon className="size-[18px]" /></span></div></CardContent></Card>;
}

function ActivityRow({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between gap-4"><span className="text-muted-foreground">{label}</span><span className="font-medium tabular-nums">{value}</span></div>;
}

function relativeDate(value: string, referenceTime: number, hydrated: boolean) {
  const difference = referenceTime - new Date(value).getTime();
  if (hydrated && difference >= 0 && difference < 60_000) return "Just now";
  if (hydrated && difference < 3_600_000) return `${Math.max(1, Math.floor(difference / 60_000))}m ago`;
  if (hydrated && difference < 86_400_000) return `${Math.floor(difference / 3_600_000)}h ago`;
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", ...(hydrated ? {} : { timeZone: "UTC" }) }).format(new Date(value));
}
