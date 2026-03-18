"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import type {
  ArenaBuildPreview,
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

const battleStorageKey = (battleId: string) => `soul-arena:battle:${battleId}`;

const participantRefs = [
  { provider: "secondme", slot: "alpha" },
  { provider: "secondme", slot: "beta" },
] as const;

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
        : `Request failed: ${response.status}`,
    );
  }

  return payload;
}

const participantTitle = (slot: "alpha" | "beta") =>
  slot === "alpha" ? "Alpha participant" : "Beta participant";

const participantSubtitle = (participant: ArenaParticipantSource | null) => {
  if (!participant) {
    return "Not connected";
  }

  return participant.displayName ?? "Connected without profile name";
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

export function ArenaBuilder() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [meta, setMeta] = useState<ArenaMetaResponse | null>(null);
  const [participants, setParticipants] = useState<ArenaParticipantSource[]>([]);
  const [topicId, setTopicId] = useState("");
  const [preview, setPreview] = useState<ArenaBuildPreview | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const alpha = useMemo(
    () => participants.find((participant) => participant.slot === "alpha") ?? null,
    [participants],
  );
  const beta = useMemo(
    () => participants.find((participant) => participant.slot === "beta") ?? null,
    [participants],
  );
  const selectedTopic = useMemo(
    () => meta?.topics.find((topic) => topic.id === topicId) ?? null,
    [meta?.topics, topicId],
  );
  const readyToBuild = Boolean(topicId && alpha?.connected && beta?.connected);

  const fetchArenaData = async () => {
    const [nextMeta, nextParticipants] = await Promise.all([
      readJson<ArenaMetaResponse>("/api/arena/topics"),
      readJson<ParticipantsResponse>("/api/participants"),
    ]);

    return {
      meta: nextMeta,
      participants: nextParticipants.participants,
    };
  };

  const applyArenaData = (nextMeta: ArenaMetaResponse, nextParticipants: ArenaParticipantSource[]) => {
    setMeta(nextMeta);
    setParticipants(nextParticipants);
    setTopicId((current) => current || nextMeta.topics[0]?.id || "");
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
          applyArenaData(data.meta, data.participants);
        });
      } catch (error) {
        if (!active) {
          return;
        }

        setStatus(
          error instanceof Error ? error.message : "Failed to load arena data.",
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
    setStatus(`Disconnecting ${participantTitle(slot).toLowerCase()}...`);
    await readJson(`/api/participants?slot=${slot}`, {
      method: "DELETE",
    });
    setPreview(null);
    const data = await fetchArenaData();
    applyArenaData(data.meta, data.participants);
    setStatus(`${participantTitle(slot)} disconnected.`);
  };

  const previewBuild = async () => {
    if (!readyToBuild) {
      setStatus("Connect both SecondMe participants before building a real match.");
      return;
    }

    setStatus("Building real persona preview...");
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
      setStatus("Preview updated from real participant data.");
    });
  };

  const startBattle = async () => {
    if (!readyToBuild) {
      setStatus("Connect both SecondMe participants before starting the match.");
      return;
    }

    setStatus("Generating orchestrated battle package...");
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
    setStatus("Battle package generated.");
    router.push(`/arena/${battle.id}`);
  };

  return (
    <main className="paper-grid grain relative min-h-screen overflow-hidden px-4 py-6 text-foreground sm:px-6 lg:px-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <section className="entry-fade paper-panel rounded-[2rem] px-6 py-8 sm:px-10">
          <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-4">
              <span className="accent-chip inline-flex rounded-full px-3 py-1 text-xs uppercase tracking-[0.28em]">
                Real Integration Console
              </span>
              <h1 className="display-title">SecondMe Arena</h1>
              <p className="max-w-3xl text-lg leading-8 text-stone-700">
                This stage now uses two real SecondMe participants. We derive fighter
                profiles from user info, shades, and soft memory before generating the
                battle package.
              </p>
            </div>
            <div className="paper-panel-strong rounded-[1.6rem] p-6 text-sm leading-7">
              <p className="text-xs uppercase tracking-[0.22em] text-stone-500">
                Match Status
              </p>
              <div className="mt-4 space-y-3">
                <p>Alpha: {alpha?.connected ? participantSubtitle(alpha) : "Not connected"}</p>
                <p>Beta: {beta?.connected ? participantSubtitle(beta) : "Not connected"}</p>
                <p>Topic: {selectedTopic?.title ?? "Loading..."}</p>
                <p>
                  Mode: {preview?.sourceMeta.aiAssistEnabled ? "Orchestrated SecondMe" : "Deterministic fallback"}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          {[alpha, beta].map((participant, index) => {
            const slot = index === 0 ? "alpha" : "beta";
            return (
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
                        Connect SecondMe
                      </button>
                    ) : (
                      <button
                        className="soft-button rounded-full border border-[var(--line)] bg-white/70 px-4 py-3 text-sm"
                        onClick={() => void disconnectParticipant(slot)}
                        type="button"
                      >
                        Disconnect
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-5 grid gap-3 text-sm leading-7 text-stone-700">
                  <div className="rounded-[1.2rem] border border-[var(--line)] bg-white/75 p-4">
                    <p className="font-semibold">Identity</p>
                    <p className="mt-2">Route: {userField(participant, "route") ?? "None"}</p>
                    <p className="mt-1">Bio: {userField(participant, "bio") ?? "None"}</p>
                  </div>
                  <div className="rounded-[1.2rem] border border-[var(--line)] bg-white/75 p-4">
                    <p className="font-semibold">Top Shades</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {topShades(participant).length ? (
                        topShades(participant).map((shade) => (
                          <span key={shade} className="accent-chip rounded-full px-3 py-1 text-xs">
                            {shade}
                          </span>
                        ))
                      ) : (
                        <p className="text-stone-500">No shades available yet.</p>
                      )}
                    </div>
                  </div>
                  <div className="rounded-[1.2rem] border border-[var(--line)] bg-white/75 p-4">
                    <p className="font-semibold">Soft Memory</p>
                    <div className="mt-3 space-y-2">
                      {memoryAnchors(participant).length ? (
                        memoryAnchors(participant).map((memory) => (
                          <p key={memory} className="text-stone-600">
                            {memory}
                          </p>
                        ))
                      ) : (
                        <p className="text-stone-500">No soft memory anchors available yet.</p>
                      )}
                    </div>
                  </div>
                  {participant?.issues.length ? (
                    <div className="rounded-[1.2rem] border border-amber-300 bg-amber-50 p-4 text-amber-900">
                      {participant.issues.map((issue) => (
                        <p key={issue}>{issue}</p>
                      ))}
                    </div>
                  ) : null}
                </div>
              </article>
            );
          })}
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <article className="entry-fade paper-panel rounded-[1.75rem] p-6">
            <p className="text-xs uppercase tracking-[0.22em] text-stone-500">
              Debate Topic
            </p>
            <h2 className="section-title mt-2">Choose the match topic</h2>
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
                  Orchestration
                </p>
                <h2 className="section-title mt-2">Build and launch</h2>
              </div>
              <div className="flex gap-3">
                <button
                  className="soft-button rounded-full border border-[var(--line)] bg-white/70 px-4 py-3 text-sm"
                  onClick={() => void previewBuild()}
                  type="button"
                >
                  Preview persona build
                </button>
                <Link
                  className="soft-button rounded-full border border-[var(--line)] bg-white/70 px-4 py-3 text-sm"
                  href="/arena/history"
                >
                  View battle history
                </Link>
                <button
                  className="soft-button rounded-full bg-[var(--accent)] px-4 py-3 text-sm text-white"
                  onClick={() => void startBattle()}
                  type="button"
                >
                  Start real battle
                </button>
              </div>
            </div>

            <div className="mt-4 rounded-[1.35rem] border border-[var(--line)] bg-white/75 p-4 text-sm leading-7 text-stone-600">
              {status ?? "Connect both participants, then preview or start the battle."}
            </div>

            {preview ? (
              <div className="mt-5 grid gap-4">
                <div className="rounded-[1.35rem] border border-[var(--line)] bg-white/75 p-4">
                  <p className="text-sm font-semibold">
                    {preview.player.displayName} vs {preview.defender.displayName}
                  </p>
                  <p className="mt-2 text-sm text-stone-600">
                    {preview.matchUpCallout}
                  </p>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <div className="rounded-2xl border border-[var(--line)] bg-stone-50 px-4 py-3">
                      <p className="text-sm font-semibold">Predicted edges</p>
                      <div className="mt-2 space-y-2 text-xs text-stone-600">
                        {preview.predictedEdges.map((edge) => (
                          <p key={edge}>{edge}</p>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-[var(--line)] bg-stone-50 px-4 py-3">
                      <p className="text-sm font-semibold">Build notes</p>
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
                          {fighter.displayName} | {fighter.powerLabel}
                        </p>
                        <p className="mt-1 text-sm text-stone-600">{fighter.declaration}</p>
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs">
                        <span className="accent-chip rounded-full px-3 py-1">
                          Source {fighter.source.provider}
                        </span>
                        <span className="accent-chip rounded-full px-3 py-1">
                          Slot {fighter.source.slot}
                        </span>
                      </div>
                    </div>
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <div className="rounded-2xl border border-[var(--line)] bg-stone-50 px-4 py-3">
                        <p className="text-xs uppercase tracking-[0.18em] text-stone-500">
                          Identity summary
                        </p>
                        <div className="mt-2 space-y-2 text-sm text-stone-600">
                          {fighter.identitySummary.map((item) => (
                            <p key={item}>{item}</p>
                          ))}
                        </div>
                      </div>
                      <div className="rounded-2xl border border-[var(--line)] bg-stone-50 px-4 py-3">
                        <p className="text-xs uppercase tracking-[0.18em] text-stone-500">
                          Memory anchors
                        </p>
                        <div className="mt-2 space-y-2 text-sm text-stone-600">
                          {fighter.memoryAnchors.length ? (
                            fighter.memoryAnchors.map((item) => <p key={item}>{item}</p>)
                          ) : (
                            <p>No memory anchors</p>
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
            External Signals
          </p>
          <h2 className="section-title mt-2">Zhihu inspiration feed</h2>
          <div className="mt-5 flex flex-wrap gap-3">
            {meta?.signals?.length ? (
              meta.signals.map((signal) => (
                <span key={signal} className="accent-chip rounded-full px-3 py-2 text-sm">
                  {signal}
                </span>
              ))
            ) : (
              <p className="text-sm text-stone-500">
                No external signals available right now.
              </p>
            )}
          </div>
        </section>
      </div>
      {isPending ? null : null}
    </main>
  );
}
