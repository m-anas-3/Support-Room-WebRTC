import Link from "next/link";
import { ArrowRight, Clock3, Link2, Signal, Users } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CreateRoomDialog } from "./create-room-dialog";

const sessions = [
  { name: "Maya Chen", initials: "MC", topic: "Checkout camera review", time: "10:42", duration: "18m", quality: "Excellent", dot: "bg-emerald-500" },
  { name: "Rafael Ortiz", initials: "RO", topic: "Router setup", time: "Yesterday", duration: "27m", quality: "Good", dot: "bg-blue-500" },
  { name: "Nora Ibrahim", initials: "NI", topic: "Account verification", time: "Yesterday", duration: "9m", quality: "Fair", dot: "bg-amber-500" },
];

export function AgentDashboard() {
  return (
    <AppShell title="Overview" description="Monday, September 14" actions={<CreateRoomDialog />}>
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <section className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div><p className="font-medium text-primary">Agent workspace</p><h2 className="mt-1.5 text-[1.75rem] font-semibold leading-tight sm:text-[2rem]">Good afternoon, Alex</h2><p className="mt-2 text-muted-foreground">Everything is ready for your next support call.</p></div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <Metric icon={Users} label="Sessions today" value="8" helper="2 more than yesterday" />
          <Metric icon={Clock3} label="Average duration" value="14:32" helper="Last 30 days" />
          <Metric icon={Signal} label="Healthy connections" value="97.4%" helper="Across 142 sessions" />
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.35fr_.65fr]">
          <Card className="border shadow-sm ring-0">
            <CardHeader className="border-b">
              <div className="flex items-center justify-between gap-4">
                <div><CardTitle>Start a support call</CardTitle><CardDescription>Create a private room and invite one customer</CardDescription></div>
                <Badge variant="secondary">Ready</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                <span className="grid size-11 place-items-center rounded-full bg-blue-50 text-blue-700"><Link2 className="size-5" /></span>
                <div className="min-w-0 flex-1"><p className="font-medium">No customer is waiting</p><p className="mt-0.5 text-sm text-muted-foreground">Use New room to generate an invitation link.</p></div>
              </div>
            </CardContent>
          </Card>

          <Card className="border shadow-sm ring-0">
            <CardHeader><CardTitle>Weekly goal</CardTitle><CardDescription>34 of 40 sessions completed</CardDescription></CardHeader>
            <CardContent>
              <Progress value={85} />
              <div className="mt-5 space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Resolution rate</span><span className="font-medium">92%</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Customer rating</span><span className="font-medium">4.8 / 5</span></div>
              </div>
            </CardContent>
          </Card>
        </section>

        <Card className="border shadow-sm ring-0">
          <CardHeader className="flex-row items-center justify-between border-b">
            <div><CardTitle>Recent sessions</CardTitle><CardDescription>Your latest completed calls</CardDescription></div>
            <Button variant="ghost" render={<Link href="/sessions" />}>View all <ArrowRight /></Button>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Customer</TableHead><TableHead className="hidden md:table-cell">Topic</TableHead><TableHead>Time</TableHead><TableHead>Duration</TableHead><TableHead>Quality</TableHead></TableRow></TableHeader>
              <TableBody>
                {sessions.map((session) => (
                  <TableRow key={session.name}>
                    <TableCell><div className="flex items-center gap-3"><Avatar size="sm"><AvatarFallback className="text-[11px]">{session.initials}</AvatarFallback></Avatar><span className="font-medium">{session.name}</span></div></TableCell>
                    <TableCell className="hidden text-muted-foreground md:table-cell">{session.topic}</TableCell><TableCell className="text-muted-foreground">{session.time}</TableCell><TableCell className="text-muted-foreground">{session.duration}</TableCell>
                    <TableCell><span className="inline-flex items-center gap-2"><span className={`size-1.5 rounded-full ${session.dot}`} />{session.quality}</span></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

function Metric({ icon: Icon, label, value, helper }: { icon: typeof Users; label: string; value: string; helper: string }) {
  return <Card className="border shadow-sm ring-0"><CardContent><div className="flex items-start justify-between"><div><p className="text-muted-foreground">{label}</p><p className="mt-2 text-[1.65rem] font-semibold leading-none tracking-[-0.035em]">{value}</p><p className="mt-2 text-xs text-muted-foreground">{helper}</p></div><span className="grid size-10 place-items-center rounded-lg bg-primary/8 text-primary"><Icon className="size-[18px]" /></span></div></CardContent></Card>;
}
