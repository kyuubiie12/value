import { unstable_cache } from "next/cache";
import type { ValueOpportunity } from "@/types";
import { explainOpportunity } from "@/lib/explain";
import { getBookmaker } from "@/lib/mock-data";
import { createMockInsightService } from "../mock/insight-service";
import type { InsightService, OpportunityInsight } from "../types";

const ENDPOINT = "https://api.openai.com/v1/chat/completions";

interface PromptInput {
  match: string;
  league: string;
  market: string;
  selection: string;
  bestOdds: number;
  bestBookmaker: string;
  fairOdds: number;
  /** "sharp": Pinnacle without margin. "consensus": the other bookmakers' average. */
  fairBasis: "sharp" | "consensus";
  edgePercent: number;
  prices: { bookmaker: string; odds: number }[];
  movement: string;
  facts: string[];
  caveat: string;
}

function buildInput(o: ValueOpportunity): PromptInput {
  const e = explainOpportunity(o);
  return {
    match: `${o.homeTeam} – ${o.awayTeam}`,
    league: o.league,
    market: o.marketLabel,
    selection: o.selection,
    bestOdds: o.bestOdds,
    bestBookmaker: getBookmaker(o.bestBookmakerId)?.name ?? o.bestBookmakerId,
    fairOdds: o.fairOdds,
    fairBasis: o.fairBasis ?? "sharp",
    edgePercent: Number(o.edgePercent.toFixed(1)),
    prices: o.quotes.map((q) => ({
      bookmaker: getBookmaker(q.bookmakerId)?.name ?? q.bookmakerId,
      odds: q.price,
    })),
    movement: o.priceMovement,
    facts: e.points,
    caveat: e.caveat,
  };
}

const SYSTEM = `Du forklarer en bruger, hvorfor ét fodbold-bet er et value bet, så brugeren
kan se logikken og stole på den. Skriv på dansk, i klart sprog, 2 til 4 sætninger.

Du får tal og "facts" fra vores system. Brug KUN dem.
Regler:
- Opfind aldrig skader, form, statistik, spillestil, tidligere resultater eller andet,
  der ikke står i data. Du kender ikke noget til holdene ud over tallene.
- Forklar mekanismen: hvilken pris er højere end hvad, hvor stor forskellen er,
  og hvad det betyder for den forventede gevinst på sigt.
- Er fairBasis "consensus", så sig ærligt, at det er en prisforskel mellem
  bookmakere uden en skarp reference — ikke et bevis. Er det "sharp", så forklar,
  at fair odds er den skarpe bookmakers pris uden margin.
- Vær ærlig om usikkerheden: value er ikke en garanti for, at det vinder.
- Ingen "spil ansvarligt", ingen emojis, ingen overskrifter, ingen opremsning.
Svar som JSON: {"summary": string}`;

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
        max_tokens: 260,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM },
          {
            role: "user",
            content: `Forklar dette value bet.\n\nData:\n${JSON.stringify(input, null, 2)}`,
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

    const parsed = JSON.parse(content) as { summary?: unknown };
    const summary = typeof parsed.summary === "string" ? parsed.summary.trim() : "";
    if (!summary) return null;

    return { signals: [], summary, source: "ai" };
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
