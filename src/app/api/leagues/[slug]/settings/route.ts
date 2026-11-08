import { NextResponse } from "next/server";
import { requireOrganiser } from "@/lib/auth";
import { jsonError, leagueRoute } from "@/lib/league-api";
import { ensureTeams } from "@/lib/league-admin";
import { prisma } from "@/lib/prisma";

const TEXT_FIELDS = [
  "name",
  "shortName",
  "tagline",
  "venue",
  "kickoffTime",
  "bankName",
  "accountNumber",
  "accountName",
  "whatsappGroupName",
  "whatsappGroupUrl",
  "adminName",
  "adminPhone",
  "rulesNotes",
] as const;

const REQUIRED_TEXT = new Set(["name", "shortName", "venue", "kickoffTime"]);

const INT_FIELDS: Record<string, [number, number]> = {
  dayOfWeek: [0, 6],
  sessionMinutes: [20, 300],
  matchMinutes: [3, 90],
  turnaroundMinutes: [0, 30],
  teamCount: [2, 12],
  cycleWeeks: [1, 12],
  monthlyFee: [0, 10_000_000],
  visitorFee: [0, 10_000_000],
};

export const GET = leagueRoute(async (_request, lc) => {
  await requireOrganiser(lc.league);
  const cycles = await prisma.cycle.findMany({
    where: { leagueId: lc.league.id },
    orderBy: { startDate: "desc" },
    select: {
      id: true,
      key: true,
      label: true,
      startDate: true,
      weeks: true,
      monthlyFee: true,
      visitorFee: true,
      isCurrent: true,
      _count: { select: { results: true, fixtures: true } },
    },
  });
  return NextResponse.json({ league: lc.league, cycles });
});

export const PATCH = leagueRoute(async (request, lc) => {
  await requireOrganiser(lc.league);
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return jsonError("Invalid body", 400);

  const data: Record<string, string | number | null> = {};
  for (const field of TEXT_FIELDS) {
    if (!(field in body)) continue;
    const raw = body[field];
    const value = typeof raw === "string" ? raw.trim() : "";
    if (REQUIRED_TEXT.has(field) && !value) return jsonError(`${field} is required`, 400);
    data[field] = value || null;
  }
  if (typeof data.kickoffTime === "string" && !/^\d{2}:\d{2}$/.test(data.kickoffTime)) {
    return jsonError("Kick-off must be HH:MM (24h)", 400);
  }
  if (typeof data.shortName === "string" && data.shortName.length > 8) {
    return jsonError("Short name must be 8 characters or fewer", 400);
  }
  for (const [field, [min, max]] of Object.entries(INT_FIELDS)) {
    if (!(field in body)) continue;
    const value = Math.round(Number(body[field]));
    if (!Number.isFinite(value) || value < min || value > max) {
      return jsonError(`${field} must be between ${min} and ${max}`, 400);
    }
    data[field] = value;
  }

  const league = await prisma.league.update({ where: { id: lc.league.id }, data });

  if (typeof data.teamCount === "number") {
    await ensureTeams(prisma, league.id, league.teamCount);
  }
  // Fee changes take effect for the running cycle too.
  if (lc.cycle && ("monthlyFee" in data || "visitorFee" in data)) {
    await prisma.cycle.update({
      where: { id: lc.cycle.id },
      data: { monthlyFee: league.monthlyFee, visitorFee: league.visitorFee },
    });
  }

  return NextResponse.json({ league });
});
