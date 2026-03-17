import { NextResponse } from "next/server";

import {
  fetchSecondMeJson,
  getSecondMeSessionSnapshot,
  type SecondMeUserInfo,
} from "@/lib/secondme";

export async function GET() {
  const session = await getSecondMeSessionSnapshot();

  if (!session.authenticated) {
    return NextResponse.json({
      authenticated: false,
      session,
      user: null,
    });
  }

  try {
    const result = await fetchSecondMeJson<SecondMeUserInfo>(
      "/api/secondme/user/info",
    );

    return NextResponse.json({
      authenticated: true,
      session,
      user: result.data ?? null,
      upstream: {
        code: result.code,
        message: result.message ?? null,
      },
    });
  } catch {
    return NextResponse.json(
      {
        authenticated: false,
        session: {
          ...session,
          expiresAt: null,
        },
        user: null,
      },
      { status: 401 },
    );
  }
}
