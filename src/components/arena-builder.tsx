"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import type {
  ArenaBuildPreview,
  BattlePackage,
  ChallengerPreset,
  FighterBuildInput,
  TopicPreset,
} from "@/lib/arena-types";

type ArenaMetaResponse = {
  challengers: ChallengerPreset[];
  signals: string[];
  topics: TopicPreset[];
};

type SessionResponse = {
  authenticated: boolean;
  user?: {
    name?: string;
  } | null;
};

const battleStorageKey = (battleId: string) => `soul-arena:battle:${battleId}`;

const defaultInput: FighterBuildInput = {
  declaration: "我要证明，更锋利的解释型构筑能赢下这个擂台。",
  displayName: "无名挑战者",
  rule: "每一个核心主张，都必须落到一个现实层面的结果上。",
  soulSeedTags: [],
  taboo: "禁止复读自己的结论，却不给新的攻击面。",
  viewpoints: [
    "最强的构筑不是最响亮的构筑，而是能在反击中继续站住的构筑。",
    "如果一个观点只能单向输出，它就不是一件完整武器。",
    "决定胜负的不是信息量，而是你能不能把对手推向他自己的漏洞。",
  ],
};

async function readJson<T>(url: string, init?: RequestInit) {
  const response = await fetch(url, init);
  return (await response.json()) as T;
}

