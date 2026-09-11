import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { filterNotifications } from "@/lib/notification-prefs";
import { requireUser } from "@/lib/auth/session";
import {
  notificationService,
  portfolioService,
  settingsService,
} from "@/lib/services";

// User-scoped data is read per request; nothing here is cacheable.
export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireUser();

  const settings = await settingsService.get();
  if (!settings.onboardingComplete) redirect("/onboarding");

  const [stats, allNotifications] = await Promise.all([
    portfolioService.getStats(),
    notificationService.list(),
  ]);

  // Only show notifications the user has ticked on.
  const notifications = filterNotifications(allNotifications, settings);
  const notificationUnread = notifications.filter((n) => !n.read).length;

  return (
    <AppShell
      stats={stats}
      settings={settings}
      notifications={notifications}
      notificationUnread={notificationUnread}
    >
      {children}
    </AppShell>
  );
}
