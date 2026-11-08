import { NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import path from "path";
import { getPlayerIdFromSession, isOrganiser, publicPlayer } from "@/lib/auth";
import { jsonError, leagueRoute } from "@/lib/league-api";
import { overallScore } from "@/lib/league-db";
import { prisma } from "@/lib/prisma";
import { uploadDir } from "@/lib/uploads";

type Params = { slug: string; id: string };

export const GET = leagueRoute<Params>(async (_request, lc, { id }) => {
  const player = await prisma.player.findFirst({
    where: { id, leagueId: lc.league.id },
    include: { team: true },
  });
  if (!player) return jsonError("Not found", 404);

  const isOwn = (await getPlayerIdFromSession(lc.league)) === id;
  const organiser = await isOrganiser(lc.league);
  const hidePayments = player.role === "organiser" && !isOwn;
  const cycleId = lc.cycle?.id ?? "";

  const [payments, events] = await Promise.all([
    hidePayments
      ? Promise.resolve([])
      : prisma.payment.findMany({
          where: { playerId: id, cycleId },
          orderBy: { paidAt: "desc" },
        }),
    prisma.matchEvent.findMany({ where: { playerId: id, cycleId } }),
  ]);

  let goals = 0;
  let assists = 0;
  let yc = 0;
  let rc = 0;
  for (const event of events) {
    if (event.type === "GOAL") goals += event.count;
    if (event.type === "ASSIST") assists += event.count;
    if (event.type === "YC") yc += event.count;
    if (event.type === "RC") rc += event.count;
  }

  const paidTotal = payments.reduce((s, p) => s + p.amount, 0);
  const monthlyFee = lc.cycle?.monthlyFee ?? lc.league.monthlyFee;
  const rest = publicPlayer(player);

  return NextResponse.json({
    player: isOwn || organiser ? rest : { ...rest, phone: "" },
    cycleKey: lc.cycle?.key ?? null,
    payment: hidePayments
      ? null
      : { paidTotal, remaining: Math.max(0, monthlyFee - paidTotal), payments },
    attributes: { overall: player.overall },
    stats: { goals, assists, yc, rc, overall: overallScore(goals, assists, yc, rc) },
  });
});

export const POST = leagueRoute<Params>(async (request, { league }, { id }) => {
  const target = await prisma.player.findFirst({
    where: { id, leagueId: league.id },
    select: { id: true },
  });
  if (!target) return jsonError("Not found", 404);

  const allowed =
    (await getPlayerIdFromSession(league)) === id || (await isOrganiser(league));
  if (!allowed) return jsonError("Unauthorized", 401);

  const form = await request.formData();
  const file = form.get("photo");
  if (!(file instanceof File)) return jsonError("photo required", 400);
  if (!file.type.startsWith("image/")) return jsonError("Image only", 400);
  if (file.size > 3 * 1024 * 1024) return jsonError("Max 3MB", 400);

  const ext = file.type === "image/png" ? "png" : "jpg";
  const filename = `${id}.${ext}`;
  const full = path.join(/*turbopackIgnore: true*/ uploadDir(), filename);
  await writeFile(full, Buffer.from(await file.arrayBuffer()));

  const player = await prisma.player.update({
    where: { id },
    data: { photoPath: filename },
    include: { team: true },
  });

  return NextResponse.json(publicPlayer(player));
});
