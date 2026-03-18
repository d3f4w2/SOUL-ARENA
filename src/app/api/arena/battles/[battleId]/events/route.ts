import { NextResponse } from "next/server";

import { getBattlePackage } from "@/lib/arena-store";

export async function GET(
  _request: Request,
  context: { params: Promise<{ battleId: string }> },
) {
  const { battleId } = await context.params;
  const battle = getBattlePackage(battleId);

  if (!battle) {
    return NextResponse.json(
      {
        message: "未找到战斗包",
      },
      { status: 404 },
    );
  }

  return NextResponse.json({
    battleId,
    events: battle.events,
  });
}
