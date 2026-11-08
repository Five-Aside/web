import { NextResponse } from "next/server";
import { requireOrganiser } from "@/lib/auth";
import { jsonError, leagueRoute } from "@/lib/league-api";
import { prisma } from "@/lib/prisma";

/** Purse: all-time income and spending for the league. */
export const GET = leagueRoute(async (_request, { league }) => {
  const leagueId = league.id;
  const [payments, expenses, ledger, walkIns] = await Promise.all([
    prisma.payment.findMany({
      where: { status: "confirmed", player: { leagueId } },
      select: { id: true, amount: true, type: true, paidAt: true, cycleId: true },
      orderBy: { paidAt: "desc" },
    }),
    prisma.expense.findMany({ where: { leagueId }, orderBy: { spentAt: "desc" } }),
    prisma.purseLedger.findMany({ where: { leagueId }, orderBy: { createdAt: "desc" } }),
    prisma.walkInPayment.findMany({ where: { leagueId }, orderBy: { paidAt: "desc" } }),
  ]);

  const feesIn = payments.reduce((sum, p) => sum + p.amount, 0);
  const walkInIn = walkIns.reduce((sum, p) => sum + p.amount, 0);
  const ledgerIn = ledger.reduce((sum, e) => sum + e.amount, 0);
  const spent = expenses.reduce((sum, e) => sum + e.amount, 0);
  const income = feesIn + ledgerIn + walkInIn;

  return NextResponse.json({
    income,
    feesIn,
    walkInIn,
    ledgerIn,
    spent,
    balance: income - spent,
    payments,
    expenses,
    ledger,
    walkIns,
  });
});

export const POST = leagueRoute(async (request, { league }) => {
  await requireOrganiser(league);

  const body = (await request.json()) as {
    title?: string;
    amount?: number;
    note?: string;
    spentAt?: string;
    kind?: "expense" | "ledger";
    ledgerKind?: string;
  };

  if (body.kind === "ledger") {
    if (!body.title?.trim() || body.amount === undefined) {
      return jsonError("title and amount required", 400);
    }
    const entry = await prisma.purseLedger.create({
      data: {
        leagueId: league.id,
        kind: body.ledgerKind || "ADJUSTMENT",
        title: body.title.trim(),
        amount: Math.round(body.amount),
        note: body.note?.trim() || null,
      },
    });
    return NextResponse.json(entry, { status: 201 });
  }

  if (!body.title?.trim() || !body.amount || body.amount <= 0) {
    return jsonError("title and positive amount required", 400);
  }

  const expense = await prisma.expense.create({
    data: {
      leagueId: league.id,
      title: body.title.trim(),
      amount: Math.round(body.amount),
      note: body.note?.trim() || null,
      spentAt: body.spentAt ? new Date(body.spentAt) : new Date(),
    },
  });
  return NextResponse.json(expense, { status: 201 });
});

export const DELETE = leagueRoute(async (request, { league }) => {
  await requireOrganiser(league);
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const kind = searchParams.get("kind") || "expense";
  if (!id) return jsonError("id required", 400);

  const where = { id, leagueId: league.id };
  const { count } =
    kind === "ledger"
      ? await prisma.purseLedger.deleteMany({ where })
      : await prisma.expense.deleteMany({ where });
  if (count === 0) return jsonError("Not found", 404);
  return NextResponse.json({ ok: true });
});
