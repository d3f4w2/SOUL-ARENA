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
    <main className="scanlines relative min-h-screen overflow-hidden px-4 py-6 sm:px-6 lg:px-10" style={{ color: "var(--text)" }}>
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <section className="entry-fade mk-panel px-6 py-8 sm:px-10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-col gap-3">
              <div className="mk-badge">竞技排行榜</div>
              <h1 className="mk-title mk-title-anim">竞技排行榜</h1>
              <p style={{ fontFamily: "'Courier New', monospace", fontSize: "0.88rem", color: "var(--text-dim)", lineHeight: "1.85", maxWidth: "52ch" }}>
                用积分、连胜和最近状态来定义当前竞技场的统治力。每一场真实 battle 都会直接改变这里的顺位。
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link className="mk-button px-5 py-3" href="/arena">进入竞技场</Link>
              <Link className="mk-button-ghost px-5 py-3" href="/arena/history">查看战绩中心</Link>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <article className="entry-fade mk-panel p-6">
            <div className="mk-label-red mb-2">当前焦点</div>
            <h2 className="mk-section mb-4">
              {featured ? `${featured.displayName} 正在领跑` : "排行榜等待首战"}
            </h2>
            <div style={{ fontFamily: "'Courier New', monospace", fontSize: "0.82rem", color: "var(--text-dim)", lineHeight: "2.1" }}>
              {featured ? (
                <>
                  <p>当前排名：<span style={{ color: "var(--gold)" }}>第 {featured.rank} 名</span></p>
                  <p>当前积分：<span style={{ color: "var(--gold-bright)" }}>{featured.rating}</span></p>
                  <p>当前连胜：<span style={{ color: "var(--gold)" }}>{featured.currentStreak}</span></p>
                  <p>总战绩：<span style={{ color: "var(--red)" }}>{featured.wins} 胜</span> {featured.losses} 负，胜率 {featured.winRate}%</p>
                </>
              ) : (
                <p>还没有真实排位战。先去 `/arena` 发起第一场对决，榜单就会开始滚动。</p>
              )}
            </div>
          </article>

          <article className="entry-fade mk-panel p-6">
            <div className="mk-label-red mb-2">排名规则</div>
            <div className="flex flex-col gap-3 mt-4">
              <div className="mk-panel-inset p-4">
                <p style={{ fontFamily: "'Courier New', monospace", fontSize: "0.82rem", color: "var(--text-dim)", lineHeight: "1.75" }}>
                  积分优先，积分相同时按当前连胜排序。
                </p>
              </div>
              <div className="mk-panel-inset p-4">
                <p style={{ fontFamily: "'Courier New', monospace", fontSize: "0.82rem", color: "var(--text-dim)", lineHeight: "1.75" }}>
                  再看胜率与最近状态，避免纯场次数量刷榜。
                </p>
              </div>
              <div className="mk-panel-inset p-4">
                <p style={{ fontFamily: "'Courier New', monospace", fontSize: "0.82rem", color: "var(--text-dim)", lineHeight: "1.75" }}>
                  击败更高分对手会获得更高收益，失利也会承担更大的掉分风险。
                </p>
              </div>
            </div>
          </article>
        </section>

        <section className="entry-fade mk-panel p-6">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div>
              <div className="mk-label-red mb-2">排行榜</div>
              <h2 className="mk-section">
                {leaderboard.length ? `共 ${leaderboard.length} 位上榜选手` : "尚未形成榜单"}
              </h2>
            </div>
          </div>

          {leaderboard.length ? (
            <div className="flex flex-col gap-4">
              {leaderboard.map((entry) => (
                <article key={entry.competitorId} className="mk-highlight">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <span className="mk-rank-number" style={{ fontSize: "2rem", lineHeight: 1, paddingTop: "4px" }}>
                        #{entry.rank}
                      </span>
                      <div>
                        <p style={{ fontFamily: "Impact, Arial Black, sans-serif", fontSize: "1.1rem", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-bright)", marginBottom: "4px" }}>
                          {entry.displayName}
                        </p>
                        <p style={{ fontFamily: "'Courier New', monospace", fontSize: "0.8rem", color: "var(--text-dim)", lineHeight: "1.8" }}>
                          积分 <span style={{ color: "var(--gold)" }}>{entry.rating}</span> · {entry.wins} 胜 {entry.losses} 负 · 胜率 {entry.winRate}%
                        </p>
                        <p style={{ fontFamily: "'Courier New', monospace", fontSize: "0.8rem", color: "var(--text-dim)", lineHeight: "1.8" }}>
                          当前连胜 <span style={{ color: "var(--gold)" }}>{entry.currentStreak}</span> · 最高连胜 {entry.bestStreak} · {resultLabel(entry.lastResult)}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-3">
                      <span className="mk-badge-gold">近况 {entry.recentForm.join(" ") || "暂无"}</span>
                      {entry.suggestion ? (
                        <div className="mk-panel-inset p-3" style={{ minWidth: "200px" }}>
                          <p style={{ fontFamily: "Impact, Arial Black, sans-serif", fontSize: "0.7rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--red)", marginBottom: "5px" }}>
                            建议挑战
                          </p>
                          <p style={{ fontFamily: "'Courier New', monospace", fontSize: "0.78rem", color: "var(--text-dim)", lineHeight: "1.7" }}>
                            {entry.suggestion.displayName}
                          </p>
                          <p style={{ fontFamily: "'Courier New', monospace", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                            胜出 <span style={{ color: "var(--gold)" }}>+{entry.suggestion.projectedWinDelta}</span>，
                            失利 <span style={{ color: "var(--red)" }}>{entry.suggestion.projectedLossDelta}</span>
                          </p>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="mk-status">
              还没有真实排位战数据，排行榜会在第一场真实对局保存后自动出现。
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
