import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { trackRecordService } from "@/lib/services";
import { formatDate, formatPercent } from "@/lib/format";
import Image from "next/image";
import { BrandMark } from "@/components/shared/brand-mark";
import { LEGAL_LINKS } from "@/lib/site";

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
      <aside className="relative hidden overflow-hidden border-r border-line bg-surface lg:flex lg:flex-col lg:justify-start lg:p-12 xl:p-16">
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-32 right-8 hidden h-[520px] w-[440px] lg:block xl:right-14"
        >
          <PhoneShot src="/marketing/app-feed.webp" className="absolute left-0 top-20 w-[190px] -rotate-6 opacity-95" />
          <PhoneShot src="/marketing/app-detail.webp" className="absolute right-0 top-0 w-[210px] rotate-3" />
        </div>
        <div className="relative z-10">
          <BrandMark size="lg" />
        </div>

        <div className="relative z-10 max-w-md lg:mt-[16vh]">
          <h1 className="font-display text-[2.15rem] font-semibold leading-[1.12] tracking-tight text-fg xl:text-[2.6rem]">
            Se hvor oddsene er for høje —{" "}
            <span className="text-primary-strong">før markedet retter dem.</span>
          </h1>
          <p className="mt-4 max-w-sm text-[13.5px] leading-relaxed text-muted">
            Mentor sammenligner dine bookmakeres priser med fair odds og
            markerer spillene med værdi. Hvert pick bliver fulgt og gjort op
            offentligt.
          </p>

          {stats.picks > 0 && (
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
          )}

          <p className="mt-8 max-w-sm text-xs leading-relaxed text-subtle">
            Analyse- og trackingværktøj. Vi formidler ikke spil og placerer ingen
            væddemål. Spil ansvarligt · 18+
            {stats.picks > 0 && <> · Track record siden {formatDate(stats.since)}</>}
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
      </aside>

      {/* Form column */}
      <main className="flex min-h-screen flex-col items-center justify-center px-5 py-12 sm:px-8">
        <div className="w-full max-w-[420px]">
          <div className="mb-8 lg:hidden">
            <BrandMark size="lg" />
          </div>
          <div className="rounded-[1.9rem] border border-line bg-surface/40 p-1.5">
            <div className="rounded-[1.5rem] bg-bg-elevated px-6 py-8 shadow-[inset_0_1px_0_rgba(255,255,255,0.07)] sm:px-8">
              {children}
            </div>
          </div>
        </div>

        <p className="mt-10 max-w-[20rem] text-center text-xs leading-relaxed text-subtle lg:hidden">
          Vi formidler ikke spil og placerer ingen væddemål. Spil ansvarligt · 18+
          {" · "}
          <a href={LEGAL_LINKS.terms} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-fg">
            Vilkår
          </a>
          {" · "}
          <a href={LEGAL_LINKS.privacy} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-fg">
            Privatliv
          </a>
        </p>
      </main>
    </div>
  );
}

/** A phone frame around a real screenshot of the app. */
function PhoneShot({ src, className }: { src: string; className?: string }) {
  return (
    <div
      className={`rounded-[2.3rem] border border-white/15 bg-gradient-to-br from-[#1b2230] to-[#0c1018] p-[7px] shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_40px_70px_-35px_rgba(0,0,0,0.9)] ${className ?? ""}`}
    >
      <Image
        src={src}
        alt=""
        width={780}
        height={1688}
        unoptimized
        className="h-auto w-full rounded-[1.9rem]"
      />
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <dd className="tabular text-[1.35rem] font-semibold leading-none text-fg">
        {value}
      </dd>
      <dt className="mt-1.5 text-xs leading-tight text-subtle">{label}</dt>
    </div>
  );
}
