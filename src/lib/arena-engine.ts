import { createHash, randomUUID } from "node:crypto";

import {
  buildFighterInputFromParticipant,
  buildIdentitySummary,
  buildMemoryAnchors,
  participantSlotLabel,
} from "@/lib/arena-participants";
import { soulLabels, topicPresets } from "@/lib/arena-presets";
import { fetchSecondMeActForSlot } from "@/lib/secondme";
import type {
  ArenaBattleSetup,
  ArenaBuildPreview,
  ArenaParticipantRef,
  ArenaParticipantSource,
  BattleEvent,
  BattleHighlight,
  BattlePackage,
  BuildCard,
  BuildCardKind,
  FighterBuildInput,
  FighterProfile,
  JudgeVerdict,
  SoulStatKey,
  SoulStats,
  TopicPreset,
} from "@/lib/arena-types";

type ExchangeResult = {
  defenderDamage: number;
  description: string;
  scoreDelta: number;
  tags: string[];
  title: string;
  weaknessHit: boolean;
};

type MoveStance = "attack" | "defense";

type BattleMove = {
  actorId: string;
  pressure: number;
  source: "ai" | "fallback";
  stance: MoveStance;
  summary: string;
  tags: string[];
  title: string;
  weaknessIntent: boolean;
};

type MoveProposal = {
  pressure?: number;
  stance?: MoveStance;
  summary?: string;
  tags?: string[];
  title?: string;
  weaknessIntent?: boolean;
};

type JudgeDecision = {
  defenderDamageToPlayer: number;
  defenderScoreDelta: number;
  defenderWeaknessHit: boolean;
  playerDamageToDefender: number;
  playerScoreDelta: number;
  playerWeaknessHit: boolean;
  roundWinner: "player" | "defender" | "draw";
  source: "ai" | "fallback";
  summary: string;
  tags: string[];
  title: string;
};

type JudgeProposal = {
  defenderDamageToPlayer?: number;
  defenderScoreDelta?: number;
  defenderWeaknessHit?: boolean;
  playerDamageToDefender?: number;
  playerScoreDelta?: number;
  playerWeaknessHit?: boolean;
  roundWinner?: "player" | "defender" | "draw";
  summary?: string;
  tags?: string[];
  title?: string;
};

const attackKeywords = [
  "必须",
  "压制",
  "击穿",
  "主导",
  "夺取",
  "must",
  "force",
  "break",
  "win",
  "pressure",
  "dominate",
];
const defenseKeywords = [
  "边界",
  "稳定",
  "保护",
  "约束",
  "防守",
  "balance",
  "boundary",
  "stable",
  "protect",
  "constraint",
  "defend",
];
const penetrationKeywords = [
  "弱点",
  "裂缝",
  "前提",
  "矛盾",
  "反证",
  "weakness",
  "crack",
  "contradiction",
  "expose",
  "premise",
  "counter",
];
const speedKeywords = [
  "速度",
  "节奏",
  "先手",
  "爆发",
  "tempo",
  "burst",
  "fast",
  "rapid",
  "first",
  "pivot",
];

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const clampInt = (value: number, min: number, max: number) =>
  Math.round(clamp(value, min, max));

const average = (values: number[]) =>
  values.length
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : 0;

const countHits = (text: string, keywords: string[]) =>
  keywords.reduce(
    (total, keyword) => total + (text.toLowerCase().includes(keyword) ? 1 : 0),
    0,
  );

const hashToSeed = (input: string) => {
  const hex = createHash("sha256").update(input).digest("hex").slice(0, 8);
  return Number.parseInt(hex, 16);
};

