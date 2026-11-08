"use client";

import { useEffect, useState } from "react";
import { useLeague, useLeagueLinks } from "@/components/LeagueProvider";
import { SectionHeading } from "@/components/SectionHeading";
import { findNextSession } from "@/lib/next-match";
import {
  cycleWeeks,
  fixtureLabel,
  fixtureTime,
  fixturesForWeek,
  formatDateLabel,
  maxMatchesPerWeek,
  officialsLabel,
  weekDate,
  type FixtureRow,
  type Schedule,
} from "@/lib/schedule";

const NUMBER_WORDS = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve"];

function FixtureRows({
  schedule,
  fixtures,
  week,
}: {
  schedule: Schedule;
  fixtures: FixtureRow[];
  week: number;
}) {
  const dateLabel = formatDateLabel(weekDate(schedule.cycle, week));
  const names = schedule.teamNames;

  if (fixtures.length === 0) {
    return <p className="border border-line px-5 py-6 text-sm text-muted">No fixtures set for this week yet.</p>;
  }

  return (
    <div>
      {/* Mobile cards — hidden when printing (use table grid below) */}
      <ul className="space-y-3 sm:hidden print:hidden">
        {fixtures.map((row) => (
          <li key={row.match} className="border border-line px-4 py-4">
            <div className="flex items-baseline justify-between gap-3">
              <span className="font-display text-xl text-flood">Match {row.match}</span>
              <span className="text-sm text-muted">{fixtureTime(row)}</span>
            </div>
            <p className="mt-2 font-semibold text-chalk">{fixtureLabel(row, names)}</p>
            <p className="mt-1 text-sm text-muted">Panel: {officialsLabel(row, names)}</p>
            <p className="mt-1 text-xs text-muted">{dateLabel}</p>
          </li>
        ))}
      </ul>

      {/* Desktop / print table-like grid */}
      <div className="hidden border border-line sm:block print:block">
        <div className="grid grid-cols-[3.5rem_7.5rem_1fr_8rem] gap-4 border-b border-flood/30 bg-black/20 px-5 py-3 text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-flood">
          <span>#</span>
          <span>Time</span>
          <span>Fixture</span>
          <span>Panel</span>
        </div>
        {fixtures.map((row) => (
          <div
            key={row.match}
            className="grid grid-cols-[3.5rem_7.5rem_1fr_8rem] items-center gap-4 border-b border-line px-5 py-4 last:border-b-0"
          >
            <span className="font-display print-accent text-xl text-flood-soft">{row.match}</span>
            <p className="print-muted text-base text-muted">{fixtureTime(row)}</p>
            <p className="print-ink font-semibold text-chalk">{fixtureLabel(row, names)}</p>
            <p className="print-muted text-right text-sm text-muted">{officialsLabel(row, names)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function FixturesSection() {
  const league = useLeague();
  const { api } = useLeagueLinks();
  const schedule = league.schedule;
  const weeks = cycleWeeks(schedule.cycle);
  const [week, setWeek] = useState(1);
  const [nextWeek, setNextWeek] = useState<number | null>(null);

  useEffect(() => {
    fetch(api("/results"))
      .then((r) => (r.ok ? r.json() : { results: [] }))
      .catch(() => ({ results: [] }))
      .then((data: { results?: { week: number; match: number }[] }) => {
        const played = new Set((data.results ?? []).map((r) => `${r.week}-${r.match}`));
        const upcoming = findNextSession(schedule, new Date(), played)?.week ?? null;
        setNextWeek(upcoming);
        if (upcoming) setWeek(upcoming);
      });
  }, [api, schedule]);

  const perNight = maxMatchesPerWeek(schedule);
  const weeksWord = NUMBER_WORDS[weeks.length] ?? String(weeks.length);
  const gamesWord = (NUMBER_WORDS[perNight] ?? String(perNight)).toLowerCase();

  return (
    <section id="fixtures" className="border-t border-line py-16 sm:py-24">
      <div className="section-shell">
        <SectionHeading
          eyebrow="07 — Fixtures Matrix"
          title={`${weeksWord} weeks. ${perNight > 0 ? `${gamesWord.charAt(0).toUpperCase()}${gamesWord.slice(1)} games a night.` : ""}`}
          lede={`${schedule.cycle.label}. Matches are ${league.matchMinutes} minutes with a hard ${league.turnaroundMinutes}-minute turnaround. Be on the touchline early.`}
        />

        <div className="no-print mt-8 flex flex-wrap gap-2" role="tablist" aria-label="Fixture weeks">
          {weeks.map((w) => {
            const active = week === w;
            return (
              <button
                key={w}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setWeek(w)}
                className={`px-4 py-2.5 text-sm font-semibold uppercase tracking-[0.08em] transition ${
                  active
                    ? "bg-flood text-pitch-deep"
                    : "border border-line text-muted hover:border-chalk/35 hover:text-chalk"
                }`}
              >
                Week {w}
                {nextWeek === w ? (
                  <span className={`ml-2 text-[0.65rem] ${active ? "text-pitch-deep" : "text-flood"}`}>
                    · Next
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        <div className="no-print mt-6" role="tabpanel">
          <FixtureRows schedule={schedule} fixtures={fixturesForWeek(schedule, week)} week={week} />
        </div>

        <div className="mt-8 hidden print-show-all space-y-8 print:block">
          {weeks.map((w) => (
            <div key={w}>
              <h3 className="font-display print-ink mb-3 text-xl text-chalk">Week {w}</h3>
              <FixtureRows schedule={schedule} fixtures={fixturesForWeek(schedule, w)} week={w} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
