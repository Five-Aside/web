import { NextResponse } from "next/server";
import { requireOrganiser } from "@/lib/auth";
import { validateFixtures } from "@/lib/fixture-generator";
import { jsonError, leagueRoute, noCycle } from "@/lib/league-api";
import { generateForLeague, replaceFixtures } from "@/lib/league-admin";
import { prisma } from "@/lib/prisma";
import type { FixtureRow } from "@/lib/schedule";

export const GET = leagueRoute(async (_request, lc) => {
  return NextResponse.json({ cycle: lc.schedule.cycle, fixtures: lc.schedule.fixtures });
});

/** Preview an auto-generated fixture list for the current cycle (not saved). */
export const POST = leagueRoute(async (request, lc) => {
  await requireOrganiser(lc.league);
  if (!lc.cycle) return noCycle();
  const body = (await request.json().catch(() => ({}))) as { matchesPerNight?: number };
  const perNight = body.matchesPerNight ? Math.round(Number(body.matchesPerNight)) : undefined;
  if (perNight !== undefined && (perNight < 1 || perNight > 30)) {
    return jsonError("Matches per night must be between 1 and 30", 400);
  }
  return NextResponse.json({
    fixtures: generateForLeague(lc.league, lc.cycle.weeks, perNight),
  });
});

function cleanRow(raw: Partial<FixtureRow>): FixtureRow {
  return {
    week: Math.round(Number(raw.week)),
    match: Math.round(Number(raw.match)),
    home: Math.round(Number(raw.home)),
    away: Math.round(Number(raw.away)),
    startTime: String(raw.startTime ?? ""),
    endTime: String(raw.endTime ?? ""),
    officials: Array.isArray(raw.officials)
      ? raw.officials.map((n) => Math.round(Number(n))).filter(Number.isFinite)
      : [],
  };
}

/** Replace the current cycle's fixtures. Fixtures with a logged result can't change teams. */
export const PUT = leagueRoute(async (request, lc) => {
  await requireOrganiser(lc.league);
  if (!lc.cycle) return noCycle();
  const body = (await request.json().catch(() => null)) as { fixtures?: Partial<FixtureRow>[] } | null;
  if (!body || !Array.isArray(body.fixtures)) return jsonError("fixtures required", 400);

  const rows = body.fixtures.map(cleanRow);
  const errors = validateFixtures(rows, lc.league.teamCount);
  for (const row of rows) {
    if (row.week < 1 || row.week > lc.cycle.weeks) {
      errors.push(`Week ${row.week} is outside this ${lc.cycle.weeks}-week cycle`);
    }
  }

  const results = await prisma.matchResult.findMany({
    where: { cycleId: lc.cycle.id },
    include: { homeTeam: { select: { number: true } }, awayTeam: { select: { number: true } } },
  });
  for (const r of results) {
    const row = rows.find((f) => f.week === r.week && f.match === r.match);
    if (!row || row.home !== r.homeTeam.number || row.away !== r.awayTeam.number) {
      errors.push(
        `Week ${r.week} Match ${r.match} already has a result — remove the result before changing that fixture`,
      );
    }
  }

  if (errors.length > 0) return NextResponse.json({ error: errors[0], errors }, { status: 400 });

  await prisma.$transaction((tx) => replaceFixtures(tx, lc.cycle!.id, rows));
  return NextResponse.json({ ok: true, count: rows.length });
});
