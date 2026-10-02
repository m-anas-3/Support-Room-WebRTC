"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import {
  hostRoomsChangedEvent,
  savedHostRooms,
  type SavedHostRoom,
} from "@/lib/signaling/client";

const getServerSnapshot = () => "[]";

export function useCreatedRooms(agentId: string) {
  const getSnapshot = useCallback(
    () => JSON.stringify(savedHostRooms(agentId)),
    [agentId],
  );
  const subscribe = useCallback(
    (notify: () => void) => {
      let expiryTimer: ReturnType<typeof setTimeout> | undefined;
      function scheduleExpiry() {
        clearTimeout(expiryTimer);
        const rooms = savedHostRooms(agentId);
        if (rooms.length) {
          const nextExpiry = Math.min(...rooms.map((room) => room.expiresAt));
          expiryTimer = setTimeout(
            refresh,
            Math.max(1, nextExpiry - Date.now() + 1),
          );
        }
      }
      function refresh() {
        notify();
        scheduleExpiry();
      }
      window.addEventListener(hostRoomsChangedEvent, refresh);
      window.addEventListener("storage", refresh);
      // Expiry is timed rather than polled, including while the page stays open.
      scheduleExpiry();
      return () => {
        clearTimeout(expiryTimer);
        window.removeEventListener(hostRoomsChangedEvent, refresh);
        window.removeEventListener("storage", refresh);
      };
    },
    [agentId],
  );
  const snapshot = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );
  return useMemo(() => JSON.parse(snapshot) as SavedHostRoom[], [snapshot]);
}
