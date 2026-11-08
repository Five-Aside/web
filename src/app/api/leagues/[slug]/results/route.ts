import { NextResponse } from "next/server";
import { requireOrganiser } from "@/lib/auth";
import { cycleFromRequest, jsonError, leagueRoute, noCycle } from "@/lib/league-api";
import { prisma } from "@/lib/prisma";
import { findFixture } from "@/lib/schedule";
import { buildStandings } from "@/lib/standings";
import { serveSuspensionsForTeam } from "@/lib/suspensions";

export const GET = leagueRoute(async (request, lc) => {
  const cycle = await cycleFromRequest(request, lc);
  const teams = await prisma.team.findMany({
    where: { leagueId: lc.league.id, number: { lte: lc.league.teamCount } },
    orderBy: { number: "asc" },
  });
  if (!cycle) {
    return NextResponse.json({
      cycleKey: null,
      results: [],
      standings: buildStandings(teams, [], []),
    });
  }

  const [results, events] = await Promise.all([
    prisma.matchResult.findMany({
      where: { cycleId: cycle.id },
      include: { homeTeam: true, awayTeam: true },
      orderBy: [{ week: "asc" }, { match: "asc" }],
    }),
    prisma.matchEvent.findMany({
      where: { cycleId: cycle.id, type: { in: ["YC", "RC"] } },
      include: { player: { select: { teamId: true } } },
    }),
  ]);

  const standings = buildStandings(
    teams,
    results.map((r) => ({
      homeTeamId: r.homeTeamId,
      awayTeamId: r.awayTeamId,
      homeGoals: r.homeGoals,
      awayGoals: r.awayGoals,
    })),
    events,
  );

  return NextResponse.json({ cycleKey: cycle.key, results, standings });
});

export const POST = leagueRoute(async (request, lc) => {
  await requireOrganiser(lc.league);
  if (!lc.cycle) return noCycle();

  const body = (await request.json()) as {
    week?: number;
    match?: number;
    homeGoals?: number;
    awayGoals?: number;
  };

  const week = Number(body.week);
  const match = Number(body.match);
  const homeGoals = Math.round(Number(body.homeGoals));
  const awayGoals = Math.round(Number(body.awayGoals));

  if (
    !week ||
    !match ||
    !Number.isFinite(homeGoals) ||
    !Number.isFinite(awayGoals) ||
    homeGoals < 0 ||
    awayGoals < 0
  ) {
    return jsonError("week, match, and non-negative scores required", 400);
  }

  const fixture = findFixture(lc.schedule, week, match);
  if (!fixture) return jsonError("Unknown fixture", 400);

  const [homeTeam, awayTeam] = await Promise.all([
    prisma.team.findUnique({
      where: { leagueId_number: { leagueId: lc.league.id, number: fixture.home } },
    }),
    prisma.team.findUnique({
      where: { leagueId_number: { leagueId: lc.league.id, number: fixture.away } },
    }),
  ]);
  if (!homeTeam || !awayTeam) return jsonError("Teams not set up", 400);

  const cycleId = lc.cycle.id;
  const key = { cycleId_week_match: { cycleId, week, match } };
  const existing = await prisma.matchResult.findUnique({ where: key });

  const result = await prisma.matchResult.upsert({
    where: key,
    create: {
      cycleId,
      week,
      match,
      homeTeamId: homeTeam.id,
      awayTeamId: awayTeam.id,
      homeGoals,
      awayGoals,
      status: "final",
    },
    update: {
      homeTeamId: homeTeam.id,
      awayTeamId: awayTeam.id,
      homeGoals,
      awayGoals,
      status: "final",
    },
    include: { homeTeam: true, awayTeam: true },
  });

  // Serve one ban match only when this fixture result is first logged.
  if (!existing) {
    await serveSuspensionsForTeam(homeTeam.id);
    await serveSuspensionsForTeam(awayTeam.id);
  }

  return NextResponse.json(result, { status: 201 });
});

export const DELETE = leagueRoute(async (request, { league }) => {
  await requireOrganiser(league);
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return jsonError("id required", 400);

  const { count } = await prisma.matchResult.deleteMany({
    where: { id, cycle: { leagueId: league.id } },
  });
  if (count === 0) return jsonError("Not found", 404);
  return NextResponse.json({ ok: true });
});
