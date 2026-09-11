# ValueBet AI

AI-drevet værktøj til at finde **value-odds på fodbold** på tværs af bookmakere +
personlig **portfolio-tracker**.

> ValueBet AI er et **analyse- og trackingværktøj**. Appen formidler ikke spil og
> placerer ingen væddemål.

Dette er **fase 1**: arkitektur, komponenter, layout, navigation og mock-data.
API-integrationer og AI-modeller kobles på senere — datalaget er fuldstændigt
modulært, så mock-services kan udskiftes 1:1 med rigtige backends.

## Stack

| | |
|---|---|
| Framework | Next.js 16 (App Router) + TypeScript |
| Styling | Tailwind CSS v4 — semantiske tokens i `globals.css` via `@theme` |
| Typografi | Geist + Geist Mono (mono til alle tal) |
| Ikoner | lucide-react |
| Charts | Recharts |
| Utils | clsx + tailwind-merge (`cn`) |

**Designsprog:** mørkt analytics-tema. Én accent (smaragdgrøn), cool-tonede
neutraler, dæmpet elevation (hårfine borders, ingen tunge skygger), hårlinje-delte
datastriber, konsekvente `active:`/`hover:`-states (150 ms). Alle overflader og
farver kommer fra tokens — brug aldrig rå `slate-*`/`zinc-*`.

## Kom i gang

```bash
npm install
npm run dev      # http://localhost:3000  → redirecter til /value-bets
npm run build
npm run lint
```

## Projektstruktur

```
src/
├─ app/
│  ├─ layout.tsx                 # fonts, <html lang="da">, metadata
│  ├─ globals.css                # dark fintech-tema (CSS-variabler → @theme)
│  ├─ page.tsx                   # redirect → /value-bets
│  ├─ not-found.tsx
│  └─ (app)/                     # route-group med den fælles app-shell
│     ├─ layout.tsx              # henter stats + alerts, rendrer <AppShell>
│     │                          #   (sticky top-nav + stat-cluster, ingen sidebar)
│     ├─ loading.tsx
│     ├─ value-bets/page.tsx     # Value Feed
│     ├─ portfolio/page.tsx      # Min Portfolio & Tracking
│     ├─ tools/page.tsx          # Analyse & Værktøjer (EV + Kelly)
│     └─ settings/page.tsx       # Profil & Indstillinger
│
├─ types/                        # domæne-interfaces (ét område pr. fil)
│  ├─ common.ts league.ts bookmaker.ts value.ts bet.ts portfolio.ts settings.ts
│  └─ index.ts                   # barrel — importér altid fra "@/types"
│
├─ lib/
│  ├─ utils.ts                   # cn(), delay(), seededRandom(), uid()
│  ├─ betting-math.ts            # EV, Kelly, de-vig, CLV, ROI (rene funktioner)
│  ├─ format.ts                  # da-DK formattering (valuta, %, odds, datoer)
│  ├─ filtering.ts               # delt filter/sort-logik (feed + historik)
│  ├─ navigation.ts              # NAV_ITEMS
│  ├─ actions.ts                 # server actions (logBet, markRead, updateSettings)
│  ├─ mock-data/                 # realistiske datasæt (kun fodbold)
│  │  ├─ bookmakers.ts           # 8 bookmakere (Pinnacle sharp osv.)
│  │  ├─ leagues.ts              # 11 ligaer (PL, LaLiga, UCL, Superliga …)
│  │  ├─ value-opportunities.ts  # 14 value bets m. form, signaler, movement
│  │  ├─ bets.ts                 # 52 historiske bets (deterministisk seed)
│  │  ├─ portfolio.ts            # udleder stats / equity-kurve / breakdowns
│  │  └─ settings.ts             # DEFAULT_SETTINGS
│  └─ services/                  # ★ DATALAGET — det eneste komponenter rører
│     ├─ types.ts                # ValueService / PortfolioService / …-interfaces
│     ├─ index.ts                # singletons (byt implementering ud her)
│     └─ mock/*.ts               # in-memory implementeringer m. kunstig latency
│
└─ components/
   ├─ ui/                        # primitiver: button, card, badge, input, select,
   │                             #   modal, table, stat-card, segmented, switch, …
   ├─ layout/                    # app-shell, top-nav, brand
   ├─ shared/                    # bookmaker-chip, sport-icon, ev-indicator,
   │                             #   bet-status-badge, page-header, empty-state
   ├─ value-bets/                # feed, filter-bar, value-bet-card/-table, …
   ├─ portfolio/                 # kpi-grid, performance-chart, bet-history-table,
   │                             #   breakdown-panel, bet-form-modal, add-bet-button
   ├─ tools/                     # ev-calculator, kelly-calculator
   └─ settings/                  # settings-form
```

## Sådan går man live (fase 2)

Alt data flyder gennem interfaces i `src/lib/services/types.ts`. Ingen komponent
importerer mock-data direkte — de bruger `valueService`, `portfolioService`,
`bookmakerService`, `settingsService` fra `src/lib/services`.

For at skifte til rigtige kilder:

1. Skriv en ny implementering, fx `createHttpValueService(oddsApiUrl)` eller
   `createAiValueService(model)`, der opfylder `ValueService`.
2. Udskift factory-kaldet i `src/lib/services/index.ts` — én linje pr. service.
3. Færdig. Sider og komponenter ændres ikke.

`src/lib/betting-math.ts` er rene funktioner uden UI-afhængigheder og kan
genbruges direkte af AI-model-laget.
