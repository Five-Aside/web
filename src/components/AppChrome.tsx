"use client";

import Link from "next/link";
import { useLeague, useLeagueLinks } from "@/components/LeagueProvider";
import { SiteNav } from "@/components/SiteNav";

export function AppChrome({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const league = useLeague();
  const { p } = useLeagueLinks();
  return (
    <div>
      <header className="sticky top-0 z-40 border-b border-line bg-pitch-deep/95 backdrop-blur-sm">
        <div className="section-shell flex h-14 items-center justify-between gap-4 sm:h-16">
          <Link
            href={p()}
            className="font-display shrink-0 text-xl tracking-[0.12em] text-flood"
          >
            {league.shortName}
          </Link>
          <SiteNav variant="app" />
        </div>
      </header>
      <main className="section-shell py-10 sm:py-14">
        <h1 className="font-display text-[clamp(2rem,4vw,2.75rem)] tracking-[0.02em] text-chalk">
          {title}
        </h1>
        <div className="mt-8">{children}</div>
      </main>
    </div>
  );
}

export { formatNaira } from "@/lib/schedule";
