"use client";

import { useEffect, useRef, useSyncExternalStore, type ReactNode } from "react";
import { MonitorUp, Video, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

const subscribeWide = (callback: () => void) => {
  const query = window.matchMedia("(min-width: 1024px)");
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
};
const wideSnapshot = () => window.matchMedia("(min-width: 1024px)").matches;
const serverSnapshot = () => false;

export function CallLayout({
  title,
  status,
  connected,
  actions,
  notice,
  error,
  children,
  panel,
  controls,
}: {
  title: string;
  status: string;
  connected: boolean;
  actions?: ReactNode;
  notice?: string | null;
  error?: string | null;
  children: ReactNode;
  panel?: ReactNode;
  controls: ReactNode;
}) {
  return (
    <main
      className="dark call-surface flex h-dvh min-h-0 flex-col overflow-hidden bg-background text-foreground"
      style={{
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <header className="flex h-14 shrink-0 items-center gap-3 px-3 sm:px-5">
        <span className="hidden size-8 items-center justify-center rounded-lg border border-border sm:flex">
          <Video className="size-4 text-primary" />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-sm font-medium">{title}</h1>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
            <span
              className={`size-1.5 shrink-0 rounded-full ${connected ? "bg-emerald-400" : "bg-amber-400"}`}
            />
            {status}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">{actions}</div>
      </header>
      {(error || notice) && (
        <div
          role={error ? "alert" : "status"}
          className={`mx-3 mb-2 max-h-[25dvh] shrink-0 overflow-y-auto rounded-xl border px-4 py-2 text-sm leading-5 sm:mx-5 ${error ? "border-red-400/25 bg-red-400/10 text-red-200" : "border-amber-400/25 bg-amber-400/10 text-amber-200"}`}
        >
          {error || notice}
        </div>
      )}
      <div className="flex min-h-0 flex-1 gap-3 px-3 sm:px-5">
        <section className="min-h-0 min-w-0 flex-1" aria-label="Call stage">
          {children}
        </section>
        {panel}
      </div>
      <footer
        className="flex min-h-20 shrink-0 items-center justify-center px-3 py-3"
        aria-label="Call controls"
      >
        {controls}
      </footer>
    </main>
  );
}

export function CallPanel({
  open,
  title,
  description,
  onClose,
  children,
  testId,
  closeLabel = "Close side panel",
}: {
  open: boolean;
  title: string;
  description: string;
  onClose: () => void;
  children: ReactNode;
  testId?: string;
  closeLabel?: string;
}) {
  const wide = useSyncExternalStore(
    subscribeWide,
    wideSnapshot,
    serverSnapshot,
  );
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open || !wide) return;
    const previous = document.activeElement;
    closeRef.current?.focus();
    return () => {
      if (previous instanceof HTMLElement && previous.isConnected)
        previous.focus();
    };
  }, [open, wide]);
  if (!wide)
    return (
      <Sheet
        open={open}
        onOpenChange={(value) => {
          if (!value) onClose();
        }}
      >
        <SheetContent
          className="dark data-[side=right]:w-full data-[side=right]:max-w-[400px] gap-0 bg-card text-foreground"
          showCloseButton={false}
        >
          <SheetHeader className="border-b p-5 pr-14">
            <SheetTitle>{title}</SheetTitle>
            <SheetDescription className="mt-1 text-xs">
              {description}
            </SheetDescription>
          </SheetHeader>
          <Button
            className="absolute top-3 right-3 size-11"
            size="icon"
            variant="ghost"
            aria-label={closeLabel}
            onClick={onClose}
          >
            <X />
          </Button>
          <div
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5"
            data-testid={testId}
          >
            {children}
          </div>
        </SheetContent>
      </Sheet>
    );
  if (!open) return null;
  return (
    <aside
      className="flex w-[360px] shrink-0 flex-col overflow-hidden rounded-2xl border border-border bg-card"
      aria-label={title}
      onKeyDown={(event) => {
        if (event.key === "Escape") onClose();
      }}
    >
      <header className="flex items-center gap-3 border-b p-5">
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-medium">{title}</h2>
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        </div>
        <Button
          ref={closeRef}
          size="icon"
          variant="ghost"
          className="size-9"
          aria-label={closeLabel}
          onClick={onClose}
        >
          <X />
        </Button>
      </header>
      <div
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5"
        data-testid={testId}
      >
        {children}
      </div>
    </aside>
  );
}

export function SharingState({ onStop }: { onStop: () => void }) {
  return (
    <div className="absolute inset-0 z-10 grid place-items-center bg-card p-4 text-center">
      <div>
        <MonitorUp className="mx-auto mb-4 size-7 text-primary" />
        <p className="font-medium">You’re sharing your screen</p>
        <p className="mx-auto mt-2 max-w-52 text-xs leading-5 text-muted-foreground">
          Your screen is being sent instead of your camera.
        </p>
        <Button className="mt-4 h-10" variant="secondary" onClick={onStop}>
          Stop sharing
        </Button>
      </div>
    </div>
  );
}
