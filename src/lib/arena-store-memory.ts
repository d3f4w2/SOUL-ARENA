import { randomUUID } from "node:crypto";

import type {
  AudienceMember,
  BattlePackage,
  BattleSetupRecord,
  LiveSession,
  OpenClawBindCodeRecord,
  OpenClawBindingRecord,
  Vote,
} from "@/lib/arena-types";
import {
  type ArenaStore,
  type SaveAudienceMemberInput,
  type SaveBattleSetupInput,
  type SaveLiveSessionInput,
  type SaveOpenClawBindCodeInput,
  type SaveOpenClawBindingInput,
  type SaveVoteInput,
  toBattleSummary,
} from "@/lib/arena-store-shared";

type MemoryState = {
  audienceMembers: Map<string, AudienceMember>;
  battles: Map<string, BattlePackage>;
  bindCodes: Map<string, OpenClawBindCodeRecord>;
  bindings: Map<string, OpenClawBindingRecord>;
  liveSession: LiveSession | null;
  setups: Map<string, BattleSetupRecord>;
  votes: Map<string, Vote>;
};

type GlobalMemoryStore = typeof globalThis & {
  __soulArenaMemoryStore?: MemoryState;
};

const globalMemoryStore = globalThis as GlobalMemoryStore;

const state =
  globalMemoryStore.__soulArenaMemoryStore ??
  {
    audienceMembers: new Map<string, AudienceMember>(),
    battles: new Map<string, BattlePackage>(),
    bindCodes: new Map<string, OpenClawBindCodeRecord>(),
    bindings: new Map<string, OpenClawBindingRecord>(),
    liveSession: null,
    setups: new Map<string, BattleSetupRecord>(),
    votes: new Map<string, Vote>(),
  };

if (!globalMemoryStore.__soulArenaMemoryStore) {
  globalMemoryStore.__soulArenaMemoryStore = state;
}

const saveBattleSetup = async (setup: SaveBattleSetupInput) => {
  const record: BattleSetupRecord = {
    ...setup,
    createdAt: setup.createdAt ?? new Date().toISOString(),
    id: setup.id ?? randomUUID(),
  };
  state.setups.set(record.id, record);
  return record;
};

const saveOpenClawBinding = async ({
  input,
  sessionId,
  slot,
}: SaveOpenClawBindingInput) => {
  const now = new Date().toISOString();
  const record: OpenClawBindingRecord = {
    createdAt: now,
    id: randomUUID(),
    profile: {
      archetype: input.archetype?.trim() || "OpenClaw Persona",
      agentVersion: input.agentVersion?.trim(),
      aura: input.aura?.trim() || "OpenClaw Amber",
      avatarUrl: input.avatarUrl?.trim(),
      declaration: input.declaration.trim(),
      displayId: input.displayId?.trim(),
      displayName: input.displayName.trim(),
      memoryAnchors: input.memoryAnchors.map((item) => item.trim()).filter(Boolean),
      rule: input.rule.trim(),
      runtimeLabel: input.runtimeLabel?.trim() || "OpenClaw Hosted Runtime",
      soulSeedTags: input.soulSeedTags.map((item) => item.trim()).filter(Boolean),
      sourceFile: input.sourceFile?.trim(),
      sourceKind: input.sourceKind ?? "workspace_import",
      sourceLabel: input.sourceLabel?.trim() || "OpenClaw Hosted Config",
      taboo: input.taboo.trim(),
      tags: input.tags.map((item) => item.trim()).filter(Boolean),
      viewpoints: input.viewpoints.map((item) => item.trim()).filter(Boolean),
    },
    sessionId,
    slot,
    updatedAt: now,
    version: now,
  };
  state.bindings.set(record.id, record);
  return record;
};

const saveOpenClawBindCode = async ({
  code,
  expiresAt,
  sessionId,
  slot,
}: SaveOpenClawBindCodeInput) => {
  const record: OpenClawBindCodeRecord = {
    code,
    createdAt: new Date().toISOString(),
    expiresAt,
    sessionId,
    slot,
    usedAt: null,
  };
  state.bindCodes.set(code, record);
  return record;
};

