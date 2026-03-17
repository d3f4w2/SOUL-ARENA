import Link from "next/link";

import { getClassicBattlePackages } from "@/lib/arena";
import { soulLabels } from "@/lib/arena-presets";

const steps = [
  {
    body: "先挑一个辩题，再把观点、规则和禁忌装进你的构筑槽位。",
    title: "配魂与配装",
  },
  {
    body: "系统把输入量化成 Soul 天赋、装备卡和战术提示。",
    title: "生成战斗构筑",
  },
  {
    body: "进入可解释的实时战斗，再把战斗舞台录成 WebM。",
    title: "上台验证构筑",
  },
];

export function SoulArenaApp() {
  const classics = getClassicBattlePackages();

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
                  把 Soul、观点、规则和禁忌，全部转成可玩的构筑。
                  这不是一场普通的 AI battle，而是一场比拼谁更会配魂、配装、配策略的擂台战。
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link
                  className="soft-button rounded-full bg-[var(--accent)] px-5 py-3 text-sm text-white"
                  href="/arena"
                >
                  开始一场擂台战
                </Link>
                <Link
                  className="soft-button rounded-full border border-[var(--line)] bg-white/70 px-5 py-3 text-sm"
                  href="/arena"
                >
                  打开构筑工作台
                </Link>
              </div>
            </div>

            <div className="paper-panel-strong rounded-[1.8rem] p-6">
              <p className="text-xs uppercase tracking-[0.24em] text-stone-500">
                为什么它成立
              </p>
              <div className="mt-5 space-y-4 text-sm leading-7 text-stone-700">
                <p>它把 Soul 到装备、再到战斗结果的整条映射链公开了。</p>
                <p>它提供的是可观看的擂台形式，而不只是一个分数结果页。</p>
                <p>它天然支持守擂者和挑战者接力的连续内容循环。</p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <article className="entry-fade paper-panel rounded-[1.75rem] p-6">
            <p className="text-xs uppercase tracking-[0.24em] text-stone-500">
              核心循环
            </p>
            <h2 className="section-title mt-2">先构筑，再开战</h2>
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
            <p className="text-xs uppercase tracking-[0.24em] text-stone-500">
              Soul 天赋
            </p>
            <h2 className="section-title mt-2">五项天赋分别控制什么</h2>
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
                    {key === "ferocity" && "决定正面压制力和伤害输出。"}
                    {key === "guard" && "决定防守稳定性和抗崩盘能力。"}
                    {key === "insight" && "决定反证、弱点阅读和穿透能力。"}
                    {key === "tempo" && "决定先手、连段和高光节奏。"}
                    {key === "resolve" && "决定长局纪律和规则卡续航。"}
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
                经典战役
              </p>
              <h2 className="section-title mt-2">高光战报预告板</h2>
            </div>
            <Link
              className="soft-button rounded-full border border-[var(--line)] bg-white/70 px-5 py-3 text-sm"
              href="/arena"
            >
              进入构筑工作台
            </Link>
          </div>
          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            {classics.map((battle) => (
              <article
                key={battle.id}
                className="rounded-[1.35rem] border border-[var(--line)] bg-white/75 px-4 py-4"
              >
                <p className="text-xs uppercase tracking-[0.18em] text-stone-500">
                  {battle.classicLabel}
                </p>
                <p className="mt-2 text-lg font-semibold">{battle.roomTitle}</p>
                <p className="mt-2 text-sm leading-7 text-stone-600">
                  {battle.highlights[0]?.label}: {battle.highlights[0]?.title}
                </p>
                <div className="mt-4 grid gap-2 text-sm text-stone-700">
                  <p>
                    终局比分 {battle.finalScore.player} : {battle.finalScore.defender}
                  </p>
                  <p>下一位挑战者 {battle.challengerPreview.displayName}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
