import { Brand } from "./brand";

export function ResultState({
  icon,
  eyebrow,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <main className="flex min-h-dvh flex-col bg-background p-6 sm:p-10">
      <Brand />
      <section className="mx-auto my-auto w-full max-w-md py-16 text-center">
        <span className="mx-auto grid size-16 place-items-center rounded-2xl border bg-white text-muted-foreground">
          {icon}
        </span>
        <p className="mt-7 text-xs font-medium uppercase tracking-[0.14em] text-primary">
          {eyebrow}
        </p>
        <h1 className="mt-3 text-[28px] font-semibold leading-tight tracking-tight">
          {title}
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          {description}
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          {children}
        </div>
      </section>
      <p className="text-center text-xs text-muted-foreground">
        SupportRoom · Here to help you connect
      </p>
    </main>
  );
}
