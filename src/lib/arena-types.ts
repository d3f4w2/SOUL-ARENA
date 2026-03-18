export type SoulStatKey =
  | "ferocity"
  | "guard"
  | "insight"
  | "tempo"
  | "resolve";

export type SoulStats = Record<SoulStatKey, number>;

export type ParticipantProvider = "secondme" | "openclaw";
export type ArenaParticipantSlot = "alpha" | "beta";
export type ArenaGenerationMode = "mock" | "orchestrated";
export type BattleOrchestrationMode =
  | "deterministic"
  | "judge_only"
  | "hybrid";

export type TopicPreset = {
  id: string;
  title: string;
  prompt: string;
  fantasy: string;
  stakes: string;
  proLabel: string;
  conLabel: string;
};

export type ChallengerPreset = {
  id: string;
  displayName: string;
  archetype: string;
  aura: string;
  declaration: string;
  soulSeedTags: string[];
  viewpoints: string[];
  rule: string;
  taboo: string;
};

export type BuildCardKind = "viewpoint" | "rule" | "taboo";

export type BuildRadar = {
  originality: number;
  attackability: number;
  defensibility: number;
};

export type BuildCard = {
  id: string;
  kind: BuildCardKind;
  title: string;
  text: string;
  atk: number;
  def: number;
  pen: number;
  spd: number;
  radar: BuildRadar;
  trait: string;
  hint: string;
};

export type FighterBuildInput = {
  displayName: string;
  declaration: string;
  soulSeedTags: string[];
  taboo: string;
  rule: string;
  viewpoints: string[];
};

export type ParticipantBuildOverride = Partial<FighterBuildInput>;

export type SecondMeShade = {
  id?: string | number;
  label?: string;
  name?: string;
  description?: string;
  [key: string]: unknown;
};

export type SecondMeSoftMemory = {
  id?: string | number;
  title?: string;
  content?: string;
  text?: string;
  summary?: string;
  [key: string]: unknown;
};

export type ParticipantSessionSnapshot = {
  authenticated: boolean;
  expiresAt: number | null;
};

export type ArenaParticipantRef = {
  participantId?: string;
  provider: ParticipantProvider;
  slot: ArenaParticipantSlot;
};

export type ArenaParticipantSource = {
  slot: ArenaParticipantSlot;
  provider: ParticipantProvider;
  connected: boolean;
  displayName: string | null;
  secondMeUserId: string | null;
  session: ParticipantSessionSnapshot;
  user: Record<string, unknown> | null;
  shades: SecondMeShade[];
  softMemory: SecondMeSoftMemory[];
  issues: string[];
};

export type FighterSourceMeta = {
  connected: boolean;
  participantId?: string;
  provider: ParticipantProvider;
  secondMeUserId?: string | null;
  slot: ArenaParticipantSlot;
};

export type BattleSourceMeta = {
  aiAssistEnabled: boolean;
  aiAssistUsed: boolean;
  generationMode: ArenaGenerationMode;
  issues: string[];
  orchestrationMode?: BattleOrchestrationMode;
};

export type FighterProfile = {
  id: string;
  archetype: string;
  aura: string;
  buildSummary: string[];
  cards: BuildCard[];
  declaration: string;
  displayName: string;
  health: number;
  identitySummary: string[];
  memoryAnchors: string[];
  powerLabel: string;
  role: "challenger" | "defender";
  soul: SoulStats;
  source: FighterSourceMeta;
};

export type ArenaBuildPreview = {
  topic: TopicPreset;
  defender: FighterProfile;
  equipmentNotes: string[];
  matchUpCallout: string;
  participantRefs: ArenaParticipantRef[];
  player: FighterProfile;
  predictedEdges: string[];
  sourceMeta: BattleSourceMeta;
};

export type ArenaBattleSetup = {
  overrides?: Partial<Record<ArenaParticipantSlot, ParticipantBuildOverride>>;
  participants: ArenaParticipantRef[];
  topicId: string;
};