const createRng = (seed: number) => {
  let state = seed >>> 0;

  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const unique = (items: Array<string | null | undefined>) =>
  [...new Set(items.map((item) => item?.trim()).filter(Boolean) as string[])];

const createRadar = (text: string, seed: number) => {
  const rng = createRng(seed);
  const trimmed = text.trim();
  const uniqueChars = new Set(trimmed.replace(/\s+/g, "").split("")).size;
  const punctuation = (trimmed.match(/[!?;:]/g) ?? []).length;
  const lengthScore = clamp(trimmed.length / 2.5, 12, 40);

  return {
    attackability: clampInt(
      28 +
        lengthScore +
        countHits(trimmed, attackKeywords) * 9 +
        punctuation * 4 +
        rng() * 12,
      18,
      96,
    ),
    defensibility: clampInt(
      22 +
        lengthScore +
        countHits(trimmed, defenseKeywords) * 10 +
        countHits(
          trimmed,
          ["如果", "因为", "所以", "边界", "if", "because", "therefore"],
        ) * 5 +
        rng() * 10,
      18,
      96,
    ),
    originality: clampInt(
      24 + uniqueChars * 1.2 + punctuation * 2 + rng() * 10,
      16,
      95,
    ),
  };
};

const createCardTrait = (card: Pick<BuildCard, "atk" | "def" | "pen" | "spd">) => {
  const pairs = [
    ["破甲反问", card.pen],
    ["抢节奏", card.spd],
    ["重锤主张", card.atk],
    ["稳守壁垒", card.def],
  ] as const;

  return [...pairs].sort((a, b) => b[1] - a[1])[0][0];
};

const createCardHint = (kind: BuildCardKind, card: BuildCard) => {
  const prefix =
    kind === "viewpoint" ? "观点卡" : kind === "rule" ? "规则卡" : "禁忌卡";
  const posture = card.atk >= card.def ? "偏进攻" : "偏稳守";
  const focus =
    card.pen >= 14
      ? "适合击穿隐藏弱点"
      : card.spd >= 14
        ? "适合抢先手和转节奏"
        : "适合稳住场面换血";

  return `${prefix}${posture}，${focus}。`;
};

const createCard = (
  text: string,
  kind: BuildCardKind,
  index: number,
  seedBase: string,
): BuildCard => {
  const seed = hashToSeed(`${seedBase}:${kind}:${index}:${text}`);
  const rng = createRng(seed);
  const radar = createRadar(text, seed);
  const atk = clampInt(
    radar.attackability / 8 + countHits(text, attackKeywords) * 1.8 + rng() * 2,
    6,
    20,
  );
  const def = clampInt(
    radar.defensibility / 8 + countHits(text, defenseKeywords) * 1.5 + rng() * 2,
    5,
    19,
  );
  const pen = clampInt(
    radar.originality / 10 +
      countHits(text, penetrationKeywords) * 2 +
      countHits(text, ["但是", "然而", "unless", "however", "but"]) * 1.4 +
      rng() * 2,
    4,
    18,
  );
  const spd = clampInt(
    (radar.attackability + radar.originality) / 18 +
      countHits(text, speedKeywords) * 2 +
      rng() * 2,
    4,
    18,
  );

  const baseCard: BuildCard = {
    atk,
    def,
    hint: "",
    id: `${kind}-${index}`,
    kind,
    pen,
    radar,
    spd,
    text,
    title:
      kind === "viewpoint"
        ? `观点 ${index + 1}`
        : kind === "rule"
          ? "核心规则"
          : "关键禁忌",
    trait: "",
  };

  return {
    ...baseCard,
    hint: createCardHint(kind, baseCard),
    trait: createCardTrait(baseCard),
  };
};

const deriveSoulStats = (cards: BuildCard[], seedTags: string[]) => {
  const seed = hashToSeed(
    `${seedTags.join("|")}:${cards.map((card) => card.text).join("|")}`,
  );
  const rng = createRng(seed);
  const avgAtk = average(cards.map((card) => card.atk));
  const avgDef = average(cards.map((card) => card.def));
  const avgPen = average(cards.map((card) => card.pen));
  const avgSpd = average(cards.map((card) => card.spd));
  const avgOriginality = average(cards.map((card) => card.radar.originality));
  const tagFactor = clamp(seedTags.length, 0, 8);

  return {
    ferocity: clampInt(42 + avgAtk * 2.2 + tagFactor * 1.6 + rng() * 8, 35, 99),
    guard: clampInt(40 + avgDef * 2.4 + tagFactor * 1.4 + rng() * 8, 35, 99),
    insight: clampInt(38 + avgPen * 2.7 + avgOriginality / 6 + rng() * 8, 35, 99),
    resolve: clampInt(39 + avgDef * 1.8 + avgAtk * 1.1 + rng() * 8, 35, 99),
    tempo: clampInt(36 + avgSpd * 2.6 + avgAtk * 0.8 + rng() * 8, 35, 99),
  } satisfies SoulStats;
};

const getPowerLabel = (soul: SoulStats) => {
  const entries = Object.entries(soul).sort((a, b) => b[1] - a[1]);
  const [top, second] = entries
    .slice(0, 2)
    .map(([key]) => soulLabels[key as SoulStatKey]);
  return `${top} / ${second}`;
};

const summarizeBuild = (
  cards: BuildCard[],
  soul: SoulStats,
  identitySummary: string[],
  memoryAnchors: string[],
) => {
  const heavyCard = [...cards].sort((a, b) => b.atk + b.pen - (a.atk + a.pen))[0];
  const steadyCard = [...cards].sort((a, b) => b.def + b.spd - (a.def + a.spd))[0];

  return unique([
    heavyCard ? `主要威胁来自「${heavyCard.trait}」。` : null,
    steadyCard ? `稳定性依靠「${steadyCard.trait}」。` : null,
    `魂核倾向：${getPowerLabel(soul)}。`,
    identitySummary[0] ? `身份锚点：${identitySummary[0]}。` : null,
    memoryAnchors[0] ? `记忆锚点：${memoryAnchors[0]}。` : null,
  ]).slice(0, 4);
};

const getTopicById = (topicId: string) =>
  topicPresets.find((topic) => topic.id === topicId) ?? topicPresets[0];

const findParticipant = (
  refs: ArenaParticipantRef[],
  sources: ArenaParticipantSource[],
  slot: "alpha" | "beta",
) => {
  const ref = refs.find((item) => item.slot === slot);
  const source = sources.find((item) => item.slot === slot);

  if (!ref || !source) {
    throw new Error(`Missing participant source for slot ${slot}`);
  }

  return { ref, source };
};

const buildFighterProfile = (
  role: FighterProfile["role"],
  participant: { ref: ArenaParticipantRef; source: ArenaParticipantSource },
  buildOverride: FighterBuildInput,
  archetype: string,
  aura: string,
  id: string,
) => {
  const cards = [
    ...buildOverride.viewpoints.map((viewpoint, index) =>
      createCard(viewpoint, "viewpoint", index, `${id}:viewpoint`),
    ),
    createCard(buildOverride.rule, "rule", 0, `${id}:rule`),
    createCard(buildOverride.taboo, "taboo", 0, `${id}:taboo`),
  ];
  const identitySummary = buildIdentitySummary(participant.source);
  const memoryAnchors = buildMemoryAnchors(participant.source);
  const soul = deriveSoulStats(cards, buildOverride.soulSeedTags);

  return {
    archetype,
    aura,
    buildSummary: summarizeBuild(cards, soul, identitySummary, memoryAnchors),
    cards,
    declaration: buildOverride.declaration,
    displayName: buildOverride.displayName,
    health: 100,
    id,
    identitySummary,
    memoryAnchors,
    powerLabel: getPowerLabel(soul),
    role,
    soul,
    source: {
      connected: participant.source.connected,
      participantId: participant.ref.participantId,
      provider: participant.ref.provider,
      secondMeUserId: participant.source.secondMeUserId,
      slot: participant.ref.slot,
    },
  } satisfies FighterProfile;
};

const createMatchUpCallout = (player: FighterProfile, defender: FighterProfile) => {
  const offenseGap =
    player.soul.ferocity + player.soul.tempo - defender.soul.guard;
  const insightGap = player.soul.insight - defender.soul.resolve;

  if (insightGap >= 12) {
    return `${player.displayName} 更擅长读穿隐藏前提，这会是这场对战最锋利的切口。`;
  }

  if (offenseGap >= 12) {
    return `${player.displayName} 更有机会抢到节奏，在 ${defender.displayName} 站稳之前先打出压制。`;
  }

  return "这是一场胶着对局，谁能先守住自我一致性，再撕开一处裂缝，谁就更可能拿下这一局。";
};

const buildEquipmentNotes = (fighter: FighterProfile) =>
  unique([
    fighter.cards[0]?.hint,
    fighter.cards[1]?.hint,
    fighter.cards[3]?.hint,
    fighter.memoryAnchors[0]
      ? `记得把这段记忆带上台面：${fighter.memoryAnchors[0]}`
      : null,
  ]).slice(0, 4);

const buildSourceIssues = (sources: ArenaParticipantSource[]) =>
  sources.flatMap((source) =>
    source.issues.map((issue) => `${participantSlotLabel(source.slot)}：${issue}`),
  );

export const buildArenaPreview = (
  setup: ArenaBattleSetup,
  sources: ArenaParticipantSource[],
): ArenaBuildPreview => {
  const topic = getTopicById(setup.topicId);
  const alpha = findParticipant(setup.participants, sources, "alpha");
  const beta = findParticipant(setup.participants, sources, "beta");
  const playerBuild = buildFighterInputFromParticipant(
    alpha.source,
    setup.overrides?.alpha,
  );
  const defenderBuild = buildFighterInputFromParticipant(
    beta.source,
    setup.overrides?.beta,
  );
  const player = buildFighterProfile(
    "challenger",
    alpha,
    playerBuild,
    `${participantSlotLabel(alpha.ref.slot)}真实人格`,
    "信标蓝",
    "player",
  );
  const defender = buildFighterProfile(
    "defender",
    beta,
    defenderBuild,
    `${participantSlotLabel(beta.ref.slot)}真实人格`,
    "琥珀焰",
    "defender",
  );

  return {
    defender,
    equipmentNotes: buildEquipmentNotes(player),
    matchUpCallout: createMatchUpCallout(player, defender),
    participantRefs: setup.participants,
    player,
    predictedEdges: unique([
      `先手优势：${player.displayName} 的魂核是 ${getPowerLabel(player.soul)}`,
      `防守优势：${defender.displayName} 的魂核是 ${getPowerLabel(defender.soul)}`,
      createMatchUpCallout(player, defender),
      player.memoryAnchors[0]
        ? `${player.displayName} 可以把记忆锚点打成进攻切口：${player.memoryAnchors[0]}`
        : null,
    ]).slice(0, 4),
    sourceMeta: {
      aiAssistEnabled: setup.participants.every(
        (participant) => participant.provider === "secondme",
      ),
      aiAssistUsed: false,
      generationMode: "orchestrated",
      issues: buildSourceIssues(sources),
      orchestrationMode: "hybrid",
    },
    topic,
  };
};

const runExchange = (
  attacker: FighterProfile,
  defender: FighterProfile,
  card: BuildCard,
  round: number,
): ExchangeResult => {
  const seed = hashToSeed(`${attacker.id}:${defender.id}:${card.id}:${round}`);
  const rng = createRng(seed);
  const attackPower =
    card.atk * 1.9 + attacker.soul.ferocity * 0.36 + attacker.soul.tempo * 0.18;
  const defensePower =
    defender.cards[Math.max(0, round - 1)]?.def * 1.4 +
    defender.soul.guard * 0.34 +
    defender.soul.resolve * 0.16;
  const penetrationPower =
    card.pen * 1.6 + attacker.soul.insight * 0.24 - defender.soul.guard * 0.14;
  const weaknessHit =
    penetrationPower > defensePower * 0.72 ||
    card.trait === "破甲反问" ||
    rng() > 0.84;
  const defenderDamage = clampInt(
    attackPower * 0.18 -
      defensePower * 0.08 +
      penetrationPower * 0.14 +
      (weaknessHit ? 7 : 0) +
      rng() * 4,
    5,
    24,
  );
  const scoreDelta = clampInt(
    defenderDamage * 0.72 + (weaknessHit ? 4 : 1) + rng() * 2,
    4,
    18,
  );

  return {
    defenderDamage,
    description: weaknessHit
      ? `${attacker.displayName} 用 ${card.title} 撕开了 ${defender.displayName} 的隐藏前提。`
      : `${attacker.displayName} 依靠 ${card.trait} 稳稳换下一手节奏。`,
    scoreDelta,
    tags: weaknessHit ? ["裂缝", "穿透"] : ["换血", "节奏"],
    title: weaknessHit ? "击穿前提" : "稳住换手",
    weaknessHit,
  };
};

const buildFallbackMove = (
  attacker: FighterProfile,
  defender: FighterProfile,
  card: BuildCard,
): BattleMove => {
  const stance: MoveStance = card.def >= card.atk + 2 ? "defense" : "attack";

  return {
    actorId: attacker.id,
    pressure: clampInt(card.atk * 4 + card.spd * 2, 28, 92),
    source: "fallback",
    stance,
    summary:
      stance === "attack"
        ? `${attacker.displayName} 以「${card.trait}」为核心，试图逼 ${defender.displayName} 暴露隐藏破绽。`
        : `${attacker.displayName} 先用「${card.trait}」稳住结构，避免被 ${defender.displayName} 牵着节奏走。`,
    tags: stance === "attack" ? ["进攻", "压制"] : ["稳守", "回气"],
    title: stance === "attack" ? "主动出招" : "稳守待机",
    weaknessIntent: card.pen >= 14 || card.trait === "破甲反问",
  };
};

const normalizeMoveProposal = (value: unknown): MoveProposal | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  const tags = Array.isArray(candidate.tags)
    ? candidate.tags.filter((item): item is string => typeof item === "string")
    : undefined;
  const stance =
    candidate.stance === "attack" || candidate.stance === "defense"
      ? candidate.stance
      : undefined;

  return {
    pressure:
      typeof candidate.pressure === "number" ? candidate.pressure : undefined,
    stance,
    summary:
      typeof candidate.summary === "string" ? candidate.summary.trim() : undefined,
    tags,
    title: typeof candidate.title === "string" ? candidate.title.trim() : undefined,
    weaknessIntent:
      typeof candidate.weaknessIntent === "boolean"
        ? candidate.weaknessIntent
        : undefined,
  };
};

