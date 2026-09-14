import Link from "next/link";
import { Video } from "lucide-react";

export function Brand({ href = "/dashboard" }: { href?: string }) {
  return <Link href={href} className="inline-flex items-center gap-2.5"><span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground"><Video className="size-4" /></span><span className="text-base font-semibold tracking-[-0.025em]">SupportRoom</span></Link>;
}
