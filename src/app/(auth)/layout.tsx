import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { trackRecordService } from "@/lib/services";
import { formatDate, formatPercent } from "@/lib/format";
import { BrandMark } from "@/components/shared/brand-mark";

export const dynamic = "force-dynamic";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (await getCurrentUser()) redirect("/value-bets");

  const stats = await trackRecordService.getStats();

  return (
    <div className="min-h-screen bg-bg lg:grid lg:grid-cols-[1.05fr_1fr]">
      {/* Marketing / trust panel — desktop only */}
      <aside className="relative hidden overflow-hidden border-r border-line bg-surface lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-16">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.5]"
          style={{
            backgroundImage:
              "radial-gradient(120% 90% at 15% 0%, color-mix(in oklab, var(--color-primary) 14%, transparent), transparent 55%)",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.35] [mask-image:radial-gradient(80%_60%_at_20%_10%,black,transparent)]"
          style={{
            backgroundImage:
              "linear-gradient(var(--color-line) 1px, transparent 1px), linear-gradient(90deg, var(--color-line) 1px, transparent 1px)",
            backgroundSize: "46px 46px",
          }}
        />

        <div className="relative z-10">
          <BrandMark size="md" />
        </div>

        <div className="relative z-10 max-w-md">
          <h1 className="font-display text-[2.15rem] font-semibold leading-[1.12] tracking-tight text-fg xl:text-[2.6rem]">
            Se hvor oddsene er for høje —{" "}
            <span className="text-primary-strong">før markedet retter dem.</span>
          </h1>
          <p className="mt-4 max-w-sm text-[13.5px] leading-relaxed text-muted">
            ValueBet AI sammenligner dine bookmakeres priser med fair odds og
            markerer spillene med værdi. Hvert pick bliver fulgt og gjort op
            offentligt.
          </p>

          <dl className="mt-9 grid grid-cols-3 gap-5 border-t border-line pt-7">
            <Stat
              value={formatPercent(stats.roi, { signed: true })}
              label="Yield på delte picks"
            />
            <Stat
              value={formatPercent(stats.clvBeatRate)}
              label="Slår slutodds"
            />
            <Stat value={String(stats.picks)} label="Picks gjort op" />
          </dl>
        </div>

        <p className="relative z-10 text-[11px] leading-relaxed text-subtle">
          Analyse- og trackingværktøj. Vi formidler ikke spil og placerer ingen
          væddemål. Spil ansvarligt · 18+ · Track record siden{" "}
          {formatDate(stats.since)}
        </p>
      </aside>

      {/* Form column */}
      <main className="flex min-h-screen flex-col items-center justify-center px-5 py-12 sm:px-8">
        <div className="w-full max-w-[380px]">
          <div className="mb-9 lg:hidden">
            <BrandMark size="md" />
          </div>
          {children}
        </div>

        <p className="mt-10 max-w-[20rem] text-center text-[11px] leading-relaxed text-subtle lg:hidden">
          Vi formidler ikke spil og placerer ingen væddemål. Spil ansvarligt · 18+
        </p>
      </main>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <dd className="tabular text-[1.35rem] font-semibold leading-none text-fg">
        {value}
      </dd>
      <dt className="mt-1.5 text-[11px] leading-tight text-subtle">{label}</dt>
    </div>
  );
}
