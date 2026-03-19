import { listBattlePackages } from "@/lib/arena-store";
import { zhihuFetchJson } from "@/lib/zhihu";
import { buildArenaCompetitorId } from "@/lib/arena-identity";
import type {
  ArenaParticipantPersonaSnapshot,
  ArenaParticipantRef,
  ArenaParticipantSlot,
  ArenaParticipantSource,
  BattlePackage,
  FighterProfile,
  ParticipantProvider,
  SecondMeShade,
  SecondMeSoftMemory,
} from "@/lib/arena-types";

const unique = (items: Array<string | null | undefined>) =>
  [...new Set(items.map((item) => item?.trim()).filter(Boolean) as string[])];

const readString = (value: unknown) =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

const readStringArray = (value: unknown) =>
  Array.isArray(value)
    ? value
        .map((item) => (typeof item === "string" ? item.trim() : ""))
        .filter(Boolean)
    : [];

const clampText = (value: string | null | undefined, max: number) => {
  const trimmed = value?.trim();

  if (!trimmed) {
    return null;
  }

  return trimmed.length > max
    ? `${trimmed.slice(0, Math.max(1, max - 3)).trim()}...`
    : trimmed;
};

const clampList = (
  values: Array<string | null | undefined>,
  maxItems: number,
  maxChars: number,
) =>
  unique(values.map((item) => clampText(item ?? null, maxChars))).slice(
    0,
    maxItems,
  );

const createShadeList = (labels: string[], prefix: string): SecondMeShade[] =>
  labels.map((label, index) => ({
    id: `${prefix}:shade:${index}`,
    label,
    name: label,
  }));

const createMemoryList = (
  anchors: string[],
  prefix: string,
): SecondMeSoftMemory[] =>
  anchors.map((memory, index) => ({
    id: `${prefix}:memory:${index}`,
    summary: memory,
    text: memory,
  }));

const sanitizePersonaSnapshot = (
  snapshot: ArenaParticipantPersonaSnapshot,
): ArenaParticipantPersonaSnapshot => ({
  ...snapshot,
  archetype: clampText(snapshot.archetype ?? null, 80),
  aura: clampText(snapshot.aura ?? null, 80),
  avatarUrl: clampText(snapshot.avatarUrl ?? null, 400),
  bio: clampText(snapshot.bio ?? null, 220),
  candidateId: snapshot.candidateId.trim(),
  declaration: clampText(snapshot.declaration ?? null, 220),
  displayId: clampText(snapshot.displayId ?? null, 120),
  displayName: clampText(snapshot.displayName, 80) ?? "Anonymous Persona",
  memoryAnchors: clampList(snapshot.memoryAnchors ?? [], 4, 160),
  participantId: clampText(snapshot.participantId ?? null, 160) ?? undefined,
  route: clampText(snapshot.route ?? null, 160),
  rule: clampText(snapshot.rule ?? null, 180),
  secondMeUserId: clampText(snapshot.secondMeUserId ?? null, 120),
  shades: clampList(snapshot.shades ?? [], 6, 24),
  soulSeedTags: clampList(snapshot.soulSeedTags ?? [], 6, 24),
  sourceLabel: clampText(snapshot.sourceLabel ?? null, 80),
  taboo: clampText(snapshot.taboo ?? null, 180),
  viewpoints: clampList(snapshot.viewpoints ?? [], 4, 180),
});

export const buildParticipantRefFromPersona = ({
  slot,
  snapshot,
}: {
  slot: ArenaParticipantSlot;
  snapshot: ArenaParticipantPersonaSnapshot;
}): ArenaParticipantRef => {
  const sanitized = sanitizePersonaSnapshot(snapshot);

  return {
    candidateId: sanitized.candidateId,
    participantId: sanitized.participantId,
    provider: sanitized.provider,
    slot,
    sourceSnapshot: sanitized,
  };
};

