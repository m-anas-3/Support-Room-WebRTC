import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const invalidRecovery = params.recovery === "invalid";
  return (
    <AuthShell
      title="Recover your account"
      description="Enter your work email and we’ll send you a password reset link."
    >
      {invalidRecovery && (
        <Alert variant="destructive" className="mb-5">
          <AlertDescription>
            This recovery link is invalid or expired. Request a new email below.
          </AlertDescription>
        </Alert>
      )}
      <ForgotPasswordForm configurationMissing={!isSupabaseConfigured()} />
      <p className="mt-6 text-center text-sm">
        <Link href="/login" className="text-primary hover:underline">
          Return to sign in
        </Link>
      </p>
    </AuthShell>
  );
}
