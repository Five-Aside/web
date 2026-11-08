"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { AppChrome } from "@/components/AppChrome";
import { PaymentProofBox } from "@/components/PaymentProofBox";
import { useLeague, useLeagueLinks } from "@/components/LeagueProvider";
import { adminChatLink, contactName } from "@/lib/league-types";
import { formatNaira } from "@/lib/schedule";

export function RegisterForm() {
  const router = useRouter();
  const league = useLeague();
  const { p, api } = useLeagueLinks();
  const verifyRegisterUrl = adminChatLink(
    league,
    `I just registered for ${league.name}. My name is `,
  );
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(api("/players"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to register");

      await fetch(api("/auth/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, password }),
      });

      setMessage(
        "Profile created. Pay into the account below, then send proof with your name on WhatsApp.",
      );
      setTimeout(() => router.push(p("/me")), 800);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppChrome title="Create your profile">
      <p className="max-w-xl text-muted">
        Create a player profile with your phone number. Pay{" "}
        <strong className="text-chalk">{formatNaira(league.monthlyFee)} / month</strong> for a
        regular seat, or{" "}
        <strong className="text-chalk">{formatNaira(league.visitorFee)} / week</strong> as a
        visitor. After you register,{" "}
        {verifyRegisterUrl ? (
          <a
            href={verifyRegisterUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-flood underline-offset-2 hover:underline"
          >
            WhatsApp {contactName(league)}
          </a>
        ) : (
          <>message {contactName(league)}</>
        )}{" "}
        so you can be verified, then send proof of payment with your full name.
      </p>

      <PaymentProofBox className="mt-6 max-w-xl" />

      <form onSubmit={onSubmit} className="mt-8 max-w-md space-y-5">
        <label className="grid gap-2 text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-muted">
          Full name
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="border border-line bg-transparent px-3 py-2.5 text-base font-normal normal-case tracking-normal text-chalk outline-none focus:border-flood"
          />
        </label>
        <label className="grid gap-2 text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-muted">
          Phone (login ID)
          <input
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="0803…"
            className="border border-line bg-transparent px-3 py-2.5 text-base font-normal normal-case tracking-normal text-chalk outline-none focus:border-flood"
          />
        </label>
        <label className="grid gap-2 text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-muted">
          Password
          <input
            required
            type="password"
            minLength={4}
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
          {busy ? "Creating…" : "Create profile"}
        </button>
        {message ? <p className="text-flood-soft">{message}</p> : null}
        {error ? <p className="text-danger">{error}</p> : null}
        <p className="text-sm text-muted">
          Already registered?{" "}
          <Link href={p("/login")} className="text-flood underline-offset-2 hover:underline">
            Log in
          </Link>
        </p>
      </form>
    </AppChrome>
  );
}
