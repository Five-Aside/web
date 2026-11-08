import { NextResponse } from "next/server";
import type { Cycle } from "@prisma/client";
import { getPlayerIdFromSession, isOrganiser, requireOrganiser, requirePlayer } from "@/lib/auth";
import { cycleFromRequest, jsonError, leagueRoute, noCycle } from "@/lib/league-api";
import type { LeagueContext } from "@/lib/league-context";
import {
  defaultPaymentAmount,
  isPaymentType,
  seatForPaymentType,
  type PaymentType,
} from "@/lib/league-db";
import { prisma } from "@/lib/prisma";

async function syncSeatForPlayer(playerId: string, cycle: Pick<Cycle, "id" | "monthlyFee">) {
  const base = { playerId, cycleId: cycle.id, status: "confirmed" };
  const [total, visitorOnly, monthly] = await Promise.all([
    prisma.payment.aggregate({ where: base, _sum: { amount: true } }),
    prisma.payment.count({ where: { ...base, type: "VISITOR" } }),
    prisma.payment.count({ where: { ...base, type: { in: ["MONTHLY", "INSTALMENT"] } } }),
  ]);
  const sum = total._sum.amount || 0;

  let seat: "permanent" | "sub" = "sub";
  if (monthly > 0 && sum >= cycle.monthlyFee) seat = "permanent";
  else if (monthly > 0 && sum > 0) {
    const player = await prisma.player.findUnique({
      where: { id: playerId },
      select: { seat: true },
    });
    seat = player?.seat === "permanent" ? "permanent" : "sub";
  } else if (visitorOnly > 0) seat = "sub";

  await prisma.player.update({ where: { id: playerId }, data: { seat } });
}

/** Payment in this league, with its cycle. */
async function findLeaguePayment(lc: LeagueContext, id: string) {
  return prisma.payment.findFirst({
    where: { id, player: { leagueId: lc.league.id } },
    include: { cycle: { select: { id: true, monthlyFee: true } } },
  });
}

