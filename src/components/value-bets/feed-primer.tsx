import { ChevronDown } from "lucide-react";

const TERMS: { term: string; body: string }[] = [
  {
    term: "Fair odds",
    body: "Odds uden bookmakerens margin — udledt fra sharp bookmakere som Pinnacle.",
  },
  {
    term: "Value / EV",
    body: "Hvor meget bedre den bedste pris er end fair odds. +5% EV = 5 øre i forventet gevinst pr. krone over tid.",
  },
  {
    term: "Value score",
    body: "0–100. Vægter edge, sikkerhed og om markedet bevæger sig med dig.",
  },
  {
    term: "Kelly",
    body: "Anbefalet indsats som andel af din bankroll. Vi bruger ¼ Kelly for lavere varians.",
  },
];

/** Quiet, native collapsible glossary — no border, no box until opened. */
export function FeedPrimer() {
  return (
    <details className="group">
      <summary className="inline-flex w-fit cursor-pointer list-none items-center gap-1 text-[12px] text-subtle transition-colors hover:text-muted">
        Sådan læser du et value bet
        <ChevronDown className="size-3.5 transition-transform group-open:rotate-180" />
      </summary>
      <div className="mt-3 grid gap-x-6 gap-y-3 rounded-[var(--radius-sm)] bg-surface/50 p-4 sm:grid-cols-2">
        {TERMS.map((t) => (
          <div key={t.term}>
            <p className="text-[12px] font-semibold text-fg">{t.term}</p>
            <p className="mt-0.5 text-[12px] leading-relaxed text-muted">
              {t.body}
            </p>
          </div>
        ))}
      </div>
    </details>
  );
}
