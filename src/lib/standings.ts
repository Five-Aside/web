export type StandingRow = {
  teamId: string;
  number: number;
  name: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  gd: number;
  points: number;
  cleanSheets: number;
  discipline: number;
};

type TeamRef = { id: string; number: number; name: string };

type Result = {
  homeTeamId: string;
  awayTeamId: string;
  homeGoals: number;
  awayGoals: number;
};

type CardEvent = {
  count: number;
  type: string;
  player: { teamId: string | null };
};

function emptyRow(team: TeamRef): StandingRow {
  return {
    teamId: team.id,
    number: team.number,
    name: team.name,
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    gf: 0,
    ga: 0,
    gd: 0,
    points: 0,
    cleanSheets: 0,
    discipline: 0,
  };
}

function applyResult(
  table: Map<string, StandingRow>,
  homeId: string,
  awayId: string,
  hg: number,
  ag: number,
) {
  const home = table.get(homeId);
  const away = table.get(awayId);
  if (!home || !away) return;

  home.played += 1;
  away.played += 1;
  home.gf += hg;
  home.ga += ag;
  away.gf += ag;
  away.ga += hg;
  home.gd = home.gf - home.ga;
  away.gd = away.gf - away.ga;

  if (ag === 0) home.cleanSheets += 1;
  if (hg === 0) away.cleanSheets += 1;

  if (hg > ag) {
    home.won += 1;
    home.points += 3;
    away.lost += 1;
  } else if (hg < ag) {
    away.won += 1;
    away.points += 3;
    home.lost += 1;
  } else {
    home.drawn += 1;
    away.drawn += 1;
    home.points += 1;
    away.points += 1;
  }
}

/** Head-to-head points among a set of tied team ids. */
function h2hPoints(
  results: Result[],
  teamIds: Set<string>,
): Map<string, number> {
  const pts = new Map<string, number>();
  for (const id of teamIds) pts.set(id, 0);

  for (const r of results) {
    if (!teamIds.has(r.homeTeamId) || !teamIds.has(r.awayTeamId)) continue;
    if (r.homeGoals > r.awayGoals) {
      pts.set(r.homeTeamId, (pts.get(r.homeTeamId) || 0) + 3);
    } else if (r.homeGoals < r.awayGoals) {
      pts.set(r.awayTeamId, (pts.get(r.awayTeamId) || 0) + 3);
    } else {
      pts.set(r.homeTeamId, (pts.get(r.homeTeamId) || 0) + 1);
      pts.set(r.awayTeamId, (pts.get(r.awayTeamId) || 0) + 1);
    }
  }
  return pts;
}

export function buildStandings(
  teams: TeamRef[],
  results: Result[],
  cardEvents: CardEvent[] = [],
): StandingRow[] {
  const table = new Map<string, StandingRow>();
  for (const t of teams) table.set(t.id, emptyRow(t));

  for (const r of results) {
    applyResult(table, r.homeTeamId, r.awayTeamId, r.homeGoals, r.awayGoals);
  }

  for (const ev of cardEvents) {
    if (!ev.player.teamId) continue;
    const row = table.get(ev.player.teamId);
    if (!row) continue;
    if (ev.type === "YC") row.discipline += ev.count;
    if (ev.type === "RC") row.discipline += ev.count * 2;
  }

  const rows = Array.from(table.values());

  rows.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.cleanSheets !== a.cleanSheets) return b.cleanSheets - a.cleanSheets;
    if (b.gd !== a.gd) return b.gd - a.gd;
    if (b.gf !== a.gf) return b.gf - a.gf;

    const tied = new Set(
      rows
        .filter(
          (r) =>
            r.points === a.points &&
            r.cleanSheets === a.cleanSheets &&
            r.gd === a.gd &&
            r.gf === a.gf,
        )
        .map((r) => r.teamId),
    );
    if (tied.size > 1) {
      const h2h = h2hPoints(results, tied);
      const ha = h2h.get(a.teamId) || 0;
      const hb = h2h.get(b.teamId) || 0;
      if (hb !== ha) return hb - ha;
    }

    if (a.discipline !== b.discipline) return a.discipline - b.discipline;
    return a.number - b.number;
  });

  return rows;
}
