import { NextResponse } from "next/server";
import { cycleFromRequest, leagueRoute } from "@/lib/league-api";
import { overallScore, type PlayerStatRow } from "@/lib/league-db";
import { prisma } from "@/lib/prisma";

export const GET = leagueRoute(async (request, lc) => {
  const cycle = await cycleFromRequest(request, lc);

  const events = cycle
    ? await prisma.matchEvent.findMany({
        where: { cycleId: cycle.id },
        include: { player: { include: { team: true } } },
      })
    : [];

  const map = new Map<string, PlayerStatRow>();
  for (const event of events) {
    const existing = map.get(event.playerId) ?? {
      playerId: event.playerId,
      name: event.player.name,
      teamName: event.player.team?.name ?? null,
      seat: event.player.seat,
      goals: 0,
      assists: 0,
      yc: 0,
      rc: 0,
      overall: 0,
    };

    if (event.type === "GOAL") existing.goals += event.count;
    if (event.type === "ASSIST") existing.assists += event.count;
    if (event.type === "YC") existing.yc += event.count;
    if (event.type === "RC") existing.rc += event.count;

    existing.overall = overallScore(existing.goals, existing.assists, existing.yc, existing.rc);
    map.set(event.playerId, existing);
  }

  const rows = Array.from(map.values());

  return NextResponse.json({
    cycleKey: cycle?.key ?? null,
    goals: [...rows].sort((a, b) => b.goals - a.goals || a.name.localeCompare(b.name)),
    assists: [...rows].sort((a, b) => b.assists - a.assists || a.name.localeCompare(b.name)),
    cards: [...rows].sort(
      (a, b) => b.yc + b.rc - (a.yc + a.rc) || b.rc - a.rc || a.name.localeCompare(b.name),
    ),
    overall: [...rows].sort((a, b) => b.overall - a.overall || a.name.localeCompare(b.name)),
  });
});
