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

const duplicateIdentityIssue =
  "当前甲方和乙方是同一个 SecondMe 账号，这通常是因为第二次授权复用了同一浏览器登录态。";

export const participantSlotLabel = (slot: ArenaParticipantSlot) =>
  slot === "alpha" ? "甲方" : "乙方";

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
        : "读取用户资料失败",
    );
  }

  if (shadesResult.status === "rejected") {
    issues.push(
      shadesResult.reason instanceof Error
        ? shadesResult.reason.message
        : "读取标签失败",
    );
  }

  if (memoryResult.status === "rejected") {
    issues.push(
      memoryResult.reason instanceof Error
        ? memoryResult.reason.message
        : "读取软记忆失败",
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
      issues: [`Provider ${ref.provider} 尚未实现`],
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

const annotateDuplicateIdentityIssues = (
  participants: ArenaParticipantSource[],
) => {
  const secondMeIds = participants
    .filter(
      (participant) =>
        participant.connected &&
        participant.provider === "secondme" &&
        typeof participant.secondMeUserId === "string" &&
        participant.secondMeUserId.trim().length > 0,
    )
    .map((participant) => participant.secondMeUserId as string);

  const duplicatedSecondMeId =
    secondMeIds.length >= 2 && secondMeIds.every((id) => id === secondMeIds[0])
      ? secondMeIds[0]
      : null;

  if (!duplicatedSecondMeId) {
    return participants;
  }

  return participants.map((participant) => {
    if (participant.secondMeUserId !== duplicatedSecondMeId) {
      return participant;
    }

    return {
      ...participant,
      issues: unique([...participant.issues, duplicateIdentityIssue]),
    };
  });
};

export const listArenaParticipants = async () =>
  annotateDuplicateIdentityIssues(
    await Promise.all(
      getSecondMeAuthSlots().map((slot) =>
        getArenaParticipantSource({
          provider: "secondme",
          slot,
        }),
      ),
    ),
  );

export const resolveArenaParticipants = async (refs: ArenaParticipantRef[]) =>
  annotateDuplicateIdentityIssues(
    await Promise.all(refs.map((ref) => getArenaParticipantSource(ref))),
  );

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
    source.displayName ? `身份锚点：${source.displayName}` : null,
    route ? `主页路由：${route}` : null,
    topShades.length ? `核心标签：${topShades.join("、")}` : null,
    bio ? `简介锚点：${bio}` : null,
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
  const fallbackName = `${participantSlotLabel(source.slot)}人格`;
  const baseDisplayName = source.displayName ?? fallbackName;
  const viewpoints = unique([
    memoryAnchors[0] ? `我会从这段真实记忆出发：${memoryAnchors[0]}` : null,
    topShades.length
      ? `我的人格重心围绕 ${topShades.join("、")} 展开。`
      : null,
    identitySummary[1] ?? identitySummary[0] ?? null,
    "我偏好从稳定的人格与真实经历出发，而不是空转口号。",
  ]).slice(0, 3);

  while (viewpoints.length < 3) {
    viewpoints.push(
      `我会守住 ${baseDisplayName} 的真实视角，而不是泛化修辞。`,
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
        topShades[0] ? `我不会背离 ${topShades[0]} 这个人格标签。` : null,
      ]
        .filter(Boolean)
        .join(" "),
      150,
    ) ||
    `${baseDisplayName} 将带着真实记忆支撑的立场登场。`;

  return {
    declaration,
    displayName: override?.displayName?.trim() || baseDisplayName,
    rule:
      override?.rule?.trim() ||
      "每个主张都必须落回身份锚点、具体记忆和可观察结果。",
    soulSeedTags: unique([
      ...(override?.soulSeedTags ?? []),
      baseDisplayName,
      ...topShades,
    ]).slice(0, 6),
    taboo:
      override?.taboo?.trim() ||
      "禁止违背既有身份锚点，也禁止编造不存在的记忆。",
    viewpoints: mergedViewpoints,
  };
};
