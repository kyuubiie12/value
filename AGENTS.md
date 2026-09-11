<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# ValueBet AI — projektkonventioner

Analyse- og trackingværktøj til **fodbold**-value-betting. **Placerer aldrig væddemål.** Dansk UI.

- **Design:** følg `.impeccable.md` (design-kontekst + principper). Kort: rolig
  tæthed, tallet er helten, accent er sjælden (~10%), semantiske tokens.
  Ingen farvede venstre-kant-striber på kort/lister; ingen gradient-tekst.

- **Kun fodbold.** Intet `sport`-felt / `Sport`-type. Alt er nøglet på `League`
  (`src/types/league.ts`, `MOCK_LEAGUES`, `leagueService`). Breakdown-dimensioner:
  league/bookmaker/market/month.
- Ligaer vises som `LeagueCode`-kodechips (fx "PL", "UCL") — **aldrig flag-emoji**
  (Windows har ingen flag-glyffer).
- Value-feed: hero ("dagens bedste value"), 3 visninger (Liste / Ligaer / Tabel),
  form-guides, odds-bevægelse, AI-signal-chips, fair→gns→bedste value-gauge, og
  `valueScore` 0–100 (`src/lib/value-score.ts`). Klik kort/række → `ValueDetailDrawer`
  (fuld odds-board med bookmaker-logoer, Kelly-sizing, AI-analyse).
- 3 tabs: **Value Feed** · **Portfolio** · **Profil**. Profil = bankroll/units,
  "Mine bookmakere" (aktive bookmakere), favoritligaer, alerts + en udviklings-header
  (ROI/CLV/hit rate). Feedet regner value via `restrictOpportunityToBooks` mod
  `settings.activeBookmakerIds` (recomputes best odds/EV/Kelly).
- Notifikationer: `NotificationService` + `NotificationsMenu` (klokke-dropdown i top-nav),
  `mock-data/notifications.ts`. Server actions `markNotificationRead(All)Action`.
- OpenAI: `insightService` (drawer'ens AI-analyse). Nøgle i `OPENAI_API_KEY` (server-only).
- Bookmaker-logoer: `BookmakerLogo` — stiliserede brand-farvede felter, ikke
  bookmakernes varemærke-grafik (renderer offline).

- **Auth + multi-user:** e-mail/adgangskode-login. `src/lib/auth/` — `password.ts`
  (scrypt, ingen deps), `session.ts` (DB-sessions, opak token → sha256 i `sessions`,
  cookie `vb_session`; `getCurrentUser` er `cache()`-wrappet, `requireUser()` /
  `requireUserId()` redirecter til `/login`), `actions.ts` (`signupAction` /
  `loginAction` via `useActionState`, `logoutAction`). `src/proxy.ts` = optimistisk
  cookie-gate (ægte tjek sker i `requireUser()`). Login/signup ligger i route-group
  `(auth)` uden `AppShell`; `(app)/layout.tsx` kalder `requireUser()`.
  Kontostyring i profilens "Konto & data": `ChangePasswordForm`
  (`changePasswordAction` → logger andre enheder ud), `DeleteAccountRow`
  (`deleteAccountAction` → FK-cascade + redirect til `/signup`). Login har en
  in-memory throttle (`lib/auth/rate-limit.ts`, 5 forsøg / 15 min pr. email+ip).
- **Onboarding:** `signupAction` → `/onboarding` (egen route, ikke `(app)`).
  7-trins wizard (`onboarding-wizard.tsx`): bankroll+valuta → bookmakere (min. 1)
  → ligaer (valgfri) → risiko (→ kellyFraction 0.1/0.25/0.5) → auto-follow
  (toggle + min-edge) → notifikationer (4 switches) → udseende (tema/accent/font
  m. live preview; skriver også `vb-*` til localStorage før redirect).
  `completeOnboardingAction` validerer alt, skriver settings +
  `onboardingComplete: true` og redirecter til `/value-bets`. `(app)/layout.tsx`
  sender til `/onboarding` hvis `!settings.onboardingComplete`.
  `DEFAULT_SETTINGS.onboardingComplete = true` → gamle konti / mock springer over.
- **Deploy:** live på Vercel — `npx vercel --prod --yes` (projekt `valuebet-ai`
  er allerede linket, ingen git involveret). Database er hostet libSQL på Turso
  (lokal SQLite-fil virker ikke på Vercels serverless-filsystem) —
  `DATABASE_URL` + `TURSO_AUTH_TOKEN` er sat som Vercel-miljøvariabler.
- **Database:** SQLite via libSQL/Drizzle. Schema i `src/lib/db/schema.ts`, DDL
  kører ved opstart (`migrate.ts` — `CREATE TABLE IF NOT EXISTS`, ingen drizzle-kit
  i runtime). `DATABASE_URL` (default `file:./data/valuebet.db`) + valgfri
  `TURSO_AUTH_TOKEN`/`DATABASE_AUTH_TOKEN` til en `libsql://`-URL. Kun **per-bruger**
  state ligger i DB (`users`, `sessions`, `user_settings` (JSON), `bets`,
  `auto_follow_dismissed`, `opportunity_reads`, `notification_reads`);
  reference-/feed-data (ligaer, bookmakere, value opportunities, track record)
  er stadig genereret i `src/lib/mock-data`.
- **Datalag:** komponenter importerer KUN fra `src/lib/services` (interfaces i
  `services/types.ts`). Aldrig `mock-data/*` direkte i en komponent.
  `portfolioService` / `settingsService` / `notificationService` / `valueService`
  er DB-backede og læser sessionen selv via `requireUserId()` — de må **kun**
  kaldes fra en indlogget request (gated page eller Server Action).
  `bookmaker` / `league` / `trackRecord` / `insight` er stadig mock. Skift til
  rigtig backend = ny factory i `services/index.ts`, intet andet.
- **Typer:** importér fra `@/types` (barrel). Ét domæneområde pr. fil i `src/types/`.
- **Betting-matematik:** rene funktioner i `src/lib/betting-math.ts` — ingen UI-imports.
- **Formattering:** altid via `src/lib/format.ts` (locale `da-DK`).
- **Komponenter:** `ui/` = primitiver, `shared/` = tværgående, resten = feature-mapper.
  Server components henter data; `"use client"` kun hvor der er interaktivitet.
- **Tema:** dark som standard, men brugeren kan vælge lys + accentfarve på
  profilen (`data-theme` / `data-accent` på `<html>`). Brug altid semantiske
  Tailwind-tokens (`bg-surface`, `text-muted`, `text-positive`, `bg-primary/12`
  …) — aldrig rå slate/hex-farver, så begge temaer virker. `@theme` i
  `globals.css` er **ikke** `inline` (det ville bage literals og dræbe runtime-skift).
- **Undgå `backdrop-blur`** på gentagne elementer (kort, rækker) — gav paint-bugs
  ved scroll. Brug opake baggrunde.
- `<html>`/`<body>` må ikke have fast `height: 100%` (bryder scroll) — brug `min-height`.
- Ingen brede unlayered selektorer i `globals.css` (fx `body > *`): Tailwind v4's
  utilities ligger i et `@layer`, og unlayered CSS vinder over dem uanset
  specificitet — det brød `.fixed` på portaled modaler. Hold globale regler
  til `:root`, `html`, `body`, `*` (kun `border-color`), `::selection`.
- Typografi: Geist + Geist Mono (`--font-sans` / `--font-mono`). `.tabular` på alle
  tal. Overskrifter: `tracking-tight`, `text-wrap: balance`.