const requestBattleMove = async (
  attacker: FighterProfile,
  defender: FighterProfile,
  card: BuildCard,
  round: number,
  topic: TopicPreset,
) => {
  if (attacker.source.provider !== "secondme") {
    return null;
  }

  const result = await fetchSecondMeActForSlot<MoveProposal>(attacker.source.slot, {
    actionControl: [
      "只输出合法 JSON。",
      "结构：",
      '{"title":string,"summary":string,"tags":string[],"stance":"attack"|"defense","pressure":number,"weaknessIntent":boolean}',
      "title 2-6 个中文字符。",
      "summary 1 句话，最多 70 个中文字符。",
      "tags 1-3 个简短中文词。",
      'stance 只能是 "attack" 或 "defense"。',
      "pressure 为 0-100 的整数。",
      "weaknessIntent 只有在明确试图击穿前提时才为 true。",
    ].join(" "),
    message: JSON.stringify({
      attacker: {
        declaration: attacker.declaration,
        displayName: attacker.displayName,
        identitySummary: attacker.identitySummary,
        memoryAnchors: attacker.memoryAnchors,
      },
      card: {
        hint: card.hint,
        text: card.text,
        title: card.title,
        trait: card.trait,
      },
      defender: {
        buildSummary: defender.buildSummary,
        displayName: defender.displayName,
      },
      round,
      topic: {
        prompt: topic.prompt,
        title: topic.title,
      },
    }),
    systemPrompt: `你现在扮演 ${attacker.displayName}。你只能基于给定身份锚点、记忆锚点和卡牌内容出招，禁止编造设定。`,
  }).catch(() => null);

  return normalizeMoveProposal(result);
};

