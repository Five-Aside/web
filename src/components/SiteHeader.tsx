"use client";

import Link from "next/link";
import { useLeague, useLeagueLinks } from "@/components/LeagueProvider";
import { SiteNav } from "@/components/SiteNav";

export function SiteHeader() {
  const league = useLeague();
  const { p } = useLeagueLinks();
  return (
    <header className="no-print fixed inset-x-0 top-0 z-40 border-b border-transparent bg-gradient-to-b from-pitch-deep/95 via-pitch-deep/70 to-transparent backdrop-blur-sm">
      <div className="section-shell flex h-14 items-center justify-between gap-3 sm:h-16">
        <Link
          href={p()}
          className="font-display text-xl tracking-[0.12em] text-flood transition hover:text-flood-soft"
        >
          {league.shortName}
        </Link>
        <SiteNav variant="home" />
      </div>
    </header>
  );
}
