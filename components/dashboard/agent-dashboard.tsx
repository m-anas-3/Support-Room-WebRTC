"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Clock3,
  History,
  Signal,
  Users,
  Video,
  ArrowUpRight,
} from "lucide-react";
import { useAgentIdentity } from "@/components/auth/agent-identity";
import { PageHeader } from "@/components/layout/page-header";
import { AppShell } from "@/components/layout/app-shell";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  customerDisplayName,
  formatDuration,
  formatSessionDuration,
  initials,
  qualityTone,
  sessionQuality,
} from "@/lib/sessions/presentation";
import {
  sessionDurationSeconds,
  type SupportSession,
} from "@/lib/sessions/types";
import { CreateRoomDialog } from "./create-room-dialog";
import { OpenRooms } from "./open-rooms";
import { useCreatedRooms } from "@/hooks/use-created-rooms";
import { sessionDestination } from "@/lib/signaling/client";
import { SessionTableRow } from "@/components/sessions/session-table-row";

const noopSubscribe = () => () => undefined;

export function AgentDashboard({
  sessions,
  historyError,
  referenceTime,
}: {
  sessions: SupportSession[];
  historyError: string | null;
  referenceTime: string;
}) {
  const agent = useAgentIdentity();
  const rooms = useCreatedRooms(agent.id).filter(
    (room) =>
      !sessions.some(
        (session) =>
          session.id === room.roomId && session.status === "completed",
      ),
  );
  const hydrated = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
  const referenceDate = new Date(referenceTime);
  const now = referenceDate.getTime();
  const startOfToday = hydrated
    ? new Date(
        referenceDate.getFullYear(),
        referenceDate.getMonth(),
        referenceDate.getDate(),
      ).getTime()
    : Date.UTC(
        referenceDate.getUTCFullYear(),
        referenceDate.getUTCMonth(),
        referenceDate.getUTCDate(),
      );
  const todaySessions = sessions.filter(
    (session) => new Date(session.created_at).getTime() >= startOfToday,
  );
  const recent30 = sessions.filter(
    (session) =>
      new Date(session.created_at).getTime() >= now - 30 * 86_400_000,
  );
  const completed30 = recent30.filter(
    (session) => session.status === "completed",
  );
  const totalTalkSeconds = completed30.reduce(
    (total, session) => total + sessionDurationSeconds(session, now),
    0,
  );
  const rated = recent30.filter((session) => session.quality_score !== null);
  const healthy = rated.filter(
    (session) => (session.quality_score ?? 0) >= 75,
  ).length;
  const recent = sessions.slice(0, 5);

  return (
    <AppShell title="Overview" description="Your support workspace">
      <div className="page-stack">
        <PageHeader
          eyebrow="Overview"
          title={`Welcome back, ${agent.name.split(" ")[0]}`}
          description="A little clarity before your next conversation."
          actions={<CreateRoomDialog />}
        />
        <OpenRooms rooms={rooms} />
        <section className="grid overflow-hidden rounded-2xl border bg-white lg:grid-cols-[1.65fr_1fr]">
          <div className="relative p-6 sm:p-8">
            <div className="mb-7 inline-flex size-11 items-center justify-center rounded-xl bg-primary/8 text-primary">
              <Video className="size-5" />
            </div>
            <h2 className="text-2xl font-medium tracking-tight">
              A room for better support.
            </h2>
            <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
              Create a private room, send an invitation, and work through the
              problem together.
            </p>
            <div className="mt-6 flex items-center gap-5 text-xs text-muted-foreground">
              <span>01 · Create a room</span>
              <ArrowRight className="size-3" />
              <span>02 · Invite your customer</span>
            </div>
          </div>
          <div className="flex flex-col justify-between border-t bg-muted/40 p-6 sm:p-8 lg:border-t-0 lg:border-l">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Before you connect
              </p>
              <h3 className="mt-5 text-lg font-medium">
                Look good. Sound clear.
              </h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Check your camera, microphone, and speaker in a private preview.
              </p>
            </div>
            <Button
              variant="outline"
              className="mt-6 h-10 w-fit bg-white"
              nativeButton={false}
              render={<Link href="/playground" />}
            >
              Check devices <ArrowUpRight />
            </Button>
          </div>
        </section>

        {historyError && (
          <div
            role="alert"
            className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
          >
            {historyError}
          </div>
        )}

        <section className="grid gap-4 md:grid-cols-3">
          <Metric
            icon={Users}
            label="Sessions today"
            value={String(todaySessions.length)}
            helper="Rooms created today"
          />
          <Metric
            icon={Clock3}
            label="Average duration"
            value={
              completed30.length
                ? formatDuration(
                    Math.round(totalTalkSeconds / completed30.length),
                  )
                : "—"
            }
            helper="Completed calls · last 30 days"
          />
          <Metric
            icon={Signal}
            label="Healthy connections"
            value={
              rated.length
                ? `${Math.round((healthy / rated.length) * 100)}%`
                : "—"
            }
            helper={
              rated.length
                ? `Across ${rated.length} rated sessions`
                : "Waiting for diagnostic reports"
            }
          />
        </section>

        <Card className="overflow-hidden border shadow-none ring-0 [--card-spacing:1.5rem]">
          <CardHeader className="flex flex-row items-center justify-between border-b">
            <div>
              <CardTitle>Recent sessions</CardTitle>
              <CardDescription>
                Your latest support rooms and completed calls
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              nativeButton={false}
              render={<Link href="/sessions" />}
            >
              View all <ArrowRight />
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {recent.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead className="hidden md:table-cell">
                      Reference
                    </TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead className="hidden sm:table-cell">
                      Duration
                    </TableHead>
                    <TableHead>Quality</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recent.map((session) => {
                    const customer = customerDisplayName(session);
                    const href = sessionDestination(session, hydrated);
                    const opensRoom = href.startsWith("/room/");
                    return (
                      <SessionTableRow key={session.id} href={href}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar size="sm">
                              <AvatarFallback className="text-[11px]">
                                {initials(customer)}
                              </AvatarFallback>
                            </Avatar>
                            <Link
                              href={href}
                              aria-label={
                                opensRoom
                                  ? `Open room ${session.reference || customer}`
                                  : `View session ${customer}`
                              }
                              className="max-w-44 truncate font-medium hover:text-primary hover:underline"
                            >
                              {customer}
                            </Link>
                          </div>
                        </TableCell>
                        <TableCell className="hidden max-w-64 truncate text-muted-foreground md:table-cell">
                          {session.reference || "No reference"}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-muted-foreground">
                          {relativeDate(session.created_at, now, hydrated)}
                        </TableCell>
                        <TableCell className="hidden text-muted-foreground sm:table-cell">
                          {formatSessionDuration(session, now)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={qualityTone(session.quality_score)}
                          >
                            {sessionQuality(session)}
                          </Badge>
                        </TableCell>
                      </SessionTableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <Empty className="min-h-56 border-0">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <History />
                  </EmptyMedia>
                  <EmptyTitle>No support sessions yet</EmptyTitle>
                  <EmptyDescription>
                    Create your first room. New sessions and their connection
                    reports will appear here.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  helper,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <Card className="border shadow-none ring-0 [--card-spacing:1.5rem]">
      <CardContent>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-muted-foreground">{label}</p>
            <p className="mt-2 text-[28px] font-semibold leading-none tracking-[-0.035em]">
              {value}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">{helper}</p>
          </div>
          <span className="grid size-9 place-items-center rounded-lg border text-muted-foreground">
            <Icon className="size-[18px]" />
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function relativeDate(value: string, referenceTime: number, hydrated: boolean) {
  const difference = referenceTime - new Date(value).getTime();
  if (hydrated && difference >= 0 && difference < 60_000) return "Just now";
  if (hydrated && difference < 3_600_000)
    return `${Math.max(1, Math.floor(difference / 60_000))}m ago`;
  if (hydrated && difference < 86_400_000)
    return `${Math.floor(difference / 3_600_000)}h ago`;
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    ...(hydrated ? {} : { timeZone: "UTC" }),
  }).format(new Date(value));
}
