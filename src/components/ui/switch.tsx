"use client";

import { cn } from "@/lib/utils";

export function Switch({
  checked,
  onChange,
  label,
  description,
  id,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  description?: string;
  id?: string;
}) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-start justify-between gap-4">
      <span className="flex flex-col">
        <span className="text-[13px] font-medium text-fg">{label}</span>
        {description && (
          <span className="mt-0.5 text-xs leading-relaxed text-subtle">{description}</span>
        )}
      </span>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative mt-0.5 inline-flex h-[18px] w-8 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
          checked ? "bg-primary" : "bg-line-strong",
        )}
      >
        <span
          className={cn(
            "inline-block size-3.5 rounded-full bg-white transition-transform duration-200",
            checked ? "translate-x-[15px]" : "translate-x-[2px]",
          )}
        />
      </button>
    </label>
  );
}
