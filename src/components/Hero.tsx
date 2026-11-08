"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { useLeague, useLeagueLinks } from "@/components/LeagueProvider";
import { sessionLabel } from "@/lib/league-types";
import { findNextFixture, findNextSession } from "@/lib/next-match";
import {
  cycleWeeks,
  fixtureLabel,
  fixtureTime,
  fixturesForWeek,
  formatDateLabel,
  weekDate,
} from "@/lib/schedule";

type NextMatch = {
  week: number;
  match: number;
  dateLabel: string;
  time: string;
  opponentLabel: string;
} | null;

type NewsPost = {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  week: number | null;
};

type ResultRow = {
  id: string;
  week: number;
  match: number;
  homeGoals: number;
  awayGoals: number;
  status?: string;
  homeTeam: { id: string; number: number; name: string };
  awayTeam: { id: string; number: number; name: string };
};

type GoalEvent = {
  week: number;
  match: number;
  type: string;
  count: number;
  side: "home" | "away" | null;
  player: { name: string; teamId: string | null };
};

function todayYmd() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** "Arinze 2, Shabi" for one side of a result. */
function scorersFor(result: ResultRow, events: GoalEvent[], side: "home" | "away") {
  const teamId = side === "home" ? result.homeTeam.id : result.awayTeam.id;
  const tally = new Map<string, number>();
  for (const ev of events) {
    if (ev.type !== "GOAL" || ev.week !== result.week || ev.match !== result.match) continue;
    const evSide = ev.side ?? (ev.player.teamId === teamId ? side : null);
    if (evSide !== side) continue;
    tally.set(ev.player.name, (tally.get(ev.player.name) ?? 0) + ev.count);
  }
  return [...tally].map(([name, n]) => (n > 1 ? `${name} ${n}` : name)).join(", ");
}

function LiveBadge() {
  return (
    <span className="animate-pulse bg-danger px-1.5 py-0.5 text-[0.6rem] font-bold uppercase tracking-[0.12em] text-chalk">
      Live
    </span>
  );
}

const stripCardClass =
  "border border-chalk/20 bg-pitch-deep/95 px-4 py-3.5 shadow-[0_8px_24px_rgba(0,0,0,0.35)] backdrop-blur-md transition hover:border-flood/45";

