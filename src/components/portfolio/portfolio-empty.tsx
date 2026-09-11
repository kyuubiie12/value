import Link from "next/link";
import { ArrowRight, Landmark, Sparkles, Wallet } from "lucide-react";

const STEPS = [
  {
    icon: Landmark,
    title: "Vælg dine bookmakere",
    body: "Feedet regner kun value på de odds du faktisk kan spille.",
    href: "/profile?s=bookmakere",
    cta: "Til bookmakere",
  },
  {
    icon: Sparkles,
    title: "Find et value bet",
    body: "AI'en markerer spil hvor bedste pris ligger over fair odds.",
    href: "/value-bets",
    cta: "Åbn feedet",
  },
  {
    icon: Wallet,
    title: "Tryk “Jeg spiller med”",
    body: "Så lander spillet her, og din udvikling begynder at tælle.",
    href: "/value-bets",
    cta: "Kom i gang",
  },
];

/** Shown on the portfolio before the user has logged a single bet. */
export function PortfolioEmpty() {
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-card-lg border border-primary/25 bg-surface p-5">
        <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.08em] text-primary-strong">
          <Sparkles className="size-3.5" />
          Kom i gang
        </p>
        <p className="mt-1 max-w-lg text-[13px] leading-relaxed text-muted">
          Din portefølje er tom. Følg de tre trin, så bygger den sig selv fra de
          bets du spiller med på.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {STEPS.map((s, i) => (
          <div
            key={s.title}
            className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4"
          >
            <div className="flex items-center gap-2">
              <span className="grid size-7 place-items-center rounded-[var(--radius-sm)] bg-surface-2 text-primary-strong ring-1 ring-inset ring-line">
                <s.icon className="size-3.5" strokeWidth={2} />
              </span>
              <span className="tabular text-[11px] font-semibold text-subtle">
                {i + 1}/3
              </span>
            </div>
            <div className="flex-1">
              <p className="text-[13px] font-semibold text-fg">{s.title}</p>
              <p className="mt-0.5 text-[12px] leading-relaxed text-subtle">
                {s.body}
              </p>
            </div>
            <Link
              href={s.href}
              className="inline-flex items-center gap-1 text-[12px] font-medium text-primary-strong transition-colors hover:text-primary"
            >
              {s.cta}
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
