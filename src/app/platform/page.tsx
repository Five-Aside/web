import type { Metadata } from "next";
import { PlatformClient } from "@/components/platform/PlatformClient";
import { PlatformLogin } from "@/components/platform/PlatformLogin";
import { isPlatformAdmin } from "@/lib/auth";
import { PLATFORM_NAME } from "@/lib/platform";

export const metadata: Metadata = { title: `Platform admin · ${PLATFORM_NAME}`, robots: { index: false } };

export default async function PlatformPage() {
  if (!(await isPlatformAdmin())) return <PlatformLogin platformName={PLATFORM_NAME} />;
  return <PlatformClient platformName={PLATFORM_NAME} />;
}
