import { NextResponse } from "next/server";
import {
  clearPlatformSession,
  isPlatformAdmin,
  setPlatformSession,
  verifyPlatformPassword,
} from "@/lib/auth";

export async function GET() {
  return NextResponse.json({ authenticated: await isPlatformAdmin() });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    password?: string;
    action?: string;
  } | null;

  if (body?.action === "logout") {
    await clearPlatformSession();
    return NextResponse.json({ ok: true });
  }

  if (!body?.password || !verifyPlatformPassword(body.password)) {
    await new Promise((resolve) => setTimeout(resolve, 800));
    return NextResponse.json({ error: "Wrong password" }, { status: 401 });
  }

  await setPlatformSession();
  return NextResponse.json({ ok: true });
}
