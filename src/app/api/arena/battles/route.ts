import { createHash } from "node:crypto";

import { NextRequest, NextResponse } from "next/server";

import { resolveArenaParticipants } from "@/lib/arena-participants";
import { createBattlePackage } from "@/lib/arena-engine";
import { saveBattlePackage } from "@/lib/arena-store";
import { fetchSecondMeJsonForSlot } from "@/lib/secondme";
import type { ArenaBattleSetup, BattlePackage } from "@/lib/arena-types";

const idempotencyKey = (slot: string, battleId: string) =>
  createHash("sha256").update(`battle:${slot}:${battleId}`).digest("hex");

const buildMemoryEvent = (battle: BattlePackage, slot: "alpha" | "beta") => {
  const fighter = slot === "alpha" ? battle.player : battle.defender;
  const won = battle.winnerId === fighter.id;

  return {
    action: won ? "battle_win" : "battle_loss",
    actionLabel: won ? "Won battle" : "Lost battle",
    channel: {
      id: battle.id,
      kind: "soul_arena",
      meta: {
        slot,
      },
      url: `/arena/${battle.id}`,
    },
    displayText: `${fighter.displayName} ${won ? "won" : "lost"} ${battle.roomTitle}`,
    eventDesc: `${fighter.displayName} ${won ? "won" : "lost"} a Soul Arena battle.`,
    eventTime: Date.now(),
    idempotencyKey: idempotencyKey(slot, battle.id),
    importance: won ? 0.84 : 0.62,
    payload: {
      finalScore: battle.finalScore,
      roomTitle: battle.roomTitle,
      topicId: battle.topic.id,
      winnerId: battle.winnerId,
    },
    refs: [
      {
        contentPreview: `${battle.roomTitle} | ${fighter.declaration}`,
        objectId: battle.id,
        objectType: "battle",
        snapshot: {
          capturedAt: Date.now(),
          text: `${battle.roomTitle}. Winner: ${battle.winnerId}. ${fighter.displayName}: ${fighter.buildSummary.join(" ")}`,
        },
        type: "battle_result",
        url: `/arena/${battle.id}`,
      },
    ],
  };
};

export async function POST(request: NextRequest) {
  const body = (await request.json()) as Partial<ArenaBattleSetup>;

  if (!body.topicId || !body.participants?.length) {
    return NextResponse.json(
      {
        message: "topicId and participants are required",
      },
      { status: 400 },
    );
  }

  const participants = await resolveArenaParticipants(body.participants);
  const disconnected = participants.filter((participant) => !participant.connected);

  if (disconnected.length > 0) {
    return NextResponse.json(
      {
        message: "Both participants must be connected to SecondMe",
        participants,
      },
      { status: 400 },
    );
  }

  const battle = await createBattlePackage(body as ArenaBattleSetup, participants);
  saveBattlePackage(battle);
  await Promise.allSettled(
    body.participants
      .filter(
        (participant): participant is { provider: "secondme"; slot: "alpha" | "beta" } =>
          participant.provider === "secondme" &&
          (participant.slot === "alpha" || participant.slot === "beta"),
      )
      .map((participant) =>
        fetchSecondMeJsonForSlot<{ eventId?: string; isDuplicate?: boolean }>(
          participant.slot,
          "/api/secondme/agent_memory/ingest",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(buildMemoryEvent(battle, participant.slot)),
          },
        ),
      ),
  );

  return NextResponse.json(battle);
}