export const buildPersonaSnapshotFromSource = (
  source: ArenaParticipantSource,
): ArenaParticipantPersonaSnapshot | null => {
  if (
    (source.provider !== "history" && source.provider !== "zhihu") ||
    !source.displayName
  ) {
    return null;
  }

  const user = source.user ?? {};
  const sourceMeta = source.sourceMeta ?? {};
  const memoryAnchors = clampList(
    source.softMemory.map((memory) =>
      readString(memory.summary) ??
      readString(memory.text) ??
      readString(memory.content) ??
      readString(memory.title),
    ),
    4,
    160,
  );
  const shades = clampList(
    source.shades.map((shade) => readString(shade.label) ?? readString(shade.name)),
    6,
    24,
  );

  return sanitizePersonaSnapshot({
    archetype:
      readString(user.arenaArchetype) ??
      readString(sourceMeta.archetype) ??
      null,
    aura: readString(user.arenaAura) ?? readString(sourceMeta.aura) ?? null,
    avatarUrl: source.avatarUrl ?? null,
    bio:
      readString(user.bio) ??
      readString(user.selfIntroduction) ??
      readString(user.arenaDeclaration) ??
      null,
    candidateId:
      source.candidateId ??
      `${source.provider}:${source.displayId ?? source.participantId ?? source.displayName}`,
    declaration: readString(user.arenaDeclaration) ?? readString(user.bio) ?? null,
    displayId: source.displayId ?? null,
    displayName: source.displayName,
    memoryAnchors,
    participantId: source.participantId,
    provider: source.provider,
    route: readString(user.route),
    rule: readString(user.arenaRule),
    secondMeUserId: source.secondMeUserId ?? null,
    shades,
    soulSeedTags: clampList(readStringArray(user.arenaSoulSeedTags), 6, 24),
    sourceLabel: source.sourceLabel ?? null,
    sourceMeta,
    taboo: readString(user.arenaTaboo),
    viewpoints: clampList(readStringArray(user.arenaViewpoints), 4, 180),
  });
};

const createDisconnectedPersonaSource = (
  ref: ArenaParticipantRef,
  issue?: string,
): ArenaParticipantSource => ({
  avatarUrl: null,
  candidateId: ref.candidateId,
  connected: false,
  displayId: null,
  displayName: null,
  issues: issue ? [issue] : [],
  participantId: ref.participantId,
  provider: ref.provider,
  runtimeReady: false,
  secondMeUserId: null,
  session: {
    authenticated: false,
    expiresAt: null,
  },
  shades: [],
  slot: ref.slot,
  softMemory: [],
  sourceLabel:
    ref.provider === "history" ? "历史战绩玩家" : "知乎真实用户",
  sourceMeta: {
    provider: ref.provider,
  },
  user: null,
});

export const buildPersonaParticipantSource = (
  ref: ArenaParticipantRef,
): ArenaParticipantSource => {
  const snapshot = ref.sourceSnapshot
    ? sanitizePersonaSnapshot(ref.sourceSnapshot)
    : null;

  if (!snapshot) {
    return createDisconnectedPersonaSource(ref);
  }

  const sourceMeta = {
    provider: ref.provider,
    ...(snapshot.sourceMeta ?? {}),
  } satisfies Record<string, unknown>;

  return {
    avatarUrl: snapshot.avatarUrl ?? null,
    candidateId: snapshot.candidateId,
    connected: true,
    displayId: snapshot.displayId ?? null,
    displayName: snapshot.displayName,
    issues: [],
    participantId: snapshot.participantId ?? snapshot.candidateId,
    provider: ref.provider,
    runtimeReady: false,
    secondMeUserId: snapshot.secondMeUserId ?? null,
    session: {
      authenticated: false,
      expiresAt: null,
    },
    shades: createShadeList(snapshot.shades ?? [], snapshot.candidateId),
    slot: ref.slot,
    softMemory: createMemoryList(
      snapshot.memoryAnchors ?? [],
      snapshot.candidateId,
    ),
    sourceLabel:
      snapshot.sourceLabel ??
      (ref.provider === "history" ? "历史战绩玩家" : "知乎真实用户"),
    sourceMeta,
    user: {
      arenaArchetype: snapshot.archetype ?? undefined,
      arenaAura: snapshot.aura ?? undefined,
      arenaDeclaration: snapshot.declaration ?? undefined,
      arenaRule: snapshot.rule ?? undefined,
      arenaSoulSeedTags: snapshot.soulSeedTags ?? [],
      arenaTaboo: snapshot.taboo ?? undefined,
      arenaViewpoints: snapshot.viewpoints ?? [],
      avatarUrl: snapshot.avatarUrl ?? undefined,
      bio: snapshot.bio ?? snapshot.declaration ?? undefined,
      displayId: snapshot.displayId ?? undefined,
      route:
        snapshot.route ??
        (snapshot.displayId
          ? `${snapshot.provider}/${snapshot.displayId}`
          : undefined),
      sourceLabel: snapshot.sourceLabel ?? undefined,
    },
  };
};

