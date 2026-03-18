import { NextRequest, NextResponse } from "next/server";

import { listArenaParticipants } from "@/lib/arena-participants";
import { clearSecondMeSession } from "@/lib/secondme";

export async function GET() {
  const participants = await listArenaParticipants();

  return NextResponse.json({
    participants,
  });
}

export async function DELETE(request: NextRequest) {
  const slot = request.nextUrl.searchParams.get("slot");

  if (slot !== "alpha" && slot !== "beta") {
    return NextResponse.json(
      {
        message: "slot must be alpha or beta",
      },
      { status: 400 },
    );
  }

  await clearSecondMeSession(slot);

  return NextResponse.json({
    ok: true,
    slot,
  });
}
