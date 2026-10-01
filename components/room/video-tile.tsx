"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Mic, MicOff, UserRound, VideoOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function VideoTile({ stream, name, label, local = false, cameraEnabled = true, microphoneEnabled, speakerId, onSpeakerError, action, testId, fit = "cover", compact = false, className }: {
  stream: MediaStream | null;
  name: string;
  label: string;
  local?: boolean;
  cameraEnabled?: boolean;
  microphoneEnabled?: boolean;
  speakerId?: string;
  onSpeakerError?: (message: string | null) => void;
  action?: ReactNode;
  testId?: string;
  fit?: "cover" | "contain";
  compact?: boolean;
  className?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playbackBlocked, setPlaybackBlocked] = useState(false);
  const [remoteVideoFlowing, setRemoteVideoFlowing] = useState(true);
  const liveVideoTrack = stream?.getVideoTracks().find((track) => track.readyState === "live");
  const hasVideo = Boolean(liveVideoTrack) && cameraEnabled && (local || remoteVideoFlowing);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let observedTrack: MediaStreamTrack | null = null;
    const updateFlow = () => {
      const nextTrack = stream?.getVideoTracks().find((track) => track.readyState === "live") ?? null;
      if (nextTrack !== observedTrack) {
        observedTrack?.removeEventListener("mute", updateFlow);
        observedTrack?.removeEventListener("unmute", updateFlow);
        observedTrack?.removeEventListener("ended", updateFlow);
        observedTrack = nextTrack;
        observedTrack?.addEventListener("mute", updateFlow);
        observedTrack?.addEventListener("unmute", updateFlow);
        observedTrack?.addEventListener("ended", updateFlow);
      }
      const flowing = Boolean(nextTrack && !nextTrack.muted && nextTrack.readyState === "live");
      setRemoteVideoFlowing(flowing);
      if (flowing && stream) void video.play().then(() => setPlaybackBlocked(false)).catch(() => setPlaybackBlocked(true));
    };
    video.srcObject = stream;
    if (stream) void video.play().then(() => setPlaybackBlocked(false)).catch(() => setPlaybackBlocked(true));
    stream?.addEventListener("addtrack", updateFlow);
    stream?.addEventListener("removetrack", updateFlow);
    const initialFlowFrame = requestAnimationFrame(updateFlow);
    return () => {
      cancelAnimationFrame(initialFlowFrame);
      stream?.removeEventListener("addtrack", updateFlow);
      stream?.removeEventListener("removetrack", updateFlow);
      observedTrack?.removeEventListener("mute", updateFlow);
      observedTrack?.removeEventListener("unmute", updateFlow);
      observedTrack?.removeEventListener("ended", updateFlow);
      video.srcObject = null;
    };
  }, [stream]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !stream) return;
    let active = true;
    // A camera restart or a remote unmute may resume an existing stream without
    // changing its identity or firing another track event.
    void video.play()
      .then(() => { if (active) setPlaybackBlocked(false); })
      .catch(() => { if (active) setPlaybackBlocked(true); });
    return () => { active = false; };
  }, [cameraEnabled, microphoneEnabled, stream]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || local || speakerId === undefined) return;
    if (typeof video.setSinkId !== "function") {
      if (speakerId) onSpeakerError?.("Use your device’s sound controls to choose an output in this browser.");
      return;
    }
    let active = true;
    void video.setSinkId(speakerId)
      .then(() => { if (active) onSpeakerError?.(null); })
      .catch((sinkError: unknown) => {
        if (!active) return;
        if (sinkError instanceof DOMException && sinkError.name === "NotAllowedError") {
          onSpeakerError?.("This speaker needs browser permission. Choose it again from Call settings.");
        } else if (sinkError instanceof DOMException && sinkError.name === "NotFoundError") {
          onSpeakerError?.("That speaker is no longer connected. Your current output remains active.");
        } else {
          onSpeakerError?.("The speaker could not be changed. Your current output remains active.");
        }
      });
    return () => { active = false; };
  }, [local, onSpeakerError, speakerId]);

  return (
    <div className={cn("relative min-h-[280px] overflow-hidden rounded-xl border border-white/10 bg-[#202b3d] shadow-xl", className)} data-testid={testId}>
      {/* Keep the media element playing under the opaque camera-off placeholder.
          Hiding it can suspend playback, including its audio, in browsers. */}
      <video ref={videoRef} autoPlay muted={local} playsInline aria-hidden={!hasVideo} className={`absolute inset-0 h-full w-full ${fit === "contain" ? "object-contain" : "object-cover"} ${local ? "[transform:scaleX(-1)]" : ""}`} />
      {!hasVideo && <div className={cn("absolute inset-0 grid place-items-center bg-[radial-gradient(circle_at_center,#34435b_0%,#202b3d_68%)] text-center", compact ? "p-3" : "p-6")}><div><span className={cn("mx-auto grid place-items-center rounded-full bg-white/10", compact ? "size-11" : "size-20")}><UserRound className={cn("text-slate-300", compact ? "size-5" : "size-9")} /></span><p className={cn("text-slate-300", compact ? "mt-2 text-[11px]" : "mt-4 text-sm")}>{!stream ? "Media not connected" : cameraEnabled ? "Camera is reconnecting…" : "Camera is off"}</p>{action && <div className={compact ? "mt-2" : "mt-4"}>{action}</div>}</div></div>}
      {playbackBlocked && !local && <Button size="sm" className="absolute top-4 left-1/2 -translate-x-1/2 bg-white text-slate-950 hover:bg-slate-200" onClick={() => void videoRef.current?.play().then(() => setPlaybackBlocked(false)).catch(() => setPlaybackBlocked(true))}>Play audio and video</Button>}
      <div className={cn("pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between bg-gradient-to-t from-black/70 to-transparent", compact ? "p-2.5 pt-8" : "p-4 pt-12")}>
        <div className="min-w-0"><p className={cn("truncate font-medium text-white", compact ? "text-xs" : "text-sm")}>{name}</p><p className={cn("truncate text-slate-300", compact ? "text-[10px]" : "text-xs")}>{label}</p></div>
        {microphoneEnabled !== undefined && <span className={cn("grid shrink-0 place-items-center rounded-full bg-black/45", compact ? "size-6" : "size-7")}>{microphoneEnabled ? <Mic className="size-3.5" /> : <MicOff className="size-3.5 text-red-300" />}</span>}
        {!cameraEnabled && <span className={cn("absolute right-3 top-3 grid place-items-center rounded-full bg-black/50", compact ? "size-7" : "size-8")}><VideoOff className="size-4 text-slate-200" /></span>}
      </div>
    </div>
  );
}
