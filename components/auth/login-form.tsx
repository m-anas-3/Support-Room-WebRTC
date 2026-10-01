"use client";

import { useActionState } from "react";
import Link from "next/link";
import { AlertCircle, ArrowRight, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { signIn, type LoginState } from "@/app/login/actions";

const initialState: LoginState = { error: null };

export function LoginForm({
  nextPath,
  configurationMissing,
}: {
  nextPath?: string;
  configurationMissing: boolean;
}) {
  const [state, action, pending] = useActionState(signIn, initialState);

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="next" value={nextPath ?? "/dashboard"} />
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="email">Work email</FieldLabel>
          <Input
            className="h-11 bg-white"
            id="email"
            name="email"
            type="email"
            placeholder="alex@company.com"
            autoComplete="email"
            required
            disabled={pending || configurationMissing}
          />
        </Field>
        <Field>
          <div className="flex items-center justify-between gap-4">
            <FieldLabel htmlFor="password">Password</FieldLabel>
            <Link
              href="/forgot-password"
              className="text-xs font-medium text-primary hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <Input
            className="h-11 bg-white"
            id="password"
            name="password"
            type="password"
            placeholder="Enter your password"
            autoComplete="current-password"
            required
            disabled={pending || configurationMissing}
          />
        </Field>
      </FieldGroup>
      {(state.error || configurationMissing) && (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertDescription>
            {configurationMissing
              ? "Sign-in is temporarily unavailable. Please contact your workspace administrator."
              : state.error}
          </AlertDescription>
        </Alert>
      )}
      <Button
        type="submit"
        className="h-11 w-full"
        disabled={pending || configurationMissing}
      >
        {pending ? <Loader2 className="animate-spin" /> : <ArrowRight />}
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
