import { unstable_cache } from "next/cache";
import type { ValueOpportunity } from "@/types";
import { createMockInsightService } from "../mock/insight-service";
import type { InsightService, OpportunityInsight } from "../types";

const ENDPOINT = "https://api.openai.com/v1/chat/completions";

interface PromptInput {
  league: string;
  home: string;
  away: string;
  homeForm: string;
  awayForm: string;
  market: string;
  selection: string;
  bestOdds: number;
  fairOdds: number;
  averageOdds: number;
  edgePercent: number;
  movement: string;
  openingOdds: number;
  booksCount: number;
  kellyPercent: number;
}

function buildInput(o: ValueOpportunity): PromptInput {
  return {
    league: o.league,
    home: o.homeTeam,
    away: o.awayTeam,
    homeForm: o.homeForm,
    awayForm: o.awayForm,
    market: o.marketLabel,
    selection: o.selection,
    bestOdds: o.bestOdds,
    fairOdds: o.fairOdds,
    averageOdds: o.averageOdds,
    edgePercent: Number((o.edgePercent).toFixed(1)),
    movement: o.priceMovement,
    openingOdds: o.openingOdds,
    booksCount: o.booksCount,
    kellyPercent: Number((o.kellyFraction * 100).toFixed(1)),
  };
}

const SYSTEM = `Du er en erfaren fodbold-oddsanalytiker for et value-betting værktøj.
Du får strukturerede tal for ét value bet (bedste odds vs. de-vigget fair odds,
markedsbevægelse, form). Skriv en kort, nøgtern vurdering på dansk.

Regler:
- 3 til 4 "signals": korte punkter (max ~9 ord), konkrete, ingen fyld.
- "summary": 1-2 sætninger i klar tale om hvorfor der er value her.
- Vær ærlig: hvis edgenden er lille eller prisen driver, så sig det.
- Ingen ansvarsfraskrivelser, ingen "spil ansvarligt", ingen emojis.
- Brug KUN de givne tal + almindelig fodboldkontekst. Opfind ikke skader/resultater.
Svar som JSON: {"signals": string[], "summary": string}`;

async function callOpenAI(input: PromptInput): Promise<OpportunityInsight | null> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.4,
        max_tokens: 320,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM },
          {
            role: "user",
            content: `Fodbold value bet — analysér.\n\nData:\n${JSON.stringify(input, null, 2)}`,
          },
        ],
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      console.error("OpenAI insight failed", res.status, await res.text());
      return null;
    }

    const json = await res.json();
    const content = json.choices?.[0]?.message?.content;
    if (!content) return null;

    const parsed = JSON.parse(content) as {
      signals?: unknown;
      summary?: unknown;
    };
    const signals = Array.isArray(parsed.signals)
      ? parsed.signals.filter((s): s is string => typeof s === "string").slice(0, 4)
      : [];
    const summary = typeof parsed.summary === "string" ? parsed.summary : "";
    if (!signals.length || !summary) return null;

    return { signals, summary, source: "ai" };
  } catch (err) {
    console.error("OpenAI insight error", err);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export function createOpenAiInsightService(): InsightService {
  const fallback = createMockInsightService();

  const cached = unstable_cache(
    async (input: PromptInput) => callOpenAI(input),
    ["value-opportunity-insight"],
    { revalidate: 60 * 30 },
  );

  return {
    async analyse(opportunity) {
      const result = await cached(buildInput(opportunity));
      return result ?? fallback.analyse(opportunity);
    },
  };
}
