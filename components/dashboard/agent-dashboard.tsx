import Link from "next/link";
import {
  Activity,
  ArrowUpRight,
  Clock3,
  Headphones,
  History,
  LayoutDashboard,
  Plus,
  Radio,
  Settings,
  Signal,
  Users,
  Video,
} from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const sessions = [
  { name: "Maya Chen", initials: "MC", topic: "Checkout camera review", when: "Today, 10:42", duration: "18m 24s", quality: "Excellent", tone: "emerald" },
  { name: "Rafael Ortiz", initials: "RO", topic: "Router setup", when: "Yesterday, 16:08", duration: "27m 11s", quality: "Good", tone: "cyan" },
  { name: "Nora Ibrahim", initials: "NI", topic: "Account verification", when: "Yesterday, 12:35", duration: "09m 47s", quality: "Fair", tone: "amber" },
];

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, active: true },
  { label: "Device check", href: "/playground", icon: Video },
  { label: "Session history", href: "#sessions", icon: History },
  { label: "Settings", href: "#", icon: Settings },
];

function Brand() {
  return (
    <Link href="/dashboard" className="flex items-center gap-3" aria-label="SupportRoom dashboard">
      <span className="grid size-9 place-items-center rounded-xl bg-cyan-400 text-slate-950 shadow-[0_0_30px_rgba(34,211,238,.22)]">
        <Headphones className="size-5" strokeWidth={2.4} />
      </span>
      <span className="text-[17px] font-semibold tracking-[-0.02em] text-white">SupportRoom</span>
    </Link>
  );
}

