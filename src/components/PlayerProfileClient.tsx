"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AppChrome, formatNaira } from "@/components/AppChrome";
import { useLeagueLinks } from "@/components/LeagueProvider";

type ProfilePayload = {
  player: {
    id: string;
    name: string;
    phone: string;
    status: string;
    seat: string;
    role?: string;
    photoPath: string | null;
    overall?: number;
    team: { name: string } | null;
  };
  cycleKey: string | null;
  payment: {
    paidTotal: number;
    remaining: number;
  } | null;
  attributes?: {
    overall: number;
  };
  stats: {
    goals: number;
    assists: number;
    yc: number;
    rc: number;
    overall: number;
  };
};

export function PlayerProfileClient() {
  const { p, api } = useLeagueLinks();
  const params = useParams();
  const id = String(params.id || "");
  const [data, setData] = useState<ProfilePayload | null>(null);
  const [meId, setMeId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetch(api(`/players/${id}`))
      .then(async (r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then(setData)
      .catch(() => setError("Could not load profile"));

    fetch(api("/auth/login"))
      .then((r) => r.json())
      .then((d) => setMeId(d.player?.id ?? null))
      .catch(() => {});
  }, [id, api]);

  async function onPhoto(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    setPhotoBusy(true);
    setError(null);
    try {
      const res = await fetch(api(`/players/${id}`), { method: "POST", body: fd });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Upload failed");
      }
      const player = await res.json();
      setData((prev) =>
        prev ? { ...prev, player: { ...prev.player, ...player } } : prev,
      );
      form.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setPhotoBusy(false);
    }
  }

  const canEditPhoto = meId === id;

  return (
    <AppChrome title={data?.player.name || "Player profile"}>
      {error ? <p className="mb-4 text-danger">{error}</p> : null}
      {!data && !error ? <p className="text-muted">Loading…</p> : null}

      {data ? (
        <div className="space-y-10">
          <div className="flex flex-wrap items-start gap-6">
            <div className="size-28 overflow-hidden border border-line bg-black/30">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={
                  data.player.photoPath
                    ? `/api/avatars/${data.player.id}?t=${encodeURIComponent(data.player.photoPath)}`
                    : "data:image/svg+xml," +
                      encodeURIComponent(
                        `<svg xmlns='http://www.w3.org/2000/svg' width='112' height='112'><rect fill='#0c281c' width='100%' height='100%'/><text x='50%' y='54%' fill='#9aafa2' text-anchor='middle' font-size='28'>${data.player.name.slice(0, 1)}</text></svg>`,
                      )
                }
                alt=""
                className="size-full object-cover"
              />
            </div>
            <div className="space-y-2">
              <p className="text-muted">
                {data.player.team?.name ?? "No team yet"} ·{" "}
                <span className="capitalize">{data.player.seat}</span> ·{" "}
                <span className="capitalize">{data.player.status}</span>
              </p>
              <p className="text-sm text-muted">Public profile · view only</p>
              {canEditPhoto ? (
                <form
                  onSubmit={onPhoto}
                  className="flex flex-wrap items-center gap-2 pt-2"
                >
                  <input
                    type="file"
                    name="photo"
                    accept="image/*"
                    required
                    className="text-sm text-muted"
                  />
                  <button
                    type="submit"
                    disabled={photoBusy}
                    className="bg-flood px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-pitch-deep disabled:opacity-60"
                  >
                    {photoBusy ? "Uploading…" : "Upload photo"}
                  </button>
                </form>
              ) : null}
              {meId === id ? (
                <p className="text-sm">
                  <Link href={p("/me")} className="text-flood hover:underline">
                    Open my dashboard
                  </Link>
                </p>
              ) : null}
            </div>
          </div>

          <section>
            <h2 className="font-display text-2xl text-chalk">Overall</h2>
            <div className="mt-4">
              <Stat
                label="OVR"
                value={
                  data.attributes && data.attributes.overall > 0
                    ? String(data.attributes.overall)
                    : data.player.overall && data.player.overall > 0
                      ? String(data.player.overall)
                      : "Not rated yet"
                }
              />
            </div>
          </section>

          <section>
            <h2 className="font-display text-2xl text-chalk">This cycle</h2>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {data.payment ? (
                <>
                  <Stat
                    label="Paid"
                    value={formatNaira(data.payment.paidTotal)}
                  />
                  <Stat
                    label="Still owing"
                    value={
                      data.payment.remaining > 0
                        ? formatNaira(data.payment.remaining)
                        : "Cleared"
                    }
                  />
                </>
              ) : null}
              <Stat label="Goals" value={String(data.stats.goals)} />
            </div>
          </section>

          <p className="text-sm text-muted">
            <Link href={p("/players")} className="text-flood hover:underline">
              ← All players
            </Link>
          </p>
        </div>
      ) : null}
    </AppChrome>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-line px-3 py-4">
      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-muted">
        {label}
      </p>
      <p className="mt-1 font-semibold text-chalk">{value}</p>
    </div>
  );
}
