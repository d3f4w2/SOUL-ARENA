"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import type {
  ArenaLeaderboardEntry,
  BattleSummary,
} from "@/lib/arena-types";

type BattleFilter = "all" | "loss" | "win";

const filters: Array<{ id: BattleFilter; label: string }> = [
  { id: "all", label: "全部" },
  { id: "win", label: "胜利" },
  { id: "loss", label: "失败" },
];

const winnerLabel = (
  winnerId: string,
  playerName: string,
  defenderName: string,
) =>
  winnerId === "player"
    ? playerName
    : winnerId === "defender"
      ? defenderName
      : winnerId;

export function ArenaHistoryBoard({
  battles,
  featured,
}: {
  battles: BattleSummary[];
  featured: ArenaLeaderboardEntry | null;
}) {
  const [filter, setFilter] = useState<BattleFilter>("all");

  const competitiveBattles = useMemo(
    () =>
      battles.filter(
        (battle) =>
          battle.generationMode === "orchestrated" && battle.competition?.player,
      ),
    [battles],
  );
  const playerWins = competitiveBattles.filter(
    (battle) => battle.competition?.player?.result === "win",
  ).length;
  const playerLosses = competitiveBattles.filter(
    (battle) => battle.competition?.player?.result === "loss",
  ).length;
  const upsetWins = competitiveBattles.filter(
    (battle) =>
      battle.competition?.isUpsetWin &&
      battle.competition.player?.result === "win",
  ).length;
  const filteredBattles = battles.filter((battle) => {
    if (filter === "all") {
      return true;
    }

    if (!battle.competition?.player) {
      return false;
    }

    return battle.competition.player.result === filter;
  });

  return (
    <section className="entry-fade paper-panel rounded-[1.75rem] p-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-[1.25rem] border border-[var(--line)] bg-white/75 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-stone-500">
            排位总场次
          </p>
          <p className="mt-3 text-3xl font-semibold">{competitiveBattles.length}</p>
          <p className="mt-2 text-sm text-stone-600">
            当前挑战者侧战绩 {playerWins} 胜 {playerLosses} 负
          </p>
        </article>
        <article className="rounded-[1.25rem] border border-[var(--line)] bg-white/75 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-stone-500">
            当前榜首
          </p>
          <p className="mt-3 text-xl font-semibold">
            {featured ? featured.displayName : "尚未开赛"}
          </p>
          <p className="mt-2 text-sm text-stone-600">
            {featured
              ? `积分 ${featured.rating} · 当前连胜 ${featured.currentStreak}`
              : "等待第一场真实对局写入榜单"}
          </p>
        </article>
        <article className="rounded-[1.25rem] border border-[var(--line)] bg-white/75 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-stone-500">
            下克上
          </p>
          <p className="mt-3 text-3xl font-semibold">{upsetWins}</p>
          <p className="mt-2 text-sm text-stone-600">
            挑战者越级冲榜成功的关键局数量
          </p>
        </article>
        <article className="rounded-[1.25rem] border border-[var(--line)] bg-white/75 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-stone-500">
            列表筛选
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {filters.map((item) => (
              <button
                className={`rounded-full border px-3 py-2 text-sm ${
                  item.id === filter
                    ? "border-[var(--accent)] bg-white"
                    : "border-[var(--line)] bg-stone-50"
                }`}
                key={item.id}
                onClick={() => setFilter(item.id)}
                type="button"
              >
                {item.label}
              </button>
            ))}
          </div>
        </article>
      </div>

      {filteredBattles.length ? (
        <div className="mt-6 grid gap-4">
          {filteredBattles.map((battle) => (
            <article
              className="rounded-[1.35rem] border border-[var(--line)] bg-white/75 px-5 py-5"
              key={battle.id}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-[0.18em] text-stone-500">
                    {battle.generationMode === "mock" ? "经典演示" : "真实排位"} ·{" "}
                    {new Date(battle.createdAt).toLocaleString()}
                  </p>
                  <h3 className="text-lg font-semibold">{battle.roomTitle}</h3>
                  <p className="text-sm text-stone-600">
                    {battle.playerDisplayName} 对阵 {battle.defenderDisplayName}
                  </p>
                  <p className="text-sm text-stone-600">
                    胜者：
                    {winnerLabel(
                      battle.winnerId,
                      battle.playerDisplayName,
                      battle.defenderDisplayName,
                    )}
                  </p>
                  {battle.topicTitle ? (
                    <p className="text-sm text-stone-600">
                      辩题：{battle.topicTitle} · {battle.topicSource === "zhihu_dynamic" ? "Zhihu Dynamic" : "Preset"}
                    </p>
                  ) : null}
                  {battle.participantProviders?.length ? (
                    <p className="text-sm text-stone-600">
                      Provider：{battle.participantProviders.join(" vs ")}
                    </p>
                  ) : null}
                  {battle.competition?.player ? (
                    <p className="text-sm text-stone-600">
                      {battle.competition.stakesLabel} · 挑战者积分{" "}
                      {battle.competition.player.scoreDelta > 0 ? "+" : ""}
                      {battle.competition.player.scoreDelta} · 排名{" "}
                      {battle.competition.player.rankBefore ?? "-"} →{" "}
                      {battle.competition.player.rankAfter ?? "-"}
                    </p>
                  ) : null}
                  {battle.originBattleId ? (
                    <p className="text-sm text-stone-600">
                      Rematch of {battle.originBattleId}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-3">
                  {battle.competition?.player ? (
                    <span className="accent-chip rounded-full px-3 py-1 text-xs">
                      {battle.competition.player.result === "win"
                        ? "胜利"
                        : "失败"}
                    </span>
                  ) : null}
                  <Link
                    className="soft-button rounded-full border border-[var(--line)] bg-white/70 px-4 py-2 text-sm"
                    href={`/arena/${battle.id}`}
                  >
                    打开回放
                  </Link>
                  {battle.setupId ? (
                    <Link
                      className="soft-button rounded-full border border-[var(--line)] bg-white/70 px-4 py-2 text-sm"
                      href={`/arena?setupId=${battle.setupId}`}
                    >
                      继续重开
                    </Link>
                  ) : null}
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-6 rounded-[1.35rem] border border-[var(--line)] bg-white/75 p-6 text-sm leading-7 text-stone-600">
          当前筛选条件下还没有匹配战报。
        </div>
      )}
    </section>
  );
}
