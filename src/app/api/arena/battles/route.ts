import { NextRequest, NextResponse } from "next/server";

import { createBattlePackage } from "@/lib/arena";
import { saveBattlePackage } from "@/lib/arena-store";
import type { ArenaBattleSetup } from "@/lib/arena-types";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as Partial<ArenaBattleSetup>;

  if (!body.topicId || !body.challengerId || !body.player) {
    return NextResponse.json(
      {
        message: "topicId, challengerId and player are required",
      },
      { status: 400 },
    );
  }

  const battle = createBattlePackage(body as ArenaBattleSetup);
  saveBattlePackage(battle);

  return NextResponse.json(battle);
}
