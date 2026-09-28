"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Activity, Camera, Check, ChevronLeft, Copy, Maximize2, MoreVertical, Users, UserRound, X } from "lucide-react";
import { toast } from "sonner";
import { ConnectionDiagnostics } from "@/components/diagnostics/connection-diagnostics";
import { useAgentIdentity } from "@/components/auth/agent-identity";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useLocalMedia } from "@/hooks/use-local-media";
import { useOutgoingMedia } from "@/hooks/use-outgoing-media";
import { usePeerConnection } from "@/hooks/use-peer-connection";
import { useScreenShare } from "@/hooks/use-screen-share";
import { useSessionHistory } from "@/hooks/use-session-history";
import { useSignaling } from "@/hooks/use-signaling";
import { invitationUrl, readHostRoom } from "@/lib/signaling/client";
import { cn } from "@/lib/utils";
import { CallControls } from "./call-controls";
import { VideoTile } from "./video-tile";

type Panel = "diagnostics" | "people" | null;

export function SupportCall({ roomId }: { roomId: string }) {
  const router = useRouter();
  const agent = useAgentIdentity();
  const [panel, setPanel] = useState<Panel>(null);
  const media = useLocalMedia();
  const signaling = useSignaling({ roomId, role: "host", name: agent.name, onDisconnect: media.stopMedia });
  const admitted = signaling.room?.customerState === "admitted";
  const waitingCustomer = signaling.room?.customerState === "waiting";
  const mediaReady = media.status === "ready" && Boolean(media.stream);
  const peer = usePeerConnection({ role: "host", localStream: media.stream, enabled: admitted && signaling.status === "connected", iceConfiguration: signaling.iceConfiguration, send: signaling.send, subscribeToSignals: signaling.subscribeToSignals });
  const screenShare = useScreenShare({
    cameraStream: media.stream,
    enabled: peer.connectionState === "connected",
    replaceOutgoingVideoTrack: peer.replaceOutgoingVideoTrack,
    announce: (active) => { if (signaling.status === "connected") signaling.send({ type: "screen-share-state", active }); },
  });
  const outgoingMedia = useOutgoingMedia({
    connected: peer.connectionState === "connected",
    audioTrack: media.audioTrack,
    videoTrack: media.videoTrack,
    videoOverrideActive: screenShare.isSharing,
    cameraEnabled: media.isCameraEnabled,
    microphoneEnabled: media.isMicrophoneEnabled,
    replaceAudioTrack: peer.replaceOutgoingAudioTrack,
    replaceVideoTrack: peer.replaceOutgoingVideoTrack,
    send: signaling.send,
  });
  const handleHistoryError = useCallback(() => {
    toast.warning("The call is still active, but its session history could not be updated.");
  }, []);
  const sessionHistory = useSessionHistory({
    roomId,
    customerName: signaling.room?.customerName ?? null,
    customerState: signaling.room?.customerState ?? null,
    connectionState: peer.connectionState,
    diagnostics: peer.diagnostics,
    recoveryAttempts: peer.recoveryAttempts,
    onPersistenceError: handleHistoryError,
  });
  const signalingReconnecting = signaling.status === "reconnecting";
  const error = media.error || outgoingMedia.error || screenShare.error || peer.error || (signalingReconnecting ? null : signaling.error);
  const reference = signaling.room?.reference || "Support session";

  async function copyInvite() {
    const created = readHostRoom(roomId);
    if (!created) return toast.error("No invitation is available for this room.");
    try { await navigator.clipboard.writeText(invitationUrl(created)); toast.success("Invitation link copied"); }
    catch { toast.error("Could not copy the invitation. Check your browser permissions."); }
  }

  async function endRoom() {
    screenShare.releaseScreenShare();
    peer.close();
    media.stopMedia();
    signaling.leave();
    await sessionHistory.complete();
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="app-surface flex h-dvh min-h-[520px] flex-col overflow-hidden bg-[#202124] text-white">
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <section className="absolute inset-0 flex min-h-0 flex-col p-2 pb-0 sm:p-3 sm:pb-0" aria-label="Call stage">
          {signalingReconnecting && <p role="status" className="mx-auto mb-2 w-full max-w-2xl shrink-0 rounded-xl border border-amber-300/20 bg-amber-950/80 px-4 py-2.5 text-center text-sm text-amber-100 shadow-xl backdrop-blur">Signaling connection interrupted. Reconnecting{signaling.reconnectAttempt ? ` · attempt ${signaling.reconnectAttempt}` : ""}… Your devices remain ready.</p>}
          {error && <p role="alert" className="mx-auto mb-2 w-full max-w-2xl shrink-0 rounded-xl border border-red-400/20 bg-red-950/80 px-4 py-2.5 text-center text-sm text-red-100 shadow-xl backdrop-blur">{error}</p>}
          <div className="relative min-h-0 flex-1 overflow-hidden rounded-2xl bg-[#303134]" data-testid="host-call-stage">
            {admitted ? (
              <VideoTile className="h-full min-h-0 rounded-none border-0 bg-[#303134] shadow-none" stream={peer.remoteStream} name={signaling.room?.customerName ?? "Customer"} label={peer.remoteScreenSharing ? "Customer · Presenting" : peer.recoveryState === "reconnecting" ? "Reconnecting…" : peer.connectionState === "connected" ? "Customer" : "Connecting…"} fit={peer.remoteScreenSharing ? "contain" : "cover"} cameraEnabled={peer.remoteScreenSharing || peer.remoteCameraEnabled} microphoneEnabled={peer.remoteMicrophoneEnabled} testId="remote-video" />
            ) : (
              <WaitingTile className="h-full min-h-0 rounded-none border-0" customerName={signaling.room?.customerName} connected={signaling.status === "connected"} waiting={waitingCustomer} error={signaling.error} canAdmit={mediaReady} onDecline={() => signaling.send({ type: "decline" })} onAdmit={() => signaling.send({ type: "admit" })} />
            )}

            <div className="absolute right-3 bottom-3 z-10 aspect-video w-36 sm:right-4 sm:bottom-4 sm:w-48 lg:w-56 xl:w-64">
              <VideoTile compact className="h-full min-h-0 rounded-xl border-white/15 bg-[#3c4043] shadow-2xl shadow-black/50" stream={media.stream} name="You" label={screenShare.isSharing ? "Host · Presenting" : "Host"} local cameraEnabled={media.isCameraEnabled} microphoneEnabled={media.isMicrophoneEnabled} testId="local-video" action={!mediaReady ? <Button size="xs" disabled={media.status === "requesting"} className="bg-white text-[#202124] hover:bg-slate-100" onClick={() => void media.startMedia()}><Camera />{media.status === "requesting" ? "Starting…" : "Start camera"}</Button> : undefined} />
            </div>
          </div>
        </section>

        {panel && (
          <aside className="absolute inset-y-2 right-2 z-30 flex w-[calc(100%-1rem)] max-w-[380px] flex-col overflow-hidden rounded-2xl border border-black/10 bg-white text-slate-900 shadow-2xl sm:inset-y-3 sm:right-3" aria-label={panel === "diagnostics" ? "Connection diagnostics" : "People"}>
            <div className="flex h-16 shrink-0 items-center justify-between border-b px-5">
              <div><h2 className="text-base font-semibold">{panel === "diagnostics" ? "Connection details" : "People"}</h2><p className="text-xs text-slate-500">{panel === "diagnostics" ? "Live call quality" : "Participants in this room"}</p></div>
              <Button variant="ghost" size="icon" aria-label="Close side panel" onClick={() => setPanel(null)}><X /></Button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5 [&_.text-amber-400]:text-amber-600 [&_.text-emerald-300]:text-emerald-700 [&_.text-slate-200]:text-slate-700 [&_.text-slate-300]:text-slate-700 [&_.text-slate-400]:text-slate-500 [&_.border-white\/10]:border-slate-200 [&_.bg-white\/\[0\.03\]]:bg-slate-50 [&_.bg-white\/10]:bg-slate-100" data-testid={panel === "diagnostics" ? "host-diagnostics-panel" : undefined}>
              {panel === "diagnostics" ? <ConnectionDiagnostics signalingStatus={signaling.status} peer={peer} /> : <People hostName={agent.name} customerName={signaling.room?.customerName} admitted={admitted} />}
            </div>
          </aside>
        )}
      </div>

      <footer className="grid h-[76px] shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-2 px-3 sm:h-20 sm:px-5" aria-label="Call controls">
        <div className="hidden min-w-0 self-center sm:block">
          <p className="truncate text-sm font-medium text-white">{reference}</p>
          <div className="mt-0.5 flex items-center gap-1.5 text-xs text-[#bdc1c6]"><span className={cn("size-1.5 rounded-full", peer.connectionState === "connected" ? "bg-[#81c995]" : "bg-[#fdd663]")} /><span>Media: {peer.recoveryState === "reconnecting" ? "reconnecting" : peer.connectionState}</span><span className="hidden md:inline">· Private room</span></div>
        </div>

        <CallControls microphoneEnabled={media.isMicrophoneEnabled} cameraEnabled={media.isCameraEnabled} mediaReady={mediaReady} cameraChanging={["requesting", "recovering"].includes(media.cameraStatus)} microphoneChanging={["requesting", "recovering"].includes(media.microphoneStatus)} screenShareReady={peer.connectionState === "connected"} screenSharing={screenShare.isSharing} screenShareSupported={screenShare.supported} screenShareChanging={screenShare.isChanging} host onToggleMicrophone={media.toggleMicrophone} onToggleCamera={media.toggleCamera} onToggleScreenShare={() => { if (screenShare.isSharing) void screenShare.stopScreenShare(); else void screenShare.startScreenShare(); }} onLeave={endRoom} />

        <div className="flex min-w-0 items-center justify-end gap-1">
          <FooterButton label="Connection diagnostics" active={panel === "diagnostics"} icon={Activity} onClick={() => setPanel((current) => current === "diagnostics" ? null : "diagnostics")} />
          <FooterButton label="People" active={panel === "people"} icon={Users} onClick={() => setPanel((current) => current === "people" ? null : "people")} />
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="rounded-full text-[#e8eaed] hover:bg-white/10 hover:text-white" aria-label="More options" />}><MoreVertical /></DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem className="sm:hidden" onClick={() => setPanel("diagnostics")}><Activity />Connection diagnostics</DropdownMenuItem>
              <DropdownMenuItem className="sm:hidden" onClick={() => setPanel("people")}><Users />People</DropdownMenuItem>
              <DropdownMenuItem onClick={copyInvite}><Copy />Copy invite link</DropdownMenuItem>
              <DropdownMenuItem onClick={() => void document.documentElement.requestFullscreen().catch(() => toast.error("Full screen could not be started."))}><Maximize2 />Enter full screen</DropdownMenuItem>
              <DropdownMenuItem onClick={() => void endRoom()}><ChevronLeft />End room and return</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </footer>
    </main>
  );
}

