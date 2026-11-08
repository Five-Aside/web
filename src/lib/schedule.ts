/** Pure schedule helpers shared by server routes and client components. */

export type FixtureRow = {
  week: number;
  match: number;
  home: number;
  away: number;
  /** 24h "HH:MM" */
  startTime: string;
  endTime: string;
  officials: number[];
};

export type ScheduleCycle = {
  id: string;
  key: string;
  label: string;
  /** "YYYY-MM-DD" of week 1 */
  startDate: string;
  weeks: number;
  monthlyFee: number;
  visitorFee: number;
};

export type Schedule = {
  cycle: ScheduleCycle;
  fixtures: FixtureRow[];
  /** Team number → display name */
  teamNames: Record<number, string>;
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function parseYmd(ymd: string) {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function toYmd(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function addDays(ymd: string, days: number) {
  const date = parseYmd(ymd);
  date.setDate(date.getDate() + days);
  return toYmd(date);
}

export function weekDate(cycle: Pick<ScheduleCycle, "startDate">, week: number) {
  return addDays(cycle.startDate, (week - 1) * 7);
}

export function cycleWeeks(cycle: Pick<ScheduleCycle, "weeks">) {
  return Array.from({ length: cycle.weeks }, (_, i) => i + 1);
}

/** "24 Sep – 15 Oct 2026" */
export function cycleLabel(startDate: string, weeks: number) {
  const start = parseYmd(startDate);
  const end = parseYmd(addDays(startDate, (weeks - 1) * 7));
  const startPart =
    start.getFullYear() === end.getFullYear()
      ? `${start.getDate()} ${MONTHS[start.getMonth()]}`
      : `${start.getDate()} ${MONTHS[start.getMonth()]} ${start.getFullYear()}`;
  return `${startPart} – ${end.getDate()} ${MONTHS[end.getMonth()]} ${end.getFullYear()}`;
}

export function formatDateLabel(ymd: string, withYear = true) {
  return parseYmd(ymd).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    ...(withYear ? { year: "numeric" } : {}),
  });
}

/** "19:05" → "7:05" (12-hour, no suffix, matching the published fixture lists). */
export function formatClock(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, "0")}`;
}

export function fixtureTime(row: Pick<FixtureRow, "startTime" | "endTime">) {
  return `${formatClock(row.startTime)}–${formatClock(row.endTime)}`;
}

export function teamName(names: Record<number, string>, number: number) {
  return names[number] ?? `Team ${number}`;
}

export function fixtureLabel(row: Pick<FixtureRow, "home" | "away">, names: Record<number, string>) {
  return `${teamName(names, row.home)} vs ${teamName(names, row.away)}`;
}

export function officialsLabel(row: Pick<FixtureRow, "officials">, names: Record<number, string>) {
  if (row.officials.length === 0) return "—";
  const defaults = row.officials.every((n) => teamName(names, n) === `Team ${n}`);
  if (defaults) return `Team ${row.officials.join(" & ")}`;
  return row.officials.map((n) => teamName(names, n)).join(" & ");
}

export function fixturesForWeek(schedule: Pick<Schedule, "fixtures">, week: number) {
  return schedule.fixtures
    .filter((f) => f.week === week)
    .sort((a, b) => a.match - b.match);
}

export function findFixture(schedule: Pick<Schedule, "fixtures">, week: number, match: number) {
  return schedule.fixtures.find((f) => f.week === week && f.match === match) ?? null;
}

export function maxMatchesPerWeek(schedule: Pick<Schedule, "fixtures">) {
  return schedule.fixtures.reduce((max, f) => Math.max(max, f.match), 0);
}

/** "08060332714" → "https://wa.me/2348060332714" */
export function whatsappChatUrl(phone: string | null | undefined) {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  const intl = digits.startsWith("0") ? `234${digits.slice(1)}` : digits;
  return `https://wa.me/${intl}`;
}

export function formatNaira(amount: number) {
  return `₦${amount.toLocaleString("en-NG")}`;
}
