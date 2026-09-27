"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import type { ClientMessage, IceConfiguration, SignalMessage } from "@support-room/shared";
import { resolveRtcConfiguration } from "@/lib/webrtc/config";
import { PeerConnectionStore } from "@/lib/webrtc/peer-connection";

export function usePeerConnection({ role, localStream, enabled, iceConfiguration, send, subscribeToSignals }: {
  role: "host" | "customer";
  localStream: MediaStream | null;
  enabled: boolean;
  iceConfiguration: IceConfiguration | null;
  send: (message: ClientMessage) => boolean;
  subscribeToSignals: (listener: (message: SignalMessage) => void) => () => void;
}) {
  const [store] = useState(() => new PeerConnectionStore());
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);

  useEffect(() => {
    if (!enabled || !localStream) return;
    return store.connect({ role, localStream, configuration: () => resolveRtcConfiguration(iceConfiguration), send, subscribeToSignals });
  }, [enabled, iceConfiguration, localStream, role, send, store, subscribeToSignals]);

  return { ...snapshot, close: store.close, replaceOutgoingVideoTrack: store.replaceOutgoingVideoTrack, replaceOutgoingAudioTrack: store.replaceOutgoingAudioTrack };
}
