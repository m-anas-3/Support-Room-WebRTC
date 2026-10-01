import { CircleAlert, Info } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatusNotice({
  children,
  error = false,
  className,
}: {
  children: React.ReactNode;
  error?: boolean;
  className?: string;
}) {
  const Icon = error ? CircleAlert : Info;
  return (
    <div
      role={error ? "alert" : "status"}
      className={cn(
        "flex items-start gap-3 rounded-xl border px-4 py-3 text-sm leading-6",
        error
          ? "border-destructive/20 bg-destructive/5 text-destructive"
          : "border-border bg-muted/50 text-muted-foreground",
        className,
      )}
    >
      <Icon className="mt-1 size-4 shrink-0" />
      <div className="min-w-0 break-words">{children}</div>
    </div>
  );
}
