import { NextResponse } from "next/server";
import { requireOrganiser } from "@/lib/auth";
import { jsonError, leagueRoute } from "@/lib/league-api";
import { createCycle, nextCycleStart } from "@/lib/league-admin";
import { prisma } from "@/lib/prisma";
import { cycleLabel } from "@/lib/schedule";

const YMD = /^\d{4}-\d{2}-\d{2}$/;

export const GET = leagueRoute(async (_request, lc) => {
  const cycles = await prisma.cycle.findMany({
    where: { leagueId: lc.league.id },
    orderBy: { startDate: "desc" },
    select: { key: true, label: true, startDate: true, weeks: true, isCurrent: true },
  });
  return NextResponse.json({
    cycles,
    nextStart: lc.cycle ? nextCycleStart(lc.cycle) : null,
  });
});

/** Start the next cycle: new dates, fees from league settings, fresh auto-generated fixtures. */
export const POST = leagueRoute(async (request, lc) => {
  await requireOrganiser(lc.league);
  const body = (await request.json().catch(() => ({}))) as {
    startDate?: string;
    matchesPerNight?: number;
  };

  const startDate = body.startDate || (lc.cycle ? nextCycleStart(lc.cycle) : "");
  if (!YMD.test(startDate)) return jsonError("startDate must be YYYY-MM-DD", 400);
  if (lc.cycle && startDate <= lc.cycle.startDate) {
    return jsonError("The new cycle must start after the current one", 400);
  }

  const cycle = await prisma.$transaction(
    (tx) =>
      createCycle(tx, lc.league, startDate, {
        matchesPerNight: body.matchesPerNight ? Math.round(Number(body.matchesPerNight)) : undefined,
      }),
    { timeout: 30_000 },
  );

  return NextResponse.json({ cycle }, { status: 201 });
});

/** Correct the current cycle's start date (fixtures keep their week numbers). */
export const PATCH = leagueRoute(async (request, lc) => {
  await requireOrganiser(lc.league);
  if (!lc.cycle) return jsonError("No current cycle", 409);
  const body = (await request.json().catch(() => ({}))) as { startDate?: string };
  if (!body.startDate || !YMD.test(body.startDate)) {
    return jsonError("startDate must be YYYY-MM-DD", 400);
  }
  const cycle = await prisma.cycle.update({
    where: { id: lc.cycle.id },
    data: { startDate: body.startDate, label: cycleLabel(body.startDate, lc.cycle.weeks) },
  });
  return NextResponse.json({ cycle });
});
