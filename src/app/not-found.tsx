import Link from "next/link";
import { ArrowLeft, Compass } from "lucide-react";

export default function NotFound() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 text-center">
      <div className="pointer-events-none absolute -top-24 left-1/2 size-72 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />

      <div className="relative flex flex-col items-center gap-5">
        <span className="grid size-12 place-items-center rounded-[12px] bg-primary text-primary-contrast shadow-[0_10px_30px_-10px_rgba(31,206,144,0.6)]">
          <Compass className="size-6" strokeWidth={2} aria-hidden />
        </span>

        <div className="flex flex-col gap-1.5">
          <p className="tabular text-[13px] font-semibold uppercase tracking-[0.14em] text-subtle">
            404
          </p>
          <h1 className="font-display text-2xl font-semibold text-fg">
            Den side fandt vi ikke
          </h1>
          <p className="mx-auto max-w-sm text-sm leading-relaxed text-muted">
            Linket er måske forældet, eller siden er flyttet. Dit value-feed er
            stadig, hvor du forlod det.
          </p>
        </div>

        <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
          <Link
            href="/value-bets"
            className="inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-sm)] bg-primary px-4 text-[13px] font-medium text-primary-contrast transition-colors hover:bg-primary-strong"
          >
            <ArrowLeft className="size-4" />
            Til Value Feed
          </Link>
          <Link
            href="/portfolio"
            className="inline-flex h-9 items-center rounded-[var(--radius-sm)] border border-line bg-surface-2 px-4 text-[13px] font-medium text-muted transition-colors hover:border-line-strong hover:text-fg"
          >
            Min portefølje
          </Link>
        </div>
      </div>
    </div>
  );
}
