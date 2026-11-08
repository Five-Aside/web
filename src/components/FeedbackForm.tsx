"use client";

import { FormEvent, useState } from "react";
import { AppChrome } from "@/components/AppChrome";
import { useLeagueLinks } from "@/components/LeagueProvider";

export function FeedbackForm() {
  const { api } = useLeagueLinks();
  const [type, setType] = useState<"suggestion" | "complaint">("suggestion");
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [ok, setOk] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setOk(null);
    setError(null);
    try {
      const res = await fetch(api("/feedback"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, name, message }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setOk("Sent. Management will see it.");
      setMessage("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppChrome title="Suggestions & complaints">
      <p className="max-w-xl text-muted">
        Drop a suggestion or report a complaint for management. Logged-in
        profiles are linked automatically.
      </p>

      <form onSubmit={onSubmit} className="mt-8 max-w-lg space-y-5">
        <div className="flex gap-2">
          {(
            [
              ["suggestion", "Suggestion"],
              ["complaint", "Complaint"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setType(value)}
              className={`px-4 py-2 text-sm font-semibold uppercase tracking-[0.08em] ${
                type === value
                  ? "bg-flood text-pitch-deep"
                  : "border border-line text-muted"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <label className="grid gap-2 text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-muted">
          Your name (optional if logged in)
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="border border-line bg-transparent px-3 py-2.5 text-base font-normal normal-case tracking-normal text-chalk outline-none focus:border-flood"
          />
        </label>

        <label className="grid gap-2 text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-muted">
          Message
          <textarea
            required
            rows={5}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="border border-line bg-transparent px-3 py-2.5 text-base font-normal normal-case tracking-normal text-chalk outline-none focus:border-flood"
          />
        </label>

        <button
          type="submit"
          disabled={busy}
          className="bg-flood px-5 py-3 text-sm font-semibold text-pitch-deep disabled:opacity-60"
        >
          {busy ? "Sending…" : "Submit"}
        </button>
        {ok ? <p className="text-flood-soft">{ok}</p> : null}
        {error ? <p className="text-danger">{error}</p> : null}
      </form>
    </AppChrome>
  );
}
