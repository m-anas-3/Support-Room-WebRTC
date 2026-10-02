import { Loader2 } from "lucide-react";
import { AuthShell } from "@/components/auth/auth-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { AppShell } from "./app-shell";
import { Brand } from "./brand";
import { PageHeader } from "./page-header";

export function LoadingStatus({ children }: { children: React.ReactNode }) {
  return (
    <p
      role="status"
      className="flex items-center gap-2 text-sm text-muted-foreground"
    >
      <Loader2
        aria-hidden="true"
        className="size-4 shrink-0 animate-spin motion-reduce:animate-none"
      />
      {children}
    </p>
  );
}

type WorkspaceKind =
  "overview" | "sessions" | "report" | "settings" | "devices";
const titles: Record<WorkspaceKind, string> = {
  overview: "Overview",
  sessions: "Sessions",
  report: "Session report",
  settings: "Settings",
  devices: "Device check",
};

export function WorkspaceLoading({
  kind = "overview",
}: {
  kind?: WorkspaceKind;
}) {
  const title = titles[kind];
  return (
    <AppShell title={title}>
      <div className="page-stack" aria-busy="true">
        <PageHeader
          title={title}
          description={`Loading ${title.toLowerCase()}…`}
        />
        <LoadingStatus>Getting your {title.toLowerCase()} ready…</LoadingStatus>
        <div aria-hidden="true" className="space-y-6">
          {kind === "settings" ? (
            <div className="divide-y rounded-2xl border bg-card px-5 sm:px-7">
              {[0, 1, 2].map((item) => (
                <div
                  key={item}
                  className="grid gap-6 py-7 md:grid-cols-[200px_minmax(0,1fr)] md:gap-10"
                >
                  <div className="space-y-3">
                    <Skeleton className="h-5 w-28" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                  <div className="space-y-5">
                    <Skeleton className="h-11 w-full" />
                    <Skeleton className="ml-auto h-11 w-36" />
                  </div>
                </div>
              ))}
            </div>
          ) : kind === "devices" ? (
            <PreviewSkeleton />
          ) : (
            <>
              {kind !== "sessions" && (
                <div className="grid gap-4 sm:grid-cols-3">
                  {[0, 1, 2].map((item) => (
                    <Skeleton key={item} className="h-28 rounded-xl" />
                  ))}
                </div>
              )}
              <div className="space-y-5 rounded-2xl border bg-card p-5 sm:p-7">
                <Skeleton className="h-6 w-44" />
                {[0, 1, 2, 3].map((item) => (
                  <Skeleton key={item} className="h-14 w-full" />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}

export function AuthLoading({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <AuthShell title={title} description={description}>
      <div className="space-y-6" aria-busy="true">
        <div aria-hidden="true" className="space-y-5">
          {[0, 1].map((item) => (
            <div key={item} className="space-y-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-11 w-full" />
            </div>
          ))}
          <Skeleton className="h-11 w-full" />
        </div>
        <LoadingStatus>Loading your account…</LoadingStatus>
      </div>
    </AuthShell>
  );
}

export function CallLoading() {
  return (
    <main className="flex h-dvh flex-col gap-4 bg-[#15171c] p-4 text-white sm:p-6">
      <Brand />
      <div
        aria-hidden="true"
        className="grid min-h-0 flex-1 grid-cols-1 gap-3 sm:grid-cols-2"
      >
        {[0, 1].map((item) => (
          <Skeleton key={item} className="h-full rounded-2xl bg-white/10" />
        ))}
      </div>
      <div className="flex justify-center py-3 [&_p]:text-white/70">
        <LoadingStatus>Opening your support room…</LoadingStatus>
      </div>
    </main>
  );
}

export function JoinLoading() {
  return (
    <main className="min-h-dvh bg-background">
      <header className="border-b bg-card px-5 py-4">
        <Brand />
      </header>
      <div className="mx-auto max-w-[1100px] space-y-8 px-5 py-10">
        <PageHeader
          title="Get ready to join"
          description="Loading your private support room…"
        />
        <LoadingStatus>Preparing your device check…</LoadingStatus>
        <div aria-hidden="true">
          <PreviewSkeleton />
        </div>
      </div>
    </main>
  );
}

function PreviewSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(280px,1fr)]">
      <Skeleton className="aspect-[4/3] rounded-2xl sm:aspect-video" />
      <Skeleton className="min-h-72 rounded-2xl" />
    </div>
  );
}
