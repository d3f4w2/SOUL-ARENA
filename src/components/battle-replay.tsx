"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { soulLabels } from "@/lib/arena-presets";
import type { BattleEvent, BattlePackage, SoulStats } from "@/lib/arena-types";

const battleStorageKey = (battleId: string) => `soul-arena:battle:${battleId}`;

type ReplayState = {
  currentEvent: BattleEvent | null;
  defenderHealth: number;
  defenderScore: number;
  playerHealth: number;
  playerScore: number;
  round: number;
};

const formatSoul = (soul: SoulStats) =>
  (Object.keys(soulLabels) as Array<keyof SoulStats>).map((key) => ({
    key,
    label: soulLabels[key],
    value: soul[key],
  }));

const deriveReplayState = (
  battle: BattlePackage,
  playhead: number,
): ReplayState => {
  let playerHealth = 100;
  let defenderHealth = 100;
  let playerScore = 0;
  let defenderScore = 0;
  let round = 0;

  for (const event of battle.events.slice(0, playhead + 1)) {
    round = Math.max(round, event.round);

    if (typeof event.effect?.scoreDelta === "number" && event.actorId) {
      if (event.actorId === battle.player.id) {
        playerScore += event.effect.scoreDelta;
      }

      if (event.actorId === battle.defender.id) {
        defenderScore += event.effect.scoreDelta;
      }
    }

    if (typeof event.effect?.healthDelta === "number" && event.targetId) {
      if (event.targetId === battle.player.id) {
        playerHealth = Math.max(0, playerHealth + event.effect.healthDelta);
      }

      if (event.targetId === battle.defender.id) {
        defenderHealth = Math.max(0, defenderHealth + event.effect.healthDelta);
      }
    }
  }

  return {
    currentEvent: battle.events[playhead] ?? null,
    defenderHealth,
    defenderScore,
    playerHealth,
    playerScore,
    round,
  };
};

function drawStage(
  canvas: HTMLCanvasElement,
  battle: BattlePackage,
  replayState: ReplayState,
) {
  const context = canvas.getContext("2d");

  if (!context) {
    return;
  }

  const { width, height } = canvas;
  const { currentEvent } = replayState;
  const gradient = context.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "#101b2d");
  gradient.addColorStop(0.55, "#1d304d");
  gradient.addColorStop(1, "#391a14");
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);

  context.fillStyle = "rgba(255,255,255,0.08)";
  context.fillRect(60, 56, width - 120, height - 112);

  context.fillStyle = "#f8f2e8";
  context.font = "700 54px serif";
  context.fillText("SOUL ARENA", 70, 92);

  context.font = "500 22px sans-serif";
  context.fillStyle = "rgba(248, 242, 232, 0.9)";
  context.fillText(battle.topic.title, 72, 130);
  context.fillText(`第 ${Math.max(1, replayState.round)} 回合`, width - 250, 92);

  const drawFighter = (
    x: number,
    fighter: BattlePackage["player"],
    health: number,
    score: number,
    align: "left" | "right",
  ) => {
    const panelWidth = 360;
    const panelHeight = 420;
    const isRight = align === "right";
    context.fillStyle = "rgba(255,255,255,0.12)";
    context.fillRect(x, 170, panelWidth, panelHeight);
    context.strokeStyle = isRight ? "#f6a673" : "#7bd1ff";
    context.lineWidth = 3;
    context.strokeRect(x, 170, panelWidth, panelHeight);

    context.fillStyle = "#f8f2e8";
    context.font = "700 30px serif";
    context.fillText(fighter.displayName, x + 24, 214);
    context.font = "500 18px sans-serif";
    context.fillText(fighter.powerLabel, x + 24, 244);

    context.fillStyle = "#2b1f17";
    context.fillRect(x + 24, 270, panelWidth - 48, 20);
    context.fillStyle = isRight ? "#f6a673" : "#7bd1ff";
    context.fillRect(x + 24, 270, ((panelWidth - 48) * health) / 100, 20);
    context.fillStyle = "#f8f2e8";
    context.fillText(`生命 ${health}`, x + 24, 324);
    context.fillText(`得分 ${score}`, x + 220, 324);

    context.font = "500 16px sans-serif";
    formatSoul(fighter.soul).forEach((stat, index) => {
      const y = 360 + index * 42;
      context.fillStyle = "#f8f2e8";
      context.fillText(stat.label, x + 24, y);
      context.fillStyle = "rgba(255,255,255,0.12)";
      context.fillRect(x + 106, y - 16, 180, 14);
      context.fillStyle = isRight ? "#f6a673" : "#7bd1ff";
      context.fillRect(x + 106, y - 16, (180 * stat.value) / 100, 14);
      context.fillStyle = "#f8f2e8";
      context.fillText(String(stat.value), x + 300, y);
    });
  };

  drawFighter(86, battle.player, replayState.playerHealth, replayState.playerScore, "left");
  drawFighter(
    width - 446,
    battle.defender,
    replayState.defenderHealth,
    replayState.defenderScore,
    "right",
  );

  context.fillStyle = "rgba(255,255,255,0.08)";
  context.beginPath();
  context.ellipse(width / 2, height - 150, 270, 64, 0, 0, Math.PI * 2);
  context.fill();

  context.fillStyle =
    currentEvent?.type === "weakness_hit" ? "#ffdd66" : "rgba(248,242,232,0.94)";
  context.font = "700 42px serif";
  context.textAlign = "center";
  context.fillText(currentEvent?.title ?? "战斗待命", width / 2, 224);

  context.font = "500 22px sans-serif";
  context.fillStyle = "#f8f2e8";
  context.fillText(
    currentEvent?.description ?? "等待战斗数据载入。",
    width / 2,
    272,
    width - 200,
  );

  if (currentEvent?.type === "weakness_hit") {
    context.strokeStyle = "#ffdd66";
    context.lineWidth = 8;
    context.beginPath();
    context.moveTo(width / 2 - 90, 360);
    context.lineTo(width / 2 + 90, 300);
    context.stroke();
  }

  context.textAlign = "left";
}

