import type {
  ArenaParticipantRef,
  ArenaParticipantSlot,
  ArenaParticipantSource,
  ParticipantBuildOverride,
  SecondMeShade,
  SecondMeSoftMemory,
  FighterBuildInput,
} from "@/lib/arena-types";
import {
  fetchSecondMeJsonForSlot,
  getSecondMeAuthSlots,
  getSecondMeSessionSnapshot,
  type SecondMeAuthSlot,
  type SecondMeUserInfo,
} from "@/lib/secondme";

const unique = (items: Array<string | null | undefined>) =>
  [...new Set(items.map((item) => item?.trim()).filter(Boolean) as string[])];

const softMemoryText = (memory: SecondMeSoftMemory) =>
  [
    memory.summary,
    memory.text,
    memory.content,
    memory.title,
  ].find((item) => typeof item === "string" && item.trim().length > 0)?.trim() ??
  "";

const shadeLabel = (shade: SecondMeShade) =>
  [shade.label, shade.name]
    .find((item) => typeof item === "string" && item.trim().length > 0)
    ?.trim() ?? "";

const trimSentence = (value: string, max = 140) =>
  value.length > max ? `${value.slice(0, max - 3).trim()}...` : value;

export const participantSlotLabel = (slot: ArenaParticipantSlot) =>
  slot === "alpha" ? "Alpha" : "Beta";

const getSecondMeParticipantSource = async (
  slot: SecondMeAuthSlot,
): Promise<ArenaParticipantSource> => {
  const session = await getSecondMeSessionSnapshot(slot);

  if (!session.authenticated) {
    return {
      connected: false,
      displayName: null,
      issues: [],
      provider: "secondme",
      secondMeUserId: null,
      session,
      shades: [],
      slot,
      softMemory: [],
      user: null,
    };
  }

  const [userResult, shadesResult, memoryResult] = await Promise.allSettled([
    fetchSecondMeJsonForSlot<SecondMeUserInfo>(slot, "/api/secondme/user/info"),
    fetchSecondMeJsonForSlot<{ shades?: SecondMeShade[] }>(
      slot,
      "/api/secondme/user/shades",
    ),
    fetchSecondMeJsonForSlot<{ list?: SecondMeSoftMemory[] }>(
      slot,
      "/api/secondme/user/softmemory",
    ),
  ]);

  const issues: string[] = [];
  const user =
    userResult.status === "fulfilled"
      ? (userResult.value.data ?? null)
      : null;

  if (userResult.status === "rejected") {
    issues.push(
      userResult.reason instanceof Error
        ? userResult.reason.message
        : "Failed to fetch user info",
    );
  }

  if (shadesResult.status === "rejected") {
    issues.push(
      shadesResult.reason instanceof Error
        ? shadesResult.reason.message
        : "Failed to fetch shades",
    );
  }

  if (memoryResult.status === "rejected") {
    issues.push(
      memoryResult.reason instanceof Error
        ? memoryResult.reason.message
        : "Failed to fetch soft memory",
    );
  }

  return {
    connected: Boolean(user),
    displayName:
      (typeof user?.name === "string" && user.name.trim()) ||
      (typeof user?.route === "string" && user.route.trim()) ||
      null,
    issues,
    provider: "secondme",
    secondMeUserId:
      (typeof user?.secondMeId === "string" && user.secondMeId) ||
      (typeof user?.id === "string" && user.id) ||
      null,
    session,
    shades:
      shadesResult.status === "fulfilled"
        ? (shadesResult.value.data?.shades ?? [])
        : [],
    slot,
    softMemory:
      memoryResult.status === "fulfilled"
        ? (memoryResult.value.data?.list ?? [])
        : [],
    user,
  };
};

