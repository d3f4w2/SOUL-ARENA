import { NextRequest, NextResponse } from "next/server";

import { listBattleSummaries } from "@/lib/arena-store";

export async function GET(request: NextRequest) {
  const limitParam = request.nextUrl.searchParams.get("limit");
  const limit = limitParam ? Number.parseInt(limitParam, 10) : 50;

  return NextResponse.json({
    battles: listBattleSummaries(limit),
  });
}
