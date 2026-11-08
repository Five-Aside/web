import { SectionHeading } from "@/components/SectionHeading";
import type { LeagueContent } from "@/data/league-content";

export function RulesSection({ content }: { content: LeagueContent }) {
  const { awards, fines, redCardRules, yellowAccumulation } = content;
  return (
    <section id="rules" className="border-t border-line py-16 sm:py-24">
      <div className="section-shell">
        <SectionHeading
          eyebrow="05 — Disciplinary Code"
          title="Cards, fines, and consequences"
          lede="Fines are in Nigerian Naira (₦) and settle through the squad purse. Yellows accumulate across the month. Reds carry automatic suspensions. All fines are capped at ₦5,000."
        />

        <div className="mt-10 overflow-hidden border border-line">
          <div className="grid grid-cols-[1fr_1.4fr_auto] gap-0 border-b border-flood/30 bg-black/20 px-4 py-3 text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-flood sm:px-5">
            <span>Infraction</span>
            <span>Match consequence</span>
            <span className="text-right">Fine (Naira)</span>
          </div>
          {fines.map((fine) => (
            <div
              key={fine.infraction}
              className="grid grid-cols-1 gap-2 border-b border-line px-4 py-5 last:border-b-0 sm:grid-cols-[1fr_1.4fr_auto] sm:items-start sm:gap-4 sm:px-5"
            >
              <p className="print-ink font-semibold text-chalk">{fine.infraction}</p>
              <p className="print-muted text-[0.95rem] leading-relaxed text-muted">
                {fine.consequence}
              </p>
              <p className="font-display print-accent text-2xl tracking-[0.04em] text-flood sm:text-right">
                {fine.amount}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-14 grid gap-12 border-t border-line pt-12 lg:grid-cols-2 lg:gap-14">
          <div>
            <h3 className="font-display print-ink text-2xl tracking-[0.03em] text-chalk">
              Yellow card accumulation
            </h3>
            <ul className="mt-5 space-y-0 border-t border-line">
              {yellowAccumulation.map((rule) => (
                <li key={rule.title} className="border-b border-line py-4">
                  <p className="print-ink font-semibold text-chalk">{rule.title}</p>
                  <p className="print-muted mt-1.5 text-[0.95rem] leading-relaxed text-muted">
                    {rule.copy}
                  </p>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-display print-ink text-2xl tracking-[0.03em] text-chalk">
              Red card rules
            </h3>
            <ul className="mt-5 space-y-0 border-t border-line">
              {redCardRules.map((rule) => (
                <li key={rule.title} className="border-b border-line py-4">
                  <p className="print-ink font-semibold text-chalk">{rule.title}</p>
                  <p className="print-muted mt-1.5 text-[0.95rem] leading-relaxed text-muted">
                    {rule.copy}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-8 max-w-2xl space-y-4 border-t border-danger/40 pt-5">
          <p className="print-muted text-base leading-relaxed text-chalk/90">
            <strong className="font-semibold text-chalk">Fine cap:</strong> No
            single disciplinary fine exceeds{" "}
            <strong className="font-semibold text-chalk">₦5,000</strong>.
          </p>
          <p className="print-muted text-base leading-relaxed text-chalk/90">
            Unpaid fines before the next matchday: player suspended from all
            play, and their team takes an immediate{" "}
            <strong className="font-semibold text-chalk">3-point deduction</strong>
            . No exceptions.
          </p>
        </div>

        <div id="awards" className="mt-16 border-t border-line pt-14 sm:mt-20 sm:pt-16">
          <SectionHeading
            eyebrow="06 — Monthly Accolades"
            title="Titles worth chasing"
          />
          <div className="mt-10 grid gap-8 border-t border-line pt-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-0">
            {awards.map((award, index) => (
              <article
                key={award.name}
                className={`lg:px-5 ${index === 0 ? "lg:pl-0" : "lg:border-l lg:border-line"} ${index === awards.length - 1 ? "lg:pr-0" : ""}`}
              >
                <h3 className="font-display print-ink text-2xl tracking-[0.03em] text-chalk">
                  {award.name}
                </h3>
                <p className="print-muted mt-2 text-[0.95rem] leading-relaxed text-muted">
                  {award.copy}
                </p>
              </article>
            ))}
          </div>
          <p className="print-muted mt-8 max-w-2xl text-sm leading-relaxed text-muted">
            Awards are for bragging rights first. Cash or tokens only happen if
            the squad purse ends the month in surplus — never assumed.
          </p>
        </div>
      </div>
    </section>
  );
}
