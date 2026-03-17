import { NextRequest, NextResponse } from "next/server";

import { fetchSecondMeStream } from "@/lib/secondme";

export async function POST(request: NextRequest) {
  const body = await request.json();

  try {
    const upstream = await fetchSecondMeStream("/api/secondme/chat/stream", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!upstream.ok || !upstream.body) {
      const fallback = await upstream.text();

      return NextResponse.json(
        {
          code: upstream.status,
          message: fallback || "Chat stream failed",
          data: null,
        },
        { status: upstream.status },
      );
    }

    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers: {
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "Content-Type": "text/event-stream; charset=utf-8",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        code: 401,
        message: error instanceof Error ? error.message : "UNAUTHORIZED",
        data: null,
      },
      { status: 401 },
    );
  }
}
