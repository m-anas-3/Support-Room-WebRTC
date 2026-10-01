"use client";

import { useActionState, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, Save } from "lucide-react";

import {
  updateCallDefaults,
  type CallDefaultsState,
} from "@/app/(agent)/settings/actions";
import type { AgentIdentity } from "@/components/auth/agent-identity";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

const initialState: CallDefaultsState = { status: "idle", message: null };

export function CallDefaultsForm({ agent }: { agent: AgentIdentity }) {
  const [state, action, pending] = useActionState(
    updateCallDefaults,
    initialState,
  );
  const [cameraEnabled, setCameraEnabled] = useState(
    agent.callDefaults.cameraEnabled,
  );
  const [microphoneEnabled, setMicrophoneEnabled] = useState(
    agent.callDefaults.microphoneEnabled,
  );
  const videoQuality = agent.callDefaults.videoQuality;

  return (
    <form action={action} aria-busy={pending} className="space-y-6">
      <input
        type="hidden"
        name="cameraEnabled"
        value={cameraEnabled ? "on" : "off"}
      />
      <input
        type="hidden"
        name="microphoneEnabled"
        value={microphoneEnabled ? "on" : "off"}
      />
      <input type="hidden" name="videoQuality" value={videoQuality} />

      <div className="space-y-5">
        <PreferenceRow
          label="Start with camera on"
          description="Turn on your camera when you prepare your devices."
          checked={cameraEnabled}
          disabled={pending}
          onCheckedChange={setCameraEnabled}
        />
        <PreferenceRow
          label="Start with microphone on"
          description="Begin sending microphone audio as soon as the call connects."
          checked={microphoneEnabled}
          disabled={pending}
          onCheckedChange={setMicrophoneEnabled}
        />
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

      <div className="flex justify-end">
        <Button
          className="h-11"
          type="submit"
          disabled={pending}
          aria-live="polite"
        >
          {pending ? <Loader2 className="animate-spin" /> : <Save />}
          {pending ? "Saving…" : "Save call defaults"}
        </Button>
      </div>
    </form>
  );
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
