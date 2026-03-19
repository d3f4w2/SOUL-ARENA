import type {
  ArenaParticipantSlot,
  AudienceMember,
  BattlePackage,
  BattleSetupRecord,
  BattleSummary,
  LiveSession,
  OpenClawBindCodeRecord,
  OpenClawBindingInput,
  OpenClawBindingRecord,
  Vote,
  VoteSide,
} from "@/lib/arena-types";

export type ListBattlePackagesOptions = {
  limit?: number;
  order?: "asc" | "desc";
};

export type SaveBattleSetupInput = Omit<BattleSetupRecord, "createdAt" | "id"> & {
  createdAt?: string;
  id?: string;
};

export type SaveOpenClawBindingInput = {
  input: OpenClawBindingInput;
  sessionId: string;
  slot: ArenaParticipantSlot;
};

export type SaveOpenClawBindCodeInput = {
  code: string;
  expiresAt: string;
  sessionId: string;
  slot: ArenaParticipantSlot;
};

export type SaveAudienceMemberInput = {
  avatarDataUrl?: string;
  displayId?: string;
  displayName: string;
  sessionId: string;
};

export type SaveLiveSessionInput = {
  battleId?: string | null;
  startAt?: string | null;
};

export type SaveVoteInput = {
  battleId: string;
  sessionId: string;
  side: VoteSide;
};

export type ClearSlotInput = {
  sessionId: string;
  slot: ArenaParticipantSlot;
};

export type ArenaStore = {
  saveBattlePackage: (battle: BattlePackage) => Promise<void>;
  getBattlePackage: (battleId: string) => Promise<BattlePackage | null>;
  listBattlePackages: (options?: ListBattlePackagesOptions) => Promise<BattlePackage[]>;
  listBattleSummaries: (limit?: number) => Promise<BattleSummary[]>;
  saveBattleSetup: (setup: SaveBattleSetupInput) => Promise<BattleSetupRecord>;
  getBattleSetup: (setupId: string) => Promise<BattleSetupRecord | null>;
  saveOpenClawBinding: (input: SaveOpenClawBindingInput) => Promise<OpenClawBindingRecord>;
  getOpenClawBindingById: (input: { bindingId: string; sessionId: string }) => Promise<OpenClawBindingRecord | null>;
  getLatestOpenClawBindingForSlot: (input: ClearSlotInput) => Promise<OpenClawBindingRecord | null>;
  clearOpenClawBindingsForSlot: (input: ClearSlotInput) => Promise<void>;
  saveOpenClawBindCode: (input: SaveOpenClawBindCodeInput) => Promise<OpenClawBindCodeRecord>;
  getOpenClawBindCode: (code: string) => Promise<OpenClawBindCodeRecord | null>;
  markOpenClawBindCodeUsed: (input: { code: string; usedAt: string }) => Promise<OpenClawBindCodeRecord | null>;
  clearOpenClawBindCodesForSlot: (input: ClearSlotInput) => Promise<void>;
  saveAudienceMember: (input: SaveAudienceMemberInput) => Promise<AudienceMember>;
  listAudienceMembers: (limit?: number) => Promise<AudienceMember[]>;
  setLiveSession: (input: SaveLiveSessionInput) => Promise<LiveSession>;
  getLiveSession: () => Promise<LiveSession | null>;
  saveVote: (input: SaveVoteInput) => Promise<Vote>;
  countVotes: (input: { battleId: string }) => Promise<{ player: number; defender: number }>;
};

export const parseJson = <T>(value: string | null | undefined) => {
  if (!value) {
    return null;
  }

  return JSON.parse(value) as T;
};

export const toBattleSummary = (battle: BattlePackage): BattleSummary => ({
  createdAt: battle.createdAt,
  defenderDisplayName: battle.defender.displayName,
  generationMode: battle.sourceMeta.generationMode,
  id: battle.id,
  originBattleId: battle.originBattleId ?? battle.sourceMeta.originBattleId ?? null,
  participantProviders: battle.participantRefs.map((participant) => participant.provider),
  playerDisplayName: battle.player.displayName,
  roomTitle: battle.roomTitle,
  setupId: battle.setupId ?? battle.sourceMeta.setupId,
  topicId: battle.topic.id,
  topicSource: battle.topic.source ?? battle.sourceMeta.topicSource,
  topicTitle: battle.topic.title,
  winnerId: battle.winnerId,
});
