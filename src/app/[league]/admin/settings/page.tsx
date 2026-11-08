import type { Metadata } from "next";
import { LeagueSettingsClient } from "@/components/LeagueSettingsClient";

export const metadata: Metadata = { title: "League settings" };

export default function LeagueSettingsPage() {
  return <LeagueSettingsClient />;
}
