import { NextResponse } from "next/server";
import { getPlayerIdFromSession, requireOrganiser } from "@/lib/auth";
import { jsonError, leagueRoute } from "@/lib/league-api";
import { prisma } from "@/lib/prisma";

export const GET = leagueRoute(async (_request, { league }) => {
  await requireOrganiser(league);
  const items = await prisma.feedback.findMany({
    where: { leagueId: league.id },
    include: { player: { select: { name: true, phone: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(items);
});

export const POST = leagueRoute(async (request, { league }) => {
  const body = (await request.json()) as { type?: string; message?: string; name?: string };
  if (!body.message?.trim()) return jsonError("Message required", 400);

  const item = await prisma.feedback.create({
    data: {
      leagueId: league.id,
      type: body.type === "complaint" ? "complaint" : "suggestion",
      message: body.message.trim(),
      name: body.name?.trim() || null,
      playerId: await getPlayerIdFromSession(league),
    },
  });
  return NextResponse.json({ id: item.id }, { status: 201 });
});

export const PATCH = leagueRoute(async (request, { league }) => {
  await requireOrganiser(league);
  const body = (await request.json()) as { id?: string; status?: string };
  if (!body.id || !body.status) return jsonError("id and status required", 400);

  const { count } = await prisma.feedback.updateMany({
    where: { id: body.id, leagueId: league.id },
    data: { status: body.status },
  });
  if (count === 0) return jsonError("Not found", 404);
  return NextResponse.json(await prisma.feedback.findUnique({ where: { id: body.id } }));
});
