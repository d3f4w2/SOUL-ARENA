"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import type {
  ArenaBuildPreview,
  ArenaCompetitorProfile,
  ArenaLeaderboardEntry,
  ArenaParticipantCompetitiveProfile,
  ArenaParticipantSource,
  BattlePackage,
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

const battleStorageKey = (battleId: string) => `soul-arena:battle:${battleId}`;

const participantRefs = [
  { provider: "secondme", slot: "alpha" },
  { provider: "secondme", slot: "beta" },
] as const;

const K_FACTOR = 32;
const MIN_RATING_DELTA = 8;
const MAX_RATING_DELTA = 24;

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

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const calculateWinDelta = (winnerRating: number, loserRating: number) => {
  const expectedScore =
    1 / (1 + 10 ** ((loserRating - winnerRating) / 400));

  return clamp(
    Math.round(K_FACTOR * (1 - expectedScore)),
    MIN_RATING_DELTA,
    MAX_RATING_DELTA,
  );
};

const participantTitle = (slot: "alpha" | "beta") =>
  slot === "alpha" ? "甲方参赛者" : "乙方参赛者";

const participantSubtitle = (participant: ArenaParticipantSource | null) => {
  if (!participant) {
    return "未连接";
  }

  return participant.displayName ?? "已连接，但缺少展示名";
};

const formatRank = (profile: ArenaCompetitorProfile | null) =>
  profile?.rank ? `#${profile.rank}` : "未上榜";

const formatLastResult = (profile: ArenaCompetitorProfile | null) => {
  if (!profile?.lastResult) {
    return "尚未开赛";
  }

  return profile.lastResult === "win" ? "上一场获胜" : "上一场失利";
};

const userField = (participant: ArenaParticipantSource | null, field: string) => {
  const value = participant?.user?.[field];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
};

const topShades = (participant: ArenaParticipantSource | null) =>
  (participant?.shades ?? [])
    .map((shade) => {
      const value = shade.label ?? shade.name;
      return typeof value === "string" ? value.trim() : "";
    })
    .filter(Boolean)
    .slice(0, 4);

const memoryAnchors = (participant: ArenaParticipantSource | null) =>
  (participant?.softMemory ?? [])
    .map((memory) => {
      const value =
        memory.summary ?? memory.text ?? memory.content ?? memory.title ?? "";
      return typeof value === "string" ? value.trim() : "";
    })
    .filter(Boolean)
    .slice(0, 3);

const orchestrationLabel = (preview: ArenaBuildPreview | null) => {
  const mode = preview?.sourceMeta.orchestrationMode;

  if (mode === "hybrid") {
    return "混合编排";
  }

  if (mode === "judge_only") {
    return "仅裁判编排";
  }

  if (mode === "deterministic") {
    return "确定性回退";
  }

  return "待生成";
};

const duplicateIdentityWarning =
  "当前甲方和乙方授权成了同一个 SecondMe 账号。这通常是因为第二次授权复用了同一浏览器登录态。";

const getDuplicateIdentityWarning = (
  participants: ArenaParticipantSource[],
) => {
  const connected = participants.filter(
    (participant) =>
      participant.connected &&
      typeof participant.secondMeUserId === "string" &&
      participant.secondMeUserId.trim().length > 0,
  );

  if (connected.length < 2) {
    return null;
  }

  return connected.every(
    (participant) => participant.secondMeUserId === connected[0]?.secondMeUserId,
  )
    ? duplicateIdentityWarning
    : null;
};

const getProfileBySlot = (
  profiles: ArenaParticipantCompetitiveProfile[],
  slot: "alpha" | "beta",
) => profiles.find((entry) => entry.slot === slot)?.profile ?? null;

