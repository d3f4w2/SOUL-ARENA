import { NextRequest, NextResponse } from "next/server";

import { zhihuFetchJson } from "@/lib/zhihu";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    actionValue?: number;
    contentToken?: string;
    contentType?: "pin" | "comment";
  };

  if (
    !body.contentToken ||
    !body.contentType ||
    typeof body.actionValue !== "number"
  ) {
    return NextResponse.json(
      {
        status: 1,
        msg: "contentToken, contentType and actionValue are required",
        data: null,
      },
      { status: 400 },
    );
  }

  const payload = await zhihuFetchJson("/openapi/reaction", {
    method: "POST",
    body: {
      action_type: "like",
      action_value: body.actionValue,
      content_token: body.contentToken,
      content_type: body.contentType,
    },
  });

  return NextResponse.json(payload);
}
