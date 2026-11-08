"use client";

export function PrintButton({ label = "Print / save as PDF" }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="no-print inline-block bg-flood px-5 py-3 text-sm font-semibold tracking-wide text-pitch-deep transition hover:bg-flood-soft"
    >
      {label}
    </button>
  );
}
