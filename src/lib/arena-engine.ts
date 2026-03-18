import { createHash, randomUUID } from "node:crypto";

import { buildFighterInputFromParticipant, buildIdentitySummary, buildMemoryAnchors, participantSlotLabel } from "@/lib/arena-participants";
import { challengerPresets, soulLabels, topicPresets } from "@/lib/arena-presets";
import { fetchSecondMeActForSlot } from "@/lib/secondme";
import type {
  ArenaBattleSetup,
  ArenaBuildPreview,
  ArenaParticipantRef,
  ArenaParticipantSource,
  BattleEvent,
  BattleHighlight,
  BattlePackage,
  BattlePreview,
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

type ActOverlay = {
  aggression?: number;
  pressure?: number;
  summary?: string;
  tags?: string[];
  title?: string;
  weakness?: boolean;
};

const attackKeywords = [
  "must",
  "force",
  "break",
  "win",
  "pressure",
  "replace",
  "capture",
  "dominate",
  "attack",
];
const defenseKeywords = [
  "boundary",
  "stable",
  "protect",
  "constraint",
  "defend",
  "resilient",
  "balance",
  "rule",
  "guard",
];
const penetrationKeywords = [
  "weakness",
  "crack",
  "contradiction",
  "expose",
  "premise",
  "loophole",
  "counter",
  "assumption",
];
const speedKeywords = [
  "fast",
  "tempo",
  "burst",
  "instant",
  "rapid",
  "first",
  "swing",
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
        countHits(trimmed, ["if", "because", "therefore", "boundary"]) * 5 +
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
    ["Armor Break", card.pen],
    ["Tempo Seize", card.spd],
    ["Heavy Claim", card.atk],
    ["Wall Hold", card.def],
  ] as const;

  return [...pairs].sort((a, b) => b[1] - a[1])[0][0];
};

const createCardHint = (kind: BuildCardKind, card: BuildCard) => {
  const prefix =
    kind === "viewpoint"
      ? "Viewpoint"
      : kind === "rule"
        ? "Rule"
        : "Taboo";
  const posture = card.atk >= card.def ? "leans aggressive" : "leans stable";
  const focus =
    card.pen >= 14
      ? "good at opening cracks"
      : card.spd >= 14
        ? "good at stealing tempo"
        : "good at trading safely";

  return `${prefix} ${posture}; ${focus}.`;
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
      countHits(text, ["but", "however", "unless"]) * 1.4 +
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
        ? `Viewpoint ${index + 1}`
        : kind === "rule"
          ? "Core Rule"
          : "Critical Taboo",
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
    heavyCard ? `Primary threat: ${heavyCard.trait}.` : null,
    steadyCard ? `Stability comes from ${steadyCard.trait}.` : null,
    `Soul core: ${getPowerLabel(soul)}.`,
    identitySummary[0] ? `Identity anchor: ${identitySummary[0]}.` : null,
    memoryAnchors[0] ? `Memory anchor: ${memoryAnchors[0]}.` : null,
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
    return `${player.displayName} has the cleaner read on hidden assumptions.`;
  }

  if (offenseGap >= 12) {
    return `${player.displayName} can probably seize tempo before ${defender.displayName} stabilizes.`;
  }

  return `This matchup is close. Whoever protects identity coherence while landing one crack first should take it.`;
};

const buildEquipmentNotes = (fighter: FighterProfile) =>
  unique([
    fighter.cards[0]?.hint,
    fighter.cards[1]?.hint,
    fighter.cards[3]?.hint,
    fighter.memoryAnchors[0]
      ? `Keep the memory anchor visible: ${fighter.memoryAnchors[0]}`
      : null,
  ]).slice(0, 4);

