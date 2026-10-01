"use client";

import { useActionState, useEffect, useRef } from "react";
import { AlertCircle, CheckCircle2, KeyRound, Loader2 } from "lucide-react";

import {
  requestPasswordReauthentication,
  updatePassword,
  type AccountSecurityState,
} from "@/app/(agent)/settings/actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

const initialState: AccountSecurityState = { status: "idle", message: null };

export function AccountSecurity() {
  const passwordFormRef = useRef<HTMLFormElement>(null);
  const [passwordState, passwordAction, passwordPending] = useActionState(
    updatePassword,
    initialState,
  );
  const [codeState, codeAction, codePending] = useActionState(
    requestPasswordReauthentication,
    initialState,
  );
  const needsVerification =
    passwordState.status !== "success" &&
    (passwordState.reauthenticationRequired || codeState.status !== "idle");

  useEffect(() => {
    if (passwordState.status === "success") passwordFormRef.current?.reset();
  }, [passwordState]);

  return (
    <div className="space-y-6">
      <div className="space-y-5">
        <form
          id="password-update-form"
          ref={passwordFormRef}
          action={passwordAction}
          aria-busy={passwordPending}
          className="space-y-5"
        >
          <FieldGroup>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="new-password">New password</FieldLabel>
                <Input
                  className="h-11"
                  id="new-password"
                  name="password"
                  type="password"
                  minLength={8}
                  maxLength={128}
                  autoComplete="new-password"
                  required
                  disabled={passwordPending}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="confirm-password">
                  Confirm password
                </FieldLabel>
                <Input
                  className="h-11"
                  id="confirm-password"
                  name="passwordConfirmation"
                  type="password"
                  minLength={8}
                  maxLength={128}
                  autoComplete="new-password"
                  required
                  disabled={passwordPending}
                />
              </Field>
            </div>
            {needsVerification && (
              <Field>
                <FieldLabel htmlFor="password-nonce">
                  Verification code
                </FieldLabel>
                <Input
                  className="h-11"
                  id="password-nonce"
                  name="nonce"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  minLength={6}
                  maxLength={8}
                  pattern="[0-9]*"
                  placeholder="Only required when requested"
                  disabled={passwordPending}
                />
                <FieldDescription>
                  Send a verification code to your email, then enter it here.
                </FieldDescription>
              </Field>
            )}
          </FieldGroup>
          <ActionMessage state={passwordState} />
        </form>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
          {needsVerification && (
            <form action={codeAction} aria-busy={codePending}>
              <Button
                type="submit"
                variant="outline"
                disabled={codePending || passwordPending}
                className="w-full sm:w-auto"
              >
                {codePending ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <KeyRound />
                )}
                {codePending ? "Sending…" : "Send verification code"}
              </Button>
            </form>
          )}
          <Button
            className="ml-auto h-11"
            type="submit"
            form="password-update-form"
            aria-live="polite"
            disabled={passwordPending || codePending}
          >
            {passwordPending ? (
              <Loader2 className="animate-spin" />
            ) : (
              <KeyRound />
            )}
            {passwordPending ? "Updating…" : "Update password"}
          </Button>
        </div>
        <ActionMessage state={codeState} />
      </div>
    </div>
  );
}

function ActionMessage({ state }: { state: AccountSecurityState }) {
  if (!state.message) return null;
  return (
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
  );
}
