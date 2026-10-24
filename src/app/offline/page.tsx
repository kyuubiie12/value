import type { Metadata } from "next";
import { WifiOff } from "lucide-react";

export const metadata: Metadata = { title: "Offline" };

/** Shown by the service worker when a page can't be reached. Public + static. */
export default function OfflinePage() {
  return (
    <main className="grid min-h-screen place-items-center bg-bg px-6 text-center">
      <div className="flex max-w-sm flex-col items-center gap-4">
        <span className="grid size-12 place-items-center rounded-[16px] bg-surface-2 text-muted ring-1 ring-inset ring-line">
          <WifiOff className="size-5" aria-hidden />
        </span>
        <h1 className="font-display text-xl font-semibold tracking-tight text-fg">
          Du er offline
        </h1>
        <p className="text-[13px] leading-relaxed text-muted">
          Value-feedet skal altid være friskt, så det kan ikke vises uden forbindelse. Prøv igen,
          når du har net.
        </p>
      </div>
    </main>
  );
}
