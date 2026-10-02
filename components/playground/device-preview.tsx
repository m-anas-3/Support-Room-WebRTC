"use client";

import { useEffect, useRef } from "react";
import { Camera, Loader2, VideoOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { useLocalMedia } from "@/hooks/use-local-media";

export function DevicePreview({
  media,
  name = "Only visible to you",
  startLabel = "Start preview",
  showStartButton = true,
  className,
}: {
  media: ReturnType<typeof useLocalMedia>;
  name?: string;
  startLabel?: string;
  showStartButton?: boolean;
  className?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const ready = media.status === "ready";
  const requesting =
    media.cameraStatus === "requesting" || media.cameraStatus === "recovering";
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.srcObject = media.stream;
    if (media.stream) void video.play().catch(() => undefined);
    return () => {
      video.srcObject = null;
    };
  }, [media.stream, media.videoTrack]);
  return (
    <div
      className={cn(
        "relative aspect-[4/3] overflow-hidden rounded-2xl bg-[#20232a] sm:aspect-video",
        className,
      )}
    >
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        aria-hidden={!ready || !media.isCameraEnabled}
        className="absolute inset-0 h-full w-full object-cover [transform:scaleX(-1)]"
      />
      {(!ready || !media.isCameraEnabled || requesting) && (
        <div className="absolute inset-0 grid place-items-center bg-[#20232a] p-5 text-center text-white">
          <div>
            <span className="mx-auto grid size-14 place-items-center rounded-2xl border border-white/15 bg-white/5">
              {requesting ? (
                <Loader2 className="size-6 animate-spin" />
              ) : (
                <VideoOff className="size-6 text-white/60" />
              )}
            </span>
            <p className="mt-4 text-sm">
              {requesting
                ? "Allow access in your browser"
                : ready || !showStartButton
                  ? "Camera is off"
                  : "Let’s check your devices"}
            </p>
            {showStartButton && !ready && !requesting && (
              <Button
                className="mt-5 h-10 bg-white px-4 text-slate-950 hover:bg-slate-200"
                onClick={() => void media.startMedia()}
              >
                <Camera />
                {startLabel}
              </Button>
            )}
          </div>
        </div>
      )}
      {ready && (
        <span className="absolute bottom-4 left-4 rounded-lg bg-black/40 px-3 py-1.5 text-xs text-white/80">
          {name}
        </span>
      )}
    </div>
  );
}
