import { NextRequest, NextResponse } from "next/server";

import { zhihuFetchJson } from "@/lib/zhihu";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("query");
  const count = request.nextUrl.searchParams.get("count") ?? "8";

  if (!query) {
    return NextResponse.json(
      {
        status: 1,
        msg: "query is required",
        data: null,
      },
      { status: 400 },
    );
  }

  const payload = await zhihuFetchJson("/openapi/search/global", {
    query: {
      query,
      count,
    },
    cacheTtlMs: 10 * 60 * 1000,
    searchMode: true,
  });

  return NextResponse.json(payload);
}
