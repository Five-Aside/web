/**
 * Log Week 1 results, events, assign known squads, and publish Matchday 1 news.
 * Run on Railway: railway run npx tsx scripts/log-matchday1.ts
 */
import { PrismaClient } from "@prisma/client";
import { createHash, randomBytes, scryptSync } from "crypto";

const prisma = new PrismaClient();
const MONTH = "2026-09-cycle";
const WEEK = 1;

function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function stubPhone(label: string) {
  const dig = createHash("sha1").update(label.toLowerCase()).digest("hex");
  return `09${dig.slice(0, 9)}`;
}

async function ensurePlayer(name: string, teamNumber: number | null) {
  const existing = await prisma.player.findFirst({
    where: { name: { equals: name } },
  });
  if (existing) {
    const team =
      teamNumber != null
        ? await prisma.team.findUnique({ where: { number: teamNumber } })
        : null;
    return prisma.player.update({
      where: { id: existing.id },
      data: {
        status: "active",
        seat: "permanent",
        ...(team ? { teamId: team.id } : {}),
      },
    });
  }

  // Fuzzy match
  const all = await prisma.player.findMany();
  const needle = name.toLowerCase();
  const fuzzy = all.find(
    (p) =>
      p.name.toLowerCase().includes(needle) ||
      needle.includes(p.name.toLowerCase().split(" ")[0] || ""),
  );
  if (fuzzy) {
    const team =
      teamNumber != null
        ? await prisma.team.findUnique({ where: { number: teamNumber } })
        : null;
    return prisma.player.update({
      where: { id: fuzzy.id },
      data: {
        status: "active",
        ...(team ? { teamId: team.id } : {}),
      },
    });
  }

  const team =
    teamNumber != null
      ? await prisma.team.findUnique({ where: { number: teamNumber } })
      : null;

  return prisma.player.create({
    data: {
      name,
      phone: stubPhone(name),
      passwordHash: hashPassword("tnf-temp"),
      status: "active",
      seat: "permanent",
      teamId: team?.id ?? null,
    },
  });
}

async function linkByIncludes(
  includes: string[],
  teamNumber: number | null,
  fallbackName: string,
) {
  const all = await prisma.player.findMany();
  const hit = all.find((p) =>
    includes.some((s) => p.name.toLowerCase().includes(s.toLowerCase())),
  );
  if (hit) {
    const team =
      teamNumber != null
        ? await prisma.team.findUnique({ where: { number: teamNumber } })
        : null;
    return prisma.player.update({
      where: { id: hit.id },
      data: {
        status: "active",
        ...(team ? { teamId: team.id } : {}),
      },
    });
  }
  return ensurePlayer(fallbackName, teamNumber);
}

async function addEvent(
  playerId: string,
  match: number,
  type: "GOAL" | "ASSIST" | "YC",
  count: number,
) {
  const existing = await prisma.matchEvent.findFirst({
    where: { playerId, monthKey: MONTH, week: WEEK, match, type },
  });
  if (existing) {
    await prisma.matchEvent.update({
      where: { id: existing.id },
      data: { count },
    });
    return;
  }
  await prisma.matchEvent.create({
    data: {
      playerId,
      monthKey: MONTH,
      week: WEEK,
      match,
      type,
      count,
    },
  });
}

async function upsertResult(
  match: number,
  homeGoals: number,
  awayGoals: number,
) {
  const homeNum = ([1, 3, 1, 2, 1, 2] as const)[match - 1];
  const awayNum = ([2, 4, 3, 4, 4, 3] as const)[match - 1];
  const home = await prisma.team.findUniqueOrThrow({ where: { number: homeNum } });
  const away = await prisma.team.findUniqueOrThrow({ where: { number: awayNum } });

  await prisma.matchResult.upsert({
    where: {
      monthKey_week_match: { monthKey: MONTH, week: WEEK, match },
    },
    create: {
      monthKey: MONTH,
      week: WEEK,
      match,
      homeTeamId: home.id,
      awayTeamId: away.id,
      homeGoals,
      awayGoals,
    },
    update: {
      homeTeamId: home.id,
      awayTeamId: away.id,
      homeGoals,
      awayGoals,
    },
  });
}

