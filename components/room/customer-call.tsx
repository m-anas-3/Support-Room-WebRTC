"use client";

import { ShieldCheck } from "lucide-react";
import { Brand } from "@/components/layout/brand";
import { Badge } from "@/components/ui/badge";
import { CallControls } from "./call-controls";
import { VideoTile } from "./video-tile";

export function CustomerCall({ name, hostName, localStream, remoteStream, connectionState, error, cameraEnabled, microphoneEnabled, screenSharing, remoteScreenSharing, screenShareSupported, screenShareChanging, onToggleCamera, onToggleMicrophone, onToggleScreenShare, onLeave }: {
  name: string;
  hostName: string;
  localStream: MediaStream;
  remoteStream: MediaStream | null;
  connectionState: RTCPeerConnectionState | "idle";
  error: string | null;
  cameraEnabled: boolean;
  microphoneEnabled: boolean;
  screenSharing: boolean;
  remoteScreenSharing: boolean;
  screenShareSupported: boolean;
  screenShareChanging: boolean;
  onToggleCamera: () => void;
  onToggleMicrophone: () => void;
  onToggleScreenShare: () => void;
  onLeave: () => void;
}) {
  return <main className="app-surface flex min-h-screen flex-col bg-[#111827] text-white">
    <header className="flex h-16 items-center justify-between gap-4 border-b border-white/10 px-5 sm:px-8"><Brand href="/" className="text-white" /><Badge variant="outline" className="gap-1.5 border-white/15 bg-white/5 text-slate-200"><ShieldCheck className="size-3.5 text-emerald-400" />Media: {connectionState}</Badge></header>
    <section className="mx-auto flex w-full max-w-7xl flex-1 flex-col p-4 sm:p-6">
      {error && <p role="alert" className="mb-4 rounded-lg border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200">{error}</p>}
      <div className="grid min-h-[520px] flex-1 gap-4 md:grid-cols-2">
        <VideoTile stream={localStream} name={name} label={screenSharing ? "You · Presenting" : "You"} local={!screenSharing} fit={screenSharing ? "contain" : "cover"} cameraEnabled={screenSharing || cameraEnabled} microphoneEnabled={microphoneEnabled} testId="local-video" />
        <VideoTile stream={remoteStream} name={hostName} label={remoteScreenSharing ? "Support agent · Presenting" : connectionState === "connected" ? "Support agent" : "Connecting…"} fit={remoteScreenSharing ? "contain" : "cover"} testId="remote-video" />
      </div>
      <div className="mt-5"><CallControls microphoneEnabled={microphoneEnabled} cameraEnabled={cameraEnabled} mediaReady screenShareReady={connectionState === "connected"} screenSharing={screenSharing} screenShareSupported={screenShareSupported} screenShareChanging={screenShareChanging} host={false} onToggleMicrophone={onToggleMicrophone} onToggleCamera={onToggleCamera} onToggleScreenShare={onToggleScreenShare} onLeave={onLeave} /></div>
    </section>
  </main>;
}
