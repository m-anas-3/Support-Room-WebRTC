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
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { isVideoQuality } from "@/lib/media/call-defaults";

const initialState: CallDefaultsState = { status: "idle", message: null };

export function CallDefaultsForm({ agent }: { agent: AgentIdentity }) {
  const [state, action, pending] = useActionState(updateCallDefaults, initialState);
  const [cameraEnabled, setCameraEnabled] = useState(agent.callDefaults.cameraEnabled);
  const [microphoneEnabled, setMicrophoneEnabled] = useState(agent.callDefaults.microphoneEnabled);
  const [videoQuality, setVideoQuality] = useState(agent.callDefaults.videoQuality);

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="cameraEnabled" value={cameraEnabled ? "on" : "off"} />
      <input type="hidden" name="microphoneEnabled" value={microphoneEnabled ? "on" : "off"} />
      <input type="hidden" name="videoQuality" value={videoQuality} />

      <div className="space-y-5">
        <PreferenceRow
          label="Start with camera on"
          description="Request your selected camera when you prepare a support room."
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
        <Separator />
        <Field>
          <FieldLabel>Preferred video quality</FieldLabel>
          <Select
            value={videoQuality}
            disabled={pending}
            onValueChange={(value) => {
              if (value && isVideoQuality(value)) setVideoQuality(value);
            }}
          >
            <SelectTrigger className="w-full sm:w-64"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">Automatic</SelectItem>
              <SelectItem value="720">HD · 720p</SelectItem>
              <SelectItem value="1080">Full HD · 1080p</SelectItem>
            </SelectContent>
          </Select>
          <FieldDescription>The browser treats this as a preference and may choose a lower resolution.</FieldDescription>
        </Field>
      </div>

      {state.message && (
        <Alert
          variant={state.status === "error" ? "destructive" : "default"}
          className={state.status === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : undefined}
          aria-live="polite"
        >
          {state.status === "success" ? <CheckCircle2 /> : <AlertCircle />}
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      )}

      <div className="flex justify-end border-t pt-5">
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : <Save />}
          {pending ? "Saving…" : "Save call defaults"}
        </Button>
      </div>
    </form>
  );
}

function PreferenceRow({ label, description, checked, disabled, onCheckedChange }: {
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
        <p className="mt-0.5 text-sm leading-5 text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} disabled={disabled} onCheckedChange={onCheckedChange} aria-label={label} />
    </div>
  );
}
