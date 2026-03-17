import { NextResponse } from "next/server";

import { createSecondMeAuthUrl } from "@/lib/secondme";

export async function GET() {
  const authUrl = await createSecondMeAuthUrl();
  return NextResponse.redirect(authUrl);
}
