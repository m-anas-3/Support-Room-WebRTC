"use client";

import { useEffect } from "react";
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
  useEffect(() => {
    if (!connected) return;
    void replaceAudioTrack(audioTrack).catch(() => undefined);
  }, [audioTrack, connected, replaceAudioTrack]);

  useEffect(() => {
    if (!connected || videoOverrideActive) return;
    void replaceVideoTrack(videoTrack).catch(() => undefined);
  }, [connected, replaceVideoTrack, videoOverrideActive, videoTrack]);

  useEffect(() => {
    if (!connected) return;
    send({
      type: "media-state",
      camera: videoOverrideActive || cameraEnabled,
      microphone: microphoneEnabled,
    });
  }, [cameraEnabled, connected, microphoneEnabled, send, videoOverrideActive]);
}
