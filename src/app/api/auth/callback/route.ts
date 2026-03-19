import { NextRequest, NextResponse } from "next/server";

import { setActiveParticipantProvider } from "@/lib/arena-session";
import {
  completeSecondMeBindCode,
  exchangeCodeForTokenPayload,
  exchangeCodeForSession,
  getSecondMeReturnTarget,
  resolveSecondMeCallbackContext,
  resolveSecondMeAuthSlotFromState,
  validateReturnedState,
} from "@/lib/secondme";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const context = resolveSecondMeCallbackContext(state);
  const slot =
    context.kind === "slot"
      ? resolveSecondMeAuthSlotFromState(state)
      : null;

  if (!code) {
    if (context.kind === "bind") {
      const url = new URL(`/secondme/connect/${context.bindCode}`, request.url);
      url.searchParams.set("error", "missing_code");
      url.searchParams.set("status", "error");
      return NextResponse.redirect(url);
    }

    return NextResponse.redirect(new URL("/arena?error=missing_code", request.url));
  }

  if (context.kind === "bind") {
    try {
      const payload = await exchangeCodeForTokenPayload(code);
      await completeSecondMeBindCode(context.bindCode, payload);
      const url = new URL(`/secondme/connect/${context.bindCode}`, request.url);
      url.searchParams.set("status", "success");
      return NextResponse.redirect(url);
    } catch (error) {
      const url = new URL(`/secondme/connect/${context.bindCode}`, request.url);
      url.searchParams.set(
        "error",
        error instanceof Error ? error.message : "oauth_failed",
      );
      url.searchParams.set("status", "error");
      return NextResponse.redirect(url);
    }
  }

  const resolvedSlot = slot ?? "alpha";
  const stateOk = await validateReturnedState(resolvedSlot, state);

  try {
    await exchangeCodeForSession(code, resolvedSlot);
    await setActiveParticipantProvider({
      provider: "secondme",
      slot: resolvedSlot,
    });
    const returnTo = await getSecondMeReturnTarget(resolvedSlot);
    const url = new URL(returnTo, request.url);

    if (!stateOk) {
      url.searchParams.set("warning", "state_mismatch");
    }

    return NextResponse.redirect(url);
  } catch (error) {
    const url = new URL("/arena", request.url);
    url.searchParams.set(
      "error",
      error instanceof Error ? error.message : "oauth_failed",
    );
    return NextResponse.redirect(url);
  }
}