const createBattleMove = async (
  attacker: FighterProfile,
  defender: FighterProfile,
  card: BuildCard,
  round: number,
  topic: TopicPreset,
) => {
  const fallback = buildFallbackMove(attacker, defender, card);
  const proposal = await requestBattleMove(attacker, defender, card, round, topic);

  if (!proposal) {
    return fallback;
  }

  return {
    actorId: attacker.id,
    pressure: clampInt(proposal.pressure ?? fallback.pressure, 0, 100),
    source: "ai",
    stance: proposal.stance ?? fallback.stance,
    summary: proposal.summary || fallback.summary,
    tags: proposal.tags?.slice(0, 3) ?? fallback.tags,
    title: proposal.title || fallback.title,
    weaknessIntent: proposal.weaknessIntent ?? fallback.weaknessIntent,
  } satisfies BattleMove;
};

const applyMoveBias = (exchange: ExchangeResult, move: BattleMove) => {
  const pressureBoost = clampInt((move.pressure - 50) / 18, -2, 4);
  const stanceBoost = move.stance === "attack" ? 2 : -2;
  const scoreBias = move.stance === "defense" ? 1 : 0;
  const weaknessHit = exchange.weaknessHit || move.weaknessIntent;

  return {
    ...exchange,
    defenderDamage: clampInt(
      exchange.defenderDamage + pressureBoost + stanceBoost + (weaknessHit ? 1 : 0),
      0,
      26,
    ),
    scoreDelta: clampInt(
      exchange.scoreDelta + pressureBoost + scoreBias + (weaknessHit ? 1 : 0),
      1,
      20,
    ),
    weaknessHit,
  } satisfies ExchangeResult;
};

