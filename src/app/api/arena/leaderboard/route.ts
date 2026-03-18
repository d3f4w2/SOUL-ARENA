import { NextRequest, NextResponse } from "next/server";

import {
  getArenaFeaturedCompetitor,
  getArenaLeaderboard,
} from "@/lib/arena-competition";

export async function GET(request: NextRequest) {
  const limitParam = request.nextUrl.searchParams.get("limit");
  const limit = limitParam ? Number.parseInt(limitParam, 10) : 10;

  return NextResponse.json({
    featured: getArenaFeaturedCompetitor(),
    leaderboard: getArenaLeaderboard(limit),
  });
}
