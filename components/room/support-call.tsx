"use client";

import Link from "next/link";
import {
  Activity,
  Camera,
  Check,
  ChevronLeft,
  Copy,
  Maximize2,
  Mic,
  MicOff,
  MonitorUp,
  MoreHorizontal,
  PhoneOff,
  ShieldCheck,
  UserRound,
  VideoOff,
} from "lucide-react";
import { toast } from "sonner";

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useSignaling } from "@/hooks/use-signaling";
import { invitationUrl, readHostRoom } from "@/lib/signaling/client";

export function SupportCall({ roomId }: { roomId: string }) {
  const signaling = useSignaling({ roomId, role: "host", name: "Alex Morgan" });
  const admitted = signaling.room?.customerState === "admitted";
  const waitingCustomer = signaling.room?.customerState === "waiting";

  async function copyInvite() {
    const created = readHostRoom(roomId);
    if (!created) return toast.error("No invitation is available for this room.");
    try {
      await navigator.clipboard.writeText(invitationUrl(created));
      toast.success("Invitation link copied");
    } catch { toast.error("Could not copy the invitation. Check your browser permissions."); }
  }

  return (
    <main className="app-surface flex min-h-screen flex-col bg-[#111827] text-white">
      <header className="flex h-16 items-center gap-3 border-b border-white/10 px-4 sm:px-6">
        <Button variant="ghost" size="icon" className="text-slate-300 hover:bg-white/10 hover:text-white" render={<Link href="/dashboard" />} aria-label="Back to dashboard"><ChevronLeft /></Button>
        <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{signaling.room?.reference || "Support session"}</p><p className="mt-0.5 text-xs text-slate-400">Room {roomId}</p></div>
        <Badge variant="outline" className="gap-1.5 border-white/15 bg-white/5 text-slate-200"><ShieldCheck className="size-3.5 text-emerald-400" />Signaling: {signaling.status}</Badge>
        <DropdownMenu><DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="text-slate-300 hover:bg-white/10 hover:text-white" />}><MoreHorizontal /></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={copyInvite}><Copy />Copy invite link</DropdownMenuItem><DropdownMenuItem><Maximize2 />Enter full screen</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
      </header>

      <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1fr)_330px]">
        <section className="flex min-h-[620px] flex-col p-4 sm:p-6">
          <div className="grid min-h-0 flex-1 gap-4 md:grid-cols-2">
            <VideoTile name="Alex Morgan" label="You · media not connected" />
            {admitted ? <VideoTile name={signaling.room?.customerName ?? "Customer"} label="Customer" /> : <WaitingTile customerName={signaling.room?.customerName} connected={signaling.status === "connected"} waiting={waitingCustomer} error={signaling.error} onDecline={() => signaling.send({ type: "decline" })} onAdmit={() => signaling.send({ type: "admit" })} />}
          </div>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            <ControlButton label="Mute · available after media connects" icon={Mic} disabled />
            <ControlButton label="Stop video · available after media connects" icon={Camera} disabled />
            <ControlButton label="Share screen · available after media connects" icon={MonitorUp} disabled />
            <AlertDialog>
              <AlertDialogTrigger render={<Button size="icon-lg" className="ml-2 rounded-full bg-red-600 text-white hover:bg-red-700" />}><PhoneOff /></AlertDialogTrigger>
              <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>End this support room?</AlertDialogTitle><AlertDialogDescription>The customer will be disconnected and the invitation will no longer work.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Stay in room</AlertDialogCancel><AlertDialogAction onClick={signaling.leave} render={<Link href="/dashboard" />} className="bg-red-600 text-white hover:bg-red-700">End room</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
            </AlertDialog>
          </div>
        </section>

        <aside className="border-t border-white/10 bg-[#172033] lg:border-t-0 lg:border-l">
          <Tabs defaultValue="diagnostics" className="h-full gap-0">
            <TabsList variant="line" className="h-14 w-full justify-start gap-4 border-b border-white/10 px-5 text-slate-400">
              <TabsTrigger value="diagnostics" className="flex-none text-slate-400 data-active:text-white">Diagnostics</TabsTrigger>
              <TabsTrigger value="people" className="flex-none text-slate-400 data-active:text-white">People</TabsTrigger>
            </TabsList>
            <TabsContent value="diagnostics" className="p-5"><Diagnostics status={signaling.status} /></TabsContent>
            <TabsContent value="people" className="p-5"><People customerName={signaling.room?.customerName} admitted={admitted} /></TabsContent>
          </Tabs>
        </aside>
      </div>
    </main>
  );
}

