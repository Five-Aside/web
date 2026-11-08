import { NextResponse } from "next/server";
import { getPlayerIdFromSession, publicPlayer } from "@/lib/auth";
import { cycleFromRequest, jsonError, leagueRoute, noCycle } from "@/lib/league-api";
import { overallScore } from "@/lib/league-db";
import { findNextMatch } from "@/lib/next-match";
import { prisma } from "@/lib/prisma";
import { findFixture } from "@/lib/schedule";

export const GET = leagueRoute(async (request, lc) => {
  const playerId = await getPlayerIdFromSession(lc.league);
  if (!playerId) return jsonError("Unauthorized", 401);

  const cycle = await cycleFromRequest(request, lc);
  if (!cycle) return noCycle();

  const player = await prisma.player.findUnique({
    where: { id: playerId },
    include: { team: true },
  });
  if (!player) return jsonError("Not found", 404);

  const [payments, events, results] = await Promise.all([
    prisma.payment.findMany({
      where: { playerId, cycleId: cycle.id },
      orderBy: { paidAt: "desc" },
    }),
    prisma.matchEvent.findMany({
      where: { playerId, cycleId: cycle.id },
      orderBy: [{ week: "asc" }, { match: "asc" }],
    }),
    prisma.matchResult.findMany({
      where: { cycleId: cycle.id },
      select: { week: true, match: true, homeTeamId: true, awayTeamId: true },
    }),
  ]);

  let goals = 0;
  let assists = 0;
  let yc = 0;
  let rc = 0;
  for (const event of events) {
    if (event.type === "GOAL") goals += event.count;
    if (event.type === "ASSIST") assists += event.count;
    if (event.type === "YC") yc += event.count;
    if (event.type === "RC") rc += event.count;
  }

  const confirmed = payments.filter((p) => p.status === "confirmed");
  const claim = payments.find((p) => p.status === "claimed") ?? null;
  const paidTotal = confirmed.reduce((s, p) => s + p.amount, 0);

  let nextMatch = null;
  if (player.team && cycle.id === lc.cycle?.id) {
    const teamNumber = player.team.number;
    const playedKeys = new Set<string>();
    for (const r of results) {
      const fixture = findFixture(lc.schedule, r.week, r.match);
      const involved =
        r.homeTeamId === player.teamId ||
        r.awayTeamId === player.teamId ||
        fixture?.home === teamNumber ||
        fixture?.away === teamNumber;
      if (involved) playedKeys.add(`${r.week}-${r.match}`);
    }
    nextMatch = findNextMatch(lc.schedule, teamNumber, playedKeys);
  }

  const pendingProfile = player.status === "pending";

  return NextResponse.json({
    cycleKey: cycle.key,
    cycleLabel: cycle.label,
    player: publicPlayer(player),
    pendingProfile,
    awaitingRoster: !pendingProfile && !player.teamId,
    nextMatch,
    payment: {
      paidThisMonth: paidTotal > 0,
      permanentPaid: paidTotal >= cycle.monthlyFee,
      paidTotal,
      remaining: Math.max(0, cycle.monthlyFee - paidTotal),
      seat: player.seat,
      claim: claim
        ? {
            id: claim.id,
            amount: claim.amount,
            type: claim.type,
            paidAt: claim.paidAt,
            note: claim.note,
          }
        : null,
      payments: confirmed,
    },
    suspension: {
      matchesRemaining: player.suspensionMatchesRemaining,
      reason: player.suspensionReason,
    },
    stats: { goals, assists, yc, rc, overall: overallScore(goals, assists, yc, rc) },
    events,
  });
});
