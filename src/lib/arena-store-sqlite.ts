import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync, type StatementSync } from "node:sqlite";

import type {
  BattlePackage,
  BattleSetupRecord,
  OpenClawBindCodeRecord,
  OpenClawBindingRecord,
} from "@/lib/arena-types";
import {
  type ArenaStore,
  parseJson,
  type SaveBattleSetupInput,
  type SaveOpenClawBindCodeInput,
  type SaveOpenClawBindingInput,
  toBattleSummary,
} from "@/lib/arena-store-shared";

type SQLiteDatabase = {
  exec: (sql: string) => void;
  prepare: <Row extends Record<string, unknown> = Record<string, unknown>>(
    sql: string,
  ) => StatementSync<Row>;
};

const DB_DIR = join(process.cwd(), ".local");
const DB_PATH = join(DB_DIR, "soul-arena.sqlite");

type GlobalSQLiteStore = typeof globalThis & {
  __soulArenaSqliteDb?: SQLiteDatabase;
};

type BattlePackageRow = {
  battle_package_json: string;
};

type SetupRow = {
  battle_setup_json: string;
};

type OpenClawBindingRow = {
  binding_json: string;
};

type OpenClawBindCodeRow = {
  bind_code_json: string;
};

const globalSQLiteStore = globalThis as GlobalSQLiteStore;

