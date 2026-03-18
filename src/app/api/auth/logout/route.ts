import { NextRequest, NextResponse } from "next/server";

import { clearSecondMeSession } from "@/lib/secondme";

export async function POST(request: NextRequest) {
  const slot = request.nextUrl.searchParams.get("slot");
  await clearSecondMeSession(slot === "beta" ? "beta" : slot === "alpha" ? "alpha" : undefined);
  return NextResponse.json({ ok: true });
}
