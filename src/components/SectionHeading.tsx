type SectionHeadingProps = {
  eyebrow: string;
  title: string;
  lede?: string;
};

export function SectionHeading({ eyebrow, title, lede }: SectionHeadingProps) {
  return (
    <header className="max-w-2xl">
      <p className="print-accent text-[0.75rem] font-semibold uppercase tracking-[0.18em] text-flood">
        {eyebrow}
      </p>
      <h2 className="font-display print-ink mt-3 text-[clamp(2rem,4.5vw,3rem)] leading-[1.05] tracking-[0.02em] text-chalk">
        {title}
      </h2>
      {lede ? (
        <p className="print-muted mt-4 text-base leading-relaxed text-muted sm:text-lg">
          {lede}
        </p>
      ) : null}
    </header>
  );
}
