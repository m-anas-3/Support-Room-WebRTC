"use client";

import { useActionState } from "react";
import { AlertCircle, CheckCircle2, Loader2, Save } from "lucide-react";

import {
  updateAgentProfile,
  type ProfileSettingsState,
} from "@/app/(agent)/settings/actions";
import type { AgentIdentity } from "@/components/auth/agent-identity";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

const initialState: ProfileSettingsState = { status: "idle", message: null };

export function ProfileSettingsForm({ agent }: { agent: AgentIdentity }) {
  const [state, action, pending] = useActionState(
    updateAgentProfile,
    initialState,
  );

  return (
    <form action={action} aria-busy={pending} className="space-y-6">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="full-name">Full name</FieldLabel>
          <Input
            className="h-11"
            id="full-name"
            name="fullName"
            defaultValue={agent.name}
            autoComplete="name"
            minLength={2}
            maxLength={80}
            required
            disabled={pending}
          />
          <FieldDescription>Signed in as {agent.email}</FieldDescription>
        </Field>
      </FieldGroup>

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
          {pending ? "Saving…" : "Save profile"}
        </Button>
      </div>
    </form>
  );
}
