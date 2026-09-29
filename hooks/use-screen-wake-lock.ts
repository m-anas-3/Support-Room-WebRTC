"use client";

import { useEffect, useRef } from "react";

export function useScreenWakeLock(enabled: boolean) {
  const sentinelRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    if (!enabled || !("wakeLock" in navigator)) return;
    let active = true;

    const acquire = async () => {
      if (!active || document.visibilityState !== "visible" || sentinelRef.current) return;
      try {
        const sentinel = await navigator.wakeLock.request("screen");
        if (!active) {
          await sentinel.release();
          return;
        }
        sentinelRef.current = sentinel;
        sentinel.addEventListener("release", () => {
          if (sentinelRef.current === sentinel) sentinelRef.current = null;
        }, { once: true });
      } catch {
        // Wake locks are advisory and may be denied by the browser or operating system.
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") void acquire();
    };

    void acquire();
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      active = false;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      const sentinel = sentinelRef.current;
      sentinelRef.current = null;
      if (sentinel && !sentinel.released) void sentinel.release();
    };
  }, [enabled]);
}
