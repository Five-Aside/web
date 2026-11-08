import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { hashPassword, requireOrganiser } from "@/lib/auth";
import { jsonError, leagueRoute, noCycle } from "@/lib/league-api";
import type { LeagueContext } from "@/lib/league-context";
import { prisma } from "@/lib/prisma";
import { findFixture } from "@/lib/schedule";
import { applyCardSuspension, serveSuspensionsForTeam, type ServedBan } from "@/lib/suspensions";

type Side = "home" | "away";

type LiveAction =
  | { action: "start" }
  | { action: "reset" }
  | {
      action: "goal";
      side: Side;
      playerId?: string | null;
      playerName?: string | null;
      assistId?: string | null;
      assistName?: string | null;
    }
  | {
      action: "card";
      side?: Side | null;
      playerId?: string | null;
      playerName?: string | null;
      type: "YC" | "RC";
    }
  | { action: "adjust"; side: Side; delta: 1 | -1 }
  | { action: "undo"; eventId: string }
  | { action: "status"; status: "live" | "final" };

class LiveError extends Error {}

function isSide(value: unknown): value is Side {
  return value === "home" || value === "away";
}

async function loadMatch(lc: LeagueContext, week: number, match: number) {
  const fixture = findFixture(lc.schedule, week, match);
  if (!fixture) return null;
  const [homeTeam, awayTeam] = await Promise.all([
    prisma.team.findUnique({
      where: { leagueId_number: { leagueId: lc.league.id, number: fixture.home } },
      select: { id: true, number: true, name: true },
    }),
    prisma.team.findUnique({
      where: { leagueId_number: { leagueId: lc.league.id, number: fixture.away } },
      select: { id: true, number: true, name: true },
    }),
  ]);
  if (!homeTeam || !awayTeam) return null;
  return { fixture, homeTeam, awayTeam };
}

async function matchState(lc: LeagueContext, cycleId: string, week: number, match: number) {
  const loaded = await loadMatch(lc, week, match);
  if (!loaded) return null;
  const [result, events, players] = await Promise.all([
    prisma.matchResult.findUnique({
      where: { cycleId_week_match: { cycleId, week, match } },
      select: { id: true, homeGoals: true, awayGoals: true, status: true },
    }),
    prisma.matchEvent.findMany({
      where: { cycleId, week, match },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        type: true,
        count: true,
        side: true,
        createdAt: true,
        player: { select: { id: true, name: true, teamId: true } },
      },
    }),
    prisma.player.findMany({
      where: { leagueId: lc.league.id, status: { in: ["active", "guest"] } },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        status: true,
        teamId: true,
        suspensionMatchesRemaining: true,
      },
    }),
  ]);
  return { week, match, ...loaded, result, events, players };
}

function weekMatch(searchParams: URLSearchParams | Record<string, unknown>) {
  const get = (k: string) =>
    searchParams instanceof URLSearchParams ? searchParams.get(k) : searchParams[k];
  const week = Math.round(Number(get("week")));
  const match = Math.round(Number(get("match")));
  return week > 0 && match > 0 ? { week, match } : null;
}

export const GET = leagueRoute(async (request, lc) => {
  await requireOrganiser(lc.league);
  if (!lc.cycle) return noCycle();
  const wm = weekMatch(new URL(request.url).searchParams);
  if (!wm) return jsonError("week and match required", 400);
  const state = await matchState(lc, lc.cycle.id, wm.week, wm.match);
  if (!state) return jsonError("Unknown fixture", 400);
  return NextResponse.json(state);
});

