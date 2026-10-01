import { Activity, ArrowUpRight, Video } from "lucide-react";
import { Brand } from "@/components/layout/brand";

export function AuthShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <main className="grid min-h-dvh bg-background lg:grid-cols-2">
      <section className="relative hidden flex-col overflow-hidden bg-[#15171c] p-12 text-white lg:flex xl:p-16">
        <Brand href="/login" />
        <div className="my-auto max-w-lg py-16">
          <p className="mb-6 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-blue-300">
            <span className="size-1.5 rounded-full bg-blue-400" /> A closer
            connection
          </p>
          <h2 className="text-5xl font-medium leading-[1.12] tracking-[-0.045em] xl:text-6xl">
            Good support
            <br />
            starts with
            <br />
            <span className="text-white/45">being there.</span>
          </h2>
          <p className="mt-7 max-w-sm text-base leading-7 text-white/60">
            One customer. One conversation. A clear picture of what needs to
            happen next.
          </p>
          <div className="mt-12 flex items-center gap-4 border-t border-white/15 pt-6">
            <span className="grid size-11 place-items-center rounded-xl border border-white/15">
              <Video className="size-5" />
            </span>
            <div className="flex-1">
              <p className="text-sm font-medium">Built for focused support</p>
              <p className="mt-1 text-xs text-white/50">
                Video calls · Screen sharing · Connection insights
              </p>
            </div>
            <ArrowUpRight className="size-5 text-white/40" />
          </div>
        </div>
        <p className="flex items-center gap-2 text-xs text-white/45">
          <Activity className="size-3.5" /> Understand the connection behind
          every conversation.
        </p>
      </section>
      <section className="flex min-w-0 flex-col px-6 py-8 sm:px-12">
        <div className="lg:hidden">
          <Brand href="/login" />
        </div>
        <div className="mx-auto my-auto w-full max-w-[380px] py-14">
          <p className="mb-3 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Your support workspace
          </p>
          <h1 className="text-[28px] font-semibold tracking-tight">{title}</h1>
          <p className="mt-2 mb-8 text-sm leading-6 text-muted-foreground">
            {description}
          </p>
          {children}
        </div>
        <p className="text-center text-xs text-muted-foreground">
          SupportRoom · One-to-one video support
        </p>
      </section>
    </main>
  );
}
