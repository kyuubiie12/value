"use client";

import * as React from "react";
import { Globe2, Lock, UserRound } from "lucide-react";
import type { UserSettings } from "@/types";
import { formatCurrency } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Group, Metric, Panel, SectionHeader } from "../parts";
import type { SetSetting } from "../types";

const TIMEZONES = [
  { value: "Europe/Copenhagen", label: "København (CET/CEST)" },
  { value: "Europe/London", label: "London (GMT/BST)" },
  { value: "Europe/Stockholm", label: "Stockholm (CET/CEST)" },
  { value: "UTC", label: "UTC" },
];

/** Wall-clock time in a zone, ticking every 20 s. `null` until mounted (SSR-safe). */
function useZonedClock(timeZone: string) {
  const [text, setText] = React.useState<string | null>(null);
  React.useEffect(() => {
    const fmt = () => {
      try {
        setText(
          new Intl.DateTimeFormat("da-DK", {
            timeZone,
            weekday: "short",
            hour: "2-digit",
            minute: "2-digit",
          }).format(new Date()),
        );
      } catch {
        setText(null);
      }
    };
    fmt();
    const t = setInterval(fmt, 20_000);
    return () => clearInterval(t);
  }, [timeZone]);
  return text;
}

export function KontoSection({
  form,
  set,
}: {
  form: UserSettings;
  set: SetSetting;
}) {
  const clock = useZonedClock(form.timezone);
  const initials =
    form.displayName
      .split(" ")
      .map((w) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "VB";

  return (
    <Card>
      <SectionHeader
        icon={UserRound}
        title="Konto"
        desc="Hvem du er i appen, og hvordan tal og tidspunkter vises for dig"
      />
      <CardContent className="flex flex-col gap-8">
        <Group title="Personligt">
          <Panel className="flex flex-col gap-5 sm:flex-row sm:items-start">
            <span
              aria-hidden
              className="grid size-16 shrink-0 place-items-center rounded-[20px] bg-primary/12 font-display text-xl font-bold text-primary-strong ring-1 ring-inset ring-primary/25"
            >
              {initials}
            </span>
            <div className="grid min-w-0 flex-1 gap-4 sm:grid-cols-2">
              <Field label="Visningsnavn" htmlFor="p-name">
                <Input
                  id="p-name"
                  value={form.displayName}
                  onChange={(e) => set("displayName", e.target.value)}
                />
              </Field>
              <Field label="Login-e-mail" htmlFor="p-email">
                <div className="relative">
                  <Input
                    id="p-email"
                    type="email"
                    value={form.email}
                    disabled
                    className="pr-9"
                  />
                  <Lock
                    className="pointer-events-none absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-subtle"
                    aria-hidden
                  />
                </div>
                <p className="mt-1 text-[11px] text-subtle">
                  Kan ikke ændres her — den er dit login.
                </p>
              </Field>
            </div>
          </Panel>
        </Group>

        <Group
          title="Region & format"
          hint="Styrer valuta på alle beløb og hvilken tid kickoff vises i."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Valuta" htmlFor="p-currency">
              <Select
                id="p-currency"
                value={form.currency}
                onChange={(e) =>
                  set("currency", e.target.value as UserSettings["currency"])
                }
                options={[
                  { value: "DKK", label: "DKK — Danske kroner" },
                  { value: "EUR", label: "EUR — Euro" },
                  { value: "USD", label: "USD — US dollar" },
                ]}
              />
            </Field>
            <Field label="Tidszone" htmlFor="p-tz">
              <Select
                id="p-tz"
                value={form.timezone}
                onChange={(e) => set("timezone", e.target.value)}
                options={TIMEZONES}
              />
            </Field>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Metric
              label="Beløb ser sådan ud"
              value={formatCurrency(12345.5, form.currency, { maximumFractionDigits: 2 })}
            />
            <Metric
              label="Lokal tid nu"
              value={clock ?? "—"}
              sub={
                <span className="inline-flex items-center gap-1">
                  <Globe2 className="size-3" aria-hidden />
                  {form.timezone}
                </span>
              }
            />
            <Metric
              label="Abonnement"
              value={form.plan === "pro" ? "Pro" : "Free"}
              tone={form.plan === "pro" ? "primary" : "neutral"}
              sub="Analyse og tracking — ingen spil formidles"
            />
          </div>
        </Group>
      </CardContent>
    </Card>
  );
}
