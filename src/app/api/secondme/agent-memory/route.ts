import { NextRequest, NextResponse } from "next/server";

import { fetchSecondMeJsonForSlot } from "@/lib/secondme";

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as
    | {
        event?: Record<string, unknown>;
        slot?: string;
      }
    | null;

  if (!body?.event || (body.slot !== "alpha" && body.slot !== "beta")) {
    return NextResponse.json(
      {
        code: 400,
        message: "slot and event are required",
        data: null,
      },
      { status: 400 },
    );
  }

  try {
    const result = await fetchSecondMeJsonForSlot<{
      eventId?: string;
      isDuplicate?: boolean;
    }>(body.slot, "/api/secondme/agent_memory/ingest", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body.event),
    });

    return NextResponse.json(result);
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
