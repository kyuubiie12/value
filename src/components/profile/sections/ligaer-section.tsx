"use client";

import * as React from "react";
import { ArrowDown, ArrowUp, Star, Trophy, X } from "lucide-react";
import type { League, UserSettings } from "@/types";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { LeagueCode } from "@/components/shared/league-badge";
import { Group, Panel, SectionHeader } from "../parts";
import type { FeedPulse, SetSetting } from "../types";

export function LigaerSection({
  form,
  set,
  leagues,
  pulse,
}: {
  form: UserSettings;
  set: SetSetting;
  leagues: League[];
  pulse: FeedPulse[];
}) {
  const fav = form.favoriteLeagueIds;
  const byId = new Map(leagues.map((l) => [l.id, l]));
  const count = (id: string) => pulse.filter((p) => p.leagueId === id).length;

  const toggle = (id: string) =>
    set("favoriteLeagueIds", fav.includes(id) ? fav.filter((x) => x !== id) : [...fav, id]);
  const move = (id: string, dir: -1 | 1) => {
    const i = fav.indexOf(id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= fav.length) return;
    const next = [...fav];
    [next[i], next[j]] = [next[j], next[i]];
    set("favoriteLeagueIds", next);
  };

  return (
    <Card>
      <SectionHeader
        icon={Trophy}
        title="Favoritligaer"
        desc="Dine ligaer vises øverst i feedet og er dem, du får alerts fra"
      />
      <CardContent className="flex flex-col gap-8">
        <Group
          title="Vælg ligaer"
          hint="Tallet er hvor mange value bets der er i ligaen lige nu."
          aside={
            fav.length > 0 && (
              <button
                type="button"
                onClick={() => set("favoriteLeagueIds", [])}
                className="text-[11.5px] font-medium text-subtle transition-colors hover:text-fg"
              >
                Ryd valg
              </button>
            )
          }
        >
          <div className="grid gap-2.5 sm:grid-cols-2">
            {leagues.map((l) => {
              const on = fav.includes(l.id);
              const n = count(l.id);
              return (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => toggle(l.id)}
                  aria-pressed={on}
                  className={cn(
                    "glow-hover flex items-center gap-3 rounded-card border p-3 text-left transition-[border-color,background-color,box-shadow] duration-200",
                    on
                      ? "border-primary/50 bg-primary/[0.06]"
                      : "border-line/70 bg-surface-2/40 hover:border-line-strong",
                  )}
                >
                  <LeagueCode code={l.shortName} accent={l.accent} className="shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium text-fg">{l.name}</span>
                    <span className="text-[11px] text-subtle">{l.country}</span>
                  </span>
                  <span
                    className={cn(
                      "tabular rounded-full px-2 py-0.5 text-[11px] font-semibold",
                      n > 0 ? "bg-surface-3 text-muted" : "text-subtle",
                    )}
                    title={`${n} value bets i dag`}
                  >
                    {n}
                  </span>
                  <Star
                    className={cn(
                      "size-4 shrink-0 transition-colors",
                      on ? "fill-primary text-primary" : "text-line-strong",
                    )}
                    aria-hidden
                  />
                </button>
              );
            })}
          </div>
        </Group>

        <Group
          title="Din rækkefølge i feedet"
          hint={
            fav.length > 1
              ? "Flyt ligaerne op og ned — øverst vises først."
              : "Vælg en eller flere ligaer for at bestemme rækkefølgen."
          }
        >
          {fav.length === 0 ? (
            <Panel className="text-[12.5px] text-subtle">
              Ingen favoritter endnu — feedet sorteres efter value score.
            </Panel>
          ) : (
            <ol className="flex flex-col gap-2">
              {fav.map((id, i) => {
                const l = byId.get(id);
                if (!l) return null;
                return (
                  <li
                    key={id}
                    className="flex items-center gap-3 rounded-card border border-line/60 bg-surface-2/40 py-2 pl-3.5 pr-2"
                  >
                    <span className="tabular grid size-6 place-items-center rounded-full bg-primary/12 text-[11px] font-bold text-primary-strong">
                      {i + 1}
                    </span>
                    <LeagueCode code={l.shortName} accent={l.accent} />
                    <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-fg">
                      {l.name}
                    </span>
                    <div className="flex items-center gap-0.5">
                      <RowBtn label="Flyt op" disabled={i === 0} onClick={() => move(id, -1)}>
                        <ArrowUp className="size-3.5" />
                      </RowBtn>
                      <RowBtn
                        label="Flyt ned"
                        disabled={i === fav.length - 1}
                        onClick={() => move(id, 1)}
                      >
                        <ArrowDown className="size-3.5" />
                      </RowBtn>
                      <RowBtn label={`Fjern ${l.name}`} onClick={() => toggle(id)}>
                        <X className="size-3.5" />
                      </RowBtn>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </Group>
      </CardContent>
    </Card>
  );
}

function RowBtn({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="grid size-8 place-items-center rounded-full text-subtle transition-colors hover:bg-surface-3 hover:text-fg disabled:pointer-events-none disabled:opacity-30"
    >
      {children}
    </button>
  );
}
