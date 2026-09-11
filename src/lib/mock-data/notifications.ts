import type { AppNotification } from "@/types";

const NOW = new Date("2026-09-06T12:00:00.000Z");
const ago = (minutes: number) =>
  new Date(NOW.getTime() - minutes * 60_000).toISOString();

export const MOCK_NOTIFICATIONS: AppNotification[] = [
  {
    id: "n_01",
    kind: "value-alert",
    title: "Nyt value bet · +10,5% EV",
    body: "Real Madrid – Liverpool: Over 3.5 mål hos Betano til 2,90.",
    createdAt: ago(6),
    read: false,
    href: "/value-bets",
  },
  {
    id: "n_02",
    kind: "value-alert",
    title: "3 nye value bets i dine ligaer",
    body: "Premier League og 3F Superliga — bedste er +7,8% EV.",
    createdAt: ago(34),
    read: false,
    href: "/value-bets",
  },
  {
    id: "n_03",
    kind: "price-move",
    title: "Odds falder på dit spil",
    body: "Arsenal-sejr er gået fra 2,15 til 2,05 siden du så den — markedet bekræfter.",
    createdAt: ago(88),
    read: false,
    href: "/value-bets",
  },
  {
    id: "n_04",
    kind: "bet-won",
    title: "Vundet · +212 kr.",
    body: "Arsenal – Manchester City: Begge hold scorer. Odds 2,06.",
    createdAt: ago(150),
    read: true,
    href: "/portfolio",
  },
  {
    id: "n_05",
    kind: "bet-lost",
    title: "Tabt · −100 kr.",
    body: "Ajax – Feyenoord: Uafgjort. Odds 3,54.",
    createdAt: ago(1440),
    read: true,
    href: "/portfolio",
  },
  {
    id: "n_06",
    kind: "report",
    title: "Din ugentlige rapport er klar",
    body: "ROI +4,1% i sidste uge · stærk CLV, men du overstaker på udebane-favoritter.",
    createdAt: ago(2880),
    read: true,
    href: "/portfolio",
  },
  {
    id: "n_07",
    kind: "system",
    title: "Bookmaker tilføjet",
    body: "Betano er nu aktiv i dit feed.",
    createdAt: ago(4320),
    read: true,
    href: "/profile",
  },
];
