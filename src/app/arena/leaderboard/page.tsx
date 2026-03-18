import Link from "next/link";

import {
  getArenaFeaturedCompetitor,
  getArenaLeaderboard,
} from "@/lib/arena-competition";

export const dynamic = "force-dynamic";

const resultLabel = (result: "win" | "loss" | null) => {
  if (result === "win") {
    return "上一场获胜";
  }

  if (result === "loss") {
    return "上一场失利";
  }

  return "尚未开赛";
};

export default function ArenaLeaderboardPage() {
  const leaderboard = getArenaLeaderboard(20);
  const featured = getArenaFeaturedCompetitor();

  return (
    <main className="paper-grid grain relative min-h-screen overflow-hidden px-4 py-6 text-foreground sm:px-6 lg:px-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <section className="entry-fade paper-panel rounded-[2rem] px-6 py-8 sm:px-10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-3">
              <span className="accent-chip inline-flex rounded-full px-3 py-1 text-xs uppercase tracking-[0.28em]">
                Arena Leaderboard
              </span>
              <h1 className="display-title">竞技排行榜</h1>
              <p className="max-w-3xl text-lg leading-8 text-stone-700">
                用积分、连胜和最近状态来定义当前竞技场的统治力。每一场真实 battle 都会直接改变这里的顺位。
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                className="soft-button rounded-full bg-[var(--accent)] px-5 py-3 text-sm text-white"
                href="/arena"
              >
                进入竞技场
              </Link>
              <Link
                className="soft-button rounded-full border border-[var(--line)] bg-white/70 px-5 py-3 text-sm"
                href="/arena/history"
              >
                查看战绩中心
              </Link>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <article className="entry-fade paper-panel rounded-[1.75rem] p-6">
            <p className="text-xs uppercase tracking-[0.22em] text-stone-500">
              当前焦点
            </p>
            <h2 className="section-title mt-2">
              {featured ? `${featured.displayName} 正在领跑` : "排行榜等待首战"}
            </h2>
            <div className="mt-5 grid gap-3 text-sm leading-7 text-stone-700">
              {featured ? (
                <>
                  <p>当前排名：第 {featured.rank} 名</p>
                  <p>当前积分：{featured.rating}</p>
                  <p>当前连胜：{featured.currentStreak}</p>
                  <p>
                    总战绩：{featured.wins} 胜 {featured.losses} 负，胜率 {featured.winRate}%
                  </p>
                </>
              ) : (
                <p>还没有真实排位战。先去 `/arena` 发起第一场对决，榜单就会开始滚动。</p>
              )}
            </div>
          </article>

          <article className="entry-fade paper-panel rounded-[1.75rem] p-6">
            <p className="text-xs uppercase tracking-[0.22em] text-stone-500">
              排名规则
            </p>
            <div className="mt-5 grid gap-3 text-sm leading-7 text-stone-700">
              <div className="rounded-[1.2rem] border border-[var(--line)] bg-white/75 p-4">
                积分优先，积分相同时按当前连胜排序。
              </div>
              <div className="rounded-[1.2rem] border border-[var(--line)] bg-white/75 p-4">
                再看胜率与最近状态，避免纯场次数量刷榜。
              </div>
              <div className="rounded-[1.2rem] border border-[var(--line)] bg-white/75 p-4">
                击败更高分对手会获得更高收益，失利也会承担更大的掉分风险。
              </div>
            </div>
          </article>
        </section>

        <section className="entry-fade paper-panel rounded-[1.75rem] p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-stone-500">
                排行榜
              </p>
              <h2 className="section-title mt-2">
                {leaderboard.length ? `共 ${leaderboard.length} 位上榜选手` : "尚未形成榜单"}
              </h2>
            </div>
          </div>

          {leaderboard.length ? (
            <div className="mt-6 grid gap-4">
              {leaderboard.map((entry) => (
                <article
                  className="rounded-[1.35rem] border border-[var(--line)] bg-white/75 px-5 py-5"
                  key={entry.competitorId}
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-2">
                      <p className="text-xs uppercase tracking-[0.18em] text-stone-500">
                        Rank #{entry.rank}
                      </p>
                      <h3 className="text-lg font-semibold">{entry.displayName}</h3>
                      <p className="text-sm text-stone-600">
                        积分 {entry.rating} · {entry.wins} 胜 {entry.losses} 负 · 胜率{" "}
                        {entry.winRate}%
                      </p>
                      <p className="text-sm text-stone-600">
                        当前连胜 {entry.currentStreak} · 最高连胜 {entry.bestStreak} ·{" "}
                        {resultLabel(entry.lastResult)}
                      </p>
                    </div>
                    <div className="grid gap-3 text-sm text-stone-700">
                      <span className="accent-chip rounded-full px-3 py-1 text-center text-xs">
                        近况 {entry.recentForm.join(" ") || "暂无"}
                      </span>
                      {entry.suggestion ? (
                        <div className="rounded-[1rem] border border-[var(--line)] bg-stone-50 px-4 py-3">
                          <p className="font-semibold">
                            建议挑战：{entry.suggestion.displayName}
                          </p>
                          <p className="mt-1 text-stone-600">
                            胜出预计 +{entry.suggestion.projectedWinDelta}，失利{" "}
                            {entry.suggestion.projectedLossDelta}
                          </p>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-6 rounded-[1.35rem] border border-[var(--line)] bg-white/75 p-6 text-sm leading-7 text-stone-600">
              还没有真实排位战数据，排行榜会在第一场真实对局保存后自动出现。
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
