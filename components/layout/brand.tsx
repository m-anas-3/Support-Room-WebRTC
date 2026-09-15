import Link from "next/link";
import { Video } from "lucide-react";
import { cn } from "@/lib/utils";

export function Brand({ href = "/dashboard", className }: { href?: string; className?: string }) {
  return <Link href={href} className={cn("inline-flex items-center gap-2.5", className)}><span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground"><Video className="size-4" /></span><span className="text-base font-semibold tracking-[-0.025em]">SupportRoom</span></Link>;
}
