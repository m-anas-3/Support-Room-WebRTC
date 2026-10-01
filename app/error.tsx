"use client";
import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { ResultState } from "@/components/layout/result-state";
import { Button } from "@/components/ui/button";

export default function ErrorPage({
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
    <ResultState
      icon={<AlertTriangle />}
      eyebrow="Something went wrong"
      title="Let’s try that again."
      description="We couldn’t load this page. Try again, or return to your dashboard."
    >
      <Button
        className="h-11"
        variant="outline"
        nativeButton={false}
        render={<Link href="/dashboard" />}
      >
        Return to dashboard
      </Button>
      <Button className="h-11" onClick={retry}>
        <RefreshCw />
        Try again
      </Button>
      {error.digest && (
        <p className="w-full text-xs text-muted-foreground">
          Error reference: {error.digest}
        </p>
      )}
    </ResultState>
  );
}
