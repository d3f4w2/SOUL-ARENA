import Link from "next/link";

import { listBattleSummaries } from "@/lib/arena-store";

export const dynamic = "force-dynamic";

export default function ArenaHistoryPage() {
  const battles = listBattleSummaries(100);

  return (
    <main className="paper-grid grain relative min-h-screen overflow-hidden px-4 py-6 text-foreground sm:px-6 lg:px-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <section className="entry-fade paper-panel rounded-[2rem] px-6 py-8 sm:px-10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-3">
              <span className="accent-chip inline-flex rounded-full px-3 py-1 text-xs uppercase tracking-[0.28em]">
                Battle Archive
              </span>
              <h1 className="display-title">History</h1>
              <p className="max-w-3xl text-lg leading-8 text-stone-700">
                Persisted battle packages live here. This page is reload-safe and
                survives server restarts.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                className="soft-button rounded-full bg-[var(--accent)] px-5 py-3 text-sm text-white"
                href="/arena"
              >
                Back to Arena
              </Link>
              <Link
                className="soft-button rounded-full border border-[var(--line)] bg-white/70 px-5 py-3 text-sm"
                href="/"
              >
                Home
              </Link>
            </div>
          </div>
        </section>

        <section className="entry-fade paper-panel rounded-[1.75rem] p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-stone-500">
                Stored Battles
              </p>
              <h2 className="section-title mt-2">
                {battles.length ? `${battles.length} saved matches` : "No saved matches yet"}
              </h2>
            </div>
          </div>

          {battles.length ? (
            <div className="mt-6 grid gap-4">
              {battles.map((battle) => (
                <article
                  className="rounded-[1.35rem] border border-[var(--line)] bg-white/75 px-5 py-5"
                  key={battle.id}
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-2">
                      <p className="text-xs uppercase tracking-[0.18em] text-stone-500">
                        {battle.generationMode} · {new Date(battle.createdAt).toLocaleString()}
                      </p>
                      <h3 className="text-lg font-semibold">{battle.roomTitle}</h3>
                      <p className="text-sm text-stone-600">
                        {battle.playerDisplayName} vs {battle.defenderDisplayName}
                      </p>
                      <p className="text-sm text-stone-600">Topic: {battle.topicId}</p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <span className="accent-chip rounded-full px-3 py-1 text-xs">
                        Winner {battle.winnerId}
                      </span>
                      <Link
                        className="soft-button rounded-full border border-[var(--line)] bg-white/70 px-4 py-2 text-sm"
                        href={`/arena/${battle.id}`}
                      >
                        Open Replay
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-6 rounded-[1.35rem] border border-[var(--line)] bg-white/75 p-6 text-sm leading-7 text-stone-600">
              No persisted battle packages yet. Start a real battle from `/arena`
              and it will appear here.
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
