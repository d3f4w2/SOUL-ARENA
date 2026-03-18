"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";

import type {
  ArenaBuildPreview,
  ArenaCompetitorProfile,
  ArenaLeaderboardEntry,
  ArenaParticipantCompetitiveProfile,
  ArenaParticipantRef,
  ArenaParticipantSource,
  BattlePackage,
  BattleSetupRecord,
  ParticipantBuildOverride,
  ParticipantProvider,
  TopicPreset,
} from "@/lib/arena-types";

type ArenaMetaResponse = {
  signals: string[];
  topics: TopicPreset[];
};

type ParticipantsResponse = {
  participants: ArenaParticipantSource[];
};

type LeaderboardResponse = {
  featured: ArenaLeaderboardEntry | null;
  leaderboard: ArenaLeaderboardEntry[];
};

type ProfileResponse = {
  profiles: ArenaParticipantCompetitiveProfile[];
};

type SetupResponse = {
  participants: ArenaParticipantSource[];
  setup: BattleSetupRecord;
};

type OpenClawBindCodeResponse = {
  bindCode: string;
  expiresAt: string;
  registerUrl: string;
  slot: "alpha" | "beta";
};

type OpenClawProfileResponse = {
  participant: ArenaParticipantSource | null;
};

type SlotOverrideDraft = {
  declaration: string;
  displayName: string;
  rule: string;
  soulSeedTags: string;
  taboo: string;
  viewpoints: string;
};

type BindCodeState = {
  bindCode: string;
  expiresAt: string;
  registerUrl: string;
} | null;

const battleStorageKey = (battleId: string) => `soul-arena:battle:${battleId}`;

const emptyOverrideDraft = (): SlotOverrideDraft => ({
  declaration: "",
  displayName: "",
  rule: "",
  soulSeedTags: "",
  taboo: "",
  viewpoints: "",
});

async function readJson<T>(url: string, init?: RequestInit) {
  const response = await fetch(url, init);
  const payload = (await response.json()) as T;

  if (!response.ok) {
    throw new Error(
      typeof payload === "object" &&
        payload &&
        "message" in payload &&
        typeof payload.message === "string"
        ? payload.message
        : `请求失败：${response.status}`,
    );
  }

  return payload;
}

const splitLines = (value: string) =>
  value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);

const splitComma = (value: string) =>
  value
    .split(/[，,]/)
    .map((item) => item.trim())
    .filter(Boolean);

const participantTitle = (slot: "alpha" | "beta") =>
  slot === "alpha" ? "甲方参赛者" : "乙方参赛者";

const participantSubtitle = (participant: ArenaParticipantSource | null) =>
  participant?.displayName ?? "未连接";

const participantRoute = (participant: ArenaParticipantSource | null) =>
  typeof participant?.user?.route === "string" ? participant.user.route : null;

const participantBio = (participant: ArenaParticipantSource | null) =>
  typeof participant?.user?.bio === "string" ? participant.user.bio : null;

const participantDisplayId = (participant: ArenaParticipantSource | null) =>
  participant?.displayId ??
  (typeof participant?.user?.displayId === "string" ? participant.user.displayId : null);

const participantSourceKind = (participant: ArenaParticipantSource | null) =>
  typeof participant?.sourceMeta?.sourceKind === "string"
    ? participant.sourceMeta.sourceKind
    : null;

const participantAvatar = (participant: ArenaParticipantSource | null) =>
  participant?.avatarUrl ??
  (typeof participant?.user?.avatarUrl === "string" ? participant.user.avatarUrl : null);

const tagLabels = (participant: ArenaParticipantSource | null) =>
  (participant?.shades ?? [])
    .map((shade) =>
      typeof shade.label === "string"
        ? shade.label
        : typeof shade.name === "string"
          ? shade.name
          : "",
    )
    .map((item) => item.trim())
    .filter(Boolean);

const memoryAnchors = (participant: ArenaParticipantSource | null) =>
  (participant?.softMemory ?? [])
    .map((memory) =>
      typeof memory.summary === "string"
        ? memory.summary
        : typeof memory.text === "string"
          ? memory.text
          : typeof memory.content === "string"
            ? memory.content
            : typeof memory.title === "string"
              ? memory.title
              : "",
    )
    .map((item) => item.trim())
    .filter(Boolean);

