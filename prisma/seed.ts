import { PrismaClient } from "@prisma/client";
import { createLeague } from "../src/lib/league-admin";

const prisma = new PrismaClient();

/** Next occurrence of `dayOfWeek` (0 = Sunday) on or after today, as YYYY-MM-DD. */
function nextWeekday(dayOfWeek: number) {
  const d = new Date();
  d.setDate(d.getDate() + ((dayOfWeek - d.getDay() + 7) % 7));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Creates a "demo" league for local development and sales demos.
 * Real leagues are created from /platform; Kadwell comes from the SQLite migration script.
 */
async function main() {
  const slug = process.env.SEED_LEAGUE_SLUG || "demo";
  const existing = await prisma.league.findUnique({ where: { slug } });
  if (existing) {
    console.log(`League "${slug}" already exists — nothing to do.`);
    return;
  }

  const password = process.env.SEED_ORGANISER_PASSWORD || "demo1234";
  const { league, cycle } = await prisma.$transaction(
    (tx) =>
      createLeague(tx, {
        slug,
        name: "Demo Sunday League",
        shortName: "DSL",
        tagline: "A sample league to show how the platform runs.",
        venue: "Community Pitch",
        dayOfWeek: 0,
        kickoffTime: "17:00",
        sessionMinutes: 120,
        matchMinutes: 12,
        turnaroundMinutes: 3,
        teamCount: 5,
        cycleWeeks: 4,
        monthlyFee: 6000,
        visitorFee: 2000,
        bankName: "Demo Bank",
        accountNumber: "0000000000",
        accountName: "Demo Organiser",
        adminName: "Demo Organiser",
        adminPhone: "08000000000",
        status: "active",
        firstMatchday: nextWeekday(0),
        organiser: { name: "Demo Organiser", phone: "08000000000", password },
      }),
    { timeout: 30_000 },
  );

  const fixtures = await prisma.fixture.count({ where: { cycleId: cycle.id } });
  console.log(
    `Created /${league.slug} (${league.teamCount} teams, ${fixtures} fixtures). ` +
      `Organiser login: 08000000000 / ${password}`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
