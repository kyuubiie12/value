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

function averageOf(values: number[]): number {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
}

/** Player props: the case is the player's own last matches against the price. */
function explainHistory(o: ValueOpportunity, bookName: string): Explanation {
  const st = o.playerStats!;
  const h = st.history!;
  const breakEven = 1 / o.bestOdds;
  const counts = h.counts.join(", ");

  const points = [
    `${st.player} har ramt ${st.line}+ ${st.metric} i ${h.hits} af sine seneste ${h.n} kampe (${counts}, nyeste først) — det er ${pct(h.hitRate, 0)} af kampene.`,
    `${bookName} giver ${formatOdds(o.bestOdds)}, og den pris kræver kun, at det sker i ${pct(breakEven, 0)} af kampene for at gå lige op.`,
    `Med kun ${h.n} kampe kan held spille ind, så vi regner pessimistisk: selv hvis han er heldig i de seneste kampe, lander han stadig mindst ${pct(st.modelProbability, 0)} af gangene. Det svarer til fair odds ${formatOdds(st.modelFairOdds)}.`,
    `Forskellen er dit forventede overskud: ${formatPercent(o.expectedValue, { signed: true })} af indsatsen på sigt${
      st.perGame ? `. Hans gennemsnit er ${st.perGame.toFixed(1).replace(".", ",")} ${st.metric} pr. kamp` : ""
    }.`,
  ];

  return {
    headline: `${st.player} har ramt ${st.line}+ ${st.metric} i ${h.hits} af ${h.n} kampe — ${bookName} giver ${formatOdds(o.bestOdds)}, som kun kræver ${pct(breakEven, 0)}.`,
    points,
    caveat:
      "Bygger kun på hans egne seneste kampe — ikke på modstanderen, om han starter, eller hvor mange minutter han får. Tjek opstillingen, før du spiller, og brug små indsatser. Spillet annulleres normalt, hvis han ikke kommer på banen.",
  };
}

export function explainOpportunity(o: ValueOpportunity): Explanation {
  const bookName = getBookmaker(o.bestBookmakerId)?.name ?? o.bestBookmakerId;
  if (o.fairBasis === "history" && o.playerStats?.history) return explainHistory(o, bookName);

  const breakEven = 1 / o.bestOdds;
  const gapPoints = (o.fairProbability - breakEven) * 100;
  const consensus = o.fairBasis === "consensus";
  const others = o.quotes.filter((q) => q.bookmakerId !== o.bestBookmakerId);

  const points: string[] = [];
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
    : `Prisen er ${formatPercent(o.bestOdds / o.fairOdds - 1, { digits: 0 })} over fair odds fra Pinnacle.`;

  const caveat = consensus
    ? "Det her er en prisforskel mellem bookmakere, ikke en bevist fejl. Tjek at linjen er den samme, før du spiller, og brug små indsatser."
    : "Value betyder ikke, at spillet vinder — kun at prisen er bedre end chancen. Det betaler sig over mange spil, ikke hvert enkelt.";

  return { headline, points, caveat };
}
