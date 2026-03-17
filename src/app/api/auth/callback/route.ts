import { NextRequest, NextResponse } from "next/server";

import {
  exchangeCodeForSession,
  validateReturnedState,
} from "@/lib/secondme";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");

  if (!code) {
    return NextResponse.redirect(new URL("/?error=missing_code", request.url));
  }

  const stateOk = await validateReturnedState(state);

  try {
    await exchangeCodeForSession(code);
    const url = new URL("/", request.url);

    if (!stateOk) {
      url.searchParams.set("warning", "state_mismatch");
    }

    return NextResponse.redirect(url);
  } catch (error) {
    const url = new URL("/", request.url);
    url.searchParams.set(
      "error",
      error instanceof Error ? error.message : "oauth_failed",
    );
    return NextResponse.redirect(url);
  }
}
