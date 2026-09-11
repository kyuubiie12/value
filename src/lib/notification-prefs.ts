import type { AppNotification, NotificationKind, UserSettings } from "@/types";

/** Which settings flag governs each notification kind. `system` is always on. */
export function notificationKindEnabled(
  kind: NotificationKind,
  settings: Pick<
    UserSettings,
    "valueAlerts" | "priceMoveAlerts" | "betResultAlerts" | "weeklyReport"
  >,
): boolean {
  switch (kind) {
    case "value-alert":
      return settings.valueAlerts;
    case "price-move":
      return settings.priceMoveAlerts;
    case "bet-won":
    case "bet-lost":
      return settings.betResultAlerts;
    case "report":
      return settings.weeklyReport;
    case "system":
      return true;
  }
}

/** Keep only notifications the user has opted in to. */
export function filterNotifications(
  notifications: AppNotification[],
  settings: Parameters<typeof notificationKindEnabled>[1],
): AppNotification[] {
  return notifications.filter((n) => notificationKindEnabled(n.kind, settings));
}
