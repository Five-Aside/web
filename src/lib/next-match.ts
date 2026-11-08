import {
  cycleWeeks,
  fixtureLabel,
  fixtureTime,
  fixturesForWeek,
  formatDateLabel,
  officialsLabel,
  teamName,
  weekDate,
  type Schedule,
} from "@/lib/schedule";

export type NextMatchInfo = {
  week: number;
  match: number;
  date: string;
  dateLabel: string;
  time: string;
  fixture: string;
  opponentLabel: string;
  officiating: string;
  teamSide: "home" | "away";
} | null;

function parseYmd(ymd: string) {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * Next match for a rostered team: first fixture on/after today whose week
 * still has no logged result for this team.
 *
 * Note: if a result is logged late for an earlier week, we still walk from
 * today's cycle week forward so we don't surface a stale past fixture as "next".
 */
export function findNextMatch(
  schedule: Schedule,
  teamNumber: number,
  playedKeys: Set<string>,
  today = new Date(),
): NextMatchInfo {
  const startOfToday = startOfDay(today);
  const weeks = cycleWeeks(schedule.cycle);

  const toInfo = (week: number, row: Schedule["fixtures"][number]): NextMatchInfo => {
    const ymd = weekDate(schedule.cycle, week);
    const teamSide = row.home === teamNumber ? "home" : "away";
    const opponent = teamSide === "home" ? row.away : row.home;
    return {
      week,
      match: row.match,
      date: ymd,
      dateLabel: formatDateLabel(ymd),
      time: fixtureTime(row),
      fixture: fixtureLabel(row, schedule.teamNames),
      opponentLabel: teamName(schedule.teamNames, opponent),
      officiating: officialsLabel(row, schedule.teamNames),
      teamSide,
    };
  };

  for (const week of weeks) {
    // Skip fully past weeks by calendar (edge: late-logged results won't revive them).
    if (parseYmd(weekDate(schedule.cycle, week)) < startOfToday) continue;
    for (const row of fixturesForWeek(schedule, week)) {
      if (row.home !== teamNumber && row.away !== teamNumber) continue;
      if (playedKeys.has(`${week}-${row.match}`)) continue;
      return toInfo(week, row);
    }
  }

  // Fallback: first unplayed fixture for this team in the cycle
  for (const week of weeks) {
    for (const row of fixturesForWeek(schedule, week)) {
      if (row.home !== teamNumber && row.away !== teamNumber) continue;
      if (playedKeys.has(`${week}-${row.match}`)) continue;
      return toInfo(week, row);
    }
  }

  return null;
}

export type NextSessionInfo = {
  week: number;
  date: string;
  dateLabel: string;
  fixtures: {
    match: number;
    time: string;
    fixture: string;
    officiating: string;
  }[];
};

const SESSION_OVER_HOUR = 21;

/**
 * Next matchday in the cycle, with that night's fixtures. A night is
 * skipped once it's past 9pm on the day or every fixture has a logged result.
 */
export function findNextSession(
  schedule: Schedule,
  today = new Date(),
  playedKeys: Set<string> = new Set(),
): NextSessionInfo | null {
  for (const week of cycleWeeks(schedule.cycle)) {
    const ymd = weekDate(schedule.cycle, week);
    const sessionOver = parseYmd(ymd);
    sessionOver.setHours(SESSION_OVER_HOUR);
    if (today >= sessionOver) continue;
    const rows = fixturesForWeek(schedule, week);
    if (rows.length === 0) continue;
    if (rows.every((row) => playedKeys.has(`${week}-${row.match}`))) continue;
    return {
      week,
      date: ymd,
      dateLabel: formatDateLabel(ymd),
      fixtures: rows.map((row) => ({
        match: row.match,
        time: fixtureTime(row),
        fixture: fixtureLabel(row, schedule.teamNames),
        officiating: officialsLabel(row, schedule.teamNames),
      })),
    };
  }
  return null;
}

/** Next single fixture (opening kick of the next matchday). */
export function findNextFixture(
  schedule: Schedule,
  today = new Date(),
  playedKeys: Set<string> = new Set(),
) {
  const session = findNextSession(schedule, today, playedKeys);
  if (!session || session.fixtures.length === 0) return null;
  const row = session.fixtures[0];
  const kickoff = row.time.split("–")[0]?.trim() || row.time;
  return {
    week: session.week,
    match: row.match,
    date: session.date,
    dateLabel: session.dateLabel,
    time: row.time,
    kickoff,
    fixture: row.fixture,
    officiating: row.officiating,
  };
}
