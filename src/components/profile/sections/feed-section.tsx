"use client";

import * as React from "react";
import { SlidersHorizontal } from "lucide-react";
import type { UserSettings } from "@/types";
import { formatPercent } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Group, Panel, SectionHeader, SliderField, ThresholdChart } from "../parts";
import type { FeedPulse, SetSetting } from "../types";

const EDGE_MARKS = [
  { value: 0, label: "0 %" },
  { value: 0.025, label: "2,5" },
  { value: 0.05, label: "5" },
  { value: 0.075, label: "7,5" },
  { value: 0.1, label: "10 %" },
];

export function FeedSection({
  form,
  set,
  pulse,
}: {
  form: UserSettings;
  set: SetSetting;
  pulse: FeedPulse[];
}) {
  const edges = pulse.map((p) => p.ev);
  const playable = pulse.filter((p) =>
    p.quotedBy.some((id) => form.activeBookmakerIds.includes(id)),
  );
  const wouldFollow = playable.filter((p) => p.ev >= form.autoFollowMinEdge).length;

  return (
    <Card>
      <SectionHeader
        icon={SlidersHorizontal}
        title="Feed & value"
        desc="Hvor skarpt feedet skal filtrere — og om AI'en må lægge spil i din portefølje for dig"
      />
      <CardContent className="flex flex-col gap-8">
        <Group
          title="Minimum værdi i feedet"
          hint="Spil med lavere forventet værdi (EV) kommer slet ikke frem."
        >
          <Panel className="flex flex-col gap-6">
            <SliderField
              id="p-minedge"
              label="Skjul value bets under"
              value={form.minEdge}
              min={0}
              max={0.1}
              step={0.005}
              onChange={(v) => set("minEdge", Number(v.toFixed(3)))}
              format={(v) => `${formatPercent(v, { digits: 1 })} EV`}
              marks={EDGE_MARKS}
            />
            <ThresholdChart edges={edges} threshold={form.minEdge} />
          </Panel>
          <p className="mt-3 text-[11.5px] leading-relaxed text-subtle">
            Feedet regner kun value på de bookmakere du har valgt, og sorterer dine
            favoritligaer øverst.
          </p>
        </Group>

        <Group
          title="Følg AI'ens picks automatisk"
          hint="Lægger nye value bets i din portefølje som åbne spil — du afgør dem selv bagefter."
        >
          <Panel tone={form.autoFollow ? "accent" : "default"} className="flex flex-col gap-5">
            <Switch
              id="p-autofollow"
              checked={form.autoFollow}
              onChange={(v) => set("autoFollow", v)}
              label="Auto-følg"
              description="Hvert nyt value bet over grænsen får den anbefalede Kelly-indsats."
            />
            {form.autoFollow && (
              <>
                <SliderField
                  id="p-autofollow-edge"
                  label="Følg kun bets over"
                  value={form.autoFollowMinEdge}
                  min={0}
                  max={0.1}
                  step={0.005}
                  onChange={(v) => set("autoFollowMinEdge", Number(v.toFixed(3)))}
                  format={(v) => `${formatPercent(v, { digits: 1 })} EV`}
                  marks={EDGE_MARKS}
                  hint="Højere grænse = færre, men skarpere spil."
                />
                <p className="rounded-[var(--radius-sm)] bg-bg/50 px-3.5 py-2.5 text-[12px] text-muted">
                  Med dine nuværende valg ville{" "}
                  <span className="tabular font-semibold text-fg">{wouldFollow}</span> af dagens{" "}
                  <span className="tabular">{pulse.length}</span> value bets blive fulgt.
                </p>
                <ul className="flex flex-col gap-1 text-[11.5px] leading-relaxed text-subtle">
                  <li>• Kun bets hos dine valgte bookmakere følges.</li>
                  <li>• Fjerner du et auto-spil, følger AI&apos;en det ikke igen.</li>
                  <li>• Har du sat en ugentlig indsatsgrænse, stopper auto-følg når den er nået.</li>
                </ul>
              </>
            )}
          </Panel>
        </Group>
      </CardContent>
    </Card>
  );
}
