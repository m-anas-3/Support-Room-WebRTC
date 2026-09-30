import Link from "next/link";
import { ArrowLeft, SearchX } from "lucide-react";

import { Brand } from "@/components/layout/brand";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function NotFound() {
  return (
    <main className="app-surface grid min-h-screen place-items-center bg-[#f7f8fa] p-5">
      <Card className="w-full max-w-md border shadow-sm ring-0"><CardContent className="space-y-6 text-center">
        <Brand href="/dashboard" className="justify-center" />
        <span className="mx-auto grid size-12 place-items-center rounded-full bg-muted text-muted-foreground"><SearchX /></span>
        <div><p className="text-sm font-medium text-primary">404</p><h1 className="mt-1 text-xl font-semibold">This page does not exist</h1><p className="mt-2 text-sm leading-6 text-muted-foreground">The link may have expired, moved, or been entered incorrectly.</p></div>
        <Button render={<Link href="/dashboard" />}><ArrowLeft />Return to dashboard</Button>
      </CardContent></Card>
    </main>
  );
}