const buildMatchupSummary = (
  alphaProfile: ArenaCompetitorProfile | null,
  betaProfile: ArenaCompetitorProfile | null,
) => {
  if (!alphaProfile || !betaProfile) {
    return null;
  }

  const projectedWinDelta = calculateWinDelta(
    alphaProfile.rating,
    betaProfile.rating,
  );
  const projectedLossDelta = -calculateWinDelta(
    betaProfile.rating,
    alphaProfile.rating,
  );
  const currentTargetIsSuggestion =
    alphaProfile.suggestion?.competitorId === betaProfile.competitorId;
  const reason =
    currentTargetIsSuggestion
      ? "当前对手就是系统给出的建议挑战对象。"
      : betaProfile.currentStreak >= 2
        ? `若击败对手，可直接终结其 ${betaProfile.currentStreak} 连胜。`
        : alphaProfile.rank &&
            betaProfile.rank &&
            betaProfile.rank < alphaProfile.rank
          ? "这是一场越级挑战，赢下会更有冲榜价值。"
          : "这是一场标准排位战，适合继续积累积分和手感。";

  return {
    projectedLossDelta,
    projectedWinDelta,
    reason,
    stakesLabel:
      betaProfile.currentStreak >= 2
        ? "终结连胜局"
        : alphaProfile.rank &&
            betaProfile.rank &&
            betaProfile.rank < alphaProfile.rank
          ? "冲榜局"
          : "常规排位局",
  };
};

