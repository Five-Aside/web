import { SectionHeading } from "@/components/SectionHeading";

const labelClass =
  "text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-muted";

const inputClass =
  "w-full border border-line bg-transparent px-3 py-2.5 text-base text-chalk outline-none placeholder:text-muted/45 focus:border-flood";

const areaClass =
  "w-full resize-y border border-line bg-transparent px-3 py-2.5 text-base leading-relaxed text-chalk outline-none placeholder:text-muted/45 focus:border-flood match-log-area";

export function MatchLogSection({ matches: count, weeks }: { matches: number; weeks: number }) {
  const matches = Array.from({ length: Math.max(1, count) }, (_, i) => i + 1);
  return (
    <section id="log" className="border-t border-line py-16 sm:py-24">
      <div className="section-shell">
        <div className="match-log-intro">
          <SectionHeading
            eyebrow="08 — Match Day Log"
            title="Printable session sheet"
            lede="Filled by the resting officiating panel. Hand to management after the session. Print fits 3 matches per page."
          />

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <label className={`grid gap-2 ${labelClass}`}>
              Date
              <input
                type="text"
                name="session-date"
                placeholder="DD / MM / YYYY"
                className={inputClass}
              />
            </label>
            <label className={`grid gap-2 ${labelClass}`}>
              Week
              <input
                type="text"
                name="session-week"
                placeholder={`1–${weeks}`}
                className={inputClass}
              />
            </label>
            <label className={`grid gap-2 ${labelClass}`}>
              Panel
              <input
                type="text"
                name="session-panel"
                placeholder="Names"
                className={inputClass}
              />
            </label>
          </div>
        </div>

        <div className="match-log-sheets mt-8">
          {matches.map((match) => (
            <article
              key={match}
              className={`match-block border border-line p-4 sm:p-5 ${
                match % 3 === 0 ? "match-block-page-end" : ""
              }`}
            >
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h3 className="font-display print-accent text-2xl tracking-[0.04em] text-flood sm:text-3xl">
                  Match {match}
                </h3>
              </div>

              <div className="grid gap-4 sm:grid-cols-[8rem_1fr]">
                <label className={`grid gap-2 ${labelClass}`}>
                  Score
                  <input
                    type="text"
                    aria-label={`Match ${match} score`}
                    placeholder="2 – 1"
                    className={inputClass}
                  />
                </label>
                <label className={`grid gap-2 ${labelClass}`}>
                  MVP
                  <input
                    type="text"
                    aria-label={`Match ${match} MVP`}
                    placeholder="Player name"
                    className={inputClass}
                  />
                </label>
              </div>

              <label className={`mt-4 grid gap-2 ${labelClass}`}>
                Goal scorers
                <textarea
                  rows={4}
                  aria-label={`Match ${match} scorers`}
                  placeholder={"Name — Team\nName — Team"}
                  className={`${areaClass} match-log-area-tall`}
                />
              </label>

              <label className={`mt-4 grid gap-2 ${labelClass}`}>
                Cards
                <textarea
                  rows={3}
                  aria-label={`Match ${match} cards`}
                  placeholder={"YC — Player — Team — ₦500\nRC — Player — Team — ₦1,000"}
                  className={`${areaClass} match-log-area-cards`}
                />
              </label>
            </article>
          ))}
        </div>

        <label
          className={`match-log-notes mt-8 grid gap-2 ${labelClass}`}
        >
          Session notes & disciplinary defaults
          <textarea
            rows={4}
            placeholder="Write anything the panel needs management to see…"
            className={`${areaClass} font-normal normal-case tracking-normal`}
          />
        </label>
      </div>
    </section>
  );
}
