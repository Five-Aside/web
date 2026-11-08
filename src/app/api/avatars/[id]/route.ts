import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";
import { uploadDir } from "@/lib/uploads";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const player = await prisma.player.findUnique({
    where: { id },
    select: { photoPath: true },
  });

  if (!player?.photoPath) {
    return new NextResponse(null, { status: 404 });
  }

  try {
    const file = await readFile(
      path.join(/*turbopackIgnore: true*/ uploadDir(), player.photoPath),
    );
    const type = player.photoPath.endsWith(".png") ? "image/png" : "image/jpeg";
    return new NextResponse(file, {
      headers: {
        "Content-Type": type,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
