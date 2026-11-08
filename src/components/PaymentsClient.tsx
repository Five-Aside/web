"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppChrome, formatNaira } from "@/components/AppChrome";
import { PaymentProofBox } from "@/components/PaymentProofBox";
import { useLeague, useLeagueLinks } from "@/components/LeagueProvider";
import { paymentTypeLabel } from "@/lib/league-db";

type PaymentRow = {
  id: string;
  type: string;
  amount: number;
  note: string | null;
  paidAt: string;
  status?: string;
  player: { name: string; seat: string };
};

type SummaryRow = {
  playerId: string;
  name: string;
  total: number;
  seat: string;
  remaining: number;
  overpaid?: number;
  isInstalment: boolean;
  isPaid?: boolean;
  claim?: { id: string; amount: number; type: string } | null;
};

type WalkIn = {
  id: string;
  name: string;
  amount: number;
  note: string | null;
  paidAt: string;
};

export function PaymentsClient() {
  const league = useLeague();
  const { p, api } = useLeagueLinks();
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [summary, setSummary] = useState<SummaryRow[]>([]);
  const [walkIns, setWalkIns] = useState<WalkIn[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([fetch(api("/payments")), fetch(api("/walk-ins"))])
      .then(async ([pRes, wRes]) => {
        const pData = await pRes.json();
        const wData = await wRes.json();
        setPayments(pData.payments ?? []);
        setSummary(pData.summary ?? []);
        setWalkIns(wData.walkIns ?? []);
      })
      .catch(() => setError("Could not load payments"));
  }, [api]);

  const confirmedLog = payments.filter((pay) => pay.status !== "claimed");

  return (
    <AppChrome title="Payments">
      <p className="text-muted">
        Who owes what and who&apos;s paid for{" "}
        <span className="text-chalk">{league.schedule.cycle.label}</span>. Send proof on
        WhatsApp, then mark <span className="text-chalk">I&apos;ve paid</span>{" "}
        on your dashboard so the organiser can confirm.
      </p>

      <PaymentProofBox className="mt-6" />

      {error ? <p className="mt-6 text-danger">{error}</p> : null}

      <h2 className="font-display mt-10 text-2xl text-chalk">
        Registered players
      </h2>
      <div className="mt-4 overflow-x-auto border border-line">
        <table className="w-full min-w-[36rem] text-left text-sm">
          <thead className="border-b border-flood/30 bg-black/20 text-[0.7rem] uppercase tracking-[0.12em] text-flood">
            <tr>
              <th className="px-4 py-3">Player</th>
              <th className="px-4 py-3">Paid</th>
              <th className="px-4 py-3">Still owing</th>
            </tr>
          </thead>
          <tbody>
            {summary.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-muted">
                  No registered payments yet — the organiser marks players paid after
                  they register.
                </td>
              </tr>
            ) : (
              summary.map((row) => (
                <tr key={row.playerId} className="border-b border-line">
                  <td className="px-4 py-3 font-semibold text-chalk">
                    <Link
                      href={p(`/players/${row.playerId}`)}
                      className="hover:text-flood"
                    >
                      {row.name}
                    </Link>
                    {row.isPaid ? (
                      <span className="ml-2 text-xs text-flood">paid</span>
                    ) : row.claim ? (
                      <span className="ml-2 text-xs text-flood-soft">
                        awaiting confirmation
                      </span>
                    ) : row.isInstalment ? (
                      <span className="ml-2 text-xs text-flood">partial</span>
                    ) : (
                      <span className="ml-2 text-xs text-muted">unpaid</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-flood">
                    {formatNaira(row.total)}
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {row.overpaid && row.overpaid > 0
                      ? `Over by ${formatNaira(row.overpaid)}`
                      : row.remaining > 0
                        ? formatNaira(row.remaining)
                        : "Cleared"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <h2 className="font-display mt-10 text-2xl text-chalk">
        On-field / unregistered
      </h2>
      <p className="mt-2 text-sm text-muted">
        Cash paid by people who have not registered yet.
      </p>
      <ul className="mt-4 border-t border-line">
        {walkIns.length === 0 ? (
          <li className="py-4 text-muted">None logged.</li>
        ) : (
          walkIns.map((w) => (
            <li
              key={w.id}
              className="flex justify-between gap-3 border-b border-line py-3 text-sm"
            >
              <span className="text-chalk">
                {w.name}
                {w.note ? (
                  <span className="text-muted"> · {w.note}</span>
                ) : null}
              </span>
              <span className="text-flood">{formatNaira(w.amount)}</span>
            </li>
          ))
        )}
      </ul>

      <h2 className="font-display mt-10 text-2xl text-chalk">Payment log</h2>
      <div className="mt-4 overflow-x-auto border border-line">
        <table className="w-full min-w-[40rem] text-left text-sm">
          <thead className="border-b border-flood/30 bg-black/20 text-[0.7rem] uppercase tracking-[0.12em] text-flood">
            <tr>
              <th className="px-4 py-3">Player</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Note</th>
              <th className="px-4 py-3">Paid</th>
            </tr>
          </thead>
          <tbody>
            {confirmedLog.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-muted">
                  Empty until the organiser confirms payments.
                </td>
              </tr>
            ) : (
              confirmedLog.map((pay) => (
                <tr key={pay.id} className="border-b border-line">
                  <td className="px-4 py-3 font-semibold text-chalk">
                    {pay.player.name}
                  </td>
                  <td className="px-4 py-3 text-muted">{paymentTypeLabel(pay.type)}</td>
                  <td className="px-4 py-3 text-flood">
                    {formatNaira(pay.amount)}
                  </td>
                  <td className="px-4 py-3 text-muted">{pay.note ?? "—"}</td>
                  <td className="px-4 py-3 text-muted">
                    {new Date(pay.paidAt).toLocaleDateString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </AppChrome>
  );
}
