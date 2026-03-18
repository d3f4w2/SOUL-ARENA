import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync, type StatementSync } from "node:sqlite";

import type { BattlePackage, BattleSummary } from "@/lib/arena-types";

type SQLiteDatabase = {
  exec: (sql: string) => void;
  prepare: <Row extends Record<string, unknown> = Record<string, unknown>>(sql: string) => StatementSync<Row>;
};

const DB_DIR = join(process.cwd(), ".local");
const DB_PATH = join(DB_DIR, "soul-arena.sqlite");

type GlobalArenaStore = typeof globalThis & {
  __soulArenaDb?: SQLiteDatabase;
};

type BattleSummaryRow = {
  created_at: string;
  defender_display_name: string;
  generation_mode: string;
  id: string;
  player_display_name: string;
  room_title: string;
  topic_id: string;
  winner_id: string;
};

const globalArenaStore = globalThis as GlobalArenaStore;

const initDatabase = () => {
  mkdirSync(DB_DIR, { recursive: true });

  const db = new DatabaseSync(DB_PATH);
  db.exec(`
    CREATE TABLE IF NOT EXISTS battles (
      id TEXT PRIMARY KEY,
      created_at TEXT NOT NULL,
      topic_id TEXT NOT NULL,
      room_title TEXT NOT NULL,
      winner_id TEXT NOT NULL,
      player_display_name TEXT NOT NULL,
      defender_display_name TEXT NOT NULL,
      generation_mode TEXT NOT NULL,
      source_meta_json TEXT NOT NULL,
      participant_refs_json TEXT NOT NULL,
      battle_package_json TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_battles_created_at
      ON battles(created_at DESC);
  `);

  return db;
};

const db = globalArenaStore.__soulArenaDb ?? initDatabase();

if (!globalArenaStore.__soulArenaDb) {
  globalArenaStore.__soulArenaDb = db;
}

const parseBattlePackage = (value: string | null | undefined) => {
  if (!value) {
    return null;
  }

  return JSON.parse(value) as BattlePackage;
};

const toBattleSummary = (row: BattleSummaryRow): BattleSummary => ({
  createdAt: row.created_at,
  defenderDisplayName: row.defender_display_name,
  generationMode:
    row.generation_mode === "mock" ? "mock" : "orchestrated",
  id: row.id,
  playerDisplayName: row.player_display_name,
  roomTitle: row.room_title,
  topicId: row.topic_id,
  winnerId: row.winner_id,
});

export const saveBattlePackage = (battle: BattlePackage) => {
  const statement = db.prepare(`
    INSERT INTO battles (
      id,
      created_at,
      topic_id,
      room_title,
      winner_id,
      player_display_name,
      defender_display_name,
      generation_mode,
      source_meta_json,
      participant_refs_json,
      battle_package_json
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      created_at = excluded.created_at,
      topic_id = excluded.topic_id,
      room_title = excluded.room_title,
      winner_id = excluded.winner_id,
      player_display_name = excluded.player_display_name,
      defender_display_name = excluded.defender_display_name,
      generation_mode = excluded.generation_mode,
      source_meta_json = excluded.source_meta_json,
      participant_refs_json = excluded.participant_refs_json,
      battle_package_json = excluded.battle_package_json
  `);

  statement.run(
    battle.id,
    battle.createdAt,
    battle.topic.id,
    battle.roomTitle,
    battle.winnerId,
    battle.player.displayName,
    battle.defender.displayName,
    battle.sourceMeta.generationMode,
    JSON.stringify(battle.sourceMeta),
    JSON.stringify(battle.participantRefs),
    JSON.stringify(battle),
  );
};

export const getBattlePackage = (battleId: string) => {
  const statement = db.prepare<{ battle_package_json: string }>(
    "SELECT battle_package_json FROM battles WHERE id = ?",
  );
  const row = statement.get(battleId);

  return parseBattlePackage(row?.battle_package_json);
};

export const listBattleSummaries = (limit = 50) => {
  const safeLimit = Number.isFinite(limit)
    ? Math.max(1, Math.min(200, Math.floor(limit)))
    : 50;
  const statement = db.prepare<BattleSummaryRow>(`
    SELECT
      id,
      created_at,
      topic_id,
      room_title,
      winner_id,
      player_display_name,
      defender_display_name,
      generation_mode
    FROM battles
    ORDER BY created_at DESC
    LIMIT ?
  `);

  return statement.all(safeLimit).map(toBattleSummary);
};
