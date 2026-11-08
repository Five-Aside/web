import { NextResponse } from "next/server";
import {
  clearPlayerSession,
  getPlayerIdFromSession,
  publicPlayer,
  setPlayerSession,
  verifyPassword,
} from "@/lib/auth";
import { jsonError, leagueRoute } from "@/lib/league-api";
import { prisma } from "@/lib/prisma";

export const GET = leagueRoute(async (_request, { league }) => {
  const playerId = await getPlayerIdFromSession(league);
  if (!playerId) return NextResponse.json({ player: null });

  const player = await prisma.player.findUnique({
    where: { id: playerId },
    include: { team: true },
  });
  return NextResponse.json({ player: player ? publicPlayer(player) : null });
});

export const POST = leagueRoute(async (request, { league }) => {
  const body = (await request.json().catch(() => null)) as {
    phone?: string;
    password?: string;
    action?: string;
  } | null;

  if (body?.action === "logout") {
    await clearPlayerSession(league);
    return NextResponse.json({ ok: true });
  }

  const phone = body?.phone?.replace(/\s+/g, "").trim();
  const password = body?.password;
  if (!phone || !password) return jsonError("Phone and password required", 400);

  const player = await prisma.player.findUnique({
    where: { leagueId_phone: { leagueId: league.id, phone } },
  });
  if (!player || !verifyPassword(password, player.passwordHash)) {
    await new Promise((resolve) => setTimeout(resolve, 600));
    return jsonError("Invalid login", 401);
  }

  await setPlayerSession(league, player.id);
  return NextResponse.json({
    player: publicPlayer(player),
    pending: player.status === "pending",
  });
});
