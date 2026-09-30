"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";

import type { NotificationPreferences } from "@/lib/notifications/preferences";
import type { ConnectionHealthLevel } from "@/lib/webrtc/connection-health";

export function useAgentNotifications({
  customerWaiting,
  customerName,
  connectionHealth,
  preferences,
}: {
  customerWaiting: boolean;
  customerName?: string | null;
  connectionHealth: ConnectionHealthLevel;
  preferences: NotificationPreferences;
}) {
  const wasWaiting = useRef(false);
  const poorSamples = useRef(0);
  const poorAlerted = useRef(false);

  useEffect(() => {
    if (customerWaiting && !wasWaiting.current && preferences.customerWaiting) {
      const name = customerName?.trim() || "A customer";
      toast.info(`${name} is waiting to join`, { id: "customer-waiting" });
      showSystemNotification("Customer waiting", `${name} is ready to be admitted.`);
    }
    wasWaiting.current = customerWaiting;
  }, [customerName, customerWaiting, preferences.customerWaiting]);

  useEffect(() => {
    if (connectionHealth === "poor") {
      poorSamples.current += 1;
      if (poorSamples.current >= 2 && !poorAlerted.current && preferences.connectionQuality) {
        poorAlerted.current = true;
        toast.warning("Connection quality is poor", {
          id: "connection-quality-poor",
          description: "Open connection diagnostics for the current packet loss, latency, and recovery guidance.",
        });
        showSystemNotification("Connection quality is poor", "Return to SupportRoom to review connection diagnostics.");
      }
      return;
    }

    poorSamples.current = 0;
    if (["excellent", "good", "fair"].includes(connectionHealth)) poorAlerted.current = false;
  }, [connectionHealth, preferences.connectionQuality]);
}

function showSystemNotification(title: string, body: string) {
  if (typeof document === "undefined" || !document.hidden || !("Notification" in window) || Notification.permission !== "granted") return;
  try {
    const notification = new Notification(title, { body, tag: `support-room-${title.toLowerCase().replaceAll(" ", "-")}` });
    notification.onclick = () => { window.focus(); notification.close(); };
  } catch {
    // In-app alerts remain available when a browser cannot construct system notifications.
  }
}
