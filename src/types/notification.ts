export type NotificationKind =
  | "value-alert"
  | "bet-won"
  | "bet-lost"
  | "price-move"
  | "report"
  | "system";

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  createdAt: string; // ISO
  read: boolean;
  /** In-app link the notification points to. */
  href?: string;
}
