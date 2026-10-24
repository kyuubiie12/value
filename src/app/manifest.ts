import type { MetadataRoute } from "next";

/** Web app manifest — makes ValueBet AI installable ("Føj til hjemmeskærm"). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ValueBet AI",
    short_name: "ValueBet",
    description:
      "AI-drevet værktøj til at finde value-odds og tracke din portefølje. Analyse og tracking — ikke et spilsted.",
    lang: "da",
    start_url: "/value-bets",
    scope: "/",
    display: "standalone",
    background_color: "#090b11",
    theme_color: "#090b11",
    icons: [
      { src: "/pwa-icon/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/pwa-icon/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/pwa-icon/maskable-512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Value Feed", url: "/value-bets" },
      { name: "Portfolio", url: "/portfolio" },
    ],
  };
}
