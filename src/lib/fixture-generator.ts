import type { FixtureRow } from "@/lib/schedule";

export type FormatSettings = {
  teamCount: number;
  weeks: number;
  /** 24h "HH:MM" */
  kickoffTime: string;
  sessionMinutes: number;
  matchMinutes: number;
  turnaroundMinutes: number;
  /** Override; defaults to as many matches as fit in the session. */
  matchesPerNight?: number;
};

export function addMinutes(hhmm: string, minutes: number) {
  const [h, m] = hhmm.split(":").map(Number);
  const total = h * 60 + m + minutes;
  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

export function matchesThatFit(
  settings: Pick<FormatSettings, "sessionMinutes" | "matchMinutes" | "turnaroundMinutes">,
) {
  const slot = settings.matchMinutes + settings.turnaroundMinutes;
  if (slot <= 0) return 0;
  return Math.max(1, Math.floor((settings.sessionMinutes + settings.turnaroundMinutes) / slot));
}

function pairKey(a: number, b: number) {
  return a < b ? `${a}-${b}` : `${b}-${a}`;
}

/**
 * Builds a cycle of fixtures. Each slot greedily picks the pairing that keeps
 * matchups spread across the cycle, avoids back-to-back games, and evens out
 * games per team each night. Resting teams officiate.
 */
export function generateFixtures(settings: FormatSettings): FixtureRow[] {
  const teams = Array.from({ length: Math.max(0, settings.teamCount) }, (_, i) => i + 1);
  if (teams.length < 2) return [];
  const perNight = settings.matchesPerNight ?? matchesThatFit(settings);
  const slot = settings.matchMinutes + settings.turnaroundMinutes;

  const pairs: [number, number][] = [];
  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) pairs.push([teams[i], teams[j]]);
  }

  const pairCount = new Map<string, number>();
  const homeCount = new Map<number, number>();
  const gamesTotal = new Map<number, number>();
  const officialCount = new Map<number, number>();
  const rows: FixtureRow[] = [];

  for (let week = 1; week <= settings.weeks; week++) {
    const tonight = new Map<number, number>();
    const pairsTonight = new Map<string, number>();
    let previous: number[] = [];
    // Rotate the evaluation order each week so cycles don't repeat verbatim.
    const offset = ((week - 1) * 2) % pairs.length;
    const ordered = [...pairs.slice(offset), ...pairs.slice(0, offset)];

    for (let match = 1; match <= perNight; match++) {
      let best: [number, number] = ordered[0];
      let bestCost = Number.POSITIVE_INFINITY;
      for (const [a, b] of ordered) {
        const cost =
          (pairsTonight.get(pairKey(a, b)) ?? 0) * 40 +
          (pairCount.get(pairKey(a, b)) ?? 0) * 10 +
          ((tonight.get(a) ?? 0) + (tonight.get(b) ?? 0)) * 6 +
          (previous.includes(a) ? 5 : 0) +
          (previous.includes(b) ? 5 : 0) +
          ((gamesTotal.get(a) ?? 0) + (gamesTotal.get(b) ?? 0)) * 2;
        if (cost < bestCost) {
          bestCost = cost;
          best = [a, b];
        }
      }

      let [home, away] = best;
      if ((homeCount.get(home) ?? 0) > (homeCount.get(away) ?? 0)) [home, away] = [away, home];

      pairCount.set(pairKey(home, away), (pairCount.get(pairKey(home, away)) ?? 0) + 1);
      pairsTonight.set(pairKey(home, away), (pairsTonight.get(pairKey(home, away)) ?? 0) + 1);
      homeCount.set(home, (homeCount.get(home) ?? 0) + 1);
      for (const t of [home, away]) {
        tonight.set(t, (tonight.get(t) ?? 0) + 1);
        gamesTotal.set(t, (gamesTotal.get(t) ?? 0) + 1);
      }

      const officials = teams
        .filter((t) => t !== home && t !== away)
        .sort(
          (x, y) =>
            (officialCount.get(x) ?? 0) - (officialCount.get(y) ?? 0) ||
            Number(previous.includes(x)) - Number(previous.includes(y)) ||
            x - y,
        )
        .slice(0, 2)
        .sort((x, y) => x - y);
      for (const t of officials) officialCount.set(t, (officialCount.get(t) ?? 0) + 1);

      const startTime = addMinutes(settings.kickoffTime, (match - 1) * slot);
      rows.push({
        week,
        match,
        home,
        away,
        startTime,
        endTime: addMinutes(startTime, settings.matchMinutes),
        officials,
      });
      previous = [home, away];
    }
  }

  return rows;
}

/** Problems an organiser should fix before saving a hand-edited fixture list. */
export function validateFixtures(rows: FixtureRow[], teamCount: number) {
  const errors: string[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    const key = `${row.week}-${row.match}`;
    if (seen.has(key)) errors.push(`Week ${row.week} has two Match ${row.match}s`);
    seen.add(key);
    if (row.home === row.away) errors.push(`Week ${row.week} Match ${row.match}: a team can't play itself`);
    for (const t of [row.home, row.away, ...row.officials]) {
      if (!Number.isInteger(t) || t < 1 || t > teamCount) {
        errors.push(`Week ${row.week} Match ${row.match}: team ${t} doesn't exist`);
      }
    }
    if (row.officials.includes(row.home) || row.officials.includes(row.away)) {
      errors.push(`Week ${row.week} Match ${row.match}: a playing team can't officiate`);
    }
    if (!/^\d{2}:\d{2}$/.test(row.startTime) || !/^\d{2}:\d{2}$/.test(row.endTime)) {
      errors.push(`Week ${row.week} Match ${row.match}: times must be HH:MM`);
    }
  }
  return errors;
}
