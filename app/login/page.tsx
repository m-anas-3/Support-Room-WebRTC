import { LockKeyhole } from "lucide-react";

import { LoginForm } from "@/components/auth/login-form";
import { Brand } from "@/components/layout/brand";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const nextPath = typeof params.next === "string" ? params.next : undefined;
  const configurationMissing = params.configuration === "missing" || !isSupabaseConfigured();

  return (
    <main className="app-surface grid min-h-screen bg-[#f7f8fa] lg:grid-cols-[1fr_440px]">
      <section className="hidden border-r bg-[#182237] p-10 text-white lg:flex lg:flex-col">
        <Brand href="/login" />
        <div className="my-auto max-w-xl">
          <p className="text-sm font-medium text-blue-300">Built for focused support</p>
          <h1 className="mt-4 text-[2.75rem] font-semibold leading-[1.12] tracking-[-0.045em]">A clear view of every customer conversation.</h1>
          <p className="mt-5 max-w-lg text-[1.0625rem] leading-7 text-slate-300">Secure one-to-one video sessions with the connection details your team needs to solve problems quickly.</p>
          <div className="mt-10 grid grid-cols-3 gap-6 border-t border-white/15 pt-6 text-sm"><div><p className="text-2xl font-semibold">99.9%</p><p className="mt-1 text-slate-400">uptime</p></div><div><p className="text-2xl font-semibold">256-bit</p><p className="mt-1 text-slate-400">encryption</p></div><div><p className="text-2xl font-semibold">24/7</p><p className="mt-1 text-slate-400">monitoring</p></div></div>
        </div>
        <p className="text-xs text-slate-400">Private by design. Media is never recorded by default.</p>
      </section>

      <section className="flex items-center justify-center p-5 sm:p-8">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden"><Brand href="/login" /></div>
          <Card className="border shadow-sm ring-0">
            <CardHeader><CardTitle className="text-2xl leading-tight">Sign in to your workspace</CardTitle><CardDescription className="mt-1">Use your agent account to continue.</CardDescription></CardHeader>
            <CardContent>
              <LoginForm nextPath={nextPath} configurationMissing={configurationMissing} />
              <Alert className="mt-5 bg-muted/35"><LockKeyhole /><AlertDescription>Your organization manages access through Supabase authentication.</AlertDescription></Alert>
            </CardContent>
          </Card>
          <p className="mt-6 text-center text-xs text-muted-foreground">By continuing, you agree to your organization’s security policies.</p>
        </div>
      </section>
    </main>
  );
}
