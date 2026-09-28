"use client";

import { ShieldCheck } from "lucide-react";
import { CallControls } from "./call-controls";
import { VideoTile } from "./video-tile";

export function CustomerCall({ name, hostName, localStream, remoteStream, connectionState, recoveryState, connectionNotice, error, cameraEnabled, microphoneEnabled, cameraChanging, microphoneChanging, screenSharing, remoteScreenSharing, remoteCameraEnabled, remoteMicrophoneEnabled, screenShareSupported, screenShareChanging, onToggleCamera, onToggleMicrophone, onToggleScreenShare, onLeave }: {
  name: string;
  hostName: string;
  localStream: MediaStream;
  remoteStream: MediaStream | null;
  connectionState: RTCPeerConnectionState | "idle";
  recoveryState: "idle" | "reconnecting" | "recovered";
  connectionNotice: string | null;
  error: string | null;
  cameraEnabled: boolean;
  microphoneEnabled: boolean;
  cameraChanging: boolean;
  microphoneChanging: boolean;
  screenSharing: boolean;
  remoteScreenSharing: boolean;
  remoteCameraEnabled: boolean;
  remoteMicrophoneEnabled: boolean;
  screenShareSupported: boolean;
  screenShareChanging: boolean;
  onToggleCamera: () => void;
  onToggleMicrophone: () => void;
  onToggleScreenShare: () => void;
  onLeave: () => void;
}) {
  return (
    <main className="app-surface flex h-dvh min-h-[520px] flex-col overflow-hidden bg-[#202124] text-white">
      <section className="relative min-h-0 flex-1 p-2 pb-0 sm:p-3 sm:pb-0" aria-label="Call stage">
        {connectionNotice && <p role="status" className="absolute top-5 left-1/2 z-20 w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 rounded-xl border border-amber-300/20 bg-amber-950/80 px-4 py-2.5 text-center text-sm text-amber-100 shadow-xl backdrop-blur">{connectionNotice}</p>}
        {error && <p role="alert" className="absolute top-5 left-1/2 z-20 w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 rounded-xl border border-red-400/20 bg-red-950/80 px-4 py-2.5 text-center text-sm text-red-100 shadow-xl backdrop-blur">{error}</p>}
        <div className="relative h-full min-h-0 overflow-hidden rounded-2xl bg-[#303134]" data-testid="customer-call-stage">
          <VideoTile className="h-full min-h-0 rounded-none border-0 bg-[#303134] shadow-none" stream={remoteStream} name={hostName} label={remoteScreenSharing ? "Support agent · Presenting" : recoveryState === "reconnecting" ? "Reconnecting…" : connectionState === "connected" ? "Support agent" : "Connecting…"} fit={remoteScreenSharing ? "contain" : "cover"} cameraEnabled={remoteScreenSharing || remoteCameraEnabled} microphoneEnabled={remoteMicrophoneEnabled} testId="remote-video" />
          <div className="absolute right-3 bottom-3 z-10 aspect-video w-36 sm:right-4 sm:bottom-4 sm:w-48 lg:w-56 xl:w-64">
            <VideoTile compact className="h-full min-h-0 rounded-xl border-white/15 bg-[#3c4043] shadow-2xl shadow-black/50" stream={localStream} name="You" label={screenSharing ? `${name} · Presenting` : name} local cameraEnabled={cameraEnabled} microphoneEnabled={microphoneEnabled} testId="local-video" />
          </div>
        </div>
      </section>

      <footer className="grid h-[76px] shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-2 px-3 sm:h-20 sm:px-5" aria-label="Call controls">
        <div className="hidden min-w-0 sm:block">
          <p className="truncate text-sm font-medium text-white">Support call with {hostName}</p>
          <div className="mt-0.5 flex items-center gap-1.5 text-xs text-[#bdc1c6]"><span className={connectionState === "connected" ? "size-1.5 rounded-full bg-[#81c995]" : "size-1.5 rounded-full bg-[#fdd663]"} /><span>Media: {recoveryState === "reconnecting" ? "reconnecting" : connectionState}</span></div>
        </div>

        <CallControls microphoneEnabled={microphoneEnabled} cameraEnabled={cameraEnabled} mediaReady cameraChanging={cameraChanging} microphoneChanging={microphoneChanging} screenShareReady={connectionState === "connected"} screenSharing={screenSharing} screenShareSupported={screenShareSupported} screenShareChanging={screenShareChanging} host={false} onToggleMicrophone={onToggleMicrophone} onToggleCamera={onToggleCamera} onToggleScreenShare={onToggleScreenShare} onLeave={onLeave} />

        <div className="hidden items-center justify-end gap-2 text-xs text-[#bdc1c6] sm:flex"><ShieldCheck className="size-4 text-[#81c995]" /><span className="hidden lg:inline">Secure support room</span></div>
      </footer>
    </main>
  );
}
