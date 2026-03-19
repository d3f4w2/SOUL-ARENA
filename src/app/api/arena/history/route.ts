import { NextRequest, NextResponse } from "next/server";

import { listArenaBattleSummariesWithCompetition } from "@/lib/arena-competition";

export async function GET(request: NextRequest) {
  const limitParam = request.nextUrl.searchParams.get("limit");
  const limit = limitParam ? Number.parseInt(limitParam, 10) : 50;
  const battles = await listArenaBattleSummariesWithCompetition(limit);

  return NextResponse.json({
    battles,
  });
}
