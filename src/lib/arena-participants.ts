import { getActiveParticipantProvider } from "@/lib/arena-session";
import { getOpenClawParticipantSource } from "@/lib/openclaw";
import type {
  ArenaParticipantRef,
  ArenaParticipantSlot,
  ArenaParticipantSource,
  FighterBuildInput,
  OpenClawBindingInput,
  ParticipantBuildOverride,
  SecondMeShade,
  SecondMeSoftMemory,
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
    memory.factContent,
    memory.factObject,
  ].find(
    (item) => typeof item === "string" && item.trim().length > 0,
  )?.trim() ?? "";

const shadeLabel = (shade: SecondMeShade) =>
  [shade.label, shade.name]
    .find((item) => typeof item === "string" && item.trim().length > 0)
    ?.trim() ?? "";

const trimSentence = (value: string, max = 140) =>
  value.length > max ? `${value.slice(0, max - 3).trim()}...` : value;

const readString = (value: unknown) =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

const readStringArray = (value: unknown) =>
  Array.isArray(value)
    ? value
        .map((item) => (typeof item === "string" ? item.trim() : ""))
        .filter(Boolean)
    : [];

const fallbackShadeDefinitions = [
  {
    keywords: ["测试", "test", "验证", "调试", "回归"],
    label: "测试驱动",
  },
  {
    keywords: ["功能", "流程", "能力", "接入", "验证"],
    label: "功能验证",
  },
  {
    keywords: ["记忆", "memory", "锚点", "回忆", "fact"],
    label: "记忆锚定",
  },
  {
    keywords: ["技术", "代码", "工程", "程序", "开发"],
    label: "技术探索",
  },
  {
    keywords: ["规则", "规范", "约束", "纪律"],
    label: "规则敏感",
  },
  {
    keywords: ["分析", "理性", "逻辑", "判断", "推断"],
    label: "理性分析",
  },
  {
    keywords: ["背景", "身份", "画像", "自我介绍"],
    label: "身份表达",
  },
  {
    keywords: ["兴趣", "探索", "尝试", "体验", "发现"],
    label: "探索倾向",
  },
  {
    keywords: ["交流", "沟通", "聊天", "表达", "你好"],
    label: "表达倾向",
  },
] as const;

const normalizeSecondMeUser = (
  user: SecondMeUserInfo | null,
): SecondMeUserInfo | null => {
  if (!user) {
    return null;
  }

  const normalizedId =
    readString(user.secondMeId) ??
    readString(user.id) ??
    readString(user.userId);
  const normalizedAvatarUrl =
    readString(user.avatarUrl) ?? readString(user.avatar);
  const normalizedBio =
    readString(user.bio) ?? readString(user.selfIntroduction);

  return {
    ...user,
    ...(normalizedId ? { id: normalizedId, secondMeId: normalizedId, userId: normalizedId } : {}),
    ...(normalizedAvatarUrl ? { avatarUrl: normalizedAvatarUrl } : {}),
    ...(normalizedBio ? { bio: normalizedBio } : {}),
  };
};

const normalizeSecondMeSoftMemory = (
  memory: SecondMeSoftMemory,
): SecondMeSoftMemory => {
  const normalizedTitle =
    readString(memory.title) ?? readString(memory.factObject) ?? undefined;
  const normalizedText =
    readString(memory.summary) ??
    readString(memory.text) ??
    readString(memory.content) ??
    readString(memory.factContent) ??
    readString(memory.factObject) ??
    undefined;

  return {
    ...memory,
    ...(normalizedTitle ? { title: normalizedTitle } : {}),
    ...(normalizedText
      ? {
          content: readString(memory.content) ?? normalizedText,
          summary: readString(memory.summary) ?? normalizedText,
          text: readString(memory.text) ?? normalizedText,
        }
      : {}),
  };
};

const duplicateIdentityIssue =
  "当前甲方和乙方是同一个 SecondMe 账号，这通常是因为第二次授权复用了同一浏览器登录态。";

export const participantSlotLabel = (slot: ArenaParticipantSlot) =>
  slot === "alpha" ? "甲方" : "乙方";

const deriveFallbackShades = ({
  displayName,
  route,
  softMemory,
  user,
}: {
  displayName: string | null;
  route: string | null;
  softMemory: SecondMeSoftMemory[];
  user: SecondMeUserInfo | null;
}): SecondMeShade[] => {
  const bio = readString(user?.bio);
  const selfIntroduction = readString(user?.selfIntroduction);
  const memoryText = softMemory.map(softMemoryText).filter(Boolean).join(" ");
  const corpus = [bio, selfIntroduction, memoryText, route, displayName]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (!corpus) {
    return [];
  }

  const derivedLabels = fallbackShadeDefinitions
    .map((definition) => ({
      label: definition.label,
      score: definition.keywords.reduce(
        (count, keyword) =>
          count + (corpus.includes(keyword.toLowerCase()) ? 1 : 0),
        0,
      ),
    }))
    .filter((entry) => entry.score > 0)
    .sort(
      (left, right) =>
        right.score - left.score ||
        left.label.localeCompare(right.label, "zh-CN"),
    )
    .map((entry) => entry.label);

  const fallbackLabels = unique([
    ...derivedLabels,
    memoryText ? "记忆留痕" : null,
    bio || selfIntroduction ? "自我叙述" : null,
    route ? "独立身份" : null,
  ]).slice(0, 4);

  return fallbackLabels.map((label, index) => ({
    description:
      "Derived locally from available SecondMe profile and memory text.",
    id: `derived:${index}:${label}`,
    label,
    name: label,
  }));
};

