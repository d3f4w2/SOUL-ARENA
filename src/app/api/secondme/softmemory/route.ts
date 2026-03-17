import { NextResponse } from "next/server";

import { fetchSecondMeJson } from "@/lib/secondme";

export async function GET() {
  try {
    const result = await fetchSecondMeJson<{
      list?: Array<{
        id?: string | number;
        title?: string;
        content?: string;
        text?: string;
        summary?: string;
        [key: string]: unknown;
      }>;
    }>("/api/secondme/user/softmemory");

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
