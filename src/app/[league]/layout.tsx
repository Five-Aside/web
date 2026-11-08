import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LeagueProvider } from "@/components/LeagueProvider";
import { isPlatformAdmin } from "@/lib/auth";
import { getLeagueContext } from "@/lib/league-context";
import { sessionLabel } from "@/lib/league-types";

type Props = { params: Promise<{ league: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { league: slug } = await params;
  const lc = await getLeagueContext(slug);
  if (!lc) return {};
  const { league } = lc;
  return {
    title: { default: `${league.name} — League`, template: `%s · ${league.shortName}` },
    description:
      league.tagline ||
      `${league.name} at ${league.venue} — ${sessionLabel(league)}. Fixtures, tables, payments and rules.`,
  };
}

export default async function LeagueLayout({
  params,
  children,
}: Props & { children: React.ReactNode }) {
  const { league: slug } = await params;
  const lc = await getLeagueContext(slug);
  if (!lc) notFound();

  if (lc.league.status === "paused" && !(await isPlatformAdmin())) {
    return (
      <main className="section-shell flex min-h-[70vh] flex-col justify-center py-16">
        <p className="text-[0.75rem] font-semibold uppercase tracking-[0.18em] text-flood">
          {lc.league.shortName}
        </p>
        <h1 className="font-display mt-3 text-[clamp(2rem,5vw,3rem)] tracking-[0.02em] text-chalk">
          {lc.league.name} is paused
        </h1>
        <p className="mt-4 max-w-xl text-muted">
          This league isn&apos;t running on the platform right now. Contact your organiser for
          details.
        </p>
      </main>
    );
  }

  return <LeagueProvider league={lc.client}>{children}</LeagueProvider>;
}