function FooterButton({ label, icon: Icon, active, onClick }: { label: string; icon: typeof Activity; active: boolean; onClick: () => void }) {
  return <Tooltip><TooltipTrigger render={<Button variant="ghost" size="icon" className={cn("hidden rounded-full text-[#e8eaed] hover:bg-white/10 hover:text-white sm:inline-flex", active && "bg-[#8ab4f8]/20 text-[#8ab4f8]")} aria-label={label} onClick={onClick} />}><Icon /></TooltipTrigger><TooltipContent>{label}</TooltipContent></Tooltip>;
}

function WaitingTile({ customerName, connected, waiting, error, canAdmit, onAdmit, onDecline, className }: { customerName?: string | null; connected: boolean; waiting?: boolean; error?: string | null; canAdmit: boolean; onAdmit: () => void; onDecline: () => void; className?: string }) {
  return <div className={cn("grid min-h-[280px] place-items-center rounded-xl bg-[#303134] p-6 text-center", className)}><div><span className="mx-auto grid size-20 place-items-center rounded-full bg-[#3c4043]"><UserRound className="size-9 text-[#bdc1c6]" /></span><p className="mt-5 text-base font-medium">{waiting ? `${customerName ?? "A customer"} is waiting` : connected ? "Waiting for the customer" : "Connecting to the room"}</p><p className="mx-auto mt-1.5 max-w-sm text-sm leading-6 text-[#bdc1c6]">{error ?? (waiting ? canAdmit ? "Your camera is ready. You can admit this customer." : "Start your camera before admitting the customer." : "Share the invitation link when the room is ready.")}</p>{waiting && <div className="mt-6 flex justify-center gap-2"><Button variant="outline" onClick={onDecline} className="border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white">Decline</Button><Button disabled={!canAdmit} onClick={onAdmit} className="bg-[#8ab4f8] text-[#202124] hover:bg-[#aecbfa]"><Check />Admit</Button></div>}</div></div>;
}

function People({ hostName, customerName, admitted }: { hostName: string; customerName?: string | null; admitted: boolean }) { return <div className="space-y-3"><Person name={hostName} role="Host" />{customerName && <Person name={customerName} role={admitted ? "In call" : "Waiting"} />}</div>; }
function Person({ name, role }: { name: string; role: string }) { return <div className="flex items-center gap-3 rounded-xl border border-slate-200 p-3"><span className="grid size-9 place-items-center rounded-full bg-slate-100"><UserRound className="size-4 text-slate-600" /></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{name}</p><p className="text-xs text-slate-500">{role}</p></div></div>; }
