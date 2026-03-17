import { NextRequest, NextResponse } from "next/server";

import { zhihuFetchJson } from "@/lib/zhihu";

export async function GET(request: NextRequest) {
  const ringId = request.nextUrl.searchParams.get("ringId");
  const pageNum = request.nextUrl.searchParams.get("pageNum") ?? "1";
  const pageSize = request.nextUrl.searchParams.get("pageSize") ?? "10";

  if (!ringId) {
    return NextResponse.json(
      {
        status: 1,
        msg: "ringId is required",
        data: null,
      },
      { status: 400 },
    );
  }

  const payload = await zhihuFetchJson("/openapi/ring/detail", {
    query: {
      ring_id: ringId,
      page_num: pageNum,
      page_size: pageSize,
    },
    cacheTtlMs: 60 * 1000,
  });

  return NextResponse.json(payload);
}
