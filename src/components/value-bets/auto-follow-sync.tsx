"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Sparkles, X } from "lucide-react";
import { syncAutoFollowAction } from "@/lib/actions";

/**
 * When auto-follow is on, logs any new qualifying value bets to the portfolio
 * once per feed visit and shows a short summary. The server action is idempotent.
 */
export function AutoFollowSync({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const ran = React.useRef(false);
  const [result, setResult] = React.useState<{
    added: number;
    stoppedByLimit: boolean;
  } | null>(null);
  const [dismissed, setDismissed] = React.useState(false);

  React.useEffect(() => {
    if (!enabled || ran.current) return;
    ran.current = true;
    syncAutoFollowAction().then((r) => {
      if (r.added > 0) {
        setResult(r);
        router.refresh();
      } else if (r.stoppedByLimit) {
        setResult(r);
      }
    });
  }, [enabled, router]);

  if (!result || dismissed) return null;

  return (
    <div className="flex items-center gap-3 rounded-card border border-primary/25 bg-primary/[0.06] px-4 py-2.5">
      <Sparkles className="size-4 shrink-0 text-primary-strong" />
      <p className="min-w-0 flex-1 text-[12px] text-fg">
        {result.added > 0 ? (
          <>
            <span className="font-semibold">
              AI fulgte {result.added}{" "}
              {result.added === 1 ? "nyt pick" : "nye picks"}
            </span>{" "}
            og lagde dem i din portefølje.
          </>
        ) : (
          <span className="font-semibold">
            Auto-følg stoppet — din ugentlige indsatsgrænse er nået.
          </span>
        )}
        {result.stoppedByLimit && result.added > 0 && (
          <span className="text-subtle">
            {" "}
            Resten blev sprunget over — ugegrænsen er nået.
          </span>
        )}
      </p>
      <Link
        href="/portfolio"
        className="hidden shrink-0 items-center gap-1 text-[12px] font-medium text-primary-strong hover:text-primary sm:flex"
      >
        Se portefølje
        <ArrowRight className="size-3.5" />
      </Link>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Skjul"
        className="grid size-6 shrink-0 place-items-center rounded-[var(--radius-sm)] text-subtle transition-colors hover:bg-surface-2 hover:text-fg"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}
