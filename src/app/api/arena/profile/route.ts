import { NextRequest, NextResponse } from "next/server";

import {
  getArenaCompetitorProfile,
  getArenaProfilesForParticipants,
} from "@/lib/arena-competition";
import { listArenaParticipants } from "@/lib/arena-participants";

export async function GET(request: NextRequest) {
  const competitorIds = request.nextUrl.searchParams
    .getAll("competitorId")
    .map((value) => value.trim())
    .filter(Boolean);
  const slots = request.nextUrl.searchParams
    .getAll("slot")
    .filter((slot): slot is "alpha" | "beta" => slot === "alpha" || slot === "beta");

  if (competitorIds.length) {
    const profiles = await Promise.all(
      competitorIds.map(async (competitorId) => ({
        competitorId,
        profile: await getArenaCompetitorProfile(competitorId),
      })),
    );

    return NextResponse.json({
      profiles,
    });
  }

  if (slots.length) {
    const participants = await listArenaParticipants();
    const profiles = (await getArenaProfilesForParticipants(participants)).filter(
      (entry) => slots.includes(entry.slot),
    );

    return NextResponse.json({
      profiles,
    });
  }

  return NextResponse.json(
    {
      message: "请提供 competitorId 或 slot 查询参数",
    },
    { status: 400 },
  );
}
