"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppChrome } from "@/components/AppChrome";
import { useLeagueLinks } from "@/components/LeagueProvider";
import { PlayerAvatar } from "@/components/PlayerAvatar";

type PlayerRow = {
  id: string;
  name: string;
  status: string;
  photoPath?: string | null;
  overall?: number;
  team: { name: string } | null;
};

export function PlayersClient() {
  const { p, api } = useLeagueLinks();
  const [q, setQ] = useState("");
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      fetch(api(`/players?${params.toString()}`))
        .then((r) => r.json())
        .then(setPlayers)
        .catch(() => setError("Could not load players"));
    }, 200);
    return () => clearTimeout(timer);
  }, [q, api]);

  return (
    <AppChrome title="Players">
      <p className="max-w-xl text-muted">
        Search the squad by name. Profiles become active after organiser
        verification.
      </p>

      <label className="mt-6 grid max-w-md gap-2 text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-muted">
        Search
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Name"
          className="border border-line bg-transparent px-3 py-2.5 text-base font-normal normal-case tracking-normal text-chalk outline-none focus:border-flood"
        />
      </label>

      {error ? <p className="mt-6 text-danger">{error}</p> : null}

      <div className="mt-6 overflow-x-auto border border-line">
        <table className="w-full min-w-[40rem] text-left text-sm">
          <thead className="border-b border-flood/30 bg-black/20 text-[0.7rem] uppercase tracking-[0.12em] text-flood">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">OVR</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Team</th>
            </tr>
          </thead>
          <tbody>
            {players.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-muted">
                  No players found.
                </td>
              </tr>
            ) : (
              players.map((pl) => (
                <tr key={pl.id} className="border-b border-line">
                  <td className="px-4 py-3 font-semibold text-chalk">
                    <Link
                      href={p(`/players/${pl.id}`)}
                      className="inline-flex items-center gap-3 hover:text-flood"
                    >
                      <PlayerAvatar
                        id={pl.id}
                        name={pl.name}
                        photoPath={pl.photoPath}
                      />
                      {pl.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-flood">
                    {pl.overall && pl.overall > 0 ? pl.overall : "—"}
                  </td>
                  <td className="px-4 py-3 capitalize text-muted">{pl.status}</td>
                  <td className="px-4 py-3 text-muted">
                    {pl.team?.name ?? "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-6 text-sm text-muted">
        Your own record lives on{" "}
        <Link href={p("/me")} className="text-flood hover:underline">
          My profile
        </Link>
        .
      </p>
    </AppChrome>
  );
}
