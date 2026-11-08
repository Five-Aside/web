/**
 * Register Matchday 2 players and split Shabi from Alex (Alexander Shabayan Ezekiel).
 * Usage: ADMIN_PASSWORD=... npx tsx scripts/register-md2-players.ts
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

type Player = { id: string; name: string; teamId: string | null };
type Team = { id: string; number: number };
type MatchEvent = {
  id: string;
  week: number;
  match: number;
  type: string;
  count: number;
  playerId: string;
};

async function main() {
  await api("/api/admin/login", {
    method: "POST",
    body: JSON.stringify({ password: PASSWORD }),
  });

  const teams = (await api("/api/teams")) as Team[];
  const teamId = (n: number) => teams.find((t) => t.number === n)!.id;
  const players = (await api("/api/players")) as Player[];
  const byName = (name: string) =>
    players.find((p) => p.name.toLowerCase() === name.toLowerCase());

  async function register(name: string, team: number) {
    let player = byName(name);
    if (!player) {
      const phone = `09${Math.floor(1e8 + Math.random() * 9e8)}`;
      player = (await api("/api/players", {
        method: "POST",
        body: JSON.stringify({ name, phone, password: "tnf-temp", admin: true }),
      })) as Player;
      players.push(player);
      console.log(`created ${name}`);
    }
    await api("/api/players", {
      method: "PATCH",
      body: JSON.stringify({ id: player.id, teamId: teamId(team), status: "active" }),
    });
    console.log(`${name} → Team ${team}`);
    return player;
  }

  const shabi = await register("Shabi", 1);
  await register("Paul", 1);
  await register("Gabriel", 4);

  const aliyu = byName("aliyu ahmad");
  if (!aliyu) throw new Error("aliyu ahmad not found");
  await api("/api/players", {
    method: "PATCH",
    body: JSON.stringify({ id: aliyu.id, teamId: teamId(1) }),
  });
  console.log("aliyu ahmad → Team 1");

  const alex = byName("Alexander Shabayan Ezekiel");
  if (!alex) throw new Error("Alexander Shabayan Ezekiel not found");
  await api("/api/players", {
    method: "PATCH",
    body: JSON.stringify({ id: alex.id, teamId: teamId(2) }),
  });

  const { events } = (await api("/api/events")) as { events: MatchEvent[] };
  const misattributed = events.filter(
    (e) =>
      e.playerId === alex.id &&
      e.week === 1 &&
      e.type === "GOAL" &&
      (e.match === 1 || e.match === 3),
  );
  for (const e of misattributed) {
    await api("/api/events", {
      method: "POST",
      body: JSON.stringify({
        playerId: shabi.id,
        week: e.week,
        match: e.match,
        type: e.type,
        count: e.count,
      }),
    });
    await api(`/api/events?id=${e.id}`, { method: "DELETE" });
    console.log(`moved W${e.week} M${e.match} goal from Alex to Shabi`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

export {};
