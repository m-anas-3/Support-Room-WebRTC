export type NotificationPreferences = {
  customerWaiting: boolean;
  connectionQuality: boolean;
};

export const defaultNotificationPreferences: NotificationPreferences = {
  customerWaiting: true,
  connectionQuality: true,
};

export function parseNotificationPreferences(value: unknown): NotificationPreferences {
  if (!value || typeof value !== "object") return defaultNotificationPreferences;
  const data = value as Record<string, unknown>;
  return {
    customerWaiting: typeof data.customer_waiting === "boolean"
      ? data.customer_waiting
      : defaultNotificationPreferences.customerWaiting,
    connectionQuality: typeof data.connection_quality === "boolean"
      ? data.connection_quality
      : defaultNotificationPreferences.connectionQuality,
  };
}
