import { NextResponse } from "next/server";
import { requireOrganiser } from "@/lib/auth";
import { cycleFromRequest, jsonError, leagueRoute, noCycle } from "@/lib/league-api";
import { prisma } from "@/lib/prisma";
import { applyCardSuspension } from "@/lib/suspensions";

const EVENT_TYPES = new Set(["GOAL", "ASSIST", "YC", "RC"]);

export const GET = leagueRoute(async (request, lc) => {
  const cycle = await cycleFromRequest(request, lc);
  if (!cycle) return NextResponse.json({ cycleKey: null, events: [] });

  const events = await prisma.matchEvent.findMany({
    where: { cycleId: cycle.id },
    include: {
      player: {
        select: { id: true, name: true, seat: true, photoPath: true, teamId: true, team: true },
      },
    },
    orderBy: [{ week: "asc" }, { match: "asc" }, { createdAt: "asc" }],
  });

  return NextResponse.json({ cycleKey: cycle.key, events });
});

export const POST = leagueRoute(async (request, lc) => {
  await requireOrganiser(lc.league);
  if (!lc.cycle) return noCycle();

  const body = (await request.json()) as {
    playerId?: string;
    week?: number;
    match?: number;
    type?: string;
    count?: number;
  };

  if (!body.playerId || !body.type || !EVENT_TYPES.has(body.type) || !body.week || !body.match) {
    return jsonError("playerId, week, match, and type required", 400);
  }

  const player = await prisma.player.findFirst({
    where: { id: body.playerId, leagueId: lc.league.id },
    select: { id: true },
  });
  if (!player) return jsonError("Unknown player", 400);

  const count = body.count && body.count > 0 ? body.count : 1;
  const event = await prisma.matchEvent.create({
    data: {
      playerId: body.playerId,
      cycleId: lc.cycle.id,
      week: body.week,
      match: body.match,
      type: body.type,
      count,
    },
    include: { player: { select: { id: true, name: true } } },
  });

  if (body.type === "YC" || body.type === "RC") {
    await applyCardSuspension(body.playerId, body.type, count, lc.cycle.id);
  }

  return NextResponse.json(event, { status: 201 });
});

export const DELETE = leagueRoute(async (request, { league }) => {
  await requireOrganiser(league);
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return jsonError("id required", 400);

  const { count } = await prisma.matchEvent.deleteMany({
    where: { id, cycle: { leagueId: league.id } },
  });
  if (count === 0) return jsonError("Not found", 404);
  return NextResponse.json({ ok: true });
});
