import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const nextPath = typeof params.next === "string" ? params.next : undefined;
  const configurationMissing =
    params.configuration === "missing" || !isSupabaseConfigured();
  const passwordUpdated = params.password === "updated";

  return (
    <AuthShell
      title="Welcome back"
      description="Sign in to start your next support conversation."
    >
      {passwordUpdated && (
        <Alert className="mb-5">
          <AlertDescription>
            Your password has been updated. Sign in with your new password.
          </AlertDescription>
        </Alert>
      )}
      <LoginForm
        nextPath={nextPath}
        configurationMissing={configurationMissing}
      />
      <p className="mt-6 text-center text-xs leading-5 text-muted-foreground">
        Customer joining a call? Open the invitation link from your support
        agent.
      </p>
    </AuthShell>
  );
}
