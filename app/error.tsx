"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw } from "lucide-react";

import { Brand } from "@/components/layout/brand";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function ErrorPage({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <main className="app-surface grid min-h-screen place-items-center bg-[#f7f8fa] p-5">
      <Card className="w-full max-w-md border shadow-sm ring-0">
        <CardContent className="space-y-6 text-center">
          <Brand href="/dashboard" className="justify-center" />
          <span className="mx-auto grid size-12 place-items-center rounded-full bg-amber-50 text-amber-700"><AlertTriangle /></span>
          <div><h1 className="text-xl font-semibold">SupportRoom could not load this page</h1><p className="mt-2 text-sm leading-6 text-muted-foreground">The problem may be temporary. Retry the page or return to your dashboard.</p></div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-center"><Button variant="outline" render={<Link href="/dashboard" />}>Return to dashboard</Button><Button onClick={retry}><RefreshCw />Try again</Button></div>
          {error.digest && <p className="text-xs text-muted-foreground">Error reference: {error.digest}</p>}
        </CardContent>
      </Card>
    </main>
  );
}
