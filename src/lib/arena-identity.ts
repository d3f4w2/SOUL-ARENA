import type {
  ArenaParticipantSlot,
  ParticipantProvider,
} from "@/lib/arena-types";

const toSlug = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");

export const buildArenaCompetitorId = ({
  displayId,
  displayName,
  participantId,
  provider,
  secondMeUserId,
  slot,
}: {
  displayId?: string | null;
  displayName: string;
  participantId?: string;
  provider: ParticipantProvider;
  secondMeUserId?: string | null;
  slot?: ArenaParticipantSlot | null;
}) => {
  const stablePart =
    provider === "secondme"
      ? secondMeUserId?.trim() ||
        participantId?.trim() ||
        `${slot ?? "unknown"}:${toSlug(displayName) || "anonymous"}`
      : displayId?.trim() ||
        participantId?.trim() ||
        secondMeUserId?.trim() ||
        `${slot ?? "unknown"}:${toSlug(displayName) || "anonymous"}`;

  return `${provider}:${stablePart}`;
};
