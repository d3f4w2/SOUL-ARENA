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

function CopyLinkButton({ battleId }: { battleId: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const url = `${window.location.origin}/arena/${battleId}`;
    void navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <button
      className="mk-button-ghost px-4 py-2"
      onClick={handleCopy}
      style={{ fontSize: "0.75rem" }}
      type="button"
    >
      {copied ? "已复制 ✓" : "复制链接"}
    </button>
  );
}

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
    <section className="entry-fade mk-panel p-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 mb-6">
        <article className="mk-panel-inset p-4">
          <div className="mk-label mb-3">排位总场次</div>
          <p style={{ fontFamily: "Impact, Arial Black, sans-serif", fontSize: "2.5rem", color: "var(--red)", textShadow: "0 0 12px rgba(200,0,0,0.5)", lineHeight: 1, marginBottom: "8px" }}>
            {competitiveBattles.length}
          </p>
          <p style={{ fontFamily: "'Courier New', monospace", fontSize: "0.75rem", color: "var(--text-muted)" }}>
            {playerWins} 胜 {playerLosses} 负
          </p>
        </article>

        <article className="mk-panel-inset p-4">
          <div className="mk-label mb-3">当前榜首</div>
          <p style={{ fontFamily: "Impact, Arial Black, sans-serif", fontSize: "1.1rem", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--gold-bright)", lineHeight: 1.2, marginBottom: "8px" }}>
            {featured ? featured.displayName : "尚未开赛"}
          </p>
          <p style={{ fontFamily: "'Courier New', monospace", fontSize: "0.75rem", color: "var(--text-muted)" }}>
            {featured
              ? `积分 ${featured.rating} · 连胜 ${featured.currentStreak}`
              : "等待第一场真实对局"}
          </p>
        </article>

        <article className="mk-panel-inset p-4">
          <div className="mk-label mb-3">下克上</div>
          <p style={{ fontFamily: "Impact, Arial Black, sans-serif", fontSize: "2.5rem", color: "var(--gold)", textShadow: "0 0 12px rgba(212,160,0,0.4)", lineHeight: 1, marginBottom: "8px" }}>
            {upsetWins}
          </p>
          <p style={{ fontFamily: "'Courier New', monospace", fontSize: "0.75rem", color: "var(--text-muted)" }}>
            越级冲榜成功局数
          </p>
        </article>

        <article className="mk-panel-inset p-4">
          <div className="mk-label mb-3">列表筛选</div>
          <div className="flex flex-wrap gap-2 mt-2">
            {filters.map((item) => (
              <button
                key={item.id}
                className={item.id === filter ? "mk-button px-3 py-2" : "mk-button-ghost px-3 py-2"}
                onClick={() => setFilter(item.id)}
                style={{ fontSize: "0.75rem", letterSpacing: "0.15em" }}
                type="button"
              >
                {item.label}
              </button>
            ))}
          </div>
        </article>
      </div>

      <hr className="mk-divider mb-6" />

      {filteredBattles.length ? (
        <div className="flex flex-col gap-4">
          {filteredBattles.map((battle) => (
            <article key={battle.id} className="mk-highlight">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="mk-badge">
                      {battle.generationMode === "mock" ? "经典演示" : "真实排位"}
                    </div>
                    <p style={{ fontFamily: "'Courier New', monospace", fontSize: "0.68rem", color: "var(--text-muted)" }}>
                      {new Date(battle.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <h3 style={{ fontFamily: "Impact, Arial Black, sans-serif", fontSize: "1rem", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-bright)" }}>
                    {battle.roomTitle}
                  </h3>
                  <p style={{ fontFamily: "'Courier New', monospace", fontSize: "0.78rem", color: "var(--text-dim)" }}>
                    {battle.playerDisplayName} <span style={{ color: "var(--red)" }}>vs</span> {battle.defenderDisplayName}
                  </p>
                  <p style={{ fontFamily: "'Courier New', monospace", fontSize: "0.78rem", color: "var(--gold)" }}>
                    胜者：{winnerLabel(battle.winnerId, battle.playerDisplayName, battle.defenderDisplayName)}
                  </p>
                  {battle.topicTitle ? (
                    <p style={{ fontFamily: "'Courier New', monospace", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                      辩题：{battle.topicTitle} · {battle.topicSource === "zhihu_dynamic" ? "知乎动态题" : "预设题"}
                    </p>
                  ) : null}
                  {battle.participantProviders?.length ? (
                    <p style={{ fontFamily: "'Courier New', monospace", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                      来源：{battle.participantProviders.join(" 对 ")}
                    </p>
                  ) : null}
                  {battle.competition?.player ? (
                    <p style={{ fontFamily: "'Courier New', monospace", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                      {battle.competition.stakesLabel} · 挑战者积分{" "}
                      <span style={{ color: battle.competition.player.scoreDelta > 0 ? "var(--gold)" : "var(--red)" }}>
                        {battle.competition.player.scoreDelta > 0 ? "+" : ""}
                        {battle.competition.player.scoreDelta}
                      </span>{" "}
                      · 排名 {battle.competition.player.rankBefore ?? "-"} → {battle.competition.player.rankAfter ?? "-"}
                    </p>
                  ) : null}
                  {battle.originBattleId ? (
                    <p style={{ fontFamily: "'Courier New', monospace", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                      重开来源：{battle.originBattleId}
                    </p>
                  ) : null}
                </div>

                <div className="flex flex-wrap items-start gap-3">
                  {battle.competition?.player ? (
                    <span className={battle.competition.player.result === "win" ? "mk-badge-gold" : "mk-badge"}>
                      {battle.competition.player.result === "win" ? "胜利" : "失败"}
                    </span>
                  ) : null}
                  <Link className="mk-button-ghost px-4 py-2" href={`/arena/${battle.id}`}>
                    打开回放
                  </Link>
                  {battle.setupId ? (
                    <Link className="mk-button-ghost px-4 py-2" href={`/arena?setupId=${battle.setupId}`}>
                      继续重开
                    </Link>
                  ) : null}
                  <CopyLinkButton battleId={battle.id} />
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="mk-status">当前筛选条件下还没有匹配战报。</div>
      )}
    </section>
  );
}
