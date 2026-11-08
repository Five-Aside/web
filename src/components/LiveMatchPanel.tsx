"use client";

import { useEffect, useState } from "react";
import { useLeague, useLeagueLinks } from "@/components/LeagueProvider";
import { cycleWeeks, fixtureTime, fixturesForWeek, weekDate } from "@/lib/schedule";

type Side = "home" | "away";

type LiveTeam = { id: string; number: number; name: string };

type LivePlayer = {
  id: string;
  name: string;
  status: string;
  teamId: string | null;
  suspensionMatchesRemaining: number;
};

type LiveEvent = {
  id: string;
  type: string;
  count: number;
  side: Side | null;
  player: { id: string; name: string; teamId: string | null };
};

type LiveState = {
  week: number;
  match: number;
  homeTeam: LiveTeam;
  awayTeam: LiveTeam;
  result: { id: string; homeGoals: number; awayGoals: number; status: string } | null;
  events: LiveEvent[];
  players: LivePlayer[];
};

type ResultSummary = { week: number; match: number; status?: string };

const field =
  "select-field w-full border border-line bg-pitch-lift px-3 py-2.5 text-sm text-chalk outline-none focus:border-flood";

/** Select value meaning "I'll type the name of someone who isn't registered". */
const TYPED = "__typed";

const EVENT_LABEL: Record<string, string> = {
  GOAL: "⚽ Goal",
  ASSIST: "🅰️ Assist",
  YC: "🟨 Yellow",
  RC: "🟥 Red",
};

function todayYmd() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Today's week if it's a matchday, else the latest week that has started. */
function defaultWeek(cycle: { startDate: string; weeks: number }) {
  const today = todayYmd();
  let pick = 1;
  for (const w of cycleWeeks(cycle)) {
    if (weekDate(cycle, w) <= today) pick = w;
  }
  return pick;
}

