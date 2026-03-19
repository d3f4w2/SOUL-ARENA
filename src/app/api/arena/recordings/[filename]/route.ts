import { createReadStream, existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { Readable } from "node:stream";

import { NextRequest, NextResponse } from "next/server";

const RECORDINGS_DIR = join(process.cwd(), ".local", "recordings");

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ filename: string }> },
) {
  const { filename } = await params;
  const safeName = filename.replace(/[/\\]/g, "");

  if (!safeName.endsWith(".webm")) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  const filePath = join(RECORDINGS_DIR, safeName);

  if (!existsSync(filePath)) {
    return NextResponse.json(
      { message: "Recording not found" },
      { status: 404 },
    );
  }

  const stat = statSync(filePath);
  const stream = Readable.toWeb(createReadStream(filePath)) as ReadableStream;

  return new NextResponse(stream, {
    headers: {
      "Cache-Control": "public, max-age=86400",
      "Content-Length": String(stat.size),
      "Content-Type": "video/webm",
    },
  });
}
