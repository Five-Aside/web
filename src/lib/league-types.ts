import type { Schedule } from "@/lib/schedule";

/** League settings + current schedule, safe to send to the browser. */
export type ClientLeague = {
  id: string;
  slug: string;
  name: string;
  shortName: string;
  tagline: string | null;
  venue: string;
  dayOfWeek: number;
  kickoffTime: string;
  sessionMinutes: number;
  matchMinutes: number;
  turnaroundMinutes: number;
  teamCount: number;
  cycleWeeks: number;
  monthlyFee: number;
  visitorFee: number;
  bankName: string | null;
  accountNumber: string | null;
  accountName: string | null;
  whatsappGroupName: string | null;
  whatsappGroupUrl: string | null;
  adminName: string | null;
  adminPhone: string | null;
  adminChatUrl: string | null;
  rulesNotes: string | null;
  status: string;
  schedule: Schedule;
};

export const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

function addMinutes(hhmm: string, minutes: number) {
  const [h, m] = hhmm.split(":").map(Number);
  const total = h * 60 + m + minutes;
  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function clock12(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  const hour = h % 12 === 0 ? 12 : h % 12;
  return { text: `${hour}:${String(m).padStart(2, "0")}`, suffix: h < 12 ? "AM" : "PM" };
}

/** "Thursdays, 7:00–8:30 PM" */
export function sessionLabel(
  league: Pick<ClientLeague, "dayOfWeek" | "kickoffTime" | "sessionMinutes">,
) {
  const start = clock12(league.kickoffTime);
  const end = clock12(addMinutes(league.kickoffTime, league.sessionMinutes));
  const range =
    start.suffix === end.suffix
      ? `${start.text}–${end.text} ${end.suffix}`
      : `${start.text} ${start.suffix}–${end.text} ${end.suffix}`;
  return `${DAY_NAMES[league.dayOfWeek] ?? "Match day"}s, ${range}`;
}

export function matchdayName(league: Pick<ClientLeague, "dayOfWeek">) {
  return DAY_NAMES[league.dayOfWeek] ?? "Match day";
}

export function contactName(league: Pick<ClientLeague, "adminName">) {
  return league.adminName?.trim() || "the organiser";
}

/** WhatsApp link to the organiser with a prefilled message, or null if no phone is set. */
export function adminChatLink(
  league: Pick<ClientLeague, "adminChatUrl" | "adminName">,
  message: string,
) {
  if (!league.adminChatUrl) return null;
  const greeting = league.adminName?.trim() ? `Hi ${league.adminName.trim()} — ` : "Hi — ";
  return `${league.adminChatUrl}?text=${encodeURIComponent(greeting + message)}`;
}
