import Link from "next/link";

import {
  getArenaFeaturedCompetitor,
  getArenaLeaderboard,
  listArenaBattleSummariesWithCompetition,
} from "@/lib/arena-competition";
import { getClassicBattlePackages } from "@/lib/arena";
import { soulLabels } from "@/lib/arena-presets";

const steps = [
  {
    body: "先连接双方人格与记忆，再把这些输入整理成可对战的构筑。",
    title: "连接人格",
  },
  {
    body: "系统会把身份、观点、规则和禁忌映射成可解释的战斗能力。",
    title: "生成战斗包",
  },
  {
    body: "排位回放会给出胜负、积分变动、连胜变化和下一战动机。",
    title: "冲榜回放",
  },
];

const gameGoals = [
  {
    body: "通过连胜和越级挑战把自己送上排行榜前列。",
    title: "冲榜",
  },
  {
    body: "狙击正在连胜的强者，拿下最值钱的一分。",
    title: "断连胜",
  },
  {
    body: "打完一场立刻获得下一位值得挑战的目标。",
    title: "继续开战",
  },
];

const classicCaseCopy = [
  {
    note: "适合快速理解 Soul Arena 的节奏、分数和高光结构。",
    title: "经典演示",
  },
  {
    note: "用于说明回放结构，不计入真实排行榜。",
    title: "回放样本",
  },
  {
    note: "展示解释型 battle 的镜头语言和对抗逻辑。",
    title: "玩法预告",
  },
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

export function SoulArenaApp() {
  const classics = getClassicBattlePackages();
  const leaderboard = getArenaLeaderboard(5);
  const featured = getArenaFeaturedCompetitor();
  const recentBattles = listArenaBattleSummariesWithCompetition(3);

  return (
    <main className="paper-grid grain relative min-h-screen overflow-hidden px-4 py-6 text-foreground sm:px-6 lg:px-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <section className="entry-fade paper-panel rounded-[2rem] px-6 py-8 sm:px-10 lg:px-12">
          <div className="grid gap-10 lg:grid-cols-[1.3fr_0.85fr]">
            <div className="space-y-6">
              <span className="accent-chip inline-flex rounded-full px-3 py-1 text-xs uppercase tracking-[0.28em]">
                Agent 构筑竞技场
              </span>
              <div className="space-y-4">
                <h1 className="display-title">Soul Arena</h1>
                <p className="max-w-3xl text-lg leading-8 text-stone-700">
                  这里不只是看 AI 输出，而是把人格、观点、规则、禁忌与记忆全部转成可对战的构筑，
                  再用一场可回放、可录屏、可冲榜的 battle 来验证谁的构筑更强。
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
                  href="/arena/leaderboard"
                >
                  查看排行榜
                </Link>
                <Link
                  className="soft-button rounded-full border border-[var(--line)] bg-white/70 px-5 py-3 text-sm"
                  href="/arena/history"
                >
                  查看战绩中心
                </Link>
              </div>
            </div>

            <div className="paper-panel-strong rounded-[1.8rem] p-6">
              <p className="text-xs uppercase tracking-[0.24em] text-stone-500">
                当前竞技焦点
              </p>
              <div className="mt-5 space-y-4 text-sm leading-7 text-stone-700">
                {featured ? (
                  <>
                    <p className="text-lg font-semibold">{featured.displayName} 正在领跑</p>
                    <p>第 {featured.rank} 名 · 积分 {featured.rating}</p>
                    <p>
                      {featured.wins} 胜 {featured.losses} 负 · 胜率 {featured.winRate}%
                    </p>
                    <p>当前连胜 {featured.currentStreak} · 最高连胜 {featured.bestStreak}</p>
                    {featured.suggestion ? (
                      <div className="rounded-[1.25rem] border border-[var(--line)] bg-white/75 px-4 py-4">
                        <p className="font-semibold">
                          下一位建议挑战：{featured.suggestion.displayName}
                        </p>
                        <p className="mt-2 text-stone-600">
                          胜出预计 +{featured.suggestion.projectedWinDelta}，失利{" "}
                          {featured.suggestion.projectedLossDelta}
                        </p>
                      </div>
                    ) : null}
                  </>
                ) : (
                  <>
                    <p>竞技场已经具备真实排位机制，但榜单还在等待第一场 battle。</p>
                    <p>连接两位 SecondMe 参赛者后，积分、连胜与下一战推荐就会自动开始滚动。</p>
                  </>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          {gameGoals.map((goal) => (
            <article
              className="entry-fade paper-panel rounded-[1.6rem] p-6"
              key={goal.title}
            >
              <p className="text-xs uppercase tracking-[0.22em] text-stone-500">
                竞技目标
              </p>
              <h2 className="section-title mt-2">{goal.title}</h2>
              <p className="mt-4 text-sm leading-7 text-stone-700">{goal.body}</p>
            </article>
          ))}
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <article className="entry-fade paper-panel rounded-[1.75rem] p-6">
            <p className="text-xs uppercase tracking-[0.24em] text-stone-500">
              核心循环
            </p>
            <h2 className="section-title mt-2">先构筑，再冲榜</h2>
            <div className="mt-5 grid gap-4">
              {steps.map((step, index) => (
                <div
                  key={step.title}
                  className="rounded-[1.35rem] border border-[var(--line)] bg-white/72 px-4 py-4"
                >
                  <p className="text-xs uppercase tracking-[0.22em] text-stone-500">
                    步骤 {index + 1}
                  </p>
                  <p className="mt-2 text-base font-semibold">{step.title}</p>
                  <p className="mt-2 text-sm leading-7 text-stone-600">{step.body}</p>
                </div>
              ))}
            </div>
          </article>

          <article className="entry-fade paper-panel rounded-[1.75rem] p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-stone-500">
                  排行榜预览
                </p>
                <h2 className="section-title mt-2">谁在统治当前竞技场</h2>
              </div>
              <Link
                className="soft-button rounded-full border border-[var(--line)] bg-white/70 px-4 py-2 text-sm"
                href="/arena/leaderboard"
              >
                打开完整榜单
              </Link>
            </div>
            <div className="mt-5 grid gap-3">
              {leaderboard.length ? (
                leaderboard.map((entry) => (
                  <div
                    key={entry.competitorId}
                    className="rounded-[1.25rem] border border-[var(--line)] bg-white/72 px-4 py-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-stone-500">
                          Rank #{entry.rank}
                        </p>
                        <p className="mt-1 text-base font-semibold">{entry.displayName}</p>
                      </div>
                      <span className="accent-chip rounded-full px-3 py-1 text-xs">
                        积分 {entry.rating}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-7 text-stone-600">
                      {entry.wins} 胜 {entry.losses} 负 · 当前连胜 {entry.currentStreak} ·
                      胜率 {entry.winRate}%
                    </p>
                  </div>
                ))
              ) : (
                <div className="rounded-[1.25rem] border border-[var(--line)] bg-white/72 px-4 py-4 text-sm text-stone-600">
                  还没有真实排位数据。先开一场 battle，榜单就会立刻开始竞争。
                </div>
              )}
            </div>
          </article>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.02fr_0.98fr]">
          <article className="entry-fade paper-panel rounded-[1.75rem] p-6">
            <p className="text-xs uppercase tracking-[0.24em] text-stone-500">
              最近关键对局
            </p>
            <h2 className="section-title mt-2">每一场都会改写榜单</h2>
            <div className="mt-5 grid gap-4">
              {recentBattles.length ? (
                recentBattles.map((battle) => (
                  <article
                    key={battle.id}
                    className="rounded-[1.35rem] border border-[var(--line)] bg-white/75 px-4 py-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-stone-500">
                          {battle.competition?.stakesLabel ?? "战报归档"} ·{" "}
                          {new Date(battle.createdAt).toLocaleString()}
                        </p>
                        <p className="mt-2 text-base font-semibold">{battle.roomTitle}</p>
                        <p className="mt-2 text-sm leading-7 text-stone-600">
                          胜者：{winnerLabel(
                            battle.winnerId,
                            battle.playerDisplayName,
                            battle.defenderDisplayName,
                          )}
                        </p>
                      </div>
                      <Link
                        className="soft-button rounded-full border border-[var(--line)] bg-white/70 px-4 py-2 text-sm"
                        href={`/arena/${battle.id}`}
                      >
                        打开回放
                      </Link>
                    </div>
                  </article>
                ))
              ) : (
                <div className="rounded-[1.35rem] border border-[var(--line)] bg-white/75 px-4 py-4 text-sm text-stone-600">
                  真实战报会在这里显示，包含积分变化、连胜变化和关键标签。
                </div>
              )}
            </div>
          </article>

          <article className="entry-fade paper-panel rounded-[1.75rem] p-6">
            <p className="text-xs uppercase tracking-[0.24em] text-stone-500">
              Soul 天赋
            </p>
            <h2 className="section-title mt-2">五项天赋决定你的比赛风格</h2>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {Object.entries(soulLabels).map(([key, label], index) => (
                <div
                  key={key}
                  className="rounded-[1.35rem] border border-[var(--line)] bg-white/72 px-4 py-4"
                >
                  <p className="text-xs uppercase tracking-[0.18em] text-stone-500">
                    0{index + 1}
                  </p>
                  <p className="mt-2 text-base font-semibold">{label}</p>
                  <p className="mt-2 text-sm leading-7 text-stone-600">
                    {key === "ferocity" && "决定正面压制和爆发输出。"}
                    {key === "guard" && "决定防守稳定性与抗崩盘能力。"}
                    {key === "insight" && "决定读弱点、拆前提与反制效率。"}
                    {key === "tempo" && "决定先手、连段和舞台节奏。"}
                    {key === "resolve" && "决定长局纪律与规则续航。"}
                  </p>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="entry-fade paper-panel rounded-[1.75rem] p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-stone-500">
                经典演示
              </p>
              <h2 className="section-title mt-2">保留样本用于讲解玩法</h2>
            </div>
            <Link
              className="soft-button rounded-full border border-[var(--line)] bg-white/70 px-5 py-3 text-sm"
              href="/arena"
            >
              直接开始排位
            </Link>
          </div>
          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            {classics.map((battle, index) => {
              const copy = classicCaseCopy[index] ?? classicCaseCopy[0];

              return (
                <article
                  key={battle.id}
                  className="rounded-[1.35rem] border border-[var(--line)] bg-white/75 px-4 py-4"
                >
                  <p className="text-xs uppercase tracking-[0.18em] text-stone-500">
                    {copy.title}
                  </p>
                  <p className="mt-2 text-lg font-semibold">{copy.note}</p>
                  <p className="mt-2 text-sm leading-7 text-stone-600">
                    这些是首页保留的本地 demo 战报，用来说明玩法与镜头语言，不参与真实冲榜。
                  </p>
                  <div className="mt-4 grid gap-2 text-sm text-stone-700">
                    <p>
                      终局比分 {battle.finalScore.player} : {battle.finalScore.defender}
                    </p>
                    <p>下一位焦点：{battle.challengerPreview.displayName}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
