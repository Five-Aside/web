"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppChrome, formatNaira } from "@/components/AppChrome";
import { PaymentProofBox } from "@/components/PaymentProofBox";
import { useLeague, useLeagueLinks } from "@/components/LeagueProvider";
import { paymentTypeLabel } from "@/lib/league-db";

type Dashboard = {
  cycleKey: string;
  cycleLabel: string;
  pendingProfile: boolean;
  awaitingRoster: boolean;
  player: {
    id: string;
    name: string;
    phone: string;
    status: string;
    seat: string;
    photoPath?: string | null;
    role?: string;
    overall?: number;
    team: { name: string; number: number } | null;
  };
  nextMatch: {
    week: number;
    match: number;
    dateLabel: string;
    time: string;
    fixture: string;
    opponentLabel: string;
    officiating: string;
  } | null;
  payment: {
    paidThisMonth: boolean;
    permanentPaid: boolean;
    paidTotal: number;
    remaining: number;
    seat: string;
    claim: {
      id: string;
      amount: number;
      type: string;
      paidAt: string;
    } | null;
    payments: { type: string; amount: number; paidAt: string }[];
  };
  suspension: {
    matchesRemaining: number;
    reason: string | null;
  };
  stats: {
    goals: number;
    assists: number;
    yc: number;
    rc: number;
    overall: number;
  };
  events: {
    id: string;
    type: string;
    week: number;
    match: number;
    count: number;
  }[];
};