export function AgentDashboard() {
  return (
    <main className="min-h-screen bg-[#071019] text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-[1600px]">
        <aside className="hidden w-[250px] shrink-0 border-r border-white/[0.07] bg-[#09131e] px-4 py-6 lg:flex lg:flex-col">
          <div className="px-2"><Brand /></div>
          <nav className="mt-10 space-y-1" aria-label="Agent navigation">
            {navItems.map(({ label, href, icon: Icon, active }) => (
              <Link key={label} href={href} className={`flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition ${active ? "bg-cyan-400/10 text-cyan-300 ring-1 ring-inset ring-cyan-400/10" : "text-slate-400 hover:bg-white/[0.05] hover:text-slate-100"}`}>
                <Icon className="size-[18px]" /> {label}
              </Link>
            ))}
          </nav>
          <div className="mt-auto rounded-xl border border-white/[0.08] bg-white/[0.025] p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-200"><span className="size-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,.7)]" />All systems normal</div>
            <p className="mt-2 text-xs leading-5 text-slate-500">Signaling and TURN services are responding.</p>
          </div>
        </aside>

        <section className="min-w-0 flex-1">
          <header className="flex h-[73px] items-center justify-between border-b border-white/[0.07] px-5 sm:px-8">
            <div className="lg:hidden"><Brand /></div>
            <div className="hidden lg:block"><p className="text-sm font-medium text-slate-200">Agent workspace</p><p className="mt-0.5 text-xs text-slate-500">Monday, September 14</p></div>
            <div className="flex items-center gap-3">
              <div className="hidden text-right sm:block"><p className="text-sm font-medium text-slate-200">Alex Morgan</p><p className="text-xs text-slate-500">Support agent</p></div>
              <Avatar size="lg" className="ring-2 ring-cyan-400/20"><AvatarFallback className="bg-cyan-400/15 font-semibold text-cyan-200">AM</AvatarFallback></Avatar>
            </div>
          </header>

          <div className="px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
            <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
              <div>
                <p className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-cyan-300"><Radio className="size-3.5" /> Live support console</p>
                <h1 className="text-3xl font-semibold tracking-[-0.035em] text-white sm:text-4xl">Good afternoon, Alex.</h1>
                <p className="mt-2 text-[15px] leading-6 text-slate-400">Start a secure call or continue monitoring your active room.</p>
              </div>
              <Button size="lg" className="h-11 bg-cyan-400 px-4 font-semibold text-slate-950 shadow-[0_8px_30px_rgba(34,211,238,.18)] hover:bg-cyan-300" render={<Link href="/room/demo-room" />}>
                <Plus data-icon="inline-start" /> Create support room
              </Button>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              <Metric icon={Users} label="Sessions today" value="8" note="+2 from yesterday" noteClass="text-emerald-400" />
              <Metric icon={Clock3} label="Average duration" value="14:32" note="Across the last 30 days" />
              <Metric icon={Signal} label="Connection quality" value="97.4%" note="Healthy sessions" noteClass="text-cyan-300" />
            </div>

            <div className="mt-4 grid gap-4 xl:grid-cols-[1.3fr_.7fr]">
              <Card className="relative border-0 bg-[#0d1925] ring-white/[0.08]">
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/70 to-transparent" />
                <CardHeader className="border-b border-white/[0.07] pb-4">
                  <CardTitle className="flex items-center gap-2 text-white"><span className="size-2 rounded-full bg-amber-400" /> Waiting room</CardTitle>
                  <CardDescription className="text-slate-500">One customer is ready to join</CardDescription>
                  <CardAction><Badge variant="outline" className="border-amber-400/25 bg-amber-400/10 text-amber-200">Waiting 02:14</Badge></CardAction>
                </CardHeader>
                <CardContent className="pt-1">
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                    <Avatar className="size-12"><AvatarFallback className="bg-indigo-400/15 font-semibold text-indigo-200">JT</AvatarFallback></Avatar>
                    <div className="min-w-0 flex-1"><p className="font-medium text-white">Jordan Taylor</p><p className="mt-1 truncate text-sm text-slate-500">Order #SR-2481 · Device setup</p></div>
                    <Button className="h-9 bg-white text-slate-950 hover:bg-slate-200" render={<Link href="/room/demo-room" />}><Video data-icon="inline-start" /> Open room</Button>
                  </div>
                  <div className="mt-5 grid grid-cols-3 gap-2 rounded-xl border border-white/[0.06] bg-black/15 p-3">
                    <ReadyStat label="Camera" value="Ready" /><ReadyStat label="Microphone" value="Ready" /><ReadyStat label="Network" value="36 ms" cyan />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 bg-[#0d1925] ring-white/[0.08]">
                <CardHeader className="border-b border-white/[0.07] pb-4"><CardTitle className="text-white">Service health</CardTitle><CardDescription className="text-slate-500">Realtime infrastructure</CardDescription></CardHeader>
                <CardContent className="space-y-4 pt-1">
                  {[["Signaling", "18 ms"], ["STUN / TURN", "3 regions"], ["Media relay", "0 alerts"]].map(([name, detail]) => (
                    <div key={name} className="flex items-center gap-3"><span className="size-1.5 rounded-full bg-emerald-400" /><span className="flex-1 text-sm text-slate-300">{name}</span><span className="text-xs text-slate-500">{detail}</span></div>
                  ))}
                </CardContent>
              </Card>
            </div>

            <Card id="sessions" className="mt-4 border-0 bg-[#0d1925] ring-white/[0.08]">
              <CardHeader className="border-b border-white/[0.07] pb-4"><CardTitle className="text-white">Recent sessions</CardTitle><CardDescription className="text-slate-500">Your latest completed support calls</CardDescription><CardAction><Button variant="ghost" className="text-slate-400 hover:bg-white/[0.06] hover:text-white">View all</Button></CardAction></CardHeader>
              <CardContent className="divide-y divide-white/[0.06] pt-0">
                {sessions.map((session) => (
                  <div key={session.name} className="grid gap-4 py-4 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-center">
                    <div className="flex items-center gap-3"><Avatar><AvatarFallback className="bg-white/[0.06] text-xs text-slate-300">{session.initials}</AvatarFallback></Avatar><div><p className="text-sm font-medium text-slate-200">{session.name}</p><p className="mt-0.5 text-xs text-slate-500 sm:hidden">{session.topic}</p></div></div>
                    <div className="hidden sm:block"><p className="text-sm text-slate-300">{session.topic}</p><p className="mt-0.5 text-xs text-slate-500">{session.when}</p></div>
                    <p className="text-xs tabular-nums text-slate-500">{session.duration}</p>
                    <Badge variant="outline" className={`w-fit ${session.tone === "emerald" ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300" : session.tone === "cyan" ? "border-cyan-400/20 bg-cyan-400/10 text-cyan-300" : "border-amber-400/20 bg-amber-400/10 text-amber-300"}`}>{session.quality}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
            <p className="mt-6 flex items-center gap-2 text-xs text-slate-600"><Activity className="size-3.5" /> Diagnostics collection is enabled for completed sessions.</p>
          </div>
        </section>
      </div>
    </main>
  );
}

function Metric({ icon: Icon, label, value, note, noteClass = "text-slate-500" }: { icon: typeof Users; label: string; value: string; note: string; noteClass?: string }) {
  return <Card className="border-0 bg-[#0d1925] ring-white/[0.08]"><CardHeader><CardDescription className="flex items-center gap-2 text-slate-500"><Icon className="size-4" /> {label}</CardDescription><CardAction><ArrowUpRight className="size-4 text-slate-700" /></CardAction></CardHeader><CardContent><p className="text-3xl font-semibold tracking-tight text-white">{value}</p><p className={`mt-1 text-xs ${noteClass}`}>{note}</p></CardContent></Card>;
}

function ReadyStat({ label, value, cyan = false }: { label: string; value: string; cyan?: boolean }) {
  return <div><p className="text-[11px] uppercase tracking-wider text-slate-600">{label}</p><p className={`mt-1 text-xs font-medium ${cyan ? "text-cyan-300" : "text-emerald-300"}`}>{value}</p></div>;
}
