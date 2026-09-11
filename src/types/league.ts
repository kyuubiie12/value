/** A football competition. */
export interface League {
  id: string;
  name: string;
  /** Short code shown as a compact badge, e.g. "PL", "UCL". */
  shortName: string;
  country: string;
  /** 1 = top division, 2 = second tier, 0 = continental / cup. */
  tier: number;
  /** Identity colour used to tint the league badge. */
  accent: string;
}
