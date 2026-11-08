"use client";

import { createContext, useContext, useMemo } from "react";
import type { ClientLeague } from "@/lib/league-types";

const LeagueContext = createContext<ClientLeague | null>(null);

export function LeagueProvider({
  league,
  children,
}: {
  league: ClientLeague;
  children: React.ReactNode;
}) {
  return <LeagueContext.Provider value={league}>{children}</LeagueContext.Provider>;
}

export function useLeague() {
  const league = useContext(LeagueContext);
  if (!league) throw new Error("useLeague must be used inside a league page");
  return league;
}

/** `p("/tables")` → `/kadwell/tables`; `api("/stats")` → `/api/leagues/kadwell/stats`. */
export function useLeagueLinks() {
  const { slug } = useLeague();
  return useMemo(
    () => ({
      p: (path = "") => (path === "" || path === "/" ? `/${slug}` : `/${slug}${path}`),
      api: (path: string) => `/api/leagues/${slug}${path}`,
    }),
    [slug],
  );
}
