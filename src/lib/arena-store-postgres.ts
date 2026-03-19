import { randomUUID } from "node:crypto";

import { Pool, type QueryResultRow } from "pg";

import { env } from "@/lib/env";
import type {
  BattlePackage,
  BattleSetupRecord,
  OpenClawBindCodeRecord,
  OpenClawBindingRecord,
} from "@/lib/arena-types";
import {
  type ArenaStore,
  type SaveBattleSetupInput,
  type SaveOpenClawBindCodeInput,
  type SaveOpenClawBindingInput,
  toBattleSummary,
} from "@/lib/arena-store-shared";

type GlobalPostgresStore = typeof globalThis & {
  __soulArenaPgPool?: Pool;
  __soulArenaPgReady?: Promise<void>;
};

const globalPostgresStore = globalThis as GlobalPostgresStore;

const getPool = () => {
  if (!env.POSTGRES_URL) {
    throw new Error("POSTGRES_URL is not configured");
  }

  if (!globalPostgresStore.__soulArenaPgPool) {
    globalPostgresStore.__soulArenaPgPool = new Pool({
      connectionString: env.POSTGRES_URL,
      max: 5,
      ssl: env.POSTGRES_URL.includes("localhost")
        ? undefined
        : {
            rejectUnauthorized: false,
          },
    });
  }

  return globalPostgresStore.__soulArenaPgPool;
};

