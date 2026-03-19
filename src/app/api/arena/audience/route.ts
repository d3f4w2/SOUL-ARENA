import { NextRequest, NextResponse } from "next/server";

import { getArenaSessionId } from "@/lib/arena-session";
import { listAudienceMembers, saveAudienceMember } from "@/lib/arena-store";

export async function GET() {
  const members = await listAudienceMembers();
  return NextResponse.json({ members });
}

export async function POST(request: NextRequest) {
  const sessionId = await getArenaSessionId();
  const body = (await request.json()) as {
    avatarDataUrl?: string;
    displayId?: string;
    displayName?: string;
  };

  if (!body.displayName?.trim()) {
    return NextResponse.json(
      { message: "displayName is required" },
      { status: 400 },
    );
  }

  const member = await saveAudienceMember({
    avatarDataUrl: body.avatarDataUrl,
    displayId: body.displayId?.trim() || undefined,
    displayName: body.displayName.trim(),
    sessionId,
  });

  return NextResponse.json({ member });
}
