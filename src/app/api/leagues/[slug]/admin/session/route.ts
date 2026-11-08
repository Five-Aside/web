import { NextResponse } from "next/server";
import { getPlayerIdFromSession, isOrganiser, isPlatformAdmin } from "@/lib/auth";
import { leagueRoute } from "@/lib/league-api";

export const GET = leagueRoute(async (_request, { league }) => {
  const authenticated = await isOrganiser(league);
  const playerId = await getPlayerIdFromSession(league);
  let via: "player" | "platform" | null = null;
  if (authenticated) via = (await isPlatformAdmin()) && !playerId ? "platform" : "player";
  return NextResponse.json({ authenticated, via, loggedIn: !!playerId });
});
