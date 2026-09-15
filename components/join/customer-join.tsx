"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Check, Loader2, Mic, ShieldCheck, Video, VideoOff } from "lucide-react";

import { Brand } from "@/components/layout/brand";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { useLocalMedia } from "@/hooks/use-local-media";
import { usePeerConnection } from "@/hooks/use-peer-connection";
import { useScreenShare } from "@/hooks/use-screen-share";
import { useSignaling } from "@/hooks/use-signaling";
import { CustomerCall } from "@/components/room/customer-call";

export function CustomerJoin({ roomId }: { roomId: string }) {
  const media = useLocalMedia();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [waiting, setWaiting] = useState(false);
  const [name, setName] = useState("");
  const signaling = useSignaling({ roomId, role: "customer", name, enabled: waiting, onDisconnect: media.stopMedia });
  const admitted = signaling.room?.customerState === "admitted";
  const isReady = media.status === "ready";
  const failed = ["error", "closed", "disconnected", "declined"].includes(signaling.status);
  const peer = usePeerConnection({ role: "customer", localStream: media.stream, enabled: admitted && signaling.status === "connected", send: signaling.send, subscribeToSignals: signaling.subscribeToSignals });
  const screenShare = useScreenShare({
    cameraStream: media.stream,
    enabled: peer.connectionState === "connected",
    replaceOutgoingVideoTrack: peer.replaceOutgoingVideoTrack,
    announce: (active) => { if (signaling.status === "connected") signaling.send({ type: "screen-share-state", active }); },
  });

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.srcObject = media.stream;
    if (media.stream) void video.play().catch(() => undefined);
    return () => { video.srcObject = null; };
  }, [media.stream]);

  if (admitted && !failed && media.stream) {
    return <CustomerCall name={name} hostName={signaling.room?.hostName ?? "Support agent"} localStream={screenShare.displayStream ?? media.stream} remoteStream={peer.remoteStream} connectionState={peer.connectionState} error={screenShare.error || peer.error} cameraEnabled={media.isCameraEnabled} microphoneEnabled={media.isMicrophoneEnabled} screenSharing={screenShare.isSharing} remoteScreenSharing={peer.remoteScreenSharing} screenShareSupported={screenShare.supported} screenShareChanging={screenShare.isChanging} onToggleCamera={media.toggleCamera} onToggleMicrophone={media.toggleMicrophone} onToggleScreenShare={() => { if (screenShare.isSharing) void screenShare.stopScreenShare(); else void screenShare.startScreenShare(); }} onLeave={() => { screenShare.releaseScreenShare(); peer.close(); media.stopMedia(); signaling.leave(); setWaiting(false); }} />;
  }

  return (
    <main className="app-surface min-h-screen bg-[#f7f8fa]">
      <header className="flex h-16 items-center justify-between border-b bg-white px-5 sm:px-8"><Brand href="/" /><Badge variant="outline" className="gap-1.5 bg-white font-normal"><ShieldCheck className="size-3.5 text-emerald-600" />Private room</Badge></header>
      <div className="mx-auto grid w-full max-w-6xl gap-6 px-5 py-8 lg:grid-cols-[1.2fr_.8fr] lg:py-14">
        <section>
          <div className="mb-6"><p className="font-medium text-primary">Device preview</p><h1 className="mt-1.5 text-[1.75rem] font-semibold leading-tight">Get ready to join</h1><p className="mt-2 text-muted-foreground">Check how you look and sound before entering the room.</p></div>
          <div className="relative aspect-video overflow-hidden rounded-xl bg-[#202b3d] shadow-sm">
            <video ref={videoRef} autoPlay muted playsInline className={`h-full w-full object-cover [transform:scaleX(-1)] ${!isReady || !media.isCameraEnabled ? "invisible" : ""}`} />
            {(!isReady || !media.isCameraEnabled) && <div className="absolute inset-0 grid place-items-center p-5 text-slate-300"><div className="text-center">{media.status === "requesting" ? <Loader2 className="mx-auto size-8 animate-spin" /> : <VideoOff className="mx-auto size-8" />}<p className="mt-3 text-sm">{media.status === "requesting" ? "Allow access in your browser" : isReady ? "Camera is off" : "Preview your camera and microphone"}</p>{!isReady && media.status !== "requesting" && <Button className="mt-4" onClick={() => void media.startMedia()}><Camera />Start preview</Button>}</div></div>}
            {isReady && <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-md bg-black/45 px-2.5 py-1.5 text-xs text-white backdrop-blur"><span className="size-1.5 rounded-full bg-emerald-400" />Only visible to you</div>}
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <DeviceToggle icon={Camera} label="Camera" detail={media.stream?.getVideoTracks()[0]?.label || "Start preview to check"} checked={media.isCameraEnabled} disabled={!isReady} onCheckedChange={media.toggleCamera} />
            <DeviceToggle icon={Mic} label="Microphone" detail={media.stream?.getAudioTracks()[0]?.label || "Start preview to check"} checked={media.isMicrophoneEnabled} disabled={!isReady} onCheckedChange={media.toggleMicrophone} />
          </div>
          {isReady && <div className="mt-4 space-y-2"><p className="text-xs text-muted-foreground">{media.isMicrophoneEnabled ? "Speak to test your microphone" : "Microphone muted"}</p><Progress value={media.isMicrophoneEnabled ? media.audioLevel : 0} className="h-1.5" /><Button variant="ghost" size="sm" onClick={media.stopMedia}>Stop preview</Button></div>}
          {media.error && <p role="alert" className="mt-3 text-sm text-destructive">{media.error}</p>}
        </section>

        <aside className="lg:pt-[88px]">
          <Card className="border shadow-sm ring-0">
            <CardHeader><CardTitle>{failed ? "Unable to join this room" : admitted ? "You’ve been admitted" : waiting ? "You’re in the waiting room" : "Join support session"}</CardTitle><CardDescription>{failed ? "Review the message below." : admitted ? "The agent accepted your request." : waiting ? signaling.room?.hostConnected ? "The support agent has been notified." : "Waiting for the support agent to connect." : `Room ${roomId}`}</CardDescription></CardHeader>
            <CardContent>
              {waiting ? <div className="py-5 text-center"><span className="mx-auto grid size-12 place-items-center rounded-full bg-muted text-muted-foreground"><Check className="size-6" /></span><p className="mt-4 font-medium">{failed ? "Request ended" : admitted ? `${signaling.room?.hostName ?? "The agent"} admitted you` : signaling.status === "connecting" ? "Connecting…" : "Waiting for admission"}</p><p className="mt-1 text-sm leading-6 text-muted-foreground">{signaling.error ?? (signaling.status === "declined" ? "The agent declined your request." : "Keep this page open until the agent responds.")}</p><Button variant="outline" className="mt-5" onClick={() => { screenShare.releaseScreenShare(); peer.close(); signaling.leave(); media.stopMedia(); setWaiting(false); }}>Leave room</Button></div> : <div className="space-y-5"><Field><FieldLabel htmlFor="name">Your name</FieldLabel><Input id="name" maxLength={80} placeholder="Enter your name" value={name} onChange={(event) => setName(event.target.value)} /></Field><Alert className="bg-blue-50/60 text-blue-950"><Video /><AlertTitle>About this preview</AlertTitle><AlertDescription>Preview media stays on this device. It is sent to the agent only after admission.</AlertDescription></Alert><Button className="h-10 w-full" disabled={!name.trim() || !isReady} onClick={() => setWaiting(true)}><Video />Ask to join</Button>{!isReady && <p className="text-center text-xs text-muted-foreground">Start the device preview before asking to join.</p>}</div>}
            </CardContent>
          </Card>
        </aside>
      </div>
    </main>
  );
}

function DeviceToggle({ icon: Icon, label, detail, checked, disabled, onCheckedChange }: { icon: typeof Camera; label: string; detail: string; checked: boolean; disabled: boolean; onCheckedChange: (checked: boolean) => void }) {
  return <div className="flex items-center gap-3 rounded-lg border bg-white p-3 shadow-xs"><span className="grid size-8 place-items-center rounded-md bg-muted text-muted-foreground"><Icon className="size-4" /></span><div className="min-w-0 flex-1"><p className="text-sm font-medium">{label}</p><p className="truncate text-xs text-muted-foreground">{detail}</p></div><Switch checked={checked} disabled={disabled} onCheckedChange={onCheckedChange} aria-label={`Toggle ${label}`} /></div>;
}
