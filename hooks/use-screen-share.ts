"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

type StopOptions = { restoreCamera: boolean };

const subscribeToBrowserSupport = () => () => {};
const getScreenShareSupport = () => Boolean(navigator.mediaDevices?.getDisplayMedia);
const getServerScreenShareSupport = () => true;

function getScreenShareError(error: unknown) {
  if (!(error instanceof DOMException)) return "Screen sharing could not be started.";
  switch (error.name) {
    case "NotAllowedError":
      return "Screen sharing was canceled or blocked by the browser.";
    case "NotFoundError":
      return "No screen, window, or browser tab is available to share.";
    case "NotReadableError":
      return "The selected screen cannot be captured. Check your system screen-recording permission.";
    case "InvalidStateError":
      return "Start screen sharing directly from the call while this tab is active.";
    default:
      return error.message || "Screen sharing could not be started.";
  }
}

export function useScreenShare({
  cameraStream,
  enabled,
  replaceOutgoingVideoTrack,
  announce,
}: {
  cameraStream: MediaStream | null;
  enabled: boolean;
  replaceOutgoingVideoTrack: (track: MediaStreamTrack | null) => Promise<void>;
  announce: (active: boolean) => void;
}) {
  const displayStreamRef = useRef<MediaStream | null>(null);
  const cameraStreamRef = useRef(cameraStream);
  const replaceTrackRef = useRef(replaceOutgoingVideoTrack);
  const announceRef = useRef(announce);
  const requestIdRef = useRef(0);
  const mountedRef = useRef(true);
  const endedListenerRef = useRef<(() => void) | null>(null);
  const [displayStream, setDisplayStream] = useState<MediaStream | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [isChanging, setIsChanging] = useState(false);
  const supported = useSyncExternalStore(subscribeToBrowserSupport, getScreenShareSupport, getServerScreenShareSupport);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    cameraStreamRef.current = cameraStream;
    replaceTrackRef.current = replaceOutgoingVideoTrack;
    announceRef.current = announce;
  }, [announce, cameraStream, replaceOutgoingVideoTrack]);

  const finish = useCallback(async ({ restoreCamera }: StopOptions) => {
    const current = displayStreamRef.current;
    if (!current) return;
    displayStreamRef.current = null;
    requestIdRef.current += 1;
    const displayTrack = current.getVideoTracks()[0];
    if (displayTrack && endedListenerRef.current) {
      displayTrack.removeEventListener("ended", endedListenerRef.current);
    }
    endedListenerRef.current = null;
    if (mountedRef.current) setIsChanging(true);

    try {
      const cameraTrack = cameraStreamRef.current?.getVideoTracks()[0];
      if (restoreCamera) {
        await replaceTrackRef.current(cameraTrack?.readyState === "live" ? cameraTrack : null);
      }
    } catch {
      if (mountedRef.current) setError("Your camera could not be restored. Leave and rejoin the call.");
    } finally {
      current.getTracks().forEach((track) => track.stop());
      announceRef.current(false);
      if (mountedRef.current) {
        setDisplayStream(null);
        setIsSharing(false);
        setIsChanging(false);
      }
    }
  }, []);

  const startScreenShare = useCallback(async () => {
    if (!enabled || displayStreamRef.current || isChanging) return;
    if (!navigator.mediaDevices?.getDisplayMedia) {
      setError("This browser does not support screen sharing.");
      return;
    }
    const requestId = ++requestIdRef.current;
    setIsChanging(true);
    setError(null);
    let nextStream: MediaStream | null = null;
    try {
      // Browsers require this permission prompt to follow a direct user action.
      nextStream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: { ideal: 15, max: 30 } },
        audio: false,
      });
      const displayTrack = nextStream.getVideoTracks()[0];
      if (!displayTrack) throw new Error("The selected source did not provide a video track.");
      if (!mountedRef.current || requestId !== requestIdRef.current || !enabled) {
        nextStream.getTracks().forEach((track) => track.stop());
        return;
      }

      await replaceTrackRef.current(displayTrack);
      if (!mountedRef.current || requestId !== requestIdRef.current) {
        nextStream.getTracks().forEach((track) => track.stop());
        return;
      }
      const ended = () => { void finish({ restoreCamera: true }); };
      endedListenerRef.current = ended;
      displayTrack.addEventListener("ended", ended, { once: true });
      displayStreamRef.current = nextStream;
      setDisplayStream(nextStream);
      setIsSharing(true);
      announceRef.current(true);
    } catch (screenError) {
      nextStream?.getTracks().forEach((track) => track.stop());
      if (mountedRef.current && requestId === requestIdRef.current) setError(getScreenShareError(screenError));
    } finally {
      if (mountedRef.current && requestId === requestIdRef.current) setIsChanging(false);
    }
  }, [enabled, finish, isChanging]);

  const stopScreenShare = useCallback(() => finish({ restoreCamera: true }), [finish]);
  const releaseScreenShare = useCallback(() => { void finish({ restoreCamera: false }); }, [finish]);

  useEffect(() => {
    if (!enabled) {
      // Also invalidates a still-open browser picker before it resolves.
      requestIdRef.current += 1;
      if (displayStreamRef.current) releaseScreenShare();
    }
  }, [enabled, releaseScreenShare]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      requestIdRef.current += 1;
      const current = displayStreamRef.current;
      displayStreamRef.current = null;
      current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  return {
    displayStream,
    isSharing,
    isChanging,
    supported,
    error,
    startScreenShare,
    stopScreenShare,
    releaseScreenShare,
  };
}
