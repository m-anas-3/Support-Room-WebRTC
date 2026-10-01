"use client";

import { useActionState, useState, useSyncExternalStore } from "react";
import {
  AlertCircle,
  BellRing,
  CheckCircle2,
  Loader2,
  Save,
} from "lucide-react";

import {
  updateNotificationPreferences,
  type NotificationPreferencesState,
} from "@/app/(agent)/settings/actions";
import type { AgentIdentity } from "@/components/auth/agent-identity";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";

const initialState: NotificationPreferencesState = {
  status: "idle",
  message: null,
};
type PermissionState = NotificationPermission | "unsupported";

export function NotificationPreferencesForm({
  agent,
}: {
  agent: AgentIdentity;
}) {
  const [state, action, pending] = useActionState(
    updateNotificationPreferences,
    initialState,
  );
  const [customerWaiting, setCustomerWaiting] = useState(
    agent.notificationPreferences.customerWaiting,
  );
  const [connectionQuality, setConnectionQuality] = useState(
    agent.notificationPreferences.connectionQuality,
  );
  const clientReady = useSyncExternalStore(
    subscribeToClient,
    () => true,
    () => false,
  );
  const [requestedPermission, setRequestedPermission] =
    useState<NotificationPermission | null>(null);
  const permission: PermissionState =
    requestedPermission ??
    (clientReady && "Notification" in window
      ? Notification.permission
      : "unsupported");

  async function requestPermission() {
    if (!("Notification" in window)) return;
    setRequestedPermission(await Notification.requestPermission());
  }

  const permissionMessage =
    permission === "granted"
      ? "System notifications are allowed for this browser."
      : permission === "denied"
        ? "System notifications are blocked in your browser settings. In-app alerts will still appear."
        : permission === "default"
          ? "Allow system notifications to receive alerts while this tab is in the background."
          : "This browser does not support system notifications. In-app alerts will still appear.";

  return (
    <form action={action} className="space-y-6">
      <input
        type="hidden"
        name="customerWaiting"
        value={customerWaiting ? "on" : "off"}
      />
      <input
        type="hidden"
        name="connectionQuality"
        value={connectionQuality ? "on" : "off"}
      />

      <div className="space-y-5">
        <PreferenceRow
          label="Customer enters waiting room"
          description="Alert once when a customer is ready to be admitted."
          checked={customerWaiting}
          disabled={pending}
          onCheckedChange={setCustomerWaiting}
        />
        <PreferenceRow
          label="Connection quality drops"
          description="Alert when the active call remains in poor condition."
          checked={connectionQuality}
          disabled={pending}
          onCheckedChange={setConnectionQuality}
        />
        <Separator />
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-medium">Browser permission</p>
            <p className="mt-0.5 max-w-xl text-sm leading-5 text-muted-foreground">
              {permissionMessage}
            </p>
          </div>
          {permission === "default" && (
            <Button
              type="button"
              variant="outline"
              className="shrink-0"
              onClick={() => void requestPermission()}
            >
              <BellRing />
              Allow notifications
            </Button>
          )}
        </div>
      </div>

      {state.message && (
        <Alert
          variant={state.status === "error" ? "destructive" : "default"}
          className={
            state.status === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : undefined
          }
          aria-live="polite"
        >
          {state.status === "success" ? <CheckCircle2 /> : <AlertCircle />}
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      )}

      <div className="flex justify-end border-t pt-5">
        <Button className="h-11" type="submit" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : <Save />}
          {pending ? "Saving…" : "Save notifications"}
        </Button>
      </div>
    </form>
  );
}

function subscribeToClient() {
  return () => undefined;
}

function PreferenceRow({
  label,
  description,
  checked,
  disabled,
  onCheckedChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  disabled: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-6">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="mt-0.5 text-sm leading-5 text-muted-foreground">
          {description}
        </p>
      </div>
      <Switch
        checked={checked}
        disabled={disabled}
        onCheckedChange={onCheckedChange}
        aria-label={label}
      />
    </div>
  );
}
