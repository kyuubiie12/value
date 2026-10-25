# Mentor

AI-drevet værktøj til at finde **value-odds på fodbold** på tværs af bookmakere +
personlig **portfolio-tracker**, med rigtige brugerkonti.

> Mentor er et **analyse- og trackingværktøj**. Appen formidler ikke spil og
> placerer ingen væddemål.

**Live:** https://valuebet-ai-chi.vercel.app

## Stack

| | |
|---|---|
| Framework | Next.js 16 (App Router) + TypeScript, React 19 |
| Auth | E-mail/adgangskode, egne server actions (`src/lib/auth/`) — ingen tredjeparts auth-lib |
| Database | SQLite via libSQL/Drizzle — lokal fil i dev, hostet Turso i produktion |
| Styling | Tailwind CSS v4 — semantiske tokens i `globals.css` via `@theme` (dark/light + 4 accentfarver + 5 display-fonte, alle brugervalgte) |
| Ikoner | lucide-react |
| Charts | Recharts |
| Utils | clsx + tailwind-merge (`cn`) |

**Designsprog:** se `.impeccable.md` for den fulde designkontekst. Kort: rolig
tæthed, tallet er helten, accent er sjælden (~10 % af det visuelle), semantiske
tokens overalt — aldrig rå `slate-*`/hex-farver.

## Kom i gang

```bash
npm install
npm run dev      # http://localhost:3000 → redirecter til /login (eller /value-bets hvis logget ind)
npm run build
npm run lint
```

Kopiér `.env.example` til `.env.local` og udfyld efter behov. Uden `DATABASE_URL`
bruges en lokal SQLite-fil (`./data/valuebet.db`) — fint til udvikling. I
produktion (serverless, intet skrivbart filsystem) er en hostet libSQL/Turso-URL
**påkrævet** — se `DATABASE_URL` + `TURSO_AUTH_TOKEN` i `.env.example`.

## Deploy

Live på Vercel, koblet til dette repo — hvert push til `main` deployer automatisk.
Manuelt deploy: `npx vercel --prod --yes`. Miljøvariabler sættes med
`vercel env add <navn> production`.

## Projektstruktur

```
src/
├─ app/
│  ├─ layout.tsx                 # fonts, <html lang="da">, boot-script (tema uden flash)
│  ├─ globals.css                # tema-tokens (@theme, dark/light + accenter)
│  ├─ page.tsx                   # redirect → /value-bets
│  ├─ not-found.tsx
│  ├─ (auth)/                    # login + signup, ingen AppShell
│  │  ├─ layout.tsx              # split-screen: track-record trust-panel + formular
│  │  ├─ login/page.tsx
│  │  └─ signup/page.tsx
│  ├─ onboarding/                # 7-trins velkomst-wizard efter signup
│  └─ (app)/                     # route-group med den fælles app-shell (kræver login)
│     ├─ layout.tsx              # requireUser() + henter stats/settings/alerts
│     ├─ value-bets/page.tsx     # Value Feed
│     ├─ portfolio/page.tsx      # Min Portfolio & Tracking
│     ├─ results/page.tsx        # Offentligt track record
│     └─ profile/page.tsx        # Konto, bankroll, bookmakere, udseende, sikkerhed
│
├─ types/                        # domæne-interfaces (ét område pr. fil) — barrel: "@/types"
│
├─ lib/
│  ├─ auth/                      # password (scrypt), session (DB-sessions), actions, rate-limit
│  ├─ db/                        # Drizzle schema + DDL-migrering (kører ved opstart)
│  ├─ betting-math.ts            # EV, Kelly, de-vig, CLV, ROI (rene funktioner)
│  ├─ format.ts                  # da-DK formattering (valuta, %, odds, datoer)
│  ├─ filtering.ts                # delt filter/sort-logik (feed + historik)
│  ├─ mock-data/                 # genereret reference-/feed-data (ligaer, bookmakere, odds)
│  └─ services/                  # ★ DATALAGET — det eneste komponenter rører
│     ├─ types.ts                # service-interfaces
│     ├─ index.ts                # singletons (byt implementering ud her)
│     ├─ db/*.ts                 # DB-backede, per-bruger (portfolio, settings, notifikationer, value-read-state)
│     └─ mock/*.ts               # stadig-mock reference-data (bookmaker, liga, track record, insight)
│
└─ components/
   ├─ ui/                        # primitiver
   ├─ layout/                    # app-shell, top-nav, command-palette, theme-sync
   ├─ auth/ onboarding/          # login/signup-formular, velkomst-wizard
   ├─ shared/                    # bookmaker-logo, brand-mark, ev-indicator, form-guide, …
   ├─ value-bets/                # feed, hero, filter-bar, value-bet-card/-table, drawer
   └─ portfolio/                 # kpi-grid, performance-chart, bet-history-table, breakdown-panel
```

## Arkitekturregel: skift backend uden at røre komponenter

Alt data flyder gennem interfaces i `src/lib/services/types.ts`. Ingen komponent
importerer `mock-data/*` direkte. Reference-/feed-data (ligaer, bookmakere, odds,
track record) er stadig genereret — kun brugerdata (konto, portefølje,
indstillinger) er DB-backet. For at koble en rigtig odds-/AI-kilde på: skriv en
ny implementering af den relevante interface og udskift factory-kaldet i
`src/lib/services/index.ts` — én linje pr. service, siderne ændres ikke.
