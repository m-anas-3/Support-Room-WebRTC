import Link from "next/link";

import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { Brand } from "@/components/layout/brand";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export default async function ForgotPasswordPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const invalidRecovery = params.recovery === "invalid";
  return (
    <main className="app-surface grid min-h-screen place-items-center bg-[#f7f8fa] p-5 sm:p-8">
      <div className="w-full max-w-sm">
        <div className="mb-8"><Brand href="/login" /></div>
        <Card className="border shadow-sm ring-0">
          <CardHeader><CardTitle className="text-2xl leading-tight"><h1>Recover your account</h1></CardTitle><CardDescription className="mt-1">We will send a secure password reset link to your agent email.</CardDescription></CardHeader>
          <CardContent>
            {invalidRecovery && <Alert variant="destructive" className="mb-5"><AlertDescription>This recovery link is invalid or expired. Request a new email below.</AlertDescription></Alert>}
            <ForgotPasswordForm configurationMissing={!isSupabaseConfigured()} />
            <p className="mt-5 text-center text-sm text-muted-foreground"><Link href="/login" className="font-medium text-primary hover:underline">Return to sign in</Link></p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