export function Hero() {
  const league = useLeague();
  const { p, api } = useLeagueLinks();
  const schedule = league.schedule;
  const [loggedIn, setLoggedIn] = useState(false);
  const [nextMatch, setNextMatch] = useState<NextMatch>(null);
  const [posts, setPosts] = useState<NewsPost[]>([]);
  const [newsChecked, setNewsChecked] = useState(false);
  const [results, setResults] = useState<ResultRow[]>([]);
  const [goalEvents, setGoalEvents] = useState<GoalEvent[]>([]);
  const [tickerIndex, setTickerIndex] = useState(0);
  const playedKeys = new Set(results.map((r) => `${r.week}-${r.match}`));
  const nextFixture = findNextFixture(schedule, new Date(), playedKeys);
  const nextSession = findNextSession(schedule, new Date(), playedKeys);

  useEffect(() => {
    fetch(api("/auth/login"))
      .then((r) => r.json())
      .then(async (data) => {
        if (!data.player) return;
        setLoggedIn(true);
        try {
          const meRes = await fetch(api("/me"));
          if (!meRes.ok) return;
          const me = await meRes.json();
          if (me.nextMatch) {
            setNextMatch({
              week: me.nextMatch.week,
              match: me.nextMatch.match,
              dateLabel: me.nextMatch.dateLabel,
              time: me.nextMatch.time,
              opponentLabel: me.nextMatch.opponentLabel,
            });
          }
        } catch {
          /* ignore */
        }
      })
      .catch(() => {});

    Promise.all([fetch(api("/news?limit=12")), fetch(api("/results")), fetch(api("/events"))])
      .then(async ([nRes, rRes, eRes]) => {
        const nData = nRes.ok ? await nRes.json() : { posts: [] };
        const rData = rRes.ok ? await rRes.json() : { results: [] };
        const eData = eRes.ok ? await eRes.json() : { events: [] };
        setGoalEvents(eData.events ?? []);
        const allPosts: NewsPost[] = nData.posts ?? [];
        const latestWeek = Math.max(
          0,
          ...allPosts.map((p) => p.week ?? 0),
        );
        setPosts(
          allPosts.filter((p) => p.week === null || p.week === latestWeek),
        );
        setResults(rData.results ?? []);
      })
      .catch(() => {})
      .finally(() => setNewsChecked(true));
  }, [api]);

  const loadScores = useCallback(async () => {
    try {
      const [rRes, eRes] = await Promise.all([fetch(api("/results")), fetch(api("/events"))]);
      if (rRes.ok) setResults((await rRes.json()).results ?? []);
      if (eRes.ok) setGoalEvents((await eRes.json()).events ?? []);
    } catch {
      /* keep showing the last scores */
    }
  }, [api]);

  const hasLive = results.some((r) => r.status === "live");
  const matchdayToday = cycleWeeks(schedule.cycle).some(
    (w) => weekDate(schedule.cycle, w) === todayYmd(),
  );

  useEffect(() => {
    if (!hasLive && !matchdayToday) return;
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") void loadScores();
    }, 20000);
    return () => window.clearInterval(id);
  }, [hasLive, matchdayToday, loadScores]);

  useEffect(() => {
    if (posts.length < 2) return;
    const id = window.setInterval(() => {
      setTickerIndex((i) => (i + 1) % posts.length);
    }, 4500);
    return () => window.clearInterval(id);
  }, [posts.length]);

  const resultKey = (week: number, match: number) =>
    results.find((r) => r.week === week && r.match === match);

  const latestWeekResults = (() => {
    if (results.length === 0) return [];
    const week = Math.max(...results.map((r) => r.week));
    return results
      .filter((r) => r.week === week)
      .sort((a, b) => a.match - b.match);
  })();

  const featured = posts[tickerIndex] ?? posts[0] ?? null;
  const latestResult =
    results.find((r) => r.status === "live") ??
    [...results].sort((a, b) => b.week - a.week || b.match - a.match)[0];

  return (
    <>
      <section
        id="top"
        className="relative isolate overflow-hidden"
        aria-label={league.name}
      >
        <div className="absolute inset-0 -z-10">
          <Image
            src="/hero-pitch-night.png"
            alt="Floodlit football pitch at night"
            fill
            priority
            className="hero-kenburns object-cover object-[70%_center]"
            sizes="100vw"
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(105deg, rgba(6,21,15,0.92) 0%, rgba(6,21,15,0.72) 38%, rgba(6,21,15,0.28) 68%, rgba(6,21,15,0.12) 100%)",
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to top, rgba(6,21,15,0.88) 0%, rgba(6,21,15,0.3) 50%, rgba(6,21,15,0.5) 100%)",
            }}
          />
        </div>

        <div className="section-shell relative flex flex-col gap-6 pt-[4.75rem] pb-8 sm:gap-7 sm:pt-[5.25rem] sm:pb-10">
          <div className="hero-copy max-w-3xl">
            <p className="font-display print-ink text-[clamp(2.35rem,7.5vw,4.25rem)] leading-[0.9] tracking-[0.04em] text-chalk drop-shadow-[0_2px_14px_rgba(6,21,15,0.7)]">
              {league.name}
            </p>
            <h1 className="font-display print-accent mt-2 text-[clamp(1.55rem,4vw,2.5rem)] leading-[1.08] tracking-[0.02em] text-flood">
              Equal minutes.
              <br />
              Real competition.
            </h1>
            <p className="prose-width print-muted mt-4 max-w-md text-[clamp(0.98rem,1.8vw,1.12rem)] font-light leading-relaxed text-chalk">
              {league.tagline ||
                "A time-capped league that ends winner-stays-on and guarantees every player a proper night on the pitch."}
            </p>
            <p className="print-muted mt-2 text-sm text-chalk/75">
              {league.venue} · {sessionLabel(league)}
            </p>
            <div className="no-print mt-6 flex flex-wrap gap-3">
              {loggedIn ? (
                nextMatch ? (
                  <Link
                    href={p("/me")}
                    className="bg-flood px-5 py-3 text-sm font-semibold tracking-wide text-pitch-deep transition hover:bg-flood-soft"
                  >
                    Next · vs {nextMatch.opponentLabel} · {nextMatch.time}
                  </Link>
                ) : (
                  <Link
                    href={p("/me")}
                    className="bg-flood px-5 py-3 text-sm font-semibold tracking-wide text-pitch-deep transition hover:bg-flood-soft"
                  >
                    Open dashboard
                  </Link>
                )
              ) : (
                <Link
                  href={p("/register")}
                  className="bg-flood px-5 py-3 text-sm font-semibold tracking-wide text-pitch-deep transition hover:bg-flood-soft"
                >
                  Register to play
                </Link>
              )}
              <Link
                href={p("/news")}
                className="border border-chalk/35 bg-pitch-deep/40 px-5 py-3 text-sm font-semibold tracking-wide text-chalk backdrop-blur-[2px] transition hover:border-flood hover:text-flood"
              >
                News
              </Link>
              <Link
                href={p("/tables")}
                className="border border-chalk/35 bg-pitch-deep/40 px-5 py-3 text-sm font-semibold tracking-wide text-chalk backdrop-blur-[2px] transition hover:border-flood hover:text-flood"
              >
                League table
              </Link>
            </div>
          </div>

          {/* Rotating news + next fixture / latest result */}
          <div className="no-print grid w-full max-w-3xl grid-cols-1 gap-3 sm:grid-cols-2">
            {featured ? (
              <Link
                href={p(`/news/${featured.id}`)}
                className={`${stripCardClass} min-h-[6.5rem]`}
              >
                <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-flood">
                  {featured.pinned ? "Pinned" : "News"}
                  {posts.length > 1
                    ? ` · ${tickerIndex + 1}/${posts.length}`
                    : ""}
                </p>
                <p
                  key={featured.id}
                  className="mt-1.5 font-semibold leading-snug text-chalk transition-opacity duration-500"
                >
                  {featured.title}
                </p>
                <p className="mt-1.5 line-clamp-2 text-sm text-muted">
                  {featured.body.split("\n").find((l) => l.trim()) ?? ""}
                </p>
              </Link>
            ) : (
              <div className={stripCardClass}>
                <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-flood">
                  News
                </p>
                <p className="mt-1.5 text-sm leading-snug text-muted">
                  {newsChecked
                    ? "No news yet — check back after Matchday 1"
                    : "Loading…"}
                </p>
              </div>
            )}

            {latestResult ? (
              <Link href="#results" className={stripCardClass}>
                <p className="flex items-center gap-2 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-flood">
                  {latestResult.status === "live" ? <LiveBadge /> : null}
                  {latestResult.status === "live" ? "Now playing" : "Latest result"} · W
                  {latestResult.week} M{latestResult.match}
                </p>
                <p className="mt-1.5 font-semibold leading-snug text-chalk">
                  {latestResult.homeTeam.name}{" "}
                  <span className="text-flood">
                    {latestResult.homeGoals}–{latestResult.awayGoals}
                  </span>{" "}
                  {latestResult.awayTeam.name}
                </p>
                <p className="mt-1.5 text-sm text-muted">
                  {nextFixture
                    ? `Next: ${nextFixture.fixture} · ${nextFixture.dateLabel}`
                    : "See all results below"}
                </p>
              </Link>
            ) : nextFixture ? (
              <a href="#fixtures" className={stripCardClass}>
                <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-flood">
                  Next fixture
                </p>
                <p className="mt-1.5 font-semibold leading-snug text-chalk">
                  {nextFixture.fixture}
                </p>
                <p className="mt-1.5 text-sm text-muted">
                  {nextFixture.dateLabel} · {nextFixture.kickoff}
                </p>
              </a>
            ) : (
              <div className={stripCardClass}>
                <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-flood">
                  Fixtures
                </p>
                <p className="mt-1.5 text-sm text-muted">
                  Check back for upcoming matches.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Scrolling news ticker */}
      {posts.length > 0 ? (
        <div className="no-print overflow-hidden border-y border-line bg-black/40">
          <div className="flex items-center gap-3 px-3 py-2.5 sm:px-6">
            <Link
              href={p("/news")}
              className="shrink-0 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-flood"
            >
              News
            </Link>
            <div className="relative min-w-0 flex-1 overflow-hidden">
              <div className="news-ticker flex w-max gap-10 whitespace-nowrap text-sm text-chalk">
                {[...posts, ...posts].map((post, i) => (
                  <Link
                    key={`${post.id}-${i}`}
                    href={p(`/news/${post.id}`)}
                    className="hover:text-flood"
                  >
                    <span className="text-flood">◆</span> {post.title}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Results */}
      <section
        id="results"
        className="border-t border-line bg-pitch-deep py-10 sm:py-12"
      >
        <div className="section-shell">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-flood">
                Results
              </p>
              <h2 className="font-display mt-1 text-2xl text-chalk sm:text-3xl">
                {latestWeekResults.length
                  ? `Week ${latestWeekResults[0].week}`
                  : "No results yet"}
              </h2>
            </div>
            <Link href={p("/tables")} className="text-sm text-flood hover:underline">
              League table
            </Link>
          </div>

          {latestWeekResults.length === 0 ? (
            <p className="mt-6 text-muted">
              Scores appear here after each matchday is logged.
            </p>
          ) : (
            <ul className="mt-6 divide-y divide-line border border-line">
              {latestWeekResults.map((r) => {
                const home = scorersFor(r, goalEvents, "home");
                const away = scorersFor(r, goalEvents, "away");
                return (
                  <li key={r.id} className="px-4 py-3 text-center">
                    <p className="font-semibold text-chalk">
                      {r.status === "live" ? (
                        <>
                          <LiveBadge />{" "}
                        </>
                      ) : null}
                      {r.homeTeam.name}{" "}
                      <span className="text-flood">
                        {r.homeGoals}–{r.awayGoals}
                      </span>{" "}
                      {r.awayTeam.name}
                    </p>
                    {home || away ? (
                      <p className="mt-1 grid grid-cols-2 gap-4 text-xs text-muted">
                        <span className="text-right">{home ? `⚽ ${home}` : ""}</span>
                        <span className="text-left">{away ? `⚽ ${away}` : ""}</span>
                      </p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      {/* Fixtures */}
      <section
        id="fixtures"
        className="border-t border-line bg-pitch py-10 sm:py-12"
      >
        <div className="section-shell">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-flood">
                {nextSession ? "Next matchday" : "Fixtures"}
              </p>
              <h2 className="font-display mt-1 text-2xl text-chalk sm:text-3xl">
                {nextSession
                  ? `Week ${nextSession.week} · ${nextSession.dateLabel}`
                  : "Full cycle"}
              </h2>
            </div>
            <Link
              href={p("/rules#fixtures")}
              className="text-sm text-flood hover:underline"
            >
              Full matrix on Rules
            </Link>
          </div>

          {nextSession ? (
            <ul className="mt-6 divide-y divide-line border border-flood/60 bg-flood/[0.06] shadow-[0_0_0_1px_rgba(0,0,0,0.2)]">
              {nextSession.fixtures.map((row) => {
                const played = resultKey(nextSession.week, row.match);
                return (
                  <li
                    key={row.match}
                    className="grid grid-cols-[3rem_1fr_auto] items-center gap-3 px-4 py-3 sm:grid-cols-[4rem_8rem_1fr_auto]"
                  >
                    <span className="font-display text-lg text-flood">
                      {row.match}
                    </span>
                    <span className="hidden text-sm text-muted sm:block">
                      {row.time}
                    </span>
                    <span className="font-semibold text-chalk">
                      {row.fixture}
                    </span>
                    <span className="text-right text-sm">
                      {played ? (
                        <span className="inline-flex items-center gap-2 text-flood">
                          {played.status === "live" ? <LiveBadge /> : null}
                          {played.homeGoals}–{played.awayGoals}
                        </span>
                      ) : (
                        <span className="text-muted sm:hidden">{row.time}</span>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-6 text-muted">
              No upcoming matchday left in this cycle.
            </p>
          )}

          <div className="mt-10">
            <h3 className="font-display text-xl text-chalk">All weeks</h3>
            <div className="mt-4 grid gap-6 md:grid-cols-2">
              {cycleWeeks(schedule.cycle).map((week) => {
                const isNext = nextSession?.week === week;
                return (
                <div
                  key={week}
                  className={
                    isNext
                      ? "border border-flood/70 bg-flood/[0.06]"
                      : "border border-line"
                  }
                >
                  <div className="flex items-center justify-between gap-3 border-b border-flood/30 bg-black/20 px-4 py-2.5">
                    <p className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-flood">
                      Week {week} · {formatDateLabel(weekDate(schedule.cycle, week), false)}
                    </p>
                    {isNext ? (
                      <span className="bg-flood px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-[0.12em] text-pitch-deep">
                        Next up
                      </span>
                    ) : null}
                  </div>
                  <ul className="divide-y divide-line">
                    {fixturesForWeek(schedule, week).map((row) => {
                      const played = resultKey(week, row.match);
                      return (
                        <li
                          key={row.match}
                          className="flex items-baseline justify-between gap-3 px-4 py-2.5 text-sm"
                        >
                          <span className="text-chalk">
                            <span className="text-flood">{row.match}.</span>{" "}
                            {fixtureLabel(row, schedule.teamNames)}
                          </span>
                          <span className="shrink-0 text-muted">
                            {played
                              ? `${played.homeGoals}–${played.awayGoals}`
                              : fixtureTime(row)}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
