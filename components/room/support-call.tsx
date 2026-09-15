"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Camera, Check, ChevronLeft, Copy, Maximize2, MoreHorizontal, ShieldCheck, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLocalMedia } from "@/hooks/use-local-media";
import { usePeerConnection } from "@/hooks/use-peer-connection";
import { useSignaling } from "@/hooks/use-signaling";
import { invitationUrl, readHostRoom } from "@/lib/signaling/client";
import { CallControls } from "./call-controls";
import { VideoTile } from "./video-tile";

export function SupportCall({ roomId }: { roomId: string }) {
  const router = useRouter();
  const media = useLocalMedia();
  const signaling = useSignaling({ roomId, role: "host", name: "Alex Morgan", onDisconnect: media.stopMedia });
  const admitted = signaling.room?.customerState === "admitted";
  const waitingCustomer = signaling.room?.customerState === "waiting";
  const mediaReady = media.status === "ready" && Boolean(media.stream);
  const peer = usePeerConnection({ role: "host", localStream: media.stream, enabled: admitted && signaling.status === "connected", send: signaling.send, subscribeToSignals: signaling.subscribeToSignals });

  async function copyInvite() {
    const created = readHostRoom(roomId);
    if (!created) return toast.error("No invitation is available for this room.");
    try { await navigator.clipboard.writeText(invitationUrl(created)); toast.success("Invitation link copied"); }
    catch { toast.error("Could not copy the invitation. Check your browser permissions."); }
  }
  function endRoom() {
    peer.close();
    media.stopMedia();
    signaling.leave();
    router.push("/dashboard");
  }

  return (
    <main className="app-surface flex min-h-screen flex-col bg-[#111827] text-white">
      <header className="flex h-16 items-center gap-3 border-b border-white/10 px-4 sm:px-6">
        <Button variant="ghost" size="icon" nativeButton={false} className="text-slate-300 hover:bg-white/10 hover:text-white" render={<Link href="/dashboard" />} aria-label="Back to dashboard"><ChevronLeft /></Button>
        <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{signaling.room?.reference || "Support session"}</p><p className="mt-0.5 truncate text-xs text-slate-400">Room {roomId}</p></div>
        <Badge variant="outline" className="gap-1.5 border-white/15 bg-white/5 text-slate-200"><ShieldCheck className="size-3.5 text-emerald-400" />Media: {peer.connectionState}</Badge>
        <DropdownMenu><DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="text-slate-300 hover:bg-white/10 hover:text-white" />}><MoreHorizontal /></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={copyInvite}><Copy />Copy invite link</DropdownMenuItem><DropdownMenuItem onClick={() => void document.documentElement.requestFullscreen().catch(() => toast.error("Full screen could not be started."))}><Maximize2 />Enter full screen</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
      </header>

      <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1fr)_330px]">
        <section className="flex min-h-[620px] flex-col p-4 sm:p-6">
          {(media.error || peer.error || signaling.error) && <p role="alert" className="mb-4 rounded-lg border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200">{media.error || peer.error || signaling.error}</p>}
          <div className="grid min-h-0 flex-1 gap-4 md:grid-cols-2">
            <VideoTile stream={media.stream} name="Alex Morgan" label="You" local cameraEnabled={media.isCameraEnabled} microphoneEnabled={media.isMicrophoneEnabled} testId="local-video" action={!mediaReady ? <Button size="sm" disabled={media.status === "requesting"} className="bg-white text-slate-950 hover:bg-slate-200" onClick={() => void media.startMedia()}><Camera />{media.status === "requesting" ? "Requesting access…" : "Start camera"}</Button> : undefined} />
            {admitted ? <VideoTile stream={peer.remoteStream} name={signaling.room?.customerName ?? "Customer"} label={peer.connectionState === "connected" ? "Customer" : "Connecting…"} testId="remote-video" /> : <WaitingTile customerName={signaling.room?.customerName} connected={signaling.status === "connected"} waiting={waitingCustomer} error={signaling.error} canAdmit={mediaReady} onDecline={() => signaling.send({ type: "decline" })} onAdmit={() => signaling.send({ type: "admit" })} />}
          </div>
          <div className="mt-5"><CallControls microphoneEnabled={media.isMicrophoneEnabled} cameraEnabled={media.isCameraEnabled} mediaReady={mediaReady} host onToggleMicrophone={media.toggleMicrophone} onToggleCamera={media.toggleCamera} onLeave={endRoom} /></div>
        </section>

        <aside className="border-t border-white/10 bg-[#172033] lg:border-t-0 lg:border-l">
          <Tabs defaultValue="diagnostics" className="h-full gap-0">
            <TabsList variant="line" className="h-14 w-full justify-start gap-4 border-b border-white/10 px-5 text-slate-400"><TabsTrigger value="diagnostics" className="flex-none text-slate-400 data-active:text-white">Diagnostics</TabsTrigger><TabsTrigger value="people" className="flex-none text-slate-400 data-active:text-white">People</TabsTrigger></TabsList>
            <TabsContent value="diagnostics" className="p-5"><Diagnostics signalingStatus={signaling.status} peer={peer} /></TabsContent>
            <TabsContent value="people" className="p-5"><People customerName={signaling.room?.customerName} admitted={admitted} /></TabsContent>
          </Tabs>
        </aside>
      </div>
    </main>
  );
}

