"use client";

import { useActionState } from "react";
import { AlertCircle, CheckCircle2, Loader2, Save } from "lucide-react";

import {
  updateAgentProfile,
  type ProfileSettingsState,
} from "@/app/(agent)/settings/actions";
import type { AgentIdentity } from "@/components/auth/agent-identity";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

const initialState: ProfileSettingsState = { status: "idle", message: null };

export function ProfileSettingsForm({ agent }: { agent: AgentIdentity }) {
  const [state, action, pending] = useActionState(updateAgentProfile, initialState);

  return (
    <form action={action} className="space-y-6">
      <div className="flex items-center gap-4">
        <Avatar className="size-14">
          <AvatarFallback className="bg-primary/10 text-lg font-semibold text-primary">
            {agent.initials}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate font-medium">{agent.name}</p>
          <p className="truncate text-sm text-muted-foreground">{agent.email}</p>
        </div>
      </div>

      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="full-name">Full name</FieldLabel>
          <Input
            id="full-name"
            name="fullName"
            defaultValue={agent.name}
            autoComplete="name"
            minLength={2}
            maxLength={80}
            required
            disabled={pending}
          />
          <FieldDescription>This name is shown to customers during support calls.</FieldDescription>
        </Field>
        <Field>
          <FieldLabel htmlFor="email">Work email</FieldLabel>
          <Input id="email" type="email" value={agent.email} readOnly />
          <FieldDescription>Your sign-in email is managed by Supabase Authentication.</FieldDescription>
        </Field>
        <Field>
          <FieldLabel htmlFor="role">Role</FieldLabel>
          <Input id="role" value="Support agent" readOnly />
        </Field>
      </FieldGroup>

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
          {pending ? "Saving…" : "Save profile"}
        </Button>
      </div>
    </form>
  );
}
