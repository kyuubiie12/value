import type { Metadata } from "next";
import { bookmakerService, leagueService, settingsService } from "@/lib/services";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";

export const metadata: Metadata = { title: "Kom godt i gang" };

export default async function OnboardingPage() {
  const [bookmakers, leagues, settings] = await Promise.all([
    bookmakerService.list(),
    leagueService.list(),
    settingsService.get(),
  ]);

  return (
    <OnboardingWizard
      firstName={settings.displayName.split(" ")[0]}
      bookmakers={bookmakers}
      leagues={leagues}
      defaults={{
        bankroll: settings.startingBankroll,
        currency: settings.currency,
        autoFollowMinEdge: settings.autoFollowMinEdge,
        appearance: {
          theme: settings.theme,
          accent: settings.accent,
          displayFont: settings.displayFont,
          surface: settings.surface,
          corners: settings.corners,
          glow: settings.glow,
          animations: settings.animations,
        },
      }}
    />
  );
}
