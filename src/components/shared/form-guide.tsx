import { cn } from "@/lib/utils";

const DOT: Record<string, string> = {
  W: "bg-positive/90 text-positive-soft",
  D: "bg-line-strong text-fg",
  L: "bg-negative/80 text-negative-soft",
};

/**
 * Compact last-N form guide, e.g. "WWDLW" → five coloured cells, most-recent
 * on the right.
 */
export function FormGuide({
  form,
  className,
  label,
}: {
  form: string;
  className?: string;
  label?: string;
}) {
  const results = form.toUpperCase().split("").slice(-5);
  return (
    <span
      className={cn("inline-flex items-center gap-1", className)}
      title={label ? `${label}: ${results.join(" ")}` : results.join(" ")}
    >
      {label && <span className="text-[10px] text-subtle">{label}</span>}
      <span className="flex gap-[3px]" aria-hidden>
        {results.map((r, i) => (
          <span
            key={i}
            className={cn(
              "grid size-4 place-items-center rounded-full text-[8px] font-bold leading-none",
              DOT[r] ?? "bg-line-strong text-fg",
            )}
          >
            {r}
          </span>
        ))}
      </span>
    </span>
  );
}