function VideoTile({ name, label, muted = false, cameraOff = false }: { name: string; label: string; muted?: boolean; cameraOff?: boolean }) {
  return <div className="relative min-h-[280px] overflow-hidden rounded-xl border border-white/10 bg-[#202b3d] shadow-xl"><div className="absolute inset-0 grid place-items-center bg-[radial-gradient(circle_at_center,#34435b_0%,#202b3d_68%)]"><div className="grid size-20 place-items-center rounded-full bg-white/10"><UserRound className="size-9 text-slate-300" /></div></div>{cameraOff && <div className="absolute inset-0 grid place-items-center bg-[#202b3d]"><VideoOff className="size-8 text-slate-400" /></div>}<div className="absolute inset-x-0 bottom-0 flex items-end justify-between bg-gradient-to-t from-black/65 to-transparent p-4 pt-12"><div><p className="text-sm font-medium">{name}</p><p className="text-xs text-slate-300">{label}</p></div><span className="grid size-7 place-items-center rounded-full bg-black/45">{muted ? <MicOff className="size-3.5 text-red-300" /> : <Mic className="size-3.5" />}</span></div></div>;
}

function WaitingTile({ customerName, connected, waiting, error, onAdmit, onDecline }: { customerName?: string | null; connected: boolean; waiting?: boolean; error?: string | null; onAdmit: () => void; onDecline: () => void }) {
  return <div className="grid min-h-[280px] place-items-center rounded-xl border border-dashed border-white/15 bg-white/[0.025] p-6 text-center"><div><span className="mx-auto grid size-14 place-items-center rounded-full bg-white/5"><UserRound className="size-6 text-slate-400" /></span><p className="mt-4 text-sm font-medium">{waiting ? `${customerName ?? "A customer"} is waiting` : connected ? "Waiting for the customer" : "Connecting to the room"}</p><p className="mt-1 text-xs text-slate-400">{error ?? (waiting ? "Review the request before admitting them." : "Share the invitation link when the room is ready.")}</p>{waiting && <div className="mt-5 flex justify-center gap-2"><Button variant="outline" onClick={onDecline} className="border-white/15 bg-transparent text-white hover:bg-white/10 hover:text-white">Decline</Button><Button onClick={onAdmit} className="bg-white text-slate-950 hover:bg-slate-200"><Check />Admit</Button></div>}</div></div>;
}

function ControlButton({ label, icon: Icon, disabled = false }: { label: string; icon: typeof Mic; disabled?: boolean }) {
  return <Tooltip><TooltipTrigger render={<span className="inline-flex"><Button size="icon-lg" variant="ghost" aria-label={label} disabled={disabled} className="rounded-full border border-white/10 bg-white/5 text-white hover:bg-white/10 hover:text-white"><Icon /></Button></span>} /><TooltipContent>{label}</TooltipContent></Tooltip>;
}

function Diagnostics({ status }: { status: string }) {
  const signalingReady = status === "connected";
  return <div className="space-y-5"><div className="flex items-center justify-between gap-3"><div><p className="text-sm font-medium">Signaling</p><p className="mt-0.5 text-xs text-slate-400">WebSocket room channel</p></div><Badge className={signalingReady ? "bg-emerald-400/10 text-emerald-300" : "bg-white/10 text-slate-300"}>{status}</Badge></div><div className="grid grid-cols-2 gap-3"><Diagnostic label="Latency" value="—" /><Diagnostic label="Packet loss" value="—" /><Diagnostic label="Send bitrate" value="—" /><Diagnostic label="Receive bitrate" value="—" /></div><div className="space-y-3 border-t border-white/10 pt-5"><InfoRow label="ICE candidate" value="Not negotiated" /><InfoRow label="Codec" value="Not negotiated" /><InfoRow label="Video sent" value="Not started" /><InfoRow label="Media" value="Not connected" /></div><div className="rounded-lg border border-white/10 bg-white/[0.03] p-3"><p className="text-xs font-medium">Media connection comes next</p><p className="mt-1.5 text-xs leading-5 text-slate-400">These values will come from RTCPeerConnection.getStats() after the peer connection is implemented.</p></div></div>;
}

function Diagnostic({ label, value }: { label: string; value: string }) { return <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3"><p className="text-[11px] text-slate-400">{label}</p><p className="mt-1 text-sm font-medium">{value}</p></div>; }
function InfoRow({ label, value }: { label: string; value: string }) { return <div className="flex justify-between gap-4 text-xs"><span className="text-slate-400">{label}</span><span className="text-right font-mono text-slate-200">{value}</span></div>; }
function People({ customerName, admitted }: { customerName?: string | null; admitted: boolean }) { return <div className="space-y-3"><Person name="Alex Morgan" role="Host" />{customerName && <Person name={customerName} role={admitted ? "Admitted" : "Waiting"} />}</div>; }
function Person({ name, role, muted = false }: { name: string; role: string; muted?: boolean }) { return <div className="flex items-center gap-3 rounded-lg border border-white/10 p-3"><span className="grid size-8 place-items-center rounded-full bg-white/10"><UserRound className="size-4" /></span><div className="flex-1"><p className="text-sm font-medium">{name}</p><p className="text-xs text-slate-400">{role}</p></div>{muted ? <MicOff className="size-4 text-slate-500" /> : <Activity className="size-4 text-emerald-400" />}</div>; }
