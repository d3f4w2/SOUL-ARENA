import Link from "next/link";

import { ArenaHistoryBoard } from "@/components/arena-history-board";
import {
  getArenaFeaturedCompetitor,
  listArenaBattleSummariesWithCompetition,
} from "@/lib/arena-competition";

export const dynamic = "force-dynamic";

export default function ArenaHistoryPage() {
  const battles = listArenaBattleSummariesWithCompetition(100);
  const featured = getArenaFeaturedCompetitor();

  return (
    <main className="paper-grid grain relative min-h-screen overflow-hidden px-4 py-6 text-foreground sm:px-6 lg:px-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <section className="entry-fade paper-panel rounded-[2rem] px-6 py-8 sm:px-10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-3">
              <span className="accent-chip inline-flex rounded-full px-3 py-1 text-xs uppercase tracking-[0.28em]">
                Battle Archive
              </span>
              <h1 className="display-title">战绩中心</h1>
              <p className="max-w-3xl text-lg leading-8 text-stone-700">
                这里不只保存 battle package，还会回看每一场排位战如何改变积分、排名和连胜。
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                className="soft-button rounded-full bg-[var(--accent)] px-5 py-3 text-sm text-white"
                href="/arena"
              >
                返回竞技场
              </Link>
              <Link
                className="soft-button rounded-full border border-[var(--line)] bg-white/70 px-5 py-3 text-sm"
                href="/arena/leaderboard"
              >
                查看排行榜
              </Link>
            </div>
          </div>
        </section>

        <ArenaHistoryBoard battles={battles} featured={featured} />
      </div>
    </main>
  );
}
