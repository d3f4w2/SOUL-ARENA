import { NextRequest, NextResponse } from "next/server";

import { getLiveSession, setLiveSession } from "@/lib/arena-store";

export async function GET() {
  const session = await getLiveSession();

  if (!session) {
    return NextResponse.json({
      battleId: null,
      secondsUntilStart: null,
      startAt: null,
    });
  }

  let secondsUntilStart: number | null = null;

  if (session.startAt) {
    const diff = (new Date(session.startAt).getTime() - Date.now()) / 1000;
    secondsUntilStart = Math.max(0, diff);
  }

  return NextResponse.json({
    battleId: session.battleId,
    secondsUntilStart,
    startAt: session.startAt,
  });
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    battleId?: string;
    delaySeconds?: number;
  };

  if (!body.battleId) {
    return NextResponse.json(
      { message: "battleId is required" },
      { status: 400 },
    );
  }

  const delaySeconds =
    typeof body.delaySeconds === "number" ? body.delaySeconds : 5;
  const startAt = new Date(
    Date.now() + Math.max(0, delaySeconds) * 1000,
  ).toISOString();

  const session = await setLiveSession({
    battleId: body.battleId,
    startAt,
  });

  return NextResponse.json({
    battleId: session.battleId,
    secondsUntilStart: delaySeconds,
    startAt: session.startAt,
  });
}
