"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLeague, useLeagueLinks } from "@/components/LeagueProvider";
import { addMinutes } from "@/lib/fixture-generator";
import { DAY_NAMES } from "@/lib/league-types";
import { addDays, cycleWeeks, formatDateLabel, weekDate, type FixtureRow } from "@/lib/schedule";

const field =
  "select-field border border-line bg-pitch-lift px-3 py-2 text-sm text-chalk outline-none focus:border-flood";
const label =
  "grid gap-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-muted";
const sectionClass = "mt-12 border-t border-line pt-8";

type LeagueSettings = {
  name: string;
  shortName: string;
  tagline: string | null;
  venue: string;
  dayOfWeek: number;
  kickoffTime: string;
  sessionMinutes: number;
  matchMinutes: number;
  turnaroundMinutes: number;
  teamCount: number;
  cycleWeeks: number;
  monthlyFee: number;
  visitorFee: number;
  bankName: string | null;
  accountNumber: string | null;
  accountName: string | null;
  whatsappGroupName: string | null;
  whatsappGroupUrl: string | null;
  adminName: string | null;
  adminPhone: string | null;
  rulesNotes: string | null;
};

type CycleRow = {
  id: string;
  key: string;
  label: string;
  startDate: string;
  weeks: number;
  isCurrent: boolean;
  _count: { results: number; fixtures: number };
};

