import { CheckCircle2, Gavel, Zap } from "lucide-react";
import type { ValueOpportunity } from "@/types";
import { cn } from "@/lib/utils";

/**
 * Small "why you can trust this one" badges: the player is in the starting eleven,
 * Pinnacle moved and the bookmaker hasn't, the referee's record agrees.
 */
export function SignalChips({
  opportunity: o,
  size = "md",
  className,
}: {
  opportunity: ValueOpportunity;
  size?: "sm" | "md";
  className?: string;
}) {
  const chips: { key: string; label: string; title: string; icon: React.ReactNode; tone: "pos" | "info" | "warn" }[] = [];
  const icon = size === "sm" ? "size-2.5" : "size-3";

  if (o.lineup === "confirmed")
    chips.push({ key: "lineup", label: "Starter", title: "Opstillingen er bekræftet: han er i startelleveren", icon: <CheckCircle2 className={icon} strokeWidth={2.5} />, tone: "pos" });
  else if (o.lineup === "expected")
    chips.push({ key: "lineup", label: "Forventet starter", title: "Han er med i den forventede startopstilling — den er ikke officiel endnu", icon: <CheckCircle2 className={icon} strokeWidth={2.5} />, tone: "info" });

  if (o.proofLevel === "moderate")
    chips.push({ key: "mild", label: "Moderat bevis", title: "Tackling/foul-spil på et mildere bevis: chancen er regnet med mindre forsigtighed end de andre props", icon: <Gavel className={icon} strokeWidth={2.5} />, tone: "warn" });

  if (o.sharpMove)
    chips.push({ key: "sharp", label: "Skarpt træk", title: "Pinnacle har rykket sin pris, og bookmakeren har ikke fulgt med endnu", icon: <Zap className={icon} strokeWidth={2.5} />, tone: "warn" });

  if (o.referee)
    chips.push({ key: "ref", label: `Dommer ${o.referee.perGame.toFixed(1).replace(".", ",")}`, title: `Dommer ${o.referee.name}: i snit ${o.referee.perGame.toFixed(1).replace(".", ",")} kort pr. kamp`, icon: <Gavel className={icon} strokeWidth={2.5} />, tone: "info" });

  if (!chips.length) return null;
  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {chips.map((c) => (
        <span
          key={c.key}
          title={c.title}
          className={cn(
            "inline-flex items-center gap-1 rounded-full font-semibold ring-1 ring-inset",
            size === "sm" ? "px-1.5 py-[3px] text-[10px]" : "px-2 py-0.5 text-[11px]",
            c.tone === "pos" && "bg-positive/12 text-positive ring-positive/25",
            c.tone === "info" && "bg-info/12 text-info ring-info/25",
            c.tone === "warn" && "bg-warning/12 text-warning ring-warning/25",
          )}
        >
          {c.icon}
          {c.label}
        </span>
      ))}
    </div>
  );
}
