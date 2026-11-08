/**
 * Log Matchday 2 (week 2) results, goals, and cards via the production API.
 * Usage: ADMIN_PASSWORD=... npx tsx scripts/log-matchday2-api.ts
 */
const BASE = process.env.BASE_URL || "https://thursday-night-football-production.up.railway.app";
const PASSWORD = process.env.ADMIN_PASSWORD;
if (!PASSWORD) {
  console.error("ADMIN_PASSWORD required");
  process.exit(1);
}

const jar = new Map<string, string>();

async function api(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  if (jar.size) {
    headers.set("cookie", [...jar].map(([k, v]) => `${k}=${v}`).join("; "));
  }
  if (init.body) headers.set("content-type", "application/json");
  const res = await fetch(`${BASE}${path}`, { ...init, headers });
  for (const c of res.headers.getSetCookie?.() ?? []) {
    const [pair] = c.split(";");
    const i = pair.indexOf("=");
    if (i > 0) jar.set(pair.slice(0, i), pair.slice(i + 1));
  }
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    throw new Error(`${init.method || "GET"} ${path} → ${res.status} ${text}`);
  }
  return data;
}

const WEEK = 2;

// Site player names for the nicknames used on the night.
const PLAYERS: Record<string, string> = {
  Mayan: "Keni Maayan",
  Sani: "Sani",
  Vokay: "Vokay",
  Shabi: "Shabi",
  Aliyu: "aliyu ahmad",
  Zaza: "Zaza",
  Arinze: "Arinze",
  Paul: "Paul",
  Bright: "Bright",
  Gabriel: "Gabriel",
  Amorah: "Amorah uzoma",
};

type MatchLine = [nickname: string, type: "GOAL" | "ASSIST" | "YC" | "RC", count: number];

const MATCHES: { match: number; home: number; away: number; events: MatchLine[] }[] = [
  {
    match: 1,
    home: 3,
    away: 0,
    events: [
      ["Mayan", "GOAL", 1],
      ["Sani", "GOAL", 1],
      ["Vokay", "GOAL", 1],
      ["Mayan", "ASSIST", 1],
      ["Amorah", "YC", 1],
    ],
  },
  { match: 2, home: 1, away: 0, events: [["Shabi", "GOAL", 1], ["Shabi", "YC", 1], ["Aliyu", "YC", 1]] },
  { match: 3, home: 0, away: 1, events: [["Zaza", "GOAL", 1]] },
  {
    match: 4,
    home: 2,
    away: 1,
    events: [["Aliyu", "GOAL", 2], ["Vokay", "GOAL", 1]],
  },
  {
    match: 5,
    home: 1,
    away: 0,
    events: [["Arinze", "GOAL", 1], ["Sani", "YC", 1], ["Mayan", "YC", 1], ["Vokay", "RC", 1]],
  },
  {
    match: 6,
    home: 4,
    away: 5,
    events: [
      ["Shabi", "GOAL", 2],
      ["Aliyu", "GOAL", 1],
      ["Paul", "GOAL", 1],
      ["Bright", "GOAL", 2],
      ["Zaza", "GOAL", 2],
      ["Gabriel", "GOAL", 1],
      ["Gabriel", "ASSIST", 1],
    ],
  },
];

async function main() {
  await api("/api/admin/login", {
    method: "POST",
    body: JSON.stringify({ password: PASSWORD }),
  });

  const players = (await api("/api/players")) as { id: string; name: string }[];
  const idFor = (nick: string) => {
    const hit = players.find((p) => p.name === PLAYERS[nick]);
    if (!hit) throw new Error(`No player for ${nick} (${PLAYERS[nick]})`);
    return hit.id;
  };
  for (const nick of Object.keys(PLAYERS)) idFor(nick);

  const { events } = (await api("/api/events")) as { events: { week: number }[] };
  if (events.some((e) => e.week === WEEK)) {
    throw new Error(`Week ${WEEK} events already logged — refusing to duplicate`);
  }

  for (const m of MATCHES) {
    await api("/api/results", {
      method: "POST",
      body: JSON.stringify({ week: WEEK, match: m.match, homeGoals: m.home, awayGoals: m.away }),
    });
    for (const [nick, type, count] of m.events) {
      await api("/api/events", {
        method: "POST",
        body: JSON.stringify({ playerId: idFor(nick), week: WEEK, match: m.match, type, count }),
      });
    }
    console.log(`M${m.match} ${m.home}–${m.away} logged (${m.events.length} events)`);
  }

  const stories = [
    {
      pinned: true,
      title: "Matchday 2 wrap: Team 4 go top",
      body: [
        "Six more fixtures in the book, and the table has a new leader.",
        "",
        "Results:",
        "• Team 3 beat Team 4 3–0 (Mayan, Sani, Vokay)",
        "• Team 1 beat Team 2 1–0 (Shabi)",
        "• Team 4 beat Team 2 1–0 (Zaza)",
        "• Team 1 beat Team 3 2–1 (Aliyu brace; Vokay replied)",
        "• Team 2 beat Team 3 1–0 (Arinze)",
        "• Team 4 beat Team 1 5–4 in a nine-goal thriller",
        "",
        "Cards: Vokay (red), Shabi, Aliyu, Sani, Amorah and Mayan (yellow).",
        "",
        "Full scorers and the updated table are on Tables.",
      ].join("\n"),
    },
    {
      pinned: false,
      title: "Vokay sent off after scoring twice",
      body: [
        "Vokay went from hero to spectator on Matchday 2.",
        "",
        "He scored in Team 3’s 3–0 win over Team 4 and again in the 2–1 loss to Team 1. Then, in Team 3’s 1–0 defeat to Team 2, he was shown a straight red for retaliation and bad conduct.",
        "",
        "That means a one-match ban: Vokay misses Team 3’s next fixture.",
      ].join("\n"),
    },
    {
      pinned: false,
      title: "Team 4 edge Team 1 in nine-goal finale",
      body: [
        "The last game of the night was the wildest of the cycle so far: Team 4 5–4 Team 1.",
        "",
        "Team 4: Bright (2), Zaza (2), Gabriel.",
        "Team 1: Shabi (2), Aliyu, Paul.",
        "",
        "Team 1 had won their first two games of the night and still finished second best in this one.",
      ].join("\n"),
    },
  ];

  for (const s of stories) {
    await api("/api/news", {
      method: "POST",
      body: JSON.stringify({ ...s, week: WEEK }),
    });
  }
  console.log("Matchday 2 news posted.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

export {};
