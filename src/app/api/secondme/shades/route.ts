import { NextResponse } from "next/server";

import { fetchSecondMeJson } from "@/lib/secondme";

export async function GET() {
  try {
    const result = await fetchSecondMeJson<{
      shades?: Array<{
        label?: string;
        name?: string;
        description?: string;
        score?: number;
        [key: string]: unknown;
      }>;
    }>("/api/secondme/user/shades");

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
