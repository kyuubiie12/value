"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, ShieldCheck, X } from "lucide-react";
import type { AppNotification, PortfolioStats, UserSettings } from "@/types";
import { NAV_ITEMS } from "@/lib/navigation";
import { formatCurrency, formatPercent, formatSignedCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Brand } from "./brand";
import { NotificationsMenu } from "./notifications-menu";

export function TopNav({
  stats,
  settings,
  notifications,
  notificationUnread,
  isAdmin = false,
}: {
  stats: PortfolioStats;
  settings: UserSettings;
  notifications: AppNotification[];
  notificationUnread: number;
  isAdmin?: boolean;
}) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = React.useState(false);
  const [menuOpen, setMenuOpen] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 6);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  const initials =
    settings.displayName
      .split(" ")
      .map((w) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "VB";

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b bg-bg transition-[border-color,box-shadow] duration-200",
        scrolled
          ? "border-line-strong shadow-[0_10px_30px_-16px_rgba(3,7,14,0.9)]"
          : "border-line",
      )}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

      <div className="mx-auto flex h-[68px] max-w-[1180px] items-center gap-3 px-4 sm:px-6 lg:px-10">
        <Brand />

        <span className="mx-1.5 hidden h-6 w-px bg-line lg:block" />

        <nav className="hidden items-center gap-1.5 lg:flex">
          {[...NAV_ITEMS, ...(isAdmin ? [{ href: "/admin", label: "Admin", icon: ShieldCheck }] : [])].map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group flex items-center gap-2.5 whitespace-nowrap rounded-full px-[18px] py-2.5 text-[15px] font-semibold tracking-[-0.01em]",
                  "transition-[background-color,color,box-shadow,transform] duration-200 active:scale-[0.97]",
                  "outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                  active
                    ? "bg-primary text-primary-contrast shadow-[0_10px_28px_-12px_color-mix(in_oklab,var(--color-primary)_75%,transparent)]"
                    : "text-muted hover:bg-surface-2 hover:text-fg",
                )}
              >
                <Icon
                  className={cn(
                    "size-[19px] transition-transform duration-200",
                    active ? "text-primary-contrast" : "text-subtle group-hover:-translate-y-px group-hover:text-fg",
                  )}
                  strokeWidth={2.2}
                  aria-hidden
                />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <StatCluster stats={stats} />

          <NotificationsMenu
            notifications={notifications}
            unread={notificationUnread}
          />

          <Link
            href="/profile"
            aria-label="Din profil"
            className={cn(
              "hidden size-8 shrink-0 place-items-center rounded-full text-[11px] font-semibold text-fg ring-1 ring-inset transition-colors sm:grid",
              isActive("/profile")
                ? "bg-primary/15 text-primary-strong ring-primary/30"
                : "bg-surface-3 ring-line hover:ring-line-strong",
            )}
          >
            {initials}
          </Link>

          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? "Luk menu" : "Åbn menu"}
            aria-expanded={menuOpen}
            className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-[var(--radius-sm)] text-muted transition-colors hover:bg-surface-2 hover:text-fg lg:hidden"
          >
            {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="border-t border-line bg-bg lg:hidden">
          <nav className="mx-auto flex max-w-[1180px] flex-col gap-0.5 px-4 py-3 sm:px-6">
            {/* "Profil" itself is rendered below with the avatar badge —
                skip it here so it doesn't appear twice in the list. */}
            {NAV_ITEMS.filter((item) => item.href !== "/profile").map((item) => {
              const active = isActive(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-[var(--radius-sm)] px-3 py-2.5 text-[13px] transition-colors",
                    active
                      ? "bg-primary/12 text-primary-strong"
                      : "text-muted hover:bg-surface-2/60 hover:text-fg",
                  )}
                >
                  <Icon
                    className={cn(
                      "size-4",
                      active ? "text-primary-strong" : "text-subtle",
                    )}
                    strokeWidth={2}
                    aria-hidden
                  />
                  <span className="font-medium">{item.label}</span>
                  <span className="ml-auto text-[11px] text-subtle">
                    {item.description}
                  </span>
                </Link>
              );
            })}
            {isAdmin && (
              <Link
                href="/admin"
                onClick={() => setMenuOpen(false)}
                aria-current={isActive("/admin") ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-[var(--radius-sm)] px-3 py-2.5 text-[13px] transition-colors",
                  isActive("/admin")
                    ? "bg-primary/12 text-primary-strong"
                    : "text-muted hover:bg-surface-2/60 hover:text-fg",
                )}
              >
                <ShieldCheck className="size-4 text-subtle" strokeWidth={2} aria-hidden />
                <span className="font-medium">Admin</span>
                <span className="ml-auto text-[11px] text-subtle">Brugere og aktivitet</span>
              </Link>
            )}
            <Link
              href="/profile"
              onClick={() => setMenuOpen(false)}
              aria-current={isActive("/profile") ? "page" : undefined}
              className={cn(
                "mt-0.5 flex items-center gap-3 rounded-[var(--radius-sm)] px-3 py-2.5 text-[13px] transition-colors",
                isActive("/profile")
                  ? "bg-primary/12 text-primary-strong"
                  : "text-muted hover:bg-surface-2/60 hover:text-fg",
              )}
            >
              <span
                className={cn(
                  "grid size-4 place-items-center rounded-full text-[8px] font-semibold",
                  isActive("/profile")
                    ? "bg-primary/20 text-primary-strong"
                    : "bg-surface-3 text-fg",
                )}
              >
                {initials}
              </span>
              <span className="font-medium">Profil</span>
              <span className="ml-auto text-[11px] text-subtle">
                {NAV_ITEMS.find((i) => i.href === "/profile")?.description}
              </span>
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}

function StatCluster({ stats }: { stats: PortfolioStats }) {
  return (
    <div className="mr-1 hidden items-center divide-x divide-line/60 overflow-hidden rounded-full border border-line/60 bg-surface/70 sm:flex">
      <Stat label="Bankroll" value={formatCurrency(stats.bankroll, stats.currency)} />
      <Stat
        label="ROI"
        value={formatPercent(stats.roi, { signed: true })}
        tone={stats.roi >= 0 ? "positive" : "negative"}
      />
      <Stat
        className="hidden xl:flex"
        label="P&L"
        value={formatSignedCurrency(stats.totalProfit, stats.currency)}
        tone={stats.totalProfit >= 0 ? "positive" : "negative"}
      />
    </div>
  );
}

function Stat({
  label,
  value,
  tone = "neutral",
  className,
}: {
  label: string;
  value: string;
  tone?: "neutral" | "positive" | "negative";
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col justify-center px-3 py-1.5 leading-tight", className)}>
      <span className="text-[9px] font-medium uppercase tracking-[0.1em] text-subtle">
        {label}
      </span>
      <span
        className={cn(
          "tabular text-[13px] font-semibold",
          tone === "positive" && "text-positive",
          tone === "negative" && "text-negative",
          tone === "neutral" && "text-fg",
        )}
      >
        {value}
      </span>
    </div>
  );
}
