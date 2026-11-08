import type { League, Prisma, PrismaClient } from "@prisma/client";
import { hashPassword } from "@/lib/auth-hash";
import { generateFixtures } from "@/lib/fixture-generator";
import type { FixtureRow } from "@/lib/schedule";
import { addDays, cycleLabel } from "@/lib/schedule";

type Db = PrismaClient | Prisma.TransactionClient;

export type NewLeagueInput = {
  slug: string;
  name: string;
  shortName: string;
  tagline?: string | null;
  venue: string;
  dayOfWeek: number;
  kickoffTime: string;
  sessionMinutes: number;
  matchMinutes: number;
  turnaroundMinutes: number;
  teamCount: number;
  cycleWeeks: number;
  monthlyFee: number;
  visitorFee: number;
  bankName?: string | null;
  accountNumber?: string | null;
  accountName?: string | null;
  whatsappGroupName?: string | null;
  whatsappGroupUrl?: string | null;
  adminName?: string | null;
  adminPhone?: string | null;
  status?: string;
  /** "YYYY-MM-DD" of the first matchday */
  firstMatchday: string;
  matchesPerNight?: number;
  organiser?: { name: string; phone: string; password: string } | null;
};

export function normalizePhone(phone: string) {
  return phone.replace(/\s+/g, "").trim();
}

export async function ensureTeams(db: Db, leagueId: string, teamCount: number) {
  for (let number = 1; number <= teamCount; number++) {
    await db.team.upsert({
      where: { leagueId_number: { leagueId, number } },
      update: {},
      create: { leagueId, number, name: `Team ${number}` },
    });
  }
}

export async function replaceFixtures(db: Db, cycleId: string, rows: FixtureRow[]) {
  await db.fixture.deleteMany({ where: { cycleId } });
  if (rows.length === 0) return;
  await db.fixture.createMany({
    data: rows.map((r) => ({
      cycleId,
      week: r.week,
      match: r.match,
      homeTeamNumber: r.home,
      awayTeamNumber: r.away,
      startTime: r.startTime,
      endTime: r.endTime,
      officials: r.officials,
    })),
  });
}

export function generateForLeague(
  league: Pick<
    League,
    "teamCount" | "kickoffTime" | "sessionMinutes" | "matchMinutes" | "turnaroundMinutes"
  >,
  weeks: number,
  matchesPerNight?: number,
) {
  return generateFixtures({
    teamCount: league.teamCount,
    weeks,
    kickoffTime: league.kickoffTime,
    sessionMinutes: league.sessionMinutes,
    matchMinutes: league.matchMinutes,
    turnaroundMinutes: league.turnaroundMinutes,
    matchesPerNight,
  });
}

/** Creates a cycle (optionally making it current) with auto-generated fixtures. */
export async function createCycle(
  db: Db,
  league: League,
  startDate: string,
  options: { makeCurrent?: boolean; matchesPerNight?: number } = {},
) {
  const weeks = league.cycleWeeks;
  let key = `${startDate}-cycle`;
  const clash = await db.cycle.findUnique({
    where: { leagueId_key: { leagueId: league.id, key } },
  });
  if (clash) key = `${startDate}-cycle-${Date.now().toString(36)}`;

  if (options.makeCurrent !== false) {
    await db.cycle.updateMany({ where: { leagueId: league.id }, data: { isCurrent: false } });
  }

  const cycle = await db.cycle.create({
    data: {
      leagueId: league.id,
      key,
      label: cycleLabel(startDate, weeks),
      startDate,
      weeks,
      monthlyFee: league.monthlyFee,
      visitorFee: league.visitorFee,
      isCurrent: options.makeCurrent !== false,
    },
  });

  await replaceFixtures(db, cycle.id, generateForLeague(league, weeks, options.matchesPerNight));
  return cycle;
}

/** The matchday after the given cycle ends. */
export function nextCycleStart(cycle: { startDate: string; weeks: number }) {
  return addDays(cycle.startDate, cycle.weeks * 7);
}

export async function createLeague(db: Db, input: NewLeagueInput) {
  const league = await db.league.create({
    data: {
      slug: input.slug,
      name: input.name,
      shortName: input.shortName,
      tagline: input.tagline ?? null,
      venue: input.venue,
      dayOfWeek: input.dayOfWeek,
      kickoffTime: input.kickoffTime,
      sessionMinutes: input.sessionMinutes,
      matchMinutes: input.matchMinutes,
      turnaroundMinutes: input.turnaroundMinutes,
      teamCount: input.teamCount,
      cycleWeeks: input.cycleWeeks,
      monthlyFee: input.monthlyFee,
      visitorFee: input.visitorFee,
      bankName: input.bankName ?? null,
      accountNumber: input.accountNumber ?? null,
      accountName: input.accountName ?? null,
      whatsappGroupName: input.whatsappGroupName ?? null,
      whatsappGroupUrl: input.whatsappGroupUrl ?? null,
      adminName: input.adminName ?? null,
      adminPhone: input.adminPhone ?? null,
      status: input.status ?? "pilot",
    },
  });

  await ensureTeams(db, league.id, league.teamCount);
  const cycle = await createCycle(db, league, input.firstMatchday, {
    matchesPerNight: input.matchesPerNight,
  });

  let organiserId: string | null = null;
  if (input.organiser) {
    const organiser = await db.player.create({
      data: {
        leagueId: league.id,
        name: input.organiser.name.trim(),
        phone: normalizePhone(input.organiser.phone),
        passwordHash: hashPassword(input.organiser.password),
        status: "active",
        seat: "permanent",
        role: "organiser",
      },
    });
    organiserId = organiser.id;
  }

  return { league, cycle, organiserId };
}
