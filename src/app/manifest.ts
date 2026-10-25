import type { MetadataRoute } from "next";

/** Web app manifest — makes Mentor installable ("Føj til hjemmeskærm"). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Mentor",
    short_name: "Mentor",
    description:
      "AI-drevet værktøj til at finde value-odds og tracke din portefølje. Analyse og tracking — ikke et spilsted.",
    lang: "da",
    id: "/",
    start_url: "/value-bets",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    categories: ["sports", "finance", "utilities"],
    background_color: "#1b1f20",
    theme_color: "#090b11",
    icons: [
      { src: "/brand/v2/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/brand/v2/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/brand/v2/maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/brand/v2/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Value Feed", url: "/value-bets" },
      { name: "Portfolio", url: "/portfolio" },
    ],
  };
}
