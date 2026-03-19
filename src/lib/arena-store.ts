import type {
  ArenaParticipantSlot,
  BattlePackage,
  BattleSetupRecord,
  BattleSummary,
  OpenClawBindCodeRecord,
  OpenClawBindingRecord,
} from "@/lib/arena-types";
import { env } from "@/lib/env";
import { createMemoryArenaStore } from "@/lib/arena-store-memory";
import type {
  ArenaStore,
  ListBattlePackagesOptions,
  SaveBattleSetupInput,
  SaveOpenClawBindCodeInput,
  SaveOpenClawBindingInput,
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