function WaitingTile({ customerName, connected, waiting, error, canAdmit, onAdmit, onDecline }: { customerName?: string | null; connected: boolean; waiting?: boolean; error?: string | null; canAdmit: boolean; onAdmit: () => void; onDecline: () => void }) {
  return <div className="grid min-h-[280px] place-items-center rounded-xl border border-dashed border-white/15 bg-white/[0.025] p-6 text-center"><div><span className="mx-auto grid size-14 place-items-center rounded-full bg-white/5"><UserRound className="size-6 text-slate-400" /></span><p className="mt-4 text-sm font-medium">{waiting ? `${customerName ?? "A customer"} is waiting` : connected ? "Waiting for the customer" : "Connecting to the room"}</p><p className="mt-1 text-xs text-slate-400">{error ?? (waiting ? canAdmit ? "Your camera is ready. You can admit this customer." : "Start your camera before admitting the customer." : "Share the invitation link when the room is ready.")}</p>{waiting && <div className="mt-5 flex justify-center gap-2"><Button variant="outline" onClick={onDecline} className="border-white/15 bg-transparent text-white hover:bg-white/10 hover:text-white">Decline</Button><Button disabled={!canAdmit} onClick={onAdmit} className="bg-white text-slate-950 hover:bg-slate-200"><Check />Admit</Button></div>}</div></div>;
}

function Diagnostics({ signalingStatus, peer }: { signalingStatus: string; peer: { connectionState: string; iceConnectionState: string; iceGatheringState: string; signalingState: string; remoteStream: MediaStream | null } }) {
  const connected = peer.connectionState === "connected";
  return <div className="space-y-5"><div className="flex items-center justify-between gap-3"><div><p className="text-sm font-medium">Connection</p><p className="mt-0.5 text-xs text-slate-400">Peer-to-peer media</p></div><Badge className={connected ? "bg-emerald-400/10 text-emerald-300" : "bg-white/10 text-slate-300"}>{peer.connectionState}</Badge></div><div className="grid grid-cols-2 gap-3"><Diagnostic label="Latency" value="—" /><Diagnostic label="Packet loss" value="—" /><Diagnostic label="Send bitrate" value="—" /><Diagnostic label="Receive bitrate" value="—" /></div><div className="space-y-3 border-t border-white/10 pt-5"><InfoRow label="Signaling socket" value={signalingStatus} /><InfoRow label="SDP state" value={peer.signalingState} /><InfoRow label="ICE gathering" value={peer.iceGatheringState} /><InfoRow label="ICE connection" value={peer.iceConnectionState} /><InfoRow label="Remote tracks" value={String(peer.remoteStream?.getTracks().length ?? 0)} /></div><div className="rounded-lg border border-white/10 bg-white/[0.03] p-3"><p className="text-xs font-medium">{connected ? "Media is connected" : "Waiting for media connection"}</p><p className="mt-1.5 text-xs leading-5 text-slate-400">Bitrate, latency, packet loss, and the selected candidate will be added from getStats() in the diagnostics milestone.</p></div></div>;
}

function Diagnostic({ label, value }: { label: string; value: string }) { return <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3"><p className="text-[11px] text-slate-400">{label}</p><p className="mt-1 text-sm font-medium">{value}</p></div>; }
function InfoRow({ label, value }: { label: string; value: string }) { return <div className="flex justify-between gap-4 text-xs"><span className="text-slate-400">{label}</span><span className="text-right font-mono text-slate-200">{value}</span></div>; }
function People({ customerName, admitted }: { customerName?: string | null; admitted: boolean }) { return <div className="space-y-3"><Person name="Alex Morgan" role="Host" />{customerName && <Person name={customerName} role={admitted ? "In call" : "Waiting"} />}</div>; }
function Person({ name, role }: { name: string; role: string }) { return <div className="flex items-center gap-3 rounded-lg border border-white/10 p-3"><span className="grid size-8 place-items-center rounded-full bg-white/10"><UserRound className="size-4" /></span><div className="flex-1"><p className="text-sm font-medium">{name}</p><p className="text-xs text-slate-400">{role}</p></div></div>; }
