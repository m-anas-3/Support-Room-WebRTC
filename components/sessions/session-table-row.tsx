"use client";

import { useRouter } from "next/navigation";
import { TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

// Keep table semantics and a real Link inside the row for keyboard users.
export function SessionTableRow({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  return (
    <TableRow
      className={cn("cursor-pointer focus-within:bg-muted/50", className)}
      onClick={(event) => {
        if (
          event.button !== 0 ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey
        )
          return;
        if (
          (event.target as HTMLElement).closest(
            "a, button, input, select, textarea",
          )
        )
          return;
        if (window.getSelection()?.toString()) return;
        router.push(href);
      }}
    >
      {children}
    </TableRow>
  );
}
