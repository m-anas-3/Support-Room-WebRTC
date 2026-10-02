"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

/** Keep the placeholder up until this camera source has presented a fresh frame. */
export function useVideoFrames(stream: MediaStream | null, enabled: boolean) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const subscribe = useCallback(
    (notify: () => void) => {
      stream?.addEventListener("addtrack", notify);
      stream?.addEventListener("removetrack", notify);
      return () => {
        stream?.removeEventListener("addtrack", notify);
        stream?.removeEventListener("removetrack", notify);
      };
    },
    [stream],
  );
  const getTrack = useCallback(
    () =>
      stream?.getVideoTracks().find((track) => track.readyState === "live") ??
      null,
    [stream],
  );
  const track = useSyncExternalStore(subscribe, getTrack, () => null);
  // A new identity also invalidates old frames when a remote track stays the
  // same across camera off/on. Readiness never carries across that transition.
  const source = useMemo(
    () => ({ stream, track, enabled }),
    [stream, track, enabled],
  );
  const [readySource, setReadySource] = useState<typeof source | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    // Device changes must not reset audio playback, or leave the previous
    // camera's buffered image in the new source. This stream contains video only.
    video.srcObject = track ? new MediaStream([track]) : null;
    if (track) void video.play().catch(() => undefined);
    return () => {
      video.srcObject = null;
    };
  }, [stream, track]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !track || !enabled) return;
    let active = true;
    let frameId: number | null = null;
    let previousTime = video.currentTime;
    const canShow = () =>
      active &&
      track.readyState === "live" &&
      !track.muted &&
      video.readyState >= 2 &&
      video.videoWidth > 0;
    const cancelFrame = () => {
      if (frameId !== null) video.cancelVideoFrameCallback(frameId);
      frameId = null;
    };
    const awaitFrame = () => {
      cancelFrame();
      previousTime = video.currentTime;
      if (track.muted || track.readyState !== "live") return;
      if (typeof video.requestVideoFrameCallback === "function") {
        frameId = video.requestVideoFrameCallback(() => {
          frameId = null;
          if (canShow()) setReadySource(source);
        });
      }
    };
    const reset = () => {
      cancelFrame();
      setReadySource(null);
      awaitFrame();
    };
    const onData = () => {
      if (typeof video.requestVideoFrameCallback !== "function" && canShow())
        setReadySource(source);
    };
    const onTime = () => {
      if (video.currentTime !== previousTime) onData();
    };
    track.addEventListener("mute", reset);
    track.addEventListener("unmute", reset);
    track.addEventListener("ended", reset);
    video.addEventListener("loadeddata", onData);
    video.addEventListener("timeupdate", onTime);
    awaitFrame();
    void video.play().catch(() => undefined);
    return () => {
      active = false;
      cancelFrame();
      track.removeEventListener("mute", reset);
      track.removeEventListener("unmute", reset);
      track.removeEventListener("ended", reset);
      video.removeEventListener("loadeddata", onData);
      video.removeEventListener("timeupdate", onTime);
    };
  }, [enabled, source, track]);

  return {
    videoRef,
    hasFrame:
      enabled &&
      readySource === source &&
      Boolean(track && !track.muted && track.readyState === "live"),
  };
}
