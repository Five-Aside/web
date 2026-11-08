import { cache } from "react";
import type { Cycle, League } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { ClientLeague } from "@/lib/league-types";
import { whatsappChatUrl, type FixtureRow, type Schedule } from "@/lib/schedule";

/** Top-level paths that can never be league slugs. */
export const RESERVED_SLUGS = new Set([
  "api",
  "platform",
  "start",
  "request",
  "login",
  "logout",
  "register",
  "admin",
  "me",
  "rules",
  "tables",
  "players",
  "payments",
  "purse",
  "news",
  "feedback",
  "about",
  "pricing",
  "privacy",
  "terms",
  "_next",
  "uploads",
  "favicon.ico",
  "robots.txt",
  "sitemap.xml",
]);

export const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])?$/;

export function isValidSlug(slug: string) {
  return SLUG_PATTERN.test(slug) && !RESERVED_SLUGS.has(slug);
}

export const getLeagueBySlug = cache(async (slug: string) => {
  if (!SLUG_PATTERN.test(slug)) return null;
  return prisma.league.findUnique({ where: { slug } });
});

export const getCurrentCycle = cache(async (leagueId: string) => {
  const current = await prisma.cycle.findFirst({
    where: { leagueId, isCurrent: true },
    orderBy: { startDate: "desc" },
  });
  if (current) return current;
  return prisma.cycle.findFirst({ where: { leagueId }, orderBy: { startDate: "desc" } });
});

export async function loadSchedule(league: League, cycle: Cycle | null): Promise<Schedule> {
  const [fixtures, teams] = await Promise.all([
    cycle
      ? prisma.fixture.findMany({
          where: { cycleId: cycle.id },
          orderBy: [{ week: "asc" }, { match: "asc" }],
        })
      : Promise.resolve([]),
    prisma.team.findMany({ where: { leagueId: league.id }, orderBy: { number: "asc" } }),
  ]);

  const teamNames: Record<number, string> = {};
  for (const t of teams) teamNames[t.number] = t.name;

  return {
    cycle: cycle
      ? {
          id: cycle.id,
          key: cycle.key,
          label: cycle.label,
          startDate: cycle.startDate,
          weeks: cycle.weeks,
          monthlyFee: cycle.monthlyFee,
          visitorFee: cycle.visitorFee,
        }
      : {
          id: "",
          key: "",
          label: "No cycle yet",
          startDate: new Date().toISOString().slice(0, 10),
          weeks: league.cycleWeeks,
          monthlyFee: league.monthlyFee,
          visitorFee: league.visitorFee,
        },
    fixtures: fixtures.map(
      (f): FixtureRow => ({
        week: f.week,
        match: f.match,
        home: f.homeTeamNumber,
        away: f.awayTeamNumber,
        startTime: f.startTime,
        endTime: f.endTime,
        officials: f.officials,
      }),
    ),
    teamNames,
  };
}

export function toClientLeague(league: League, schedule: Schedule): ClientLeague {
  return {
    id: league.id,
    slug: league.slug,
    name: league.name,
    shortName: league.shortName,
    tagline: league.tagline,
    venue: league.venue,
    dayOfWeek: league.dayOfWeek,
    kickoffTime: league.kickoffTime,
    sessionMinutes: league.sessionMinutes,
    matchMinutes: league.matchMinutes,
    turnaroundMinutes: league.turnaroundMinutes,
    teamCount: league.teamCount,
    cycleWeeks: league.cycleWeeks,
    monthlyFee: schedule.cycle.monthlyFee,
    visitorFee: schedule.cycle.visitorFee,
    bankName: league.bankName,
    accountNumber: league.accountNumber,
    accountName: league.accountName,
    whatsappGroupName: league.whatsappGroupName,
    whatsappGroupUrl: league.whatsappGroupUrl,
    adminName: league.adminName,
    adminPhone: league.adminPhone,
    adminChatUrl: whatsappChatUrl(league.adminPhone),
    rulesNotes: league.rulesNotes,
    status: league.status,
    schedule,
  };
}

export type LeagueContext = {
  league: League;
  cycle: Cycle | null;
  schedule: Schedule;
  client: ClientLeague;
};

/** Full league context for pages and API routes (cached per request). */
export const getLeagueContext = cache(async (slug: string): Promise<LeagueContext | null> => {
  const league = await getLeagueBySlug(slug);
  if (!league) return null;
  const cycle = await getCurrentCycle(league.id);
  const schedule = await loadSchedule(league, cycle);
  return { league, cycle, schedule, client: toClientLeague(league, schedule) };
});
