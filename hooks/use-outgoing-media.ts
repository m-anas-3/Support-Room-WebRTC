"use client";

import { useEffect, useRef, useState } from "react";
import type { ClientMessage } from "@support-room/shared";

export function useOutgoingMedia({
  connected,
  audioTrack,
  videoTrack,
  videoOverrideActive,
  cameraEnabled,
  microphoneEnabled,
  replaceAudioTrack,
  replaceVideoTrack,
  send,
}: {
  connected: boolean;
  audioTrack: MediaStreamTrack | null;
  videoTrack: MediaStreamTrack | null;
  videoOverrideActive: boolean;
  cameraEnabled: boolean;
  microphoneEnabled: boolean;
  replaceAudioTrack: (track: MediaStreamTrack | null) => Promise<void>;
  replaceVideoTrack: (track: MediaStreamTrack | null) => Promise<void>;
  send: (message: ClientMessage) => boolean;
}) {
  const audioSyncIdRef = useRef(0);
  const videoSyncIdRef = useRef(0);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [signalingError, setSignalingError] = useState<string | null>(null);

  useEffect(() => {
    if (!connected) return;
    const syncId = ++audioSyncIdRef.current;
    void replaceAudioTrack(audioTrack)
      .then(() => { if (audioSyncIdRef.current === syncId) setAudioError(null); })
      .catch(() => { if (audioSyncIdRef.current === syncId) setAudioError("Your microphone could not be sent. Select the microphone again or rejoin the call."); });
    return () => { if (audioSyncIdRef.current === syncId) audioSyncIdRef.current += 1; };
  }, [audioTrack, connected, replaceAudioTrack]);

  useEffect(() => {
    if (!connected || videoOverrideActive) return;
    const syncId = ++videoSyncIdRef.current;
    void replaceVideoTrack(videoTrack)
      .then(() => { if (videoSyncIdRef.current === syncId) setVideoError(null); })
      .catch(() => { if (videoSyncIdRef.current === syncId) setVideoError("Your camera could not be sent. Turn it off and on again, or rejoin the call."); });
    return () => { if (videoSyncIdRef.current === syncId) videoSyncIdRef.current += 1; };
  }, [connected, replaceVideoTrack, videoOverrideActive, videoTrack]);

  useEffect(() => {
    if (!connected) return;
    // These flags describe the user's controls. Sending them must not wait for
    // an unrelated device replacement (or overwrite an in-flight screen share).
    const sent = send({ type: "media-state", camera: videoOverrideActive || cameraEnabled, microphone: microphoneEnabled });
    let active = true;
    queueMicrotask(() => {
      if (active) setSignalingError(sent ? null : "Your media status could not be shared. Check the signaling connection.");
    });
    return () => { active = false; };
  }, [cameraEnabled, connected, microphoneEnabled, send, videoOverrideActive]);

  return { error: videoError || audioError || signalingError };
}
