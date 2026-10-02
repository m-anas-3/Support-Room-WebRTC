"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import {
  CalendarDays,
  ChevronRight,
  Download,
  History,
  Search,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { AppShell } from "@/components/layout/app-shell";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  shortSessionId,
} from "@/lib/sessions/presentation";
import {
  sessionDurationSeconds,
  type SupportSession,
} from "@/lib/sessions/types";
import { useAgentIdentity } from "@/components/auth/agent-identity";
import { useCreatedRooms } from "@/hooks/use-created-rooms";
import { sessionDestination } from "@/lib/signaling/client";
import { OpenRooms } from "@/components/dashboard/open-rooms";
import { SessionTableRow } from "./session-table-row";

const noopSubscribe = () => () => undefined;

export function SessionHistory({
  sessions,
  error,
  referenceTime,
}: {
  sessions: SupportSession[];
  error: string | null;
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
  const [query, setQuery] = useState("");
  const [period, setPeriod] = useState("30");
  const [quality, setQuality] = useState("all");
  const hydrated = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
  const referenceTimestamp = new Date(referenceTime).getTime();

  const filtered = useMemo(
    () =>
      sessions.filter((session) => {
        const createdAt = new Date(session.created_at).getTime();
        const cutoff =
          period === "all"
            ? 0
            : referenceTimestamp - Number(period) * 86_400_000;
        const searchText =
          `${session.id} ${session.reference} ${session.customer_name ?? ""}`.toLowerCase();
        const matchesQuality =
          quality === "all" ||
          sessionQuality(session).toLowerCase().replace(" ", "-") === quality;
        return (
          createdAt >= cutoff &&
          searchText.includes(query.trim().toLowerCase()) &&
          matchesQuality
        );
      }),
    [period, quality, query, referenceTimestamp, sessions],
  );

  const totalSeconds = filtered.reduce(
    (total, session) =>
      total + sessionDurationSeconds(session, referenceTimestamp),
    0,
  );
  const completed = filtered.filter(
    (session) => session.status === "completed",
  ).length;

  function exportCsv() {
    const header = [
      "Session",
      "Customer",
      "Reference",
      "Status",
      "Created",
      "Duration seconds",
      "Quality score",
      "Latency ms",
      "Packet loss percent",
      "Reconnects",
    ];
    const rows = filtered.map((session) => [
      shortSessionId(session.id),
      session.customer_name ?? "",
      session.reference,
      session.status,
      session.created_at,
      sessionDurationSeconds(session, new Date().getTime()),
      session.quality_score ?? "",
      session.average_latency_ms ?? "",
      session.average_packet_loss_percent ?? "",
      session.reconnect_count,
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map(csvCell).join(","))
      .join("\n");
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `supportroom-sessions-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <AppShell title="Sessions" description="History and connection reports">
      <div className="page-stack">
        <PageHeader
          eyebrow="Your conversations"
          title="Session history"
          description="Every conversation, with the details that matter."
          actions={
            <Button
              className="h-10 bg-white"
              variant="outline"
              disabled={!filtered.length}
              onClick={exportCsv}
            >
              <Download />
              Export CSV
            </Button>
          }
        />
        <OpenRooms rooms={rooms} />

        {error && (
          <div
            role="alert"
            className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
          >
            {error}
          </div>
        )}

        <div className="flex flex-col gap-3 rounded-xl border bg-white p-3 sm:flex-row">
          <InputGroup className="max-w-md bg-white">
            <InputGroupAddon>
              <Search />
            </InputGroupAddon>
            <InputGroupInput
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              aria-label="Search sessions"
              placeholder="Search customer, room, or reference"
            />
          </InputGroup>
          <Select
            value={period}
            onValueChange={(value) => value && setPeriod(value)}
          >
            <SelectTrigger
              aria-label="Time period"
              className="h-10 w-full bg-white sm:w-40"
            >
              <CalendarDays />
              <SelectValue>
                {period === "all" ? "All time" : `Last ${period} days`}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={quality}
            onValueChange={(value) => value && setQuality(value)}
          >
            <SelectTrigger
              aria-label="Connection quality"
              className="h-10 w-full bg-white sm:w-36"
            >
              <SelectValue>
                {quality === "all"
                  ? "All quality"
                  : quality === "not-rated"
                    ? "Not rated"
                    : quality[0].toUpperCase() + quality.slice(1)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All quality</SelectItem>
              <SelectItem value="excellent">Excellent</SelectItem>
              <SelectItem value="good">Good</SelectItem>
              <SelectItem value="fair">Fair</SelectItem>
              <SelectItem value="poor">Poor</SelectItem>
              <SelectItem value="not-rated">Not rated</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Summary
            label="Sessions"
            value={String(filtered.length)}
            helper={
              period === "all" ? "All recorded calls" : `Last ${period} days`
            }
          />
          <Summary
            label="Talk time"
            value={formatDuration(totalSeconds)}
            helper={
              completed
                ? `${formatDuration(Math.round(totalSeconds / completed))} average`
                : "No completed calls"
            }
          />
          <Summary
            label="Completed"
            value={String(completed)}
            helper={
              filtered.length
                ? `${Math.round((completed / filtered.length) * 100)}% of sessions`
                : "No sessions recorded"
            }
          />
        </div>

        <Card className="overflow-hidden border shadow-none ring-0 [--card-spacing:1.5rem]">
          <CardContent className="p-0">
            {filtered.length ? (
              <>
                <div className="hidden sm:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Customer</TableHead>
                        <TableHead className="hidden md:table-cell">
                          Reference
                        </TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="hidden sm:table-cell">
                          Duration
                        </TableHead>
                        <TableHead>Quality</TableHead>
                        <TableHead>
                          <span className="sr-only">Open</span>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((session) => {
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
                                <div className="min-w-0">
                                  <Link
                                    href={href}
                                    className="block max-w-44 truncate font-medium hover:text-primary hover:underline"
                                    aria-label={
                                      opensRoom
                                        ? `Open room ${session.reference || customer}`
                                        : `View session ${customer}`
                                    }
                                  >
                                    {customer}
                                  </Link>
                                  <p className="text-xs text-muted-foreground">
                                    {shortSessionId(session.id)}
                                  </p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="hidden max-w-64 truncate text-muted-foreground md:table-cell">
                              {session.reference || "No reference"}
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-muted-foreground">
                              {formatDate(session.created_at, hydrated)}
                            </TableCell>
                            <TableCell className="hidden text-muted-foreground sm:table-cell">
                              {formatSessionDuration(
                                session,
                                referenceTimestamp,
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={qualityTone(session.quality_score)}
                              >
                                {sessionQuality(session)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                nativeButton={false}
                                render={<Link href={href} />}
                                aria-label={`${opensRoom ? "Open room" : "View report"} ${shortSessionId(session.id)}`}
                              >
                                <ChevronRight />
                              </Button>
                            </TableCell>
                          </SessionTableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
                <div className="divide-y sm:hidden">
                  {filtered.map((session) => (
                    <Link
                      key={session.id}
                      href={sessionDestination(session, hydrated)}
                      className="flex min-w-0 items-center gap-3 p-4 hover:bg-muted/50"
                    >
                      <Avatar>
                        <AvatarFallback>
                          {initials(customerDisplayName(session))}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">
                          {customerDisplayName(session)}
                        </p>
                        <p className="mt-1 truncate text-xs text-muted-foreground">
                          {session.reference || shortSessionId(session.id)} ·{" "}
                          {formatDate(session.created_at, hydrated)}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {formatSessionDuration(session, referenceTimestamp)}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={qualityTone(session.quality_score)}
                      >
                        {sessionDestination(session, hydrated).startsWith(
                          "/room/",
                        )
                          ? "Open room"
                          : sessionQuality(session)}
                      </Badge>
                      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                    </Link>
                  ))}
                </div>
              </>
            ) : (
              <Empty className="min-h-72 border-0">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <History />
                  </EmptyMedia>
                  <EmptyTitle>
                    {sessions.length
                      ? "No sessions match these filters"
                      : "No sessions recorded yet"}
                  </EmptyTitle>
                  <EmptyDescription>
                    {sessions.length
                      ? "Change the search or filters to see more results."
                      : "Create a room and complete a call. Its connection report will appear here."}
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}
          </CardContent>
        </Card>
        <p className="text-xs text-muted-foreground">
          Showing {filtered.length} of {sessions.length} recorded sessions
        </p>
      </div>
    </AppShell>
  );
}

function Summary({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <Card className="border shadow-none ring-0 [--card-spacing:1.25rem]">
      <CardContent>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-1.5 text-2xl font-semibold tracking-tight">{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{helper}</p>
      </CardContent>
    </Card>
  );
}

function formatDate(value: string, hydrated: boolean) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    ...(hydrated ? {} : { timeZone: "UTC" }),
  }).format(new Date(value));
}

function csvCell(value: string | number) {
  return `"${String(value).replaceAll('"', '""')}"`;
}
