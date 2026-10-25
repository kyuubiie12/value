import { after } from "next/server";
import { needsRefresh, refreshOdds } from "@/lib/odds/store";
import { oddsPapiConfigured } from "@/lib/odds/oddspapi";
import { needsNicheRefresh, refreshNiche } from "@/lib/odds/niche-store";
import { needsTrackingJob, runTrackingJob } from "@/lib/track/job";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

/**
 * Open heartbeat for a free pinger (cron-job.org, UptimeRobot …): does exactly what a
 * page view does — starts the odds / props / track-record work, but only the parts
 * that are actually due (and each is locked), so calling it often costs nothing extra.
 * Takes no input and returns no data.
 */
export async function GET() {
  const [odds, niche, track] = await Promise.all([
    needsRefresh(),
    oddsPapiConfigured() ? needsNicheRefresh() : Promise.resolve(false),
    needsTrackingJob(),
  ]);
  if (odds) after(() => refreshOdds());
  if (niche) after(() => refreshNiche());
  if (track) after(() => runTrackingJob());
  return Response.json({ ok: true });
}
