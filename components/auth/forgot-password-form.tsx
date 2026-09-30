"use client";

import { useActionState } from "react";
import { AlertCircle, CheckCircle2, Loader2, Mail } from "lucide-react";

import { requestPasswordReset, type ForgotPasswordState } from "@/app/forgot-password/actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

const initialState: ForgotPasswordState = { status: "idle", message: null };

export function ForgotPasswordForm({ configurationMissing }: { configurationMissing: boolean }) {
  const [state, action, pending] = useActionState(requestPasswordReset, initialState);

  return (
    <form action={action} className="space-y-5">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="recovery-email">Work email</FieldLabel>
          <Input id="recovery-email" name="email" type="email" placeholder="alex@company.com" autoComplete="email" required disabled={pending || configurationMissing} />
        </Field>
      </FieldGroup>
      {(state.message || configurationMissing) && (
        <Alert variant={state.status === "error" || configurationMissing ? "destructive" : "default"} className={state.status === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : undefined} aria-live="polite">
          {state.status === "success" ? <CheckCircle2 /> : <AlertCircle />}
          <AlertDescription>{configurationMissing ? "Add the Supabase project URL and publishable key before requesting recovery." : state.message}</AlertDescription>
        </Alert>
      )}
      <Button type="submit" className="h-10 w-full" disabled={pending || configurationMissing}>
        {pending ? <Loader2 className="animate-spin" /> : <Mail />}{pending ? "Sending…" : "Send recovery email"}
      </Button>
    </form>
  );
}
