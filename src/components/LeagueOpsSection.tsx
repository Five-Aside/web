import { SectionHeading } from "@/components/SectionHeading";
import type { LeagueContent } from "@/data/league-content";

export function LeagueOpsSection({ content }: { content: LeagueContent }) {
  const { fees, pointsSystem, tiebreakers, venue } = content;
  return (
    <section id="ops" className="border-t border-line py-16 sm:py-24">
      <div className="section-shell">
        <SectionHeading
          eyebrow="Venue · Fees · Table"
          title="How the month is scored"
          lede={`${venue.name} · ${venue.session}. Points, purse fees, and the official tiebreaker order. Fee income and spending are published on the Purse page.`}
        />

        <div className="mt-10 grid gap-10 border-t border-line pt-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-14">
          <div className="space-y-10">
            <div>
              <p className="print-accent text-[0.75rem] font-semibold uppercase tracking-[0.18em] text-flood">
                Venue
              </p>
              <p className="font-display print-ink mt-2 text-3xl tracking-[0.03em] text-chalk">
                {venue.name}
              </p>
              <p className="print-muted mt-2 text-muted">{venue.session}</p>
            </div>

            <div>
              <p className="print-accent text-[0.75rem] font-semibold uppercase tracking-[0.18em] text-flood">
                Session fees
              </p>
              <ul className="mt-4 space-y-4">
                {fees.map((fee) => (
                  <li key={fee.title} className="border-b border-line pb-4 last:border-b-0">
                    <div className="flex items-baseline justify-between gap-4">
                      <span className="print-ink font-semibold text-chalk">
                        {fee.title}
                      </span>
                      <span className="font-display print-accent text-2xl tracking-[0.04em] text-flood">
                        {fee.amount}
                      </span>
                    </div>
                    <p className="print-muted mt-1 text-sm text-muted">{fee.detail}</p>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="print-accent text-[0.75rem] font-semibold uppercase tracking-[0.18em] text-flood">
                Points
              </p>
              <div className="mt-4 grid grid-cols-3 gap-3">
                {pointsSystem.map((row) => (
                  <div key={row.result} className="border border-line px-3 py-4 text-center">
                    <p className="print-muted text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-muted">
                      {row.result}
                    </p>
                    <p className="font-display print-accent mt-1 text-3xl text-flood">
                      {row.points}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div>
            <p className="print-accent text-[0.75rem] font-semibold uppercase tracking-[0.18em] text-flood">
              Tiebreakers
            </p>
            <p className="print-muted mt-2 max-w-lg text-sm text-muted">
              Applied in order when teams finish level on the monthly table.
            </p>
            <ol className="mt-6 space-y-0 border-t border-line">
              {tiebreakers.map((item) => (
                <li
                  key={item.title}
                  className="grid grid-cols-[3rem_1fr] gap-3 border-b border-line py-4"
                >
                  <span className="font-display print-accent text-xl text-flood">
                    {item.rank}
                  </span>
                  <div>
                    <p className="print-ink font-semibold text-chalk">{item.title}</p>
                    <p className="print-muted mt-1 text-sm leading-relaxed text-muted">
                      {item.copy}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}
