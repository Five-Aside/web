"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { AppChrome } from "@/components/AppChrome";
import { useLeague, useLeagueLinks } from "@/components/LeagueProvider";
import { adminChatLink, contactName } from "@/lib/league-types";

export function LoginForm() {
  const router = useRouter();
  const league = useLeague();
  const { p, api } = useLeagueLinks();
  const forgotPasswordUrl = adminChatLink(
    league,
    `I forgot my ${league.name} password. My name is `,
  );
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(api("/auth/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");
      router.push(p("/me"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppChrome title="Player login">
      <p className="max-w-xl text-muted">
        Log in with the phone number on your profile to see your team, payments,
        and monthly stats.
      </p>
      <form onSubmit={onSubmit} className="mt-8 max-w-md space-y-5">
        <label className="grid gap-2 text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-muted">
          Phone
          <input
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="border border-line bg-transparent px-3 py-2.5 text-base font-normal normal-case tracking-normal text-chalk outline-none focus:border-flood"
          />
        </label>
        <label className="grid gap-2 text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-muted">
          Password
          <input
            required
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="border border-line bg-transparent px-3 py-2.5 text-base font-normal normal-case tracking-normal text-chalk outline-none focus:border-flood"
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="bg-flood px-5 py-3 text-sm font-semibold tracking-wide text-pitch-deep disabled:opacity-60"
        >
          {busy ? "Signing in…" : "Log in"}
        </button>
        {error ? <p className="text-danger">{error}</p> : null}
        <p className="text-sm text-muted">
          Forgot password?{" "}
          {forgotPasswordUrl ? (
            <a
              href={forgotPasswordUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-flood underline-offset-2 hover:underline"
            >
              WhatsApp {contactName(league)}
            </a>
          ) : (
            <>Message {contactName(league)}</>
          )}{" "}
          with your name and phone to get it reset.
        </p>
        <p className="text-sm text-muted">
          New here?{" "}
          <Link
            href={p("/register")}
            className="text-flood underline-offset-2 hover:underline"
          >
            Create a profile
          </Link>
        </p>
      </form>
    </AppChrome>
  );
}
