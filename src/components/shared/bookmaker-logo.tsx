"use client";

import * as React from "react";
import { getBookmaker } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

/**
 * Bookmaker identity mark.
 *
 * Books with a usable real logo (`logoPath`) get it crisp from the Brandfetch
 * Logo API — rendered bare on the dark UI when the asset is light/colourful
 * (`logoBare`), or on a small white tile when it needs a light backing. The
 * rest fall back to a brand-coloured wordmark; their logos are stylised text
 * anyway so it stays recognisable.
 */

const BRANDFETCH_CLIENT_ID = process.env.NEXT_PUBLIC_BRANDFETCH_CLIENT_ID;

interface Brand {
  bg: string;
  fg: string;
  wordmark: string;
}

const BRANDS: Record<string, Brand> = {
  bet365: { bg: "#02753f", fg: "#ffdf1b", wordmark: "bet365" },
  pinnacle: { bg: "#c9182b", fg: "#ffffff", wordmark: "Pinnacle" },
  unibet: { bg: "#14825f", fg: "#d7ff4a", wordmark: "unibet" },
  "danske-spil": { bg: "#c8102e", fg: "#ffffff", wordmark: "Danske Spil" },
  betano: { bg: "#ff5a00", fg: "#170f06", wordmark: "Betano" },
  leovegas: { bg: "#ff9e1b", fg: "#1c1400", wordmark: "LeoVegas" },
  nordicbet: { bg: "#128a44", fg: "#ffffff", wordmark: "NordicBet" },
  betfair: { bg: "#ffb80c", fg: "#1c1400", wordmark: "Betfair" },
};

const SIZE = {
  sm: { h: "h-6", bare: "max-h-[18px]", tile: "size-6 rounded-[6px] p-1", word: "px-1.5 text-[10px]" },
  md: { h: "h-8", bare: "max-h-[24px]", tile: "size-8 rounded-[8px] p-1.5", word: "px-2 text-[12px]" },
  lg: { h: "h-11", bare: "max-h-[34px]", tile: "size-11 rounded-[10px] p-2", word: "px-3 text-[15px]" },
} as const;

function logoSrc(
  book: NonNullable<ReturnType<typeof getBookmaker>>,
): string | null {
  if (book.logoUrl) return book.logoUrl;
  if (!BRANDFETCH_CLIENT_ID || !book.logoPath) return null;
  return `https://cdn.brandfetch.io/${book.logoPath}?c=${BRANDFETCH_CLIENT_ID}`;
}

export function BookmakerLogo({
  bookmakerId,
  size = "md",
  className,
}: {
  bookmakerId: string;
  size?: keyof typeof SIZE;
  className?: string;
}) {
  const [failed, setFailed] = React.useState(false);
  const imgRef = React.useRef<HTMLImageElement>(null);
  const book = getBookmaker(bookmakerId);
  const label = book?.name ?? bookmakerId;
  const brand = BRANDS[bookmakerId];
  const src = book ? logoSrc(book) : null;
  const s = SIZE[size];

  React.useEffect(() => {
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth === 0) setFailed(true);
  }, [src]);

  if (src && !failed) {
    const bare = book?.logoBare === true;
    return (
      <span
        title={label}
        data-bookmaker-bare={bare ? "" : undefined}
        className={cn(
          "inline-flex shrink-0 items-center justify-center",
          bare
            ? cn(s.h, "px-1")
            : cn(
                "bg-white ring-1 ring-inset ring-black/10",
                "shadow-[0_1px_2px_rgba(0,0,0,0.3)]",
                s.tile,
              ),
          className,
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={imgRef}
          src={src}
          alt={label}
          onError={() => setFailed(true)}
          loading="lazy"
          className={cn(
            "w-auto object-contain",
            bare ? s.bare : "max-h-full max-w-full",
          )}
        />
      </span>
    );
  }

  return (
    <span
      aria-label={label}
      title={label}
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden whitespace-nowrap font-extrabold leading-none tracking-[-0.02em]",
        "ring-1 ring-inset ring-white/10",
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_1px_2px_rgba(0,0,0,0.4)]",
        s.h,
        s.word,
        size === "sm" ? "rounded-[6px]" : size === "md" ? "rounded-[8px]" : "rounded-[10px]",
        className,
      )}
      style={{
        backgroundColor: brand?.bg ?? book?.brandColor ?? "#39424f",
        color: brand?.fg ?? "#ffffff",
      }}
    >
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/[0.18] to-transparent"
      />
      <span className="relative">{brand?.wordmark ?? label}</span>
    </span>
  );
}
