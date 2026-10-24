"use client";

import * as React from "react";
import { Check, Landmark, ShieldCheck } from "lucide-react";
import type { Bookmaker, UserSettings } from "@/types";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { BookmakerLogo } from "@/components/shared/bookmaker-logo";
import { Group, Metric, QuickChip, SectionHeader } from "../parts";
import type { FeedPulse, SetSetting } from "../types";

export function BookmakereSection({
  form,
  set,
  bookmakers,
  pulse,
}: {
  form: UserSettings;
  set: SetSetting;
  bookmakers: Bookmaker[];
  pulse: FeedPulse[];
}) {
  const active = form.activeBookmakerIds;
  const toggle = (id: string) =>
    set(
      "activeBookmakerIds",
      active.includes(id) ? active.filter((x) => x !== id) : [...active, id],
    );

  const playable = pulse.filter((p) => p.quotedBy.some((id) => active.includes(id))).length;
  const stat = (id: string) => ({
    best: pulse.filter((p) => p.bestBookmakerId === id).length,
    quoted: pulse.filter((p) => p.quotedBy.includes(id)).length,
  });

  return (
    <Card>
      <SectionHeader
        icon={Landmark}
        title="Mine bookmakere"
        desc="Vælg hvor du har konti — feedet regner kun value på de odds du faktisk kan spille"
      />
      <CardContent className="flex flex-col gap-7">
        <div className="grid gap-3 sm:grid-cols-3">
          <Metric
            label="Du spiller hos"
            value={
              <>
                {active.length}
                <span className="text-[13px] font-medium text-subtle"> / {bookmakers.length}</span>
              </>
            }
            sub="bookmakere"
          />
          <Metric
            label="Dækning i dag"
            value={
              <>
                {playable}
                <span className="text-[13px] font-medium text-subtle"> / {pulse.length}</span>
              </>
            }
            tone={pulse.length && playable / pulse.length < 0.6 ? "warning" : "primary"}
            sub="value bets du kan spille"
          />
          <div className="flex items-center gap-2 sm:justify-end sm:self-center">
            <QuickChip
              active={active.length === bookmakers.length}
              onClick={() => set("activeBookmakerIds", bookmakers.map((b) => b.id))}
            >
              Vælg alle
            </QuickChip>
            <QuickChip active={active.length === 0} onClick={() => set("activeBookmakerIds", [])}>
              Ryd
            </QuickChip>
          </div>
        </div>

        {active.length === 0 && (
          <p className="rounded-card border border-warning/30 bg-warning/[0.06] px-4 py-3 text-[12.5px] text-warning">
            Du har ikke valgt nogen bookmakere — så er feedet tomt. Vælg mindst én.
          </p>
        )}

        <Group
          title="Bookmakere"
          hint="Tallene viser hvor ofte hver bog har den bedste pris på dagens value bets."
        >
          <div className="grid gap-2.5 sm:grid-cols-2">
            {bookmakers.map((b) => {
              const on = active.includes(b.id);
              const s = stat(b.id);
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => toggle(b.id)}
                  aria-pressed={on}
                  className={cn(
                    "glow-hover flex items-center gap-3.5 rounded-card border p-3.5 text-left transition-[border-color,background-color,box-shadow] duration-200",
                    on
                      ? "border-primary/50 bg-primary/[0.06]"
                      : "border-line/70 bg-surface-2/40 hover:border-line-strong",
                  )}
                >
                  <span className="flex w-[84px] shrink-0 items-center justify-center">
                    <BookmakerLogo bookmakerId={b.id} size="md" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 truncate text-[13px] font-semibold text-fg">
                      {b.name}
                      {b.isSharp && (
                        <span
                          title="Sharp bog — bruges som referencepris til fair odds"
                          className="inline-flex items-center gap-0.5 rounded-full bg-info/12 px-1.5 py-px text-[9.5px] font-semibold text-info"
                        >
                          <ShieldCheck className="size-2.5" aria-hidden />
                          Sharp
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 block text-[11.5px] text-subtle">
                      {b.isSharp ? "Referencepris til fair odds" : b.country}
                    </span>
                    {!b.isSharp && (
                      <span className="tabular mt-1.5 block text-[11px] text-muted">
                        Bedste pris på <span className="font-semibold text-fg">{s.best}</span> ·
                        prissætter {s.quoted}
                      </span>
                    )}
                  </span>
                  <span
                    aria-hidden
                    className={cn(
                      "grid size-5 shrink-0 place-items-center rounded-full border transition-colors",
                      on
                        ? "border-primary bg-primary text-primary-contrast"
                        : "border-line-strong",
                    )}
                  >
                    {on && <Check className="size-3" strokeWidth={3} />}
                  </span>
                </button>
              );
            })}
          </div>
        </Group>
      </CardContent>
    </Card>
  );
}
