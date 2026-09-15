"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Mic, MicOff, UserRound, VideoOff } from "lucide-react";
import { Button } from "@/components/ui/button";

export function VideoTile({ stream, name, label, local = false, cameraEnabled = true, microphoneEnabled, action, testId, fit = "cover" }: {
  stream: MediaStream | null;
  name: string;
  label: string;
  local?: boolean;
  cameraEnabled?: boolean;
  microphoneEnabled?: boolean;
  action?: ReactNode;
  testId?: string;
  fit?: "cover" | "contain";
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playbackBlocked, setPlaybackBlocked] = useState(false);
  const hasVideo = Boolean(stream?.getVideoTracks().some((track) => track.readyState === "live")) && cameraEnabled;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.srcObject = stream;
    if (stream) void video.play().then(() => setPlaybackBlocked(false)).catch(() => setPlaybackBlocked(true));
    return () => { video.srcObject = null; };
  }, [stream]);

  return (
    <div className="relative min-h-[280px] overflow-hidden rounded-xl border border-white/10 bg-[#202b3d] shadow-xl" data-testid={testId}>
      <video ref={videoRef} autoPlay muted={local} playsInline className={`absolute inset-0 h-full w-full ${fit === "contain" ? "object-contain" : "object-cover"} ${local ? "[transform:scaleX(-1)]" : ""} ${hasVideo ? "" : "invisible"}`} />
      {!hasVideo && <div className="absolute inset-0 grid place-items-center bg-[radial-gradient(circle_at_center,#34435b_0%,#202b3d_68%)] p-6 text-center"><div><span className="mx-auto grid size-20 place-items-center rounded-full bg-white/10"><UserRound className="size-9 text-slate-300" /></span><p className="mt-4 text-sm text-slate-300">{stream ? "Camera is off" : "Media not connected"}</p>{action && <div className="mt-4">{action}</div>}</div></div>}
      {playbackBlocked && !local && <Button size="sm" className="absolute top-4 left-1/2 -translate-x-1/2 bg-white text-slate-950 hover:bg-slate-200" onClick={() => void videoRef.current?.play().then(() => setPlaybackBlocked(false)).catch(() => setPlaybackBlocked(true))}>Play audio and video</Button>}
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between bg-gradient-to-t from-black/70 to-transparent p-4 pt-12">
        <div><p className="text-sm font-medium text-white">{name}</p><p className="text-xs text-slate-300">{label}</p></div>
        {microphoneEnabled !== undefined && <span className="grid size-7 place-items-center rounded-full bg-black/45">{microphoneEnabled ? <Mic className="size-3.5" /> : <MicOff className="size-3.5 text-red-300" />}</span>}
        {!cameraEnabled && <span className="absolute top-3 right-3 grid size-8 place-items-center rounded-full bg-black/50"><VideoOff className="size-4 text-slate-200" /></span>}
      </div>
    </div>
  );
}