const buildFallbackJudgeDecision = (
  round: number,
  playerExchange: ExchangeResult,
  defenderExchange: ExchangeResult,
  playerMove: BattleMove,
  defenderMove: BattleMove,
): JudgeDecision => {
  const playerImpact =
    playerExchange.scoreDelta + playerExchange.defenderDamage * 0.4;
  const defenderImpact =
    defenderExchange.scoreDelta + defenderExchange.defenderDamage * 0.4;
  const gap = playerImpact - defenderImpact;
  const roundWinner =
    Math.abs(gap) <= 2 ? "draw" : gap > 0 ? "player" : "defender";

  return {
    defenderDamageToPlayer: defenderExchange.defenderDamage,
    defenderScoreDelta: defenderExchange.scoreDelta,
    defenderWeaknessHit: defenderExchange.weaknessHit,
    playerDamageToDefender: playerExchange.defenderDamage,
    playerScoreDelta: playerExchange.scoreDelta,
    playerWeaknessHit: playerExchange.weaknessHit,
    roundWinner,
    source: "fallback",
    summary:
      roundWinner === "draw"
        ? `第 ${round} 回合双方都没有完全压住对手，节奏与结构保持胶着。`
        : roundWinner === "player"
          ? `${playerMove.title} 更有效地兑现成了舞台优势，甲方拿下这一回合。`
          : `${defenderMove.title} 更完整地守住了论证框架，乙方拿下这一回合。`,
    tags: unique([
      ...playerMove.tags,
      ...defenderMove.tags,
      roundWinner === "draw" ? "胶着" : roundWinner === "player" ? "甲方占优" : "乙方占优",
    ]).slice(0, 4),
    title:
      roundWinner === "draw"
        ? "裁判判定：胶着"
        : roundWinner === "player"
          ? "裁判判定：甲方占优"
          : "裁判判定：乙方占优",
  };
};

const normalizeJudgeProposal = (value: unknown): JudgeProposal | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  const tags = Array.isArray(candidate.tags)
    ? candidate.tags.filter((item): item is string => typeof item === "string")
    : undefined;
  const roundWinner =
    candidate.roundWinner === "player" ||
    candidate.roundWinner === "defender" ||
    candidate.roundWinner === "draw"
      ? candidate.roundWinner
      : undefined;

  return {
    defenderDamageToPlayer:
      typeof candidate.defenderDamageToPlayer === "number"
        ? candidate.defenderDamageToPlayer
        : undefined,
    defenderScoreDelta:
      typeof candidate.defenderScoreDelta === "number"
        ? candidate.defenderScoreDelta
        : undefined,
    defenderWeaknessHit:
      typeof candidate.defenderWeaknessHit === "boolean"
        ? candidate.defenderWeaknessHit
        : undefined,
    playerDamageToDefender:
      typeof candidate.playerDamageToDefender === "number"
        ? candidate.playerDamageToDefender
        : undefined,
    playerScoreDelta:
      typeof candidate.playerScoreDelta === "number"
        ? candidate.playerScoreDelta
        : undefined,
    playerWeaknessHit:
      typeof candidate.playerWeaknessHit === "boolean"
        ? candidate.playerWeaknessHit
        : undefined,
    roundWinner,
    summary:
      typeof candidate.summary === "string" ? candidate.summary.trim() : undefined,
    tags,
    title: typeof candidate.title === "string" ? candidate.title.trim() : undefined,
  };
};