export function ArenaBuilder() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [meta, setMeta] = useState<ArenaMetaResponse | null>(null);
  const [participants, setParticipants] = useState<ArenaParticipantSource[]>([]);
  const [topicId, setTopicId] = useState("");
  const [preview, setPreview] = useState<ArenaBuildPreview | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<ArenaParticipantCompetitiveProfile[]>([]);
  const [leaderboard, setLeaderboard] = useState<ArenaLeaderboardEntry[]>([]);
  const [featured, setFeatured] = useState<ArenaLeaderboardEntry | null>(null);

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
    () => meta?.topics.find((topic) => topic.id === topicId) ?? null,
    [meta?.topics, topicId],
  );
  const readyToBuild = Boolean(topicId && alpha?.connected && beta?.connected);
  const duplicateWarning = useMemo(
    () => getDuplicateIdentityWarning(participants),
    [participants],
  );
  const matchupSummary = useMemo(
    () => buildMatchupSummary(alphaProfile, betaProfile),
    [alphaProfile, betaProfile],
  );

  const fetchArenaData = async () => {
    const [nextMeta, nextParticipants, nextProfiles, nextLeaderboard] =
      await Promise.all([
        readJson<ArenaMetaResponse>("/api/arena/topics"),
        readJson<ParticipantsResponse>("/api/participants"),
        readJson<ProfileResponse>("/api/arena/profile?slot=alpha&slot=beta"),
        readJson<LeaderboardResponse>("/api/arena/leaderboard?limit=5"),
      ]);

    return {
      leaderboard: nextLeaderboard.leaderboard,
      meta: nextMeta,
      participants: nextParticipants.participants,
      profiles: nextProfiles.profiles,
      featured: nextLeaderboard.featured,
    };
  };

  const applyArenaData = (data: Awaited<ReturnType<typeof fetchArenaData>>) => {
    setMeta(data.meta);
    setParticipants(data.participants);
    setProfiles(data.profiles);
    setLeaderboard(data.leaderboard);
    setFeatured(data.featured);
    setTopicId((current) => current || data.meta.topics[0]?.id || "");
  };

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        const data = await fetchArenaData();

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
        });
      } catch (error) {
        if (!active) {
          return;
        }

        setStatus(
          error instanceof Error ? error.message : "载入竞技场数据失败。",
        );
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const connectParticipant = (slot: "alpha" | "beta") => {
    window.location.assign(`/api/auth/login?slot=${slot}&returnTo=/arena`);
  };

  const disconnectParticipant = async (slot: "alpha" | "beta") => {
    setStatus(`正在断开${participantTitle(slot)}...`);
    await readJson(`/api/participants?slot=${slot}`, {
      method: "DELETE",
    });
    setPreview(null);
    const data = await fetchArenaData();
    applyArenaData(data);
    setStatus(`${participantTitle(slot)}已断开。`);
  };

  const previewBuild = async () => {
    if (!readyToBuild) {
      setStatus("请先连接甲方和乙方两个 SecondMe 参赛者。");
      return;
    }

    setStatus("正在生成人格构筑预览...");
    const payload = await readJson<ArenaBuildPreview>("/api/arena/build-preview", {
      body: JSON.stringify({
        participants: participantRefs,
        topicId,
      }),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });

    startTransition(() => {
      setPreview(payload);
      setStatus("预览已更新，当前使用真实参赛者资料。");
    });
  };

  const startBattle = async () => {
    if (!readyToBuild) {
      setStatus("请先连接甲方和乙方两个 SecondMe 参赛者。");
      return;
    }

    setStatus("正在生成排位 battle package...");
    const battle = await readJson<BattlePackage>("/api/arena/battles", {
      body: JSON.stringify({
        participants: participantRefs,
        topicId,
      }),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });

    localStorage.setItem(battleStorageKey(battle.id), JSON.stringify(battle));
    setStatus("排位对决已生成，准备进入回放。");
    router.push(`/arena/${battle.id}`);
  };

  return (
    <main className="paper-grid grain relative min-h-screen overflow-hidden px-4 py-6 text-foreground sm:px-6 lg:px-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <section className="entry-fade paper-panel rounded-[2rem] px-6 py-8 sm:px-10">
          <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-4">
              <span className="accent-chip inline-flex rounded-full px-3 py-1 text-xs uppercase tracking-[0.28em]">
                真实接入控制台
              </span>
              <h1 className="display-title">SecondMe 竞技台</h1>
              <p className="max-w-3xl text-lg leading-8 text-stone-700">
                连接两位真实 SecondMe 参赛者，用他们的资料、标签和软记忆生成构筑，再把结果直接送进真实排位战。
              </p>
            </div>
            <div className="paper-panel-strong rounded-[1.6rem] p-6 text-sm leading-7">
              <p className="text-xs uppercase tracking-[0.22em] text-stone-500">
                竞技态势
              </p>
              <div className="mt-4 space-y-3">
                <p>甲方：{alpha?.connected ? participantSubtitle(alpha) : "未连接"}</p>
                <p>乙方：{beta?.connected ? participantSubtitle(beta) : "未连接"}</p>
                <p>当前辩题：{selectedTopic?.title ?? "载入中..."}</p>
                <p>编排模式：{orchestrationLabel(preview)}</p>
                <p>
                  榜首：{featured ? `${featured.displayName} · ${featured.rating}` : "等待首战"}
                </p>
              </div>
              {matchupSummary ? (
                <div className="mt-4 rounded-[1.15rem] border border-[var(--line)] bg-white/75 px-4 py-3">
                  <p className="font-semibold">{matchupSummary.stakesLabel}</p>
                  <p className="mt-2">
                    若甲方胜出预计 +{matchupSummary.projectedWinDelta}，失利{" "}
                    {matchupSummary.projectedLossDelta}
                  </p>
                  <p className="mt-2 text-stone-600">{matchupSummary.reason}</p>
                </div>
              ) : null}
              {duplicateWarning ? (
                <div className="mt-4 rounded-[1.15rem] border border-amber-300 bg-amber-50 px-4 py-3 text-amber-900">
                  <p>{duplicateWarning}</p>
                  <p className="mt-2 text-sm">
                    如需真实双人，请让乙方使用隐身窗口或另一浏览器重新授权。
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          {[
            { profile: alphaProfile, participant: alpha, slot: "alpha" as const, opponentProfile: betaProfile },
            { profile: betaProfile, participant: beta, slot: "beta" as const, opponentProfile: alphaProfile },
          ].map(({ participant, profile, slot, opponentProfile }) => (
            <article
              className="entry-fade paper-panel rounded-[1.75rem] p-6"
              key={slot}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-stone-500">
                    {participantTitle(slot)}
                  </p>
                  <h2 className="section-title mt-2">
                    {participantSubtitle(participant)}
                  </h2>
                </div>
                <div className="flex gap-3">
                  {!participant?.connected ? (
                    <button
                      className="soft-button rounded-full bg-[var(--accent)] px-4 py-3 text-sm text-white"
                      onClick={() => connectParticipant(slot)}
                      type="button"
                    >
                      连接 SecondMe
                    </button>
                  ) : (
                    <>
                      {slot === "beta" && duplicateWarning ? (
                        <button
                          className="soft-button rounded-full bg-[var(--accent)] px-4 py-3 text-sm text-white"
                          onClick={() => connectParticipant("beta")}
                          type="button"
                        >
                          重新连接乙方
                        </button>
                      ) : null}
                      <button
                        className="soft-button rounded-full border border-[var(--line)] bg-white/70 px-4 py-3 text-sm"
                        onClick={() => void disconnectParticipant(slot)}
                        type="button"
                      >
                        断开连接
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="mt-5 grid gap-3 text-sm leading-7 text-stone-700">
                <div className="rounded-[1.2rem] border border-[var(--line)] bg-white/75 p-4">
                  <p className="font-semibold">竞技档案</p>
                  {profile ? (
                    <div className="mt-2 space-y-1 text-stone-600">
                      <p>排名：{formatRank(profile)}</p>
                      <p>积分：{profile.rating}</p>
                      <p>
                        战绩：{profile.wins} 胜 {profile.losses} 负 · 胜率 {profile.winRate}%
                      </p>
                      <p>
                        当前连胜：{profile.currentStreak} · 最高连胜 {profile.bestStreak}
                      </p>
                      <p>最近结果：{formatLastResult(profile)}</p>
                      <p>近况：{profile.recentForm.join(" ") || "暂无"}</p>
                      {profile.suggestion ? (
                        <p className="pt-2">
                          {profile.suggestion.competitorId ===
                          opponentProfile?.competitorId
                            ? `当前对手就是建议挑战对象，胜出预计 +${profile.suggestion.projectedWinDelta}。`
                            : `建议挑战：${profile.suggestion.displayName}，胜出预计 +${profile.suggestion.projectedWinDelta}。`}
                        </p>
                      ) : null}
                    </div>
                  ) : (
                    <p className="mt-2 text-stone-600">
                      连接后会在这里出现积分、连胜和建议挑战对象。
                    </p>
                  )}
                </div>

                <div className="rounded-[1.2rem] border border-[var(--line)] bg-white/75 p-4">
                  <p className="font-semibold">授权说明</p>
                  <p className="mt-2 text-stone-600">
                    {slot === "alpha"
                      ? "甲方可以直接在当前窗口完成授权。"
                      : "乙方建议使用隐身窗口或另一浏览器完成授权，避免复用甲方的 SecondMe 登录态。"}
                  </p>
                </div>
                <div className="rounded-[1.2rem] border border-[var(--line)] bg-white/75 p-4">
                  <p className="font-semibold">身份信息</p>
                  <p className="mt-2">主页路径：{userField(participant, "route") ?? "无"}</p>
                  <p className="mt-1">简介：{userField(participant, "bio") ?? "无"}</p>
                </div>
                <div className="rounded-[1.2rem] border border-[var(--line)] bg-white/75 p-4">
                  <p className="font-semibold">核心标签</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {topShades(participant).length ? (
                      topShades(participant).map((shade) => (
                        <span key={shade} className="accent-chip rounded-full px-3 py-1 text-xs">
                          {shade}
                        </span>
                      ))
                    ) : (
                      <p className="text-stone-500">当前没有可用标签。</p>
                    )}
                  </div>
                </div>
                <div className="rounded-[1.2rem] border border-[var(--line)] bg-white/75 p-4">
                  <p className="font-semibold">软记忆锚点</p>
                  <div className="mt-3 space-y-2">
                    {memoryAnchors(participant).length ? (
                      memoryAnchors(participant).map((memory) => (
                        <p key={memory} className="text-stone-600">
                          {memory}
                        </p>
                      ))
                    ) : (
                      <p className="text-stone-500">当前没有可用软记忆。</p>
                    )}
                  </div>
                </div>
                {participant?.issues.length ? (
                  <div className="rounded-[1.2rem] border border-amber-300 bg-amber-50 p-4 text-amber-900">
                    {participant.issues.map((issue) => (
                      <p key={issue}>{issue}</p>
                    ))}
                    {slot === "beta" && duplicateWarning ? (
                      <p className="mt-2">
                        建议点击上方“重新连接乙方”，并在隐身窗口或另一浏览器里完成登录。
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </article>
          ))}
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <article className="entry-fade paper-panel rounded-[1.75rem] p-6">
            <p className="text-xs uppercase tracking-[0.22em] text-stone-500">
              辩题选择
            </p>
            <h2 className="section-title mt-2">选择本场排位辩题</h2>
            <div className="mt-5 grid gap-3">
              {meta?.topics.map((topic) => (
                <button
                  key={topic.id}
                  className={`rounded-[1.3rem] border px-4 py-4 text-left ${
                    topic.id === topicId
                      ? "border-[var(--accent)] bg-white"
                      : "border-[var(--line)] bg-white/75"
                  }`}
                  onClick={() => setTopicId(topic.id)}
                  type="button"
                >
                  <p className="text-base font-semibold">{topic.title}</p>
                  <p className="mt-2 text-sm leading-7 text-stone-600">{topic.prompt}</p>
                </button>
              ))}
            </div>
          </article>

          <article className="entry-fade paper-panel rounded-[1.75rem] p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-stone-500">
                  对战控制
                </p>
                <h2 className="section-title mt-2">预览后直接进入排位</h2>
              </div>
              <div className="flex gap-3">
                <button
                  className="soft-button rounded-full border border-[var(--line)] bg-white/70 px-4 py-3 text-sm"
                  onClick={() => void previewBuild()}
                  type="button"
                >
                  生成人格预览
                </button>
                <Link
                  className="soft-button rounded-full border border-[var(--line)] bg-white/70 px-4 py-3 text-sm"
                  href="/arena/leaderboard"
                >
                  查看榜单
                </Link>
                <button
                  className="soft-button rounded-full bg-[var(--accent)] px-4 py-3 text-sm text-white"
                  onClick={() => void startBattle()}
                  type="button"
                >
                  开始排位对决
                </button>
              </div>
            </div>

            <div className="mt-4 rounded-[1.35rem] border border-[var(--line)] bg-white/75 p-4 text-sm leading-7 text-stone-600">
              {status ?? "连接双方参赛者后，即可生成预览或开始排位对决。"}
            </div>
            {matchupSummary ? (
              <div className="mt-4 rounded-[1.35rem] border border-[var(--line)] bg-stone-50 p-4 text-sm leading-7 text-stone-700">
                <p className="font-semibold">{matchupSummary.stakesLabel}</p>
                <p className="mt-2">
                  这场若甲方胜出预计 +{matchupSummary.projectedWinDelta}，失利{" "}
                  {matchupSummary.projectedLossDelta}。
                </p>
                <p className="mt-2 text-stone-600">{matchupSummary.reason}</p>
              </div>
            ) : null}
            {duplicateWarning ? (
              <div className="mt-4 rounded-[1.35rem] border border-amber-300 bg-amber-50 p-4 text-sm leading-7 text-amber-900">
                <p>{duplicateWarning}</p>
                <p className="mt-2">
                  当前允许继续预览和开战，方便单人演示；如果要真实双人，请重新授权乙方。
                </p>
              </div>
            ) : null}

            <div className="mt-5 rounded-[1.35rem] border border-[var(--line)] bg-white/75 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold">榜单速览</p>
                {featured ? (
                  <span className="accent-chip rounded-full px-3 py-1 text-xs">
                    榜首 {featured.displayName}
                  </span>
                ) : null}
              </div>
              <div className="mt-4 grid gap-3">
                {leaderboard.length ? (
                  leaderboard.map((entry) => (
                    <div
                      key={entry.competitorId}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-[1rem] border border-[var(--line)] bg-stone-50 px-4 py-3 text-sm"
                    >
                      <div>
                        <p className="font-semibold">
                          #{entry.rank} {entry.displayName}
                        </p>
                        <p className="text-stone-600">
                          积分 {entry.rating} · 连胜 {entry.currentStreak}
                        </p>
                      </div>
                      <span className="accent-chip rounded-full px-3 py-1 text-xs">
                        {entry.wins}W {entry.losses}L
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-stone-500">
                    还没有排位榜单，首场对局保存后就会出现。
                  </p>
                )}
              </div>
            </div>

            {preview ? (
              <div className="mt-5 grid gap-4">
                <div className="rounded-[1.35rem] border border-[var(--line)] bg-white/75 p-4">
                  <p className="text-sm font-semibold">
                    {preview.player.displayName} 对阵 {preview.defender.displayName}
                  </p>
                  <p className="mt-2 text-sm text-stone-600">
                    {preview.matchUpCallout}
                  </p>
                  {preview.sourceMeta.issues.length ? (
                    <div className="mt-4 rounded-[1.15rem] border border-amber-300 bg-amber-50 px-4 py-3 text-xs leading-6 text-amber-900">
                      {preview.sourceMeta.issues.map((issue) => (
                        <p key={issue}>{issue}</p>
                      ))}
                    </div>
                  ) : null}
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <div className="rounded-2xl border border-[var(--line)] bg-stone-50 px-4 py-3">
                      <p className="text-sm font-semibold">赛前优势判断</p>
                      <div className="mt-2 space-y-2 text-xs text-stone-600">
                        {preview.predictedEdges.map((edge) => (
                          <p key={edge}>{edge}</p>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-[var(--line)] bg-stone-50 px-4 py-3">
                      <p className="text-sm font-semibold">构筑提示</p>
                      <div className="mt-2 space-y-2 text-xs text-stone-600">
                        {preview.equipmentNotes.map((note) => (
                          <p key={note}>{note}</p>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {[preview.player, preview.defender].map((fighter) => (
                  <article
                    key={fighter.id}
                    className="rounded-[1.25rem] border border-[var(--line)] bg-white/75 px-4 py-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">
                          {fighter.displayName} · {fighter.powerLabel}
                        </p>
                        <p className="mt-1 text-sm text-stone-600">{fighter.declaration}</p>
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs">
                        <span className="accent-chip rounded-full px-3 py-1">
                          来源 {fighter.source.provider}
                        </span>
                        <span className="accent-chip rounded-full px-3 py-1">
                          槽位 {fighter.source.slot === "alpha" ? "甲方" : "乙方"}
                        </span>
                      </div>
                    </div>
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <div className="rounded-2xl border border-[var(--line)] bg-stone-50 px-4 py-3">
                        <p className="text-xs uppercase tracking-[0.18em] text-stone-500">
                          身份摘要
                        </p>
                        <div className="mt-2 space-y-2 text-sm text-stone-600">
                          {fighter.identitySummary.map((item) => (
                            <p key={item}>{item}</p>
                          ))}
                        </div>
                      </div>
                      <div className="rounded-2xl border border-[var(--line)] bg-stone-50 px-4 py-3">
                        <p className="text-xs uppercase tracking-[0.18em] text-stone-500">
                          记忆锚点
                        </p>
                        <div className="mt-2 space-y-2 text-sm text-stone-600">
                          {fighter.memoryAnchors.length ? (
                            fighter.memoryAnchors.map((item) => <p key={item}>{item}</p>)
                          ) : (
                            <p>暂无记忆锚点</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : null}
          </article>
        </section>

        <section className="entry-fade paper-panel rounded-[1.75rem] p-6">
          <p className="text-xs uppercase tracking-[0.22em] text-stone-500">
            外部信号
          </p>
          <h2 className="section-title mt-2">知乎灵感信号</h2>
          <div className="mt-5 flex flex-wrap gap-3">
            {meta?.signals?.length ? (
              meta.signals.map((signal) => (
                <span key={signal} className="accent-chip rounded-full px-3 py-2 text-sm">
                  {signal}
                </span>
              ))
            ) : (
              <p className="text-sm text-stone-500">当前没有可用外部信号。</p>
            )}
          </div>
        </section>
      </div>
      {isPending ? null : null}
    </main>
  );
}
