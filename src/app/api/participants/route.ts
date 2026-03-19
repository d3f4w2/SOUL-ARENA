import { NextRequest, NextResponse } from "next/server";

import {
  clearSelectedParticipantRef,
  getActiveParticipantProvider,
  setActiveParticipantProvider,
  setSelectedParticipantRef,
} from "@/lib/arena-session";
import { listArenaParticipants } from "@/lib/arena-participants";
import { clearOpenClawBindingForSlot } from "@/lib/openclaw";
import { clearSecondMeSession } from "@/lib/secondme";
import type {
  ArenaParticipantRef,
  ParticipantProvider,
} from "@/lib/arena-types";

export async function GET() {
  const participants = await listArenaParticipants();

  return NextResponse.json({
    participants,
  });
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    ref?: ArenaParticipantRef;
    provider?: ParticipantProvider;
    slot?: string;
  };

  if ((body.slot !== "alpha" && body.slot !== "beta") || !body.provider) {
    return NextResponse.json(
      {
        message: "slot 和 provider 为必填项",
      },
      { status: 400 },
    );
  }

  if (
    body.provider !== "secondme" &&
    body.provider !== "openclaw" &&
    body.provider !== "history" &&
    body.provider !== "zhihu"
  ) {
    return NextResponse.json(
      {
        message: "provider 必须是 secondme、openclaw、history 或 zhihu",
      },
      { status: 400 },
    );
  }

  await setActiveParticipantProvider({
    provider: body.provider,
    slot: body.slot,
  });

  if ((body.provider === "history" || body.provider === "zhihu") && body.ref) {
    await setSelectedParticipantRef({
      ref: {
        ...body.ref,
        provider: body.provider,
        slot: body.slot,
      } as ArenaParticipantRef,
      slot: body.slot,
    });
  } else {
    await clearSelectedParticipantRef(body.slot);
  }

  return NextResponse.json({
    ok: true,
    provider: body.provider,
    slot: body.slot,
  });
}

export async function DELETE(request: NextRequest) {
  const slot = request.nextUrl.searchParams.get("slot");

  if (slot !== "alpha" && slot !== "beta") {
    return NextResponse.json(
      {
        message: "slot 必须是 alpha 或 beta",
      },
      { status: 400 },
    );
  }

  const provider = await getActiveParticipantProvider(slot);

  if (provider === "openclaw") {
    await clearOpenClawBindingForSlot(slot);
  } else if (provider === "secondme") {
    await clearSecondMeSession(slot);
  }

  await clearSelectedParticipantRef(slot);

  return NextResponse.json({
    ok: true,
    provider,
    slot,
  });
}