export function LeagueSettingsClient() {
  const league = useLeague();
  const { p, api } = useLeagueLinks();
  const router = useRouter();
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [settings, setSettings] = useState<LeagueSettings | null>(null);
  const [cycles, setCycles] = useState<CycleRow[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(
    () =>
      fetch(api("/settings"))
        .then(async (res) => {
          if (res.status === 401) {
            setAuthed(false);
            return;
          }
          const data = await res.json();
          setSettings(data.league);
          setCycles(data.cycles ?? []);
          setAuthed(true);
        })
        .catch(() => setAuthed(false)),
    [api],
  );

  useEffect(() => {
    fetch(api("/settings"))
      .then((res) => (res.status === 401 ? null : res.json()))
      .then((data) => {
        if (!data) {
          setAuthed(false);
          return;
        }
        setSettings(data.league);
        setCycles(data.cycles ?? []);
        setAuthed(true);
      })
      .catch(() => setAuthed(false));
  }, [api]);

  function flash(text: string) {
    setMessage(text);
    setTimeout(() => setMessage(null), 3500);
  }

  if (authed === null) return <div className="section-shell py-16 text-muted">Loading…</div>;
  if (!authed || !settings) {
    return (
      <div className="section-shell py-16">
        <h1 className="font-display text-3xl text-chalk">League settings</h1>
        <p className="mt-3 text-muted">Organisers only.</p>
        <Link href={p("/login")} className="mt-4 inline-block text-flood hover:underline">
          Log in
        </Link>
      </div>
    );
  }

  const current = cycles.find((c) => c.isCurrent) ?? null;

  return (
    <div className="section-shell py-10 sm:py-14">
      <Link href={p("/admin")} className="text-sm text-flood hover:underline">
        ← Organiser dashboard
      </Link>
      <h1 className="font-display mt-3 text-3xl text-chalk">League settings</h1>
      <p className="mt-1 text-sm text-muted">
        {league.name} · public page{" "}
        <Link href={p()} className="text-flood hover:underline">
          /{league.slug}
        </Link>
      </p>
      {message ? (
        <p className="sticky top-2 z-10 mt-4 border border-flood/40 bg-pitch-deep px-4 py-2 text-flood-soft">
          {message}
        </p>
      ) : null}

      <SettingsForm
        settings={settings}
        onSaved={async (msg) => {
          flash(msg);
          await load();
          router.refresh();
        }}
      />

      <FixtureEditor
        key={`${league.schedule.cycle.id}-${league.schedule.fixtures.length}-${league.teamCount}`}
        hasResults={(current?._count.results ?? 0) > 0}
        onSaved={(msg) => {
          flash(msg);
          router.refresh();
          load();
        }}
      />

      <CycleSection
        cycles={cycles}
        current={current}
        onDone={async (msg) => {
          flash(msg);
          await load();
          router.refresh();
        }}
      />
    </div>
  );
}

function SettingsForm({
  settings,
  onSaved,
}: {
  settings: LeagueSettings;
  onSaved: (msg: string) => Promise<void>;
}) {
  const { api } = useLeagueLinks();
  const [form, setForm] = useState(settings);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function set<K extends keyof LeagueSettings>(key: K, value: LeagueSettings[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch(api("/settings"), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error || "Could not save");
      return;
    }
    const formatChanged =
      form.teamCount !== settings.teamCount ||
      form.kickoffTime !== settings.kickoffTime ||
      form.matchMinutes !== settings.matchMinutes ||
      form.turnaroundMinutes !== settings.turnaroundMinutes ||
      form.sessionMinutes !== settings.sessionMinutes;
    await onSaved(
      formatChanged
        ? "Saved. Format changed — regenerate or edit the fixtures below to match."
        : "Settings saved",
    );
  }

  const text = (key: keyof LeagueSettings, title: string, placeholder = "") => (
    <label className={label}>
      {title}
      <input
        className={`${field} normal-case tracking-normal`}
        value={(form[key] as string | null) ?? ""}
        placeholder={placeholder}
        onChange={(e) => set(key, e.target.value as never)}
      />
    </label>
  );
  const num = (key: keyof LeagueSettings, title: string, min: number, max: number) => (
    <label className={label}>
      {title}
      <input
        className={field}
        type="number"
        min={min}
        max={max}
        value={form[key] as number}
        onChange={(e) => set(key, Number(e.target.value) as never)}
      />
    </label>
  );

  return (
    <form onSubmit={onSubmit} className={sectionClass}>
      <h2 className="font-display text-2xl text-chalk">Details & format</h2>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {text("name", "League name")}
        {text("shortName", "Short name (logo)", "e.g. TNF")}
        {text("venue", "Venue")}
        <label className={`${label} sm:col-span-2 lg:col-span-3`}>
          Tagline
          <input
            className={`${field} normal-case tracking-normal`}
            value={form.tagline ?? ""}
            placeholder="One line shown on your home page"
            onChange={(e) => set("tagline", e.target.value)}
          />
        </label>
        <label className={label}>
          Match day
          <select
            className={field}
            value={form.dayOfWeek}
            onChange={(e) => set("dayOfWeek", Number(e.target.value))}
          >
            {DAY_NAMES.map((d, i) => (
              <option key={d} value={i}>
                {d}
              </option>
            ))}
          </select>
        </label>
        <label className={label}>
          Kick-off (24h)
          <input
            className={field}
            type="time"
            value={form.kickoffTime}
            onChange={(e) => set("kickoffTime", e.target.value)}
          />
        </label>
        {num("sessionMinutes", "Session length (min)", 20, 300)}
        {num("matchMinutes", "Match length (min)", 3, 90)}
        {num("turnaroundMinutes", "Turnaround (min)", 0, 30)}
        {num("teamCount", "Teams", 2, 12)}
        {num("cycleWeeks", "Weeks per cycle", 1, 12)}
        {num("monthlyFee", "Monthly fee (₦)", 0, 10_000_000)}
        {num("visitorFee", "Visitor fee per week (₦)", 0, 10_000_000)}
      </div>

      <h3 className="mt-8 text-sm font-semibold uppercase tracking-[0.12em] text-flood">
        Payments & contact
      </h3>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {text("bankName", "Bank")}
        {text("accountNumber", "Account number")}
        {text("accountName", "Account name")}
        {text("adminName", "Organiser name (shown to players)")}
        {text("adminPhone", "Organiser WhatsApp number", "080…")}
        {text("whatsappGroupName", "WhatsApp group name")}
        <label className={`${label} sm:col-span-2 lg:col-span-3`}>
          WhatsApp group invite link
          <input
            className={`${field} normal-case tracking-normal`}
            value={form.whatsappGroupUrl ?? ""}
            placeholder="https://chat.whatsapp.com/…"
            onChange={(e) => set("whatsappGroupUrl", e.target.value)}
          />
        </label>
      </div>

      <label className={`${label} mt-8`}>
        Organiser notes on the Rules page
        <textarea
          rows={4}
          className={`${field} normal-case tracking-normal`}
          value={form.rulesNotes ?? ""}
          placeholder="House rules, kit colours, parking — anything specific to your league"
          onChange={(e) => set("rulesNotes", e.target.value)}
        />
      </label>

      <div className="mt-6 flex items-center gap-4">
        <button
          type="submit"
          disabled={busy}
          className="bg-flood px-5 py-2.5 text-sm font-semibold text-pitch-deep disabled:opacity-60"
        >
          {busy ? "Saving…" : "Save settings"}
        </button>
        {error ? <p className="text-danger">{error}</p> : null}
      </div>
    </form>
  );
}

function FixtureEditor({
  hasResults,
  onSaved,
}: {
  hasResults: boolean;
  onSaved: (msg: string) => void;
}) {
  const league = useLeague();
  const { api } = useLeagueLinks();
  const schedule = league.schedule;
  const weeks = cycleWeeks(schedule.cycle);
  const teams = Array.from({ length: league.teamCount }, (_, i) => i + 1);
  const [rows, setRows] = useState<FixtureRow[]>(schedule.fixtures);
  const [week, setWeek] = useState(1);
  const [perNight, setPerNight] = useState("");
  const [dirty, setDirty] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const weekRows = rows.filter((r) => r.week === week).sort((a, b) => a.match - b.match);

  function update(match: number, patch: Partial<FixtureRow>) {
    setRows((all) =>
      all.map((r) => (r.week === week && r.match === match ? { ...r, ...patch } : r)),
    );
    setDirty(true);
  }

  function addMatch() {
    const last = weekRows[weekRows.length - 1];
    const match = (last?.match ?? 0) + 1;
    const startTime = last ? addMinutes(last.startTime, league.matchMinutes + league.turnaroundMinutes) : league.kickoffTime;
    setRows((all) => [
      ...all,
      {
        week,
        match,
        home: 1,
        away: Math.min(2, league.teamCount),
        startTime,
        endTime: addMinutes(startTime, league.matchMinutes),
        officials: [],
      },
    ]);
    setDirty(true);
  }

  function removeMatch(match: number) {
    setRows((all) =>
      all
        .filter((r) => !(r.week === week && r.match === match))
        .map((r) => (r.week === week && r.match > match ? { ...r, match: r.match - 1 } : r)),
    );
    setDirty(true);
  }

  async function regenerate() {
    if (
      dirty &&
      !confirm("Replace your unsaved edits with a freshly generated fixture list?")
    )
      return;
    setBusy(true);
    const res = await fetch(api("/fixtures"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(perNight ? { matchesPerNight: Number(perNight) } : {}),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setErrors([data.error || "Could not generate"]);
      return;
    }
    setRows(data.fixtures);
    setDirty(true);
    setErrors([]);
  }

  async function save() {
    setBusy(true);
    const res = await fetch(api("/fixtures"), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fixtures: rows }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setErrors(data.errors ?? [data.error || "Could not save"]);
      return;
    }
    setErrors([]);
    setDirty(false);
    onSaved(`Saved ${data.count} fixtures`);
  }

  return (
    <section className={sectionClass}>
      <h2 className="font-display text-2xl text-chalk">Fixtures · {schedule.cycle.label}</h2>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        Generate a balanced list from your format, then tweak any match. Resting teams officiate.
        {hasResults
          ? " Fixtures that already have a logged result can't change teams."
          : ""}
      </p>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className={label}>
          Matches per night
          <input
            className={`${field} w-28`}
            type="number"
            min={1}
            max={30}
            placeholder="Auto"
            value={perNight}
            onChange={(e) => setPerNight(e.target.value)}
          />
        </label>
        <button
          type="button"
          disabled={busy}
          onClick={regenerate}
          className="border border-line px-4 py-2 text-sm font-semibold text-chalk disabled:opacity-60"
        >
          Auto-generate
        </button>
        <button
          type="button"
          disabled={busy || !dirty}
          onClick={save}
          className="bg-flood px-4 py-2 text-sm font-semibold text-pitch-deep disabled:opacity-50"
        >
          {busy ? "Working…" : dirty ? "Save fixtures" : "Saved"}
        </button>
      </div>

      {errors.length > 0 ? (
        <ul className="mt-4 space-y-1 text-sm text-danger">
          {errors.slice(0, 6).map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-2">
        {weeks.map((w) => (
          <button
            key={w}
            type="button"
            onClick={() => setWeek(w)}
            className={`px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] ${
              week === w ? "bg-flood text-pitch-deep" : "border border-line text-muted"
            }`}
          >
            Week {w}
          </button>
        ))}
      </div>
      <p className="mt-3 text-sm text-muted">
        {formatDateLabel(weekDate(schedule.cycle, week))}
      </p>

      <div className="mt-3 overflow-x-auto border border-line">
        <table className="w-full min-w-[44rem] text-left text-sm">
          <thead className="border-b border-flood/30 bg-black/20 text-[0.68rem] uppercase tracking-[0.12em] text-flood">
            <tr>
              <th className="px-3 py-2">#</th>
              <th className="px-3 py-2">Start</th>
              <th className="px-3 py-2">End</th>
              <th className="px-3 py-2">Home</th>
              <th className="px-3 py-2">Away</th>
              <th className="px-3 py-2">Panel</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {weekRows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-muted">
                  No matches this week.
                </td>
              </tr>
            ) : (
              weekRows.map((row) => (
                <tr key={row.match} className="border-b border-line">
                  <td className="px-3 py-2 font-display text-lg text-flood">{row.match}</td>
                  <td className="px-3 py-2">
                    <input
                      type="time"
                      className={field}
                      value={row.startTime}
                      onChange={(e) => update(row.match, { startTime: e.target.value })}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="time"
                      className={field}
                      value={row.endTime}
                      onChange={(e) => update(row.match, { endTime: e.target.value })}
                    />
                  </td>
                  {(["home", "away"] as const).map((side) => (
                    <td key={side} className="px-3 py-2">
                      <select
                        className={field}
                        value={row[side]}
                        onChange={(e) => {
                          const value = Number(e.target.value);
                          update(row.match, {
                            [side]: value,
                            officials: row.officials.filter((t) => t !== value),
                          });
                        }}
                      >
                        {teams.map((t) => (
                          <option key={t} value={t}>
                            {schedule.teamNames[t] ?? `Team ${t}`}
                          </option>
                        ))}
                      </select>
                    </td>
                  ))}
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-2">
                      {teams
                        .filter((t) => t !== row.home && t !== row.away)
                        .map((t) => (
                          <label key={t} className="flex items-center gap-1 text-xs text-muted">
                            <input
                              type="checkbox"
                              checked={row.officials.includes(t)}
                              onChange={(e) =>
                                update(row.match, {
                                  officials: e.target.checked
                                    ? [...row.officials, t].sort((a, b) => a - b)
                                    : row.officials.filter((x) => x !== t),
                                })
                              }
                            />
                            {t}
                          </label>
                        ))}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      className="text-xs text-danger"
                      onClick={() => removeMatch(row.match)}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <button
        type="button"
        onClick={addMatch}
        className="mt-3 border border-line px-3 py-1.5 text-xs font-semibold text-muted"
      >
        + Add match to week {week}
      </button>
    </section>
  );
}

function CycleSection({
  cycles,
  current,
  onDone,
}: {
  cycles: CycleRow[];
  current: CycleRow | null;
  onDone: (msg: string) => Promise<void>;
}) {
  const league = useLeague();
  const { api } = useLeagueLinks();
  const suggested = current ? addDays(current.startDate, current.weeks * 7) : "";
  const [startDate, setStartDate] = useState(suggested);
  const [currentStart, setCurrentStart] = useState(current?.startDate ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function startNew(e: FormEvent) {
    e.preventDefault();
    if (
      !confirm(
        `Start a new ${league.cycleWeeks}-week cycle from ${formatDateLabel(startDate)}? ` +
          "Tables, stats and payments reset for the new cycle; the old cycle stays in history.",
      )
    )
      return;
    setBusy(true);
    setError(null);
    const res = await fetch(api("/cycles"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ startDate }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error || "Could not start cycle");
      return;
    }
    await onDone(`New cycle started: ${data.cycle.label}`);
  }

  async function moveCurrent(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch(api("/cycles"), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ startDate: currentStart }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error || "Could not update");
      return;
    }
    await onDone(`Current cycle now ${data.cycle.label}`);
  }

  return (
    <section className={sectionClass}>
      <h2 className="font-display text-2xl text-chalk">Cycles</h2>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        A cycle is your league &ldquo;month&rdquo;: its own table, stats, payments and fixtures.
        New cycles use the format and fees saved above.
      </p>

      <div className="mt-6 grid gap-8 lg:grid-cols-2">
        {current ? (
          <form onSubmit={moveCurrent} className="space-y-3">
            <p className="text-sm font-semibold uppercase tracking-[0.12em] text-flood">
              Current · {current.label}
            </p>
            <label className={label}>
              First matchday
              <input
                type="date"
                className={field}
                value={currentStart}
                onChange={(e) => setCurrentStart(e.target.value)}
              />
            </label>
            <button
              type="submit"
              disabled={busy || currentStart === current.startDate}
              className="border border-line px-4 py-2 text-sm font-semibold text-muted disabled:opacity-50"
            >
              Move dates
            </button>
          </form>
        ) : null}

        <form onSubmit={startNew} className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.12em] text-flood">
            Start next cycle
          </p>
          <label className={label}>
            First matchday
            <input
              type="date"
              className={field}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
          </label>
          <button
            type="submit"
            disabled={busy || !startDate}
            className="bg-flood px-4 py-2 text-sm font-semibold text-pitch-deep disabled:opacity-50"
          >
            Start new cycle
          </button>
        </form>
      </div>
      {error ? <p className="mt-4 text-danger">{error}</p> : null}

      <ul className="mt-8 border-t border-line text-sm">
        {cycles.map((c) => (
          <li key={c.id} className="flex justify-between gap-3 border-b border-line py-2.5">
            <span className="text-chalk">
              {c.label}
              {c.isCurrent ? <span className="ml-2 text-xs text-flood">current</span> : null}
            </span>
            <span className="text-muted">
              {c._count.fixtures} fixtures · {c._count.results} results
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
