"use client";

import { useLinkStatus } from "next/link";
import { Loader2 } from "lucide-react";

export function NavigationPending() {
  const { pending } = useLinkStatus();
  return (
    <span
      className="ml-auto size-4 shrink-0 group-data-[collapsible=icon]:hidden"
      role="status"
    >
      {pending && (
        <>
          <Loader2
            aria-hidden="true"
            className="size-4 animate-spin motion-reduce:animate-none"
          />
          <span className="sr-only">Loading page…</span>
        </>
      )}
    </span>
  );
}