const toRef = (participant: ArenaParticipantSource): ArenaParticipantRef => ({
  participantId: participant.participantId,
  provider: participant.provider,
  slot: participant.slot,
});

const getProfileBySlot = (
  profiles: ArenaParticipantCompetitiveProfile[],
  slot: "alpha" | "beta",
) => profiles.find((entry) => entry.slot === slot)?.profile ?? null;

const draftFromOverride = (override?: ParticipantBuildOverride): SlotOverrideDraft => ({
  declaration: override?.declaration ?? "",
  displayName: override?.displayName ?? "",
  rule: override?.rule ?? "",
  soulSeedTags: (override?.soulSeedTags ?? []).join(", "),
  taboo: override?.taboo ?? "",
  viewpoints: (override?.viewpoints ?? []).join("\n"),
});

const overrideFromDraft = (draft: SlotOverrideDraft): ParticipantBuildOverride => {
  const payload: ParticipantBuildOverride = {};

  if (draft.displayName.trim()) payload.displayName = draft.displayName.trim();
  if (draft.declaration.trim()) payload.declaration = draft.declaration.trim();
  if (draft.rule.trim()) payload.rule = draft.rule.trim();
  if (draft.taboo.trim()) payload.taboo = draft.taboo.trim();

  const viewpoints = splitLines(draft.viewpoints);
  if (viewpoints.length) payload.viewpoints = viewpoints;

  const soulSeedTags = splitComma(draft.soulSeedTags);
  if (soulSeedTags.length) payload.soulSeedTags = soulSeedTags;

  return payload;
};

