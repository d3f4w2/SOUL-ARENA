import { NextResponse } from "next/server";

import { getArenaChallengers, getArenaTopics } from "@/lib/arena";
import { zhihuFetchJson } from "@/lib/zhihu";

export async function GET() {
  let signals: string[] = [];

  try {
    const payload = await zhihuFetchJson<{
      data?: {
        list?: Array<{
          title?: string;
        }>;
      };
    }>("/openapi/billboard/list", {
      cacheTtlMs: 5 * 60 * 1000,
      query: {
        publish_in_hours: 48,
        top_cnt: 3,
      },
    });
    signals = (payload.data?.list ?? [])
      .map((item) => item.title?.trim())
      .filter((item): item is string => Boolean(item));
  } catch {
    signals = [];
  }

  return NextResponse.json({
    challengers: getArenaChallengers(),
    signals,
    topics: getArenaTopics(),
  });
}