const readIdentityProvider = (
  sourceMeta: Record<string, unknown> | null | undefined,
  fallback: ParticipantProvider,
) => {
  const identityProvider = readString(sourceMeta?.identityProvider);

  if (
    identityProvider === "secondme" ||
    identityProvider === "openclaw" ||
    identityProvider === "history" ||
    identityProvider === "zhihu"
  ) {
    return identityProvider;
  }

  return fallback;
};

const createHistorySnapshotFromFighter = (
  fighter: FighterProfile,
  battle: BattlePackage,
): ArenaParticipantPersonaSnapshot => {
  const fighterSourceMeta = (fighter.source.sourceMeta ??
    null) as Record<string, unknown> | null;
  const identityProvider = readIdentityProvider(
    fighterSourceMeta,
    fighter.source.provider,
  );
  const displayId =
    readString(fighterSourceMeta?.identityDisplayId) ??
    fighter.source.displayId ??
    null;
  const participantId =
    readString(fighterSourceMeta?.identityParticipantId) ??
    fighter.source.participantId ??
    undefined;
  const secondMeUserId =
    readString(fighterSourceMeta?.identitySecondMeUserId) ??
    fighter.source.secondMeUserId ??
    null;
  const competitorId = buildArenaCompetitorId({
    displayId,
    displayName: fighter.displayName,
    participantId,
    provider: identityProvider,
    secondMeUserId,
    slot: fighter.source.slot,
  });

  return sanitizePersonaSnapshot({
    archetype: fighter.archetype,
    aura: fighter.aura,
    avatarUrl: fighter.source.avatarUrl ?? null,
    bio: fighter.declaration,
    candidateId: `history:${competitorId}`,
    declaration: fighter.declaration,
    displayId,
    displayName: fighter.displayName,
    memoryAnchors: fighter.memoryAnchors,
    participantId,
    provider: "history",
    route:
      displayId && identityProvider !== "history"
        ? `${identityProvider}/${displayId}`
        : null,
    rule: fighter.buildInputSnapshot.rule,
    secondMeUserId,
    shades: fighter.buildInputSnapshot.soulSeedTags,
    soulSeedTags: fighter.buildInputSnapshot.soulSeedTags,
    sourceLabel: "历史战绩玩家",
    sourceMeta: {
      archetype: fighter.archetype,
      aura: fighter.aura,
      derivedFromBattleId: battle.id,
      derivedFromRoomTitle: battle.roomTitle,
      identityDisplayId: displayId,
      identityParticipantId: participantId ?? null,
      identityProvider,
      identitySecondMeUserId: secondMeUserId,
      lastBattleAt: battle.createdAt,
      originalProvider: identityProvider,
      originalSlot: fighter.source.slot,
    },
    taboo: fighter.buildInputSnapshot.taboo,
    viewpoints: fighter.buildInputSnapshot.viewpoints,
  });
};

export const listHistoryParticipantCandidates = async (
  slot: ArenaParticipantSlot,
) => {
  const battles = await listBattlePackages({
    limit: 200,
    order: "desc",
  });
  const candidates = new Map<string, ArenaParticipantSource>();

  for (const battle of battles) {
    if (battle.sourceMeta.generationMode !== "orchestrated") {
      continue;
    }

    for (const fighter of [battle.player, battle.defender]) {
      const snapshot = createHistorySnapshotFromFighter(fighter, battle);

      if (candidates.has(snapshot.candidateId)) {
        continue;
      }

      const participant = buildPersonaParticipantSource(
        buildParticipantRefFromPersona({
          slot,
          snapshot,
        }),
      );

      candidates.set(snapshot.candidateId, participant);
    }
  }

  return [...candidates.values()].sort((left, right) => {
    const leftTime =
      readString(left.sourceMeta?.lastBattleAt) ?? left.displayName ?? "";
    const rightTime =
      readString(right.sourceMeta?.lastBattleAt) ?? right.displayName ?? "";
    return rightTime.localeCompare(leftTime, "zh-CN");
  });
};

