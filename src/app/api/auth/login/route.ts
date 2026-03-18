import { NextRequest, NextResponse } from "next/server";

import { createSecondMeAuthUrl } from "@/lib/secondme";

export async function GET(request: NextRequest) {
  const slot = request.nextUrl.searchParams.get("slot");
  const returnTo = request.nextUrl.searchParams.get("returnTo");
  const authUrl = await createSecondMeAuthUrl(
    slot === "beta" ? "beta" : "alpha",
    returnTo ?? "/arena",
  );
  return NextResponse.redirect(authUrl);
}
