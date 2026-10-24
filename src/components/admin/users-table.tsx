"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, Download, Search } from "lucide-react";
import type { AdminUserRow } from "@/lib/admin/queries";
import { formatCurrency, formatDate, formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableWrap, Td, Th, Tr } from "@/components/ui/table";
import { QuickChip } from "@/components/profile/parts";

type SortKey = "createdAt" | "lastSeenAt" | "bets" | "staked" | "profit" | "name";
type Filter = "all" | "new" | "active" | "bets" | "stuck";

const DAY = 86_400_000;

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "Alle" },
  { id: "new", label: "Nye (7 dage)" },
  { id: "active", label: "Logget ind (7 dage)" },
  { id: "bets", label: "Har bets" },
  { id: "stuck", label: "Ikke færdig med onboarding" },
];

function csvCell(v: string | number | boolean | null): string {
  const s = v === null ? "" : String(v);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function SortTh({
  k,
  children,
  right,
  sort,
  onSort,
}: {
  k: SortKey;
  children: React.ReactNode;
  right?: boolean;
  sort: { key: SortKey; dir: 1 | -1 };
  onSort: (k: SortKey) => void;
}) {
  return (
    <Th className={cn(right && "text-right")}>
      <button
        type="button"
        onClick={() => onSort(k)}
        className={cn(
          "inline-flex cursor-pointer items-center gap-1 uppercase tracking-[0.08em] transition-colors hover:text-fg",
          sort.key === k && "text-fg",
        )}
      >
        {children}
        {sort.key === k &&
          (sort.dir === 1 ? (
            <ArrowUp className="size-3" aria-hidden />
          ) : (
            <ArrowDown className="size-3" aria-hidden />
          ))}
      </button>
    </Th>
  );
}

export function UsersTable({ users }: { users: AdminUserRow[] }) {
  const [q, setQ] = React.useState("");
  const [filter, setFilter] = React.useState<Filter>("all");
  const [sort, setSort] = React.useState<{ key: SortKey; dir: 1 | -1 }>({
    key: "createdAt",
    dir: -1,
  });

  // Frozen at mount: filters like "seneste 7 dage" are relative to when the list was opened.
  const [now] = React.useState(() => Date.now());
  const rows = React.useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = users.filter((u) => {
      if (needle && !`${u.name} ${u.email}`.toLowerCase().includes(needle)) return false;
      if (filter === "new") return now - new Date(u.createdAt).getTime() < 7 * DAY;
      if (filter === "active")
        return !!u.lastSeenAt && now - new Date(u.lastSeenAt).getTime() < 7 * DAY;
      if (filter === "bets") return u.bets > 0;
      if (filter === "stuck") return !u.onboarded;
      return true;
    });
    const val = (u: AdminUserRow): number | string => {
      switch (sort.key) {
        case "name":
          return u.name.toLowerCase();
        case "createdAt":
          return new Date(u.createdAt).getTime();
        case "lastSeenAt":
          return u.lastSeenAt ? new Date(u.lastSeenAt).getTime() : 0;
        default:
          return u[sort.key];
      }
    };
    return [...list].sort((a, b) => {
      const x = val(a);
      const y = val(b);
      return (x < y ? -1 : x > y ? 1 : 0) * sort.dir;
    });
  }, [users, q, filter, sort, now]);

  const toggleSort = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, dir: (s.dir * -1) as 1 | -1 } : { key, dir: -1 }));

  const exportCsv = () => {
    const header = [
      "email",
      "navn",
      "oprettet",
      "sidst_logget_ind",
      "onboarding_faerdig",
      "plan",
      "valuta",
      "bookmakere",
      "bets",
      "indsats",
      "resultat",
    ];
    const lines = rows.map((u) =>
      [
        u.email,
        u.name,
        u.createdAt,
        u.lastSeenAt,
        u.onboarded,
        u.plan,
        u.currency,
        u.bookmakers,
        u.bets,
        Math.round(u.staked),
        Math.round(u.profit),
      ]
        .map(csvCell)
        .join(";"),
    );
    // BOM so Excel opens æ/ø/å correctly.
    const blob = new Blob(["﻿" + [header.join(";"), ...lines].join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `valuebet-brugere-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative sm:w-80">
          <Search
            className="pointer-events-none absolute left-4 top-1/2 size-3.5 -translate-y-1/2 text-subtle"
            aria-hidden
          />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Søg navn eller e-mail…"
            aria-label="Søg i brugere"
            className="h-10 rounded-full pl-10"
          />
        </div>
        <button
          type="button"
          onClick={exportCsv}
          className="glow-hover inline-flex h-10 w-fit items-center gap-1.5 rounded-full border border-line/70 bg-surface-2 px-4 text-xs font-medium text-muted transition-colors hover:text-fg"
        >
          <Download className="size-3.5" aria-hidden />
          Eksportér CSV ({rows.length})
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <QuickChip key={f.id} active={filter === f.id} onClick={() => setFilter(f.id)}>
            {f.label}
          </QuickChip>
        ))}
      </div>

      <TableWrap>
        <Table>
          <thead>
            <tr>
              <SortTh k="name" sort={sort} onSort={toggleSort}>Bruger</SortTh>
              <SortTh k="createdAt" sort={sort} onSort={toggleSort}>Oprettet</SortTh>
              <SortTh k="lastSeenAt" sort={sort} onSort={toggleSort}>Sidst logget ind</SortTh>
              <Th>Status</Th>
              <SortTh k="bets" right sort={sort} onSort={toggleSort}>
                Bets
              </SortTh>
              <SortTh k="staked" right sort={sort} onSort={toggleSort}>
                Indsats
              </SortTh>
              <SortTh k="profit" right sort={sort} onSort={toggleSort}>
                Resultat
              </SortTh>
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => (
              <Tr key={u.id}>
                <Td>
                  <Link
                    href={`/admin/users/${u.id}`}
                    className="group block outline-none"
                  >
                    <span className="block text-[13px] font-medium text-fg group-hover:text-primary-strong group-focus-visible:underline">
                      {u.name}
                    </span>
                    <span className="block text-[11.5px] text-subtle">{u.email}</span>
                  </Link>
                </Td>
                <Td className="text-muted">{formatDate(u.createdAt)}</Td>
                <Td className="text-muted">
                  {u.lastSeenAt ? formatRelativeTime(u.lastSeenAt) : "—"}
                  {u.activeSessions > 0 && (
                    <span
                      className="ml-1.5 inline-block size-1.5 rounded-full bg-positive align-middle"
                      title="Har en aktiv session"
                    />
                  )}
                </Td>
                <Td>
                  <span className="flex gap-1.5">
                    {!u.onboarded && <Badge tone="warning">Onboarding</Badge>}
                    {u.plan === "pro" && <Badge tone="primary">Pro</Badge>}
                    {u.onboarded && u.plan !== "pro" && (
                      <span className="text-[12px] text-subtle">Aktiv</span>
                    )}
                  </span>
                </Td>
                <Td className="tabular text-right">{u.bets}</Td>
                <Td className="tabular text-right text-muted">
                  {u.bets ? formatCurrency(u.staked, u.currency) : "—"}
                </Td>
                <Td
                  className={cn(
                    "tabular text-right font-medium",
                    u.bets === 0
                      ? "text-subtle"
                      : u.profit >= 0
                        ? "text-positive"
                        : "text-negative",
                  )}
                >
                  {u.bets ? formatCurrency(u.profit, u.currency) : "—"}
                </Td>
              </Tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-[13px] text-subtle">
                  Ingen brugere matcher.
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </TableWrap>
    </div>
  );
}
