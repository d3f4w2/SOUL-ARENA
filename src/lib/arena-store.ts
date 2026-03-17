import type { BattlePackage } from "@/lib/arena-types";

const globalArenaStore = globalThis as typeof globalThis & {
  __soulArenaBattleStore?: Map<string, BattlePackage>;
};

const battleStore =
  globalArenaStore.__soulArenaBattleStore ??
  new Map<string, BattlePackage>();

if (!globalArenaStore.__soulArenaBattleStore) {
  globalArenaStore.__soulArenaBattleStore = battleStore;
}

export const saveBattlePackage = (battle: BattlePackage) => {
  battleStore.set(battle.id, battle);
};

export const getBattlePackage = (battleId: string) => battleStore.get(battleId);
