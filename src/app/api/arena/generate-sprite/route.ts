import { NextRequest, NextResponse } from "next/server";

import { env } from "@/lib/env";

const DEER_API_URL = "https://api.deerapi.com/v1/chat/completions";
const MODEL = "gemini-2.5-flash-image";

type SpriteRequest = {
  name: string;
  slot: "alpha" | "beta";
  tags: string[];
};

type DeerChoice = {
  message?: {
    content?: string;
  };
};

type DeerResponse = {
  choices?: DeerChoice[];
  error?: {
    message?: string;
  };
};

const buildPrompt = (name: string, tags: string[], slot: "alpha" | "beta") => {
  const side =
    slot === "alpha"
      ? "red energy aura, left side warrior"
      : "golden energy aura, right side warrior";
  const tagStr = tags.length ? tags.slice(0, 4).join(", ") : "mysterious fighter";

  return [
    `A Mortal Kombat style fighting game character named "${name}".`,
    `Personality: ${tagStr}.`,
    `Full body, dramatic battle stance, dark arena background with ${side},`,
    "cinematic lighting, glowing eyes, detailed warrior costume, no text or watermarks,",
    "square composition, ultra high quality.",
  ].join(" ");
};

export async function POST(request: NextRequest) {
  if (!env.DEER_API_KEY) {
    return NextResponse.json(
      { message: "DEER_API_KEY not configured" },
      { status: 500 },
    );
  }

  let body: Partial<SpriteRequest>;

  try {
    body = (await request.json()) as Partial<SpriteRequest>;
  } catch {
    return NextResponse.json(
      { message: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const name = body.name?.trim();
  const tags = Array.isArray(body.tags)
    ? body.tags.filter((tag): tag is string => typeof tag === "string")
    : [];
  const slot = body.slot === "beta" ? "beta" : "alpha";

  if (!name) {
    return NextResponse.json({ message: "Missing name" }, { status: 400 });
  }

  const deerResponse = await fetch(DEER_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.DEER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
      messages: [
        {
          content: buildPrompt(name, tags, slot),
          role: "user",
        },
      ],
      model: MODEL,
    }),
  });

  if (!deerResponse.ok) {
    return NextResponse.json(
      { message: `Deer API error: ${await deerResponse.text()}` },
      { status: 502 },
    );
  }

  const payload = (await deerResponse.json()) as DeerResponse;

  if (payload.error?.message) {
    return NextResponse.json(
      { message: payload.error.message },
      { status: 502 },
    );
  }

  const content = payload.choices?.[0]?.message?.content ?? "";
  const match = content.match(
    /!\[.*?\]\((data:image\/\w+;base64,[A-Za-z0-9+/=]+)\)/,
  );

  if (!match) {
    return NextResponse.json(
      { content, message: "No image returned from model" },
      { status: 502 },
    );
  }

  return NextResponse.json({ dataUrl: match[1] });
}
