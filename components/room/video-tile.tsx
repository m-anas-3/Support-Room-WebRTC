"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Mic, MicOff, UserRound, VideoOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useVideoFrames } from "@/hooks/use-video-frames";

export function VideoTile({
  stream,
  name,
  label,
  local = false,
  cameraEnabled = true,
  microphoneEnabled,
  speakerId,
  onSpeakerError,
  action,
  testId,
  fit = "cover",
  compact = false,
  className,
}: {
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
  const { videoRef, hasFrame: hasVideo } = useVideoFrames(
    stream,
    cameraEnabled,
  );
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playbackBlocked, setPlaybackBlocked] = useState(false);

  const playMedia = useCallback(async () => {
    // A negotiated video track may never have produced a frame. Keep remote
    // audio in an audio-only element so it can play independently of video.
    const videoPlayback = videoRef.current?.play();
    if (local) await videoPlayback;
    else {
      void videoPlayback?.catch(() => undefined);
      const audio = audioRef.current;
      if ((audio?.srcObject as MediaStream | null)?.getAudioTracks().length)
        await audio?.play();
    }
  }, [local, videoRef]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let active = true;
    const audio = audioRef.current;
    const audioStream = new MediaStream();
    if (audio && !local) audio.srcObject = audioStream;
    const updateFlow = () => {
      if (!local) {
        const tracks =
          stream
            ?.getAudioTracks()
            .filter((track) => track.readyState === "live") ?? [];
        for (const track of audioStream.getTracks())
          if (!tracks.includes(track)) audioStream.removeTrack(track);
        for (const track of tracks)
          if (!audioStream.getTrackById(track.id)) audioStream.addTrack(track);
      }
      if (stream)
        void playMedia()
          .then(() => {
            if (active) setPlaybackBlocked(false);
          })
          .catch(() => {
            if (active) setPlaybackBlocked(true);
          });
    };
    stream?.addEventListener("addtrack", updateFlow);
    stream?.addEventListener("removetrack", updateFlow);
    const initialFlowFrame = requestAnimationFrame(updateFlow);
    return () => {
      active = false;
      cancelAnimationFrame(initialFlowFrame);
      stream?.removeEventListener("addtrack", updateFlow);
      stream?.removeEventListener("removetrack", updateFlow);
      if (audio) audio.srcObject = null;
    };
  }, [local, playMedia, stream, videoRef]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !stream) return;
    let active = true;
    // A camera restart or a remote unmute may resume an existing stream without
    // changing its identity or firing another track event.
    void playMedia()
      .then(() => {
        if (active) setPlaybackBlocked(false);
      })
      .catch(() => {
        if (active) setPlaybackBlocked(true);
      });
    return () => {
      active = false;
    };
  }, [cameraEnabled, microphoneEnabled, playMedia, stream, videoRef]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || local || speakerId === undefined) return;
    if (typeof audio.setSinkId !== "function") {
      if (speakerId)
        onSpeakerError?.(
          "Use your device’s sound controls to choose an output in this browser.",
        );
      return;
    }
    let active = true;
    void audio
      .setSinkId(speakerId)
      .then(() => {
        if (active) onSpeakerError?.(null);
      })
      .catch((sinkError: unknown) => {
        if (!active) return;
        if (
          sinkError instanceof DOMException &&
          sinkError.name === "NotAllowedError"
        ) {
          onSpeakerError?.(
            "This speaker needs browser permission. Choose it again from Call settings.",
          );
        } else if (
          sinkError instanceof DOMException &&
          sinkError.name === "NotFoundError"
        ) {
          onSpeakerError?.(
            "That speaker is no longer connected. Your current output remains active.",
          );
        } else {
          onSpeakerError?.(
            "The speaker could not be changed. Your current output remains active.",
          );
        }
      });
    return () => {
      active = false;
    };
  }, [local, onSpeakerError, speakerId]);

  return (
    <div
      className={cn(
        "relative min-h-0 overflow-hidden rounded-2xl border border-border bg-card",
        className,
      )}
      data-testid={testId}
    >
      {/* Keep video mounted while tracks change; remote audio plays separately. */}
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        aria-hidden={!hasVideo}
        className={`absolute inset-0 h-full w-full ${fit === "contain" ? "object-contain" : "object-cover"} ${local ? "[transform:scaleX(-1)]" : ""}`}
      />
      {!local && <audio ref={audioRef} autoPlay aria-hidden="true" />}
      {!hasVideo && (
        <div
          className={cn(
            "absolute inset-0 grid place-items-center bg-card text-center",
            compact ? "p-3" : "p-6",
          )}
        >
          <div>
            <span
              className={cn(
                "mx-auto grid place-items-center rounded-full bg-secondary",
                compact ? "size-11" : "size-16",
              )}
            >
              <UserRound
                className={cn(
                  "text-muted-foreground",
                  compact ? "size-5" : "size-7",
                )}
              />
            </span>
            <p
              className={cn(
                "text-muted-foreground",
                compact ? "mt-2 text-[11px]" : "mt-4 text-sm",
              )}
            >
              {!stream
                ? "Media not connected"
                : cameraEnabled
                  ? "Camera is reconnecting…"
                  : "Camera is off"}
            </p>
            {action && (
              <div className={compact ? "mt-2" : "mt-4"}>{action}</div>
            )}
          </div>
        </div>
      )}
      {playbackBlocked && !local && (
        <Button
          size="sm"
          className="absolute top-4 left-1/2 -translate-x-1/2 bg-white text-slate-950 hover:bg-slate-200"
          onClick={() =>
            void playMedia()
              .then(() => setPlaybackBlocked(false))
              .catch(() => setPlaybackBlocked(true))
          }
        >
          Play audio and video
        </Button>
      )}
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between bg-gradient-to-t from-black/70 to-transparent",
          compact ? "p-2.5 pt-8" : "p-4 pt-12",
        )}
      >
        <div className="min-w-0">
          <p
            className={cn(
              "truncate font-medium text-white",
              compact ? "text-xs" : "text-sm",
            )}
          >
            {name}
          </p>
          <p
            className={cn(
              "truncate text-muted-foreground",
              compact ? "text-[10px]" : "text-xs",
            )}
          >
            {label}
          </p>
        </div>
        {microphoneEnabled !== undefined && (
          <span
            className={cn(
              "grid shrink-0 place-items-center rounded-full bg-black/45",
              compact ? "size-6" : "size-7",
            )}
          >
            {microphoneEnabled ? (
              <Mic className="size-3.5" />
            ) : (
              <MicOff className="size-3.5 text-red-300" />
            )}
          </span>
        )}
        {!cameraEnabled && (
          <span
            className={cn(
              "absolute right-3 top-3 grid place-items-center rounded-full bg-black/50",
              compact ? "size-7" : "size-8",
            )}
          >
            <VideoOff className="size-4 text-slate-200" />
          </span>
        )}
      </div>
    </div>
  );
}