export const getArenaParticipantSource = async (
  ref: ArenaParticipantRef,
): Promise<ArenaParticipantSource> => {
  if (ref.provider !== "secondme") {
    return {
      connected: false,
      displayName: null,
      issues: [`Provider ${ref.provider} is not implemented yet`],
      provider: ref.provider,
      secondMeUserId: null,
      session: {
        authenticated: false,
        expiresAt: null,
      },
      shades: [],
      slot: ref.slot,
      softMemory: [],
      user: null,
    };
  }

  return getSecondMeParticipantSource(ref.slot);
};

export const listArenaParticipants = async () =>
  Promise.all(
    getSecondMeAuthSlots().map((slot) =>
      getArenaParticipantSource({
        provider: "secondme",
        slot,
      }),
    ),
  );

export const resolveArenaParticipants = async (refs: ArenaParticipantRef[]) =>
  Promise.all(refs.map((ref) => getArenaParticipantSource(ref)));

export const buildIdentitySummary = (source: ArenaParticipantSource) => {
  const user = source.user as SecondMeUserInfo | null;
  const topShades = source.shades.map(shadeLabel).filter(Boolean).slice(0, 3);
  const route =
    typeof user?.route === "string" && user.route.trim().length > 0
      ? user.route.trim()
      : null;
  const bio =
    typeof user?.bio === "string" && user.bio.trim().length > 0
      ? trimSentence(user.bio.trim(), 120)
      : null;

  return unique([
    source.displayName ? `Identity: ${source.displayName}` : null,
    route ? `Route: ${route}` : null,
    topShades.length ? `Primary shades: ${topShades.join(", ")}` : null,
    bio ? `Bio anchor: ${bio}` : null,
  ]);
};

export const buildMemoryAnchors = (source: ArenaParticipantSource) => {
  const anchors = unique(source.softMemory.map(softMemoryText));
  return anchors.slice(0, 4).map((item) => trimSentence(item, 120));
};

export const buildFighterInputFromParticipant = (
  source: ArenaParticipantSource,
  override?: ParticipantBuildOverride,
): FighterBuildInput => {
  const identitySummary = buildIdentitySummary(source);
  const memoryAnchors = buildMemoryAnchors(source);
  const topShades = source.shades.map(shadeLabel).filter(Boolean).slice(0, 4);
  const fallbackName = `${participantSlotLabel(source.slot)} Fighter`;
  const baseDisplayName = source.displayName ?? fallbackName;
  const viewpoints = unique([
    memoryAnchors[0] ? `A lived memory anchor: ${memoryAnchors[0]}` : null,
    topShades.length
      ? `My profile clusters around ${topShades.join(", ")}.`
      : null,
    identitySummary[1] ?? identitySummary[0] ?? null,
    "I prefer arguments that stay grounded in a stable personal identity.",
  ]).slice(0, 3);

  while (viewpoints.length < 3) {
    viewpoints.push(
      `I protect the perspective of ${baseDisplayName} rather than generic rhetoric.`,
    );
  }

  const mergedViewpoints = unique([
    ...(override?.viewpoints ?? []),
    ...viewpoints,
  ]).slice(0, 3);

  const declaration =
    override?.declaration?.trim() ||
    trimSentence(
      [
        identitySummary[0],
        memoryAnchors[0],
        topShades[0] ? `I will not betray the shade ${topShades[0]}.` : null,
      ]
        .filter(Boolean)
        .join(" "),
      150,
    ) ||
    `${baseDisplayName} enters with a memory-backed position.`;

  return {
    declaration,
    displayName: override?.displayName?.trim() || baseDisplayName,
    rule:
      override?.rule?.trim() ||
      `Keep every claim grounded in identity anchors, specific memories, and observable consequences.`,
    soulSeedTags: unique([
      ...(override?.soulSeedTags ?? []),
      baseDisplayName,
      ...topShades,
    ]).slice(0, 6),
    taboo:
      override?.taboo?.trim() ||
      `Do not contradict the established identity anchors or invent memories that do not exist.`,
    viewpoints: mergedViewpoints,
  };
};
