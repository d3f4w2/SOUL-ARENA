import { NextRequest, NextResponse } from "next/server";

import { fetchSecondMeJson } from "@/lib/secondme";

export async function POST(request: NextRequest) {
  const body = await request.json();

  try {
    const result = await fetchSecondMeJson<{ noteId?: number }>(
      "/api/secondme/note/add",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      },
    );

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