const requestJudgeDecision = async (
  topic: TopicPreset,
  round: number,
  player: FighterProfile,
  defender: FighterProfile,
  playerMove: BattleMove,
  defenderMove: BattleMove,
) => {
  const judgeSlot =
    player.source.provider === "secondme"
      ? player.source.slot
      : defender.source.provider === "secondme"
        ? defender.source.slot
        : null;

  if (!judgeSlot) {
    return null;
  }

  const result = await fetchSecondMeActForSlot<JudgeProposal>(judgeSlot, {
    actionControl: [
      "你是中立裁判。只输出合法 JSON。",
      "结构：",
      '{"title":string,"summary":string,"tags":string[],"roundWinner":"player"|"defender"|"draw","playerDamageToDefender":number,"defenderDamageToPlayer":number,"playerScoreDelta":number,"defenderScoreDelta":number,"playerWeaknessHit":boolean,"defenderWeaknessHit":boolean}',
      "title 用中文，8 个字以内。",
      "summary 用中文，一句话，最多 90 个中文字符。",
      "tags 为 1-4 个简短中文词。",
      "damage 为 0-26 的整数。",
      "scoreDelta 为 0-20 的整数。",
      "只有在明确撕开前提、结构或一致性时 weaknessHit 才为 true。",
    ].join(" "),
    message: JSON.stringify({
      defenderMove,
      fighterA: {
        buildSummary: player.buildSummary,
        declaration: player.declaration,
        displayName: player.displayName,
      },
      fighterB: {
        buildSummary: defender.buildSummary,
        declaration: defender.declaration,
        displayName: defender.displayName,
      },
      playerMove,
      round,
      topic: {
        prompt: topic.prompt,
        title: topic.title,
      },
    }),
    systemPrompt:
      "你是 Soul Arena 的中立裁判，任务是比较双方动作的有效性，并输出结构化裁决，不要偏袒任一方。",
  }).catch(() => null);

  return normalizeJudgeProposal(result);
};

const createJudgeDecision = async (
  round: number,
  topic: TopicPreset,
  player: FighterProfile,
  defender: FighterProfile,
  playerCard: BuildCard,
  defenderCard: BuildCard,
  playerMove: BattleMove,
  defenderMove: BattleMove,
) => {
  const playerExchange = applyMoveBias(
    runExchange(player, defender, playerCard, round),
    playerMove,
  );
  const defenderExchange = applyMoveBias(
    runExchange(defender, player, defenderCard, round),
    defenderMove,
  );
  const fallback = buildFallbackJudgeDecision(
    round,
    playerExchange,
    defenderExchange,
    playerMove,
    defenderMove,
  );
  const proposal = await requestJudgeDecision(
    topic,
    round,
    player,
    defender,
    playerMove,
    defenderMove,
  );

  if (!proposal) {
    return fallback;
  }

  return {
    defenderDamageToPlayer: clampInt(
      proposal.defenderDamageToPlayer ?? fallback.defenderDamageToPlayer,
      0,
      26,
    ),
    defenderScoreDelta: clampInt(
      proposal.defenderScoreDelta ?? fallback.defenderScoreDelta,
      0,
      20,
    ),
    defenderWeaknessHit:
      proposal.defenderWeaknessHit ?? fallback.defenderWeaknessHit,
    playerDamageToDefender: clampInt(
      proposal.playerDamageToDefender ?? fallback.playerDamageToDefender,
      0,
      26,
    ),
    playerScoreDelta: clampInt(
      proposal.playerScoreDelta ?? fallback.playerScoreDelta,
      0,
      20,
    ),
    playerWeaknessHit: proposal.playerWeaknessHit ?? fallback.playerWeaknessHit,
    roundWinner: proposal.roundWinner ?? fallback.roundWinner,
    source: "ai",
    summary: proposal.summary || fallback.summary,
    tags: proposal.tags?.slice(0, 4) ?? fallback.tags,
    title: proposal.title || fallback.title,
  } satisfies JudgeDecision;
};

