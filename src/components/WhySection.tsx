import { SectionHeading } from "@/components/SectionHeading";
import type { LeagueContent } from "@/data/league-content";

export function WhySection({ content }: { content: LeagueContent }) {
  const { benefits, proposalStory } = content;
  const s = proposalStory;

  return (
    <section id="why" className="border-t border-line py-16 sm:py-24">
      <div className="section-shell">
        <SectionHeading eyebrow={s.eyebrow} title={s.title} lede={s.intro} />

        <div className="mt-12 grid gap-12 border-t border-line pt-12 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:gap-16">
          <div className="space-y-12">
            <Block title={s.problemTitle}>
              {s.problem.map((p) => (
                <p key={p} className="print-muted text-[0.98rem] leading-relaxed text-muted">
                  {p}
                </p>
              ))}
            </Block>

            <Block title={s.proposalTitle}>
              <ol className="space-y-4">
                {s.proposal.map((p, i) => (
                  <li
                    key={p}
                    className="grid grid-cols-[2.5rem_1fr] gap-3 text-[0.98rem] leading-relaxed"
                  >
                    <span className="font-display text-xl text-flood">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="print-muted text-muted">{p}</span>
                  </li>
                ))}
              </ol>
            </Block>

            <Block title={s.nightTitle}>
              <ul className="space-y-3">
                {s.night.map((p) => (
                  <li
                    key={p}
                    className="print-muted border-l-2 border-flood/40 pl-4 text-[0.98rem] leading-relaxed text-muted"
                  >
                    {p}
                  </li>
                ))}
              </ul>
            </Block>

            <Block title={s.cycleTitle}>
              {s.cycle.map((p) => (
                <p key={p} className="print-muted text-[0.98rem] leading-relaxed text-muted">
                  {p}
                </p>
              ))}
            </Block>

            <div className="border border-flood/35 bg-black/20 px-5 py-5">
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-flood">
                {s.askTitle}
              </p>
              <p className="print-muted mt-3 text-[0.98rem] leading-relaxed text-chalk/90">
                {s.ask}
              </p>
            </div>
          </div>

          <aside id="benefits" className="lg:border-l lg:border-line lg:pl-12">
            <p className="print-accent mb-6 text-[0.75rem] font-semibold uppercase tracking-[0.18em] text-flood">
              02 — What this fixes
            </p>
            <ul className="space-y-0">
              {benefits.map((item) => (
                <li
                  key={item.title}
                  className="border-b border-line py-5 first:pt-0 last:border-b-0 last:pb-0"
                >
                  <p className="font-display print-ink text-2xl tracking-[0.03em] text-chalk">
                    {item.title}
                  </p>
                  <p className="print-muted mt-2 max-w-md text-[0.95rem] leading-relaxed text-muted">
                    {item.copy}
                  </p>
                </li>
              ))}
            </ul>
            <p className="print-muted mt-8 text-sm text-muted">
              Detail on rosters, fees, pitch laws, fines, and fixtures continues
              in the sections below.
            </p>
          </aside>
        </div>
      </div>
    </section>
  );
}

function Block({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="font-display text-2xl tracking-[0.03em] text-chalk">
        {title}
      </h3>
      <div className="mt-4 space-y-4">{children}</div>
    </div>
  );
}
