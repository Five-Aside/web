"use client";

import { FormEvent, useState } from "react";

const field =
  "border border-line bg-pitch-lift px-3 py-2.5 text-base text-chalk outline-none placeholder:text-muted/50 focus:border-flood";
const label = "grid gap-1.5 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-muted";

export function RequestLeagueForm() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    setBusy(true);
    setError(null);
    const res = await fetch("/api/platform/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const body = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(body.error || "Something went wrong — please try again.");
      return;
    }
    form.reset();
    setSent(true);
  }

  if (sent) {
    return (
      <div className="border border-flood/40 bg-black/20 px-5 py-6">
        <p className="font-display text-2xl text-flood">Request received</p>
        <p className="mt-2 text-muted">
          Thanks — we&apos;ll message you on WhatsApp to set up your league.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
      <label className={label}>
        League / group name
        <input name="leagueName" required maxLength={120} className={field} placeholder="Friday Five-a-side" />
      </label>
      <label className={label}>
        Your name
        <input name="contactName" required maxLength={120} className={field} />
      </label>
      <label className={label}>
        WhatsApp number
        <input name="phone" required maxLength={30} inputMode="tel" className={field} placeholder="080…" />
      </label>
      <label className={label}>
        Email (optional)
        <input name="email" type="email" maxLength={200} className={field} />
      </label>
      <label className={label}>
        City
        <input name="city" maxLength={120} className={field} />
      </label>
      <label className={label}>
        Players per week (roughly)
        <input name="playerCount" type="number" min={1} max={500} className={field} />
      </label>
      <label className={`${label} sm:col-span-2`}>
        Pitch / venue
        <input name="venue" maxLength={200} className={field} />
      </label>
      <label className={`${label} sm:col-span-2`}>
        Anything else?
        <textarea
          name="message"
          rows={3}
          maxLength={2000}
          className={`${field} resize-y`}
          placeholder="Day and time you play, how you run it today…"
        />
      </label>
      <input
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute left-[-9999px] h-0 w-0 opacity-0"
      />
      <div className="sm:col-span-2 flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={busy}
          className="bg-flood px-6 py-3 text-sm font-semibold tracking-wide text-pitch-deep transition hover:bg-flood-soft disabled:opacity-60"
        >
          {busy ? "Sending…" : "Request a league"}
        </button>
        {error ? <p className="text-danger">{error}</p> : null}
      </div>
    </form>
  );
}
