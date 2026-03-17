import { NextRequest, NextResponse } from "next/server";

import { zhihuFetchJson } from "@/lib/zhihu";

export async function GET(request: NextRequest) {
  const contentType = request.nextUrl.searchParams.get("contentType");
  const contentToken = request.nextUrl.searchParams.get("contentToken");
  const pageNum = request.nextUrl.searchParams.get("pageNum") ?? "1";
  const pageSize = request.nextUrl.searchParams.get("pageSize") ?? "10";

  if (!contentType || !contentToken) {
    return NextResponse.json(
      {
        status: 1,
        msg: "contentType and contentToken are required",
        data: null,
      },
      { status: 400 },
    );
  }

  const payload = await zhihuFetchJson("/openapi/comment/list", {
    query: {
      content_type: contentType,
      content_token: contentToken,
      page_num: pageNum,
      page_size: pageSize,
    },
    cacheTtlMs: 30 * 1000,
  });

  return NextResponse.json(payload);
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    content?: string;
    contentToken?: string;
    contentType?: "pin" | "comment";
  };

  if (!body.content || !body.contentToken || !body.contentType) {
    return NextResponse.json(
      {
        status: 1,
        msg: "content, contentToken and contentType are required",
        data: null,
      },
      { status: 400 },
    );
  }

  const payload = await zhihuFetchJson("/openapi/comment/create", {
    method: "POST",
    body: {
      content: body.content,
      content_token: body.contentToken,
      content_type: body.contentType,
    },
  });

  return NextResponse.json(payload);
}

export async function DELETE(request: NextRequest) {
  const body = (await request.json()) as {
    commentId?: string;
  };

  if (!body.commentId) {
    return NextResponse.json(
      {
        status: 1,
        msg: "commentId is required",
        data: null,
      },
      { status: 400 },
    );
  }

  const payload = await zhihuFetchJson("/openapi/comment/delete", {
    method: "POST",
    body: {
      comment_id: body.commentId,
    },
  });

  return NextResponse.json(payload);
}
