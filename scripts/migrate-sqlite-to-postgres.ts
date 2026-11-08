/**
 * One-off move of the single-league SQLite database into the multi-league
 * Postgres schema, creating the Kadwell league, its current cycle and fixtures.
 *
 * Usage:
 *   SQLITE_PATH=~/tnf-backups/prod.db DATABASE_URL=postgresql://... \
 *     npx tsx scripts/migrate-sqlite-to-postgres.ts [--reset]
 *
 * --reset deletes an existing "kadwell" league (and everything under it) first.
 */
import { execFileSync } from "child_process";
import { PrismaClient } from "@prisma/client";

const SQLITE_PATH = process.env.SQLITE_PATH;
if (!SQLITE_PATH) {
  console.error("SQLITE_PATH required");
  process.exit(1);
}
const RESET = process.argv.includes("--reset");
const SLUG = "kadwell";
const CYCLE_KEY = "2026-09-cycle";

const prisma = new PrismaClient();

type Row = Record<string, string | number | null>;

function rows(sql: string): Row[] {
  const out = execFileSync("sqlite3", ["-json", SQLITE_PATH!, sql], {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  }).trim();
  return out ? (JSON.parse(out) as Row[]) : [];
}

const str = (v: Row[string]) => (v === null || v === undefined ? null : String(v));
const num = (v: Row[string]) => Number(v);
const date = (v: Row[string]) => new Date(Number(v));
const bool = (v: Row[string]) => Number(v) === 1;

const PAYMENT_TYPES: Record<string, string> = {
  MONTHLY_5K: "MONTHLY",
  MONTHLY_INSTALMENT: "INSTALMENT",
  VISITOR_1_5K: "VISITOR",
};

// Week 1–4 fixtures as published on the Kadwell site (home, away, officials).
const FIXTURES: Record<number, [number, number][]> = {
  1: [[1, 2], [3, 4], [1, 3], [2, 4], [1, 4], [2, 3]],
  2: [[3, 4], [1, 2], [2, 4], [1, 3], [2, 3], [1, 4]],
  3: [[2, 3], [4, 1], [2, 1], [4, 3], [2, 4], [3, 1]],
  4: [[4, 2], [1, 3], [4, 1], [3, 2], [1, 2], [3, 4]],
};
const SLOTS = [
  ["19:00", "19:11"],
  ["19:14", "19:25"],
  ["19:28", "19:39"],
  ["19:42", "19:53"],
  ["19:56", "20:07"],
  ["20:10", "20:21"],
];