export function ArenaBuilder() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [meta, setMeta] = useState<ArenaMetaResponse | null>(null);
  const [participants, setParticipants] = useState<ArenaParticipantSource[]>([]);
  const [profiles, setProfiles] = useState<ArenaParticipantCompetitiveProfile[]>([]);
  const [leaderboard, setLeaderboard] = useState<ArenaLeaderboardEntry[]>([]);
  const [featured, setFeatured] = useState<ArenaLeaderboardEntry | null>(null);
  const [topicId, setTopicId] = useState("");
  const [topicSnapshot, setTopicSnapshot] = useState<TopicPreset | null>(null);
  const [participantRefs, setParticipantRefs] = useState<Record<"alpha" | "beta", ArenaParticipantRef | null>>({
    alpha: null,
    beta: null,
  });
  const [overrideDrafts, setOverrideDrafts] = useState<Record<"alpha" | "beta", SlotOverrideDraft>>({
    alpha: emptyOverrideDraft(),
    beta: emptyOverrideDraft(),
  });
  const [preview, setPreview] = useState<ArenaBuildPreview | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [loadedSetup, setLoadedSetup] = useState<BattleSetupRecord | null>(null);
  const [bindCodes, setBindCodes] = useState<Record<"alpha" | "beta", BindCodeState>>({
    alpha: null,
    beta: null,
  });
  const [pendingSlot, setPendingSlot] = useState<"alpha" | "beta" | null>(null);
  const setupId = searchParams.get("setupId");

  const alpha = useMemo(
    () => participants.find((participant) => participant.slot === "alpha") ?? null,
    [participants],
  );
  const beta = useMemo(
    () => participants.find((participant) => participant.slot === "beta") ?? null,
    [participants],
  );
  const alphaProfile = useMemo(() => getProfileBySlot(profiles, "alpha"), [profiles]);
  const betaProfile = useMemo(() => getProfileBySlot(profiles, "beta"), [profiles]);
  const selectedTopic = useMemo(
    () => meta?.topics.find((topic) => topic.id === topicId) ?? topicSnapshot,
    [meta?.topics, topicId, topicSnapshot],
  );
  const readyToBuild = Boolean(
    topicId &&
      participantRefs.alpha &&
      participantRefs.beta &&
      alpha?.connected &&
      beta?.connected,
  );

  const loadArenaData = async () => {
    const [nextMeta, nextParticipants, nextProfiles, nextLeaderboard] = await Promise.all([
      readJson<ArenaMetaResponse>("/api/arena/topics"),
      readJson<ParticipantsResponse>("/api/participants"),
      readJson<ProfileResponse>("/api/arena/profile?slot=alpha&slot=beta"),
      readJson<LeaderboardResponse>("/api/arena/leaderboard?limit=5"),
    ]);

    return {
      featured: nextLeaderboard.featured,
      leaderboard: nextLeaderboard.leaderboard,
      meta: nextMeta,
      participants: nextParticipants.participants,
      profiles: nextProfiles.profiles,
    };
  };

  const applyArenaData = (data: Awaited<ReturnType<typeof loadArenaData>>) => {
    setMeta(data.meta);
    setParticipants(data.participants);
    setProfiles(data.profiles);
    setLeaderboard(data.leaderboard);
    setFeatured(data.featured);
    setTopicId((current) => current || data.meta.topics[0]?.id || "");
    setParticipantRefs((current) => {
      const nextAlpha = data.participants.find((item) => item.slot === "alpha") ?? null;
      const nextBeta = data.participants.find((item) => item.slot === "beta") ?? null;

      return {
        alpha: current.alpha ?? (nextAlpha ? toRef(nextAlpha) : null),
        beta: current.beta ?? (nextBeta ? toRef(nextBeta) : null),
      };
    });
  };

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        const data = await loadArenaData();

        if (!active) {
          return;
        }

        startTransition(() => {
          setMeta(data.meta);
          setParticipants(data.participants);
          setProfiles(data.profiles);
          setLeaderboard(data.leaderboard);
          setFeatured(data.featured);
          setTopicId((current) => current || data.meta.topics[0]?.id || "");
          setParticipantRefs((current) => {
            const nextAlpha = data.participants.find((item) => item.slot === "alpha") ?? null;
            const nextBeta = data.participants.find((item) => item.slot === "beta") ?? null;

            return {
              alpha: current.alpha ?? (nextAlpha ? toRef(nextAlpha) : null),
              beta: current.beta ?? (nextBeta ? toRef(nextBeta) : null),
            };
          });
        });
      } catch (error) {
        if (active) {
          setStatus(error instanceof Error ? error.message : "载入竞技场数据失败。");
        }
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!setupId) {
      return;
    }

    void (async () => {
      try {
        const payload = await readJson<SetupResponse>(`/api/arena/setups/${setupId}`);
        setLoadedSetup(payload.setup);
        setParticipants(payload.participants);
        setParticipantRefs({
          alpha: payload.setup.participants.find((item) => item.slot === "alpha") ?? null,
          beta: payload.setup.participants.find((item) => item.slot === "beta") ?? null,
        });
        setOverrideDrafts({
          alpha: draftFromOverride(payload.setup.overrides?.alpha),
          beta: draftFromOverride(payload.setup.overrides?.beta),
        });
        setTopicId(payload.setup.topicId);
        setTopicSnapshot(payload.setup.topicSnapshot ?? null);
        setStatus("已载入重开模板。");
      } catch (error) {
        setStatus(error instanceof Error ? error.message : "载入重开模板失败。");
      }
    })();
  }, [setupId]);

  useEffect(() => {
    const slotsToPoll = (["alpha", "beta"] as const).filter((slot) => {
      const participant = slot === "alpha" ? alpha : beta;
      return Boolean(bindCodes[slot] && participant?.provider === "openclaw" && !participant.connected);
    });

    if (!slotsToPoll.length) {
      return;
    }

    const timer = window.setInterval(() => {
      void (async () => {
        const data = await loadArenaData().catch(() => null);

        if (!data) {
          return;
        }

        setMeta(data.meta);
        setParticipants(data.participants);
        setProfiles(data.profiles);
        setLeaderboard(data.leaderboard);
        setFeatured(data.featured);
        setTopicId((current) => current || data.meta.topics[0]?.id || "");
        setParticipantRefs((current) => {
          const nextAlpha = data.participants.find((item) => item.slot === "alpha") ?? null;
          const nextBeta = data.participants.find((item) => item.slot === "beta") ?? null;

          return {
            alpha: current.alpha ?? (nextAlpha ? toRef(nextAlpha) : null),
            beta: current.beta ?? (nextBeta ? toRef(nextBeta) : null),
          };
        });
        setBindCodes((current) => ({
          alpha: data.participants.find((item) => item.slot === "alpha" && item.connected) ? null : current.alpha,
          beta: data.participants.find((item) => item.slot === "beta" && item.connected) ? null : current.beta,
        }));
      })();
    }, 3000);

    return () => window.clearInterval(timer);
  }, [alpha, beta, bindCodes]);

  const switchProvider = async (slot: "alpha" | "beta", provider: ParticipantProvider) => {
    await readJson("/api/participants", {
      body: JSON.stringify({ provider, slot }),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });

    const data = await loadArenaData();
    applyArenaData(data);
    const participant = data.participants.find((item) => item.slot === slot) ?? null;

    if (provider === "secondme" && !participant?.connected) {
      window.location.assign(`/api/auth/login?slot=${slot}&returnTo=/arena`);
      return;
    }

    if (provider === "openclaw") {
      setStatus(`已将${participantTitle(slot)}切换到 OpenClaw，请生成绑定码并在用户自己的 OpenClaw 技能中完成注册。`);
      return;
    }

    setStatus(`${participantTitle(slot)}已切换到 ${provider}。`);
  };

  const disconnectParticipant = async (slot: "alpha" | "beta") => {
    await readJson(`/api/participants?slot=${slot}`, {
      method: "DELETE",
    });
    setPreview(null);
    setBindCodes((current) => ({
      ...current,
      [slot]: null,
    }));
    const data = await loadArenaData();
    applyArenaData(data);
    setStatus(`${participantTitle(slot)}已断开连接。`);
  };

  const generateBindCode = async (slot: "alpha" | "beta") => {
    setPendingSlot(slot);

    try {
      const payload = await readJson<OpenClawBindCodeResponse>("/api/openclaw/bind-code", {
        body: JSON.stringify({ slot }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });

      setBindCodes((current) => ({
        ...current,
        [slot]: {
          bindCode: payload.bindCode,
          expiresAt: payload.expiresAt,
          registerUrl: payload.registerUrl,
        },
      }));

      const data = await loadArenaData();
      applyArenaData(data);
      setStatus(`${participantTitle(slot)}绑定码已生成，请让 OpenClaw 技能调用 ${payload.registerUrl} 完成注册。`);
    } finally {
      setPendingSlot(null);
    }
  };

  const refreshOpenClawSlot = async (slot: "alpha" | "beta") => {
    const payload = await readJson<OpenClawProfileResponse>(`/api/openclaw/profile?slot=${slot}`);

    if (payload.participant?.connected) {
      setParticipants((current) => [
        ...current.filter((item) => item.slot !== slot),
        payload.participant as ArenaParticipantSource,
      ]);
      setParticipantRefs((current) => ({
        ...current,
        [slot]: toRef(payload.participant as ArenaParticipantSource),
      }));
      setBindCodes((current) => ({
        ...current,
        [slot]: null,
      }));
      setStatus(`已检测到来自 OpenClaw 的${participantTitle(slot)}注册。`);
      return;
    }

    setStatus(`${participantTitle(slot)}仍在等待 OpenClaw 注册完成。`);
  };

  const previewBuild = async () => {
    if (!readyToBuild || !participantRefs.alpha || !participantRefs.beta || !selectedTopic) {
      setStatus("请先连接双方参赛者并选择辩题。");
      return;
    }

    const overrides = {
      alpha: overrideFromDraft(overrideDrafts.alpha),
      beta: overrideFromDraft(overrideDrafts.beta),
    };

    const payload = await readJson<ArenaBuildPreview>("/api/arena/build-preview", {
      body: JSON.stringify({
        originBattleId: loadedSetup?.originBattleId ?? null,
        overrides,
        participants: [participantRefs.alpha, participantRefs.beta],
        topicId,
        topicSnapshot: selectedTopic,
      }),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });

    startTransition(() => {
      setPreview(payload);
      setStatus("预览已更新。");
    });
  };

  const startBattle = async () => {
    if (!readyToBuild || !participantRefs.alpha || !participantRefs.beta || !selectedTopic) {
      setStatus("请先连接双方参赛者并选择辩题。");
      return;
    }

    const overrides = {
      alpha: overrideFromDraft(overrideDrafts.alpha),
      beta: overrideFromDraft(overrideDrafts.beta),
    };

    const battle = await readJson<BattlePackage>("/api/arena/battles", {
      body: JSON.stringify({
        originBattleId: loadedSetup?.originBattleId ?? null,
        overrides,
        participants: [participantRefs.alpha, participantRefs.beta],
        topicId,
        topicSnapshot: selectedTopic,
      }),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });

    localStorage.setItem(battleStorageKey(battle.id), JSON.stringify(battle));
    router.push(`/arena/${battle.id}`);
  };

  const renderOpenClawPanel = (slot: "alpha" | "beta", participant: ArenaParticipantSource | null) => {
    if (participant?.provider !== "openclaw") {
      return null;
    }

    const bindCode = bindCodes[slot];

    return (
      <div className="mt-5 grid gap-3 rounded-[1.25rem] border border-[var(--line)] bg-white/75 p-4">
        <p className="text-sm font-semibold">OpenClaw 注册</p>
        {participant.connected ? (
          <>
            <p className="text-sm text-stone-600">
              已注册为 {participant.displayName ?? "未命名角色"}
              {participantDisplayId(participant) ? ` (@${participantDisplayId(participant)})` : ""}.
            </p>
            <p className="text-sm text-stone-600">
              版本 {participant.configVersion ?? "当前"} · {participant.sourceLabel ?? "OpenClaw 技能"}
            </p>
            {participantAvatar(participant) ? (
              <p className="text-sm text-stone-600 break-all">头像：{participantAvatar(participant)}</p>
            ) : null}
            {tagLabels(participant).length ? (
              <div className="flex flex-wrap gap-2">
                {tagLabels(participant).slice(0, 6).map((tag) => (
                  <span key={tag} className="accent-chip rounded-full px-3 py-1 text-xs">
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}
            {memoryAnchors(participant).length ? (
              <div className="space-y-2 text-sm text-stone-600">
                {memoryAnchors(participant).slice(0, 3).map((item) => (
                  <p key={item}>{item}</p>
                ))}
              </div>
            ) : null}
          </>
        ) : bindCode ? (
          <>
            <p className="text-sm text-stone-600">
              请在用户自己的 OpenClaw 技能中使用这个绑定码，并调用注册接口。
            </p>
            <div className="rounded-[1rem] border border-[var(--line)] bg-stone-50 px-4 py-3">
              <p className="font-semibold tracking-[0.12em]">{bindCode.bindCode}</p>
              <p className="mt-1 text-sm text-stone-600">
                Expires: {new Date(bindCode.expiresAt).toLocaleString()}
              </p>
              <p className="mt-1 text-xs break-all text-stone-500">{bindCode.registerUrl}</p>
            </div>
          </>
        ) : (
          <p className="text-sm text-stone-600">
            先生成绑定码，再让用户自己的 OpenClaw 技能远程注册这个槽位。
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <button
            className="soft-button rounded-full bg-[var(--accent)] px-4 py-2 text-sm text-white"
            disabled={pendingSlot === slot}
            onClick={() => void generateBindCode(slot)}
            type="button"
          >
            {pendingSlot === slot
              ? "生成中..."
              : bindCode
                ? "重新生成绑定码"
                : "生成绑定码"}
          </button>
          <button
            className="soft-button rounded-full border border-[var(--line)] bg-white/70 px-4 py-2 text-sm"
            onClick={() => void refreshOpenClawSlot(slot)}
            type="button"
          >
            刷新状态
          </button>
        </div>
      </div>
    );
  };

  const renderOverridePanel = (slot: "alpha" | "beta") => (
    <div className="mt-5 grid gap-3 rounded-[1.25rem] border border-[var(--line)] bg-white/75 p-4">
      <p className="text-sm font-semibold">对战覆盖</p>
      <input
        className="rounded-xl border border-[var(--line)] bg-stone-50 px-3 py-2 text-sm"
        onChange={(event) =>
          setOverrideDrafts((current) => ({
            ...current,
            [slot]: { ...current[slot], displayName: event.target.value },
          }))
        }
        placeholder="覆盖显示名"
        value={overrideDrafts[slot].displayName}
      />
      <textarea
        className="min-h-20 rounded-xl border border-[var(--line)] bg-stone-50 px-3 py-2 text-sm"
        onChange={(event) =>
          setOverrideDrafts((current) => ({
            ...current,
            [slot]: { ...current[slot], declaration: event.target.value },
          }))
        }
        placeholder="覆盖宣言"
        value={overrideDrafts[slot].declaration}
      />
      <textarea
        className="min-h-16 rounded-xl border border-[var(--line)] bg-stone-50 px-3 py-2 text-sm"
        onChange={(event) =>
          setOverrideDrafts((current) => ({
            ...current,
            [slot]: { ...current[slot], rule: event.target.value },
          }))
        }
        placeholder="覆盖规则"
        value={overrideDrafts[slot].rule}
      />
      <textarea
        className="min-h-16 rounded-xl border border-[var(--line)] bg-stone-50 px-3 py-2 text-sm"
        onChange={(event) =>
          setOverrideDrafts((current) => ({
            ...current,
            [slot]: { ...current[slot], taboo: event.target.value },
          }))
        }
        placeholder="覆盖禁忌"
        value={overrideDrafts[slot].taboo}
      />
      <textarea
        className="min-h-24 rounded-xl border border-[var(--line)] bg-stone-50 px-3 py-2 text-sm"
        onChange={(event) =>
          setOverrideDrafts((current) => ({
            ...current,
            [slot]: { ...current[slot], viewpoints: event.target.value },
          }))
        }
        placeholder="覆盖观点，每行一条"
        value={overrideDrafts[slot].viewpoints}
      />
      <input
        className="rounded-xl border border-[var(--line)] bg-stone-50 px-3 py-2 text-sm"
        onChange={(event) =>
          setOverrideDrafts((current) => ({
            ...current,
            [slot]: { ...current[slot], soulSeedTags: event.target.value },
          }))
        }
        placeholder="覆盖 Soul Seed 标签，逗号分隔"
        value={overrideDrafts[slot].soulSeedTags}
      />
    </div>
  );

  const renderParticipantCard = (
    slot: "alpha" | "beta",
    participant: ArenaParticipantSource | null,
    profile: ArenaCompetitorProfile | null,
  ) => (
    <article className="entry-fade paper-panel rounded-[1.75rem] p-6" key={slot}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-stone-500">{participantTitle(slot)}</p>
          <h2 className="section-title mt-2">{participantSubtitle(participant)}</h2>
          <p className="mt-2 text-sm text-stone-600">
            来源：{participant?.provider ?? "未设置"}
            {participant?.sourceLabel ? ` · ${participant.sourceLabel}` : ""}
          </p>
          {profile ? (
            <p className="mt-1 text-sm text-stone-600">
              排名 {profile.rank ?? "-"} · 积分 {profile.rating} · 连胜 {profile.currentStreak}
            </p>
          ) : null}
          {participantRoute(participant) ? (
            <p className="mt-1 text-sm text-stone-600">路径：{participantRoute(participant)}</p>
          ) : null}
          {participantBio(participant) ? (
            <p className="mt-1 text-sm text-stone-600">{participantBio(participant)}</p>
          ) : null}
          {participantSourceKind(participant) ? (
            <p className="mt-1 text-sm text-stone-600">来源类型：{participantSourceKind(participant)}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className="soft-button rounded-full border border-[var(--line)] bg-white/70 px-4 py-2 text-sm"
            onClick={() => void switchProvider(slot, "secondme")}
            type="button"
          >
            使用 SecondMe
          </button>
          <button
            className="soft-button rounded-full border border-[var(--line)] bg-white/70 px-4 py-2 text-sm"
            onClick={() => void switchProvider(slot, "openclaw")}
            type="button"
          >
            使用 OpenClaw
          </button>
          {participant?.connected ? (
            <button
              className="soft-button rounded-full bg-[var(--accent)] px-4 py-2 text-sm text-white"
              onClick={() => void disconnectParticipant(slot)}
              type="button"
            >
              断开连接
            </button>
          ) : null}
        </div>
      </div>

      {renderOpenClawPanel(slot, participant)}
      {renderOverridePanel(slot)}
    </article>
  );

  return (
    <main className="paper-grid grain relative min-h-screen overflow-hidden px-4 py-6 text-foreground sm:px-6 lg:px-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <section className="entry-fade paper-panel rounded-[2rem] px-6 py-8 sm:px-10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="accent-chip inline-flex rounded-full px-3 py-1 text-xs uppercase tracking-[0.28em]">
                Soul Arena 构筑台
              </span>
              <h1 className="display-title mt-4">竞技构筑台</h1>
              <p className="mt-4 max-w-3xl text-lg leading-8 text-stone-700">
                OpenClaw 现在通过后端接口注册到 Soul Arena。你可以先在这里生成绑定码，再让用户自己的 OpenClaw 技能远程注册代理。
              </p>
              {loadedSetup ? (
                <p className="mt-3 text-sm text-stone-600">
                  当前已载入重开模板，来源对局：{loadedSetup.originBattleId ?? "无"}。
                </p>
              ) : null}
            </div>
            <div className="grid gap-3 text-sm text-stone-700">
              <span className="accent-chip rounded-full px-3 py-1 text-center">
                榜首 {featured ? `${featured.displayName} · ${featured.rating}` : "等待中"}
              </span>
              <Link className="soft-button rounded-full border border-[var(--line)] bg-white/70 px-4 py-2 text-center" href="/arena/leaderboard">
                查看排行榜
              </Link>
            </div>
          </div>
          <div className="mt-5 rounded-[1.25rem] border border-[var(--line)] bg-white/75 p-4 text-sm leading-7 text-stone-700">
            {status ?? "选择来源，完成 OpenClaw 绑定码注册或登录 SecondMe，然后生成预览并开始对战。"}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          {renderParticipantCard("alpha", alpha, alphaProfile)}
          {renderParticipantCard("beta", beta, betaProfile)}
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <article className="entry-fade paper-panel rounded-[1.75rem] p-6">
            <p className="text-xs uppercase tracking-[0.22em] text-stone-500">辩题池</p>
            <div className="mt-5 grid gap-3">
              {meta?.topics.map((topic) => (
                <button
                  key={topic.id}
                  className={`rounded-[1.3rem] border px-4 py-4 text-left ${
                    topic.id === topicId ? "border-[var(--accent)] bg-white" : "border-[var(--line)] bg-white/75"
                  }`}
                  onClick={() => {
                    setTopicId(topic.id);
                    setTopicSnapshot(topic);
                  }}
                  type="button"
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="text-base font-semibold">{topic.title}</p>
                    <span className="accent-chip rounded-full px-3 py-1 text-xs">
                      {topic.source === "zhihu_dynamic" ? "知乎动态题" : "预设题"}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-7 text-stone-600">{topic.prompt}</p>
                </button>
              ))}
            </div>
          </article>

          <article className="entry-fade paper-panel rounded-[1.75rem] p-6">
            <p className="text-xs uppercase tracking-[0.22em] text-stone-500">操作</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <button className="soft-button rounded-full border border-[var(--line)] bg-white/70 px-4 py-3 text-sm" onClick={() => void previewBuild()} type="button">
                生成人格预览
              </button>
              <button className="soft-button rounded-full bg-[var(--accent)] px-4 py-3 text-sm text-white" onClick={() => void startBattle()} type="button">
                开始对战
              </button>
              <Link className="soft-button rounded-full border border-[var(--line)] bg-white/70 px-4 py-3 text-sm" href="/arena/history">
                历史战报
              </Link>
            </div>
            <div className="mt-5 grid gap-3">
              {leaderboard.map((entry) => (
                <div key={entry.competitorId} className="rounded-[1rem] border border-[var(--line)] bg-stone-50 px-4 py-3 text-sm">
                  <p className="font-semibold">
                    #{entry.rank} {entry.displayName}
                  </p>
                  <p className="text-stone-600">积分 {entry.rating} · 连胜 {entry.currentStreak}</p>
                </div>
              ))}
            </div>
          </article>
        </section>

        {preview ? (
          <section className="entry-fade paper-panel rounded-[1.75rem] p-6">
            <p className="text-xs uppercase tracking-[0.22em] text-stone-500">预览</p>
            <h2 className="section-title mt-2">
              {preview.player.displayName} 对阵 {preview.defender.displayName}
            </h2>
            <p className="mt-3 text-sm leading-7 text-stone-700">{preview.matchUpCallout}</p>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {[preview.player, preview.defender].map((fighter) => (
                <article key={fighter.id} className="rounded-[1.25rem] border border-[var(--line)] bg-white/75 px-4 py-4">
                  <p className="text-base font-semibold">
                    {fighter.displayName} · {fighter.powerLabel}
                  </p>
                  <p className="mt-2 text-sm text-stone-600">{fighter.declaration}</p>
                  <p className="mt-3 text-xs uppercase tracking-[0.18em] text-stone-500">
                    来源 {fighter.source.provider} · 版本 {fighter.source.configVersion ?? "当前"}
                    {fighter.source.displayId ? ` · @${fighter.source.displayId}` : ""}
                  </p>
                  <div className="mt-3 space-y-2 text-sm text-stone-600">
                    {fighter.buildSummary.map((item) => (
                      <p key={item}>{item}</p>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {isPending ? null : null}
      </div>
    </main>
  );
}
