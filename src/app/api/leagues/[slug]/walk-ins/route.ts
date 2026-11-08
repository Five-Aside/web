import { NextResponse } from "next/server";
import { requireOrganiser } from "@/lib/auth";
import { cycleFromRequest, jsonError, leagueRoute, noCycle } from "@/lib/league-api";
import { prisma } from "@/lib/prisma";

export const GET = leagueRoute(async (request, lc) => {
  const cycle = await cycleFromRequest(request, lc);
  const walkIns = cycle
    ? await prisma.walkInPayment.findMany({
        where: { cycleId: cycle.id },
        orderBy: { paidAt: "desc" },
      })
    : [];
  return NextResponse.json({ cycleKey: cycle?.key ?? null, walkIns });
});

export const POST = leagueRoute(async (request, lc) => {
  await requireOrganiser(lc.league);
  if (!lc.cycle) return noCycle();

  const body = (await request.json()) as { name?: string; amount?: number; note?: string };
  if (!body.name?.trim() || !body.amount || body.amount <= 0) {
    return jsonError("Name and positive amount required", 400);
  }

  const walkIn = await prisma.walkInPayment.create({
    data: {
      leagueId: lc.league.id,
      cycleId: lc.cycle.id,
      name: body.name.trim(),
      amount: Math.round(body.amount),
      note: body.note?.trim() || "On-field / unregistered",
    },
  });
  return NextResponse.json(walkIn, { status: 201 });
});

export const DELETE = leagueRoute(async (request, { league }) => {
  await requireOrganiser(league);
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return jsonError("id required", 400);

  const { count } = await prisma.walkInPayment.deleteMany({
    where: { id, leagueId: league.id },
  });
  if (count === 0) return jsonError("Not found", 404);
  return NextResponse.json({ ok: true });
});
