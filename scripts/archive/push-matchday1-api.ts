/**
 * Push Matchday 1 results + news via production HTTP API (admin session).
 * Usage: BASE_URL=... ADMIN_PASSWORD=... npx tsx scripts/push-matchday1-api.ts
 */
const BASE = process.env.BASE_URL || "https://thursday-night-football-production.up.railway.app";
const PASSWORD = process.env.ADMIN_PASSWORD;
if (!PASSWORD) {
  console.error("ADMIN_PASSWORD required");
  process.exit(1);
}

const jar = new Map<string, string>();

function storeCookies(res: Response) {
  const raw = res.headers.getSetCookie?.() ?? [];
  for (const c of raw) {
    const [pair] = c.split(";");
    const i = pair.indexOf("=");
    if (i > 0) jar.set(pair.slice(0, i), pair.slice(i + 1));
  }
  // fallback for older undici
  const single = res.headers.get("set-cookie");
  if (single && raw.length === 0) {
    for (const part of single.split(/,(?=[^;]+?=)/)) {
      const [pair] = part.split(";");
      const i = pair.indexOf("=");
      if (i > 0) jar.set(pair.trim().slice(0, i), pair.trim().slice(i + 1));
    }
  }
}

function cookieHeader() {
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}

async function api(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  if (jar.size) headers.set("cookie", cookieHeader());
  if (init.body && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }
  const res = await fetch(`${BASE}${path}`, { ...init, headers });
  storeCookies(res);
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    throw new Error(`${init.method || "GET"} ${path} → ${res.status} ${JSON.stringify(data)}`);
  }
  return data as Record<string, unknown>;
}

async function ensurePlayer(name: string, teamId: string | null, players: Player[]) {
  const lower = name.toLowerCase();
  let hit = players.find(
    (p) =>
      p.name.toLowerCase() === lower ||
      p.name.toLowerCase().includes(lower) ||
      lower.includes(p.name.toLowerCase().split(/\s+/)[0] || "___"),
  );

  // Prefer exact-ish matches for short nicknames
  const nickMap: Record<string, string[]> = {
    shabi: ["shabayan", "shabi"],
    alex: ["alexander"],
    mayan: ["maayan", "mayan"],
    ogunlana: ["odinegun", "ogunlana"],
    jerry: ["jerry"],
    bash: ["bash"],
    amorah: ["amorah"],
  };
  const keys = nickMap[lower];
  if (keys) {
    hit =
      players.find((p) =>
        keys.some((k) => p.name.toLowerCase().includes(k)),
      ) ?? hit;
  }

  if (hit) {
    if (teamId && hit.teamId !== teamId) {
      await api("/api/players", {
        method: "PATCH",
        body: JSON.stringify({
          id: hit.id,
          teamId,
          status: "active",
          seat: "permanent",
        }),
      });
      hit.teamId = teamId;
    }
    return hit;
  }

  const phone = `09${Math.floor(1e8 + Math.random() * 9e8)}`;
  const created = (await api("/api/players", {
    method: "POST",
    body: JSON.stringify({
      name,
      phone,
      password: "tnf-temp",
      admin: true,
    }),
  })) as Player;

  if (teamId) {
    await api("/api/players", {
      method: "PATCH",
      body: JSON.stringify({
        id: created.id,
        teamId,
        seat: "permanent",
      }),
    });
    created.teamId = teamId;
  }
  players.push(created);
  return created;
}

type Player = {
  id: string;
  name: string;
  teamId: string | null;
  team?: { number: number } | null;
};

type Team = { id: string; number: number; name: string };

