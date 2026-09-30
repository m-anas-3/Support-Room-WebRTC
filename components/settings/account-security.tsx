"use client";

import { useActionState, useEffect, useRef } from "react";
import { AlertCircle, CheckCircle2, KeyRound, Loader2, LogOut } from "lucide-react";

import {
  requestPasswordReauthentication,
  signOutOtherSessions,
  updatePassword,
  type AccountSecurityState,
} from "@/app/(agent)/settings/actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

const initialState: AccountSecurityState = { status: "idle", message: null };

export function AccountSecurity() {
  const passwordFormRef = useRef<HTMLFormElement>(null);
  const [passwordState, passwordAction, passwordPending] = useActionState(updatePassword, initialState);
  const [codeState, codeAction, codePending] = useActionState(requestPasswordReauthentication, initialState);
  const [sessionsState, sessionsAction, sessionsPending] = useActionState(signOutOtherSessions, initialState);

  useEffect(() => {
    if (passwordState.status === "success") passwordFormRef.current?.reset();
  }, [passwordState]);

  return (
    <div className="space-y-6">
      <div className="space-y-5">
        <div>
          <h3 className="text-sm font-medium">Change password</h3>
          <p className="mt-1 text-sm leading-5 text-muted-foreground">Use at least eight characters and avoid passwords used on other services.</p>
        </div>
        <form id="password-update-form" ref={passwordFormRef} action={passwordAction} className="space-y-5">
          <FieldGroup>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="new-password">New password</FieldLabel>
                <Input id="new-password" name="password" type="password" minLength={8} maxLength={128} autoComplete="new-password" required disabled={passwordPending} />
              </Field>
              <Field>
                <FieldLabel htmlFor="confirm-password">Confirm password</FieldLabel>
                <Input id="confirm-password" name="passwordConfirmation" type="password" minLength={8} maxLength={128} autoComplete="new-password" required disabled={passwordPending} />
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="password-nonce">Verification code</FieldLabel>
              <Input id="password-nonce" name="nonce" inputMode="numeric" autoComplete="one-time-code" minLength={6} maxLength={8} pattern="[0-9]*" placeholder="Only required when requested" disabled={passwordPending} />
              <FieldDescription>Older sessions may require a one-time code before Supabase accepts a password change.</FieldDescription>
            </Field>
          </FieldGroup>
          <ActionMessage state={passwordState} />
        </form>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
          <form action={codeAction}>
            <Button type="submit" variant="outline" disabled={codePending || passwordPending} className="w-full sm:w-auto">
              {codePending ? <Loader2 className="animate-spin" /> : <KeyRound />}
              {codePending ? "Sending…" : "Send verification code"}
            </Button>
          </form>
          <Button type="submit" form="password-update-form" disabled={passwordPending || codePending}>
            {passwordPending ? <Loader2 className="animate-spin" /> : <KeyRound />}
            {passwordPending ? "Updating…" : "Update password"}
          </Button>
        </div>
        <ActionMessage state={codeState} />
      </div>

      <Separator />

      <form action={sessionsAction} className="space-y-4">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h3 className="text-sm font-medium">Other signed-in devices</h3>
            <p className="mt-1 text-sm leading-5 text-muted-foreground">Revoke refresh tokens for every other browser and device while keeping this session active.</p>
          </div>
          <Button type="submit" variant="outline" disabled={sessionsPending} className="shrink-0">
            {sessionsPending ? <Loader2 className="animate-spin" /> : <LogOut />}
            {sessionsPending ? "Signing out…" : "Sign out other devices"}
          </Button>
        </div>
        <ActionMessage state={sessionsState} />
      </form>
    </div>
  );
}

function ActionMessage({ state }: { state: AccountSecurityState }) {
  if (!state.message) return null;
  return (
    <Alert
      variant={state.status === "error" ? "destructive" : "default"}
      className={state.status === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : undefined}
      aria-live="polite"
    >
      {state.status === "success" ? <CheckCircle2 /> : <AlertCircle />}
      <AlertDescription>{state.message}</AlertDescription>
    </Alert>
  );
}