export function MeClient() {
  const router = useRouter();
  const league = useLeague();
  const { p, api } = useLeagueLinks();
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load() {
    fetch(api("/me"))
      .then(async (r) => {
        if (r.status === 401) {
          router.push(p("/login"));
          return null;
        }
        if (!r.ok) throw new Error("Failed");
        return r.json();
      })
      .then((d) => {
        if (d) setData(d);
      })
      .catch(() => setError("Could not load dashboard"));
  }

  useEffect(() => {
    load();
  }, [router]);

  async function logout() {
    await fetch(api("/auth/login"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "logout" }),
    });
    router.push(p());
    router.refresh();
  }

  const prefAmount =
    data?.player.seat === "permanent" ? league.monthlyFee : league.visitorFee;
  const prefType = data?.player.seat === "permanent" ? "MONTHLY" : "VISITOR";

  return (
    <AppChrome title="My dashboard">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-xl text-muted">
          Cycle{" "}
          <span className="text-chalk">
            {data?.cycleLabel ?? league.schedule.cycle.label}
          </span>
          . Team, next match, stats, and payment status.
        </p>
        <button
          type="button"
          onClick={logout}
          className="border border-line px-3 py-2 text-xs font-semibold uppercase tracking-[0.1em] text-muted"
        >
          Log out
        </button>
      </div>

      {error ? <p className="mt-6 text-danger">{error}</p> : null}
      {!data && !error ? <p className="mt-8 text-muted">Loading…</p> : null}

      {data ? (
        <div className="mt-8 space-y-10">
          {data.pendingProfile ? (
            <p className="border border-flood/40 bg-black/20 px-4 py-3 text-flood-soft">
              Profile pending organiser verification. You can upload a photo and
              claim a payment, but you are not active in the league until
              approved.
            </p>
          ) : null}

          {data.awaitingRoster ? (
            <p className="border border-line px-4 py-3 text-muted">
              You are active but not drafted yet. Team and next match appear
              after Matchday 1 balancing / organiser assignment.
            </p>
          ) : null}

          <div className="flex flex-wrap items-start gap-6">
            <div className="size-24 overflow-hidden border border-line bg-black/30">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={
                  data.player.photoPath
                    ? `/api/avatars/${data.player.id}?t=${encodeURIComponent(data.player.photoPath)}`
                    : "data:image/svg+xml," +
                      encodeURIComponent(
                        `<svg xmlns='http://www.w3.org/2000/svg' width='96' height='96'><rect fill='#0c281c' width='100%' height='100%'/><text x='50%' y='54%' fill='#9aafa2' text-anchor='middle' font-size='24'>${data.player.name.slice(0, 1)}</text></svg>`,
                      )
                }
                alt=""
                className="size-full object-cover"
              />
            </div>
            <form
              className="flex flex-wrap items-center gap-2"
              onSubmit={async (e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const fd = new FormData(form);
                const res = await fetch(api(`/players/${data.player.id}`), {
                  method: "POST",
                  body: fd,
                });
                if (res.ok) {
                  load();
                  form.reset();
                }
              }}
            >
              <input
                type="file"
                name="photo"
                accept="image/*"
                required
                className="text-sm text-muted"
              />
              <button
                type="submit"
                className="bg-flood px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-pitch-deep"
              >
                Upload photo
              </button>
              <Link
                href={p(`/players/${data.player.id}`)}
                className="text-sm text-flood hover:underline"
              >
                Public profile
              </Link>
            </form>
          </div>

          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <InfoCard label="Name" value={data.player.name} />
            <InfoCard
              label="Team"
              value={
                data.player.team
                  ? `${data.player.team.name} (#${data.player.team.number})`
                  : data.awaitingRoster
                    ? "Awaiting draft"
                    : "Not assigned"
              }
            />
            <InfoCard
              label="Seat"
              value={
                data.player.seat === "permanent" ? "Regular" : "Visitor / sub"
              }
            />
            <InfoCard
              label="Overall"
              value={
                data.player.overall && data.player.overall > 0
                  ? String(data.player.overall)
                  : "Not rated yet"
              }
            />
            <InfoCard
              label="Suspension"
              value={
                data.suspension.matchesRemaining > 0
                  ? `${data.suspension.matchesRemaining}-match ban remaining${
                      data.suspension.reason
                        ? ` — ${data.suspension.reason}`
                        : ""
                    }`
                  : "Clear"
              }
            />
          </section>

          <section>
            <h2 className="font-display text-2xl text-chalk">Next match</h2>
            {data.pendingProfile || data.awaitingRoster ? (
              <p className="mt-3 text-muted">
                Available once you are verified and assigned to a team.
              </p>
            ) : data.nextMatch ? (
              <div className="mt-4 border border-line px-4 py-5">
                <p className="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-flood">
                  Week {data.nextMatch.week} · Match {data.nextMatch.match}
                </p>
                <p className="mt-2 font-display text-2xl text-chalk">
                  vs {data.nextMatch.opponentLabel}
                </p>
                <p className="mt-2 text-muted">
                  {data.nextMatch.dateLabel} · {data.nextMatch.time}
                </p>
                <p className="mt-1 text-sm text-muted">
                  {data.nextMatch.fixture} · Panel: {data.nextMatch.officiating}
                </p>
              </div>
            ) : (
              <p className="mt-3 text-muted">
                No upcoming fixtures left in this cycle for your team.
              </p>
            )}
          </section>

          <section>
            <h2 className="font-display text-2xl text-chalk">
              Stats · {data.cycleLabel}
            </h2>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="Goals" value={data.stats.goals} />
              <Stat label="YC" value={data.stats.yc} />
              <Stat label="RC" value={data.stats.rc} />
              <Stat label="Form" value={data.stats.overall} />
            </div>
          </section>

          <section>
            <h2 className="font-display text-2xl text-chalk">Payment</h2>
            {data.payment.claim ? (
              <div className="mt-3 border border-flood/40 bg-black/20 px-4 py-4">
                <p className="text-flood-soft">
                  Payment submitted — awaiting organiser confirmation (
                  {formatNaira(data.payment.claim.amount)}).
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <ClaimEditForm
                    claim={data.payment.claim}
                    defaultType={prefType}
                    onDone={load}
                  />
                  <button
                    type="button"
                    className="text-sm text-danger"
                    onClick={async () => {
                      await fetch(api(`/payments?id=${data.payment.claim!.id}`),
                        { method: "DELETE" },
                      );
                      load();
                    }}
                  >
                    Cancel claim
                  </button>
                </div>
              </div>
            ) : data.payment.permanentPaid ? (
              <p className="mt-3 text-muted">
                Paid in full ({formatNaira(data.payment.paidTotal)}) — regular
                seat.
              </p>
            ) : data.payment.paidThisMonth ? (
              <p className="mt-3 text-muted">
                Partial: {formatNaira(data.payment.paidTotal)} paid
                {data.payment.remaining
                  ? ` · ${formatNaira(data.payment.remaining)} remaining`
                  : ""}
                .
              </p>
            ) : (
              <p className="mt-3 text-muted">
                No confirmed payment yet
                {data.player.seat === "permanent"
                  ? " (marked regular — still send proof)."
                  : "."}
              </p>
            )}

            {data.player.role !== "organiser" &&
            !data.payment.permanentPaid &&
            !data.payment.claim ? (
              <div className="mt-4 space-y-4">
                <PaymentProofBox />
                <ClaimForm
                  defaultAmount={prefAmount}
                  defaultType={prefType}
                  onDone={load}
                />
              </div>
            ) : null}

            <ul className="mt-4 border-t border-line">
              {data.payment.payments.length === 0 ? (
                <li className="py-4 text-muted">No confirmed payments yet.</li>
              ) : (
                data.payment.payments.map((pay, i) => (
                  <li
                    key={`${pay.paidAt}-${i}`}
                    className="flex justify-between gap-3 border-b border-line py-3 text-sm"
                  >
                    <span className="text-chalk">{paymentTypeLabel(pay.type)}</span>
                    <span className="text-flood">
                      {formatNaira(pay.amount)} ·{" "}
                      {new Date(pay.paidAt).toLocaleDateString()}
                    </span>
                  </li>
                ))
              )}
            </ul>
          </section>

          <p className="text-sm text-muted">
            <Link href={p("/payments")} className="text-flood hover:underline">
              Payments board
            </Link>
            {" · "}
            <Link href={p("/tables")} className="text-flood hover:underline">
              Tables
            </Link>
          </p>
        </div>
      ) : null}
    </AppChrome>
  );
}

