import { NextRequest, NextResponse } from "next/server";

import { getArenaSessionId } from "@/lib/arena-session";
import { countVotes, saveVote } from "@/lib/arena-store";

export async function GET(request: NextRequest) {
  const battleId = request.nextUrl.searchParams.get("battleId");

  if (!battleId) {
    return NextResponse.json(
      { message: "battleId is required" },
      { status: 400 },
    );
  }

  return NextResponse.json(await countVotes({ battleId }));
}

export async function POST(request: NextRequest) {
  const sessionId = await getArenaSessionId();
  const body = (await request.json()) as {
    battleId?: string;
    side?: string;
  };

  if (!body.battleId) {
    return NextResponse.json(
      { message: "battleId is required" },
      { status: 400 },
    );
  }

  if (body.side !== "player" && body.side !== "defender") {
    return NextResponse.json(
      { message: "side must be 'player' or 'defender'" },
      { status: 400 },
    );
  }

  await saveVote({
    battleId: body.battleId,
    sessionId,
    side: body.side,
  });

  return NextResponse.json({
    ok: true,
    ...(await countVotes({ battleId: body.battleId })),
  });
}