const getSecondMeParticipantSource = async (
  slot: SecondMeAuthSlot,
): Promise<ArenaParticipantSource> => {
  const session = await getSecondMeSessionSnapshot(slot);

  if (!session.authenticated) {
    return {
      connected: false,
      displayName: null,
      issues: [],
      participantId: undefined,
      provider: "secondme",
      runtimeReady: true,
      secondMeUserId: null,
      session,
      shades: [],
      slot,
      softMemory: [],
      sourceLabel: "SecondMe OAuth Session",
      sourceMeta: null,
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
      ? normalizeSecondMeUser(userResult.value.data ?? null)
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

  const secondMeUserId =
    readString(user?.secondMeId) ??
    readString(user?.id) ??
    readString(user?.userId) ??
    null;
  const upstreamShades =
    shadesResult.status === "fulfilled"
      ? (shadesResult.value.data?.shades ?? [])
      : [];
  const normalizedSoftMemory =
    memoryResult.status === "fulfilled"
      ? (memoryResult.value.data?.list ?? []).map(normalizeSecondMeSoftMemory)
      : [];
  const normalizedDisplayName =
    readString(user?.name) ?? readString(user?.route) ?? null;
  const normalizedRoute = readString(user?.route);
  const normalizedShades =
    upstreamShades.length > 0
      ? upstreamShades
      : deriveFallbackShades({
          displayName: normalizedDisplayName,
          route: normalizedRoute,
          softMemory: normalizedSoftMemory,
          user,
        });

  return {
    avatarUrl:
      readString(user?.avatarUrl) ?? readString(user?.avatar) ?? null,
    connected: Boolean(user),
    displayName: normalizedDisplayName,
    issues,
    participantId: secondMeUserId ?? undefined,
    provider: "secondme",
    runtimeReady: true,
    secondMeUserId,
    session,
    shades: normalizedShades,
    slot,
    softMemory: normalizedSoftMemory,
    sourceLabel: "SecondMe OAuth Session",
    sourceMeta: {
      provider: "secondme",
      shadeSource: upstreamShades.length > 0 ? "upstream" : "derived_fallback",
    },
    user,
  };
};

export const getArenaParticipantSource = async (
  ref: ArenaParticipantRef,
): Promise<ArenaParticipantSource> => {
  if (ref.provider === "openclaw") {
    return getOpenClawParticipantSource(ref);
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
      getSecondMeAuthSlots().map(async (slot) =>
        getArenaParticipantSource({
          provider: await getActiveParticipantProvider(slot),
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
  const route = readString(user?.route);
  const bio = readString(user?.bio)
    ? trimSentence(readString(user?.bio) as string, 120)
    : null;

  return unique([
    source.displayName ? `身份锚点：${source.displayName}` : null,
    route ? `主页路径：${route}` : null,
    topShades.length ? `核心标签：${topShades.join("、")}` : null,
    source.sourceLabel ? `来源：${source.sourceLabel}` : null,
    bio ? `简介锚点：${bio}` : null,
  ]);
};

export const buildMemoryAnchors = (source: ArenaParticipantSource) => {
  const anchors = unique(source.softMemory.map(softMemoryText));
  return anchors.slice(0, 4).map((item) => trimSentence(item, 120));
};

const getOpenClawProfileInput = (
  source: ArenaParticipantSource,
): OpenClawBindingInput | null => {
  if (source.provider !== "openclaw" || !source.user) {
    return null;
  }

  return {
    archetype:
      readString(source.user.arenaArchetype) ?? undefined,
    aura: readString(source.user.arenaAura) ?? undefined,
    declaration: readString(source.user.arenaDeclaration) ?? "",
    displayName: readString(source.displayName) ?? `${participantSlotLabel(source.slot)}人格`,
    memoryAnchors: buildMemoryAnchors(source),
    rule: readString(source.user.arenaRule) ?? "",
    runtimeLabel: readString(source.user.runtimeLabel) ?? undefined,
    soulSeedTags: readStringArray(source.user.arenaSoulSeedTags),
    sourceLabel: readString(source.user.sourceLabel) ?? undefined,
    taboo: readString(source.user.arenaTaboo) ?? "",
    tags: source.shades.map(shadeLabel).filter(Boolean),
    viewpoints: readStringArray(source.user.arenaViewpoints),
  };
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
  const openclawProfile = getOpenClawProfileInput(source);

  const baseViewpoints = unique([
    ...readStringArray(source.user?.arenaViewpoints),
    memoryAnchors[0] ? `我会从这段真实记忆出发：${memoryAnchors[0]}` : null,
    topShades.length ? `我的人格重心围绕 ${topShades.join("、")} 展开。` : null,
    identitySummary[1] ?? identitySummary[0] ?? null,
    "我偏好从稳定的人格与真实经历出发，而不是空转口号。",
  ]).slice(0, 3);

  while (baseViewpoints.length < 3) {
    baseViewpoints.push(`我会守住 ${baseDisplayName} 的真实视角，而不是泛化修辞。`);
  }

  const mergedViewpoints = unique([
    ...(override?.viewpoints ?? []),
    ...(openclawProfile?.viewpoints ?? []),
    ...baseViewpoints,
  ]).slice(0, 3);

  const declaration =
    override?.declaration?.trim() ||
    openclawProfile?.declaration ||
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
      openclawProfile?.rule ||
      "每个主张都必须落回身份锚点、具体记忆和可观察结果。",
    soulSeedTags: unique([
      ...(override?.soulSeedTags ?? []),
      ...(openclawProfile?.soulSeedTags ?? []),
      baseDisplayName,
      ...topShades,
    ]).slice(0, 6),
    taboo:
      override?.taboo?.trim() ||
      openclawProfile?.taboo ||
      "禁止违背既有身份锚点，也禁止编造不存在的记忆。",
    viewpoints: mergedViewpoints,
  };
};
