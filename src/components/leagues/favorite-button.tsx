"use client";

import * as React from "react";
import { Star } from "lucide-react";
import { toggleFavoriteLeagueAction } from "@/lib/actions";
import { cn } from "@/lib/utils";

/** Star toggle that adds/removes a league from the user's favourites. */
export function FavoriteButton({
  leagueId,
  initial,
}: {
  leagueId: string;
  initial: boolean;
}) {
  const [on, setOn] = React.useState(initial);
  const [pending, startTransition] = React.useTransition();

  const toggle = () => {
    setOn((v) => !v); // optimistic
    startTransition(async () => {
      const next = await toggleFavoriteLeagueAction(leagueId);
      if (next) setOn(next.includes(leagueId));
    });
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-pressed={on}
      className={cn(
        "glow-hover inline-flex h-10 items-center gap-2 rounded-full border px-4 text-[13px] font-medium transition-colors",
        on
          ? "border-primary/50 bg-primary/12 text-primary-strong"
          : "border-line/70 bg-surface-2 text-muted hover:border-line-strong hover:text-fg",
      )}
    >
      <Star className={cn("size-4", on && "fill-primary text-primary")} aria-hidden />
      {on ? "Favorit" : "Gør til favorit"}
    </button>
  );
}
