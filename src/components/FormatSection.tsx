import { SectionHeading } from "@/components/SectionHeading";
import type { LeagueContent } from "@/data/league-content";

export function FormatSection({ content }: { content: LeagueContent }) {
  const { panelLaws, rosterRules, format } = content;
  return (
    <section id="format" className="border-t border-line py-16 sm:py-24">
      <div className="section-shell">
        <SectionHeading
          eyebrow="03 — Roster Management"
          title={format.title}
          lede={format.lede}
        />

        <div className="mt-10 grid gap-8 border-t border-line pt-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-0">
          {rosterRules.map((rule, index) => (
            <article
              key={rule.title}
              className={`lg:px-5 ${index === 0 ? "lg:pl-0" : "lg:border-l lg:border-line"} ${index === rosterRules.length - 1 ? "lg:pr-0" : ""}`}
            >
              <h3 className="font-display print-accent text-xl tracking-[0.03em] text-flood-soft">
                {rule.title}
              </h3>
              <p className="print-muted mt-3 text-[0.95rem] leading-relaxed text-muted">
                {rule.copy}
              </p>
            </article>
          ))}
        </div>

        <div id="panel" className="mt-16 border-t border-line pt-14 sm:mt-20 sm:pt-16">
          <SectionHeading
            eyebrow="04 — Officiating"
            title="Peer-led matchday panel"
            lede="Every resting team supplies 1–2 players to run the night. Four hard laws protect the data and the session — including an absolute ban on arguments with the panel."
          />

          <ol className="mt-10 grid gap-6 sm:grid-cols-2">
            {panelLaws.map((law, index) => (
              <li key={law.title} className="grid grid-cols-[auto_1fr] gap-4">
                <span className="font-display print-accent text-2xl tracking-[0.04em] text-flood">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div>
                  <p className="print-ink font-semibold text-chalk">{law.title}</p>
                  <p className="print-muted mt-1.5 text-[0.95rem] leading-relaxed text-muted">
                    {law.copy}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
