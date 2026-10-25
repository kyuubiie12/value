import type { TeamFormMatch, ValueOpportunity } from "@/types";
import { getBookmaker } from "@/lib/mock-data";
import { formatOdds, formatPercent } from "@/lib/format";

/**
 * Plain-language "why is this value?" built only from the numbers we hold —
 * no model involved, so every sentence can be checked against the odds board.
 * It always leads with the statistics a reader can recognise (what the player or
 * the teams have actually done), then the price argument. The AI summary (when
 * configured) is written on top of exactly these facts.
 */
export interface Explanation {
  /** One-line version of the argument. */
  headline: string;
  /** The facts behind it, in reading order. */
  points: string[];
  /** What the user should keep in mind before betting. */
  caveat: string;
}

const pct = (n: number, digits = 1) => formatPercent(n, { digits });
const dec = (n: number, digits = 1) => n.toFixed(digits).replace(".", ",");
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

function averageOf(values: number[]): number {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
}

/** "3, 4, 2" for the newest matches first. */
const list = (xs: number[]) => xs.join(", ");

/** Player props: the case is what he has actually done, set against the price. */
function explainHistory(o: ValueOpportunity, bookName: string): Explanation {
  const st = o.playerStats!;
  const h = st.history!;
  const breakEven = 1 / o.bestOdds;
  const last5 = h.counts.slice(0, 5);
  const avg5 = mean(last5);
  const hits5 = last5.filter((c) => c >= st.line).length;
  const avg10 = mean(h.counts);

  const points = [
    `De seneste ${last5.length} kampe: ${list(last5)} ${st.metric} — i snit ${dec(avg5)} pr. kamp. Han nåede ${st.line}+ i ${hits5} af ${last5.length}.`,
    ...(h.n > last5.length
      ? [`De seneste ${h.n} kampe: i snit ${dec(avg10)} pr. kamp, og han nåede ${st.line}+ i ${h.hits} af ${h.n} (${pct(h.hitRate, 0)}).`]
      : []),
    `${bookName} giver ${formatOdds(o.bestOdds)} på ${st.line}+ — den pris kræver kun, at det sker i ${pct(breakEven, 0)} af kampene for at gå lige op.`,
    `Med kun ${h.n} kampe kan held spille ind, så vi regner pessimistisk: selv hvis han er heldig i de seneste kampe, lander han stadig mindst ${pct(st.modelProbability, 0)} af gangene. Det svarer til fair odds ${formatOdds(st.modelFairOdds)} — prisen er højere, og forskellen er dit forventede overskud: ${formatPercent(o.expectedValue, { signed: true })} af indsatsen på sigt.`,
  ];

  return {
    headline: `${st.player} har lavet i snit ${dec(avg5)} ${st.metric} de seneste ${last5.length} kampe — og ${st.line}+ er prissat til ${formatOdds(o.bestOdds)} hos ${bookName}.`,
    points,
    caveat:
      "Bygger kun på hans egne seneste kampe — ikke på modstanderen, om han starter, eller hvor mange minutter han får. Tjek opstillingen, før du spiller, og brug små indsatser. Spillet annulleres normalt, hvis han ikke kommer på banen.",
  };
}

const result = (m: TeamFormMatch) => (m.gf > m.ga ? "V" : m.gf < m.ga ? "T" : "U");

/** Team form lines for result / goals bets — the numbers a reader can recognise. */
function formPoints(o: ValueOpportunity): string[] {
  const f = o.teamForm;
  if (!f) return [];
  const home = f.home.slice(0, 5);
  const away = f.away.slice(0, 5);
  if (home.length < 3 || away.length < 3) return [];
  const goals = (ms: TeamFormMatch[]) => dec(mean(ms.map((m) => m.gf + m.ga)));
  const line = (name: string, ms: TeamFormMatch[]) =>
    `${name} (seneste ${ms.length}, nyeste først): ${ms.map(result).join(" ")} — scorer ${dec(mean(ms.map((m) => m.gf)))} og lukker ${dec(mean(ms.map((m) => m.ga)))} ind pr. kamp`;
  const side = (t: string) => (t === o.homeTeam ? home : t === o.awayTeam ? away : null);
  const sel = o.selection;
  const lineNo = /(\d+(?:[.,]\d+)?)/.exec(sel)?.[1]?.replace(",", ".");
  const threshold = lineNo ? Number(lineNo) : null;
  const over = /^over|\bover\b/i.test(sel) && !/^under/i.test(sel);

  switch (o.market) {
    case "over-under": {
      if (threshold === null) break;
      const hit = (ms: TeamFormMatch[]) => ms.filter((m) => (over ? m.gf + m.ga > threshold : m.gf + m.ga < threshold)).length;
      const w = over ? "over" : "under";
      return [
        `Seneste ${home.length} kampe med ${w} ${dec(threshold)} mål: ${o.homeTeam} ${hit(home)} af ${home.length} (snit ${goals(home)} mål pr. kamp), ${o.awayTeam} ${hit(away)} af ${away.length} (snit ${goals(away)}).`,
      ];
    }
    case "team-total": {
      if (threshold === null) break;
      const team = [o.homeTeam, o.awayTeam].find((t) => sel.startsWith(t));
      const ms = team ? side(team) : null;
      if (!team || !ms) break;
      const hit = ms.filter((m) => (over ? m.gf > threshold : m.gf < threshold)).length;
      return [
        `${team} har scoret ${ms.map((m) => m.gf).join(", ")} mål i de seneste ${ms.length} kampe (snit ${dec(mean(ms.map((m) => m.gf)))}) — ${hit} af ${ms.length} gange ${over ? "over" : "under"} ${dec(threshold)}.`,
      ];
    }
    case "corners": {
      if (threshold === null) break;
      const has = (ms: TeamFormMatch[]) => ms.filter((m) => typeof m.cf === "number" && typeof m.ca === "number");
      const h = has(home);
      const a = has(away);
      if (h.length < 3 || a.length < 3) break;
      const total = (m: TeamFormMatch) => (m.cf ?? 0) + (m.ca ?? 0);
      const avg = (ms: TeamFormMatch[]) => dec(mean(ms.map(total)));
      const hit = (ms: TeamFormMatch[]) => ms.filter((m) => (over ? total(m) > threshold : total(m) < threshold)).length;
      const w = over ? "over" : "under";
      return [
        `Seneste ${h.length} kampe med ${w} ${dec(threshold)} hjørnespark: ${o.homeTeam} ${hit(h)} af ${h.length} (snit ${avg(h)} hjørnespark pr. kamp, ${dec(mean(h.map((m) => m.cf ?? 0)))} for og ${dec(mean(h.map((m) => m.ca ?? 0)))} imod), ${o.awayTeam} ${hit(a)} af ${a.length} (snit ${avg(a)}).`,
      ];
    }
    case "1x2":
    case "draw-no-bet":
    case "double-chance":
    case "asian-handicap":
      return [`${line(o.homeTeam, home)}.`, `${line(o.awayTeam, away)}.`];
    default:
      break;
  }
  return [];
}

