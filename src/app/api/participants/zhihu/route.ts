import { NextRequest, NextResponse } from "next/server";

import {
  getRandomZhihuParticipantCandidate,
  searchZhihuParticipantCandidates,
} from "@/lib/arena-personas";

export async function GET(request: NextRequest) {
  const slot = request.nextUrl.searchParams.get("slot");
  const query = request.nextUrl.searchParams.get("query");

  if (slot !== "alpha" && slot !== "beta") {
    return NextResponse.json(
      {
        message: "slot 必须是 alpha 或 beta",
      },
      { status: 400 },
    );
  }

  if (query?.trim()) {
    const candidates = await searchZhihuParticipantCandidates({
      query,
      slot,
    });

    return NextResponse.json({
      candidates,
    });
  }

  const participant = await getRandomZhihuParticipantCandidate({
    slot,
  });

  return NextResponse.json({
    participant,
  });
}
