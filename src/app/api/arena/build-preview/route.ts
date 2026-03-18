import { NextRequest, NextResponse } from "next/server";

import { resolveArenaParticipants } from "@/lib/arena-participants";
import { buildArenaPreview } from "@/lib/arena-engine";
import type { ArenaBattleSetup } from "@/lib/arena-types";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as Partial<ArenaBattleSetup>;

  if (!body.topicId || !body.participants?.length) {
    return NextResponse.json(
      {
        message: "topicId and participants are required",
      },
      { status: 400 },
    );
  }

  const participants = await resolveArenaParticipants(body.participants);
  const disconnected = participants.filter((participant) => !participant.connected);

  if (disconnected.length > 0) {
    return NextResponse.json(
      {
        message: "Both participants must be connected to SecondMe",
        participants,
      },
      { status: 400 },
    );
  }

  return NextResponse.json(
    buildArenaPreview(body as ArenaBattleSetup, participants),
  );
}
