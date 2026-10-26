import * as React from "react";
import type { AppNotification, PortfolioStats, UserSettings } from "@/types";
import { TopNav } from "./top-nav";
import { ThemeSync } from "./theme-sync";
import { CommandPalette } from "./command-palette";
import { Spotlight } from "./spotlight";
import { LEGAL_LINKS } from "@/lib/site";

export function AppShell({
  stats,
  settings,
  notifications,
  notificationUnread,
  isAdmin = false,
  children,
}: {
  stats: PortfolioStats;
  settings: UserSettings;
  notifications: AppNotification[];
  notificationUnread: number;
  isAdmin?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <ThemeSync
        theme={settings.theme}
        accent={settings.accent}
        displayFont={settings.displayFont}
        surface={settings.surface}
        corners={settings.corners}
        glow={settings.glow}
        animations={settings.animations}
      />
      <Spotlight />
      <CommandPalette theme={settings.theme} />
      <TopNav
        stats={stats}
        settings={settings}
        notifications={notifications}
        notificationUnread={notificationUnread}
        isAdmin={isAdmin}
      />
      <main className="mx-auto w-full max-w-[1180px] flex-1 px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
        {children}
      </main>
      <footer className="border-t border-line">
        <div className="mx-auto max-w-[1180px] px-4 py-5 sm:px-6 lg:px-10">
          <p className="text-[11px] leading-relaxed text-subtle">
            Mentor er et analyse- og trackingværktøj. Vi formidler ikke spil
            og placerer ingen væddemål. Spil ansvarligt · 18+
            {" · "}
            <a href={LEGAL_LINKS.terms} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-fg">
              Vilkår
            </a>
            {" · "}
            <a href={LEGAL_LINKS.privacy} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-fg">
              Privatliv
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
