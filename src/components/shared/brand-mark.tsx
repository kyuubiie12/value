import Image from "next/image";
import { cn } from "@/lib/utils";

/** Width ÷ height of the M mark. */
const RATIO = 1.297;

/**
 * The Mentor "M", with no tile behind it. Two colourings: the light sage one on dark
 * backgrounds, a deep green one on the light theme (`data-theme="light"`).
 */
export function MentorM({ height, className }: { height: number; className?: string }) {
  const size = { height, width: Math.round(height * RATIO) };
  return (
    <>
      <Image
        src="/brand/mentor-m.svg"
        alt=""
        aria-hidden
        {...size}
        unoptimized
        style={size}
        className={cn("shrink-0 [[data-theme=light]_&]:hidden", className)}
      />
      <Image
        src="/brand/mentor-m-ink.svg"
        alt=""
        aria-hidden
        {...size}
        unoptimized
        style={size}
        className={cn("hidden shrink-0 [[data-theme=light]_&]:block", className)}
      />
    </>
  );
}

/** The M + wordmark, without a link. For auth / onboarding shells. */
export function BrandMark({
  size = "md",
  className,
}: {
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const height = size === "lg" ? 52 : size === "sm" ? 26 : 38;
  const text =
    size === "lg" ? "text-[26px]" : size === "sm" ? "text-[16px]" : "text-[20px]";

  return (
    <span className={cn("flex items-center gap-3", className)}>
      <MentorM height={height} />
      <span className={cn("font-semibold tracking-[-0.02em] text-fg", text)}>Mentor</span>
    </span>
  );
}