export const POST = leagueRoute(async (request, lc) => {
  await requireOrganiser(lc.league);
  if (!lc.cycle) return noCycle();
  const cycleId = lc.cycle.id;

  const body = (await request.json().catch(() => null)) as
    | (LiveAction & { week?: number; match?: number })
    | null;
  if (!body) return jsonError("Invalid body", 400);
  const wm = weekMatch(body as Record<string, unknown>);
  if (!wm) return jsonError("week and match required", 400);
  const loaded = await loadMatch(lc, wm.week, wm.match);
  if (!loaded) return jsonError("Unknown fixture", 400);
  const { homeTeam, awayTeam } = loaded;

  const playerIds = [
    "playerId" in body ? body.playerId : null,
    "assistId" in body ? body.assistId : null,
  ].filter((id): id is string => typeof id === "string" && id.length > 0);
  if (playerIds.length) {
    const found = await prisma.player.count({
      where: { id: { in: playerIds }, leagueId: lc.league.id },
    });
    if (found !== new Set(playerIds).size) return jsonError("Unknown player", 400);
  }

  const key = { cycleId_week_match: { cycleId, week: wm.week, match: wm.match } };
  const after: { createdResult: boolean; card: { playerId: string; type: "YC" | "RC" } | null } = {
    createdResult: false,
    card: null,
  };

  async function ensureResult(tx: Prisma.TransactionClient) {
    const existing = await tx.matchResult.findUnique({ where: key });
    if (existing) return existing;
    after.createdResult = true;
    return tx.matchResult.create({
      data: {
        cycleId,
        week: wm!.week,
        match: wm!.match,
        homeTeamId: homeTeam.id,
        awayTeamId: awayTeam.id,
        homeGoals: 0,
        awayGoals: 0,
        status: "live",
      },
    });
  }

  async function bump(tx: Prisma.TransactionClient, side: Side, delta: number) {
    const result = await ensureResult(tx);
    const field = side === "home" ? "homeGoals" : "awayGoals";
    await tx.matchResult.update({
      where: { id: result.id },
      data: { [field]: Math.max(0, result[field] + delta) },
    });
  }

  const eventBase = { cycleId, week: wm.week, match: wm.match, count: 1 };
  const leagueId = lc.league.id;

  /**
   * A typed name reuses a registered or guest player with that name, otherwise it
   * creates a guest: no login, kept out of Players/Payments/draft, but credited in stats.
   */
  async function resolvePlayer(
    tx: Prisma.TransactionClient,
    id: string | null | undefined,
    name: string | null | undefined,
  ) {
    if (id) return id;
    const clean = (name ?? "").trim().replace(/\s+/g, " ").slice(0, 60);
    if (!clean) return null;
    const existing = await tx.player.findFirst({
      where: {
        leagueId,
        status: { in: ["active", "guest"] },
        name: { equals: clean, mode: "insensitive" },
      },
      orderBy: { status: "asc" },
      select: { id: true },
    });
    if (existing) return existing.id;
    const phone = `guest:${clean.toLowerCase()}`;
    const guest = await tx.player.upsert({
      where: { leagueId_phone: { leagueId, phone } },
      create: {
        leagueId,
        name: clean,
        phone,
        passwordHash: hashPassword(randomUUID()),
        status: "guest",
        seat: "sub",
      },
      update: { status: "guest" },
      select: { id: true },
    });
    return guest.id;
  }

  try {
    await prisma.$transaction(async (tx) => {
      switch (body.action) {
        case "start": {
          const result = await ensureResult(tx);
          if (result.status !== "live") {
            await tx.matchResult.update({ where: { id: result.id }, data: { status: "live" } });
          }
          break;
        }
        case "goal": {
          if (!isSide(body.side)) throw new LiveError("side must be home or away");
          const scorerId = await resolvePlayer(tx, body.playerId, body.playerName);
          const assistId = await resolvePlayer(tx, body.assistId, body.assistName);
          if (assistId && !scorerId) {
            throw new LiveError("Pick the scorer before adding an assist");
          }
          if (assistId && assistId === scorerId) {
            throw new LiveError("Scorer and assist must be different players");
          }
          await bump(tx, body.side, 1);
          if (scorerId) {
            await tx.matchEvent.create({
              data: { ...eventBase, playerId: scorerId, type: "GOAL", side: body.side },
            });
          }
          if (assistId) {
            await tx.matchEvent.create({
              data: { ...eventBase, playerId: assistId, type: "ASSIST", side: body.side },
            });
          }
          break;
        }
        case "card": {
          if (body.type !== "YC" && body.type !== "RC") throw new LiveError("Unknown card");
          const cardedId = await resolvePlayer(tx, body.playerId, body.playerName);
          if (!cardedId) throw new LiveError("Pick or type a player");
          await ensureResult(tx);
          await tx.matchEvent.create({
            data: {
              ...eventBase,
              playerId: cardedId,
              type: body.type,
              side: isSide(body.side) ? body.side : null,
            },
          });
          after.card = { playerId: cardedId, type: body.type };
          break;
        }
        case "adjust": {
          if (!isSide(body.side)) throw new LiveError("side must be home or away");
          if (body.delta !== 1 && body.delta !== -1) throw new LiveError("delta must be 1 or -1");
          await bump(tx, body.side, body.delta);
          break;
        }
        case "undo": {
          const event = await tx.matchEvent.findFirst({
            where: { id: body.eventId, cycleId, week: wm.week, match: wm.match },
          });
          if (!event) throw new LiveError("Event not found");
          await tx.matchEvent.delete({ where: { id: event.id } });
          if (event.type === "GOAL" && isSide(event.side)) {
            await bump(tx, event.side, -event.count);
            // The assist logged in the same tap goes with the goal.
            const at = event.createdAt.getTime();
            await tx.matchEvent.deleteMany({
              where: {
                cycleId,
                week: wm.week,
                match: wm.match,
                type: "ASSIST",
                side: event.side,
                createdAt: { gte: new Date(at - 2000), lte: new Date(at + 2000) },
              },
            });
          }
          if (event.type === "RC") {
            const player = await tx.player.findUnique({ where: { id: event.playerId } });
            if (player) {
              const remaining = Math.max(0, player.suspensionMatchesRemaining - event.count);
              await tx.player.update({
                where: { id: player.id },
                data: {
                  suspensionMatchesRemaining: remaining,
                  suspensionReason: remaining > 0 ? player.suspensionReason : null,
                },
              });
            }
          }
          break;
        }
        case "reset": {
          const result = await tx.matchResult.findUnique({ where: key });
          if (!result) break;
          if (result.status !== "live") throw new LiveError("Only a live match can be reset");
          const logged = await tx.matchEvent.count({
            where: { cycleId, week: wm.week, match: wm.match },
          });
          if (logged > 0) throw new LiveError("Undo the goals and cards first, then reset");
          await tx.matchResult.delete({ where: { id: result.id } });
          const served = Array.isArray(result.servedBans)
            ? (result.servedBans as ServedBan[])
            : [];
          for (const ban of served) {
            const player = await tx.player.findUnique({ where: { id: ban.id } });
            if (!player) continue;
            await tx.player.update({
              where: { id: player.id },
              data: {
                suspensionMatchesRemaining: player.suspensionMatchesRemaining + 1,
                suspensionReason: player.suspensionReason ?? ban.reason,
              },
            });
          }
          break;
        }
        case "status": {
          if (body.status !== "live" && body.status !== "final") {
            throw new LiveError("status must be live or final");
          }
          const result = await ensureResult(tx);
          await tx.matchResult.update({ where: { id: result.id }, data: { status: body.status } });
          break;
        }
        default:
          throw new LiveError("Unknown action");
      }
    });
  } catch (error) {
    if (error instanceof LiveError) return jsonError(error.message, 400);
    throw error;
  }

  // Bans are served when a team's fixture is first logged, i.e. at kick-off here,
  // so a card picked up in this match counts towards the team's next one.
  if (after.createdResult) {
    const servedBans = [
      ...(await serveSuspensionsForTeam(homeTeam.id)),
      ...(await serveSuspensionsForTeam(awayTeam.id)),
    ];
    if (servedBans.length) {
      await prisma.matchResult.update({ where: key, data: { servedBans } });
    }
  }
  if (after.card) {
    await applyCardSuspension(after.card.playerId, after.card.type, 1, cycleId);
  }

  const state = await matchState(lc, cycleId, wm.week, wm.match);
  return NextResponse.json(state);
});