const buildSourceIssues = (sources: ArenaParticipantSource[]) =>
  sources.flatMap((source) =>
    source.issues.map(
      (issue) => `${participantSlotLabel(source.slot)}: ${issue}`,
    ),
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
    `${participantSlotLabel(alpha.ref.slot)} Real Persona`,
    "Signal Blue",
    "player",
  );
  const defender = buildFighterProfile(
    "defender",
    beta,
    defenderBuild,
    `${participantSlotLabel(beta.ref.slot)} Real Persona`,
    "Flare Amber",
    "defender",
  );

  return {
    defender,
    equipmentNotes: buildEquipmentNotes(player),
    matchUpCallout: createMatchUpCallout(player, defender),
    participantRefs: setup.participants,
    player,
    predictedEdges: unique([
      `Player edge: ${getPowerLabel(player.soul)}`,
      `Defender edge: ${getPowerLabel(defender.soul)}`,
      createMatchUpCallout(player, defender),
      player.memoryAnchors[0]
        ? `${player.displayName} can weaponize memory anchor: ${player.memoryAnchors[0]}`
        : null,
    ]).slice(0, 4),
    sourceMeta: {
      aiAssistEnabled: setup.participants.every(
        (participant) => participant.provider === "secondme",
      ),
      aiAssistUsed: false,
      generationMode: "orchestrated",
      issues: buildSourceIssues(sources),
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
    card.trait === "Armor Break" ||
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
      ? `${attacker.displayName} uses ${card.title} to split open a hidden contradiction in ${defender.displayName}'s stance.`
      : `${attacker.displayName} lands a stable exchange through ${card.trait}.`,
    scoreDelta,
    tags: weaknessHit ? ["crack", "pressure"] : ["tempo", "trade"],
    title: weaknessHit ? "Critical crack" : "Pressure trade",
    weaknessHit,
  };
};

const normalizeOverlay = (value: unknown): ActOverlay | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  const tags = Array.isArray(candidate.tags)
    ? candidate.tags.filter((item): item is string => typeof item === "string")
    : undefined;

  return {
    aggression:
      typeof candidate.aggression === "number" ? candidate.aggression : undefined,
    pressure:
      typeof candidate.pressure === "number" ? candidate.pressure : undefined,
    summary:
      typeof candidate.summary === "string" ? candidate.summary.trim() : undefined,
    tags,
    title: typeof candidate.title === "string" ? candidate.title.trim() : undefined,
    weakness:
      typeof candidate.weakness === "boolean" ? candidate.weakness : undefined,
  };
};

const requestActOverlay = async (
  attacker: FighterProfile,
  defender: FighterProfile,
  topic: TopicPreset,
  round: number,
) => {
  if (attacker.source.provider !== "secondme") {
    return null;
  }

  const slot = attacker.source.slot;
  const overlay = await fetchSecondMeActForSlot<ActOverlay>(slot, {
    actionControl: [
      'Return only valid JSON.',
      'Shape:',
      '{"title":string,"summary":string,"tags":string[],"aggression":number,"pressure":number,"weakness":boolean}',
      'title: 2-5 words.',
      'summary: one sentence, max 160 chars, no markdown.',
      'tags: 1-3 short lowercase strings.',
      'aggression and pressure: integers 0-100.',
      'weakness: true only if the opponent was forced into a visible contradiction.',
    ].join(" "),
    message: JSON.stringify({
      attacker: {
        buildSummary: attacker.buildSummary,
        declaration: attacker.declaration,
        displayName: attacker.displayName,
        identitySummary: attacker.identitySummary,
        memoryAnchors: attacker.memoryAnchors,
      },
      defender: {
        buildSummary: defender.buildSummary,
        declaration: defender.declaration,
        displayName: defender.displayName,
        identitySummary: defender.identitySummary,
      },
      round,
      topic: {
        prompt: topic.prompt,
        title: topic.title,
      },
    }),
    systemPrompt: `You are ${attacker.displayName}. Stay consistent with the provided identity and memory anchors.`,
  }).catch(() => null);

  return normalizeOverlay(overlay);
};

