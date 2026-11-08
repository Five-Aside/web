import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { hashPassword, requirePlatformAdmin } from "@/lib/auth";
import { createLeague, normalizePhone, type NewLeagueInput } from "@/lib/league-admin";
import { isValidSlug } from "@/lib/league-context";
import { prisma } from "@/lib/prisma";

const STATUSES = new Set(["pilot", "active", "paused"]);

async function guard() {
  try {
    await requirePlatformAdmin();
    return null;
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

function bad(error: string) {
  return NextResponse.json({ error }, { status: 400 });
}

export async function GET() {
  const denied = await guard();
  if (denied) return denied;

  const leagues = await prisma.league.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      _count: { select: { players: true } },
      cycles: { where: { isCurrent: true }, select: { label: true, startDate: true } },
      players: { where: { role: "organiser" }, select: { name: true, phone: true } },
    },
  });
  return NextResponse.json(
    leagues.map(({ players, cycles, _count, ...league }) => ({
      ...league,
      playerCount: _count.players,
      currentCycle: cycles[0] ?? null,
      organisers: players,
    })),
  );
}

export async function POST(request: Request) {
  const denied = await guard();
  if (denied) return denied;

  const body = (await request.json().catch(() => null)) as
    | (Partial<NewLeagueInput> & { requestId?: string })
    | null;
  if (!body) return bad("Invalid body");

  const slug = String(body.slug ?? "").trim().toLowerCase();
  if (!isValidSlug(slug)) {
    return bad("Slug must be 3–40 lowercase letters, numbers or dashes and not a reserved word");
  }
  const name = String(body.name ?? "").trim();
  const shortName = String(body.shortName ?? "").trim();
  const venue = String(body.venue ?? "").trim();
  if (!name || !shortName || !venue) return bad("Name, short name and venue are required");
  if (shortName.length > 8) return bad("Short name must be 8 characters or fewer");

  const kickoffTime = String(body.kickoffTime ?? "19:00");
  if (!/^\d{2}:\d{2}$/.test(kickoffTime)) return bad("Kick-off must be HH:MM");
  const firstMatchday = String(body.firstMatchday ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(firstMatchday)) return bad("First matchday must be a date");

  const [y, m, d] = firstMatchday.split("-").map(Number);
  const firstDay = new Date(y, m - 1, d).getDay();
  const int = (value: unknown, fallback: number, min: number, max: number) => {
    const n = value === undefined || value === "" ? fallback : Math.round(Number(value));
    return Number.isFinite(n) && n >= min && n <= max ? n : null;
  };
  const numbers = {
    dayOfWeek: int(body.dayOfWeek, firstDay, 0, 6),
    sessionMinutes: int(body.sessionMinutes, 90, 20, 300),
    matchMinutes: int(body.matchMinutes, 11, 3, 90),
    turnaroundMinutes: int(body.turnaroundMinutes, 3, 0, 30),
    teamCount: int(body.teamCount, 4, 2, 12),
    cycleWeeks: int(body.cycleWeeks, 4, 1, 12),
    monthlyFee: int(body.monthlyFee, 5000, 0, 10_000_000),
    visitorFee: int(body.visitorFee, 1500, 0, 10_000_000),
  };
  for (const [key, value] of Object.entries(numbers)) {
    if (value === null) return bad(`${key} is out of range`);
  }

  let organiser: NewLeagueInput["organiser"] = null;
  if (body.organiser?.phone) {
    const { name: orgName, phone, password } = body.organiser;
    if (!orgName?.trim() || !password || password.length < 4) {
      return bad("Organiser needs a name and a password of at least 4 characters");
    }
    organiser = { name: orgName, phone: normalizePhone(phone), password };
  }

  const text = (value: unknown) => (typeof value === "string" && value.trim() ? value.trim() : null);

  try {
    const { league } = await prisma.$transaction(
      (tx) =>
        createLeague(tx, {
          slug,
          name,
          shortName,
          venue,
          kickoffTime,
          firstMatchday,
          tagline: text(body.tagline),
          bankName: text(body.bankName),
          accountNumber: text(body.accountNumber),
          accountName: text(body.accountName),
          whatsappGroupName: text(body.whatsappGroupName),
          whatsappGroupUrl: text(body.whatsappGroupUrl),
          adminName: text(body.adminName) ?? organiser?.name ?? null,
          adminPhone: text(body.adminPhone) ?? organiser?.phone ?? null,
          status: STATUSES.has(String(body.status)) ? String(body.status) : "pilot",
          dayOfWeek: numbers.dayOfWeek!,
          sessionMinutes: numbers.sessionMinutes!,
          matchMinutes: numbers.matchMinutes!,
          turnaroundMinutes: numbers.turnaroundMinutes!,
          teamCount: numbers.teamCount!,
          cycleWeeks: numbers.cycleWeeks!,
          monthlyFee: numbers.monthlyFee!,
          visitorFee: numbers.visitorFee!,
          matchesPerNight: body.matchesPerNight ? Math.round(Number(body.matchesPerNight)) : undefined,
          organiser,
        }),
      { timeout: 30_000 },
    );

    if (body.requestId) {
      await prisma.leagueRequest
        .update({ where: { id: body.requestId }, data: { status: "onboarded" } })
        .catch(() => null);
    }
    return NextResponse.json(league, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "That slug is already taken" }, { status: 409 });
    }
    throw error;
  }
}

/** Status changes and organiser assignment. */
export async function PATCH(request: Request) {
  const denied = await guard();
  if (denied) return denied;

  const body = (await request.json().catch(() => null)) as {
    id?: string;
    status?: string;
    organiser?: { name?: string; phone?: string; password?: string };
  } | null;
  if (!body?.id) return bad("id required");

  const league = await prisma.league.findUnique({ where: { id: body.id } });
  if (!league) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (body.status) {
    if (!STATUSES.has(body.status)) return bad("Invalid status");
    await prisma.league.update({ where: { id: league.id }, data: { status: body.status } });
  }

  if (body.organiser?.phone) {
    const phone = normalizePhone(body.organiser.phone);
    const existing = await prisma.player.findUnique({
      where: { leagueId_phone: { leagueId: league.id, phone } },
    });
    if (existing) {
      await prisma.player.update({
        where: { id: existing.id },
        data: { role: "organiser", status: "active" },
      });
    } else {
      const { name, password } = body.organiser;
      if (!name?.trim() || !password || password.length < 4) {
        return bad("New organiser needs a name and a password of at least 4 characters");
      }
      await prisma.player.create({
        data: {
          leagueId: league.id,
          name: name.trim(),
          phone,
          passwordHash: hashPassword(password),
          status: "active",
          seat: "permanent",
          role: "organiser",
        },
      });
    }
  }

  return NextResponse.json({ ok: true });
}