export function explainOpportunity(o: ValueOpportunity): Explanation {
  const bookName = getBookmaker(o.bestBookmakerId)?.name ?? o.bestBookmakerId;
  if (o.fairBasis === "history" && o.playerStats?.history) return explainHistory(o, bookName);

  const breakEven = 1 / o.bestOdds;
  const gapPoints = (o.fairProbability - breakEven) * 100;
  const consensus = o.fairBasis === "consensus";
  const others = o.quotes.filter((q) => q.bookmakerId !== o.bestBookmakerId);

  // Evidence first: what the teams have actually done lately.
  const stats = formPoints(o);
  const points: string[] = [...stats];

  if (consensus) {
    points.push(
      `${bookName} giver ${formatOdds(o.bestOdds)} på ${o.selection}. ${others.length} andre danske bookmakere prissætter samme spil til i snit ${formatOdds(averageOf(others.map((q) => q.price)))}.`,
    );
    points.push(
      `Efter vi har fjernet en typisk bookmakermargin (ca. 7 %), svarer de andres priser til fair odds på ${formatOdds(o.fairOdds)} — en chance på ca. ${pct(o.fairProbability, 0)}.`,
    );
  } else {
    points.push(
      `Pinnacle, den skarpeste bookmaker, prissætter ${o.selection} så chancen er ca. ${pct(o.fairProbability, 0)} — fair odds ${formatOdds(o.fairOdds)} når bookmakerens margin er fjernet.`,
    );
    points.push(
      `${bookName} giver ${formatOdds(o.bestOdds)}. Det er ${formatPercent(o.bestOdds / o.fairOdds - 1, { digits: 1 })} mere end fair odds, og ${o.booksCount} ${o.booksCount === 1 ? "bookmaker" : "bookmakere"} prissætter spillet.`,
    );
  }

  points.push(
    `Til ${formatOdds(o.bestOdds)} skal spillet vinde ${pct(breakEven, 0)} af gangene for at gå lige op. Vi vurderer ${pct(o.fairProbability, 0)} — ${gapPoints.toFixed(1).replace(".", ",")} procentpoint mere. Det er dit forventede overskud: ${formatPercent(o.expectedValue, { signed: true })} af indsatsen på sigt.`,
  );

  if (o.priceMovement !== "stable" && o.openingOdds !== o.bestOdds) {
    points.push(
      o.priceMovement === "shortening"
        ? `Prisen er faldet fra ${formatOdds(o.openingOdds)} til ${formatOdds(o.bestOdds)} siden vi fandt den — markedet er ved at give os ret.`
        : `Prisen er steget fra ${formatOdds(o.openingOdds)} til ${formatOdds(o.bestOdds)} siden vi fandt den — tjek at den stadig står sådan.`,
    );
  }

  const headline = consensus
    ? `${bookName} giver ${formatOdds(o.bestOdds)} — de andre danske bookmakere giver i snit ${formatOdds(averageOf(others.map((q) => q.price)))} på det samme spil.`
    : stats.length && (o.market === "over-under" || o.market === "team-total" || o.market === "corners")
      ? `${stats[0].replace(/\.$/, "")}. Prisen hos ${bookName} er ${formatPercent(o.bestOdds / o.fairOdds - 1, { digits: 0 })} over Pinnacles fair odds.`
      : `Prisen er ${formatPercent(o.bestOdds / o.fairOdds - 1, { digits: 0 })} over fair odds fra Pinnacle.`;

  const caveat = consensus
    ? "Det her er en prisforskel mellem bookmakere, ikke en bevist fejl. Tjek at linjen er den samme, før du spiller, og brug små indsatser."
    : "Value betyder ikke, at spillet vinder — kun at prisen er bedre end chancen. Det betaler sig over mange spil, ikke hvert enkelt.";

  return { headline, points, caveat };
}
