"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { soulLabels } from "@/lib/arena-presets";
import type {
  ArenaBattleCompetitionSide,
  ArenaCompetitorProfile,
  BattleEvent,
  BattlePackage,
  SoulStats,
} from "@/lib/arena-types";

const battleStorageKey = (battleId: string) => `soul-arena:battle:${battleId}`;

type ReplayState = {
  currentEvent: BattleEvent | null;
  defenderHealth: number;
  defenderScore: number;
  playerHealth: number;
  playerScore: number;
  round: number;
};

type ProfileResponse = {
  profiles: Array<{
    competitorId: string;
    profile: ArenaCompetitorProfile | null;
  }>;
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

  // Dark MK background
  const bgGrad = context.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, "#030008");
  bgGrad.addColorStop(0.4, "#0a0010");
  bgGrad.addColorStop(0.7, "#100005");
  bgGrad.addColorStop(1, "#060003");
  context.fillStyle = bgGrad;
  context.fillRect(0, 0, width, height);

  // Top red glow
  const topGlow = context.createRadialGradient(width / 2, 0, 0, width / 2, 0, width * 0.6);
  topGlow.addColorStop(0, "rgba(139,0,0,0.35)");
  topGlow.addColorStop(1, "transparent");
  context.fillStyle = topGlow;
  context.fillRect(0, 0, width, height / 2);

  // Scanline effect
  for (let y = 0; y < height; y += 4) {
    context.fillStyle = "rgba(0,0,0,0.07)";
    context.fillRect(0, y, width, 2);
  }

  // Title bar
  context.fillStyle = "rgba(0,0,0,0.6)";
  context.fillRect(0, 0, width, 80);
  context.fillStyle = "rgba(139,0,0,0.5)";
  context.fillRect(0, 78, width, 2);

  // Soul Arena title
  context.fillStyle = "#ff2200";
  context.font = "700 48px Impact, Arial Black, sans-serif";
  context.textAlign = "center";
  context.shadowColor = "rgba(255,30,0,0.7)";
  context.shadowBlur = 20;
  context.fillText("SOUL ARENA", width / 2, 56);
  context.shadowBlur = 0;

  // Topic
  context.font = "500 18px 'Courier New', monospace";
  context.fillStyle = "rgba(232,212,184,0.6)";
  context.fillText(battle.topic.title, width / 2, 100);

  // Round indicator
  context.font = "700 22px Impact, Arial Black, sans-serif";
  context.fillStyle = "#d4a000";
  context.shadowColor = "rgba(212,160,0,0.6)";
  context.shadowBlur = 10;
  context.fillText(`ROUND ${Math.max(1, replayState.round)}`, width / 2, 138);
  context.shadowBlur = 0;
  context.textAlign = "left";

  // ─── Fighter panel helper ───
  const drawFighter = (
    x: number,
    fighter: BattlePackage["player"],
    health: number,
    score: number,
    align: "left" | "right",
  ) => {
    const pw = 370;
    const ph = 440;
    const isRight = align === "right";
    const accentColor = isRight ? "#d4a000" : "#cc0000";
    const accentDim = isRight ? "rgba(180,120,0,0.3)" : "rgba(139,0,0,0.3)";
    const accentGlow = isRight ? "rgba(212,160,0,0.5)" : "rgba(255,30,0,0.5)";

    // Panel bg
    const panelGrad = context.createLinearGradient(x, 160, x, 160 + ph);
    panelGrad.addColorStop(0, "rgba(18,0,10,0.96)");
    panelGrad.addColorStop(1, "rgba(6,0,3,0.98)");
    context.fillStyle = panelGrad;
    context.fillRect(x, 160, pw, ph);

    // Top accent border
    context.fillStyle = accentColor;
    context.fillRect(x, 160, pw, 3);

    // Side border
    context.fillStyle = accentDim;
    context.fillRect(x, 160, 1, ph);
    context.fillRect(x + pw - 1, 160, 1, ph);

    // Name
    context.fillStyle = "#e8d4b8";
    context.font = "700 28px Impact, Arial Black, sans-serif";
    context.shadowColor = accentGlow;
    context.shadowBlur = 12;
    context.fillText(fighter.displayName, x + 20, 200);
    context.shadowBlur = 0;

    context.font = "500 15px 'Courier New', monospace";
    context.fillStyle = accentColor;
    context.fillText(fighter.powerLabel, x + 20, 222);

    // Health bar track
    const barX = x + 20;
    const barW = pw - 40;
    context.fillStyle = "rgba(0,0,0,0.8)";
    context.fillRect(barX, 234, barW, 18);

    // Health fill
    const healthFill = (barW * health) / 100;
    const hGrad = context.createLinearGradient(barX, 0, barX + healthFill, 0);
    if (isRight) {
      hGrad.addColorStop(0, "#7a5500");
      hGrad.addColorStop(1, "#ffd700");
    } else {
      hGrad.addColorStop(0, "#8b0000");
      hGrad.addColorStop(1, "#ff2200");
    }
    context.fillStyle = hGrad;
    context.fillRect(barX, 234, healthFill, 18);

    // Health bar shine
    context.fillStyle = "rgba(255,255,255,0.12)";
    context.fillRect(barX, 234, healthFill, 5);

    // Labels
    context.font = "500 14px 'Courier New', monospace";
    context.fillStyle = "#e8d4b8";
    context.fillText(`HP ${health}`, barX, 272);
    context.fillStyle = accentColor;
    context.fillText(`SCORE ${score}`, barX + 180, 272);

    // Stats
    context.font = "500 13px 'Courier New', monospace";
    formatSoul(fighter.soul).forEach((stat, index) => {
      const sy = 300 + index * 42;
      context.fillStyle = "rgba(232,212,184,0.65)";
      context.fillText(stat.label, barX, sy);

      // Stat track
      context.fillStyle = "rgba(0,0,0,0.7)";
      context.fillRect(barX + 90, sy - 14, 200, 10);

      // Stat fill
      const sfGrad = context.createLinearGradient(barX + 90, 0, barX + 290, 0);
      if (isRight) {
        sfGrad.addColorStop(0, "rgba(120,80,0,0.8)");
        sfGrad.addColorStop(1, "#d4a000");
      } else {
        sfGrad.addColorStop(0, "rgba(100,0,0,0.8)");
        sfGrad.addColorStop(1, "#cc0000");
      }
      context.fillStyle = sfGrad;
      context.fillRect(barX + 90, sy - 14, (200 * stat.value) / 100, 10);

      context.fillStyle = "#e8d4b8";
      context.fillText(String(stat.value), barX + 300, sy);
    });
  };

  drawFighter(60, battle.player, replayState.playerHealth, replayState.playerScore, "left");
  drawFighter(width - 430, battle.defender, replayState.defenderHealth, replayState.defenderScore, "right");

  // Center stage area
  const centerX = width / 2;
  const centerGlow = context.createRadialGradient(centerX, height - 100, 0, centerX, height - 100, 300);
  centerGlow.addColorStop(0, "rgba(80,0,0,0.25)");
  centerGlow.addColorStop(1, "transparent");
  context.fillStyle = centerGlow;
  context.fillRect(0, height - 350, width, 350);

  // Event title
  const isWeaknessHit = currentEvent?.type === "weakness_hit";
  context.textAlign = "center";
  context.font = `700 ${isWeaknessHit ? 48 : 40}px Impact, Arial Black, sans-serif`;
  context.fillStyle = isWeaknessHit ? "#ffd700" : "#e8d4b8";
  context.shadowColor = isWeaknessHit ? "rgba(255,215,0,0.7)" : "rgba(200,0,0,0.5)";
  context.shadowBlur = isWeaknessHit ? 25 : 15;
  context.fillText(currentEvent?.title ?? "STAND BY", centerX, height - 200);
  context.shadowBlur = 0;

  // Event description
  context.font = "500 18px 'Courier New', monospace";
  context.fillStyle = "rgba(232,212,184,0.75)";
  context.fillText(
    currentEvent?.description ?? "等待战斗数据载入。",
    centerX,
    height - 155,
    width - 280,
  );

  // Weakness hit strike effect
  if (isWeaknessHit) {
    context.strokeStyle = "#ffd700";
    context.lineWidth = 6;
    context.shadowColor = "rgba(255,215,0,0.8)";
    context.shadowBlur = 20;
    context.beginPath();
    context.moveTo(centerX - 80, height - 120);
    context.lineTo(centerX - 20, height - 170);
    context.lineTo(centerX + 10, height - 140);
    context.lineTo(centerX + 90, height - 190);
    context.stroke();
    context.shadowBlur = 0;
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

const formatScoreDelta = (side: ArenaBattleCompetitionSide | null) =>
  side ? `${side.scoreDelta > 0 ? "+" : ""}${side.scoreDelta}` : "-";

const winnerLabel = (battle: BattlePackage) =>
  battle.winnerId === battle.player.id
    ? `${battle.player.displayName} 获胜`
    : `${battle.defender.displayName} 守擂成功`;

// Share button
function ShareButton({ battleId }: { battleId: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const url = `${window.location.origin}/arena/${battleId}`;
    void navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <button className="mk-button-ghost px-4 py-3" onClick={handleCopy} type="button">
      {copied ? "已复制 ✓" : "复制链接"}
    </button>
  );
}

// Health bar component
function HealthBar({ value, gold = false }: { value: number; gold?: boolean }) {
  return (
    <div className="mk-health-track" style={{ flex: 1 }}>
      <div
        className={gold ? "mk-health-fill-gold" : "mk-health-fill"}
        style={{ width: `${value}%` }}
      />
    </div>
  );
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
  const [winnerProfileState, setWinnerProfileState] = useState<{
    competitorId: string;
    profile: ArenaCompetitorProfile | null;
  } | null>(null);

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

  const winnerCompetitorId = useMemo(() => {
    if (!battle?.competition) {
      return null;
    }

    return battle.winnerId === battle.player.id
      ? battle.competition.player?.competitorId ?? null
      : battle.competition.defender?.competitorId ?? null;
  }, [battle]);

  useEffect(() => {
    if (!winnerCompetitorId) {
      return;
    }

    let active = true;

    void (async () => {
      try {
        const payload = await fetch(
          `/api/arena/profile?competitorId=${encodeURIComponent(winnerCompetitorId)}`,
          { cache: "no-store" },
        );

        if (!payload.ok || !active) {
          return;
        }

        const data = (await payload.json()) as ProfileResponse;

        if (!active) {
          return;
        }

        setWinnerProfileState({
          competitorId: winnerCompetitorId,
          profile: data.profiles[0]?.profile ?? null,
        });
      } catch {
        if (active) {
          setWinnerProfileState({
            competitorId: winnerCompetitorId,
            profile: null,
          });
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [winnerCompetitorId]);

  const winnerProfile = useMemo(
    () =>
      winnerProfileState?.competitorId === winnerCompetitorId
        ? winnerProfileState.profile
        : null,
    [winnerCompetitorId, winnerProfileState],
  );

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
  const winnerCompetition = useMemo(() => {
    if (!battle?.competition) {
      return null;
    }

    return battle.winnerId === battle.player.id
      ? battle.competition.player
      : battle.competition.defender;
  }, [battle]);
  const loserCompetition = useMemo(() => {
    if (!battle?.competition) {
      return null;
    }

    return battle.winnerId === battle.player.id
      ? battle.competition.defender
      : battle.competition.player;
  }, [battle]);

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
      <main className="scanlines min-h-screen px-4 py-6" style={{ color: 'var(--text)' }}>
        <div className="mk-panel mx-auto max-w-3xl p-8 mk-status">
          {error}
        </div>
      </main>
    );
  }

  if (!battle || !replayState) {
    return (
      <main className="scanlines min-h-screen px-4 py-6" style={{ color: 'var(--text)' }}>
        <div className="mk-panel mx-auto max-w-3xl p-8 mk-status">
          正在载入战斗包...
        </div>
      </main>
    );
  }

  return (
    <main className="scanlines relative min-h-screen overflow-hidden px-4 py-6 sm:px-6 lg:px-10" style={{ color: 'var(--text)' }}>
      <div className="mx-auto flex max-w-7xl flex-col gap-6">

        {/* ── HUD HEADER ── */}
        <section className="entry-fade mk-panel px-6 py-5 sm:px-8">
          {/* Fighter HP bars */}
          <div className="flex items-center gap-4 mb-4">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <p style={{ fontFamily: 'Impact, Arial Black, sans-serif', fontSize: '0.85rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--red-bright)', textShadow: '0 0 8px rgba(255,30,0,0.5)' }}>
                  {battle.player.displayName}
                </p>
                <p style={{ fontFamily: "'Courier New', monospace", fontSize: '0.72rem', color: 'var(--red)' }}>
                  {replayState.playerHealth}%
                </p>
              </div>
              <HealthBar value={replayState.playerHealth} />
            </div>

            <div className="flex flex-col items-center gap-1 px-3">
              <p style={{ fontFamily: 'Impact, Arial Black, sans-serif', fontSize: '0.6rem', letterSpacing: '0.3em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                第 {replayState.round} 回合
              </p>
              <span className="mk-vs" style={{ fontSize: '1.6rem' }}>VS</span>
            </div>

            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <p style={{ fontFamily: "'Courier New', monospace", fontSize: '0.72rem', color: 'var(--gold)' }}>
                  {replayState.defenderHealth}%
                </p>
                <p style={{ fontFamily: 'Impact, Arial Black, sans-serif', fontSize: '0.85rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--gold-bright)', textShadow: '0 0 8px rgba(255,215,0,0.4)', textAlign: 'right' }}>
                  {battle.defender.displayName}
                </p>
              </div>
              <HealthBar value={replayState.defenderHealth} gold />
            </div>
          </div>

          <hr className="mk-divider mb-4" />

          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="mk-badge mb-2">实时战斗回放</div>
              <h1 className="mk-section">{battle.roomTitle}</h1>
              <p style={{ fontFamily: "'Courier New', monospace", fontSize: '0.78rem', color: 'var(--text-dim)', lineHeight: '1.7', marginTop: '6px' }}>
                {battle.topic.prompt}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                className="mk-button-ghost px-4 py-3"
                onClick={() => setIsPlaying((current) => !current)}
                type="button"
              >
                {playbackActive ? "暂停回放" : "继续回放"}
              </button>
              {!recording ? (
                <button
                  className="mk-button px-4 py-3"
                  disabled={!canRecord}
                  onClick={startRecording}
                  type="button"
                >
                  {canRecord ? "录制 WebM" : "不支持录制"}
                </button>
              ) : (
                <button
                  className="mk-button-ghost px-4 py-3"
                  onClick={stopRecording}
                  type="button"
                >
                  停止录制
                </button>
              )}
              {downloadUrl ? (
                <a
                  className="mk-button-ghost px-4 py-3"
                  download={`${battle.roomTitle}.webm`}
                  href={downloadUrl}
                >
                  下载录屏
                </a>
              ) : null}
              <Link className="mk-button px-4 py-3" href="/arena" style={{ fontSize: '0.88rem', letterSpacing: '0.2em' }}>
                ⚔ 重赛
              </Link>
              <ShareButton battleId={battle.id} />
            </div>
          </div>
        </section>

        {/* ── CANVAS + SIDEBAR ── */}
        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">

          {/* Canvas */}
          <article className="entry-fade mk-panel p-4">
            <canvas
              className="w-full"
              height={720}
              ref={canvasRef}
              style={{ display: 'block', background: '#030008', borderTop: '2px solid var(--red)' }}
              width={1280}
            />
            <div className="mt-4 px-1">
              <input
                className="w-full"
                max={battle.events.length - 1}
                min={0}
                onChange={(event) => {
                  setPlayhead(Number(event.target.value));
                  setIsPlaying(false);
                }}
                style={{ accentColor: 'var(--red)', cursor: 'pointer' }}
                type="range"
                value={playhead}
              />
            </div>
            {/* Score display */}
            <div className="flex justify-between mt-2 px-1">
              <p style={{ fontFamily: 'Impact, Arial Black, sans-serif', fontSize: '0.8rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--red)' }}>
                {battle.player.displayName} · {replayState.playerScore}
              </p>
              <p style={{ fontFamily: 'Impact, Arial Black, sans-serif', fontSize: '0.8rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--gold)' }}>
                {replayState.defenderScore} · {battle.defender.displayName}
              </p>
            </div>
          </article>

          {/* Sidebar */}
          <div className="flex flex-col gap-5">

            {/* Competition results */}
            {battle.competition ? (
              <article className="entry-fade mk-panel p-5">
                <div className="mk-label-red mb-2">排位结算</div>
                <h2 className="mk-section mb-4">{battle.competition.stakesLabel}</h2>
                <div style={{ fontFamily: "'Courier New', monospace", fontSize: '0.82rem', color: 'var(--text-dim)', lineHeight: '2.1' }}>
                  <p>
                    获胜：<span style={{ color: 'var(--gold)' }}>{winnerCompetition?.displayName ?? "胜者"}</span>{" "}
                    <span style={{ color: 'var(--gold-bright)' }}>{formatScoreDelta(winnerCompetition)}</span>
                  </p>
                  <p>
                    失利：<span style={{ color: 'var(--red)' }}>{loserCompetition?.displayName ?? "败者"}</span>{" "}
                    <span style={{ color: 'var(--red)' }}>{formatScoreDelta(loserCompetition)}</span>
                  </p>
                  <p>
                    排名：{winnerCompetition?.rankBefore ?? "-"} → <span style={{ color: 'var(--gold)' }}>{winnerCompetition?.rankAfter ?? "-"}</span>
                  </p>
                  <p>
                    连胜：{winnerCompetition?.streakBefore ?? 0} → <span style={{ color: 'var(--gold-bright)' }}>{winnerCompetition?.streakAfter ?? 0}</span>
                  </p>
                  {battle.competition.endedOpponentStreak ? (
                    <p style={{ color: 'var(--red)', marginTop: '4px' }}>
                      终结对手 {battle.competition.endedOpponentStreakCount} 连胜。
                    </p>
                  ) : null}
                  {battle.competition.isUpsetWin ? (
                    <p style={{ color: 'var(--gold-bright)', marginTop: '4px' }}>⚡ 下克上胜利</p>
                  ) : null}
                </div>
              </article>
            ) : null}

            {/* Current event */}
            <article className="entry-fade mk-panel p-5">
              <div className="mk-label-red mb-2">战斗解释</div>
              <h2 className="mk-section mb-3">
                {replayState.currentEvent?.title ?? "等待战斗开始"}
              </h2>
              <p style={{ fontFamily: "'Courier New', monospace", fontSize: '0.82rem', color: 'var(--text-dim)', lineHeight: '1.8' }}>
                {replayState.currentEvent?.description}
              </p>
              {(replayState.currentEvent?.tags ?? []).length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {(replayState.currentEvent?.tags ?? []).map((tag) => (
                    <span key={tag} className="mk-badge">{tag}</span>
                  ))}
                </div>
              )}

              {/* Profile anchors for current actor */}
              {(() => {
                const event = replayState.currentEvent;
                if (!event?.actorId) return null;
                const actor = event.actorId === battle.player.id ? battle.player : event.actorId === battle.defender.id ? battle.defender : null;
                if (!actor) return null;
                const anchors = actor.memoryAnchors.slice(0, 2);
                const summary = actor.identitySummary.slice(0, 2);
                if (!anchors.length && !summary.length) return null;
                const isPlayer = actor === battle.player;
                return (
                  <div className="mk-panel-inset p-3 mt-4">
                    <p style={{ fontFamily: 'Impact, Arial Black, sans-serif', fontSize: '0.62rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: isPlayer ? 'var(--red)' : 'var(--gold)', marginBottom: '8px' }}>
                      {actor.displayName} · 构筑依据
                    </p>
                    {summary.map((s) => (
                      <p key={s} style={{ fontFamily: "'Courier New', monospace", fontSize: '0.72rem', color: 'var(--text-dim)', lineHeight: '1.6' }}>
                        · {s}
                      </p>
                    ))}
                    {anchors.map((a) => (
                      <p key={a} style={{ fontFamily: "'Courier New', monospace", fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: '1.6', fontStyle: 'italic' }}>
                        「{a}」
                      </p>
                    ))}
                  </div>
                );
              })()}
            </article>

            {/* Event stream */}
            <article className="entry-fade mk-panel p-5">
              <div className="mk-label-red mb-3">事件流</div>
              <div className="flex flex-col gap-2 max-h-80 overflow-y-auto pr-1">
                {battle.events.map((event, index) => (
                  <div
                    key={event.id}
                    className={index === playhead ? "mk-event-item mk-event-item-active" : "mk-event-item"}
                  >
                    <p style={{ fontFamily: 'Impact, Arial Black, sans-serif', fontSize: '0.8rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: index === playhead ? 'var(--red-bright)' : 'var(--text)', marginBottom: '3px' }}>
                      {event.title}
                    </p>
                    <p style={{ fontFamily: "'Courier New', monospace", fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: '1.6' }}>
                      {event.description}
                    </p>
                  </div>
                ))}
              </div>
            </article>
          </div>
        </section>

        {/* ── HIGHLIGHTS + RESULTS ── */}
        <section className="grid gap-6 lg:grid-cols-[1fr_0.95fr]">

          {/* Highlights + judges */}
          <article className="entry-fade mk-panel p-6">
            <div className="mk-label-red mb-2">战斗战报</div>
            <h2 className="mk-section mb-5">三大高光</h2>
            <div className="flex flex-col gap-4">
              {battle.highlights.map((highlight) => (
                <article key={highlight.id} className="mk-highlight">
                  <div className="mk-badge mb-2">{highlight.label}</div>
                  <p style={{ fontFamily: 'Impact, Arial Black, sans-serif', letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: '0.95rem', color: 'var(--text-bright)', marginBottom: '6px' }}>
                    {highlight.title}
                  </p>
                  <p style={{ fontFamily: "'Courier New', monospace", fontSize: '0.8rem', color: 'var(--text-dim)', lineHeight: '1.75' }}>
                    {highlight.description}
                  </p>
                </article>
              ))}
            </div>

            <hr className="mk-divider my-5" />

            <div className="grid gap-3 md:grid-cols-3">
              {battle.judges.map((judge) => (
                <div key={judge.id} className="mk-panel-inset p-3">
                  <p style={{ fontFamily: 'Impact, Arial Black, sans-serif', fontSize: '0.78rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: '6px' }}>
                    {judge.title}
                  </p>
                  <p style={{ fontFamily: 'Impact, Arial Black, sans-serif', fontSize: '1.1rem', color: 'var(--text-bright)', marginBottom: '5px' }}>
                    <span style={{ color: 'var(--red)' }}>{judge.playerScore}</span>
                    {" : "}
                    <span style={{ color: 'var(--gold)' }}>{judge.defenderScore}</span>
                  </p>
                  <p style={{ fontFamily: "'Courier New', monospace", fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: '1.65' }}>
                    {judge.commentary}
                  </p>
                </div>
              ))}
            </div>
          </article>

          {/* Final score + next challenge */}
          <div className="flex flex-col gap-5">
            <article className="entry-fade mk-panel p-5">
              <div className="mk-label-red mb-2">终局比分</div>
              <h2 className="mk-section mb-4">{winnerLabel(battle)}</h2>
              <div style={{ fontFamily: "'Courier New', monospace", fontSize: '0.85rem', color: 'var(--text-dim)', lineHeight: '2.1' }}>
                <p>
                  终局总分{" "}
                  <span style={{ color: 'var(--red)', fontFamily: 'Impact, Arial Black, sans-serif', fontSize: '1.1rem' }}>{battle.finalScore.player}</span>
                  {" : "}
                  <span style={{ color: 'var(--gold)', fontFamily: 'Impact, Arial Black, sans-serif', fontSize: '1.1rem' }}>{battle.finalScore.defender}</span>
                </p>
                <p>
                  观众热度{" "}
                  <span style={{ color: 'var(--red)' }}>{battle.crowdScore.player}</span>
                  {" : "}
                  <span style={{ color: 'var(--gold)' }}>{battle.crowdScore.defender}</span>
                </p>
              </div>
            </article>

            <article className="entry-fade mk-panel p-5">
              <div className="mk-label-red mb-2">下一战推荐</div>
              <h2 className="mk-section mb-4">
                {winnerProfile?.suggestion
                  ? `建议挑战 ${winnerProfile.suggestion.displayName}`
                  : `下一位焦点：${battle.challengerPreview.displayName}`}
              </h2>
              {winnerProfile?.suggestion ? (
                <div style={{ fontFamily: "'Courier New', monospace", fontSize: '0.82rem', color: 'var(--text-dim)', lineHeight: '2' }}>
                  <p>{winnerProfile.suggestion.reason}</p>
                  <p>对手积分 <span style={{ color: 'var(--gold)' }}>{winnerProfile.suggestion.rating}</span> · 连胜 {winnerProfile.suggestion.currentStreak}</p>
                  <p>
                    继续胜出预计 <span style={{ color: 'var(--gold)' }}>+{winnerProfile.suggestion.projectedWinDelta}</span>，
                    失利 <span style={{ color: 'var(--red)' }}>{winnerProfile.suggestion.projectedLossDelta}</span>
                  </p>
                </div>
              ) : (
                <>
                  <p style={{ fontFamily: "'Courier New', monospace", fontSize: '0.82rem', color: 'var(--text-dim)', lineHeight: '1.8', marginBottom: '12px' }}>
                    {battle.challengerPreview.declaration}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {formatSoul(battle.challengerPreview.soul).map((stat) => (
                      <span key={stat.key} className="mk-badge">
                        {stat.label} {stat.value}
                      </span>
                    ))}
                  </div>
                </>
              )}
            </article>
          </div>
        </section>

      </div>
    </main>
  );
}
