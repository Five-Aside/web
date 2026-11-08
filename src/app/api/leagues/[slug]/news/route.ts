import { NextResponse } from "next/server";
import { requireOrganiser } from "@/lib/auth";
import { jsonError, leagueRoute } from "@/lib/league-api";
import { prisma } from "@/lib/prisma";

export const GET = leagueRoute(async (request, lc) => {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit")) || 20));
  const id = searchParams.get("id");

  if (id) {
    const post = await prisma.newsPost.findFirst({ where: { id, leagueId: lc.league.id } });
    if (!post) return jsonError("Not found", 404);
    return NextResponse.json({ post });
  }

  const posts = await prisma.newsPost.findMany({
    where: { leagueId: lc.league.id },
    orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
    take: limit,
  });

  return NextResponse.json({
    cycleId: lc.cycle?.id ?? null,
    posts,
    post: posts[0] ?? null,
  });
});

export const POST = leagueRoute(async (request, lc) => {
  await requireOrganiser(lc.league);

  const body = (await request.json()) as {
    title?: string;
    body?: string;
    pinned?: boolean;
    week?: number;
  };
  if (!body.title?.trim() || !body.body?.trim()) {
    return jsonError("title and body required", 400);
  }

  if (body.pinned) {
    await prisma.newsPost.updateMany({
      where: { leagueId: lc.league.id },
      data: { pinned: false },
    });
  }

  const post = await prisma.newsPost.create({
    data: {
      leagueId: lc.league.id,
      cycleId: lc.cycle?.id ?? null,
      title: body.title.trim(),
      body: body.body.trim(),
      pinned: Boolean(body.pinned),
      week: body.week ?? null,
    },
  });
  return NextResponse.json(post, { status: 201 });
});

export const DELETE = leagueRoute(async (request, { league }) => {
  await requireOrganiser(league);
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return jsonError("id required", 400);

  const { count } = await prisma.newsPost.deleteMany({ where: { id, leagueId: league.id } });
  if (count === 0) return jsonError("Not found", 404);
  return NextResponse.json({ ok: true });
});