async function fetchBattlePackage(battleId: string) {
  const response = await fetch(`/api/arena/battles/${battleId}`, { cache: "no-store" });

  if (response.ok) {
    return (await response.json()) as BattlePackage;
  }

  const local = localStorage.getItem(battleStorageKey(battleId));

  if (!local) {
    throw new Error("未找到战斗包。");
  }

  return JSON.parse(local) as BattlePackage;
}

export function BattleReplay({ battleId }: { battleId: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [battle, setBattle] = useState<BattlePackage | null>(null);
  const [playhead, setPlayhead] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const payload = await fetchBattlePackage(battleId);
        setBattle(payload);
        setPlayhead(0);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "战斗数据载入失败。");
      }
    })();
  }, [battleId]);

  const replayState = useMemo(
    () => (battle ? deriveReplayState(battle, playhead) : null),
    [battle, playhead],
  );

  const canRecord =
    typeof window !== "undefined" &&
    "MediaRecorder" in window &&
    typeof HTMLCanvasElement !== "undefined";
  const reachedEnd = Boolean(battle && playhead >= battle.events.length - 1);
  const playbackActive = isPlaying && !reachedEnd;

  useEffect(() => {
    if (!battle || !replayState || !canvasRef.current) {
      return;
    }

    drawStage(canvasRef.current, battle, replayState);
  }, [battle, replayState]);

  useEffect(() => {
    if (!battle || !playbackActive) {
      return;
    }

    const currentEvent = battle.events[playhead];
    const nextEvent = battle.events[playhead + 1];
    const delay = Math.max(700, (nextEvent?.atMs ?? currentEvent.atMs + 1000) - currentEvent.atMs);
    const timer = window.setTimeout(() => {
      setPlayhead((current) => Math.min(current + 1, battle.events.length - 1));
    }, delay);

    return () => window.clearTimeout(timer);
  }, [battle, playbackActive, playhead]);

  useEffect(() => {
    if (!reachedEnd || !recording) {
      return;
    }

    recorderRef.current?.stop();
  }, [reachedEnd, recording]);

  useEffect(() => {
    return () => {
      if (downloadUrl) {
        URL.revokeObjectURL(downloadUrl);
      }
    };
  }, [downloadUrl]);

  const startRecording = () => {
    if (!canvasRef.current || !canRecord) {
      return;
    }

    const canvas = canvasRef.current;
    const stream = canvas.captureStream(30);
    const mimeTypes = [
      "video/webm;codecs=vp9",
      "video/webm;codecs=vp8",
      "video/webm",
    ];
    const mimeType = mimeTypes.find((item) => MediaRecorder.isTypeSupported(item));
    const recorder = mimeType
      ? new MediaRecorder(stream, { mimeType })
      : new MediaRecorder(stream);

    chunksRef.current = [];
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunksRef.current.push(event.data);
      }
    };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, {
        type: mimeType ?? "video/webm",
      });
      const nextUrl = URL.createObjectURL(blob);
      if (downloadUrl) {
        URL.revokeObjectURL(downloadUrl);
      }
      setDownloadUrl(nextUrl);
      setRecording(false);
    };

    recorder.start();
    recorderRef.current = recorder;
    setPlayhead(0);
    setIsPlaying(true);
    setRecording(true);
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
    setRecording(false);
  };

  if (error) {
    return (
      <main className="paper-grid min-h-screen px-4 py-6">
        <div className="paper-panel mx-auto max-w-3xl rounded-[1.8rem] p-8 text-sm text-stone-700">
          {error}
        </div>
      </main>
    );
  }

  if (!battle || !replayState) {
    return (
      <main className="paper-grid min-h-screen px-4 py-6">
        <div className="paper-panel mx-auto max-w-3xl rounded-[1.8rem] p-8 text-sm text-stone-700">
          正在载入战斗包...
        </div>
      </main>
    );
  }

  return (
    <main className="paper-grid grain relative min-h-screen overflow-hidden px-4 py-6 text-foreground sm:px-6 lg:px-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <section className="entry-fade paper-panel rounded-[1.9rem] px-6 py-8 sm:px-10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="accent-chip inline-flex rounded-full px-3 py-1 text-xs uppercase tracking-[0.24em]">
                实时战斗回放
              </span>
              <h1 className="section-title mt-3">{battle.roomTitle}</h1>
              <p className="mt-2 text-sm leading-7 text-stone-600">
                {battle.topic.prompt}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                className="soft-button rounded-full border border-[var(--line)] bg-white/70 px-4 py-3 text-sm"
                onClick={() => setIsPlaying((current) => !current)}
                type="button"
              >
                {playbackActive ? "暂停回放" : "继续回放"}
              </button>
              {!recording ? (
                <button
                  className="soft-button rounded-full bg-[var(--accent)] px-4 py-3 text-sm text-white"
                  disabled={!canRecord}
                  onClick={startRecording}
                  type="button"
                >
                  {canRecord ? "录制 WebM" : "当前浏览器不支持录制"}
                </button>
              ) : (
                <button
                  className="soft-button rounded-full bg-[var(--olive)] px-4 py-3 text-sm text-white"
                  onClick={stopRecording}
                  type="button"
                >
                  停止录制
                </button>
              )}
              {downloadUrl ? (
                <a
                  className="soft-button rounded-full border border-[var(--line)] bg-white/70 px-4 py-3 text-sm"
                  download={`${battle.roomTitle}.webm`}
                  href={downloadUrl}
                >
                  下载录屏
                </a>
              ) : null}
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <article className="entry-fade paper-panel rounded-[1.75rem] p-6">
            <canvas
              className="w-full rounded-[1.45rem] border border-[var(--line)] bg-[#101b2d]"
              height={720}
              ref={canvasRef}
              width={1280}
            />
            <div className="mt-4">
              <input
                className="w-full accent-[var(--accent)]"
                max={battle.events.length - 1}
                min={0}
                onChange={(event) => {
                  setPlayhead(Number(event.target.value));
                  setIsPlaying(false);
                }}
                type="range"
                value={playhead}
              />
            </div>
          </article>

          <div className="grid gap-6">
            <article className="entry-fade paper-panel rounded-[1.75rem] p-6">
              <p className="text-xs uppercase tracking-[0.22em] text-stone-500">
                战斗解释
              </p>
              <h2 className="section-title mt-2">
                {replayState.currentEvent?.title ?? "等待战斗开始"}
              </h2>
              <p className="mt-4 text-sm leading-7 text-stone-700">
                {replayState.currentEvent?.description}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {(replayState.currentEvent?.tags ?? []).map((tag) => (
                  <span key={tag} className="accent-chip rounded-full px-3 py-1 text-xs">
                    {tag}
                  </span>
                ))}
              </div>
            </article>

            <article className="entry-fade paper-panel rounded-[1.75rem] p-6">
              <p className="text-xs uppercase tracking-[0.22em] text-stone-500">
                事件流
              </p>
              <div className="mt-4 grid max-h-[320px] gap-3 overflow-y-auto pr-1">
                {battle.events.map((event, index) => (
                  <div
                    className={`rounded-[1.15rem] border px-4 py-3 text-sm ${
                      index === playhead
                        ? "border-[var(--accent)] bg-white"
                        : "border-[var(--line)] bg-white/75"
                    }`}
                    key={event.id}
                  >
                    <p className="font-semibold">{event.title}</p>
                    <p className="mt-1 text-stone-600">{event.description}</p>
                  </div>
                ))}
              </div>
            </article>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1fr_0.95fr]">
          <article className="entry-fade paper-panel rounded-[1.75rem] p-6">
            <p className="text-xs uppercase tracking-[0.22em] text-stone-500">
                战斗战报
            </p>
            <h2 className="section-title mt-2">三大高光</h2>
            <div className="mt-5 grid gap-4">
              {battle.highlights.map((highlight) => (
                <article
                  className="rounded-[1.25rem] border border-[var(--line)] bg-white/75 px-4 py-4"
                  key={highlight.id}
                >
                  <p className="text-xs uppercase tracking-[0.18em] text-stone-500">
                    {highlight.label}
                  </p>
                  <p className="mt-2 text-base font-semibold">{highlight.title}</p>
                  <p className="mt-2 text-sm leading-7 text-stone-600">
                    {highlight.description}
                  </p>
                </article>
              ))}
            </div>
            <div className="mt-6 grid gap-3 md:grid-cols-3">
              {battle.judges.map((judge) => (
                <div
                  className="rounded-[1.25rem] border border-[var(--line)] bg-white/75 px-4 py-4 text-sm"
                  key={judge.id}
                >
                  <p className="font-semibold">{judge.title}</p>
                  <p className="mt-2">
                    {judge.playerScore} : {judge.defenderScore}
                  </p>
                  <p className="mt-2 text-stone-600">{judge.commentary}</p>
                </div>
              ))}
            </div>
          </article>

          <div className="grid gap-6">
            <article className="entry-fade paper-panel rounded-[1.75rem] p-6">
              <p className="text-xs uppercase tracking-[0.22em] text-stone-500">
                终局比分
              </p>
              <h2 className="section-title mt-2">
                {battle.winnerId === battle.player.id
                  ? `${battle.player.displayName} 获胜`
                  : `${battle.defender.displayName} 守擂成功`}
              </h2>
              <div className="mt-4 grid gap-3 text-sm leading-7 text-stone-700">
                <p>
                  终局总分 {battle.finalScore.player} : {battle.finalScore.defender}
                </p>
                <p>
                  观众热度 {battle.crowdScore.player} : {battle.crowdScore.defender}
                </p>
              </div>
            </article>

            <article className="entry-fade paper-panel rounded-[1.75rem] p-6">
              <p className="text-xs uppercase tracking-[0.22em] text-stone-500">
                挑战者预告
              </p>
              <h2 className="section-title mt-2">
                下一位挑战者：{battle.challengerPreview.displayName}
              </h2>
              <p className="mt-4 text-sm leading-7 text-stone-700">
                {battle.challengerPreview.declaration}
              </p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs">
                {formatSoul(battle.challengerPreview.soul).map((stat) => (
                  <span key={stat.key} className="accent-chip rounded-full px-3 py-1">
                    {stat.label} {stat.value}
                  </span>
                ))}
              </div>
            </article>
          </div>
        </section>
      </div>
    </main>
  );
}
