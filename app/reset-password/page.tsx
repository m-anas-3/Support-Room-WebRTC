import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export default async function ResetPasswordPage() {
  if (process.env.SUPPORTROOM_E2E !== "1") {
    if (!isSupabaseConfigured()) redirect("/login?configuration=missing");
    const supabase = await createClient();
    const { data } = await supabase.auth.getClaims();
    if (!data?.claims?.sub) redirect("/forgot-password?recovery=invalid");
  }

  return (
    <AuthShell
      title="Choose a new password"
      description="Use at least eight characters and a password you don’t use elsewhere."
    >
      <ResetPasswordForm />
    </AuthShell>
  );
}
