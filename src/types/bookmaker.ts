/** A sportsbook whose odds we compare against. */
export interface Bookmaker {
  id: string;
  name: string;
  slug: string;
  /** Brand colour used for the wordmark chip fallback. */
  brandColor: string;
  country: string;
  /**
   * Primary web domain, used to fetch the official logo via the Brandfetch
   * Logo API (see `BookmakerLogo`). Falls back to a brand-coloured wordmark
   * when no Brandfetch client id is configured or the logo can't be loaded.
   */
  domain: string;
  /**
   * Brandfetch CDN path (everything between `cdn.brandfetch.io/` and `?c=`),
   * e.g. "betano.com/theme/light/w/512/logo". Set only where a usable real logo
   * exists; otherwise `BookmakerLogo` renders a brand-coloured wordmark.
   */
  logoPath?: string;
  /**
   * The logo at `logoPath` is a light / colourful image that already reads on a
   * dark surface — render it bare (no white tile).
   */
  logoBare?: boolean;
  /** Optional explicit logo override (local file or full URL). Wins over everything. */
  logoUrl?: string;
  /** True for sharp books (e.g. Pinnacle) used as a fair-odds reference. */
  isSharp: boolean;
  /** Average market payout, 0–1 (e.g. 0.972 = ~2.8% margin). */
  payoutRate: number;
  websiteUrl?: string;
}
