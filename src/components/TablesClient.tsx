"use client";

import { useEffect, useState } from "react";
import { AppChrome } from "@/components/AppChrome";
import { useLeague, useLeagueLinks } from "@/components/LeagueProvider";
import type { PlayerStatRow } from "@/lib/league-db";
import type { StandingRow } from "@/lib/standings";

type StatsPayload = {
  cycleKey: string | null;
  goals: PlayerStatRow[];
  cards: PlayerStatRow[];
  overall: PlayerStatRow[];
};

type Tab = "goals" | "cards" | "overall";

export function TablesClient() {
  const league = useLeague();
  const { api } = useLeagueLinks();
  const [standings, setStandings] = useState<StandingRow[]>([]);
  const [cycleKey, setCycleKey] = useState("");
  const [data, setData] = useState<StatsPayload | null>(null);
  const [tab, setTab] = useState<Tab>("goals");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([fetch(api("/results")), fetch(api("/stats"))])
      .then(async ([rRes, sRes]) => {
        const rData = await rRes.json();
        const sData = await sRes.json();
        setStandings(rData.standings ?? []);
        setCycleKey(rData.cycleKey || sData.cycleKey || "-");
        setData(sData);
      })
      .catch(() => setError("Could not load tables"));
  }, [api]);

  const rows = data?.[tab] ?? [];

  return (
    <AppChrome title="Tables">
      <p className="text-muted">
        League standings and player charts for{" "}
        <span className="text-chalk">
          {cycleKey ? league.schedule.cycle.label : "…"}
        </span>
        . Tiebreakers: points → clean sheets → GD → GF → head-to-head →
        discipline.
      </p>

      {error ? <p className="mt-6 text-danger">{error}</p> : null}

      <h2 className="font-display mt-10 text-2xl text-chalk">League table</h2>
      <div className="mt-4 overflow-x-auto border border-line">
        <table className="w-full min-w-[44rem] text-left text-sm">
          <thead className="border-b border-flood/30 bg-black/20 text-[0.7rem] uppercase tracking-[0.12em] text-flood">
            <tr>
              <th className="px-3 py-3">#</th>
              <th className="px-3 py-3">Team</th>
              <th className="px-3 py-3">Played</th>
              <th className="px-3 py-3">Points</th>
              <th className="px-3 py-3">Win</th>
              <th className="px-3 py-3">Draw</th>
              <th className="px-3 py-3">Loss</th>
              <th className="px-3 py-3">GF</th>
              <th className="px-3 py-3">GA</th>
              <th className="px-3 py-3">GD</th>
              <th className="px-3 py-3">CS</th>
            </tr>
          </thead>
          <tbody>
            {standings.length === 0 ? (
              <tr>
                <td colSpan={11} className="px-4 py-8 text-muted">
                  No teams yet.
                </td>
              </tr>
            ) : (
              standings.map((row, i) => (
                <tr key={row.teamId} className="border-b border-line">
                  <td className="px-3 py-3 font-display text-flood">{i + 1}</td>
                  <td className="px-3 py-3 font-semibold text-chalk">
                    {row.name}
                  </td>
                  <td className="px-3 py-3 text-muted">{row.played}</td>
                  <td className="px-3 py-3 font-semibold text-flood">
                    {row.points}
                  </td>
                  <td className="px-3 py-3 text-muted">{row.won}</td>
                  <td className="px-3 py-3 text-muted">{row.drawn}</td>
                  <td className="px-3 py-3 text-muted">{row.lost}</td>
                  <td className="px-3 py-3 text-muted">{row.gf}</td>
                  <td className="px-3 py-3 text-muted">{row.ga}</td>
                  <td className="px-3 py-3 text-muted">
                    {row.gd > 0 ? `+${row.gd}` : row.gd}
                  </td>
                  <td className="px-3 py-3 text-muted">{row.cleanSheets}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {standings.every((r) => r.played === 0) ? (
        <p className="mt-3 text-sm text-muted">
          Scores appear after the organiser logs match results.
        </p>
      ) : null}

      <h2 className="font-display mt-14 text-2xl text-chalk">Player charts</h2>
      <div className="mt-4 flex flex-wrap gap-2">
        {(
          [
            ["goals", "Goals"],
            ["cards", "Cards"],
            ["overall", "Overall"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`px-4 py-2 text-sm font-semibold uppercase tracking-[0.08em] ${
              tab === key
                ? "bg-flood text-pitch-deep"
                : "border border-line text-muted hover:text-chalk"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-4 overflow-x-auto border border-line">
        <table className="w-full min-w-[36rem] text-left text-sm">
          <thead className="border-b border-flood/30 bg-black/20 text-[0.7rem] uppercase tracking-[0.12em] text-flood">
            <tr>
              <th className="px-4 py-3">#</th>
              <th className="px-4 py-3">Player</th>
              <th className="px-4 py-3">Team</th>
              <th className="px-4 py-3">G</th>
              <th className="px-4 py-3">YC</th>
              <th className="px-4 py-3">RC</th>
              <th className="px-4 py-3">Overall</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-muted">
                  No events logged yet this month.
                </td>
              </tr>
            ) : (
              rows.map((row, i) => (
                <tr key={row.playerId} className="border-b border-line">
                  <td className="px-4 py-3 font-display text-flood">{i + 1}</td>
                  <td className="px-4 py-3 font-semibold text-chalk">
                    {row.name}
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {row.teamName ?? "—"}
                  </td>
                  <td className="px-4 py-3">{row.goals}</td>
                  <td className="px-4 py-3">{row.yc}</td>
                  <td className="px-4 py-3">{row.rc}</td>
                  <td className="px-4 py-3 text-flood-soft">{row.overall}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </AppChrome>
  );
}