const runOrchestratedExchange = async (
  attacker: FighterProfile,
  defender: FighterProfile,
  card: BuildCard,
  round: number,
  topic: TopicPreset,
) => {
  const base = runExchange(attacker, defender, card, round);
  const overlay = await requestActOverlay(attacker, defender, topic, round);

  if (!overlay) {
    return {
      exchange: base,
      usedAi: false,
    };
  }

  const aggressionBoost = clampInt(((overlay.aggression ?? 50) - 50) / 20, -2, 4);
  const pressureBoost = clampInt(((overlay.pressure ?? 50) - 50) / 20, -1, 3);
  const weaknessHit = base.weaknessHit || Boolean(overlay.weakness);

  return {
    exchange: {
      defenderDamage: clampInt(
        base.defenderDamage + aggressionBoost + (weaknessHit ? 2 : 0),
        5,
        26,
      ),
      description: overlay.summary || base.description,
      scoreDelta: clampInt(
        base.scoreDelta + pressureBoost + (weaknessHit ? 2 : 0),
        4,
        20,
      ),
      tags: overlay.tags?.slice(0, 3) ?? base.tags,
      title: overlay.title || base.title,
      weaknessHit,
    },
    usedAi: true,
  };
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
          ? `${player.displayName} kept the cleaner logic chain under pressure.`
          : `${defender.displayName} preserved the more complete reasoning frame.`,
      defenderScore: clampInt(defenderScore * 0.46 + defender.soul.guard * 0.16, 18, 48),
      id: "logic-censor",
      playerScore: clampInt(playerScore * 0.46 + player.soul.insight * 0.16, 18, 48),
      title: "Logic board",
    },
    {
      commentary:
        average(player.cards.map((card) => card.radar.originality)) >=
        average(defender.cards.map((card) => card.radar.originality))
          ? `${player.displayName} presented the sharper configuration.`
          : `${defender.displayName} showed the more coherent configuration.`,
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
      title: "Build board",
    },
    {
      commentary:
        player.soul.tempo >= defender.soul.tempo
          ? `${player.displayName} controlled more of the visible tempo.`
          : `${defender.displayName} handled stage tempo more cleanly.`,
      defenderScore: clampInt(defenderScore * 0.2 + defender.soul.tempo * 0.12, 10, 34),
      id: "crowd-broker",
      playerScore: clampInt(playerScore * 0.2 + player.soul.tempo * 0.12, 10, 34),
      title: "Crowd board",
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
      .filter((event) => event.title.toLowerCase().includes("crack"))
      .sort((a, b) => b.damage - a.damage)[0] ?? strongest;
  const flaw =
    events.find((event) => event.type === "weakness_hit") ??
    events.find((event) => event.type === "defense") ??
    events[events.length - 1];

  return [
    {
      actorId: strongest?.actorId ?? "player",
      description: strongest?.description ?? "No clean strike recorded.",
      id: "highlight-strongest-hit",
      label: "Strongest strike",
      title: strongest?.title ?? "Closing hit",
    },
    {
      actorId: rebuttal?.actorId ?? "defender",
      description: rebuttal?.description ?? "No decisive rebuttal recorded.",
      id: "highlight-best-rebuttal",
      label: "Best rebuttal",
      title: rebuttal?.title ?? "Counter frame",
    },
    {
      actorId: flaw?.actorId ?? "defender",
      description: flaw?.description ?? "No critical flaw recorded.",
      id: "highlight-fatal-flaw",
      label: "Fatal flaw",
      title: flaw?.title ?? "Break point",
    },
  ] satisfies BattleHighlight[];
};

