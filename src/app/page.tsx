import Image from "next/image";
import Link from "next/link";
import { RequestLeagueForm } from "@/components/platform/RequestLeagueForm";
import { sessionLabel } from "@/lib/league-types";
import { PLATFORM_NAME, PLATFORM_TAGLINE } from "@/lib/platform";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const features = [
  {
    title: "Fixtures that write themselves",
    copy: "Set your teams, match length and session time. We generate a balanced rotation — no team hogs the pitch, resting teams referee.",
  },
  {
    title: "Live table & stats",
    copy: "Results, goals and cards roll into a league table and Golden Boot race every player can check on their phone.",
  },
  {
    title: "Payments without the chasing",
    copy: "Players register, tap “I’ve paid”, and you confirm against your bank. Everyone sees who’s settled for the month.",
  },
  {
    title: "Discipline that sticks",
    copy: "Yellow and red cards trigger automatic suspensions. Fines and bans are tracked, not argued about.",
  },
  {
    title: "A transparent purse",
    copy: "Fees in, pitch hire out, balance on show. The squad trusts the money because they can see it.",
  },
  {
    title: "Your rules, your brand",
    copy: "Your league name, venue, fees and house rules on your own page — players just open the link.",
  },
];

const steps = [
  { n: "01", title: "Tell us about your game", copy: "Fill in the form below. We'll message you on WhatsApp." },
  {
    n: "02",
    title: "We set up your league",
    copy: "Teams, fixtures, fees and your organiser login — ready in a day.",
  },
  {
    n: "03",
    title: "Share the link",
    copy: "Players register, pay and follow the table. You run matchday from your phone.",
  },
];

export default async function PlatformHome() {
  const leagues = await prisma.league.findMany({
    where: { status: "active" },
    orderBy: { createdAt: "asc" },
    select: {
      slug: true,
      name: true,
      venue: true,
      dayOfWeek: true,
      kickoffTime: true,
      sessionMinutes: true,
      teamCount: true,
    },
  });

  return (
    <>
      <header className="absolute inset-x-0 top-0 z-20">
        <div className="section-shell flex h-14 items-center justify-between sm:h-16">
          <span className="font-display text-xl tracking-[0.12em] text-flood">{PLATFORM_NAME}</span>
          <a
            href="#request"
            className="bg-flood px-3 py-2 text-[0.72rem] font-semibold uppercase tracking-[0.1em] text-pitch-deep"
          >
            Request a league
          </a>
        </div>
      </header>

      <main>
        <section className="relative isolate overflow-hidden">
          <div className="absolute inset-0 -z-10">
            <Image
              src="/hero-pitch-night.png"
              alt=""
              fill
              priority
              className="object-cover object-[70%_center]"
              sizes="100vw"
            />
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(105deg, rgba(6,21,15,0.94) 0%, rgba(6,21,15,0.75) 45%, rgba(6,21,15,0.35) 100%)",
              }}
            />
          </div>
          <div className="section-shell pt-28 pb-16 sm:pt-36 sm:pb-24">
            <p className="text-[0.75rem] font-semibold uppercase tracking-[0.18em] text-flood">
              League software for weekly football
            </p>
            <h1 className="font-display mt-3 max-w-3xl text-[clamp(2.6rem,7vw,4.5rem)] leading-[0.92] tracking-[0.03em] text-chalk">
              Equal minutes. Real competition. Zero spreadsheet.
            </h1>
            <p className="mt-5 max-w-xl text-[clamp(1rem,1.8vw,1.15rem)] font-light leading-relaxed text-chalk/90">
              {PLATFORM_TAGLINE}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="#request"
                className="bg-flood px-5 py-3 text-sm font-semibold tracking-wide text-pitch-deep transition hover:bg-flood-soft"
              >
                Start a pilot
              </a>
              {leagues[0] ? (
                <Link
                  href={`/${leagues[0].slug}`}
                  className="border border-chalk/35 bg-pitch-deep/40 px-5 py-3 text-sm font-semibold tracking-wide text-chalk transition hover:border-flood hover:text-flood"
                >
                  See a live league
                </Link>
              ) : null}
            </div>
          </div>
        </section>

        <section className="border-t border-line py-16 sm:py-20">
          <div className="section-shell">
            <h2 className="font-display text-[clamp(1.8rem,4vw,2.6rem)] text-chalk">
              Everything a weekly game needs
            </h2>
            <div className="mt-10 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((f) => (
                <article key={f.title} className="border-t border-line pt-5">
                  <h3 className="font-display text-xl tracking-[0.03em] text-flood-soft">{f.title}</h3>
                  <p className="mt-2 text-[0.95rem] leading-relaxed text-muted">{f.copy}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-line bg-pitch-deep py-16 sm:py-20">
          <div className="section-shell">
            <h2 className="font-display text-[clamp(1.8rem,4vw,2.6rem)] text-chalk">How the pilot works</h2>
            <ol className="mt-10 grid gap-8 sm:grid-cols-3">
              {steps.map((s) => (
                <li key={s.n}>
                  <span className="font-display text-3xl text-flood">{s.n}</span>
                  <p className="mt-2 font-semibold text-chalk">{s.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted">{s.copy}</p>
                </li>
              ))}
            </ol>
            <p className="mt-10 max-w-2xl text-sm text-muted">
              Pilot leagues are set up by hand. Your first cycle is on us; after that we agree a simple
              flat monthly fee — no per-player charges, no card details.
            </p>
          </div>
        </section>

        {leagues.length > 0 ? (
          <section className="border-t border-line py-16 sm:py-20">
            <div className="section-shell">
              <h2 className="font-display text-[clamp(1.8rem,4vw,2.6rem)] text-chalk">Leagues on {PLATFORM_NAME}</h2>
              <ul className="mt-8 divide-y divide-line border border-line">
                {leagues.map((l) => (
                  <li key={l.slug}>
                    <Link
                      href={`/${l.slug}`}
                      className="flex flex-wrap items-baseline justify-between gap-3 px-5 py-4 transition hover:bg-black/20"
                    >
                      <span className="font-semibold text-chalk">{l.name}</span>
                      <span className="text-sm text-muted">
                        {l.venue} · {sessionLabel(l)} · {l.teamCount} teams
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        ) : null}

        <section id="request" className="border-t border-line bg-pitch-deep py-16 sm:py-20">
          <div className="section-shell max-w-3xl">
            <h2 className="font-display text-[clamp(1.8rem,4vw,2.6rem)] text-chalk">Request a league</h2>
            <p className="mt-2 text-muted">
              Tell us how your game runs today. We&apos;ll get back to you on WhatsApp.
            </p>
            <div className="mt-8">
              <RequestLeagueForm />
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line py-6 text-center text-xs text-muted">
        © {new Date().getFullYear()} {PLATFORM_NAME}
      </footer>
    </>
  );
}
