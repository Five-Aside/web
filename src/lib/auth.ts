import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import type { League } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const PLATFORM_COOKIE = "tnf_platform";
/** Pre-platform player cookie; still honoured for the original league. */
const LEGACY_PLAYER_COOKIE = "tnf_player";
const LEGACY_LEAGUE_SLUG = "kadwell";

type LeagueRef = Pick<League, "id" | "slug">;

function sessionSecret() {
  return process.env.SESSION_SECRET || process.env.ADMIN_PASSWORD || "tnf-dev-secret";
}

function platformPassword() {
  return process.env.PLATFORM_ADMIN_PASSWORD || "";
}

function hmac(payload: string) {
  return createHmac("sha256", sessionSecret()).update(payload).digest("hex");
}

function safeEqual(a: string, b: string) {
  try {
    const x = Buffer.from(a);
    const y = Buffer.from(b);
    return x.length === y.length && timingSafeEqual(x, y);
  } catch {
    return false;
  }
}

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}

export function playerCookieName(slug: string) {
  return `tnf_p_${slug}`;
}

export { hashPassword, verifyPassword } from "@/lib/auth-hash";

// ---------- Platform admin ----------

function platformToken() {
  return hmac(`platform:${platformPassword()}`);
}

export function verifyPlatformPassword(password: string) {
  const expected = platformPassword();
  if (!expected) return false;
  return safeEqual(password, expected);
}

export async function setPlatformSession() {
  const jar = await cookies();
  jar.set(PLATFORM_COOKIE, platformToken(), cookieOptions(60 * 60 * 24 * 7));
}

export async function clearPlatformSession() {
  const jar = await cookies();
  jar.delete(PLATFORM_COOKIE);
}

export async function isPlatformAdmin() {
  if (!platformPassword()) return false;
  const jar = await cookies();
  const value = jar.get(PLATFORM_COOKIE)?.value;
  return !!value && safeEqual(value, platformToken());
}

export async function requirePlatformAdmin() {
  if (!(await isPlatformAdmin())) throw new Error("UNAUTHORIZED");
}

// ---------- League players ----------

function playerToken(leagueId: string, playerId: string) {
  return hmac(`player:${leagueId}:${playerId}`);
}

function legacyPlayerToken(playerId: string) {
  return hmac(`player:${playerId}`);
}

function parseCookie(value: string | undefined) {
  if (!value) return null;
  const [playerId, token] = value.split(".");
  if (!playerId || !token) return null;
  return { playerId, token };
}

/** Player id from this league's session cookie (verified to belong to the league). */
export async function getPlayerIdFromSession(league: LeagueRef) {
  const jar = await cookies();
  let playerId: string | null = null;

  const current = parseCookie(jar.get(playerCookieName(league.slug))?.value);
  if (current && safeEqual(current.token, playerToken(league.id, current.playerId))) {
    playerId = current.playerId;
  } else if (league.slug === LEGACY_LEAGUE_SLUG) {
    const legacy = parseCookie(jar.get(LEGACY_PLAYER_COOKIE)?.value);
    if (legacy && safeEqual(legacy.token, legacyPlayerToken(legacy.playerId))) {
      playerId = legacy.playerId;
    }
  }
  if (!playerId) return null;

  const player = await prisma.player.findUnique({
    where: { id: playerId },
    select: { leagueId: true },
  });
  return player?.leagueId === league.id ? playerId : null;
}

export async function setPlayerSession(league: LeagueRef, playerId: string) {
  const jar = await cookies();
  jar.set(
    playerCookieName(league.slug),
    `${playerId}.${playerToken(league.id, playerId)}`,
    cookieOptions(60 * 60 * 24 * 30),
  );
}

export async function clearPlayerSession(league: LeagueRef) {
  const jar = await cookies();
  jar.delete(playerCookieName(league.slug));
  if (league.slug === LEGACY_LEAGUE_SLUG) jar.delete(LEGACY_PLAYER_COOKIE);
}

export async function requirePlayer(league: LeagueRef) {
  const id = await getPlayerIdFromSession(league);
  if (!id) throw new Error("UNAUTHORIZED");
  return id;
}

/** Active organiser of this league, or the platform admin. */
export async function isOrganiser(league: LeagueRef) {
  if (await isPlatformAdmin()) return true;
  const playerId = await getPlayerIdFromSession(league);
  if (!playerId) return false;
  const player = await prisma.player.findUnique({
    where: { id: playerId },
    select: { role: true, status: true },
  });
  return player?.role === "organiser" && player.status === "active";
}

export async function requireOrganiser(league: LeagueRef) {
  if (!(await isOrganiser(league))) throw new Error("UNAUTHORIZED");
}

export function publicPlayer<T extends { passwordHash?: string }>(player: T) {
  const { passwordHash: _, ...rest } = player;
  return rest;
}
