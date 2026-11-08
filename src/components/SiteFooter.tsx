export function SiteFooter({ leagueName }: { leagueName: string }) {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-line bg-pitch-deep py-6 text-center">
      <div className="section-shell">
        <p className="text-xs tracking-[0.04em] text-muted">
          {leagueName} · League system & disciplinary framework
        </p>
        <p className="mt-1.5 text-xs text-muted/80">
          Internal squad review · Living document · © {year}
        </p>
      </div>
    </footer>
  );
}
