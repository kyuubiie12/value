import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { filterNotifications } from "@/lib/notification-prefs";
import { requireUser } from "@/lib/auth/session";
import { isAdminEmail } from "@/lib/auth/admin";
import {
  notificationService,
  portfolioService,
  settingsService,
} from "@/lib/services";

// User-scoped data is read per request; nothing here is cacheable.
export const dynamic = "force-dynamic";
// The odds refresh runs after the response (see ValueService) and paces itself
// to the provider's rate limit, so give it room.
export const maxDuration = 300;

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  // Independent reads go out together — each one is a round trip to the database.
  const [settings, stats, allNotifications] = await Promise.all([
    settingsService.get(),
    portfolioService.getStats(),
    notificationService.list(),
  ]);
  if (!settings.onboardingComplete) redirect("/onboarding");

  // Only show notifications the user has ticked on.
  const notifications = filterNotifications(allNotifications, settings);
  const notificationUnread = notifications.filter((n) => !n.read).length;

  return (
    <AppShell
      stats={stats}
      settings={settings}
      notifications={notifications}
      notificationUnread={notificationUnread}
      isAdmin={isAdminEmail(user.email)}
    >
      {children}
    </AppShell>
  );
}