async function main() {
  for (const n of [1, 2, 3, 4]) {
    await prisma.team.upsert({
      where: { number: n },
      update: {},
      create: { number: n, name: `Team ${n}` },
    });
  }

  // Resolve / create players with confirmed teams
  const shabi = await linkByIncludes(["shabayan", "shabi"], 1, "Shabi");
  const ogunlana = await linkByIncludes(
    ["odinegun", "ogunlana", "ogun"],
    1,
    "Ogunlana",
  );
  const arinze = await ensurePlayer("Arinze", 2);
  const jerry = await linkByIncludes(["jerry"], 2, "Jerry");
  const alex = await linkByIncludes(["alexander"], 2, "Alex");
  // If Alex and Shabi resolved to same person, keep Alex as separate stub on T2
  const alexPlayer =
    alex.id === shabi.id ? await ensurePlayer("Alex", 2) : alex;

  const bash = await linkByIncludes(["bash"], 3, "Bash");
  const yunusa = await ensurePlayer("Yunusa", 3);
  const sani = await ensurePlayer("Sani", 3);
  const mayan = await linkByIncludes(["maayan", "mayan"], 3, "Mayan");
  const vokay = await ensurePlayer("Vokay", 3);

  const amorah = await linkByIncludes(["amorah"], 4, "Amorah");
  const zaza = await ensurePlayer("Zaza", 4);
  const bright = await ensurePlayer("Bright", 4);

  // Results
  await upsertResult(1, 1, 3);
  await upsertResult(2, 1, 1);
  await upsertResult(3, 1, 1);
  await upsertResult(4, 0, 0);
  await upsertResult(5, 1, 2);
  await upsertResult(6, 3, 3);

  // Events
  await addEvent(shabi.id, 1, "GOAL", 1);
  await addEvent(arinze.id, 1, "GOAL", 3);
  await addEvent(alexPlayer.id, 1, "ASSIST", 1);

  await addEvent(bash.id, 2, "GOAL", 1);
  await addEvent(amorah.id, 2, "GOAL", 1);

  await addEvent(shabi.id, 3, "GOAL", 1);
  await addEvent(vokay.id, 3, "GOAL", 1);

  await addEvent(bright.id, 4, "YC", 1);

  await addEvent(ogunlana.id, 5, "GOAL", 1);
  await addEvent(zaza.id, 5, "GOAL", 2);

  await addEvent(arinze.id, 6, "GOAL", 2);
  await addEvent(jerry.id, 6, "GOAL", 1);
  await addEvent(bash.id, 6, "GOAL", 1);
  await addEvent(yunusa.id, 6, "GOAL", 1);
  await addEvent(sani.id, 6, "GOAL", 1);
  await addEvent(mayan.id, 6, "ASSIST", 2);

  // News stories
  await prisma.newsPost.deleteMany({
    where: { monthKey: MONTH, week: WEEK },
  });

  await prisma.newsPost.create({
    data: {
      pinned: true,
      monthKey: MONTH,
      week: WEEK,
      title: "Matchday 1 wrap: six games, table is live",
      body: [
        "Kadwell lit up for the first night of the cycle. All six fixtures are in the book — and the league table is open.",
        "",
        "Headline results:",
        "• Team 2 beat Team 1 3–1 (Arinze hat-trick)",
        "• Team 3 and Team 4 shared the points 1–1",
        "• Team 1 and Team 3 drew 1–1",
        "• Team 2 and Team 4 played out a 0–0",
        "• Team 4 beat Team 1 2–1 (Zaza brace)",
        "• Team 2 and Team 3 finished 3–3 in a thriller",
        "",
        "Full scorers and cards are on Tables. Next Thursday we go again.",
      ].join("\n"),
    },
  });

  await prisma.newsPost.create({
    data: {
      pinned: false,
      monthKey: MONTH,
      week: WEEK,
      title: "Arinze hits five on opening night",
      body: [
        "Team 2’s Arinze owned Matchday 1 — three against Team 1, then two more in the 3–3 with Team 3.",
        "",
        "Five goals on night one. The golden boot race already has a clear front-runner.",
      ].join("\n"),
    },
  });

  await prisma.newsPost.create({
    data: {
      pinned: false,
      monthKey: MONTH,
      week: WEEK,
      title: "Team 2 vs Team 3: six-goal classic",
      body: [
        "The last game of the night delivered the scoreline of the session: Team 2 3–3 Team 3.",
        "",
        "Team 2: Arinze (2), Jerry (1).",
        "Team 3: Bash, Yunusa, Sani — with Mayan on two assists.",
        "",
        "Both sides leave with a point and a highlight reel.",
      ].join("\n"),
    },
  });

  await prisma.newsPost.create({
    data: {
      pinned: false,
      monthKey: MONTH,
      week: WEEK,
      title: "Zaza brace sinks Team 1",
      body: [
        "Team 4 took Match 5 2–1. Zaza scored both; Ogunlana replied for Team 1.",
        "",
        "Earlier, Amorah had earned Team 4 a point in the 1–1 with Team 3.",
      ].join("\n"),
    },
  });

  console.log("Matchday 1 results, events, and news stories loaded.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
