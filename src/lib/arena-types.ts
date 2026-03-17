export type SoulStatKey =
  | "ferocity"
  | "guard"
  | "insight"
  | "tempo"
  | "resolve";

export type SoulStats = Record<SoulStatKey, number>;

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

export type FighterProfile = {
  id: string;
  archetype: string;
  aura: string;
  buildSummary: string[];
  cards: BuildCard[];
  declaration: string;
  displayName: string;
  health: number;
  powerLabel: string;
  role: "challenger" | "defender";
  soul: SoulStats;
};

export type ArenaBuildPreview = {
  topic: TopicPreset;
  challenger: ChallengerPreset;
  defender: FighterProfile;
  equipmentNotes: string[];
  matchUpCallout: string;
  player: FighterProfile;
  predictedEdges: string[];
};

export type ArenaBattleSetup = {
  challengerId: string;
  player: FighterBuildInput;
  topicId: string;
};

export type BattleEventType =
  | "intro"
  | "round_start"
  | "build_hint"
  | "attack"
  | "defense"
  | "weakness_hit"
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
  soul: SoulStats;
};

export type BattlePackage = {
  challengerPreview: BattlePreview;
  classicLabel: string;
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
  player: FighterProfile;
  roomTitle: string;
  topic: TopicPreset;
  winnerId: string;
};