const ensureSchema = async () => {
  const pool = getPool();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS battles (
      id text PRIMARY KEY,
      created_at timestamptz NOT NULL,
      topic_id text NOT NULL,
      room_title text NOT NULL,
      winner_id text NOT NULL,
      player_display_name text NOT NULL,
      defender_display_name text NOT NULL,
      generation_mode text NOT NULL,
      source_meta_json jsonb NOT NULL,
      participant_refs_json jsonb NOT NULL,
      battle_package_json jsonb NOT NULL,
      setup_id text,
      origin_battle_id text
    );

    CREATE INDEX IF NOT EXISTS idx_battles_created_at
      ON battles(created_at DESC);

    CREATE TABLE IF NOT EXISTS battle_setups (
      id text PRIMARY KEY,
      created_at timestamptz NOT NULL,
      origin_battle_id text,
      topic_id text NOT NULL,
      topic_json jsonb NOT NULL,
      participant_refs_json jsonb NOT NULL,
      overrides_json jsonb NOT NULL,
      battle_setup_json jsonb NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_battle_setups_created_at
      ON battle_setups(created_at DESC);

    CREATE TABLE IF NOT EXISTS openclaw_bindings (
      id text PRIMARY KEY,
      session_id text NOT NULL,
      slot text NOT NULL,
      created_at timestamptz NOT NULL,
      updated_at timestamptz NOT NULL,
      version text NOT NULL,
      binding_json jsonb NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_openclaw_bindings_session_slot
      ON openclaw_bindings(session_id, slot, updated_at DESC);

    CREATE TABLE IF NOT EXISTS openclaw_bind_codes (
      code text PRIMARY KEY,
      session_id text NOT NULL,
      slot text NOT NULL,
      created_at timestamptz NOT NULL,
      expires_at timestamptz NOT NULL,
      used_at timestamptz,
      bind_code_json jsonb NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_openclaw_bind_codes_session_slot
      ON openclaw_bind_codes(session_id, slot, created_at DESC);
  `);
};

const ready = () => {
  if (!globalPostgresStore.__soulArenaPgReady) {
    globalPostgresStore.__soulArenaPgReady = ensureSchema();
  }

  return globalPostgresStore.__soulArenaPgReady;
};

const poolQuery = async <T extends QueryResultRow = QueryResultRow>(
  sql: string,
  values: unknown[] = [],
) => {
  await ready();
  const pool = getPool();
  return pool.query<T>(sql, values);
};

export const createPostgresArenaStore = (): ArenaStore => ({
  saveBattlePackage: async (battle) => {
    await poolQuery(
      `
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
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10::jsonb,$11::jsonb,$12,$13)
        ON CONFLICT (id) DO UPDATE SET
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
      `,
      [
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
      ],
    );
  },
  getBattlePackage: async (battleId) => {
    const result = await poolQuery<{ battle_package_json: BattlePackage }>(
      "SELECT battle_package_json FROM battles WHERE id = $1 LIMIT 1",
      [battleId],
    );
    return result.rows[0]?.battle_package_json ?? null;
  },
  listBattlePackages: async ({ limit, order = "desc" } = {}) => {
    const safeOrder = order === "asc" ? "ASC" : "DESC";
    const sql =
      typeof limit === "number"
        ? `SELECT battle_package_json FROM battles ORDER BY created_at ${safeOrder} LIMIT $1`
        : `SELECT battle_package_json FROM battles ORDER BY created_at ${safeOrder}`;
    const result = await poolQuery<{ battle_package_json: BattlePackage }>(
      sql,
      typeof limit === "number" ? [Math.max(1, Math.min(500, Math.floor(limit)))] : [],
    );
    return result.rows.map((row) => row.battle_package_json);
  },
  listBattleSummaries: async (limit = 50) => {
    const battles = await createPostgresArenaStore().listBattlePackages({
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

    await poolQuery(
      `
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
        VALUES ($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7::jsonb,$8::jsonb)
        ON CONFLICT (id) DO UPDATE SET
          created_at = excluded.created_at,
          origin_battle_id = excluded.origin_battle_id,
          topic_id = excluded.topic_id,
          topic_json = excluded.topic_json,
          participant_refs_json = excluded.participant_refs_json,
          overrides_json = excluded.overrides_json,
          battle_setup_json = excluded.battle_setup_json
      `,
      [
        record.id,
        record.createdAt,
        record.originBattleId ?? null,
        record.topicId,
        JSON.stringify(record.topicSnapshot ?? null),
        JSON.stringify(record.participants),
        JSON.stringify(record.overrides ?? {}),
        JSON.stringify(record),
      ],
    );

    return record;
  },
  getBattleSetup: async (setupId) => {
    const result = await poolQuery<{ battle_setup_json: BattleSetupRecord }>(
      "SELECT battle_setup_json FROM battle_setups WHERE id = $1 LIMIT 1",
      [setupId],
    );
    return result.rows[0]?.battle_setup_json ?? null;
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

    await poolQuery(
      `
        INSERT INTO openclaw_bindings (
          id,
          session_id,
          slot,
          created_at,
          updated_at,
          version,
          binding_json
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb)
      `,
      [
        record.id,
        record.sessionId,
        record.slot,
        record.createdAt,
        record.updatedAt,
        record.version,
        JSON.stringify(record),
      ],
    );

    return record;
  },
  getOpenClawBindingById: async ({ bindingId, sessionId }) => {
    const result = await poolQuery<{ binding_json: OpenClawBindingRecord }>(
      `
        SELECT binding_json
        FROM openclaw_bindings
        WHERE id = $1 AND session_id = $2
        LIMIT 1
      `,
      [bindingId, sessionId],
    );
    return result.rows[0]?.binding_json ?? null;
  },
  getLatestOpenClawBindingForSlot: async ({ sessionId, slot }) => {
    const result = await poolQuery<{ binding_json: OpenClawBindingRecord }>(
      `
        SELECT binding_json
        FROM openclaw_bindings
        WHERE session_id = $1 AND slot = $2
        ORDER BY updated_at DESC
        LIMIT 1
      `,
      [sessionId, slot],
    );
    return result.rows[0]?.binding_json ?? null;
  },
  clearOpenClawBindingsForSlot: async ({ sessionId, slot }) => {
    await poolQuery(
      "DELETE FROM openclaw_bindings WHERE session_id = $1 AND slot = $2",
      [sessionId, slot],
    );
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

    await poolQuery(
      `
        INSERT INTO openclaw_bind_codes (
          code,
          session_id,
          slot,
          created_at,
          expires_at,
          used_at,
          bind_code_json
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb)
      `,
      [
        record.code,
        record.sessionId,
        record.slot,
        record.createdAt,
        record.expiresAt,
        record.usedAt,
        JSON.stringify(record),
      ],
    );

    return record;
  },
  getOpenClawBindCode: async (code) => {
    const result = await poolQuery<{ bind_code_json: OpenClawBindCodeRecord }>(
      "SELECT bind_code_json FROM openclaw_bind_codes WHERE code = $1 LIMIT 1",
      [code],
    );
    return result.rows[0]?.bind_code_json ?? null;
  },
  markOpenClawBindCodeUsed: async ({ code, usedAt }) => {
    const current = await createPostgresArenaStore().getOpenClawBindCode(code);
    if (!current) {
      return null;
    }

    const next: OpenClawBindCodeRecord = {
      ...current,
      usedAt,
    };

    await poolQuery(
      `
        UPDATE openclaw_bind_codes
        SET used_at = $1, bind_code_json = $2::jsonb
        WHERE code = $3
      `,
      [usedAt, JSON.stringify(next), code],
    );

    return next;
  },
  clearOpenClawBindCodesForSlot: async ({ sessionId, slot }) => {
    await poolQuery(
      `
        DELETE FROM openclaw_bind_codes
        WHERE session_id = $1 AND slot = $2 AND used_at IS NULL
      `,
      [sessionId, slot],
    );
  },
});