function ClaimForm({
  defaultAmount,
  defaultType,
  onDone,
}: {
  defaultAmount: number;
  defaultType: string;
  onDone: () => void;
}) {
  const league = useLeague();
  const { api } = useLeagueLinks();
  const [amount, setAmount] = useState(String(defaultAmount));
  const [type, setType] = useState(defaultType);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  return (
    <form
      className="grid max-w-lg gap-3 sm:grid-cols-[auto_7rem_auto]"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setErr(null);
        const res = await fetch(api("/payments"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "claim",
            type,
            amount: Number(amount),
          }),
        });
        const data = await res.json().catch(() => ({}));
        setBusy(false);
        if (!res.ok) {
          setErr(data.error || "Could not submit");
          return;
        }
        onDone();
      }}
    >
      <select
        className="select-field border border-line bg-pitch-lift px-3 py-2 text-sm text-chalk"
        value={type}
        onChange={(e) => {
          setType(e.target.value);
          if (e.target.value === "MONTHLY") setAmount(String(league.monthlyFee));
          if (e.target.value === "VISITOR") setAmount(String(league.visitorFee));
          if (e.target.value === "INSTALMENT")
            setAmount(String(Math.round(league.monthlyFee / 2)));
        }}
      >
        <option value="MONTHLY">Full monthly</option>
        <option value="INSTALMENT">Instalment / partial</option>
        <option value="VISITOR">Visitor</option>
      </select>
      <input
        type="number"
        min={1}
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        className="select-field border border-line bg-pitch-lift px-3 py-2 text-sm text-chalk"
        required
      />
      <button
        type="submit"
        disabled={busy}
        className="bg-flood px-4 py-2 text-sm font-semibold text-pitch-deep disabled:opacity-60"
      >
        {busy ? "Sending…" : "I've paid"}
      </button>
      {err ? <p className="sm:col-span-3 text-sm text-danger">{err}</p> : null}
    </form>
  );
}

function ClaimEditForm({
  claim,
  defaultType,
  onDone,
}: {
  claim: { id: string; amount: number; type: string };
  defaultType: string;
  onDone: () => void;
}) {
  const { api } = useLeagueLinks();
  const [amount, setAmount] = useState(String(claim.amount));
  const [type, setType] = useState(claim.type || defaultType);

  return (
    <form
      className="flex flex-wrap gap-2"
      onSubmit={async (e) => {
        e.preventDefault();
        await fetch(api("/payments"), {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: claim.id,
            amount: Number(amount),
            type,
          }),
        });
        onDone();
      }}
    >
      <select
        className="select-field border border-line bg-pitch-lift px-2 py-1.5 text-xs text-chalk"
        value={type}
        onChange={(e) => setType(e.target.value)}
      >
        <option value="MONTHLY">Full monthly</option>
        <option value="INSTALMENT">Instalment</option>
        <option value="VISITOR">Visitor</option>
      </select>
      <input
        type="number"
        min={1}
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        className="select-field w-24 border border-line bg-pitch-lift px-2 py-1.5 text-xs text-chalk"
      />
      <button
        type="submit"
        className="border border-line px-3 py-1.5 text-xs text-muted"
      >
        Update claim
      </button>
    </form>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-line px-4 py-4">
      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-muted">
        {label}
      </p>
      <p className="mt-1 font-semibold text-chalk">{value}</p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-line px-3 py-4 text-center">
      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-muted">
        {label}
      </p>
      <p className="mt-1 font-display text-2xl text-flood">{value}</p>
    </div>
  );
}
