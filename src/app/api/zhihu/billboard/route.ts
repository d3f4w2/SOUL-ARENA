import { NextRequest, NextResponse } from "next/server";

import { zhihuFetchJson } from "@/lib/zhihu";

export async function GET(request: NextRequest) {
  const topCnt = request.nextUrl.searchParams.get("topCnt") ?? "8";
  const publishInHours =
    request.nextUrl.searchParams.get("publishInHours") ?? "48";

  const payload = await zhihuFetchJson("/openapi/billboard/list", {
    query: {
      top_cnt: topCnt,
      publish_in_hours: publishInHours,
    },
    cacheTtlMs: 5 * 60 * 1000,
  });

  return NextResponse.json(payload);
}