const createJudgeBoard = (
  player: FighterProfile,
  defender: FighterProfile,
  playerScore: number,
  defenderScore: number,
) =>
  [
    {
      commentary:
        playerScore >= defenderScore
          ? `${player.displayName} 在高压下仍保住了更完整的逻辑链。`
          : `${defender.displayName} 在被持续施压时仍守住了更完整的论证框架。`,
      defenderScore: clampInt(
        defenderScore * 0.46 + defender.soul.guard * 0.16,
        18,
        48,
      ),
      id: "logic-censor",
      playerScore: clampInt(
        playerScore * 0.46 + player.soul.insight * 0.16,
        18,
        48,
      ),
      title: "逻辑评委",
    },
    {
      commentary:
        average(player.cards.map((card) => card.radar.originality)) >=
        average(defender.cards.map((card) => card.radar.originality))
          ? `${player.displayName} 的构筑组合更锋利。`
          : `${defender.displayName} 的构筑整体更完整。`,
      defenderScore: clampInt(
        average(defender.cards.map((card) => card.radar.originality)) * 0.18 +
          defender.soul.resolve * 0.2,
        14,
        42,
      ),
      id: "build-warden",
      playerScore: clampInt(
        average(player.cards.map((card) => card.radar.originality)) * 0.18 +
          player.soul.resolve * 0.2,
        14,
        42,
      ),
      title: "构筑评委",
    },
    {
      commentary:
        player.soul.tempo >= defender.soul.tempo
          ? `${player.displayName} 抢下了更多舞台节奏。`
          : `${defender.displayName} 对舞台节奏的掌控更强。`,
      defenderScore: clampInt(
        defenderScore * 0.2 + defender.soul.tempo * 0.12,
        10,
        34,
      ),
      id: "crowd-broker",
      playerScore: clampInt(
        playerScore * 0.2 + player.soul.tempo * 0.12,
        10,
        34,
      ),
      title: "观众热度",
    },
  ] satisfies JudgeVerdict[];

const buildHighlights = (events: BattleEvent[]) => {
  const scoredAttacks = events
    .filter((event) => event.type === "attack" || event.type === "weakness_hit")
    .map((event) => ({
      actorId: event.actorId ?? "player",
      damage: Math.abs(event.effect?.healthDelta ?? 0),
      description: event.description,
      title: event.title,
    }));
  const strongest = [...scoredAttacks].sort((a, b) => b.damage - a.damage)[0];
  const rebuttal =
    [...scoredAttacks]
      .filter((event) => event.title.includes("裂缝") || event.title.includes("击穿"))
      .sort((a, b) => b.damage - a.damage)[0] ?? strongest;
  const flaw =
    events.find((event) => event.type === "weakness_hit") ??
    events.find((event) => event.type === "judge_decision") ??
    events[events.length - 1];

  return [
    {
      actorId: strongest?.actorId ?? "player",
      description: strongest?.description ?? "这一场没有出现真正意义上的重击。",
      id: "highlight-strongest-hit",
      label: "最强一击",
      title: strongest?.title ?? "终局重锤",
    },
    {
      actorId: rebuttal?.actorId ?? "defender",
      description: rebuttal?.description ?? "这一场没有形成明确的反制瞬间。",
      id: "highlight-best-rebuttal",
      label: "最佳反制",
      title: rebuttal?.title ?? "反手拆解",
    },
    {
      actorId: flaw?.actorId ?? "defender",
      description: flaw?.description ?? "这一场没有出现明确的致命裂缝。",
      id: "highlight-fatal-flaw",
      label: "关键裂缝",
      title: flaw?.title ?? "破绽时刻",
    },
  ] satisfies BattleHighlight[];
};

const createReplayAnchorPreview = (fighter: FighterProfile) => ({
  archetype: fighter.archetype,
  aura: fighter.aura,
  declaration: fighter.declaration,
  displayName: fighter.displayName,
  label: "复盘锚点",
  soul: fighter.soul,
});