export const GET = leagueRoute(async (request, lc) => {
  const cycle = await cycleFromRequest(request, lc);
  if (!cycle) return NextResponse.json({ cycleKey: null, cycle: null, payments: [], summary: [] });

  const organiser = await isOrganiser(lc.league);
  const [payments, players] = await Promise.all([
    prisma.payment.findMany({
      where: { cycleId: cycle.id },
      include: {
        player: {
          select: {
            id: true,
            name: true,
            phone: organiser,
            status: true,
            seat: true,
            role: true,
            photoPath: true,
            teamId: true,
            team: true,
          },
        },
      },
      orderBy: { paidAt: "desc" },
    }),
    prisma.player.findMany({
      where: { leagueId: lc.league.id, status: "active" },
      select: { id: true, name: true, seat: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const confirmedTotals = new Map<string, number>();
  const claimedByPlayer = new Map<string, (typeof payments)[0]>();
  for (const p of payments) {
    if (p.status === "confirmed") {
      confirmedTotals.set(p.playerId, (confirmedTotals.get(p.playerId) || 0) + p.amount);
    } else if (p.status === "claimed") {
      claimedByPlayer.set(p.playerId, p);
    }
  }

  const fee = cycle.monthlyFee;
  const summary = players.map((player) => {
    const total = confirmedTotals.get(player.id) || 0;
    const claim = claimedByPlayer.get(player.id);
    return {
      playerId: player.id,
      name: player.name,
      total,
      seat: player.seat,
      remaining: Math.max(0, fee - total),
      overpaid: Math.max(0, total - fee),
      isInstalment: total > 0 && total < fee,
      isPaid: total >= fee,
      claim: claim
        ? { id: claim.id, amount: claim.amount, type: claim.type, paidAt: claim.paidAt }
        : null,
    };
  });

  summary.sort((a, b) => {
    if (a.isPaid !== b.isPaid) return a.isPaid ? -1 : 1;
    if (!!a.claim !== !!b.claim) return a.claim ? -1 : 1;
    if (a.isInstalment !== b.isInstalment) return a.isInstalment ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return NextResponse.json({
    cycleKey: cycle.key,
    cycle: {
      key: cycle.key,
      label: cycle.label,
      monthlyFee: cycle.monthlyFee,
      visitorFee: cycle.visitorFee,
    },
    payments,
    summary,
  });
});

export const POST = leagueRoute(async (request, lc) => {
  const body = (await request.json()) as {
    action?: string;
    playerId?: string;
    type?: PaymentType;
    amount?: number;
    note?: string;
    id?: string;
  };

  // Player claims "I've paid"
  if (body.action === "claim") {
    const playerId = await requirePlayer(lc.league);
    if (!lc.cycle) return noCycle();
    if (!isPaymentType(body.type)) return jsonError("Valid type required", 400);

    const amount = Math.round(Number(body.amount) || 0);
    if (!amount || amount <= 0) return jsonError("Positive amount required", 400);

    const existingClaim = await prisma.payment.findFirst({
      where: { playerId, cycleId: lc.cycle.id, status: "claimed" },
    });
    if (existingClaim) {
      return jsonError(
        "You already have a pending claim. Cancel or edit it before submitting another.",
        409,
      );
    }

    const payment = await prisma.payment.create({
      data: {
        playerId,
        cycleId: lc.cycle.id,
        type: body.type,
        amount,
        status: "claimed",
        note: body.note?.trim() || "Player claimed — awaiting organiser confirmation",
      },
    });
    return NextResponse.json(payment, { status: 201 });
  }

  if (body.action === "confirm") {
    await requireOrganiser(lc.league);
    if (!body.id) return jsonError("id required", 400);
    const existing = await findLeaguePayment(lc, body.id);
    if (!existing || existing.status !== "claimed") return jsonError("Claim not found", 404);

    const payment = await prisma.payment.update({
      where: { id: body.id },
      data: {
        status: "confirmed",
        note: existing.note?.includes("awaiting") ? "Confirmed by organiser" : existing.note,
        paidAt: new Date(),
      },
    });
    await syncSeatForPlayer(payment.playerId, existing.cycle);
    return NextResponse.json(payment);
  }

  if (body.action === "reject") {
    await requireOrganiser(lc.league);
    if (!body.id) return jsonError("id required", 400);
    const existing = await findLeaguePayment(lc, body.id);
    if (!existing || existing.status !== "claimed") return jsonError("Claim not found", 404);
    await prisma.payment.delete({ where: { id: body.id } });
    return NextResponse.json({ ok: true });
  }

  // Organiser logs a confirmed payment (default)
  await requireOrganiser(lc.league);
  if (!lc.cycle) return noCycle();
  if (!body.playerId || !isPaymentType(body.type)) {
    return jsonError("playerId and valid type required", 400);
  }

  const player = await prisma.player.findFirst({
    where: { id: body.playerId, leagueId: lc.league.id },
    select: { id: true },
  });
  if (!player) return jsonError("Unknown player", 400);

  const cycle = lc.cycle;
  let amount = defaultPaymentAmount(body.type, cycle);
  if (body.amount && body.amount > 0) amount = Math.round(Number(body.amount));
  if (!amount || amount <= 0) return jsonError("Positive amount required", 400);

  const prior = await prisma.payment.aggregate({
    where: {
      playerId: body.playerId,
      cycleId: cycle.id,
      status: "confirmed",
      type: { in: ["MONTHLY", "INSTALMENT"] },
    },
    _sum: { amount: true },
  });
  const totalAfter = (prior._sum.amount || 0) + amount;
  const seat =
    body.type === "VISITOR"
      ? "sub"
      : totalAfter >= cycle.monthlyFee
        ? "permanent"
        : seatForPaymentType(body.type, amount, cycle.monthlyFee);

  const payment = await prisma.payment.create({
    data: {
      playerId: body.playerId,
      cycleId: cycle.id,
      type: body.type,
      amount,
      status: "confirmed",
      note: body.note?.trim() || (body.type === "INSTALMENT" ? "Instalment" : null),
    },
    include: { player: { select: { id: true, name: true, seat: true } } },
  });

  await prisma.player.update({
    where: { id: body.playerId },
    data: { seat, status: "active" },
  });

  return NextResponse.json(payment, { status: 201 });
});

async function canEdit(lc: LeagueContext, payment: { playerId: string; status: string }) {
  if (await isOrganiser(lc.league)) return true;
  const sessionId = await getPlayerIdFromSession(lc.league);
  return sessionId === payment.playerId && payment.status === "claimed";
}

export const PATCH = leagueRoute(async (request, lc) => {
  const body = (await request.json()) as {
    id?: string;
    amount?: number;
    type?: PaymentType;
    note?: string | null;
  };
  if (!body.id) return jsonError("id required", 400);

  const existing = await findLeaguePayment(lc, body.id);
  if (!existing) return jsonError("Not found", 404);
  if (!(await canEdit(lc, existing))) return jsonError("Unauthorized", 401);

  const amount = body.amount !== undefined ? Math.round(Number(body.amount)) : existing.amount;
  if (!amount || amount <= 0) return jsonError("Positive amount required", 400);

  const type = isPaymentType(body.type) ? body.type : existing.type;

  const payment = await prisma.payment.update({
    where: { id: body.id },
    data: {
      amount,
      type,
      note:
        body.note === undefined
          ? undefined
          : body.note?.trim() || (type === "INSTALMENT" ? "Instalment" : null),
    },
    include: { player: { select: { id: true, name: true, seat: true } } },
  });

  if (payment.status === "confirmed") await syncSeatForPlayer(payment.playerId, existing.cycle);
  return NextResponse.json(payment);
});

export const DELETE = leagueRoute(async (request, lc) => {
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return jsonError("id required", 400);

  const existing = await findLeaguePayment(lc, id);
  if (!existing) return jsonError("Not found", 404);
  if (!(await canEdit(lc, existing))) return jsonError("Unauthorized", 401);

  await prisma.payment.delete({ where: { id } });
  if (existing.status === "confirmed") await syncSeatForPlayer(existing.playerId, existing.cycle);
  return NextResponse.json({ ok: true });
});
