import { NextResponse } from "next/server";
import { requireOrganiser } from "@/lib/auth";
import { jsonError, leagueRoute } from "@/lib/league-api";
import { prisma } from "@/lib/prisma";
import { resetTeamAssignments, shuffleTeamsByOverall } from "@/lib/team-draft";

export const GET = leagueRoute(async (_request, { league }) => {
  const teams = await prisma.team.findMany({
    where: { leagueId: league.id, number: { lte: league.teamCount } },
    orderBy: { number: "asc" },
    include: {
      players: {
        where: { status: "active" },
        select: {
          id: true,
          name: true,
          seat: true,
          status: true,
          overall: true,
          photoPath: true,
          role: true,
          teamId: true,
          suspensionMatchesRemaining: true,
        },
        orderBy: [{ overall: "desc" }, { name: "asc" }],
      },
    },
  });
  return NextResponse.json(teams);
});

export const POST = leagueRoute(async (request, { league }) => {
  await requireOrganiser(league);
  const body = (await request.json()) as { action?: string };

  if (body.action === "shuffle") {
    try {
      const result = await shuffleTeamsByOverall(league.id, league.teamCount);
      return NextResponse.json({ ok: true, ...result });
    } catch (e) {
      return jsonError(e instanceof Error ? e.message : "Shuffle failed", 400);
    }
  }

  if (body.action === "reset") {
    const result = await resetTeamAssignments(league.id);
    return NextResponse.json({ ok: true, ...result });
  }

  return jsonError("action must be shuffle or reset", 400);
});

export const PATCH = leagueRoute(async (request, { league }) => {
  await requireOrganiser(league);
  const body = (await request.json()) as { id?: string; name?: string };
  if (!body.id || !body.name?.trim()) return jsonError("id and name required", 400);

  const { count } = await prisma.team.updateMany({
    where: { id: body.id, leagueId: league.id },
    data: { name: body.name.trim() },
  });
  if (count === 0) return jsonError("Not found", 404);
  return NextResponse.json(await prisma.team.findUnique({ where: { id: body.id } }));
});
