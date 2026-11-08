import { NextResponse, type NextRequest } from "next/server";
import type { Cycle } from "@prisma/client";
import { isPlatformAdmin } from "@/lib/auth";
import { getLeagueContext, type LeagueContext } from "@/lib/league-context";
import { prisma } from "@/lib/prisma";

type SlugParams = { slug: string };

export function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

/**
 * Wraps a league-scoped route handler: resolves `[slug]`, hides paused leagues from
 * everyone except the platform admin, and maps thrown UNAUTHORIZED to a 401.
 */
export function leagueRoute<P extends SlugParams = SlugParams>(
  handler: (request: NextRequest, lc: LeagueContext, params: P) => Promise<Response>,
) {
  return async (request: NextRequest, ctx: { params: Promise<P> }) => {
    const params = await ctx.params;
    const lc = await getLeagueContext(params.slug);
    if (!lc) return jsonError("League not found", 404);
    if (lc.league.status === "paused" && !(await isPlatformAdmin())) {
      return jsonError("League is paused", 404);
    }
    try {
      return await handler(request, lc, params);
    } catch (error) {
      if (error instanceof Error && error.message === "UNAUTHORIZED") {
        return jsonError("Unauthorized", 401);
      }
      throw error;
    }
  };
}

/** `?cycle=<key>` (or legacy `?month=<key>`) within this league, else the current cycle. */
export async function cycleFromRequest(
  request: Request,
  lc: LeagueContext,
): Promise<Cycle | null> {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get("cycle") || searchParams.get("month");
  if (key && key !== lc.cycle?.key) {
    return prisma.cycle.findUnique({
      where: { leagueId_key: { leagueId: lc.league.id, key } },
    });
  }
  return lc.cycle;
}

export function noCycle() {
  return jsonError("This league has no active cycle yet", 409);
}
