import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { settingsService } from "@/lib/services";

export const dynamic = "force-dynamic";

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireUser();
  const settings = await settingsService.get();
  if (settings.onboardingComplete) redirect("/value-bets");

  return (
    <div className="relative flex min-h-screen flex-col items-center overflow-hidden bg-bg px-4 py-10 sm:py-16">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 size-[520px] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl"
      />
      <div className="relative z-10 w-full max-w-lg">{children}</div>
    </div>
  );
}
