"use client";

import { useState } from "react";
import { Camera, CheckCircle2, Mic, RotateCcw, UserRound, Volume2 } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

export function DevicePlayground() {
  const [camera, setCamera] = useState(true);
  const [microphone, setMicrophone] = useState(true);

  return (
    <AppShell title="Device check" description="Preview and select call devices">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <section><h2 className="text-[1.75rem] font-semibold leading-tight">Camera and microphone</h2><p className="mt-2 text-muted-foreground">Confirm that your devices are ready before opening a support room.</p></section>
        <div className="grid gap-6 lg:grid-cols-[1.25fr_.75fr]">
          <Card className="border shadow-sm ring-0">
            <CardHeader className="flex-row items-center justify-between"><div><CardTitle>Preview</CardTitle><CardDescription>Only visible to you</CardDescription></div><Badge variant="outline" className="gap-1.5 font-normal"><span className="size-1.5 rounded-full bg-emerald-500" />Ready</Badge></CardHeader>
            <CardContent>
              <div className="relative aspect-video overflow-hidden rounded-lg bg-[#202b3d]">
                {camera ? <div className="absolute inset-0 grid place-items-center bg-[radial-gradient(circle_at_center,#34435b_0%,#202b3d_65%)]"><div className="grid size-20 place-items-center rounded-full bg-white/10 text-white"><UserRound className="size-9" /></div></div> : <div className="absolute inset-0 grid place-items-center text-slate-300"><div className="text-center"><Camera className="mx-auto size-8" /><p className="mt-3 text-sm">Camera preview is off</p></div></div>}
                <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-md bg-black/45 px-2.5 py-1.5 text-xs text-white backdrop-blur"><span className="size-1.5 rounded-full bg-emerald-400" />Alex Morgan</div>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Button variant={microphone ? "outline" : "secondary"} onClick={() => setMicrophone((value) => !value)}><Mic />{microphone ? "Mute" : "Unmute"}</Button>
                <Button variant={camera ? "outline" : "secondary"} onClick={() => setCamera((value) => !value)}><Camera />{camera ? "Turn off camera" : "Turn on camera"}</Button>
                <Button variant="ghost" className="ml-auto"><RotateCcw />Run check again</Button>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card className="border shadow-sm ring-0">
              <CardHeader><CardTitle>Devices</CardTitle><CardDescription>Choose what SupportRoom will use.</CardDescription></CardHeader>
              <CardContent className="space-y-5">
                <Field><FieldLabel>Camera</FieldLabel><Select defaultValue="facetime"><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="facetime">FaceTime HD Camera</SelectItem><SelectItem value="continuity">iPhone Continuity Camera</SelectItem></SelectContent></Select><FieldDescription>1280 × 720 at 30 fps</FieldDescription></Field>
                <Field><FieldLabel>Microphone</FieldLabel><Select defaultValue="macbook"><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="macbook">MacBook Microphone</SelectItem><SelectItem value="airpods">AirPods Microphone</SelectItem></SelectContent></Select></Field>
                <Field><FieldLabel>Speaker</FieldLabel><Select defaultValue="macbook-speakers"><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="macbook-speakers">MacBook Speakers</SelectItem><SelectItem value="airpods-speakers">AirPods</SelectItem></SelectContent></Select></Field>
              </CardContent>
            </Card>
            <Card className="border shadow-sm ring-0"><CardContent className="space-y-4"><CheckRow icon={Camera} label="Camera" status="Working" /><CheckRow icon={Mic} label="Microphone" status="Clear" meter /><CheckRow icon={Volume2} label="Speaker" status="Connected" /></CardContent></Card>
          </div>
        </div>
        <Alert className="bg-emerald-50/70 text-emerald-950"><CheckCircle2 /><AlertTitle>Your setup looks good</AlertTitle><AlertDescription>You can change these devices again during a call.</AlertDescription></Alert>
      </div>
    </AppShell>
  );
}

function CheckRow({ icon: Icon, label, status, meter }: { icon: typeof Camera; label: string; status: string; meter?: boolean }) {
  return <div className="flex items-center gap-3"><span className="grid size-8 place-items-center rounded-md bg-muted text-muted-foreground"><Icon className="size-4" /></span><div className="min-w-0 flex-1"><div className="flex items-center justify-between"><span className="text-sm font-medium">{label}</span><span className="text-xs text-emerald-700">{status}</span></div>{meter && <Progress value={64} className="mt-2 h-1.5" />}</div><Switch defaultChecked aria-label={`Enable ${label}`} /></div>;
}
