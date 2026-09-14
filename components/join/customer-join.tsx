"use client";

import { useState } from "react";
import { Camera, Check, Mic, ShieldCheck, UserRound, Video, VideoOff } from "lucide-react";

import { Brand } from "@/components/layout/brand";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

export function CustomerJoin({ roomId }: { roomId: string }) {
  const [camera, setCamera] = useState(true);
  const [microphone, setMicrophone] = useState(true);
  const [waiting, setWaiting] = useState(false);

  return (
    <main className="app-surface min-h-screen bg-[#f7f8fa]">
      <header className="flex h-16 items-center justify-between border-b bg-white px-5 sm:px-8"><Brand href={`/join/${roomId}`} /><Badge variant="outline" className="gap-1.5 bg-white font-normal"><ShieldCheck className="size-3.5 text-emerald-600" />Secure room</Badge></header>
      <div className="mx-auto grid w-full max-w-6xl gap-6 px-5 py-8 lg:grid-cols-[1.2fr_.8fr] lg:py-14">
        <section>
          <div className="mb-6"><p className="font-medium text-primary">Device preview</p><h1 className="mt-1.5 text-[1.75rem] font-semibold leading-tight">Get ready to join</h1><p className="mt-2 text-muted-foreground">Check how you look and sound before entering the room.</p></div>
          <div className="relative aspect-video overflow-hidden rounded-xl bg-[#202b3d] shadow-sm">
            {camera ? <div className="absolute inset-0 grid place-items-center bg-[radial-gradient(circle_at_center,#34435b_0%,#202b3d_65%)]"><div className="grid size-20 place-items-center rounded-full bg-white/10 text-white"><UserRound className="size-9" /></div></div> : <div className="absolute inset-0 grid place-items-center text-slate-300"><div className="text-center"><VideoOff className="mx-auto size-8" /><p className="mt-3 text-sm">Camera is off</p></div></div>}
            <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-md bg-black/45 px-2.5 py-1.5 text-xs text-white backdrop-blur"><span className="size-1.5 rounded-full bg-emerald-400" />Preview</div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <DeviceToggle icon={Camera} label="Camera" detail="FaceTime HD Camera" checked={camera} onCheckedChange={setCamera} />
            <DeviceToggle icon={Mic} label="Microphone" detail="MacBook Microphone" checked={microphone} onCheckedChange={setMicrophone} />
          </div>
        </section>

        <aside className="lg:pt-[88px]">
          <Card className="border shadow-sm ring-0">
            <CardHeader><CardTitle>{waiting ? "You’re in the waiting room" : "Join support session"}</CardTitle><CardDescription>{waiting ? "The support agent has been notified." : `Room ${roomId} · Hosted by Alex Morgan`}</CardDescription></CardHeader>
            <CardContent>
              {waiting ? <div className="py-5 text-center"><span className="mx-auto grid size-12 place-items-center rounded-full bg-emerald-50 text-emerald-700"><Check className="size-6" /></span><p className="mt-4 font-medium">Your devices are ready</p><p className="mt-1 text-sm leading-6 text-muted-foreground">Keep this page open. You’ll enter automatically when Alex admits you.</p><Button variant="outline" className="mt-5" onClick={() => setWaiting(false)}>Leave waiting room</Button></div> : <div className="space-y-5"><Field><FieldLabel htmlFor="name">Your name</FieldLabel><Input id="name" placeholder="Enter your name" defaultValue="Jordan Taylor" /></Field><Alert className="bg-blue-50/60 text-blue-950"><Video /><AlertTitle>About this call</AlertTitle><AlertDescription>Your browser will use your camera and microphone only during the session.</AlertDescription></Alert><Button className="h-10 w-full" onClick={() => setWaiting(true)}><Video />Ask to join</Button></div>}
            </CardContent>
          </Card>
        </aside>
      </div>
    </main>
  );
}

function DeviceToggle({ icon: Icon, label, detail, checked, onCheckedChange }: { icon: typeof Camera; label: string; detail: string; checked: boolean; onCheckedChange: (checked: boolean) => void }) {
  return <div className="flex items-center gap-3 rounded-lg border bg-white p-3 shadow-xs"><span className="grid size-8 place-items-center rounded-md bg-muted text-muted-foreground"><Icon className="size-4" /></span><div className="min-w-0 flex-1"><p className="text-sm font-medium">{label}</p><p className="truncate text-xs text-muted-foreground">{detail}</p></div><Switch checked={checked} onCheckedChange={onCheckedChange} aria-label={`Toggle ${label}`} /></div>;
}
