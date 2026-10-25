import type { ValueOpportunity } from "@/types";
import { getBookmaker } from "@/lib/mock-data";
import { formatOdds, formatPercent } from "@/lib/format";

/**
 * Plain-language "why is this value?" built only from the numbers we hold —
 * no model involved, so every sentence can be checked against the odds board.
 * The AI summary (when configured) is written on top of exactly these facts.
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

export function explainOpportunity(o: ValueOpportunity): Explanation {
  const bookName = getBookmaker(o.bestBookmakerId)?.name ?? o.bestBookmakerId;
  const breakEven = 1 / o.bestOdds;
  const gapPoints = (o.fairProbability - breakEven) * 100;
  const consensus = o.fairBasis === "consensus";
  const others = o.quotes.filter((q) => q.bookmakerId !== o.bestBookmakerId);

  const points: string[] = [];
  const st = o.playerStats;
  const yy = (y: number) => `${y}/${String((y + 1) % 100).padStart(2, "0")}`;
  const seasonLabel = st
    ? st.fromSeason && st.fromSeason < st.season
      ? `${yy(st.fromSeason)} og ${yy(st.season)}`
      : yy(st.season)
    : "";

  // What the player has actually done — the evidence a user can relate to.
  if (st) {
    const rate = st.perGame.toFixed(1).replace(".", ",");
    points.push(
      `${st.player} har i ${seasonLabel} ${st.total} ${st.metric} på ${st.games} kampe — ${rate} pr. kamp.`,
    );
    points.push(
      `Med den rate rammer han ${st.line}+ ${st.metric} i ca. ${pct(st.modelProbability, 0)} af kampene. Det svarer til fair odds på ${formatOdds(st.modelFairOdds)} — og ${bookName} giver ${formatOdds(o.bestOdds)}.`,
    );
  }

  if (consensus) {
    points.push(
      `${bookName} giver ${formatOdds(o.bestOdds)} på ${o.selection}. ${others.length} andre danske bookmakere prissætter samme spiller og linje til i snit ${formatOdds(averageOf(others.map((q) => q.price)))}.`,
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

  const headline = st
    ? `${st.player} tager ${st.perGame.toFixed(1).replace(".", ",")} ${st.metric} pr. kamp, så ${st.line}+ lander i ca. ${pct(st.modelProbability, 0)} af kampene. Prisen hos ${bookName} (${formatOdds(o.bestOdds)}) kræver kun ${pct(1 / o.bestOdds, 0)}.`
    : consensus
    ? `${bookName} giver ${formatOdds(o.bestOdds)} — de andre danske bookmakere giver i snit ${formatOdds(averageOf(others.map((q) => q.price)))} på det samme spil.`
    : `Prisen er ${formatPercent(o.bestOdds / o.fairOdds - 1, { digits: 0 })} over fair odds fra Pinnacle.`;

  const caveat = consensus
    ? "Der findes ingen skarp bookmaker på spiller-props, så det her er en prisforskel mellem bookmakere, ikke en bevist fejl. Tjek at linjen er den samme, før du spiller, og brug små indsatser."
    : "Value betyder ikke, at spillet vinder — kun at prisen er bedre end chancen. Det betaler sig over mange spil, ikke hvert enkelt.";

  const statNote = st
    ? " Statistikken ser kun på hans gennemsnit i sæsonen — ikke på modstanderen, om han starter eller hvor mange minutter han får."
    : "";
  return { headline, points, caveat: caveat + statNote };
}

function averageOf(values: number[]): number {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
}
