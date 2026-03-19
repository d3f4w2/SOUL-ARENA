import { randomUUID } from "node:crypto";

import { Pool, type QueryResultRow } from "pg";

import { env } from "@/lib/env";
import type {
  AudienceMember,
  BattlePackage,
  BattleSetupRecord,
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

type GlobalPostgresStore = typeof globalThis & {
  __soulArenaPgPool?: Pool;
  __soulArenaPgReady?: Promise<void>;
};

const globalPostgresStore = globalThis as GlobalPostgresStore;
const GLOBAL_LIVE_SESSION_ID = "global";

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

    CREATE TABLE IF NOT EXISTS audience_members (
      id text PRIMARY KEY,
      session_id text NOT NULL,
      display_name text NOT NULL,
      display_id text,
      avatar_data_url text,
      created_at timestamptz NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_audience_members_created_at
      ON audience_members(created_at DESC);

    CREATE TABLE IF NOT EXISTS live_sessions (
      session_id text PRIMARY KEY,
      battle_id text,
      start_at timestamptz,
      created_at timestamptz NOT NULL,
      updated_at timestamptz NOT NULL
    );

    CREATE TABLE IF NOT EXISTS votes (
      id text PRIMARY KEY,
      session_id text NOT NULL,
      battle_id text NOT NULL,
      side text NOT NULL,
      created_at timestamptz NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_votes_battle_id
      ON votes(battle_id, created_at DESC);
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
  saveAudienceMember: async ({
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

    await poolQuery(
      `
        INSERT INTO audience_members (
          id,
          session_id,
          display_name,
          display_id,
          avatar_data_url,
          created_at
        )
        VALUES ($1,$2,$3,$4,$5,$6)
      `,
      [
        record.id,
        record.sessionId,
        record.displayName,
        record.displayId,
        record.avatarDataUrl,
        record.createdAt,
      ],
    );

    return record;
  },
  listAudienceMembers: async (limit = 200) => {
    const result = await poolQuery<{
      id: string;
      session_id: string;
      display_name: string;
      display_id: string | null;
      avatar_data_url: string | null;
      created_at: string;
    }>(
      `
        SELECT id, session_id, display_name, display_id, avatar_data_url, created_at
        FROM audience_members
        ORDER BY created_at DESC
        LIMIT $1
      `,
      [Math.max(1, Math.min(limit, 500))],
    );

    return result.rows.map((row) => ({
      avatarDataUrl: row.avatar_data_url,
      createdAt: row.created_at,
      displayId: row.display_id,
      displayName: row.display_name,
      id: row.id,
      sessionId: row.session_id,
    }));
  },
  setLiveSession: async ({ battleId, startAt }: SaveLiveSessionInput) => {
    const existing = await createPostgresArenaStore().getLiveSession();
    const now = new Date().toISOString();

    await poolQuery(
      `
        INSERT INTO live_sessions (
          session_id,
          battle_id,
          start_at,
          created_at,
          updated_at
        )
        VALUES ($1,$2,$3,$4,$5)
        ON CONFLICT (session_id) DO UPDATE SET
          battle_id = excluded.battle_id,
          start_at = excluded.start_at,
          updated_at = excluded.updated_at
      `,
      [GLOBAL_LIVE_SESSION_ID, battleId ?? null, startAt ?? null, now, now],
    );

    return {
      battleId: battleId ?? null,
      createdAt: existing?.createdAt ?? now,
      sessionId: GLOBAL_LIVE_SESSION_ID,
      startAt: startAt ?? null,
      updatedAt: now,
    };
  },
  getLiveSession: async () => {
    const result = await poolQuery<{
      session_id: string;
      battle_id: string | null;
      start_at: string | null;
      created_at: string;
      updated_at: string;
    }>(
      `
        SELECT session_id, battle_id, start_at, created_at, updated_at
        FROM live_sessions
        WHERE session_id = $1
        LIMIT 1
      `,
      [GLOBAL_LIVE_SESSION_ID],
    );

    const row = result.rows[0];

    return row
      ? {
          battleId: row.battle_id,
          createdAt: row.created_at,
          sessionId: row.session_id,
          startAt: row.start_at,
          updatedAt: row.updated_at,
        }
      : null;
  },
  saveVote: async ({ battleId, sessionId, side }: SaveVoteInput) => {
    const record: Vote = {
      battleId,
      createdAt: new Date().toISOString(),
      id: randomUUID(),
      sessionId,
      side,
    };

    await poolQuery(
      `
        INSERT INTO votes (
          id,
          session_id,
          battle_id,
          side,
          created_at
        )
        VALUES ($1,$2,$3,$4,$5)
      `,
      [
        record.id,
        record.sessionId,
        record.battleId,
        record.side,
        record.createdAt,
      ],
    );

    return record;
  },
  countVotes: async ({ battleId }) => {
    const result = await poolQuery<{
      side: string;
      count: string;
    }>(
      `
        SELECT side, COUNT(*)::text AS count
        FROM votes
        WHERE battle_id = $1
        GROUP BY side
      `,
      [battleId],
    );

    const player =
      result.rows.find((row) => row.side === "player")?.count ?? "0";
    const defender =
      result.rows.find((row) => row.side === "defender")?.count ?? "0";

    return {
      defender: Number(defender),
      player: Number(player),
    };
  },
});
