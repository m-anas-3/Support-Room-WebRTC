import { redirect } from "next/navigation";

import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { Brand } from "@/components/layout/brand";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
    <main className="app-surface grid min-h-screen place-items-center bg-[#f7f8fa] p-5 sm:p-8">
      <div className="w-full max-w-sm">
        <div className="mb-8"><Brand href="/login" /></div>
        <Card className="border shadow-sm ring-0">
          <CardHeader><CardTitle className="text-2xl leading-tight"><h1>Choose a new password</h1></CardTitle><CardDescription className="mt-1">Use at least eight characters and avoid passwords used on other services.</CardDescription></CardHeader>
          <CardContent><ResetPasswordForm /></CardContent>
        </Card>
      </div>
    </main>
  );
}
