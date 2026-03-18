import { NextRequest, NextResponse } from "next/server";

import { createSecondMeAuthUrl } from "@/lib/secondme";

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as {
    returnTo?: string;
    slot?: string;
  };
  const slot = body.slot === "beta" ? "beta" : "alpha";
  const authUrl = await createSecondMeAuthUrl(slot, body.returnTo ?? "/arena");

  return NextResponse.json({
    authUrl,
    slot,
  });
}
