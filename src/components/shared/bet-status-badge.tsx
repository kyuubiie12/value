import type { BetStatus } from "@/types";
import { BET_STATUS_LABELS } from "@/types";
import { Badge } from "@/components/ui/badge";

const TONE: Record<BetStatus, React.ComponentProps<typeof Badge>["tone"]> = {
  won: "positive",
  "half-won": "positive",
  lost: "negative",
  "half-lost": "negative",
  pending: "warning",
  cashout: "info",
  void: "neutral",
};

export function BetStatusBadge({ status }: { status: BetStatus }) {
  return (
    <Badge tone={TONE[status]}>
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {BET_STATUS_LABELS[status]}
    </Badge>
  );
}
