import { SectionHeading } from "@/components/SectionHeading";
import type { LeagueContent } from "@/data/league-content";

export function PitchRulesSection({ content }: { content: LeagueContent }) {
  const { pitchRules } = content;
  return (
    <section id="pitch-rules" className="border-t border-line py-16 sm:py-24">
      <div className="section-shell">
        <SectionHeading
          eyebrow="Laws of the Game"
          title="Pitch rules — non-negotiable"
          lede="Same league framework as before. These match laws are re-emphasised so every night runs clean and fair."
        />

        <ol className="mt-10 space-y-0 border-t border-line">
          {pitchRules.map((rule, index) => (
            <li
              key={rule.title}
              className="grid gap-2 border-b border-line py-5 sm:grid-cols-[3.5rem_minmax(0,14rem)_1fr] sm:items-start sm:gap-6"
            >
              <span className="font-display print-accent text-2xl tracking-[0.04em] text-flood">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3 className="font-display print-ink text-xl tracking-[0.03em] text-chalk sm:text-2xl">
                {rule.title}
              </h3>
              <p className="print-muted text-[0.95rem] leading-relaxed text-muted sm:pt-1">
                {rule.copy}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
