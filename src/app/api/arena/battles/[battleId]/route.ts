import { NextResponse } from "next/server";

import { getArenaBattlePackageWithCompetition } from "@/lib/arena-competition";

export async function GET(
  _request: Request,
  context: { params: Promise<{ battleId: string }> },
) {
  const { battleId } = await context.params;
  const battle = await getArenaBattlePackageWithCompetition(battleId);

  if (!battle) {
    return NextResponse.json(
      {
        message: "未找到战斗包",
      },
      { status: 404 },
    );
  }

  return NextResponse.json(battle);
}