const createReplayAnchorPreview = (fighter: FighterProfile): BattlePreview => ({
  archetype: fighter.archetype,
  aura: fighter.aura,
  declaration: fighter.declaration,
  displayName: fighter.displayName,
  label: "Rematch target",
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
    description: `${player.displayName} and ${defender.displayName} enter with real SecondMe-derived personas.`,
    round: 0,
    title: preview.topic.title,
    type: "intro",
  });
  pushEvent({
    atMs: atMs + 1200,
    description: preview.matchUpCallout,
    round: 0,
    title: "Profile read",
    type: "build_hint",
  });

  for (let round = 1; round <= 3; round += 1) {
    pushEvent({
      atMs: atMs + 1400,
      description: `Round ${round} opens on topic: ${preview.topic.prompt}`,
      round,
      title: `Round ${round}`,
      type: "round_start",
    });

    const playerCard = player.cards[(round - 1) % player.cards.length];
    const playerRun = await runOrchestratedExchange(
      player,
      defender,
      playerCard,
      round,
      preview.topic,
    );
    aiAssistUsed ||= playerRun.usedAi;
    defenderHealth = clampInt(
      defenderHealth - playerRun.exchange.defenderDamage,
      0,
      100,
    );
    playerScore += playerRun.exchange.scoreDelta;
    pushEvent({
      actorId: player.id,
      atMs: atMs + 1250,
      description: playerRun.exchange.description,
      effect: {
        healthDelta: -playerRun.exchange.defenderDamage,
        scoreDelta: playerRun.exchange.scoreDelta,
      },
      round,
      tags: playerRun.exchange.tags,
      targetId: defender.id,
      title: playerRun.exchange.title,
      type: playerRun.exchange.weaknessHit ? "weakness_hit" : "attack",
    });

    defenderScore += 2;
    pushEvent({
      actorId: defender.id,
      atMs: atMs + 900,
      description: `${defender.displayName} keeps structural coherence and avoids collapse.`,
      effect: {
        scoreDelta: 2,
      },
      round,
      title: "Hold line",
      type: "defense",
    });

    const defenderCard = defender.cards[(round + 1) % defender.cards.length];
    const defenderRun = await runOrchestratedExchange(
      defender,
      player,
      defenderCard,
      round,
      preview.topic,
    );
    aiAssistUsed ||= defenderRun.usedAi;
    playerHealth = clampInt(
      playerHealth - defenderRun.exchange.defenderDamage,
      0,
      100,
    );
    defenderScore += defenderRun.exchange.scoreDelta;
    pushEvent({
      actorId: defender.id,
      atMs: atMs + 1250,
      description: defenderRun.exchange.description,
      effect: {
        healthDelta: -defenderRun.exchange.defenderDamage,
        scoreDelta: defenderRun.exchange.scoreDelta,
      },
      round,
      tags: defenderRun.exchange.tags,
      targetId: player.id,
      title: defenderRun.exchange.title,
      type: defenderRun.exchange.weaknessHit ? "weakness_hit" : "attack",
    });

    pushEvent({
      atMs: atMs + 950,
      description: `${player.displayName} ${playerScore} : ${defenderScore} ${defender.displayName}`,
      round,
      title: "Score update",
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
        ? `${player.displayName} closes the match with the sharper profile-to-argument conversion.`
        : `${defender.displayName} survives and wins through stronger defensive coherence.`,
    round: 4,
    title: "Final ruling",
    type: "match_end",
  });

  const replayAnchor = createReplayAnchorPreview(
    winnerId === player.id ? defender : player,
  );
  pushEvent({
    actorId: winnerId,
    atMs: atMs + 1600,
    description: `${replayAnchor.displayName} becomes the rematch anchor for the next real-data bout.`,
    round: 4,
    title: "Rematch anchor",
    type: "challenger_preview",
  });

  return {
    challengerPreview: replayAnchor,
    classicLabel: "SecondMe vs SecondMe",
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
    roomTitle: `${preview.topic.title} | ${player.displayName} vs ${defender.displayName}`,
    sourceMeta: {
      ...preview.sourceMeta,
      aiAssistUsed,
    },
    topic: preview.topic,
    winnerId,
  } satisfies BattlePackage;
};

export const getSuggestedFollowUpPreview = () => {
  const challenger = challengerPresets[0];

  return {
    archetype: challenger.archetype,
    aura: challenger.aura,
    declaration: challenger.declaration,
    displayName: challenger.displayName,
    label: "Classic challenger",
    soul: {
      ferocity: 74,
      guard: 76,
      insight: 72,
      resolve: 79,
      tempo: 68,
    },
  } satisfies BattlePreview;
};