async function main() {
  const existing = await prisma.league.findUnique({ where: { slug: SLUG } });
  if (existing) {
    if (!RESET) throw new Error(`League "${SLUG}" already exists — pass --reset to replace it`);
    await prisma.league.delete({ where: { id: existing.id } });
    console.log(`deleted existing "${SLUG}" league`);
  }

  const league = await prisma.league.create({
    data: {
      slug: SLUG,
      name: "Thursday Night Football",
      shortName: "TNF",
      tagline: "Kadwell Pitch · Thursdays 7:00–8:30 PM",
      venue: "Kadwell Pitch",
      dayOfWeek: 4,
      kickoffTime: "19:00",
      sessionMinutes: 90,
      matchMinutes: 11,
      turnaroundMinutes: 3,
      teamCount: 4,
      cycleWeeks: 4,
      monthlyFee: 5000,
      visitorFee: 1500,
      bankName: "Opay",
      accountNumber: "8060332714",
      accountName: "Sabo Ajidokwu Emmanuel",
      whatsappGroupName: "Thursday night football",
      whatsappGroupUrl: "https://chat.whatsapp.com/J4xHyWSX88F5mjrh3oRm0H",
      adminName: "Aji",
      adminPhone: "08060332714",
      status: "active",
    },
  });

  const cycle = await prisma.cycle.create({
    data: {
      leagueId: league.id,
      key: CYCLE_KEY,
      label: "24 Sep – 15 Oct 2026",
      startDate: "2026-09-24",
      weeks: 4,
      monthlyFee: 5000,
      visitorFee: 1500,
      isCurrent: true,
    },
  });

  await prisma.fixture.createMany({
    data: Object.entries(FIXTURES).flatMap(([week, games]) =>
      games.map(([home, away], i) => ({
        cycleId: cycle.id,
        week: Number(week),
        match: i + 1,
        homeTeamNumber: home,
        awayTeamNumber: away,
        startTime: SLOTS[i][0],
        endTime: SLOTS[i][1],
        officials: [1, 2, 3, 4].filter((t) => t !== home && t !== away),
      })),
    ),
  });

  const monthKeys = new Set(
    rows(
      `select monthKey from Payment union select monthKey from MatchEvent
       union select monthKey from MatchResult union select monthKey from WalkInPayment
       union select monthKey from NewsPost where monthKey is not null`,
    ).map((r) => r.monthKey),
  );
  const unknown = [...monthKeys].filter((k) => k !== CYCLE_KEY);
  if (unknown.length) throw new Error(`Unmapped month keys: ${unknown.join(", ")}`);

  const teams = rows("select * from Team");
  await prisma.team.createMany({
    data: teams.map((t) => ({
      id: str(t.id)!,
      leagueId: league.id,
      number: num(t.number),
      name: str(t.name)!,
      createdAt: date(t.createdAt),
      updatedAt: date(t.updatedAt),
    })),
  });

  const players = rows("select * from Player");
  await prisma.player.createMany({
    data: players.map((p) => ({
      id: str(p.id)!,
      leagueId: league.id,
      name: str(p.name)!,
      phone: str(p.phone)!,
      passwordHash: str(p.passwordHash)!,
      status: str(p.status)!,
      seat: str(p.seat)!,
      role: bool(p.isAdmin) ? "organiser" : "player",
      photoPath: str(p.photoPath),
      suspensionMatchesRemaining: num(p.suspensionMatchesRemaining),
      suspensionReason: str(p.suspensionReason),
      overall: num(p.overall),
      teamId: str(p.teamId),
      createdAt: date(p.createdAt),
      updatedAt: date(p.updatedAt),
    })),
  });

  const payments = rows("select * from Payment");
  await prisma.payment.createMany({
    data: payments.map((p) => {
      const type = PAYMENT_TYPES[str(p.type)!];
      if (!type) throw new Error(`Unknown payment type ${p.type}`);
      return {
        id: str(p.id)!,
        playerId: str(p.playerId)!,
        cycleId: cycle.id,
        type,
        amount: num(p.amount),
        note: str(p.note),
        status: str(p.status)!,
        paidAt: date(p.paidAt),
        createdAt: date(p.createdAt),
      };
    }),
  });

  const walkIns = rows("select * from WalkInPayment");
  await prisma.walkInPayment.createMany({
    data: walkIns.map((w) => ({
      id: str(w.id)!,
      leagueId: league.id,
      cycleId: cycle.id,
      name: str(w.name)!,
      amount: num(w.amount),
      note: str(w.note),
      paidAt: date(w.paidAt),
      createdAt: date(w.createdAt),
    })),
  });

  const events = rows("select * from MatchEvent");
  await prisma.matchEvent.createMany({
    data: events.map((e) => ({
      id: str(e.id)!,
      playerId: str(e.playerId)!,
      cycleId: cycle.id,
      week: num(e.week),
      match: num(e.match),
      type: str(e.type)!,
      count: num(e.count),
      createdAt: date(e.createdAt),
    })),
  });

  const results = rows("select * from MatchResult");
  await prisma.matchResult.createMany({
    data: results.map((r) => ({
      id: str(r.id)!,
      cycleId: cycle.id,
      week: num(r.week),
      match: num(r.match),
      homeTeamId: str(r.homeTeamId)!,
      awayTeamId: str(r.awayTeamId)!,
      homeGoals: num(r.homeGoals),
      awayGoals: num(r.awayGoals),
      createdAt: date(r.createdAt),
      updatedAt: date(r.updatedAt),
    })),
  });

  const expenses = rows("select * from Expense");
  await prisma.expense.createMany({
    data: expenses.map((e) => ({
      id: str(e.id)!,
      leagueId: league.id,
      title: str(e.title)!,
      amount: num(e.amount),
      note: str(e.note),
      spentAt: date(e.spentAt),
      createdAt: date(e.createdAt),
    })),
  });

  const ledger = rows("select * from PurseLedger");
  await prisma.purseLedger.createMany({
    data: ledger.map((l) => ({
      id: str(l.id)!,
      leagueId: league.id,
      kind: str(l.kind)!,
      title: str(l.title)!,
      amount: num(l.amount),
      note: str(l.note),
      createdAt: date(l.createdAt),
    })),
  });

  const feedback = rows("select * from Feedback");
  await prisma.feedback.createMany({
    data: feedback.map((f) => ({
      id: str(f.id)!,
      leagueId: league.id,
      type: str(f.type)!,
      message: str(f.message)!,
      name: str(f.name),
      playerId: str(f.playerId),
      status: str(f.status)!,
      createdAt: date(f.createdAt),
    })),
  });

  const news = rows("select * from NewsPost");
  await prisma.newsPost.createMany({
    data: news.map((n) => ({
      id: str(n.id)!,
      leagueId: league.id,
      cycleId: n.monthKey ? cycle.id : null,
      title: str(n.title)!,
      body: str(n.body)!,
      pinned: bool(n.pinned),
      week: n.week === null ? null : num(n.week),
      createdAt: date(n.createdAt),
      updatedAt: date(n.updatedAt),
    })),
  });

  const counts = {
    teams: teams.length,
    players: players.length,
    payments: payments.length,
    walkIns: walkIns.length,
    events: events.length,
    results: results.length,
    expenses: expenses.length,
    ledger: ledger.length,
    feedback: feedback.length,
    news: news.length,
  };
  const written = {
    teams: await prisma.team.count({ where: { leagueId: league.id } }),
    players: await prisma.player.count({ where: { leagueId: league.id } }),
    payments: await prisma.payment.count({ where: { cycleId: cycle.id } }),
    walkIns: await prisma.walkInPayment.count({ where: { leagueId: league.id } }),
    events: await prisma.matchEvent.count({ where: { cycleId: cycle.id } }),
    results: await prisma.matchResult.count({ where: { cycleId: cycle.id } }),
    expenses: await prisma.expense.count({ where: { leagueId: league.id } }),
    ledger: await prisma.purseLedger.count({ where: { leagueId: league.id } }),
    feedback: await prisma.feedback.count({ where: { leagueId: league.id } }),
    news: await prisma.newsPost.count({ where: { leagueId: league.id } }),
  };
  for (const key of Object.keys(counts) as (keyof typeof counts)[]) {
    const ok = counts[key] === written[key];
    console.log(`${ok ? "ok  " : "FAIL"} ${key}: sqlite ${counts[key]} → postgres ${written[key]}`);
    if (!ok) process.exitCode = 1;
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
