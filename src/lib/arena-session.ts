import { randomUUID } from "node:crypto";

import { cookies } from "next/headers";

import type {
  ArenaParticipantRef,
  ArenaParticipantSlot,
  ParticipantProvider,
} from "@/lib/arena-types";

const sessionCookie = "soul_arena_session_id";
const providerCookie = (slot: ArenaParticipantSlot) => `soul_arena_provider_${slot}`;
const participantRefCookie = (slot: ArenaParticipantSlot) =>
  `soul_arena_participant_ref_${slot}`;
const cookieOptions = {
  httpOnly: true,
  maxAge: 60 * 60 * 24 * 30,
  path: "/",
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
};

const normalizeProvider = (value?: string | null): ParticipantProvider =>
  value === "openclaw" ||
  value === "history" ||
  value === "zhihu"
    ? value
    : "secondme";

const encodeParticipantRef = (ref: ArenaParticipantRef) =>
  Buffer.from(JSON.stringify(ref)).toString("base64url");

const decodeParticipantRef = (value?: string | null) => {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(value, "base64url").toString("utf8"),
    ) as ArenaParticipantRef;

    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
};

export const getArenaSessionId = async () => {
  const cookieStore = await cookies();
  const current = cookieStore.get(sessionCookie)?.value;

  if (current) {
    return current;
  }

  const created = randomUUID();
  cookieStore.set(sessionCookie, created, cookieOptions);
  return created;
};

export const getActiveParticipantProvider = async (
  slot: ArenaParticipantSlot,
) => {
  const cookieStore = await cookies();
  return normalizeProvider(cookieStore.get(providerCookie(slot))?.value);
};

export const setActiveParticipantProvider = async ({
  provider,
  slot,
}: {
  provider: ParticipantProvider;
  slot: ArenaParticipantSlot;
}) => {
  const cookieStore = await cookies();
  cookieStore.set(providerCookie(slot), provider, cookieOptions);
};

export const getSelectedParticipantRef = async (slot: ArenaParticipantSlot) => {
  const cookieStore = await cookies();
  return decodeParticipantRef(cookieStore.get(participantRefCookie(slot))?.value);
};

export const setSelectedParticipantRef = async ({
  ref,
  slot,
}: {
  ref: ArenaParticipantRef;
  slot: ArenaParticipantSlot;
}) => {
  const cookieStore = await cookies();
  cookieStore.set(
    participantRefCookie(slot),
    encodeParticipantRef({
      ...ref,
      slot,
    }),
    cookieOptions,
  );
};

export const clearSelectedParticipantRef = async (slot: ArenaParticipantSlot) => {
  const cookieStore = await cookies();
  cookieStore.delete(participantRefCookie(slot));
};
