"use client";

import { useActionState } from "react";
import { AlertCircle, KeyRound, Loader2 } from "lucide-react";

import {
  resetPassword,
  type ResetPasswordState,
} from "@/app/reset-password/actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

const initialState: ResetPasswordState = { error: null };

export function ResetPasswordForm() {
  const [state, action, pending] = useActionState(resetPassword, initialState);
  return (
    <form action={action} className="space-y-5">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="new-recovery-password">New password</FieldLabel>
          <Input
            className="h-11 bg-white"
            id="new-recovery-password"
            name="password"
            type="password"
            minLength={8}
            maxLength={128}
            autoComplete="new-password"
            required
            disabled={pending}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="confirm-recovery-password">
            Confirm password
          </FieldLabel>
          <Input
            className="h-11 bg-white"
            id="confirm-recovery-password"
            name="passwordConfirmation"
            type="password"
            minLength={8}
            maxLength={128}
            autoComplete="new-password"
            required
            disabled={pending}
          />
        </Field>
      </FieldGroup>
      {state.error && (
        <Alert variant="destructive" aria-live="polite">
          <AlertCircle />
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}
      <Button type="submit" className="h-11 w-full" disabled={pending}>
        {pending ? <Loader2 className="animate-spin" /> : <KeyRound />}
        {pending ? "Updating…" : "Set new password"}
      </Button>
    </form>
  );
}