const keywordTokens = (text: string) =>
  unique(
    (text.match(/[\p{Script=Han}A-Za-z0-9]{2,12}/gu) ?? [])
      .map((item) => item.trim())
      .filter((item) => item.length >= 2),
  );

const deriveZhihuTags = ({
  bio,
  displayName,
  query,
  snippets,
}: {
  bio: string | null;
  displayName: string;
  query: string;
  snippets: string[];
}) =>
  unique([
    ...keywordTokens(query),
    ...keywordTokens(bio ?? ""),
    ...snippets.flatMap((item) => keywordTokens(item)),
  ])
    .filter((item) => item !== displayName)
    .slice(0, 6);

type ZhihuCandidateSeed = {
  avatarUrl: string | null;
  bio: string | null;
  displayId: string | null;
  displayName: string;
  snippets: string[];
  sourceTypes: string[];
};

const deriveZhihuBio = (seed: ZhihuCandidateSeed, query: string) =>
  clampText(
    seed.bio ??
      seed.snippets[0] ??
      `${seed.displayName} 最近因「${query}」相关讨论进入知乎热榜视野。`,
    220,
  );

const deriveZhihuMemoryAnchors = (seed: ZhihuCandidateSeed, query: string) =>
  clampList(
    [
      ...seed.snippets,
      seed.bio ? `公开简介：${seed.bio}` : null,
      `热榜议题：${query}`,
    ],
    4,
    160,
  );

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const getContextSnippet = (node: Record<string, unknown>) =>
  clampText(
    unique([
      readString(node.title),
      readString(node.excerpt),
      readString(node.description),
      readString(node.headline),
      readString(node.content),
    ]).join(" / "),
    160,
  );

const collectZhihuCandidateSeeds = (
  value: unknown,
  query: string,
  accumulator: Map<string, ZhihuCandidateSeed>,
  contextSnippet?: string | null,
) => {
  if (Array.isArray(value)) {
    value.forEach((item) =>
      collectZhihuCandidateSeeds(item, query, accumulator, contextSnippet),
    );
    return;
  }

  if (!isRecord(value)) {
    return;
  }

  const type = readString(value.type);
  const displayName =
    readString(value.name) ??
    readString(value.nickname) ??
    (type === "member" || type === "people" || type === "author"
      ? readString(value.title)
      : null);
  const displayId =
    readString(value.url_token) ??
    readString(value.urlToken) ??
    readString(value.user_token) ??
    readString(value.token) ??
    readString(value.id);
  const avatarUrl =
    readString(value.avatar_url) ??
    readString(value.avatarUrl) ??
    readString(value.avatar);
  const bio =
    readString(value.headline) ??
    readString(value.description) ??
    readString(value.bio) ??
    readString(value.introduction);
  const userishType =
    type === "member" ||
    type === "people" ||
    type === "author" ||
    type === "user";
  const hasIdentityField = Boolean(displayId || avatarUrl || bio);

  if (displayName && (userishType || hasIdentityField)) {
    const candidateId = `zhihu:${displayId ?? displayName}`;
    const current = accumulator.get(candidateId);
    const snippets = clampList(
      [
        ...(current?.snippets ?? []),
        contextSnippet,
        getContextSnippet(value),
        query,
      ],
      4,
      160,
    );

    accumulator.set(candidateId, {
      avatarUrl: current?.avatarUrl ?? avatarUrl ?? null,
      bio: current?.bio ?? bio ?? null,
      displayId: current?.displayId ?? displayId ?? null,
      displayName,
      snippets,
      sourceTypes: unique([...(current?.sourceTypes ?? []), type]),
    });
  }

  const nextContext = contextSnippet ?? getContextSnippet(value);

  for (const child of Object.values(value)) {
    if (typeof child === "object" && child) {
      collectZhihuCandidateSeeds(child, query, accumulator, nextContext);
    }
  }
};

