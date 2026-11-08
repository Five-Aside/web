"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function PlatformLogin({ platformName }: { platformName: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/platform/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setBusy(false);
    if (!res.ok) {
      setError("Wrong password");
      return;
    }
    setPassword("");
    router.refresh();
  }

  return (
    <main className="section-shell py-16">
      <p className="font-display text-xl tracking-[0.12em] text-flood">{platformName}</p>
      <h1 className="font-display mt-8 text-3xl text-chalk">Platform admin</h1>
      <form onSubmit={onSubmit} className="mt-8 max-w-sm space-y-4">
        <label className="grid gap-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-muted">
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="select-field border border-line bg-pitch-lift px-3 py-2 text-sm normal-case tracking-normal text-chalk outline-none focus:border-flood"
            required
            autoFocus
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="bg-flood px-4 py-2.5 text-sm font-semibold text-pitch-deep disabled:opacity-60"
        >
          {busy ? "Checking…" : "Sign in"}
        </button>
        {error ? <p className="text-danger">{error}</p> : null}
      </form>
    </main>
  );
}
