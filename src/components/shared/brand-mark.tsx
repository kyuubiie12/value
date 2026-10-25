import Image from "next/image";
import { cn } from "@/lib/utils";

/** The logo tile + wordmark, without a link. For auth / onboarding shells. */
export function BrandMark({
  size = "md",
  className,
}: {
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const tile =
    size === "lg" ? "size-10" : size === "sm" ? "size-7" : "size-[34px]";
  const px = size === "lg" ? 40 : size === "sm" ? 28 : 34;
  const text =
    size === "lg" ? "text-[19px]" : size === "sm" ? "text-[15px]" : "text-[17px]";

  return (
    <span className={cn("flex items-center gap-2", className)}>
      <Image
        src="/brand/mentor-tile.svg"
        alt=""
        aria-hidden
        width={px}
        height={px}
        unoptimized
        className={cn("shrink-0 rounded-[22%]", tile)}
      />
      <span
        className={cn(
          "font-semibold tracking-[-0.02em] text-fg",
          text,
        )}
      >
        Mentor
      </span>
    </span>
  );
}
