import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FixturesSection } from "@/components/FixturesSection";
import { FormatSection } from "@/components/FormatSection";
import { LeagueOpsSection } from "@/components/LeagueOpsSection";
import { MatchLogSection } from "@/components/MatchLogSection";
import { PitchRulesSection } from "@/components/PitchRulesSection";
import { PrintButton } from "@/components/PrintButton";
import { RulesSection } from "@/components/RulesSection";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { WhySection } from "@/components/WhySection";
import { buildLeagueContent } from "@/data/league-content";
import { getLeagueContext } from "@/lib/league-context";

export const metadata: Metadata = { title: "Rules" };

export default async function RulesPage({ params }: { params: Promise<{ league: string }> }) {
  const { league: slug } = await params;
  const lc = await getLeagueContext(slug);
  if (!lc) notFound();
  const content = buildLeagueContent(lc.client);

  return (
    <>
      <SiteHeader />
      <main className="pt-14 sm:pt-16">
        <div className="section-shell border-b border-line py-10 sm:py-14">
          <h1 className="font-display text-[clamp(2rem,5vw,3rem)] tracking-[0.02em] text-chalk">
            League rules
          </h1>
          <p className="mt-3 max-w-2xl text-muted">
            How <span className="text-chalk">{lc.league.name}</span> runs — why we play a
            time-capped league instead of winner-stays-on, then format, fees, pitch laws, fines,
            fixtures, and the match log.
          </p>
          {content.rulesNotes ? (
            <div className="mt-6 max-w-2xl border border-flood/35 bg-black/20 px-5 py-4">
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-flood">
                Organiser notes
              </p>
              <p className="mt-2 whitespace-pre-line text-[0.95rem] leading-relaxed text-chalk/90">
                {content.rulesNotes}
              </p>
            </div>
          ) : null}
          <p className="mt-5">
            <PrintButton />
          </p>
        </div>
        <WhySection content={content} />
        <FormatSection content={content} />
        <LeagueOpsSection content={content} />
        <PitchRulesSection content={content} />
        <RulesSection content={content} />
        <FixturesSection />
        <MatchLogSection matches={content.matchesPerNight} weeks={lc.league.cycleWeeks} />
      </main>
      <SiteFooter leagueName={lc.league.name} />
    </>
  );
}
