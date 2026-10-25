import type { ValueOpportunity } from "@/types";

/**
 * A single 0–100 "hvor godt er dette value bet"-tal. Edge is the dominant
 * driver; confidence and a sharp-confirmed price move add on top. Pure so the
 * feed, the hero and the detail view all agree.
 */
export function valueScore(o: ValueOpportunity): number {
  // A gap between soft books (no sharp reference) counts for half as much as sharp-backed edge.
  const trust = o.fairBasis === "consensus" ? 0.5 : 1;
  const edgePts = Math.min(68, (o.edgePercent / 12) * 68) * trust;
  const confPts = { low: 6, medium: 16, high: 24 }[o.confidence];
  const movePts =
    o.priceMovement === "shortening" ? 6 : o.priceMovement === "stable" ? 3 : 0;
  const bookPts = Math.min(2, (o.booksCount - 4) * 0.4);
  return Math.round(Math.max(0, Math.min(100, edgePts + confPts + movePts + bookPts)));
}

export function valueScoreLabel(score: number): string {
  if (score >= 80) return "Fremragende";
  if (score >= 62) return "Stærk";
  if (score >= 42) return "God";
  return "Marginal";
}

export function valueScoreTone(
  score: number,
): "primary" | "positive" | "warning" {
  if (score >= 62) return "primary";
  if (score >= 42) return "positive";
  return "warning";
}
