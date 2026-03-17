import { NextRequest, NextResponse } from "next/server";

import { zhihuFetchJson } from "@/lib/zhihu";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    content?: string;
    imageUrls?: string[];
    ringId?: string;
    title?: string;
  };

  if (!body.title || !body.content || !body.ringId) {
    return NextResponse.json(
      {
        status: 1,
        msg: "title, content and ringId are required",
        data: null,
      },
      { status: 400 },
    );
  }

  const payload = await zhihuFetchJson("/openapi/publish/pin", {
    method: "POST",
    body: {
      content: body.content,
      image_urls: body.imageUrls ?? [],
      ring_id: body.ringId,
      title: body.title,
    },
  });

  return NextResponse.json(payload);
}
