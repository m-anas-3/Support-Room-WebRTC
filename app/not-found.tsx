import Link from "next/link";
import { ArrowLeft, SearchX } from "lucide-react";
import { ResultState } from "@/components/layout/result-state";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <ResultState
      icon={<SearchX />}
      eyebrow="Page not found · 404"
      title="This link leads nowhere."
      description="The page may have moved, or the link may be incorrect. Let’s get you back to your workspace."
    >
      <Button
        className="h-11"
        nativeButton={false}
        render={<Link href="/dashboard" />}
      >
        <ArrowLeft />
        Return to dashboard
      </Button>
    </ResultState>
  );
}
