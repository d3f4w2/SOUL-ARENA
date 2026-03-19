import { NextRequest, NextResponse } from "next/server";

import { listHistoryParticipantCandidates } from "@/lib/arena-personas";

export async function GET(request: NextRequest) {
  const slot = request.nextUrl.searchParams.get("slot");

  if (slot !== "alpha" && slot !== "beta") {
    return NextResponse.json(
      {
        message: "slot 必须是 alpha 或 beta",
      },
      { status: 400 },
    );
  }

  const candidates = await listHistoryParticipantCandidates(slot);

  return NextResponse.json({
    candidates,
  });
}