export const createBattlePackage = async (
  setup: ArenaBattleSetup,
  sources: ArenaParticipantSource[],
): Promise<BattlePackage> => {
  const preview = buildArenaPreview(setup, sources);
  const player = preview.player;
  const defender = preview.defender;
  const battleId = randomUUID();
  const events: BattleEvent[] = [];
  let atMs = 0;
  let playerHealth = 100;
  let defenderHealth = 100;
  let playerScore = 0;
  let defenderScore = 0;
  let aiAssistUsed = false;

  const pushEvent = (event: Omit<BattleEvent, "id" | "index">) => {
    events.push({
      ...event,
      id: `${battleId}-event-${events.length}`,
      index: events.length,
    });
    atMs = event.atMs;
  };

  pushEvent({
    atMs,
    description: `${player.displayName} 与 ${defender.displayName} 将以真实 SecondMe 人格进入这场对战。`,
    round: 0,
    title: preview.topic.title,
    type: "intro",
  });
  pushEvent({
    atMs: atMs + 1200,
    description: preview.matchUpCallout,
    round: 0,
    title: "赛前判读",
    type: "build_hint",
  });

  for (let round = 1; round <= 3; round += 1) {
    pushEvent({
      atMs: atMs + 1400,
      description: `第 ${round} 回合开始，辩题聚焦在：${preview.topic.prompt}`,
      round,
      title: `第 ${round} 回合`,
      type: "round_start",
    });

    const playerCard = player.cards[(round - 1) % player.cards.length];
    const defenderCard = defender.cards[(round + 1) % defender.cards.length];
    const [playerMove, defenderMove] = await Promise.all([
      createBattleMove(player, defender, playerCard, round, preview.topic),
      createBattleMove(defender, player, defenderCard, round, preview.topic),
    ]);
    aiAssistUsed ||= playerMove.source === "ai" || defenderMove.source === "ai";

    const judgeDecision = await createJudgeDecision(
      round,
      preview.topic,
      player,
      defender,
      playerCard,
      defenderCard,
      playerMove,
      defenderMove,
    );
    aiAssistUsed ||= judgeDecision.source === "ai";

    defenderHealth = clampInt(
      defenderHealth - judgeDecision.playerDamageToDefender,
      0,
      100,
    );
    playerScore += judgeDecision.playerScoreDelta;
    pushEvent({
      actorId: player.id,
      atMs: atMs + 1100,
      description: playerMove.summary,
      effect: {
        healthDelta: -judgeDecision.playerDamageToDefender,
        scoreDelta: judgeDecision.playerScoreDelta,
      },
      round,
      tags: playerMove.tags,
      targetId: defender.id,
      title: playerMove.title,
      type: judgeDecision.playerWeaknessHit
        ? "weakness_hit"
        : playerMove.stance === "defense"
          ? "defense"
          : "attack",
    });

    playerHealth = clampInt(
      playerHealth - judgeDecision.defenderDamageToPlayer,
      0,
      100,
    );
    defenderScore += judgeDecision.defenderScoreDelta;
    pushEvent({
      actorId: defender.id,
      atMs: atMs + 1050,
      description: defenderMove.summary,
      effect: {
        healthDelta: -judgeDecision.defenderDamageToPlayer,
        scoreDelta: judgeDecision.defenderScoreDelta,
      },
      round,
      tags: defenderMove.tags,
      targetId: player.id,
      title: defenderMove.title,
      type: judgeDecision.defenderWeaknessHit
        ? "weakness_hit"
        : defenderMove.stance === "defense"
          ? "defense"
          : "attack",
    });

    pushEvent({
      atMs: atMs + 900,
      description: judgeDecision.summary,
      round,
      tags: judgeDecision.tags,
      title: judgeDecision.title,
      type: "judge_decision",
    });

    pushEvent({
      atMs: atMs + 900,
      description: `${player.displayName} ${playerScore} : ${defenderScore} ${defender.displayName}`,
      round,
      title: "比分更新",
      type: "score_update",
    });
  }

  const judges = createJudgeBoard(player, defender, playerScore, defenderScore);
  const judgePlayer = judges.reduce((sum, judge) => sum + judge.playerScore, 0);
  const judgeDefender = judges.reduce((sum, judge) => sum + judge.defenderScore, 0);
  const crowdScore = {
    defender: clampInt(defenderScore * 0.44 + defender.soul.tempo * 0.08, 12, 34),
    player: clampInt(playerScore * 0.44 + player.soul.tempo * 0.08, 12, 34),
  };
  const finalScore = {
    defender: judgeDefender + crowdScore.defender,
    player: judgePlayer + crowdScore.player,
  };
  const winnerId =
    finalScore.player >= finalScore.defender ? player.id : defender.id;

  pushEvent({
    atMs: atMs + 1400,
    description:
      winnerId === player.id
        ? `${player.displayName} 把真实人格资料转成了更锋利的战斗构筑，成功拿下这局。`
        : `${defender.displayName} 靠更稳的结构和反制能力守住了这场对战。`,
    round: 4,
    title: "终局裁定",
    type: "match_end",
  });

  const replayAnchor = createReplayAnchorPreview(
    winnerId === player.id ? defender : player,
  );
  pushEvent({
    actorId: winnerId,
    atMs: atMs + 1600,
    description: `${replayAnchor.displayName} 将成为下一场真实对战的复盘锚点。`,
    round: 4,
    title: "复盘锚点",
    type: "challenger_preview",
  });

  return {
    challengerPreview: replayAnchor,
    classicLabel: "SecondMe 真实对战",
    createdAt: new Date().toISOString(),
    crowdScore,
    defender: {
      ...defender,
      health: defenderHealth,
    },
    events,
    finalScore,
    highlights: buildHighlights(events),
    id: battleId,
    judges,
    participantRefs: setup.participants,
    player: {
      ...player,
      health: playerHealth,
    },
    roomTitle: `${preview.topic.title}｜${player.displayName} 对阵 ${defender.displayName}`,
    sourceMeta: {
      ...preview.sourceMeta,
      aiAssistUsed,
      orchestrationMode: "hybrid",
    },
    topic: preview.topic,
    winnerId,
  } satisfies BattlePackage;
};
