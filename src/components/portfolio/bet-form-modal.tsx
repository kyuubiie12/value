"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import type {
  BetStatus,
  Bookmaker,
  League,
  MarketType,
  ValueOpportunity,
} from "@/types";
import { BET_STATUS_LABELS, MARKET_LABELS } from "@/types";
import { DEFAULT_SETTINGS } from "@/lib/mock-data";
import { logBetAction } from "@/lib/actions";
import { formatCurrency, formatPercent } from "@/lib/format";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { EvIndicator } from "@/components/shared/ev-indicator";

interface FormState {
  leagueId: string;
  event: string;
  market: MarketType;
  selection: string;
  bookmakerId: string;
  odds: string;
  stake: string;
  status: BetStatus;
  notes: string;
}

const STATUS_OPTIONS: BetStatus[] = ["pending", "won", "lost", "cashout", "void"];

function fromOpportunity(o: ValueOpportunity): FormState {
  return {
    leagueId: o.leagueId,
    event: `${o.homeTeam} – ${o.awayTeam}`,
    market: o.market,
    selection: o.selection,
    bookmakerId: o.bestBookmakerId,
    odds: String(o.bestOdds),
    stake: String(DEFAULT_SETTINGS.unitSize * DEFAULT_SETTINGS.defaultStakeUnits),
    status: "pending",
    notes: "",
  };
}

