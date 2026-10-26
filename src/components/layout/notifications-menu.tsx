"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  BellOff,
  Check,
  CircleAlert,
  FileText,
  Settings2,
  SlidersHorizontal,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";
import type { AppNotification, NotificationKind } from "@/types";
import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/lib/actions";
import { formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";

const ICON: Record<NotificationKind, React.ElementType> = {
  "value-alert": Zap,
  "bet-won": TrendingUp,
  "bet-lost": TrendingDown,
  "price-move": CircleAlert,
  report: FileText,
  system: Settings2,
};

const TONE: Record<NotificationKind, string> = {
  "value-alert": "text-primary",
  "bet-won": "text-positive",
  "bet-lost": "text-negative",
  "price-move": "text-warning",
  report: "text-info",
  system: "text-subtle",
};

export function NotificationsMenu({
  notifications,
  unread,
}: {
  notifications: AppNotification[];
  unread: number;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const markAll = () =>
    startTransition(async () => {
      await markAllNotificationsReadAction();
      router.refresh();
    });

  const openItem = (n: AppNotification) => {
    setOpen(false);
    if (!n.read) {
      startTransition(async () => {
        await markNotificationReadAction(n.id);
        router.refresh();
      });
    }
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`Notifikationer${unread ? `, ${unread} ulæste` : ""}`}
        aria-expanded={open}
        className={cn(
          "relative grid size-9 cursor-pointer place-items-center rounded-[var(--radius-sm)] transition-colors focus-visible:ring-2 focus-visible:ring-ring/40",
          open ? "bg-surface-2 text-fg" : "text-muted hover:bg-surface-2 hover:text-fg",
        )}
      >
        <Bell className="size-[18px]" strokeWidth={2} />
        {unread > 0 && (
          <span className="tabular absolute right-1 top-1 grid h-3.5 min-w-3.5 place-items-center rounded-full bg-primary px-1 text-[9px] font-bold leading-none text-primary-contrast ring-2 ring-bg">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          className={cn(
            "z-50 overflow-hidden rounded-[var(--radius)] border border-line-strong bg-bg-elevated shadow-[var(--shadow-pop)]",
            // Anchoring to the bell button's own tiny wrapper with `right-0`
            // pushes a 340px panel off the left edge on narrow viewports
            // (the wrapper sits well right of screen-center, not at the
            // viewport edge). Below `sm`, use `fixed` so it's positioned
            // against the viewport instead — a full-width sheet under the
            // header. From `sm` up there's enough room for the original
            // anchored popover.
            "fixed inset-x-4 top-[68px]",
            "sm:absolute sm:inset-x-auto sm:right-0 sm:top-11 sm:w-[340px]",
          )}
        >
          <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
            <span className="text-[13px] font-semibold text-fg">Notifikationer</span>
            {unread > 0 && (
              <button
                type="button"
                onClick={markAll}
                disabled={pending}
                className="flex items-center gap-1 text-[11px] font-medium text-muted transition-colors hover:text-fg disabled:opacity-50"
              >
                <Check className="size-3" />
                Markér alle læst
              </button>
            )}
          </div>

          <div className="max-h-[400px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-4 py-9 text-center">
                <span className="grid size-8 place-items-center rounded-full bg-surface-2 text-subtle">
                  <BellOff className="size-4" strokeWidth={2} />
                </span>
                <p className="text-xs text-subtle">Ingen notifikationer</p>
                <p className="max-w-[220px] text-[11px] leading-relaxed text-subtle/80">
                  Slå kategorier til på din profil for at få besked her.
                </p>
              </div>
            ) : (
              notifications.map((n) => {
                const Icon = ICON[n.kind];
                const inner = (
                  <div
                    className={cn(
                      "flex gap-3 px-4 py-3 transition-colors hover:bg-surface-2/60",
                      !n.read && "bg-primary/[0.04]",
                    )}
                  >
                    <Icon
                      className={cn("mt-0.5 size-4 shrink-0", TONE[n.kind])}
                      strokeWidth={2}
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium leading-snug text-fg">
                        {n.title}
                      </p>
                      <p className="mt-0.5 text-[12px] leading-snug text-muted">
                        {n.body}
                      </p>
                      <p className="mt-1 text-[10px] text-subtle">
                        {formatRelativeTime(n.createdAt)}
                      </p>
                    </div>
                    {!n.read && (
                      <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                    )}
                  </div>
                );
                return n.href ? (
                  <Link key={n.id} href={n.href} onClick={() => openItem(n)}>
                    {inner}
                  </Link>
                ) : (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => openItem(n)}
                    className="block w-full text-left"
                  >
                    {inner}
                  </button>
                );
              })
            )}
          </div>

          <Link
            href="/profile?s=notifikationer"
            onClick={() => setOpen(false)}
            className="flex items-center justify-center gap-1.5 border-t border-line px-4 py-2.5 text-[11px] font-medium text-muted transition-colors hover:bg-surface-2/60 hover:text-fg"
          >
            <SlidersHorizontal className="size-3" />
            Indstil notifikationer
          </Link>
        </div>
      )}
    </div>
  );
}
