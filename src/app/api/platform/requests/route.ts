import { NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const STATUSES = new Set(["new", "contacted", "onboarded", "declined"]);

function clip(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function unauthorized(error: unknown) {
  if (error instanceof Error && error.message === "UNAUTHORIZED") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  throw error;
}

/** Public "Request a league" form. */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  // Honeypot field: real visitors never fill it.
  if (clip(body.website, 200)) return NextResponse.json({ ok: true }, { status: 201 });

  const leagueName = clip(body.leagueName, 120);
  const contactName = clip(body.contactName, 120);
  const phone = clip(body.phone, 30);
  if (!leagueName || !contactName || !phone) {
    return NextResponse.json(
      { error: "League name, your name and a phone number are required" },
      { status: 400 },
    );
  }

  const recent = await prisma.leagueRequest.count({
    where: { phone, createdAt: { gt: new Date(Date.now() - 60 * 60 * 1000) } },
  });
  if (recent >= 3) {
    return NextResponse.json(
      { error: "We already have your request — we'll be in touch soon." },
      { status: 429 },
    );
  }

  const playerCount = Math.round(Number(body.playerCount));
  await prisma.leagueRequest.create({
    data: {
      leagueName,
      contactName,
      phone,
      email: clip(body.email, 200) || null,
      city: clip(body.city, 120) || null,
      venue: clip(body.venue, 200) || null,
      playerCount: Number.isFinite(playerCount) && playerCount > 0 ? playerCount : null,
      message: clip(body.message, 2000) || null,
    },
  });
  return NextResponse.json({ ok: true }, { status: 201 });
}

export async function GET() {
  try {
    await requirePlatformAdmin();
  } catch (error) {
    return unauthorized(error);
  }
  const requests = await prisma.leagueRequest.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(requests);
}

export async function PATCH(request: Request) {
  try {
    await requirePlatformAdmin();
  } catch (error) {
    return unauthorized(error);
  }
  const body = (await request.json().catch(() => null)) as { id?: string; status?: string } | null;
  if (!body?.id || !body.status || !STATUSES.has(body.status)) {
    return NextResponse.json({ error: "id and a valid status required" }, { status: 400 });
  }
  const updated = await prisma.leagueRequest.update({
    where: { id: body.id },
    data: { status: body.status },
  });
  return NextResponse.json(updated);
}
