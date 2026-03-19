import type {
  ArenaParticipantSlot,
  BattlePackage,
  BattleSetupRecord,
  BattleSummary,
  OpenClawBindCodeRecord,
  OpenClawBindingInput,
  OpenClawBindingRecord,
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
