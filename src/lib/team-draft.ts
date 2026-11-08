import { prisma } from "@/lib/prisma";

/**
 * Balance active permanent players across the league's teams by overall rating.
 * Highest OVRs first; each player joins the team with the lowest total
 * (tie-break: fewer players, then lower team number).
 */
export async function shuffleTeamsByOverall(leagueId: string, teamCount: number) {
  const teams = await prisma.team.findMany({
    where: { leagueId, number: { lte: teamCount } },
    orderBy: { number: "asc" },
  });
  if (teams.length < 2 || teams.length < teamCount) {
    throw new Error(`Need Teams 1–${teamCount} set up first`);
  }

  const pool = await prisma.player.findMany({
    where: { leagueId, status: "active", seat: "permanent" },
    select: { id: true, name: true, overall: true },
    orderBy: [{ overall: "desc" }, { name: "asc" }],
  });

  // Clear current permanent assignments before reshuffle
  await prisma.player.updateMany({
    where: { leagueId, status: "active", seat: "permanent" },
    data: { teamId: null },
  });

  const buckets = teams.map((t) => ({
    id: t.id,
    number: t.number,
    players: [] as { id: string; overall: number }[],
    total: 0,
  }));

  for (const p of pool) {
    buckets.sort((a, b) => {
      if (a.total !== b.total) return a.total - b.total;
      if (a.players.length !== b.players.length)
        return a.players.length - b.players.length;
      return a.number - b.number;
    });
    const target = buckets[0];
    target.players.push({ id: p.id, overall: p.overall });
    target.total += p.overall > 0 ? p.overall : 50; // unrated treated as mid for balance
  }

  for (const b of buckets) {
    for (const p of b.players) {
      await prisma.player.update({
        where: { id: p.id },
        data: { teamId: b.id },
      });
    }
  }

  return {
    assigned: pool.length,
    teams: buckets.map((b) => ({
      teamId: b.id,
      number: b.number,
      count: b.players.length,
      totalOvr: b.players.reduce((s, p) => s + (p.overall || 0), 0),
    })),
  };
}

/** Clear all team assignments (permanents + subs). */
export async function resetTeamAssignments(leagueId: string) {
  const result = await prisma.player.updateMany({
    where: { leagueId, teamId: { not: null } },
    data: { teamId: null },
  });
  return { cleared: result.count };
}