export function LiveMatchPanel({
  results,
  onChange,
}: {
  results: ResultSummary[];
  onChange: () => Promise<void> | void;
}) {
  const league = useLeague();
  const { api } = useLeagueLinks();
  const schedule = league.schedule;
  const pickDefaultMatch = (w: number) => {
    const inWeek = fixturesForWeek(schedule, w);
    const live = results.find((r) => r.week === w && r.status === "live");
    if (live) return live.match;
    const unplayed = inWeek.find(
      (f) => !results.some((r) => r.week === w && r.match === f.match),
    );
    return (unplayed ?? inWeek[0])?.match ?? null;
  };

  const [week, setWeek] = useState(() => defaultWeek(schedule.cycle));
  const [match, setMatch] = useState<number | null>(() => pickDefaultMatch(week));
  const [state, setState] = useState<LiveState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fixtures = fixturesForWeek(schedule, week);
  const fixture = fixtures.find((f) => f.match === match) ?? null;

  useEffect(() => {
    if (match === null) return;
    let cancelled = false;
    fetch(api(`/live?week=${week}&match=${match}`))
      .then(async (r) => {
        const data = await r.json();
        if (cancelled) return;
        if (!r.ok) {
          setError(data.error ?? "Could not load match");
          setState(null);
        } else {
          setError(null);
          setState(data);
        }
      })
      .catch(() => !cancelled && setError("Could not load match"));
    return () => {
      cancelled = true;
    };
  }, [api, week, match]);

  async function send(body: Record<string, unknown>) {
    if (match === null) return false;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(api("/live"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ week, match, ...body }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not save");
        return false;
      }
      setState(data);
      await onChange();
      return true;
    } catch {
      setError("Network problem — try again");
      return false;
    } finally {
      setBusy(false);
    }
  }

  const status = state?.result?.status ?? null;
  const statusLabel =
    status === "live" ? "LIVE" : status === "final" ? "Full time" : "Not started";

  return (
    <section className="mt-10 border border-flood/60 bg-flood/[0.05] p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-2xl text-chalk">Live match</h2>
        <span
          className={
            status === "live"
              ? "animate-pulse bg-danger px-2 py-0.5 text-xs font-bold tracking-[0.12em] text-chalk"
              : "border border-line px-2 py-0.5 text-xs font-semibold tracking-[0.12em] text-muted"
          }
        >
          {statusLabel}
        </span>
      </div>
      <p className="mt-1 text-sm text-muted">
        Update the score and scorers as it happens. Every tap saves straight to the site.
      </p>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:max-w-md">
        <select
          className={field}
          value={week}
          onChange={(e) => {
            const w = Number(e.target.value);
            setWeek(w);
            setMatch(pickDefaultMatch(w));
          }}
        >
          {cycleWeeks(schedule.cycle).map((w) => (
            <option key={w} value={w}>
              Week {w}
            </option>
          ))}
        </select>
        <select
          className={field}
          value={match ?? ""}
          onChange={(e) => setMatch(Number(e.target.value))}
        >
          {fixtures.map((f) => (
            <option key={f.match} value={f.match}>
              Match {f.match} · {fixtureTime(f)}
            </option>
          ))}
        </select>
      </div>

      {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}

      {state && fixture ? (
        <>
          <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-center">
            <p className="font-semibold text-chalk">{state.homeTeam.name}</p>
            <p className="font-display text-4xl text-flood sm:text-5xl">
              {state.result?.homeGoals ?? 0}–{state.result?.awayGoals ?? 0}
            </p>
            <p className="font-semibold text-chalk">{state.awayTeam.name}</p>
          </div>

          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {status === null ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => send({ action: "start" })}
                className="bg-flood px-5 py-2.5 text-sm font-semibold text-pitch-deep disabled:opacity-50"
              >
                Kick off (0–0, LIVE)
              </button>
            ) : status === "live" ? (
              <>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    if (confirm("End the match and mark it full time?")) {
                      void send({ action: "status", status: "final" });
                    }
                  }}
                  className="bg-chalk px-5 py-2.5 text-sm font-semibold text-pitch-deep disabled:opacity-50"
                >
                  Full time
                </button>
                {state.events.length === 0 ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      if (confirm("Cancel kick-off and put this match back to not started?")) {
                        void send({ action: "reset" });
                      }
                    }}
                    className="border border-danger/60 px-5 py-2.5 text-sm font-semibold text-danger disabled:opacity-50"
                  >
                    Cancel kick-off
                  </button>
                ) : null}
              </>
            ) : (
              <button
                type="button"
                disabled={busy}
                onClick={() => send({ action: "status", status: "live" })}
                className="border border-line px-5 py-2.5 text-sm font-semibold text-muted hover:text-chalk disabled:opacity-50"
              >
                Reopen as live
              </button>
            )}
          </div>

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <SideControls
              side="home"
              team={state.homeTeam}
              players={state.players}
              busy={busy}
              onSend={send}
            />
            <SideControls
              side="away"
              team={state.awayTeam}
              players={state.players}
              busy={busy}
              onSend={send}
            />
          </div>

          <div className="mt-6">
            <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-flood">
              This match
            </h3>
            {state.events.length === 0 ? (
              <p className="mt-2 text-sm text-muted">Nothing logged yet.</p>
            ) : (
              <ul className="mt-2 divide-y divide-line border border-line">
                {state.events.map((ev) => {
                  const teamLabel =
                    ev.side === "home"
                      ? state.homeTeam.name
                      : ev.side === "away"
                        ? state.awayTeam.name
                        : null;
                  return (
                    <li
                      key={ev.id}
                      className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
                    >
                      <span className="text-chalk">
                        {EVENT_LABEL[ev.type] ?? ev.type}
                        {ev.count > 1 ? ` ×${ev.count}` : ""} · {ev.player.name}
                        {teamLabel ? <span className="text-muted"> ({teamLabel})</span> : null}
                      </span>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          const what =
                            `${EVENT_LABEL[ev.type] ?? ev.type} for ${ev.player.name}` +
                            "";
                          if (confirm(`Undo ${what}?`)) void send({ action: "undo", eventId: ev.id });
                        }}
                        className="shrink-0 text-xs text-danger disabled:opacity-50"
                      >
                        Undo
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </>
      ) : !error ? (
        <p className="mt-4 text-sm text-muted">Loading match…</p>
      ) : null}
    </section>
  );
}

