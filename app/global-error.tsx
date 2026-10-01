"use client";

import { useEffect } from "react";
import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import "./globals.css";

export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <html lang="en">
      <body className="app-surface grid min-h-screen place-items-center bg-background p-5">
        <main className="w-full max-w-md rounded-2xl border bg-white p-8 text-center shadow-none">
          <title>SupportRoom error</title>
          <div className="mx-auto grid size-12 place-items-center rounded-xl bg-primary text-primary-foreground">
            SR
          </div>
          <h1 className="mt-6 text-[28px] font-semibold tracking-tight">
            SupportRoom needs to reload
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            An unexpected application error occurred. Your browser will ask for
            camera and microphone access again if they are needed.
          </p>
          <Button className="mt-6 h-11" onClick={retry}>
            <RefreshCw />
            Reload application
          </Button>
          {error.digest && (
            <p className="mt-4 text-xs text-muted-foreground">
              Error reference: {error.digest}
            </p>
          )}
        </main>
      </body>
    </html>
  );
}