async function main() {
  await api("/api/admin/login", {
    method: "POST",
    body: JSON.stringify({ password: PASSWORD }),
  });

  const teams = (await api("/api/teams")) as unknown as Team[];
  const t = (n: number) => teams.find((x) => x.number === n)!.id;

  let players = (await api("/api/players")) as unknown as Player[];

  const shabi = await ensurePlayer("Shabi", t(1), players);
  const ogunlana = await ensurePlayer("Ogunlana", t(1), players);
  // Fix if Shabi matched Alexander — keep him on T1; create Alex on T2 separately
  const alexExisting = players.find((p) =>
    p.name.toLowerCase().includes("alexander"),
  );
  let alex: Player;
  if (alexExisting && alexExisting.id === shabi.id) {
    alex = await ensurePlayer("Alex", t(2), players);
  } else if (alexExisting) {
    alex = await ensurePlayer("Alexander", t(2), players);
  } else {
    alex = await ensurePlayer("Alex", t(2), players);
  }

  const arinze = await ensurePlayer("Arinze", t(2), players);
  const jerry = await ensurePlayer("Jerry", t(2), players);
  const bash = await ensurePlayer("Bash", t(3), players);
  const yunusa = await ensurePlayer("Yunusa", t(3), players);
  const sani = await ensurePlayer("Sani", t(3), players);
  const mayan = await ensurePlayer("Mayan", t(3), players);
  const vokay = await ensurePlayer("Vokay", t(3), players);
  const amorah = await ensurePlayer("Amorah", t(4), players);
  const zaza = await ensurePlayer("Zaza", t(4), players);
  const bright = await ensurePlayer("Bright", t(4), players);

  // Refresh players list after creates
  players = (await api("/api/players")) as unknown as Player[];

  const results: [number, number, number][] = [
    [1, 1, 3],
    [2, 1, 1],
    [3, 1, 1],
    [4, 0, 0],
    [5, 1, 2],
    [6, 3, 3],
  ];
  for (const [match, homeGoals, awayGoals] of results) {
    await api("/api/results", {
      method: "POST",
      body: JSON.stringify({ week: 1, match, homeGoals, awayGoals }),
    });
  }

  async function ev(
    playerId: string,
    match: number,
    type: string,
    count: number,
  ) {
    await api("/api/events", {
      method: "POST",
      body: JSON.stringify({ playerId, week: 1, match, type, count }),
    });
  }

  await ev(shabi.id, 1, "GOAL", 1);
  await ev(arinze.id, 1, "GOAL", 3);
  await ev(alex.id, 1, "ASSIST", 1);
  await ev(bash.id, 2, "GOAL", 1);
  await ev(amorah.id, 2, "GOAL", 1);
  await ev(shabi.id, 3, "GOAL", 1);
  await ev(vokay.id, 3, "GOAL", 1);
  await ev(bright.id, 4, "YC", 1);
  await ev(ogunlana.id, 5, "GOAL", 1);
  await ev(zaza.id, 5, "GOAL", 2);
  await ev(arinze.id, 6, "GOAL", 2);
  await ev(jerry.id, 6, "GOAL", 1);
  await ev(bash.id, 6, "GOAL", 1);
  await ev(yunusa.id, 6, "GOAL", 1);
  await ev(sani.id, 6, "GOAL", 1);
  await ev(mayan.id, 6, "ASSIST", 2);

  // Clear old week-1 stories then publish
  const news = (await api("/api/news?limit=50")) as {
    posts: { id: string; week: number | null }[];
  };
  for (const p of news.posts.filter((x) => x.week === 1)) {
    await api(`/api/news?id=${p.id}`, { method: "DELETE" });
  }

  const stories = [
    {
      pinned: true,
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
    {
      pinned: false,
      title: "Arinze hits five on opening night",
      body: [
        "Team 2’s Arinze owned Matchday 1 — three against Team 1, then two more in the 3–3 with Team 3.",
        "",
        "Five goals on night one. The golden boot race already has a clear front-runner.",
      ].join("\n"),
    },
    {
      pinned: false,
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
    {
      pinned: false,
      title: "Zaza brace sinks Team 1",
      body: [
        "Team 4 took Match 5 2–1. Zaza scored both; Ogunlana replied for Team 1.",
        "",
        "Earlier, Amorah had earned Team 4 a point in the 1–1 with Team 3.",
        "",
        "Bright picked up a yellow in the Team 2 vs Team 4 stalemate.",
      ].join("\n"),
    },
  ];

  for (const s of stories) {
    await api("/api/news", {
      method: "POST",
      body: JSON.stringify({ ...s, week: 1, pinned: s.pinned }),
    });
  }

  console.log("Matchday 1 results, events, and news posted.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

export {};
