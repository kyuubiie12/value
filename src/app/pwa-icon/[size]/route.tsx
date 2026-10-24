import { ImageResponse } from "next/og";

/**
 * App icons for the manifest, the iOS home screen and push notifications,
 * rendered on demand from the brand glyph. `maskable-<n>` is full-bleed (the OS
 * crops it to its own shape); plain `<n>` has its own rounded corners.
 * Sizes: 96 (notification badge), 180 (iOS), 192/512 (manifest).
 */
const SIZES = new Set([96, 180, 192, 512]);

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ size: string }> },
) {
  const { size: raw } = await params;
  const maskable = raw.startsWith("maskable-");
  const size = Number(raw.replace("maskable-", ""));
  if (!SIZES.has(size)) return new Response("Not found", { status: 404 });

  const glyph = Math.round(size * (maskable ? 0.46 : 0.56));

  return new ImageResponse(
    (
      <div
        style={{
          width: size,
          height: size,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#1fce90",
          borderRadius: maskable ? 0 : Math.round(size * 0.22),
        }}
      >
        <svg width={glyph} height={glyph} viewBox="0 0 24 24" fill="none">
          <path
            d="M12 3v18M12 3l6 4M12 3L6 7M4 12h16M6 17l6 4 6-4"
            stroke="#04130d"
            strokeWidth="2.25"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    ),
    {
      width: size,
      height: size,
      headers: { "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800" },
    },
  );
}