function PlayerOptions({ team, players }: { team: LiveTeam; players: LivePlayer[] }) {
  const own = players.filter((pl) => pl.teamId === team.id);
  const others = players.filter((pl) => pl.teamId !== team.id);
  const label = (pl: LivePlayer) =>
    pl.name +
    (pl.status === "guest" ? " (guest)" : "") +
    (pl.suspensionMatchesRemaining > 0 ? " (suspended)" : "");
  return (
    <>
      <option value={TYPED}>✍️ Type a name (not registered)</option>
      <optgroup label={team.name}>
        {own.map((pl) => (
          <option key={pl.id} value={pl.id}>
            {label(pl)}
          </option>
        ))}
      </optgroup>
      <optgroup label="Other players / subs">
        {others.map((pl) => (
          <option key={pl.id} value={pl.id}>
            {label(pl)}
          </option>
        ))}
      </optgroup>
    </>
  );
}

function SideControls({
  side,
  team,
  players,
  busy,
  onSend,
}: {
  side: Side;
  team: LiveTeam;
  players: LivePlayer[];
  busy: boolean;
  onSend: (body: Record<string, unknown>) => Promise<boolean>;
}) {
  const [scorer, setScorer] = useState("");
  const [scorerName, setScorerName] = useState("");
  const [carded, setCarded] = useState("");
  const [cardedName, setCardedName] = useState("");

  /** { playerId } for a picked player, { playerName } for a typed one. */
  const who = (value: string, typed: string, idKey: string, nameKey: string) =>
    value === TYPED
      ? { [idKey]: null, [nameKey]: typed.trim() || null }
      : { [idKey]: value || null, [nameKey]: null };
  const hasScorer = scorer === TYPED ? scorerName.trim() !== "" : scorer !== "";
  const hasCarded = carded === TYPED ? cardedName.trim() !== "" : carded !== "";

  return (
    <div className="border border-line bg-pitch-deep/60 p-4">
      <p className="font-display text-lg text-chalk">{team.name}</p>

      <div className="mt-3 grid gap-2">
        <select className={field} value={scorer} onChange={(e) => setScorer(e.target.value)}>
          <option value="">Scorer (or own goal / unknown)</option>
          <PlayerOptions team={team} players={players} />
        </select>
        {scorer === TYPED ? (
          <input
            className={field}
            value={scorerName}
            onChange={(e) => setScorerName(e.target.value)}
            placeholder="Scorer's name"
            maxLength={60}
            autoFocus
          />
        ) : null}
        <button
          type="button"
          disabled={busy || (scorer === TYPED && !hasScorer)}
          onClick={async () => {
            const ok = await onSend({
              action: "goal",
              side,
              ...who(scorer, scorerName, "playerId", "playerName"),
            });
            if (ok) {
              setScorer("");
              setScorerName("");
            }
          }}
          className="bg-flood py-3 text-base font-bold text-pitch-deep disabled:opacity-50"
        >
          ⚽ Goal {team.name}
        </button>
      </div>

      <div className="mt-4 grid gap-2">
        <div className="grid grid-cols-[1fr_auto_auto] gap-2">
          <select className={field} value={carded} onChange={(e) => setCarded(e.target.value)}>
            <option value="">Card for…</option>
            <PlayerOptions team={team} players={players} />
          </select>
          {(["YC", "RC"] as const).map((type) => (
            <button
              key={type}
              type="button"
              disabled={busy || !hasCarded}
              onClick={async () => {
                const ok = await onSend({
                  action: "card",
                  side,
                  type,
                  ...who(carded, cardedName, "playerId", "playerName"),
                });
                if (ok) {
                  setCarded("");
                  setCardedName("");
                }
              }}
              className={`px-3 text-sm font-semibold disabled:opacity-40 ${
                type === "YC" ? "bg-yellow-400 text-pitch-deep" : "bg-danger text-chalk"
              }`}
            >
              {type === "YC" ? "Yellow" : "Red"}
            </button>
          ))}
        </div>
        {carded === TYPED ? (
          <input
            className={field}
            value={cardedName}
            onChange={(e) => setCardedName(e.target.value)}
            placeholder="Carded player's name"
            maxLength={60}
          />
        ) : null}
      </div>

      <div className="mt-4 flex items-center gap-2 text-xs text-muted">
        <span>Fix score only:</span>
        {([-1, 1] as const).map((delta) => (
          <button
            key={delta}
            type="button"
            disabled={busy}
            onClick={() => onSend({ action: "adjust", side, delta })}
            className="border border-line px-2.5 py-1 font-semibold text-chalk disabled:opacity-50"
          >
            {delta > 0 ? "+1" : "−1"}
          </button>
        ))}
      </div>
    </div>
  );
}
