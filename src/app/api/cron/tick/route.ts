import { refreshOdds } from "@/lib/odds/store";
import { oddsPapiConfigured } from "@/lib/odds/oddspapi";
import { refreshNiche } from "@/lib/odds/niche-store";
import { runTrackingJob } from "@/lib/track/job";

// The refresh paces itself to the odds provider's rate limit, so give it room.
export const maxDuration = 300;
export const dynamic = "force-dynamic";

/**
 * Heartbeat for the background work (odds refresh → track record → notifications).
 * Normally that work is kicked off by page views; this makes sure it also happens
 * when nobody is looking. Vercel Cron calls it daily with `CRON_SECRET`; a free
 * pinger (e.g. UptimeRobot) can call it more often with the same header.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  const [odds, niche] = await Promise.all([
    refreshOdds(),
    oddsPapiConfigured() ? refreshNiche() : Promise.resolve(null),
  ]);
  const track = await runTrackingJob();
  return Response.json({ odds, niche, track });
}