export type BattleEventType =
  | "intro"
  | "round_start"
  | "build_hint"
  | "attack"
  | "defense"
  | "weakness_hit"
  | "judge_decision"
  | "score_update"
  | "spotlight"
  | "match_end"
  | "challenger_preview";

export type BattleEvent = {
  actorId?: string;
  atMs: number;
  description: string;
  effect?: {
    healthDelta?: number;
    scoreDelta?: number;
  };
  id: string;
  index: number;
  round: number;
  tags?: string[];
  targetId?: string;
  title: string;
  type: BattleEventType;
};

export type JudgeVerdict = {
  commentary: string;
  defenderScore: number;
  id: string;
  playerScore: number;
  title: string;
};

export type BattleHighlight = {
  actorId: string;
  description: string;
  id: string;
  label: string;
  title: string;
};

export type BattlePreview = {
  archetype: string;
  aura: string;
  declaration: string;
  displayName: string;
  label?: string;
  soul: SoulStats;
};

export type ArenaBattleResult = "win" | "loss";
export type ArenaRecentForm = "W" | "L";

export type ArenaCompetitorIdentity = {
  competitorId: string;
  displayName: string;
  provider: ParticipantProvider;
  secondMeUserId: string | null;
  slot: ArenaParticipantSlot | null;
};

export type ArenaBattleCompetitionSide = {
  competitorId: string | null;
  displayName: string;
  ratingBefore: number;
  ratingAfter: number;
  rankBefore: number | null;
  rankAfter: number | null;
  streakBefore: number;
  streakAfter: number;
  scoreDelta: number;
  result: ArenaBattleResult;
};

export type ArenaBattleCompetition = {
  endedOpponentStreak: boolean;
  endedOpponentStreakCount: number;
  isUpsetWin: boolean;
  stakesLabel: string;
  player: ArenaBattleCompetitionSide | null;
  defender: ArenaBattleCompetitionSide | null;
};

export type ArenaChallengeSuggestion = {
  competitorId: string;
  currentStreak: number;
  displayName: string;
  projectedLossDelta: number;
  projectedWinDelta: number;
  rank: number | null;
  rating: number;
  reason: string;
};

export type ArenaCompetitorProfile = ArenaCompetitorIdentity & {
  bestStreak: number;
  currentStreak: number;
  lastBattleAt: string | null;
  lastBattleId: string | null;
  lastBattleTitle: string | null;
  lastResult: ArenaBattleResult | null;
  losses: number;
  rank: number | null;
  rating: number;
  recentForm: ArenaRecentForm[];
  suggestion: ArenaChallengeSuggestion | null;
  totalMatches: number;
  winRate: number;
  wins: number;
};

export type ArenaLeaderboardEntry = ArenaCompetitorProfile;

export type ArenaParticipantCompetitiveProfile = {
  profile: ArenaCompetitorProfile | null;
  slot: ArenaParticipantSlot;
};

export type BattleSummary = {
  competition?: ArenaBattleCompetition | null;
  createdAt: string;
  defenderDisplayName: string;
  generationMode: ArenaGenerationMode;
  id: string;
  playerDisplayName: string;
  roomTitle: string;
  topicId: string;
  winnerId: string;
};

export type BattlePackage = {
  challengerPreview: BattlePreview;
  classicLabel: string;
  competition?: ArenaBattleCompetition | null;
  createdAt: string;
  crowdScore: {
    defender: number;
    player: number;
  };
  defender: FighterProfile;
  events: BattleEvent[];
  finalScore: {
    defender: number;
    player: number;
  };
  highlights: BattleHighlight[];
  id: string;
  judges: JudgeVerdict[];
  participantRefs: ArenaParticipantRef[];
  player: FighterProfile;
  roomTitle: string;
  sourceMeta: BattleSourceMeta;
  topic: TopicPreset;
  winnerId: string;
};
