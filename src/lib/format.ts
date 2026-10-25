import type { Currency } from "@/types";

const LOCALE = "da-DK";

export function formatCurrency(
  amount: number,
  currency: Currency = "DKK",
  opts: { maximumFractionDigits?: number } = {},
): string {
  return new Intl.NumberFormat(LOCALE, {
    style: "currency",
    currency,
    maximumFractionDigits: opts.maximumFractionDigits ?? 0,
  }).format(amount);
}

/** Currency with an explicit +/− sign — for P&L figures. */
export function formatSignedCurrency(amount: number, currency: Currency = "DKK"): string {
  const sign = amount > 0 ? "+" : amount < 0 ? "−" : "";
  return `${sign}${formatCurrency(Math.abs(amount), currency)}`;
}

/**
 * @param value fraction (0.074 → "7,4%")
 */
export function formatPercent(
  value: number,
  opts: { signed?: boolean; digits?: number } = {},
): string {
  const { signed = false, digits = 1 } = opts;
  const pct = value * 100;
  const sign = signed && pct > 0 ? "+" : signed && pct < 0 ? "−" : "";
  return `${sign}${Math.abs(pct).toLocaleString(LOCALE, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}%`;
}

export function formatOdds(odds: number): string {
  return odds.toLocaleString(LOCALE, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatUnits(units: number): string {
  return `${units.toLocaleString(LOCALE, {
    minimumFractionDigits: units % 1 === 0 ? 0 : 1,
    maximumFractionDigits: 2,
  })}u`;
}

export function formatNumber(value: number, digits = 0): string {
  return value.toLocaleString(LOCALE, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(LOCALE, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(LOCALE, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** "om 3 t", "i går", "for 2 dage siden" — compact relative time in Danish. */
export function formatRelativeTime(iso: string, now: Date = new Date()): string {
  const diffMs = new Date(iso).getTime() - now.getTime();
  const rtf = new Intl.RelativeTimeFormat(LOCALE, { numeric: "auto", style: "short" });
  const abs = Math.abs(diffMs);
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (abs < hour) return rtf.format(Math.round(diffMs / minute), "minute");
  if (abs < day) return rtf.format(Math.round(diffMs / hour), "hour");
  if (abs < 7 * day) return rtf.format(Math.round(diffMs / day), "day");
  return formatDate(iso);
}

/** Time until kick-off: "Om 5t 40m", "Om 45m", "I gang", "Slut". */
export function formatCountdown(iso: string, now: number = Date.now()): string {
  const diffMin = Math.round((new Date(iso).getTime() - now) / 60_000);
  if (diffMin <= -115) return "Slut";
  if (diffMin <= 0) return "I gang";
  if (diffMin < 60) return `Om ${diffMin}m`;
  const h = Math.floor(diffMin / 60);
  const m = diffMin % 60;
  if (h >= 36) {
    const d = Math.round(h / 24);
    return `Om ${d} ${d === 1 ? "dag" : "dage"}`;
  }
  // Only bother with minutes when kick-off is close.
  if (h >= 6 || m === 0) return `Om ${h}t`;
  return `Om ${h}t ${m}m`;
}

/** Just the clock time of an ISO instant, e.g. "18.30". */
export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(LOCALE, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Kick-off helper: "I dag 20:45", "Lør 18:00", or a date for far-off games. */
export function formatKickoff(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  const time = date.toLocaleTimeString(LOCALE, { hour: "2-digit", minute: "2-digit" });
  const sinceKickoff = now.getTime() - date.getTime();
  if (sinceKickoff >= 0 && sinceKickoff < 115 * 60_000) return `I gang (siden ${time})`;
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const days = Math.round(
    (startOfDay(date).getTime() - startOfDay(now).getTime()) / 86_400_000,
  );
  if (days === 0) return `I dag ${time}`;
  if (days === 1) return `I morgen ${time}`;
  if (days > 1 && days < 7) {
    const weekday = date.toLocaleDateString(LOCALE, { weekday: "short" });
    return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)} ${time}`;
  }
  return `${formatDate(iso)} ${time}`;
}
