import { NextRequest, NextResponse } from "next/server";

import { setActiveParticipantProvider } from "@/lib/arena-session";
import {
  clearSecondMeSession,
  createSecondMeBindCodeForSlot,
  getLatestSecondMeBindCodeForCurrentSession,
  getSecondMeBindCodeRecord,
} from "@/lib/secondme";

const toStatus = (record: {
  expiresAt: string;
  usedAt: string | null;
} | null) => {
  if (!record) {
    return "invalid" as const;
  }

  if (record.usedAt) {
    return "completed" as const;
  }

  if (new Date(record.expiresAt).getTime() <= Date.now()) {
    return "expired" as const;
  }

  return "pending" as const;
};

const toBindPayload = (request: NextRequest, record: {
  code: string;
  expiresAt: string;
  slot: "alpha" | "beta";
  usedAt: string | null;
} | null) => {
  if (!record) {
    return { bind: null };
  }

  return {
    bind: {
      bindCode: record.code,
      expiresAt: record.expiresAt,
      qrPageUrl: new URL(`/secondme/connect/${record.code}`, request.url).toString(),
      slot: record.slot,
      status: toStatus(record),
      usedAt: record.usedAt,
    },
  };
};

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as {
    slot?: string;
  };

  if (body.slot !== "alpha" && body.slot !== "beta") {
    return NextResponse.json(
      {
        message: "slot must be alpha or beta",
      },
      { status: 400 },
    );
  }

  await clearSecondMeSession(body.slot);
  await setActiveParticipantProvider({
    provider: "secondme",
    slot: body.slot,
  });

  const bindCode = await createSecondMeBindCodeForSlot(body.slot);

  return NextResponse.json(
    toBindPayload(request, {
      code: bindCode.code,
      expiresAt: bindCode.expiresAt,
      slot: bindCode.slot,
      usedAt: bindCode.usedAt,
    }),
  );
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code")?.trim();
  const slot = request.nextUrl.searchParams.get("slot");

  if (code) {
    const bindCode = await getSecondMeBindCodeRecord(code);
    return NextResponse.json(
      toBindPayload(
        request,
        bindCode
          ? {
              code: bindCode.code,
              expiresAt: bindCode.expiresAt,
              slot: bindCode.slot,
              usedAt: bindCode.usedAt,
            }
          : null,
      ),
    );
  }

  if (slot !== "alpha" && slot !== "beta") {
    return NextResponse.json(
      {
        message: "code or slot is required",
      },
      { status: 400 },
    );
  }

  const bindCode = await getLatestSecondMeBindCodeForCurrentSession(slot);

  return NextResponse.json(
    toBindPayload(
      request,
      bindCode
        ? {
            code: bindCode.code,
            expiresAt: bindCode.expiresAt,
            slot: bindCode.slot,
            usedAt: bindCode.usedAt,
          }
        : null,
    ),
  );
}