const saveAudienceMember = async ({
  avatarDataUrl,
  displayId,
  displayName,
  sessionId,
}: SaveAudienceMemberInput) => {
  const record: AudienceMember = {
    avatarDataUrl: avatarDataUrl ?? null,
    createdAt: new Date().toISOString(),
    displayId: displayId ?? null,
    displayName,
    id: randomUUID(),
    sessionId,
  };
  state.audienceMembers.set(record.id, record);
  return record;
};

const listAudienceMembers = async (limit = 200) =>
  [...state.audienceMembers.values()]
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, Math.max(1, Math.min(limit, 500)));

const setLiveSession = async ({ battleId, startAt }: SaveLiveSessionInput) => {
  const now = new Date().toISOString();
  const next: LiveSession = {
    battleId: battleId ?? null,
    createdAt: state.liveSession?.createdAt ?? now,
    sessionId: "global",
    startAt: startAt ?? null,
    updatedAt: now,
  };
  state.liveSession = next;
  return next;
};

const getLiveSession = async () => state.liveSession;

const saveVote = async ({ battleId, sessionId, side }: SaveVoteInput) => {
  const record: Vote = {
    battleId,
    createdAt: new Date().toISOString(),
    id: randomUUID(),
    sessionId,
    side,
  };
  state.votes.set(record.id, record);
  return record;
};

const countVotes = async ({ battleId }: { battleId: string }) => {
  let player = 0;
  let defender = 0;

  for (const vote of state.votes.values()) {
    if (vote.battleId !== battleId) {
      continue;
    }

    if (vote.side === "player") {
      player += 1;
    } else if (vote.side === "defender") {
      defender += 1;
    }
  }

  return {
    defender,
    player,
  };
};

export const createMemoryArenaStore = (): ArenaStore => ({
  saveBattlePackage: async (battle) => {
    state.battles.set(battle.id, battle);
  },
  getBattlePackage: async (battleId) => state.battles.get(battleId) ?? null,
  listBattlePackages: async ({ limit, order = "desc" } = {}) => {
    const values = [...state.battles.values()].sort((left, right) =>
      order === "asc"
        ? left.createdAt.localeCompare(right.createdAt)
        : right.createdAt.localeCompare(left.createdAt),
    );

    if (typeof limit === "number") {
      return values.slice(0, Math.max(1, Math.min(limit, 500)));
    }

    return values;
  },
  listBattleSummaries: async (limit = 50) => {
    const battles = await createMemoryArenaStore().listBattlePackages({
      limit,
      order: "desc",
    });
    return battles.map(toBattleSummary);
  },
  saveBattleSetup,
  getBattleSetup: async (setupId) => state.setups.get(setupId) ?? null,
  saveOpenClawBinding,
  getOpenClawBindingById: async ({ bindingId, sessionId }) => {
    const binding = state.bindings.get(bindingId);
    return binding?.sessionId === sessionId ? binding : null;
  },
  getLatestOpenClawBindingForSlot: async ({ sessionId, slot }) =>
    [...state.bindings.values()]
      .filter((binding) => binding.sessionId === sessionId && binding.slot === slot)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0] ?? null,
  clearOpenClawBindingsForSlot: async ({ sessionId, slot }) => {
    for (const [id, binding] of state.bindings.entries()) {
      if (binding.sessionId === sessionId && binding.slot === slot) {
        state.bindings.delete(id);
      }
    }
  },
  saveOpenClawBindCode,
  getOpenClawBindCode: async (code) => state.bindCodes.get(code) ?? null,
  markOpenClawBindCodeUsed: async ({ code, usedAt }) => {
    const current = state.bindCodes.get(code);
    if (!current) {
      return null;
    }
    const next = { ...current, usedAt };
    state.bindCodes.set(code, next);
    return next;
  },
  clearOpenClawBindCodesForSlot: async ({ sessionId, slot }) => {
    for (const [code, bindCode] of state.bindCodes.entries()) {
      if (bindCode.sessionId === sessionId && bindCode.slot === slot && !bindCode.usedAt) {
        state.bindCodes.delete(code);
      }
    }
  },
  saveAudienceMember,
  listAudienceMembers,
  setLiveSession,
  getLiveSession,
  saveVote,
  countVotes,
});