export function BetFormModal({
  open,
  onClose,
  bookmakers,
  leagues,
  opportunity,
}: {
  open: boolean;
  onClose: () => void;
  bookmakers: Bookmaker[];
  leagues: League[];
  opportunity?: ValueOpportunity | null;
}) {
  const router = useRouter();

  const empty = React.useMemo<FormState>(
    () => ({
      leagueId: leagues[0]?.id ?? "",
      event: "",
      market: "1x2",
      selection: "",
      bookmakerId: bookmakers[0]?.id ?? "bet365",
      odds: "",
      stake: String(DEFAULT_SETTINGS.unitSize * DEFAULT_SETTINGS.defaultStakeUnits),
      status: "pending",
      notes: "",
    }),
    [leagues, bookmakers],
  );

  const [form, setForm] = React.useState<FormState>(empty);
  const [pending, startTransition] = React.useTransition();
  const [done, setDone] = React.useState(false);

  const sessionKey = open ? (opportunity?.id ?? "manual") : null;
  const [seededKey, setSeededKey] = React.useState<string | null>(null);
  if (sessionKey !== null && sessionKey !== seededKey) {
    setSeededKey(sessionKey);
    setForm(opportunity ? fromOpportunity(opportunity) : empty);
    setDone(false);
  } else if (sessionKey === null && seededKey !== null) {
    setSeededKey(null);
  }

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const odds = Number(form.odds) || 0;
  const stake = Number(form.stake) || 0;
  const units = stake / DEFAULT_SETTINGS.unitSize;
  const potentialReturn = odds * stake;
  const valid = form.event.trim() && form.selection.trim() && odds > 1 && stake > 0;

  const submit = () => {
    if (!valid) return;
    const league = leagues.find((l) => l.id === form.leagueId);
    startTransition(async () => {
      await logBetAction({
        leagueId: form.leagueId,
        league: league?.name ?? "Fodbold",
        event: form.event.trim(),
        eventStartsAt: opportunity?.startsAt,
        market: form.market,
        marketLabel: MARKET_LABELS[form.market],
        selection: form.selection.trim(),
        bookmakerId: form.bookmakerId,
        odds,
        stake,
        status: form.status,
        expectedValue: opportunity?.expectedValue,
        notes: form.notes.trim() || undefined,
        sourceOpportunityId: opportunity?.id,
        tags: opportunity ? ["ai-feed"] : undefined,
      });
      setDone(true);
      router.refresh();
      setTimeout(onClose, 700);
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={opportunity ? "Log value bet til portfolio" : "Tilføj bet manuelt"}
      description={
        opportunity
          ? "Felterne er forudfyldt fra AI-feedet. Justér indsats og status inden du gemmer."
          : "Registrér et fodboldvæddemål du har placeret hos en bookmaker."
      }
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={pending}>
            Annullér
          </Button>
          <Button onClick={submit} loading={pending} disabled={!valid || done}>
            {done ? (
              <>
                <Check className="size-4" /> Gemt
              </>
            ) : (
              "Gem bet"
            )}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        {opportunity && (
          <div className="col-span-2 flex items-center justify-between rounded-[var(--radius-sm)] border border-primary/20 bg-primary/[0.07] px-3 py-2">
            <span className="text-xs text-muted">AI-vurdering af denne pris</span>
            <EvIndicator edge={opportunity.expectedValue} size="sm" />
          </div>
        )}

        <Field label="Liga" className="col-span-1">
          <Select
            value={form.leagueId}
            onChange={(e) => set("leagueId", e.target.value)}
            options={leagues.map((l) => ({ value: l.id, label: l.name }))}
          />
        </Field>
        <Field label="Marked" className="col-span-1">
          <Select
            value={form.market}
            onChange={(e) => set("market", e.target.value as MarketType)}
            options={Object.entries(MARKET_LABELS).map(([value, label]) => ({
              value,
              label,
            }))}
          />
        </Field>

        <Field label="Kamp" className="col-span-2">
          <Input
            value={form.event}
            onChange={(e) => set("event", e.target.value)}
            placeholder="Arsenal – Chelsea"
          />
        </Field>

        <Field label="Udfald" className="col-span-2">
          <Input
            value={form.selection}
            onChange={(e) => set("selection", e.target.value)}
            placeholder="Over 2.5 mål"
          />
        </Field>

        <Field label="Bookmaker" className="col-span-2">
          <Select
            value={form.bookmakerId}
            onChange={(e) => set("bookmakerId", e.target.value)}
            options={bookmakers.map((b) => ({ value: b.id, label: b.name }))}
          />
        </Field>

        <Field label="Odds" className="col-span-1">
          <Input
            type="number"
            step="0.01"
            min="1.01"
            value={form.odds}
            onChange={(e) => set("odds", e.target.value)}
            placeholder="2.10"
            className="tabular"
          />
        </Field>
        <Field
          label={`Indsats (${DEFAULT_SETTINGS.currency})`}
          className="col-span-1"
          hint={
            stake > 0
              ? `≈ ${units.toLocaleString("da-DK", { maximumFractionDigits: 2 })} units`
              : undefined
          }
        >
          <Input
            type="number"
            step="10"
            min="0"
            value={form.stake}
            onChange={(e) => set("stake", e.target.value)}
            className="tabular"
          />
        </Field>

        <Field label="Status" className="col-span-1">
          <Select
            value={form.status}
            onChange={(e) => set("status", e.target.value as BetStatus)}
            options={STATUS_OPTIONS.map((s) => ({
              value: s,
              label: BET_STATUS_LABELS[s],
            }))}
          />
        </Field>
        <div className="col-span-1 flex flex-col justify-end">
          <div className="rounded-[var(--radius-sm)] border border-line bg-bg px-3 py-2 text-xs">
            <div className="flex justify-between text-subtle">
              <span>Potentiel gevinst</span>
              <span className="tabular font-semibold text-fg">
                {potentialReturn > 0
                  ? formatCurrency(potentialReturn, DEFAULT_SETTINGS.currency)
                  : "–"}
              </span>
            </div>
            <div className="mt-1 flex justify-between text-subtle">
              <span>Netto ved gevinst</span>
              <span className="tabular text-positive">
                {potentialReturn > 0
                  ? `+${formatCurrency(potentialReturn - stake, DEFAULT_SETTINGS.currency)}`
                  : "–"}
              </span>
            </div>
          </div>
        </div>

        <Field label="Noter (valgfrit)" className="col-span-2">
          <textarea
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            rows={2}
            placeholder="Fx skadesnyt, line-bevægelse, egen model…"
            className="w-full rounded-[var(--radius-sm)] border border-line bg-bg px-3 py-2 text-[13px] text-fg outline-none transition-colors placeholder:text-subtle hover:border-line-strong focus-visible:border-primary/70 focus-visible:ring-2 focus-visible:ring-ring/25"
          />
        </Field>

        {opportunity && (
          <p className="col-span-2 text-[11px] text-subtle">
            Anbefalet Kelly-indsats:{" "}
            {formatPercent(opportunity.kellyFraction * DEFAULT_SETTINGS.kellyFraction, {
              digits: 2,
            })}{" "}
            af bankroll ({DEFAULT_SETTINGS.kellyFraction}× Kelly).
          </p>
        )}
      </div>
    </Modal>
  );
}