const ensureColumn = (
  db: SQLiteDatabase,
  table: string,
  column: string,
  definition: string,
) => {
  const pragma = db.prepare<{ name: string }>(`PRAGMA table_info(${table})`);
  const columns = pragma.all();

  if (columns.some((item) => item.name === column)) {
    return;
  }

  db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
};

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

    CREATE TABLE IF NOT EXISTS battle_setups (
      id TEXT PRIMARY KEY,
      created_at TEXT NOT NULL,
      origin_battle_id TEXT,
      topic_id TEXT NOT NULL,
      topic_json TEXT NOT NULL,
      participant_refs_json TEXT NOT NULL,
      overrides_json TEXT NOT NULL,
      battle_setup_json TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_battle_setups_created_at
      ON battle_setups(created_at DESC);

    CREATE TABLE IF NOT EXISTS openclaw_bindings (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      slot TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      version TEXT NOT NULL,
      binding_json TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_openclaw_bindings_session_slot
      ON openclaw_bindings(session_id, slot, updated_at DESC);

    CREATE TABLE IF NOT EXISTS openclaw_bind_codes (
      code TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      slot TEXT NOT NULL,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      used_at TEXT,
      bind_code_json TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_openclaw_bind_codes_session_slot
      ON openclaw_bind_codes(session_id, slot, created_at DESC);
  `);

  return db;
};

const db = globalSQLiteStore.__soulArenaSqliteDb ?? initDatabase();

if (!globalSQLiteStore.__soulArenaSqliteDb) {
  globalSQLiteStore.__soulArenaSqliteDb = db;
}

export const createSqliteArenaStore = (): ArenaStore => ({
  saveBattlePackage: async (battle) => {
    ensureColumn(db, "battles", "setup_id", "TEXT");
    ensureColumn(db, "battles", "origin_battle_id", "TEXT");

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
        battle_package_json,
        setup_id,
        origin_battle_id
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        battle_package_json = excluded.battle_package_json,
        setup_id = excluded.setup_id,
        origin_battle_id = excluded.origin_battle_id
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
      battle.setupId ?? battle.sourceMeta.setupId ?? null,
      battle.originBattleId ?? battle.sourceMeta.originBattleId ?? null,
    );
  },
  getBattlePackage: async (battleId) => {
    const statement = db.prepare<BattlePackageRow>(
      "SELECT battle_package_json FROM battles WHERE id = ?",
    );
    const row = statement.get(battleId);
    return parseJson<BattlePackage>(row?.battle_package_json);
  },
  listBattlePackages: async ({ limit, order = "desc" } = {}) => {
    const safeOrder = order === "asc" ? "ASC" : "DESC";

    if (typeof limit === "number" && Number.isFinite(limit)) {
      const safeLimit = Math.max(1, Math.min(500, Math.floor(limit)));
      const statement = db.prepare<BattlePackageRow>(`
        SELECT battle_package_json
        FROM battles
        ORDER BY created_at ${safeOrder}
        LIMIT ?
      `);

      return statement
        .all(safeLimit)
        .map((row) => parseJson<BattlePackage>(row.battle_package_json))
        .filter((battle): battle is BattlePackage => Boolean(battle));
    }

    const statement = db.prepare<BattlePackageRow>(`
      SELECT battle_package_json
      FROM battles
      ORDER BY created_at ${safeOrder}
    `);

    return statement
      .all()
      .map((row) => parseJson<BattlePackage>(row.battle_package_json))
      .filter((battle): battle is BattlePackage => Boolean(battle));
  },
  listBattleSummaries: async (limit = 50) => {
    const battles = await createSqliteArenaStore().listBattlePackages({
      limit,
      order: "desc",
    });
    return battles.map(toBattleSummary);
  },
  saveBattleSetup: async (setup: SaveBattleSetupInput) => {
    const record: BattleSetupRecord = {
      ...setup,
      createdAt: setup.createdAt ?? new Date().toISOString(),
      id: setup.id ?? randomUUID(),
    };
    const statement = db.prepare(`
      INSERT INTO battle_setups (
        id,
        created_at,
        origin_battle_id,
        topic_id,
        topic_json,
        participant_refs_json,
        overrides_json,
        battle_setup_json
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        created_at = excluded.created_at,
        origin_battle_id = excluded.origin_battle_id,
        topic_id = excluded.topic_id,
        topic_json = excluded.topic_json,
        participant_refs_json = excluded.participant_refs_json,
        overrides_json = excluded.overrides_json,
        battle_setup_json = excluded.battle_setup_json
    `);

    statement.run(
      record.id,
      record.createdAt,
      record.originBattleId ?? null,
      record.topicId,
      JSON.stringify(record.topicSnapshot ?? null),
      JSON.stringify(record.participants),
      JSON.stringify(record.overrides ?? {}),
      JSON.stringify(record),
    );

    return record;
  },
  getBattleSetup: async (setupId) => {
    const statement = db.prepare<SetupRow>(
      "SELECT battle_setup_json FROM battle_setups WHERE id = ?",
    );
    const row = statement.get(setupId);
    return parseJson<BattleSetupRecord>(row?.battle_setup_json);
  },
  saveOpenClawBinding: async ({ input, sessionId, slot }: SaveOpenClawBindingInput) => {
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
    const statement = db.prepare(`
      INSERT INTO openclaw_bindings (
        id,
        session_id,
        slot,
        created_at,
        updated_at,
        version,
        binding_json
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    statement.run(
      record.id,
      record.sessionId,
      record.slot,
      record.createdAt,
      record.updatedAt,
      record.version,
      JSON.stringify(record),
    );

    return record;
  },
  getOpenClawBindingById: async ({ bindingId, sessionId }) => {
    const statement = db.prepare<OpenClawBindingRow>(`
      SELECT binding_json
      FROM openclaw_bindings
      WHERE id = ? AND session_id = ?
      LIMIT 1
    `);
    const row = statement.get(bindingId, sessionId);
    return parseJson<OpenClawBindingRecord>(row?.binding_json);
  },
  getLatestOpenClawBindingForSlot: async ({ sessionId, slot }) => {
    const statement = db.prepare<OpenClawBindingRow>(`
      SELECT binding_json
      FROM openclaw_bindings
      WHERE session_id = ? AND slot = ?
      ORDER BY updated_at DESC
      LIMIT 1
    `);
    const row = statement.get(sessionId, slot);
    return parseJson<OpenClawBindingRecord>(row?.binding_json);
  },
  clearOpenClawBindingsForSlot: async ({ sessionId, slot }) => {
    const statement = db.prepare(
      "DELETE FROM openclaw_bindings WHERE session_id = ? AND slot = ?",
    );
    statement.run(sessionId, slot);
  },
  saveOpenClawBindCode: async ({
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
    const statement = db.prepare(`
      INSERT INTO openclaw_bind_codes (
        code,
        session_id,
        slot,
        created_at,
        expires_at,
        used_at,
        bind_code_json
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    statement.run(
      record.code,
      record.sessionId,
      record.slot,
      record.createdAt,
      record.expiresAt,
      record.usedAt,
      JSON.stringify(record),
    );
    return record;
  },
  getOpenClawBindCode: async (code) => {
    const statement = db.prepare<OpenClawBindCodeRow>(
      "SELECT bind_code_json FROM openclaw_bind_codes WHERE code = ? LIMIT 1",
    );
    const row = statement.get(code);
    return parseJson<OpenClawBindCodeRecord>(row?.bind_code_json);
  },
  markOpenClawBindCodeUsed: async ({ code, usedAt }) => {
    const current = await createSqliteArenaStore().getOpenClawBindCode(code);
    if (!current) {
      return null;
    }

    const next: OpenClawBindCodeRecord = {
      ...current,
      usedAt,
    };
    const statement = db.prepare(`
      UPDATE openclaw_bind_codes
      SET used_at = ?, bind_code_json = ?
      WHERE code = ?
    `);
    statement.run(usedAt, JSON.stringify(next), code);
    return next;
  },
  clearOpenClawBindCodesForSlot: async ({ sessionId, slot }) => {
    const statement = db.prepare(
      "DELETE FROM openclaw_bind_codes WHERE session_id = ? AND slot = ? AND used_at IS NULL",
    );
    statement.run(sessionId, slot);
  },
});
