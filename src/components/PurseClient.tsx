"use client";

import { useEffect, useState } from "react";
import { AppChrome, formatNaira } from "@/components/AppChrome";
import { useLeague, useLeagueLinks } from "@/components/LeagueProvider";

type Expense = {
  id: string;
  title: string;
  amount: number;
  note: string | null;
  spentAt: string;
};

type Ledger = {
  id: string;
  kind: string;
  title: string;
  amount: number;
  note: string | null;
  createdAt: string;
};

type PursePayload = {
  income: number;
  feesIn: number;
  walkInIn?: number;
  ledgerIn: number;
  spent: number;
  balance: number;
  expenses: Expense[];
  ledger: Ledger[];
};

export function PurseClient() {
  const league = useLeague();
  const { p, api } = useLeagueLinks();
  const [data, setData] = useState<PursePayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(api("/expenses"))
      .then((r) => r.json())
      .then(setData)
      .catch(() => setError("Could not load purse"));
  }, [api]);

  return (
    <AppChrome title="Squad purse">
      <p className="max-w-xl text-muted">
        The squad&apos;s money for{" "}
        <span className="text-chalk">{league.schedule.cycle.label}</span> — confirmed
        fees + carryover − spending. For who owes what, see{" "}
        <a href={p("/payments")} className="text-flood hover:underline">
          Payments
        </a>
        .
      </p>
      {league.accountNumber ? (
        <p className="mt-3 max-w-xl text-sm text-muted">
          Bank: {league.accountNumber}
          {league.bankName ? ` (${league.bankName})` : ""}
          {league.accountName ? ` · ${league.accountName}` : ""}
        </p>
      ) : null}

      {error ? <p className="mt-6 text-danger">{error}</p> : null}

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Stat label="Carryover / ledger" value={data?.ledgerIn ?? 0} />
        <Stat label="Registered fees" value={data?.feesIn ?? 0} />
        <Stat label="On-field / walk-in" value={data?.walkInIn ?? 0} />
        <Stat label="Spent" value={data?.spent ?? 0} />
        <Stat label="Balance" value={data?.balance ?? 0} highlight />
      </div>

      <h2 className="font-display mt-12 text-2xl text-chalk">Ledger</h2>
      <ul className="mt-4 border-t border-line">
        {(data?.ledger ?? []).length === 0 ? (
          <li className="py-6 text-muted">No ledger entries.</li>
        ) : (
          data!.ledger.map((e) => (
            <li
              key={e.id}
              className="grid gap-1 border-b border-line py-4 sm:grid-cols-[1fr_auto]"
            >
              <div>
                <p className="font-semibold text-chalk">{e.title}</p>
                <p className="text-sm text-muted">
                  {e.kind}
                  {e.note ? ` · ${e.note}` : ""}
                </p>
              </div>
              <p className="font-display text-xl text-flood">
                {formatNaira(e.amount)}
              </p>
            </li>
          ))
        )}
      </ul>

      <h2 className="font-display mt-12 text-2xl text-chalk">Expenses</h2>
      <ul className="mt-4 border-t border-line">
        {(data?.expenses ?? []).length === 0 ? (
          <li className="py-6 text-muted">No expenses logged yet.</li>
        ) : (
          data!.expenses.map((e) => (
            <li
              key={e.id}
              className="grid gap-1 border-b border-line py-4 sm:grid-cols-[1fr_auto]"
            >
              <div>
                <p className="font-semibold text-chalk">{e.title}</p>
                <p className="text-sm text-muted">
                  {new Date(e.spentAt).toLocaleDateString()}
                  {e.note ? ` · ${e.note}` : ""}
                </p>
              </div>
              <p className="font-display text-xl text-flood-soft">
                −{formatNaira(e.amount)}
              </p>
            </li>
          ))
        )}
      </ul>
    </AppChrome>
  );
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div className="border border-line px-4 py-5">
      <p className="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-muted">
        {label}
      </p>
      <p
        className={`font-display mt-2 text-3xl ${highlight ? "text-chalk" : "text-flood"}`}
      >
        {formatNaira(value)}
      </p>
    </div>
  );
}
