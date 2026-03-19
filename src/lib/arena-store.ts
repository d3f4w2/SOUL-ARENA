import type {
  ArenaParticipantSlot,
  AudienceMember,
  BattlePackage,
  BattleSetupRecord,
  BattleSummary,
  LiveSession,
  OpenClawBindCodeRecord,
  OpenClawBindingRecord,
  SecondMeBindCodeRecord,
  SecondMeSessionRecord,
  Vote,
} from "@/lib/arena-types";
import { env } from "@/lib/env";
import { createMemoryArenaStore } from "@/lib/arena-store-memory";
import type {
  ArenaStore,
  ListBattlePackagesOptions,
  SaveAudienceMemberInput,
  SaveBattleSetupInput,
  SaveLiveSessionInput,
  SaveOpenClawBindCodeInput,
  SaveOpenClawBindingInput,
  SaveSecondMeBindCodeInput,
  SaveSecondMeSessionInput,
  SaveVoteInput,
} from "@/lib/arena-store-shared";

type GlobalArenaStore = typeof globalThis & {
  __soulArenaStorePromise?: Promise<ArenaStore>;
  __soulArenaStoreKind?: "memory" | "postgres" | "sqlite";
};

const globalArenaStore = globalThis as GlobalArenaStore;
const isVercelDeployment =
  process.env.VERCEL === "1" || typeof process.env.VERCEL_ENV === "string";

const logStoreSelection = (kind: "memory" | "postgres" | "sqlite") => {
  if (globalArenaStore.__soulArenaStoreKind === kind) {
    return;
  }

  globalArenaStore.__soulArenaStoreKind = kind;
  console.info(`[arena-store] using ${kind} persistence`);
};

const loadStore = async (): Promise<ArenaStore> => {
  if (env.POSTGRES_URL) {
    const { createPostgresArenaStore } = await import("@/lib/arena-store-postgres");
    logStoreSelection("postgres");
    return createPostgresArenaStore();
  }

  if (isVercelDeployment) {
    throw new Error(
      "POSTGRES_URL must be configured for Vercel deployments. Local SQLite persistence is only supported for local development.",
    );
  }

  try {
    const { createSqliteArenaStore } = await import("@/lib/arena-store-sqlite");
    logStoreSelection("sqlite");
    return createSqliteArenaStore();
  } catch (error) {
    console.error("Failed to initialize SQLite store:", error);
  }

  logStoreSelection("memory");
  console.warn(
    "[arena-store] falling back to in-memory persistence; data will not survive process restarts",
  );
  return createMemoryArenaStore();
};

const getArenaStore = () => {
  if (!globalArenaStore.__soulArenaStorePromise) {
    globalArenaStore.__soulArenaStorePromise = loadStore();
  }

  return globalArenaStore.__soulArenaStorePromise;
};

export const saveBattlePackage = async (battle: BattlePackage) =>
  (await getArenaStore()).saveBattlePackage(battle);

export const getBattlePackage = async (battleId: string) =>
  (await getArenaStore()).getBattlePackage(battleId);

export const listBattlePackages = async (options?: ListBattlePackagesOptions) =>
  (await getArenaStore()).listBattlePackages(options);

export const listBattleSummaries = async (limit = 50): Promise<BattleSummary[]> =>
  (await getArenaStore()).listBattleSummaries(limit);

export const saveBattleSetup = async (setup: SaveBattleSetupInput): Promise<BattleSetupRecord> =>
  (await getArenaStore()).saveBattleSetup(setup);

export const getBattleSetup = async (setupId: string) =>
  (await getArenaStore()).getBattleSetup(setupId);

export const saveOpenClawBinding = async (input: SaveOpenClawBindingInput): Promise<OpenClawBindingRecord> =>
  (await getArenaStore()).saveOpenClawBinding(input);

export const getOpenClawBindingById = async (input: {
  bindingId: string;
  sessionId: string;
}) => (await getArenaStore()).getOpenClawBindingById(input);

export const getLatestOpenClawBindingForSlot = async (input: {
  sessionId: string;
  slot: ArenaParticipantSlot;
}) => (await getArenaStore()).getLatestOpenClawBindingForSlot(input);

export const clearOpenClawBindingsForSlot = async (input: {
  sessionId: string;
  slot: ArenaParticipantSlot;
}) => (await getArenaStore()).clearOpenClawBindingsForSlot(input);

export const saveOpenClawBindCode = async (
  input: SaveOpenClawBindCodeInput,
): Promise<OpenClawBindCodeRecord> =>
  (await getArenaStore()).saveOpenClawBindCode(input);

export const getOpenClawBindCode = async (code: string) =>
  (await getArenaStore()).getOpenClawBindCode(code);

export const markOpenClawBindCodeUsed = async (input: {
  code: string;
  usedAt: string;
}) => (await getArenaStore()).markOpenClawBindCodeUsed(input);

export const clearOpenClawBindCodesForSlot = async (input: {
  sessionId: string;
  slot: ArenaParticipantSlot;
}) => (await getArenaStore()).clearOpenClawBindCodesForSlot(input);

export const saveSecondMeSession = async (
  input: SaveSecondMeSessionInput,
): Promise<SecondMeSessionRecord> =>
  (await getArenaStore()).saveSecondMeSession(input);

export const getSecondMeSessionForSlot = async (input: {
  sessionId: string;
  slot: ArenaParticipantSlot;
}) => (await getArenaStore()).getSecondMeSessionForSlot(input);

export const clearSecondMeSessionsForSlot = async (input: {
  sessionId: string;
  slot: ArenaParticipantSlot;
}) => (await getArenaStore()).clearSecondMeSessionsForSlot(input);

export const saveSecondMeBindCode = async (
  input: SaveSecondMeBindCodeInput,
): Promise<SecondMeBindCodeRecord> =>
  (await getArenaStore()).saveSecondMeBindCode(input);

export const getSecondMeBindCode = async (code: string) =>
  (await getArenaStore()).getSecondMeBindCode(code);

export const getLatestSecondMeBindCodeForSlot = async (input: {
  sessionId: string;
  slot: ArenaParticipantSlot;
}) => (await getArenaStore()).getLatestSecondMeBindCodeForSlot(input);

export const markSecondMeBindCodeUsed = async (input: {
  code: string;
  usedAt: string;
}) => (await getArenaStore()).markSecondMeBindCodeUsed(input);

export const clearSecondMeBindCodesForSlot = async (input: {
  sessionId: string;
  slot: ArenaParticipantSlot;
}) => (await getArenaStore()).clearSecondMeBindCodesForSlot(input);

export const saveAudienceMember = async (
  input: SaveAudienceMemberInput,
): Promise<AudienceMember> => (await getArenaStore()).saveAudienceMember(input);

export const listAudienceMembers = async (limit?: number) =>
  (await getArenaStore()).listAudienceMembers(limit);

export const setLiveSession = async (
  input: SaveLiveSessionInput,
): Promise<LiveSession> => (await getArenaStore()).setLiveSession(input);

export const getLiveSession = async () => (await getArenaStore()).getLiveSession();

export const saveVote = async (input: SaveVoteInput): Promise<Vote> =>
  (await getArenaStore()).saveVote(input);

export const countVotes = async (input: {
  battleId: string;
}): Promise<{ player: number; defender: number }> =>
  (await getArenaStore()).countVotes(input);
