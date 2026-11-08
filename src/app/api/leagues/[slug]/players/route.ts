import { NextResponse } from "next/server";
import { hashPassword, isOrganiser, publicPlayer, requireOrganiser } from "@/lib/auth";
import { jsonError, leagueRoute } from "@/lib/league-api";
import { clampOverall } from "@/lib/league-db";
import { prisma } from "@/lib/prisma";

function normalizePhone(phone: string) {
  return phone.replace(/\s+/g, "").trim();
}

export const GET = leagueRoute(async (request, { league }) => {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const q = searchParams.get("q")?.trim();
  const organiser = await isOrganiser(league);

  const players = await prisma.player.findMany({
    where: {
      leagueId: league.id,
      ...(status ? { status } : { status: { not: "guest" } }),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" as const } },
              ...(organiser ? [{ phone: { contains: q } }] : []),
            ],
          }
        : {}),
    },
    include: { team: true },
    orderBy: [{ status: "asc" }, { name: "asc" }],
  });

  return NextResponse.json(
    players.map((p) => {
      const rest = publicPlayer(p);
      return organiser ? rest : { ...rest, phone: "" };
    }),
  );
});

export const POST = leagueRoute(async (request, { league }) => {
  const body = (await request.json()) as {
    name?: string;
    phone?: string;
    password?: string;
    admin?: boolean;
  };

  if (!body.name?.trim() || !body.phone?.trim() || !body.password) {
    return jsonError("Name, phone, and password required", 400);
  }
  if (body.password.length < 4) {
    return jsonError("Password must be at least 4 characters", 400);
  }

  const phone = normalizePhone(body.phone);
  let status = "pending";
  if (body.admin) {
    await requireOrganiser(league);
    status = "active";
  }

  const existing = await prisma.player.findUnique({
    where: { leagueId_phone: { leagueId: league.id, phone } },
  });
  if (existing) {
    return jsonError("A profile with this phone already exists. Log in instead.", 409);
  }

  const player = await prisma.player.create({
    data: {
      leagueId: league.id,
      name: body.name.trim(),
      phone,
      passwordHash: hashPassword(body.password),
      status,
      seat: "sub",
    },
  });

  return NextResponse.json(publicPlayer(player), { status: 201 });
});

export const PATCH = leagueRoute(async (request, { league }) => {
  await requireOrganiser(league);

  const body = (await request.json()) as {
    id?: string;
    status?: string;
    seat?: string;
    teamId?: string | null;
    name?: string;
    phone?: string | null;
    overall?: number;
    role?: string;
  };
  if (!body.id) return jsonError("id required", 400);

  const target = await prisma.player.findFirst({
    where: { id: body.id, leagueId: league.id },
    select: { id: true },
  });
  if (!target) return jsonError("Not found", 404);

  if (body.teamId) {
    const team = await prisma.team.findFirst({
      where: { id: body.teamId, leagueId: league.id },
      select: { id: true },
    });
    if (!team) return jsonError("Unknown team", 400);
  }

  const player = await prisma.player.update({
    where: { id: body.id },
    data: {
      ...(body.status ? { status: body.status } : {}),
      ...(body.seat ? { seat: body.seat } : {}),
      ...(body.teamId !== undefined ? { teamId: body.teamId } : {}),
      ...(body.name ? { name: body.name.trim() } : {}),
      ...(body.phone ? { phone: normalizePhone(body.phone) } : {}),
      ...(body.overall !== undefined ? { overall: clampOverall(body.overall) } : {}),
      ...(body.role === "organiser" || body.role === "player" ? { role: body.role } : {}),
    },
    include: { team: true },
  });

  return NextResponse.json(publicPlayer(player));
});

export const DELETE = leagueRoute(async (request, { league }) => {
  await requireOrganiser(league);

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return jsonError("id required", 400);

  const player = await prisma.player.findFirst({
    where: { id, leagueId: league.id },
    select: { id: true, name: true, role: true },
  });
  if (!player) return jsonError("Not found", 404);
  if (player.role === "organiser") {
    return jsonError("Cannot delete an organiser account", 400);
  }

  await prisma.player.delete({ where: { id } });
  return NextResponse.json({ ok: true, name: player.name });
});
