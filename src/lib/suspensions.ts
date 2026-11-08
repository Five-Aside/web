import { prisma } from "@/lib/prisma";

/**
 * After logging a YC/RC, bump suspensionMatchesRemaining from league rules.
 * Tracks served bans via the remaining counter (decremented when the team plays).
 */
export async function applyCardSuspension(
  playerId: string,
  type: string,
  count: number,
  cycleId: string,
) {
  if (type !== "YC" && type !== "RC") return;

  const player = await prisma.player.findUnique({
    where: { id: playerId },
    select: {
      suspensionMatchesRemaining: true,
      suspensionReason: true,
    },
  });
  if (!player) return;

  let remaining = player.suspensionMatchesRemaining;
  let reason = player.suspensionReason;

  if (type === "RC") {
    const add = Math.max(1, count);
    remaining += add;
    reason = add > 1 ? `Red card (${add}-match ban)` : "Red card (1-match ban)";
  }

  if (type === "YC") {
    const ycEvents = await prisma.matchEvent.findMany({
      where: { playerId, cycleId, type: "YC" },
    });
    const ycTotal = ycEvents.reduce((s, e) => s + e.count, 0);
    const ycBefore = ycTotal - count;

    if (ycBefore < 3 && ycTotal >= 3 && ycTotal < 5) {
      remaining += 1;
      reason = "3 yellows this month (1-match ban)";
    }
    if (ycBefore < 5 && ycTotal >= 5) {
      // 5Y replaces the 3Y ban: ensure at least 2 remaining from this trigger
      const need = 2;
      if (remaining < need) {
        remaining = need;
      } else if (ycBefore < 3) {
        // jumped past 3 somehow — already added above if needed
        remaining = Math.max(remaining, need);
      } else {
        // had 3Y ban already; bump to cover 5Y (extra match)
        remaining += 1;
      }
      reason = "5 yellows this month (2-match ban)";
    }
  }

  await prisma.player.update({
    where: { id: playerId },
    data: {
      suspensionMatchesRemaining: remaining,
      suspensionReason: remaining > 0 ? reason : null,
    },
  });
}

export type ServedBan = { id: string; reason: string | null };

/**
 * When a team's match result is logged, serve one ban match for each suspended player on that team.
 * Returns who was served so the caller can undo it.
 */
export async function serveSuspensionsForTeam(teamId: string): Promise<ServedBan[]> {
  const suspended = await prisma.player.findMany({
    where: {
      teamId,
      suspensionMatchesRemaining: { gt: 0 },
    },
  });

  for (const p of suspended) {
    const next = Math.max(0, p.suspensionMatchesRemaining - 1);
    await prisma.player.update({
      where: { id: p.id },
      data: {
        suspensionMatchesRemaining: next,
        suspensionReason: next > 0 ? p.suspensionReason : null,
      },
    });
  }
  return suspended.map((p) => ({ id: p.id, reason: p.suspensionReason }));
}
