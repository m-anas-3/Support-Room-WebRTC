"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, CheckCircle2, Loader2, Mic, MicOff, RotateCcw, ShieldCheck, TriangleAlert, VideoOff, Volume2 } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocalMedia } from "@/hooks/use-local-media";
import { useAgentIdentity } from "@/components/auth/agent-identity";

export function DevicePlayground() {
  const agent = useAgentIdentity();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [selectedSpeakerId, setSelectedSpeakerId] = useState("default");
  const {
    stream,
    status,
    error,
    devices,
    selectedCameraId,
    selectedMicrophoneId,
    isCameraEnabled,
    isMicrophoneEnabled,
    audioLevel,
    startMedia,
    stopMedia,
    toggleCamera,
    toggleMicrophone,
    selectCamera,
    selectMicrophone,
  } = useLocalMedia();

  const isReady = status === "ready";
  const isRequesting = status === "requesting";
  const videoSettings = stream?.getVideoTracks()[0]?.getSettings();

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.srcObject = stream;
    if (stream) void video.play().catch(() => undefined);
    return () => { video.srcObject = null; };
  }, [stream]);

  return (
    <AppShell title="Device check" description="Preview and select call devices">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <section><h2 className="text-[1.75rem] font-semibold leading-tight">Camera and microphone</h2><p className="mt-2 text-muted-foreground">Confirm that your devices are ready before opening a support room.</p></section>

        {error && <Alert variant="destructive"><TriangleAlert /><AlertTitle>Device access needs attention</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}

        <div className="grid gap-6 lg:grid-cols-[1.25fr_.75fr]">
          <Card className="border shadow-sm ring-0">
            <CardHeader className="flex-row items-center justify-between"><div><CardTitle>Preview</CardTitle><CardDescription>Only visible to you</CardDescription></div><Badge variant="outline" className="gap-1.5 font-normal"><span className={`size-1.5 rounded-full ${isReady ? "bg-emerald-500" : "bg-slate-400"}`} />{isReady ? "Connected" : isRequesting ? "Requesting access" : "Not started"}</Badge></CardHeader>
            <CardContent>
              <div className="relative aspect-video overflow-hidden rounded-lg bg-[#202b3d]">
                <video ref={videoRef} autoPlay muted playsInline className={`h-full w-full object-cover [transform:scaleX(-1)] ${!isReady || !isCameraEnabled ? "invisible" : ""}`} />
                {(!isReady || !isCameraEnabled) && <div className="absolute inset-0 grid place-items-center p-6 text-center text-slate-300"><div>{isRequesting ? <Loader2 className="mx-auto size-8 animate-spin" /> : <VideoOff className="mx-auto size-8" />}<p className="mt-3 text-sm">{isRequesting ? "Allow camera and microphone access in your browser" : isReady ? "Camera is off" : "Start your device preview"}</p>{!isReady && !isRequesting && <Button className="mt-5 bg-white text-slate-950 hover:bg-slate-100" onClick={() => void startMedia()}><Camera />Start device check</Button>}</div></div>}
                {isReady && <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-md bg-black/45 px-2.5 py-1.5 text-xs text-white backdrop-blur"><span className="size-1.5 rounded-full bg-emerald-400" />{agent.name}</div>}
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Button variant={isMicrophoneEnabled ? "outline" : "secondary"} disabled={!isReady} onClick={toggleMicrophone}>{isMicrophoneEnabled ? <Mic /> : <MicOff />}{isMicrophoneEnabled ? "Mute" : "Unmute"}</Button>
                <Button variant={isCameraEnabled ? "outline" : "secondary"} disabled={!isReady} onClick={toggleCamera}>{isCameraEnabled ? <Camera /> : <VideoOff />}{isCameraEnabled ? "Turn off camera" : "Turn on camera"}</Button>
                <Button variant="ghost" disabled={isRequesting} className="ml-auto" onClick={() => void startMedia()}><RotateCcw />Run check again</Button>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card className="border shadow-sm ring-0">
              <CardHeader><CardTitle>Devices</CardTitle><CardDescription>Choose what SupportRoom will use.</CardDescription></CardHeader>
              <CardContent className="space-y-5">
                <Field><FieldLabel>Camera</FieldLabel><Select value={selectedCameraId || null} onValueChange={(value) => value && void selectCamera(value)} disabled={!isReady || isRequesting}><SelectTrigger className="w-full"><SelectValue placeholder="Start preview to discover cameras" /></SelectTrigger><SelectContent>{devices.cameras.map((device, index) => <SelectItem key={device.deviceId} value={device.deviceId}>{device.label || `Camera ${index + 1}`}</SelectItem>)}</SelectContent></Select><FieldDescription>{videoSettings?.width && videoSettings.height ? `${videoSettings.width} × ${videoSettings.height}${videoSettings.frameRate ? ` at ${Math.round(videoSettings.frameRate)} fps` : ""}` : "Camera settings appear after access is granted."}</FieldDescription></Field>
                <Field><FieldLabel>Microphone</FieldLabel><Select value={selectedMicrophoneId || null} onValueChange={(value) => value && void selectMicrophone(value)} disabled={!isReady || isRequesting}><SelectTrigger className="w-full"><SelectValue placeholder="Start preview to discover microphones" /></SelectTrigger><SelectContent>{devices.microphones.map((device, index) => <SelectItem key={device.deviceId} value={device.deviceId}>{device.label || `Microphone ${index + 1}`}</SelectItem>)}</SelectContent></Select></Field>
                <Field><FieldLabel>Speaker</FieldLabel><Select value={selectedSpeakerId} onValueChange={(value) => value && setSelectedSpeakerId(value)} disabled={!isReady}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="default">System default</SelectItem>{devices.speakers.filter((device) => device.deviceId !== "default").map((device, index) => <SelectItem key={device.deviceId} value={device.deviceId}>{device.label || `Speaker ${index + 1}`}</SelectItem>)}</SelectContent></Select><FieldDescription>Output selection will apply to the customer’s audio during calls.</FieldDescription></Field>
              </CardContent>
            </Card>

            <Card className="border shadow-sm ring-0"><CardContent className="space-y-4"><div className="flex items-center gap-3"><span className="grid size-8 place-items-center rounded-md bg-muted text-muted-foreground"><Mic className="size-4" /></span><div className="flex-1"><div className="flex justify-between"><p className="text-sm font-medium">Microphone level</p><p className="text-xs text-muted-foreground">{!isReady ? "Not connected" : !isMicrophoneEnabled ? "Muted" : "Speak to test"}</p></div><Progress value={isReady && isMicrophoneEnabled ? audioLevel : 0} className="mt-2 h-1.5" /></div></div><div className="flex items-center gap-3"><span className="grid size-8 place-items-center rounded-md bg-muted text-muted-foreground"><Volume2 className="size-4" /></span><div><p className="text-sm font-medium">Local preview is muted</p><p className="text-xs text-muted-foreground">This prevents microphone feedback.</p></div></div></CardContent></Card>
          </div>
        </div>

        <Alert className={isReady ? "bg-emerald-50/70 text-emerald-950" : "bg-white"}>{isReady ? <CheckCircle2 /> : <ShieldCheck />}<AlertTitle>{isReady ? "Your devices are connected" : "Your media stays on this device"}</AlertTitle><AlertDescription>{isReady ? "Camera and microphone tracks will be released when you stop the preview or leave this page." : "This check does not start a call or send media to another participant."}</AlertDescription></Alert>
        {isReady && <Button variant="outline" onClick={stopMedia}>Stop preview and release devices</Button>}
      </div>
    </AppShell>
  );
}
