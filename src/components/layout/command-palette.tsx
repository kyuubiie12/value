"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  BadgeCheck,
  LayoutDashboard,
  Moon,
  Search,
  Sun,
  UserRound,
  Wallet,
} from "lucide-react";
import type { ThemeMode } from "@/types";
import { updateSettingsAction } from "@/lib/actions";
import { cn } from "@/lib/utils";

interface Item {
  id: string;
  label: string;
  hint?: string;
  icon: React.ElementType;
  run: () => void;
  keywords?: string;
}

export function CommandPalette({ theme }: { theme: ThemeMode }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState("");
  const [active, setActive] = React.useState(0);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Reset the query each time the palette opens (render-phase, no effect).
  const [wasOpen, setWasOpen] = React.useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setQ("");
      setActive(0);
    }
  }

  React.useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const go = React.useCallback(
    (href: string) => {
      router.push(href);
      setOpen(false);
    },
    [router],
  );

  const items = React.useMemo<Item[]>(() => {
    const nav: Item[] = [
      { id: "feed", label: "Value Feed", icon: LayoutDashboard, run: () => go("/value-bets") },
      { id: "results", label: "Resultater", icon: BadgeCheck, run: () => go("/results") },
      { id: "portfolio", label: "Portfolio", icon: Wallet, run: () => go("/portfolio") },
      { id: "profile", label: "Profil", icon: UserRound, run: () => go("/profile") },
    ];
    const sections = [
      ["konto", "Konto"],
      ["udseende", "Udseende"],
      ["bankroll", "Bankroll & units"],
      ["feed", "Feed & value"],
      ["bookmakere", "Bookmakere"],
      ["ligaer", "Favoritligaer"],
      ["notifikationer", "Notifikationer"],
      ["ansvar", "Ansvarligt spil"],
      ["data", "Konto & data"],
    ].map<Item>(([id, label]) => ({
      id: `s-${id}`,
      label,
      hint: "Indstilling",
      icon: UserRound,
      run: () => go(`/profile?s=${id}`),
    }));
    const nextTheme: ThemeMode = theme === "light" ? "dark" : "light";
    const themeAction: Item = {
      id: "theme",
      label: nextTheme === "dark" ? "Skift til mørkt tema" : "Skift til lyst tema",
      hint: "Handling",
      icon: nextTheme === "dark" ? Moon : Sun,
      keywords: "tema theme dark light mørk lys",
      run: () => {
        setOpen(false);
        updateSettingsAction({ theme: nextTheme }).then(() => router.refresh());
      },
    };
    return [...nav, themeAction, ...sections];
  }, [go, router, theme]);

  const filtered = React.useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return items;
    return items.filter((i) =>
      `${i.label} ${i.hint ?? ""} ${i.keywords ?? ""}`
        .toLowerCase()
        .includes(term),
    );
  }, [items, q]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-start justify-center px-4 pt-[12vh]">
      <div
        className="absolute inset-0 bg-bg/70"
        onClick={() => setOpen(false)}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Kommandopalette"
        className="relative z-10 w-full max-w-lg overflow-hidden rounded-[var(--radius-lg)] border border-line-strong bg-bg-elevated shadow-[var(--shadow-pop)]"
      >
        <div className="flex items-center gap-2.5 border-b border-line px-4">
          <Search className="size-4 shrink-0 text-subtle" />
          <input
            autoFocus
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setActive(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((a) => Math.min(a + 1, filtered.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((a) => Math.max(a - 1, 0));
              } else if (e.key === "Enter") {
                e.preventDefault();
                filtered[active]?.run();
              }
            }}
            placeholder="Søg side, indstilling eller handling…"
            className="h-12 w-full bg-transparent text-[14px] text-fg outline-none placeholder:text-subtle"
          />
          <kbd className="hidden shrink-0 rounded bg-surface-2 px-1.5 py-0.5 text-[10px] font-medium text-subtle sm:block">
            ESC
          </kbd>
        </div>

        <div className="max-h-[52vh] overflow-y-auto p-1.5">
          {filtered.length === 0 ? (
            <p className="px-3 py-6 text-center text-[12px] text-subtle">
              Intet match
            </p>
          ) : (
            filtered.map((i, idx) => (
              <button
                key={i.id}
                type="button"
                onClick={i.run}
                onMouseEnter={() => setActive(idx)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-[var(--radius-sm)] px-3 py-2.5 text-left text-[13px] transition-colors",
                  idx === active
                    ? "bg-primary/12 text-fg"
                    : "text-muted hover:bg-surface-2/60",
                )}
              >
                <i.icon
                  className={cn(
                    "size-4 shrink-0",
                    idx === active ? "text-primary-strong" : "text-subtle",
                  )}
                  strokeWidth={2}
                />
                <span className="flex-1 font-medium">{i.label}</span>
                {i.hint && (
                  <span className="text-[10px] uppercase tracking-wide text-subtle">
                    {i.hint}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
