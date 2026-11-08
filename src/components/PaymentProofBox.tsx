"use client";

import Link from "next/link";
import { useLeague, useLeagueLinks } from "@/components/LeagueProvider";
import { contactName } from "@/lib/league-types";

/** Shared bank + WhatsApp proof instructions (Payments / Me — not Purse). */
export function PaymentProofBox({ className = "" }: { className?: string }) {
  const league = useLeague();
  const { p } = useLeagueLinks();
  const contact = contactName(league);

  return (
    <div className={`border border-flood/35 bg-black/20 px-4 py-4 ${className}`.trim()}>
      <p className="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-flood">
        Pay into
      </p>
      {league.accountNumber ? (
        <>
          <p className="mt-2 text-lg font-semibold text-chalk">{league.accountNumber}</p>
          <p className="text-muted">
            {[league.accountName, league.bankName].filter(Boolean).join(" · ")}
          </p>
        </>
      ) : (
        <p className="mt-2 text-muted">Ask {contact} for the payment details.</p>
      )}
      <p className="mt-4 text-sm text-chalk">
        After you transfer, send{" "}
        <strong className="text-flood">proof of payment with your full name</strong> to{" "}
        {league.whatsappGroupUrl ? "the WhatsApp group or " : ""}
        {contact} on WhatsApp — then tap{" "}
        <strong className="text-flood">I&apos;ve paid</strong> on your dashboard so it can be
        confirmed.
      </p>
      <ul className="mt-3 space-y-2 text-sm">
        {league.whatsappGroupUrl ? (
          <li>
            <a
              href={league.whatsappGroupUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-flood hover:underline"
            >
              Join {league.whatsappGroupName || "the WhatsApp group"}
            </a>
          </li>
        ) : null}
        {league.adminChatUrl ? (
          <li>
            <a
              href={league.adminChatUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-flood hover:underline"
            >
              WhatsApp {contact}
              {league.adminPhone ? ` · ${league.adminPhone}` : ""}
            </a>
          </li>
        ) : null}
      </ul>
      <p className="mt-3 text-xs text-muted">
        Status updates on{" "}
        <Link href={p("/me")} className="text-flood hover:underline">
          your dashboard
        </Link>{" "}
        and the{" "}
        <Link href={p("/payments")} className="text-flood hover:underline">
          payments board
        </Link>
        .
      </p>
    </div>
  );
}
