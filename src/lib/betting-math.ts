/**
 * Pure betting-maths helpers. No app / UI dependencies so they can be unit
 * tested and reused by the (future) AI model layer.
 */

/** Probability implied by a decimal price (includes the book's margin). */
export function impliedProbability(decimalOdds: number): number {
  return decimalOdds > 0 ? 1 / decimalOdds : 0;
}

/** Total book margin ("overround") for a set of decimal odds on one market. */
export function bookMargin(decimalOdds: number[]): number {
  return decimalOdds.reduce((sum, o) => sum + impliedProbability(o), 0) - 1;
}

/**
 * Remove the vig from a market by normalising implied probabilities so they
 * sum to 1. Returns the fair probability for each outcome, in input order.
 */
export function removeVig(decimalOdds: number[]): number[] {
  const implied = decimalOdds.map(impliedProbability);
  const overround = implied.reduce((a, b) => a + b, 0);
  if (overround <= 0) return decimalOdds.map(() => 0);
  return implied.map((p) => p / overround);
}

/**
 * De-vig with the power method: find k so that the implied probabilities raised to k
 * sum to 1. Unlike the proportional method it does not hand long shots a share of the
 * bookmaker's margin they never carried, so fair prices on 8.0+ odds are not too short
 * (the favourite–longshot bias). Near-identical to `removeVig` on balanced markets.
 */
export function removeVigPower(decimalOdds: number[]): number[] {
  const implied = decimalOdds.map(impliedProbability);
  const sum = implied.reduce((a, b) => a + b, 0);
  if (!(sum > 1) || implied.some((p) => !(p > 0 && p < 1))) return removeVig(decimalOdds);
  let lo = 1;
  let hi = 25;
  for (let i = 0; i < 60; i++) {
    const k = (lo + hi) / 2;
    const s = implied.reduce((a, p) => a + p ** k, 0);
    if (s > 1) lo = k;
    else hi = k;
  }
  const k = (lo + hi) / 2;
  return implied.map((p) => p ** k);
}

/** Fair decimal odds for one outcome given the full field of prices. */
export function fairOdds(decimalOdds: number[], outcomeIndex: number): number {
  const fair = removeVig(decimalOdds)[outcomeIndex];
  return fair > 0 ? 1 / fair : 0;
}

/**
 * Expected value per unit staked.
 * @param decimalOdds price you can bet at
 * @param trueProbability your estimate of the real win probability (0–1)
 * @returns fraction of stake, e.g. 0.074 = +7.4%
 */
export function expectedValue(decimalOdds: number, trueProbability: number): number {
  const b = decimalOdds - 1;
  return trueProbability * b - (1 - trueProbability);
}

/** EV expressed as a percentage. */
export function edgePercent(decimalOdds: number, trueProbability: number): number {
  return expectedValue(decimalOdds, trueProbability) * 100;
}

/**
 * Kelly-optimal stake as a fraction of bankroll.
 * @param fraction Kelly multiplier (1 = full, 0.25 = quarter Kelly)
 */
export function kellyStake(
  decimalOdds: number,
  trueProbability: number,
  fraction = 1,
): number {
  const b = decimalOdds - 1;
  if (b <= 0) return 0;
  const q = 1 - trueProbability;
  const f = (b * trueProbability - q) / b;
  return Math.max(0, f) * fraction;
}

/** Return on investment: profit relative to total amount staked. */
export function roi(profit: number, staked: number): number {
  return staked > 0 ? profit / staked : 0;
}

/**
 * Suggested stake in account currency: full-Kelly fraction × the user's Kelly
 * multiplier × bankroll, rounded to the nearest `roundTo` (min one step).
 */
export function suggestedStake(
  fullKellyFraction: number,
  kellyMultiplier: number,
  bankroll: number,
  roundTo = 10,
): number {
  const step = Math.max(1, roundTo);
  const raw = fullKellyFraction * kellyMultiplier * bankroll;
  return Math.max(step, Math.round(raw / step) * step);
}

/** Closing-line value: how much better your price was than the closing price. */
export function closingLineValue(takenOdds: number, closingOdds: number): number {
  return closingOdds > 0 ? takenOdds / closingOdds - 1 : 0;
}

/** Break-even win rate needed at a given price. */
export function breakEvenRate(decimalOdds: number): number {
  return impliedProbability(decimalOdds);
}