export function ArenaBuilder() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [meta, setMeta] = useState<ArenaMetaResponse | null>(null);
  const [buildInput, setBuildInput] = useState<FighterBuildInput>(defaultInput);
  const [topicId, setTopicId] = useState("");
  const [challengerId, setChallengerId] = useState("");
  const [preview, setPreview] = useState<ArenaBuildPreview | null>(null);
  const [previewStatus, setPreviewStatus] = useState<string | null>(null);
  const [createStatus, setCreateStatus] = useState<string | null>(null);
  const [session, setSession] = useState<SessionResponse | null>(null);

  const readyToBuild =
    buildInput.viewpoints.filter((item) => item.trim()).length >= 3 &&
    buildInput.rule.trim().length > 0 &&
    buildInput.taboo.trim().length > 0 &&
    topicId &&
    challengerId;

  const selectedTopic = useMemo(
    () => meta?.topics.find((topic) => topic.id === topicId) ?? null,
    [meta?.topics, topicId],
  );

  const selectedChallenger = useMemo(
    () => meta?.challengers.find((challenger) => challenger.id === challengerId) ?? null,
    [challengerId, meta?.challengers],
  );

  useEffect(() => {
    void (async () => {
      const [metaPayload, sessionPayload] = await Promise.all([
        readJson<ArenaMetaResponse>("/api/arena/topics"),
        readJson<SessionResponse>("/api/me"),
      ]);

      setMeta(metaPayload);
      setSession(sessionPayload);
      setTopicId(metaPayload.topics[0]?.id ?? "");
      setChallengerId(metaPayload.challengers[0]?.id ?? "");

      if (sessionPayload.authenticated && sessionPayload.user?.name) {
        setBuildInput((current) => ({
          ...current,
          displayName: sessionPayload.user?.name ?? current.displayName,
        }));
      }

      if (sessionPayload.authenticated) {
        const shadesPayload = await readJson<{
          data?: {
            shades?: Array<{
              label?: string;
              name?: string;
            }>;
          };
        }>("/api/secondme/shades");
        const tags = (shadesPayload.data?.shades ?? [])
          .map((item) => item.label ?? item.name)
          .filter((item): item is string => Boolean(item))
          .slice(0, 4);

        setBuildInput((current) => ({
          ...current,
          soulSeedTags: tags,
        }));
      }
    })();
  }, []);

  const updateViewpoint = (index: number, value: string) => {
    setBuildInput((current) => {
      const next = [...current.viewpoints];
      next[index] = value;
      return {
        ...current,
        viewpoints: next,
      };
    });
  };

  const previewBuild = async () => {
    if (!readyToBuild) {
      setPreviewStatus("请先把辩题、守擂者和三条观点补完整。");
      return;
    }

    setPreviewStatus("正在分析构筑...");
    const payload = await readJson<ArenaBuildPreview>("/api/arena/build-preview", {
      body: JSON.stringify({
        challengerId,
        player: buildInput,
        topicId,
      }),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });

    startTransition(() => {
      setPreview(payload);
      setPreviewStatus("构筑预览已更新。");
    });
  };

  const startBattle = async () => {
    if (!readyToBuild) {
      setCreateStatus("请先完成构筑，再开始对战。");
      return;
    }

    setCreateStatus("正在生成战斗包...");
    const battle = await readJson<BattlePackage>("/api/arena/battles", {
      body: JSON.stringify({
        challengerId,
        player: buildInput,
        topicId,
      }),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });

    localStorage.setItem(battleStorageKey(battle.id), JSON.stringify(battle));
    setCreateStatus("战斗包已生成。");
    router.push(`/arena/${battle.id}`);
  };

  return (
    <main className="paper-grid grain relative min-h-screen overflow-hidden px-4 py-6 text-foreground sm:px-6 lg:px-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <section className="entry-fade paper-panel rounded-[2rem] px-6 py-8 sm:px-10">
          <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-4">
              <span className="accent-chip inline-flex rounded-full px-3 py-1 text-xs uppercase tracking-[0.28em]">
                擂台工作台
              </span>
              <h1 className="display-title">配魂与备战</h1>
              <p className="max-w-3xl text-lg leading-8 text-stone-700">
                第一阶段的关键不是写得更多，而是让构筑更清楚、更锋利、更容易命中弱点。
              </p>
            </div>
            <div className="paper-panel-strong rounded-[1.6rem] p-6 text-sm leading-7">
              <p className="text-xs uppercase tracking-[0.22em] text-stone-500">
                Seed 状态
              </p>
              <div className="mt-4 space-y-3">
                <p>身份种子：{session?.user?.name ?? "未连接 SecondMe 也可继续"}</p>
                <p>SecondMe 标签：{buildInput.soulSeedTags.join(" / ") || "无"}</p>
                <p>Zhihu 灵感：{meta?.signals?.[0] ?? "载入中"}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <article className="entry-fade paper-panel rounded-[1.75rem] p-6">
            <div className="grid gap-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm font-semibold">辩题</p>
                  <div className="mt-3 grid gap-3">
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
                </div>
                <div>
                  <p className="text-sm font-semibold">守擂者</p>
                  <div className="mt-3 grid gap-3">
                    {meta?.challengers.map((challenger) => (
                      <button
                        key={challenger.id}
                        className={`rounded-[1.3rem] border px-4 py-4 text-left ${
                          challenger.id === challengerId
                            ? "border-[var(--accent)] bg-white"
                            : "border-[var(--line)] bg-white/75"
                        }`}
                        onClick={() => setChallengerId(challenger.id)}
                        type="button"
                      >
                        <p className="text-base font-semibold">
                          {challenger.displayName} · {challenger.archetype}
                        </p>
                        <p className="mt-2 text-sm leading-7 text-stone-600">
                          {challenger.declaration}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="rounded-[1.4rem] border border-[var(--line)] bg-white/75 p-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="grid gap-2 text-sm">
                    <span className="font-semibold">挑战者名称</span>
                    <input
                      className="rounded-full border border-[var(--line)] bg-white px-4 py-3 outline-none"
                      onChange={(event) =>
                        setBuildInput((current) => ({
                          ...current,
                          displayName: event.target.value,
                        }))
                      }
                      value={buildInput.displayName}
                    />
                  </label>
                  <label className="grid gap-2 text-sm">
                    <span className="font-semibold">登场宣言</span>
                    <input
                      className="rounded-full border border-[var(--line)] bg-white px-4 py-3 outline-none"
                      onChange={(event) =>
                        setBuildInput((current) => ({
                          ...current,
                          declaration: event.target.value,
                        }))
                      }
                      value={buildInput.declaration}
                    />
                  </label>
                </div>

                <div className="mt-4 grid gap-4">
                  {buildInput.viewpoints.map((viewpoint, index) => (
                    <label className="grid gap-2 text-sm" key={`viewpoint-${index}`}>
                      <span className="font-semibold">观点 {index + 1}</span>
                      <textarea
                        className="min-h-28 rounded-[1.25rem] border border-[var(--line)] bg-white px-4 py-3 outline-none"
                        onChange={(event) => updateViewpoint(index, event.target.value)}
                        value={viewpoint}
                      />
                    </label>
                  ))}
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <label className="grid gap-2 text-sm">
                    <span className="font-semibold">规则</span>
                    <textarea
                      className="min-h-28 rounded-[1.25rem] border border-[var(--line)] bg-white px-4 py-3 outline-none"
                      onChange={(event) =>
                        setBuildInput((current) => ({
                          ...current,
                          rule: event.target.value,
                        }))
                      }
                      value={buildInput.rule}
                    />
                  </label>
                  <label className="grid gap-2 text-sm">
                    <span className="font-semibold">禁忌</span>
                    <textarea
                      className="min-h-28 rounded-[1.25rem] border border-[var(--line)] bg-white px-4 py-3 outline-none"
                      onChange={(event) =>
                        setBuildInput((current) => ({
                          ...current,
                          taboo: event.target.value,
                        }))
                      }
                      value={buildInput.taboo}
                    />
                  </label>
                </div>
              </div>
            </div>
          </article>

          <article className="entry-fade paper-panel rounded-[1.75rem] p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-stone-500">
                  构筑预览
                </p>
                <h2 className="section-title mt-2">装备判读与战术建议</h2>
              </div>
              <div className="flex gap-3">
                <button
                  className="soft-button rounded-full border border-[var(--line)] bg-white/70 px-4 py-3 text-sm"
                  onClick={() => void previewBuild()}
                  type="button"
                >
                  预览构筑
                </button>
                <button
                  className="soft-button rounded-full bg-[var(--accent)] px-4 py-3 text-sm text-white"
                  onClick={() => void startBattle()}
                  type="button"
                >
                  开始对战
                </button>
              </div>
            </div>

            <div className="mt-4 rounded-[1.35rem] border border-[var(--line)] bg-white/75 p-4 text-sm leading-7 text-stone-600">
              {previewStatus ?? createStatus ?? "先预览构筑，再生成 battle package。"}
            </div>

            {preview ? (
              <div className="mt-5 grid gap-4">
                <div className="rounded-[1.35rem] border border-[var(--line)] bg-white/75 p-4">
                  <p className="text-sm font-semibold">
                    {selectedTopic?.title} · {selectedChallenger?.displayName}
                  </p>
                  <p className="mt-2 text-sm text-stone-600">
                    {preview.matchUpCallout}
                  </p>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <div className="rounded-2xl border border-[var(--line)] bg-stone-50 px-4 py-3">
                      <p className="text-sm font-semibold">你的优势边</p>
                      <div className="mt-2 space-y-2 text-xs text-stone-600">
                        {preview.predictedEdges.map((edge) => (
                          <p key={edge}>{edge}</p>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-[var(--line)] bg-stone-50 px-4 py-3">
                      <p className="text-sm font-semibold">赛前建议</p>
                      <div className="mt-2 space-y-2 text-xs text-stone-600">
                        {preview.equipmentNotes.map((note) => (
                          <p key={note}>{note}</p>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid gap-3">
                  {preview.player.cards.map((card) => (
                    <article
                      key={card.id}
                      className="rounded-[1.25rem] border border-[var(--line)] bg-white/75 px-4 py-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold">
                            {card.title} · {card.trait}
                          </p>
                          <p className="mt-1 text-sm text-stone-600">{card.hint}</p>
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs">
                          <span className="accent-chip rounded-full px-3 py-1">
                            攻击 {card.atk}
                          </span>
                          <span className="accent-chip rounded-full px-3 py-1">
                            防御 {card.def}
                          </span>
                          <span className="accent-chip rounded-full px-3 py-1">
                            穿透 {card.pen}
                          </span>
                          <span className="accent-chip rounded-full px-3 py-1">
                            节奏 {card.spd}
                          </span>
                        </div>
                      </div>
                      <div className="mt-3 grid gap-2 text-xs text-stone-600 md:grid-cols-3">
                        <p>原创性 {card.radar.originality}</p>
                        <p>可攻击性 {card.radar.attackability}</p>
                        <p>可防守性 {card.radar.defensibility}</p>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            ) : null}
          </article>
        </section>

        <section className="entry-fade paper-panel rounded-[1.75rem] p-6">
          <p className="text-xs uppercase tracking-[0.22em] text-stone-500">
            外部信号
          </p>
          <h2 className="section-title mt-2">知乎热榜灵感</h2>
          <div className="mt-5 flex flex-wrap gap-3">
            {meta?.signals?.length ? (
              meta.signals.map((signal) => (
                <span
                  key={signal}
                  className="accent-chip rounded-full px-3 py-2 text-sm"
                >
                  {signal}
                </span>
              ))
            ) : (
              <p className="text-sm text-stone-500">
                当前没有外部灵感信号，内置辩题已足够支撑 MVP 主线。
              </p>
            )}
          </div>
        </section>
      </div>
      {isPending ? null : null}
    </main>
  );
}
