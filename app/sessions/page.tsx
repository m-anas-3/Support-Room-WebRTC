import Link from "next/link";
import { CalendarDays, ChevronRight, Download, Search } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const sessions = [
  { id: "SR-2481", name: "Maya Chen", initials: "MC", topic: "Checkout camera review", date: "Sep 14, 10:42", duration: "18m 24s", quality: "Excellent", tone: "emerald" },
  { id: "SR-2479", name: "Rafael Ortiz", initials: "RO", topic: "Router setup", date: "Sep 13, 16:08", duration: "27m 11s", quality: "Good", tone: "blue" },
  { id: "SR-2474", name: "Nora Ibrahim", initials: "NI", topic: "Account verification", date: "Sep 13, 12:35", duration: "09m 47s", quality: "Fair", tone: "amber" },
  { id: "SR-2468", name: "Isaac Moore", initials: "IM", topic: "Payment terminal setup", date: "Sep 12, 15:17", duration: "21m 03s", quality: "Excellent", tone: "emerald" },
  { id: "SR-2461", name: "Hana Suzuki", initials: "HS", topic: "Mobile app onboarding", date: "Sep 12, 09:26", duration: "13m 55s", quality: "Good", tone: "blue" },
];

export default function SessionsPage() {
  return (
    <AppShell title="Sessions" description="History and connection reports" actions={<Button variant="outline"><Download />Export</Button>}>
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <section><h2 className="text-[1.75rem] font-semibold leading-tight">Session history</h2><p className="mt-2 text-muted-foreground">Review completed support calls and inspect connection details.</p></section>
        <div className="flex flex-col gap-3 sm:flex-row">
          <InputGroup className="max-w-md bg-white"><InputGroupAddon><Search /></InputGroupAddon><InputGroupInput placeholder="Search customer, room, or topic" /></InputGroup>
          <Select defaultValue="30days"><SelectTrigger className="w-full bg-white sm:w-40"><CalendarDays /><SelectValue /></SelectTrigger><SelectContent><SelectItem value="7days">Last 7 days</SelectItem><SelectItem value="30days">Last 30 days</SelectItem><SelectItem value="90days">Last 90 days</SelectItem></SelectContent></Select>
          <Select defaultValue="all"><SelectTrigger className="w-full bg-white sm:w-36"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All quality</SelectItem><SelectItem value="excellent">Excellent</SelectItem><SelectItem value="good">Good</SelectItem><SelectItem value="fair">Fair</SelectItem></SelectContent></Select>
        </div>
        <div className="grid gap-4 sm:grid-cols-3"><Summary label="Total sessions" value="142" helper="Last 30 days" /><Summary label="Talk time" value="34h 18m" helper="14m average" /><Summary label="Resolved" value="92%" helper="131 sessions" /></div>
        <Card className="border shadow-sm ring-0"><CardContent className="p-0"><Table><TableHeader><TableRow><TableHead>Customer</TableHead><TableHead className="hidden md:table-cell">Topic</TableHead><TableHead>Date</TableHead><TableHead className="hidden sm:table-cell">Duration</TableHead><TableHead>Quality</TableHead><TableHead><span className="sr-only">Open</span></TableHead></TableRow></TableHeader><TableBody>{sessions.map((session) => <TableRow key={session.id}><TableCell><div className="flex items-center gap-3"><Avatar size="sm"><AvatarFallback className="text-[11px]">{session.initials}</AvatarFallback></Avatar><div><p className="font-medium">{session.name}</p><p className="text-xs text-muted-foreground">{session.id}</p></div></div></TableCell><TableCell className="hidden text-muted-foreground md:table-cell">{session.topic}</TableCell><TableCell className="text-muted-foreground">{session.date}</TableCell><TableCell className="hidden text-muted-foreground sm:table-cell">{session.duration}</TableCell><TableCell><Badge variant="outline" className={session.tone === "emerald" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : session.tone === "blue" ? "border-blue-200 bg-blue-50 text-blue-700" : "border-amber-200 bg-amber-50 text-amber-700"}>{session.quality}</Badge></TableCell><TableCell><Button variant="ghost" size="icon-sm" render={<Link href={`/sessions/${session.id}`} />} aria-label={`Open ${session.id}`}><ChevronRight /></Button></TableCell></TableRow>)}</TableBody></Table></CardContent></Card>
        <p className="text-center text-xs text-muted-foreground">Showing 5 of 142 sessions</p>
      </div>
    </AppShell>
  );
}

function Summary({ label, value, helper }: { label: string; value: string; helper: string }) { return <Card className="border shadow-xs ring-0"><CardContent><p className="text-sm text-muted-foreground">{label}</p><p className="mt-1.5 text-2xl font-semibold tracking-tight">{value}</p><p className="mt-1 text-xs text-muted-foreground">{helper}</p></CardContent></Card>; }