export const searchZhihuParticipantCandidates = async ({
  query,
  slot,
}: {
  query: string;
  slot: ArenaParticipantSlot;
}) => {
  const trimmedQuery = query.trim();

  if (!trimmedQuery) {
    return [];
  }

  const payload = await zhihuFetchJson<Record<string, unknown>>(
    "/openapi/search/global",
    {
      cacheTtlMs: 10 * 60 * 1000,
      query: {
        count: 8,
        query: trimmedQuery,
      },
      searchMode: true,
    },
  );
  const seeds = new Map<string, ZhihuCandidateSeed>();

  collectZhihuCandidateSeeds(payload, trimmedQuery, seeds);

  return [...seeds.entries()]
    .map(([candidateId, seed]) => {
      const bio = deriveZhihuBio(seed, trimmedQuery);
      const memoryAnchors = deriveZhihuMemoryAnchors(seed, trimmedQuery);
      const tags = deriveZhihuTags({
        bio,
        displayName: seed.displayName,
        query: trimmedQuery,
        snippets: memoryAnchors,
      });

      return buildPersonaParticipantSource(
        buildParticipantRefFromPersona({
          slot,
          snapshot: {
            avatarUrl: seed.avatarUrl,
            bio,
            candidateId,
            declaration:
              bio ??
              `${seed.displayName} 的公开知乎内容会成为这次对战的人格入口。`,
            displayId: seed.displayId,
            displayName: seed.displayName,
            memoryAnchors,
            participantId: seed.displayId ?? candidateId,
            provider: "zhihu",
            route: seed.displayId ? `zhihu/${seed.displayId}` : `zhihu/search/${trimmedQuery}`,
            shades: tags,
            soulSeedTags: tags,
            sourceLabel: "知乎实时热榜 NPC",
            sourceMeta: {
              importedFromQuery: trimmedQuery,
              sourceTypes: seed.sourceTypes,
            },
            taboo: "禁止凭空编造该知乎用户未公开表达过的人生经历。",
            viewpoints: clampList(memoryAnchors, 3, 160),
          },
        }),
      );
    })
    .sort((left, right) =>
      (right.displayName ?? "").localeCompare(left.displayName ?? "", "zh-CN"),
    );
};

const shuffle = <T>(items: T[]) => {
  const next = [...items];

  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }

  return next;
};

export const getRealtimeZhihuBillboardHeadlines = async () => {
  const payload = await zhihuFetchJson<{
    data?: {
      list?: Array<{
        title?: string;
      }>;
    };
  }>("/openapi/billboard/list", {
    cacheTtlMs: 5 * 60 * 1000,
    query: {
      publish_in_hours: 48,
      top_cnt: 8,
    },
  });

  return (payload.data?.list ?? [])
    .map((item) => item.title?.trim())
    .filter((item): item is string => Boolean(item));
};

export const getRandomZhihuParticipantCandidate = async ({
  slot,
}: {
  slot: ArenaParticipantSlot;
}) => {
  const headlines = await getRealtimeZhihuBillboardHeadlines();
  const fallbackQueries = [
    "AI",
    "创业",
    "产品经理",
    "编程",
    "游戏",
    "设计",
  ];
  const candidateQueries = shuffle(
    headlines.length ? headlines : fallbackQueries,
  ).slice(0, 3);
  const candidates = (
    await Promise.all(
      candidateQueries.map((query) =>
        searchZhihuParticipantCandidates({
          query,
          slot,
        }).catch(() => []),
      ),
    )
  ).flat();
  const deduped = new Map<string, ArenaParticipantSource>();

  for (const candidate of candidates) {
    const key =
      candidate.candidateId ??
      candidate.participantId ??
      candidate.displayId ??
      candidate.displayName ??
      Math.random().toString(36).slice(2);

    if (!deduped.has(key)) {
      deduped.set(key, candidate);
    }
  }

  if (!deduped.size) {
    return null;
  }

  const pool = [...deduped.values()]
    .map((candidate) => ({
      candidate,
      score:
        readString(candidate.sourceMeta?.importedFromQuery)?.length ?? 0,
    }))
    .sort((left, right) => right.score - left.score)
    .map((item) => item.candidate);
  const chosen = pool[Math.floor(Math.random() * pool.length)] ?? null;

  if (!chosen) {
    return null;
  }

  return {
    ...chosen,
    sourceMeta: {
      ...(chosen.sourceMeta ?? {}),
      billboardHeadlines: candidateQueries,
      matchMode: "realtime_billboard_random",
    },
  } satisfies ArenaParticipantSource;
};
