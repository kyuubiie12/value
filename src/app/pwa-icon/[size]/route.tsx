import { NextResponse } from "next/server";

/**
 * Old icon URLs (`/pwa-icon/192`, `/pwa-icon/maskable-512`, …) — installed copies
 * of the app and queued push notifications may still point here. They now
 * forward to the Mentor logo files in `public/brand`.
 */
const TARGET: Record<string, string> = {
  "96": "icon-96.png",
  "180": "apple-touch-icon.png",
  "192": "icon-192.png",
  "512": "icon-512.png",
  "maskable-180": "apple-touch-icon.png",
  "maskable-192": "maskable-192.png",
  "maskable-512": "maskable-512.png",
};

export async function GET(
  req: Request,
  { params }: { params: Promise<{ size: string }> },
) {
  const { size } = await params;
  const file = TARGET[size];
  if (!file) return new NextResponse("Not found", { status: 404 });
  return NextResponse.redirect(new URL(`/brand/${file}`, req.url), 308);
}
