/** The public website (explainer, terms, privacy). Override with NEXT_PUBLIC_SITE_URL once the domain is live. */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://mentor-site.vercel.app";

export const LEGAL_LINKS = {
  terms: `${SITE_URL}/vilkaar`,
  privacy: `${SITE_URL}/privatliv`,
} as const;
