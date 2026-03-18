"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { soulLabels } from "@/lib/arena-presets";
import type {
  ArenaBattleCompetitionSide,
  ArenaCompetitorProfile,
  ArenaParticipantSnapshot,
  BattleEvent,
  BattlePackage,
  SoulStatKey,
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

type RematchResponse = {
  setup: {
    id: string;
  };
};

const formatSoul = (soul: SoulStats) =>
  (Object.keys(soulLabels) as Array<keyof SoulStats>).map((key) => ({
    key,
    label: soulLabels[key],
    value: soul[key],
  }));

const deriveReplayState = (battle: BattlePackage, playhead: number): ReplayState => {
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

type AudienceMemberCanvas = {
  id: string;
  displayName: string;
  avatarDataUrl: string | null;
  seatX: number;
  seatRow: number;
  bobPhase: number;
};

function drawStage(
  canvas: HTMLCanvasElement,
  battle: BattlePackage,
  replayState: ReplayState,
  playerAvatar: HTMLImageElement | null,
  defenderAvatar: HTMLImageElement | null,
  playerSprite: HTMLImageElement | null,
  defenderSprite: HTMLImageElement | null,
  animTime: number,
  poseAge: number,
  audienceMembers: AudienceMemberCanvas[],
  avatarImageCache: Map<string, HTMLImageElement>,
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const W = canvas.width;
  const H = canvas.height;
  const { currentEvent } = replayState;
  const evType = currentEvent?.type ?? "";
  const actorIsPlayer = currentEvent?.actorId === battle.player.id;
  const targetIsPlayer = currentEvent?.targetId === battle.player.id;
  const targetIsDefender = currentEvent?.targetId === battle.defender.id;

  // ── 1. ARENA BACKGROUND ────────────────────────────────────────
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#06000e");
  bg.addColorStop(0.55, "#10000a");
  bg.addColorStop(1, "#180004");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Back wall
  const wallGrad = ctx.createLinearGradient(0, 90, 0, 500);
  wallGrad.addColorStop(0, "#1c0007");
  wallGrad.addColorStop(1, "#0a0002");
  ctx.fillStyle = wallGrad;
  ctx.fillRect(0, 90, W, 430);
  // Wall horizontal lines (stone texture)
  for (let y = 105; y < 500; y += 26) {
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.fillRect(0, y, W, 1);
  }

  // Pillars (4)
  for (const px of [70, 230, W - 230, W - 70]) {
    const pg = ctx.createLinearGradient(px - 22, 0, px + 22, 0);
    pg.addColorStop(0, "#0a0002");
    pg.addColorStop(0.35, "#280009");
    pg.addColorStop(0.65, "#1c0006");
    pg.addColorStop(1, "#060001");
    ctx.fillStyle = pg;
    ctx.fillRect(px - 22, 90, 44, 430);
    // Pillar inner glow line
    ctx.fillStyle = "rgba(180,0,0,0.12)";
    ctx.fillRect(px - 2, 90, 4, 430);
    // Torch at top
    const tg = ctx.createRadialGradient(px, 115, 2, px, 115, 38);
    tg.addColorStop(0, "rgba(255,110,0,0.85)");
    tg.addColorStop(0.45, "rgba(200,20,0,0.3)");
    tg.addColorStop(1, "transparent");
    ctx.fillStyle = tg;
    ctx.fillRect(px - 38, 77, 76, 76);
    // Flame
    ctx.beginPath();
    ctx.moveTo(px - 7, 125);
    ctx.quadraticCurveTo(px - 12, 102, px, 90);
    ctx.quadraticCurveTo(px + 12, 102, px + 7, 125);
    ctx.closePath();
    ctx.fillStyle = "rgba(255,140,0,0.9)";
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(px - 4, 120);
    ctx.quadraticCurveTo(px, 104, px + 4, 120);
    ctx.closePath();
    ctx.fillStyle = "rgba(255,230,100,0.85)";
    ctx.fill();
  }

  // Crowd silhouettes (two rows)
  ctx.fillStyle = "rgba(0,0,0,0.8)";
  for (let i = 0; i < 58; i++) {
    const cx2 = 18 + i * 22 + (i % 3) * 3;
    const cy2 = 380 + Math.sin(i * 0.7) * 7;
    const r2 = 8 + Math.sin(i * 1.2) * 2;
    ctx.beginPath(); ctx.arc(cx2, cy2, r2, 0, Math.PI * 2); ctx.fill();
    ctx.fillRect(cx2 - 5, cy2 + r2, 10, 15);
  }
  for (let i = 0; i < 54; i++) {
    const cx2 = 28 + i * 23;
    const cy2 = 403 + Math.sin(i * 0.9) * 5;
    const r2 = 7 + Math.sin(i * 1.5) * 2;
    ctx.beginPath(); ctx.arc(cx2, cy2, r2, 0, Math.PI * 2); ctx.fill();
    ctx.fillRect(cx2 - 4, cy2 + r2, 8, 13);
  }

  // Floor
  const floorY = 555;
  const floorGrad = ctx.createLinearGradient(0, floorY, 0, H);
  floorGrad.addColorStop(0, "#180004");
  floorGrad.addColorStop(0.25, "#0c0002");
  floorGrad.addColorStop(1, "#050001");
  ctx.fillStyle = floorGrad;
  ctx.fillRect(0, floorY, W, H - floorY);
  // Floor edge glow
  const floorEdge = ctx.createLinearGradient(0, floorY, 0, floorY + 55);
  floorEdge.addColorStop(0, "rgba(200,0,0,0.18)");
  floorEdge.addColorStop(1, "transparent");
  ctx.fillStyle = floorEdge;
  ctx.fillRect(0, floorY, W, 55);
  ctx.fillStyle = "rgba(180,0,0,0.55)";
  ctx.fillRect(0, floorY, W, 2);
  // Perspective floor lines
  ctx.save();
  ctx.strokeStyle = "rgba(90,0,20,0.18)";
  ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 90) {
    ctx.beginPath(); ctx.moveTo(x, floorY); ctx.lineTo(W / 2, H + 120); ctx.stroke();
  }
  ctx.restore();

  // ── AUDIENCE SECTION ────────────────────────────────────────────
  // Subtle audience glow gradient at the bottom
  const audienceGlow = ctx.createLinearGradient(0, floorY + 8, 0, H);
  audienceGlow.addColorStop(0, "rgba(80,0,0,0.22)");
  audienceGlow.addColorStop(1, "transparent");
  ctx.fillStyle = audienceGlow;
  ctx.fillRect(0, floorY + 8, W, H - floorY - 8);

  // Row configs: front row is most visible
  const rowConfigs = [
    { yOffset: 18, opacity: 1.0 },
    { yOffset: 38, opacity: 0.85 },
    { yOffset: 56, opacity: 0.7 },
  ];

  for (const member of audienceMembers) {
    const row = rowConfigs[member.seatRow];
    if (!row) continue;
    const bobY = Math.sin(animTime * 0.002 + member.bobPhase) * 2;
    const mx = member.seatX;
    const my = floorY + row.yOffset + bobY;
    const r = 11;

    ctx.save();
    ctx.globalAlpha = row.opacity;
    const cachedImg = avatarImageCache.get(member.id);
    if (cachedImg) {
      ctx.beginPath();
      ctx.arc(mx, my, r, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(cachedImg, mx - r, my - r, r * 2, r * 2);
    } else {
      // Colored circle with initial letter
      const hue = (member.displayName.charCodeAt(0) * 37) % 360;
      ctx.beginPath();
      ctx.arc(mx, my, r, 0, Math.PI * 2);
      ctx.fillStyle = `hsl(${hue},60%,28%)`;
      ctx.fill();
      ctx.font = `700 ${r}px Impact, Arial Black, sans-serif`;
      ctx.fillStyle = `hsl(${hue},80%,75%)`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(member.displayName.charAt(0).toUpperCase(), mx, my);
      ctx.textBaseline = "alphabetic";
    }
    ctx.restore();
  }

  // Scanlines
  for (let y = 0; y < H; y += 4) {
    ctx.fillStyle = "rgba(0,0,0,0.05)"; ctx.fillRect(0, y, W, 2);
  }

  // ── 2. HUD BAR ─────────────────────────────────────────────────
  const hudH = 82;
  ctx.fillStyle = "rgba(0,0,0,0.88)";
  ctx.fillRect(0, 0, W, hudH);
  ctx.fillStyle = "rgba(140,0,0,0.65)";
  ctx.fillRect(0, hudH - 2, W, 2);

  // Player name
  ctx.font = "700 19px Impact, Arial Black, sans-serif";
  ctx.fillStyle = "#ff3300";
  ctx.textAlign = "left";
  ctx.shadowColor = "rgba(255,40,0,0.8)";
  ctx.shadowBlur = 10;
  ctx.fillText(battle.player.displayName.toUpperCase(), 18, 26);
  ctx.shadowBlur = 0;
  // Defender name
  ctx.font = "700 19px Impact, Arial Black, sans-serif";
  ctx.fillStyle = "#ffd700";
  ctx.textAlign = "right";
  ctx.shadowColor = "rgba(255,215,0,0.8)";
  ctx.shadowBlur = 10;
  ctx.fillText(battle.defender.displayName.toUpperCase(), W - 18, 26);
  ctx.shadowBlur = 0;

  // Center: SOUL ARENA + round
  ctx.textAlign = "center";
  ctx.font = "700 15px Impact, Arial Black, sans-serif";
  ctx.fillStyle = "#ff2200";
  ctx.shadowColor = "rgba(255,30,0,0.7)";
  ctx.shadowBlur = 8;
  ctx.fillText("SOUL ARENA", W / 2, 20);
  ctx.shadowBlur = 0;
  ctx.font = "700 12px Impact, Arial Black, sans-serif";
  ctx.fillStyle = "#d4a000";
  ctx.fillText(`ROUND ${Math.max(1, replayState.round)}`, W / 2, 36);
  ctx.font = "500 11px 'Courier New', monospace";
  ctx.fillStyle = "rgba(232,212,184,0.5)";
  ctx.fillText(battle.topic.title, W / 2, 52);

  // Health bars
  const barPad = 18;
  const barW2 = W / 2 - 110;
  const barY2 = 56;
  const barH2 = 18;
  // Player bar (left→right)
  ctx.fillStyle = "rgba(0,0,0,0.8)"; ctx.fillRect(barPad, barY2, barW2, barH2);
  const pFill = (barW2 * replayState.playerHealth) / 100;
  const pBarGrad = ctx.createLinearGradient(barPad, 0, barPad + barW2, 0);
  pBarGrad.addColorStop(0, "#8b0000"); pBarGrad.addColorStop(1, "#ff2200");
  ctx.fillStyle = pBarGrad; ctx.fillRect(barPad, barY2, pFill, barH2);
  ctx.fillStyle = "rgba(255,255,255,0.14)"; ctx.fillRect(barPad, barY2, pFill, 5);
  ctx.textAlign = "left"; ctx.font = "500 10px 'Courier New', monospace";
  ctx.fillStyle = "rgba(232,212,184,0.7)";
  ctx.fillText(`${replayState.playerHealth}%`, barPad + 4, barY2 + barH2 - 3);
  // Defender bar (right→left)
  const defBarX2 = W - barPad - barW2;
  ctx.fillStyle = "rgba(0,0,0,0.8)"; ctx.fillRect(defBarX2, barY2, barW2, barH2);
  const dFill = (barW2 * replayState.defenderHealth) / 100;
  const dBarGrad = ctx.createLinearGradient(W - barPad - dFill, 0, W - barPad, 0);
  dBarGrad.addColorStop(0, "#7a5500"); dBarGrad.addColorStop(1, "#ffd700");
  ctx.fillStyle = dBarGrad; ctx.fillRect(W - barPad - dFill, barY2, dFill, barH2);
  ctx.fillStyle = "rgba(255,255,255,0.14)"; ctx.fillRect(W - barPad - dFill, barY2, dFill, 5);
  ctx.textAlign = "right"; ctx.font = "500 10px 'Courier New', monospace";
  ctx.fillStyle = "rgba(232,212,184,0.7)";
  ctx.fillText(`${replayState.defenderHealth}%`, W - barPad - 4, barY2 + barH2 - 3);

  // ── 3. FIGHTER FIGURES ─────────────────────────────────────────
  type FightPose = "idle" | "melee_attack" | "ranged_attack" | "hit" | "big_hit" | "defend" | "victory";

  let playerPose: FightPose = "idle";
  let defenderPose: FightPose = "idle";
  if (actorIsPlayer) {
    playerPose = evType === "weakness_hit" ? "ranged_attack" : evType === "defense" ? "defend" : "melee_attack";
  } else if (currentEvent?.actorId === battle.defender.id) {
    defenderPose = evType === "weakness_hit" ? "ranged_attack" : evType === "defense" ? "defend" : "melee_attack";
  }
  if (targetIsPlayer) {
    playerPose = playerPose === "idle" ? (evType === "weakness_hit" ? "big_hit" : "hit") : playerPose;
  }
  if (targetIsDefender) {
    defenderPose = defenderPose === "idle" ? (evType === "weakness_hit" ? "big_hit" : "hit") : defenderPose;
  }
  const isGameOver = replayState.playerHealth === 0 || replayState.defenderHealth === 0;
  if (isGameOver) {
    playerPose = replayState.playerHealth >= replayState.defenderHealth ? "victory" : "big_hit";
    defenderPose = replayState.defenderHealth >= replayState.playerHealth ? "victory" : "big_hit";
  }

  const drawFighterFigure = (
    cx: number, groundY: number,
    facing: 1 | -1,
    pose: FightPose,
    bodyColor: string, glowColor: string,
    avatar: HTMLImageElement | null,
    sprite: HTMLImageElement | null,
    displayName: string, score: number,
    phaseOffset: number,
  ) => {
    const f = facing;
    const headR = 27;
    const shoulderW = 66;
    const waistW = 42;
    const torsoH = 76;
    const thighH = 70;
    const shinH = 64;
    const armUpperH = 52;
    const limbW = 20;

    const shoulderY = groundY - thighH - shinH - torsoH;
    const waistY = shoulderY + torsoH;
    const kneeY = waistY + thighH;
    const headY = shoulderY - headR - 5;

    let leanX = 0, leanY = 0;
    let frontLegX2 = f * 16, backLegX2 = -f * 16;
    let frontArmX = f * (shoulderW / 2 - 5), backArmX = -f * (shoulderW / 2 - 5);
    let frontArmEndX = f * (shoulderW / 2 + armUpperH * 0.8), frontArmEndY = shoulderY + armUpperH;
    let backArmEndX = -f * (shoulderW / 2) * 0.3, backArmEndY = shoulderY + armUpperH * 0.85;
    let headOffX = 0;

    switch (pose) {
      case "melee_attack":
        leanX = f * 30; frontLegX2 = f * 40; backLegX2 = -f * 10;
        frontArmEndX = cx + f * (shoulderW / 2 + armUpperH * 1.3) - cx + leanX;
        frontArmEndY = shoulderY + armUpperH * 0.6;
        headOffX = f * 8; break;
      case "ranged_attack":
        leanX = f * 12; leanY = -8;
        frontArmEndX = f * (shoulderW / 2 + armUpperH * 1.1);
        frontArmEndY = shoulderY + armUpperH * 0.5;
        backArmEndX = f * (shoulderW / 2 + armUpperH * 0.7);
        backArmEndY = shoulderY + armUpperH * 0.65; break;
      case "hit":
        leanX = -f * 22;
        frontArmEndX = -f * 20; frontArmEndY = shoulderY + 30;
        backArmEndX = -f * 35; backArmEndY = shoulderY + 50;
        headOffX = -f * 10; break;
      case "big_hit":
        leanX = -f * 45; leanY = 10;
        frontLegX2 = -f * 15; backLegX2 = f * 10;
        frontArmEndX = -f * 50; frontArmEndY = shoulderY - 10;
        backArmEndX = f * 60; backArmEndY = shoulderY + 20;
        headOffX = -f * 18; break;
      case "defend":
        leanY = 12; frontLegX2 = f * 20; backLegX2 = -f * 5;
        frontArmEndX = f * 28; frontArmEndY = shoulderY + 15;
        backArmEndX = -f * 10; backArmEndY = shoulderY + 10; break;
      case "victory":
        frontArmEndX = f * 10; frontArmEndY = shoulderY - armUpperH;
        backArmEndX = -f * 20; backArmEndY = shoulderY + 30; break;
      default:
        frontLegX2 = f * 10; backLegX2 = -f * 12;
        frontArmEndX = f * (shoulderW / 2 + 22); frontArmEndY = shoulderY + armUpperH * 1.1;
        backArmEndX = -f * (shoulderW / 2 - 5); backArmEndY = shoulderY + armUpperH * 0.9;
    }

    // ── Animation: idle breathing + pose transition easing ──────────
    // Continuous idle bob (each fighter has opposite phase for variety)
    const idleBob = Math.sin(animTime * 0.0024 + phaseOffset) * 2.8;
    // Pose transition: half-sine from 0→1→0 over 420ms (punch out and return)
    const poseTNorm = Math.min(1, poseAge / 420);
    const poseEase = Math.sin(poseTNorm * Math.PI); // 0→1→0 arc

    // Scale pose offsets by poseEase (they start at 0, peak at ~210ms, return to 0)
    const animLeanX = leanX * poseEase;
    const animLeanY = leanY * poseEase + idleBob;

    const bx = cx + animLeanX;
    const by = animLeanY;

    // Shadow ellipse (shifts slightly with lean)
    ctx.beginPath(); ctx.ellipse(cx + animLeanX * 0.3, groundY + 6, 48, 11, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.fill();

    // ── AI SPRITE (full-body image, drawn instead of stick figure) ──
    if (sprite) {
      const spriteH = 260;
      const spriteW = 260;
      const spriteX = cx - spriteW / 2;
      const spriteY = groundY - spriteH;

      // Animated pose offsets (rise and fall with poseEase)
      let offsetX = 0, offsetY = idleBob;
      if (pose === "big_hit") { offsetX = -facing * 32 * poseEase; offsetY += 10 * poseEase; }
      else if (pose === "melee_attack") { offsetX = facing * 22 * poseEase; }
      else if (pose === "hit") { offsetX = -facing * 16 * poseEase; }
      else if (pose === "ranged_attack") { offsetY -= 10 * poseEase; }
      else if (pose === "victory") { offsetY -= 8 * Math.abs(Math.sin(animTime * 0.003)); }

      // Pose-driven scale: attack = bigger, hit = shrink, victory = gentle pulse
      let poseScale = 1;
      if (pose === "melee_attack") poseScale = 1 + 0.07 * poseEase;
      else if (pose === "ranged_attack") poseScale = 1 + 0.04 * poseEase;
      else if (pose === "hit") poseScale = 1 - 0.06 * poseEase;
      else if (pose === "big_hit") poseScale = 1 - 0.1 * poseEase;
      else if (pose === "victory") poseScale = 1 + 0.03 * Math.abs(Math.sin(animTime * 0.003));

      ctx.save();
      // Flip horizontally for defender (facing left)
      if (facing === -1) {
        ctx.translate(cx * 2, 0);
        ctx.scale(-1, 1);
      }
      // Apply pose offset
      ctx.translate(offsetX * facing, offsetY);

      // Scale from bottom-center (ground-pin)
      if (poseScale !== 1) {
        ctx.translate(cx, groundY);
        ctx.scale(poseScale, poseScale);
        ctx.translate(-cx, -groundY);
      }

      // Glow halo behind sprite — brighter during attacks
      const haloAlpha = (pose === "melee_attack" || pose === "ranged_attack") ? 0.38 : 0.22;
      const halo = ctx.createRadialGradient(cx, groundY - spriteH * 0.5, 30, cx, groundY - spriteH * 0.5, 140);
      halo.addColorStop(0, glowColor.replace(/[\d.]+\)$/, `${haloAlpha})`));
      halo.addColorStop(1, "transparent");
      ctx.fillStyle = halo;
      ctx.fillRect(spriteX - 60, spriteY - 40, spriteW + 120, spriteH + 60);

      // Draw sprite
      ctx.globalCompositeOperation = "source-over";
      ctx.drawImage(sprite, spriteX, spriteY, spriteW, spriteH);

      // Team color tint
      ctx.globalCompositeOperation = "color";
      ctx.globalAlpha = 0.22;
      ctx.fillStyle = bodyColor;
      ctx.fillRect(spriteX, spriteY, spriteW, spriteH);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";

      // Hit flash: red overlay pulse when taking damage
      if ((pose === "hit" || pose === "big_hit") && poseEase > 0.05) {
        ctx.globalCompositeOperation = "source-over";
        ctx.globalAlpha = 0.55 * poseEase;
        ctx.fillStyle = pose === "big_hit" ? "#ff0000" : "#cc2200";
        ctx.fillRect(spriteX, spriteY, spriteW, spriteH);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = "source-over";
      }

      // Attack charge: bright white flash at peak of attack
      if ((pose === "melee_attack" || pose === "ranged_attack") && poseEase > 0.7) {
        ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha = (poseEase - 0.7) / 0.3 * 0.18;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(spriteX, spriteY, spriteW, spriteH);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = "source-over";
      }

      // Avatar face overlay in head area (top-center of sprite)
      if (avatar) {
        const faceR = 26;
        const faceCX = cx;
        const faceCY = spriteY + 40;
        ctx.save();
        ctx.beginPath(); ctx.arc(faceCX, faceCY, faceR, 0, Math.PI * 2); ctx.clip();
        ctx.drawImage(avatar, faceCX - faceR, faceCY - faceR, faceR * 2, faceR * 2);
        ctx.restore();
        ctx.beginPath(); ctx.arc(faceCX, faceCY, faceR, 0, Math.PI * 2);
        ctx.strokeStyle = bodyColor; ctx.lineWidth = 2; ctx.shadowColor = glowColor; ctx.shadowBlur = 8;
        ctx.stroke(); ctx.shadowBlur = 0;
      }

      ctx.restore();

      // Name tag
      ctx.textAlign = "center";
      ctx.font = "700 12px Impact, Arial Black, sans-serif";
      ctx.fillStyle = "rgba(232,212,184,0.85)";
      ctx.fillText(`${displayName} · ${score}pts`, cx, groundY + 26);
      return; // skip stick figure
    }

    // Back leg
    ctx.save(); ctx.strokeStyle = "rgba(15,0,5,0.92)"; ctx.lineWidth = limbW - 2; ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(bx + backLegX2, waistY + by);
    ctx.lineTo(bx + backLegX2 * 0.6, kneeY + by + 4);
    ctx.lineTo(bx + backLegX2 * 0.8, groundY);
    ctx.stroke(); ctx.restore();

    // Back arm
    ctx.save(); ctx.strokeStyle = "rgba(10,0,3,0.88)"; ctx.lineWidth = limbW - 4; ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(bx + backArmX, shoulderY + by);
    ctx.lineTo(bx + backArmEndX, backArmEndY + by);
    ctx.stroke(); ctx.restore();

    // Torso
    ctx.beginPath();
    ctx.moveTo(bx - shoulderW / 2, shoulderY + by);
    ctx.lineTo(bx + shoulderW / 2, shoulderY + by);
    ctx.lineTo(bx + waistW / 2, waistY + by);
    ctx.lineTo(bx - waistW / 2, waistY + by);
    ctx.closePath();
    const tg2 = ctx.createLinearGradient(bx - shoulderW / 2, 0, bx + shoulderW / 2, 0);
    tg2.addColorStop(0, "rgba(6,0,2,0.96)");
    tg2.addColorStop(0.5, `${bodyColor}28`);
    tg2.addColorStop(1, "rgba(4,0,1,0.96)");
    ctx.fillStyle = tg2; ctx.fill();
    ctx.strokeStyle = bodyColor; ctx.lineWidth = 2.5;
    ctx.shadowColor = glowColor; ctx.shadowBlur = 12;
    ctx.stroke(); ctx.shadowBlur = 0;

    // Chest emblem dot
    ctx.beginPath(); ctx.arc(bx, shoulderY + torsoH * 0.38 + by, 5, 0, Math.PI * 2);
    ctx.fillStyle = bodyColor; ctx.shadowColor = glowColor; ctx.shadowBlur = 10;
    ctx.fill(); ctx.shadowBlur = 0;

    // Front leg
    ctx.save(); ctx.strokeStyle = "rgba(8,0,2,0.95)"; ctx.lineWidth = limbW; ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(bx + frontLegX2, waistY + by);
    ctx.lineTo(bx + frontLegX2 * 0.9, kneeY + by);
    ctx.lineTo(bx + frontLegX2 * 1.1, groundY);
    ctx.stroke();
    ctx.strokeStyle = bodyColor; ctx.lineWidth = 2; ctx.shadowColor = glowColor; ctx.shadowBlur = 7;
    ctx.stroke(); ctx.shadowBlur = 0; ctx.restore();

    // Front arm
    ctx.save(); ctx.strokeStyle = "rgba(8,0,2,0.95)"; ctx.lineWidth = limbW - 2; ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(bx + frontArmX, shoulderY + by);
    const elbX = bx + frontArmEndX * 0.55 + frontArmX * 0.45;
    const elbY = (shoulderY + by + frontArmEndY + by) * 0.5 + 8;
    ctx.quadraticCurveTo(elbX, elbY, bx + frontArmEndX, frontArmEndY + by);
    ctx.stroke();
    ctx.strokeStyle = bodyColor; ctx.lineWidth = 2; ctx.shadowColor = glowColor; ctx.shadowBlur = 8;
    ctx.stroke(); ctx.shadowBlur = 0;
    // Fist
    ctx.beginPath(); ctx.arc(bx + frontArmEndX, frontArmEndY + by, 10, 0, Math.PI * 2);
    ctx.fillStyle = bodyColor; ctx.shadowColor = glowColor; ctx.shadowBlur = 14;
    ctx.fill(); ctx.shadowBlur = 0; ctx.restore();

    // Head
    const hx = bx + headOffX, hy = headY + by;
    ctx.save(); ctx.beginPath(); ctx.arc(hx, hy, headR, 0, Math.PI * 2);
    if (avatar) {
      ctx.clip();
      ctx.drawImage(avatar, hx - headR, hy - headR, headR * 2, headR * 2);
    } else {
      ctx.fillStyle = "rgba(12,2,4,0.95)"; ctx.fill();
      // Eyes
      ctx.fillStyle = bodyColor; ctx.shadowColor = glowColor; ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.arc(hx + f * 7, hy - 5, 4, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(hx - f * 3, hy - 5, 3, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
    }
    ctx.restore();
    // Head border
    ctx.beginPath(); ctx.arc(hx, hy, headR, 0, Math.PI * 2);
    ctx.strokeStyle = bodyColor; ctx.lineWidth = 2.5; ctx.shadowColor = glowColor; ctx.shadowBlur = 14;
    ctx.stroke(); ctx.shadowBlur = 0;

    // Name tag
    ctx.textAlign = "center";
    ctx.font = "700 12px Impact, Arial Black, sans-serif";
    ctx.fillStyle = "rgba(232,212,184,0.8)";
    ctx.fillText(`${displayName} · ${score}pts`, cx, groundY + 26);
  };

  drawFighterFigure(285, floorY, 1, playerPose, "#cc0000", "rgba(255,30,0,0.85)", playerAvatar, playerSprite, battle.player.displayName, replayState.playerScore, 0);
  drawFighterFigure(W - 285, floorY, -1, defenderPose, "#c8900a", "rgba(255,200,0,0.8)", defenderAvatar, defenderSprite, battle.defender.displayName, replayState.defenderScore, Math.PI);

  // ── 4. ATTACK EFFECTS ──────────────────────────────────────────
  const isWeaknessHit = evType === "weakness_hit";
  const isMeleeHit = evType === "attack";

  if (isWeaknessHit) {
    // Screen-edge vignette
    const vig = ctx.createRadialGradient(W / 2, H / 2, H * 0.18, W / 2, H / 2, H * 0.88);
    vig.addColorStop(0, "transparent");
    vig.addColorStop(0.6, "rgba(140,0,0,0.08)");
    vig.addColorStop(1, "rgba(255,0,0,0.45)");
    ctx.fillStyle = vig; ctx.fillRect(0, 0, W, H);

    // Energy orb / projectile
    const fromX = actorIsPlayer ? 360 : W - 360;
    const toX = actorIsPlayer ? W - 285 : 285;
    const orbY = floorY - 170;
    const orbX = (fromX + toX) / 2;
    const orbGlow2 = ctx.createRadialGradient(orbX, orbY, 0, orbX, orbY, 65);
    orbGlow2.addColorStop(0, "rgba(255,220,0,0.9)");
    orbGlow2.addColorStop(0.35, "rgba(255,80,0,0.45)");
    orbGlow2.addColorStop(1, "transparent");
    ctx.fillStyle = orbGlow2; ctx.fillRect(orbX - 65, orbY - 65, 130, 130);
    ctx.beginPath(); ctx.arc(orbX, orbY, 20, 0, Math.PI * 2);
    ctx.fillStyle = "#ffd700"; ctx.shadowColor = "rgba(255,215,0,1)"; ctx.shadowBlur = 30;
    ctx.fill(); ctx.shadowBlur = 0;
    // Orb trail
    ctx.save(); ctx.strokeStyle = "rgba(255,160,0,0.45)"; ctx.lineWidth = 10; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(fromX, orbY + 30); ctx.quadraticCurveTo((fromX + orbX) / 2, orbY - 25, orbX, orbY);
    ctx.stroke(); ctx.restore();

    // Lightning arc
    const lx1 = actorIsPlayer ? 360 : W - 360;
    const lx2 = actorIsPlayer ? W - 260 : 260;
    const ly2 = floorY - 155;
    const zigPts: [number, number][] = [[lx1, ly2]];
    for (let i = 1; i < 10; i++) {
      const t = i / 10;
      zigPts.push([lx1 + (lx2 - lx1) * t, ly2 + (i % 2 === 0 ? 28 : -28)]);
    }
    zigPts.push([lx2, ly2]);
    ctx.save();
    ctx.strokeStyle = "#ffd700"; ctx.lineWidth = 4.5; ctx.shadowColor = "rgba(255,215,0,1)"; ctx.shadowBlur = 26;
    ctx.beginPath(); ctx.moveTo(zigPts[0][0], zigPts[0][1]);
    zigPts.slice(1).forEach(([x, y]) => ctx.lineTo(x, y));
    ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,0.88)"; ctx.lineWidth = 1.5; ctx.shadowBlur = 5;
    ctx.beginPath(); ctx.moveTo(zigPts[0][0], zigPts[0][1]);
    zigPts.slice(1).forEach(([x, y]) => ctx.lineTo(x, y));
    ctx.stroke(); ctx.restore();

    // Impact ring
    const impX = actorIsPlayer ? W - 285 : 285;
    const impY = floorY - 165;
    for (const r of [55, 35]) {
      ctx.beginPath(); ctx.arc(impX, impY, r, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255,215,0,${0.65 - r * 0.007})`; ctx.lineWidth = 3;
      ctx.shadowColor = "rgba(255,215,0,0.7)"; ctx.shadowBlur = 12; ctx.stroke(); ctx.shadowBlur = 0;
    }

  } else if (isMeleeHit) {
    // Melee impact sparks
    const impX2 = actorIsPlayer ? 480 : W - 480;
    const impY2 = floorY - 180;
    for (const r of [16, 34, 52]) {
      ctx.beginPath(); ctx.arc(impX2, impY2, r, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255,70,0,${0.65 - r * 0.009})`; ctx.lineWidth = 3;
      ctx.shadowColor = "rgba(255,50,0,0.6)"; ctx.shadowBlur = 10; ctx.stroke(); ctx.shadowBlur = 0;
    }
    // Spark rays
    const sparkA = [0, 0.45, 1.0, 1.6, 2.2, 2.8, 3.4, 4.0, 4.7, 5.3];
    for (const a of sparkA) {
      const len = 22 + Math.sin(a * 2.7) * 14;
      ctx.beginPath();
      ctx.moveTo(impX2 + Math.cos(a) * 14, impY2 + Math.sin(a) * 14);
      ctx.lineTo(impX2 + Math.cos(a) * (14 + len), impY2 + Math.sin(a) * (14 + len));
      ctx.strokeStyle = Math.sin(a) > 0 ? "#ff4400" : "#ffd060";
      ctx.lineWidth = 2.5; ctx.shadowColor = "rgba(255,100,0,0.8)"; ctx.shadowBlur = 8;
      ctx.stroke(); ctx.shadowBlur = 0;
    }
  }

  // ── 5. EVENT TEXT PANEL ────────────────────────────────────────
  ctx.fillStyle = "rgba(0,0,0,0.7)"; ctx.fillRect(0, H - 98, W, 98);
  ctx.fillStyle = "rgba(140,0,0,0.5)"; ctx.fillRect(0, H - 100, W, 2);

  ctx.textAlign = "center";
  if (isWeaknessHit) {
    ctx.font = "700 44px Impact, Arial Black, sans-serif";
    ctx.fillStyle = "#ffd700"; ctx.shadowColor = "rgba(255,100,0,0.95)"; ctx.shadowBlur = 30;
    ctx.fillText("WEAKNESS HIT", W / 2, H - 56); ctx.shadowBlur = 0;
  } else {
    ctx.font = `700 ${evType === "attack" ? 34 : 30}px Impact, Arial Black, sans-serif`;
    ctx.fillStyle = isMeleeHit ? "#ff4400" : "#e8d4b8";
    ctx.shadowColor = "rgba(200,0,0,0.65)"; ctx.shadowBlur = 14;
    ctx.fillText(currentEvent?.title ?? "STAND BY", W / 2, H - 58); ctx.shadowBlur = 0;
  }
  ctx.font = "500 14px 'Courier New', monospace";
  ctx.fillStyle = "rgba(232,212,184,0.72)";
  ctx.fillText(currentEvent?.description ?? "等待战斗数据载入。", W / 2, H - 30, W - 180);
  ctx.textAlign = "left";
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

// Mini stat bar for replay sidebar
function MiniStatBar({ label, value, max, accent }: { label: string; value: number; max: number; accent: string }) {
  return (
    <div className="flex items-center gap-2">
      <span style={{ fontFamily: "'Courier New', monospace", fontSize: '0.6rem', color: 'var(--text-muted)', width: '2.2rem', flexShrink: 0, textAlign: 'right' }}>{label}</span>
      <div style={{ flex: 1, height: '5px', background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(60,0,0,0.25)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${Math.round((value / max) * 100)}%`, background: accent, transition: 'width 350ms ease' }} />
      </div>
      <span style={{ fontFamily: "'Courier New', monospace", fontSize: '0.6rem', color: 'var(--text-dim)', width: '1.5rem' }}>{value}</span>
    </div>
  );
}

// Soul stats mini block for replay
function SoulMiniBlock({ soul, accent }: { soul: SoulStats; accent: string }) {
  return (
    <div className="flex flex-col gap-1">
      {(Object.keys(soulLabels) as SoulStatKey[]).map((key) => (
        <MiniStatBar key={key} label={soulLabels[key]} value={soul[key]} max={99} accent={accent} />
      ))}
    </div>
  );
}

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
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const playerAvatarRef = useRef<HTMLImageElement | null>(null);
  const defenderAvatarRef = useRef<HTMLImageElement | null>(null);
  const playerSpriteRef = useRef<HTMLImageElement | null>(null);
  const defenderSpriteRef = useRef<HTMLImageElement | null>(null);
  const animFrameRef = useRef(0);
  const replayStateRef = useRef<ReplayState | null>(null);
  const poseStartTimeRef = useRef(0);
  const lastPlayheadRef = useRef(-1);
  const avatarImageCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const [battle, setBattle] = useState<BattlePackage | null>(null);
  const [playhead, setPlayhead] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [winnerProfile, setWinnerProfile] = useState<ArenaCompetitorProfile | null>(null);
  const [rematchPending, setRematchPending] = useState(false);
  const [audienceMembers, setAudienceMembers] = useState<AudienceMemberCanvas[]>([]);
  const [liveStartAt, setLiveStartAt] = useState<string | null>(null);
  const [goLivePending, setGoLivePending] = useState(false);

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

  // Load fighter avatars + AI sprites from localStorage (alpha=player, beta=defender)
  useEffect(() => {
    const loadImg = (key: string, ref: React.MutableRefObject<HTMLImageElement | null>) => {
      const dataUrl = localStorage.getItem(key);
      if (!dataUrl) return;
      const img = new Image();
      img.onload = () => { ref.current = img; };
      img.src = dataUrl;
    };
    loadImg("soul-arena:avatar:alpha", playerAvatarRef);
    loadImg("soul-arena:avatar:beta", defenderAvatarRef);
    loadImg("soul-arena:sprite:alpha", playerSpriteRef);
    loadImg("soul-arena:sprite:beta", defenderSpriteRef);
  }, []);

  const winnerCompetitorId = useMemo(() => {
    if (!battle?.competition) {
      return null;
    }

    return battle.winnerId === battle.player.id
      ? battle.competition.player?.competitorId ?? null
      : battle.competition.defender?.competitorId ?? null;
  }, [battle]);


  useEffect(() => {
    if (!battle?.competition) {
      setWinnerProfile(null);
      return;
    }

    const competitorId =
      battle.winnerId === battle.player.id
        ? battle.competition.player?.competitorId
        : battle.competition.defender?.competitorId;

    if (!competitorId) {
      return;
    }

    void (async () => {
      const response = await fetch(`/api/arena/profile?competitorId=${encodeURIComponent(competitorId)}`, { cache: "no-store" }).catch(() => null);
      if (!response?.ok) {
        return;
      }
      const data = (await response.json()) as ProfileResponse;
      setWinnerProfile(data.profiles[0]?.profile ?? null);
    })();
  }, [battle]);

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
    if (!battle?.competition) return null;
    return battle.winnerId === battle.player.id ? battle.competition.player : battle.competition.defender;
  }, [battle]);
  const loserCompetition = useMemo(() => {
    if (!battle?.competition) return null;
    return battle.winnerId === battle.player.id ? battle.competition.defender : battle.competition.player;
  }, [battle]);

  // Fetch audience members every 10 seconds
  useEffect(() => {
    const fetchAudience = () => {
      void fetch("/api/arena/audience", { cache: "no-store" })
        .then((res) => (res.ok ? res.json() : null))
        .then((data: { members: Array<{ id: string; displayName: string; avatarDataUrl: string | null }> } | null) => {
          if (!data?.members) return;
          setAudienceMembers((prev) => {
            const existingMap = new Map(prev.map((m) => [m.id, m]));
            return data.members.map((m) => {
              const existing = existingMap.get(m.id);
              if (existing) return existing;
              // Decode avatar if available
              if (m.avatarDataUrl && !avatarImageCacheRef.current.has(m.id)) {
                const img = new Image();
                img.onload = () => { avatarImageCacheRef.current.set(m.id, img); };
                img.src = m.avatarDataUrl;
              }
              return {
                id: m.id,
                displayName: m.displayName,
                avatarDataUrl: m.avatarDataUrl,
                seatX: 20 + Math.random() * (1280 - 40),
                seatRow: Math.floor(Math.random() * 3),
                bobPhase: Math.random() * Math.PI * 2,
              };
            });
          });
        })
        .catch(() => null);
    };
    fetchAudience();
    const interval = setInterval(fetchAudience, 10_000);
    return () => clearInterval(interval);
  }, []);

  // Poll live session for auto-start
  useEffect(() => {
    const poll = () => {
      void fetch("/api/arena/live", { cache: "no-store" })
        .then((res) => (res.ok ? res.json() : null))
        .then((data: { battleId: string | null; startAt: string | null; secondsUntilStart: number | null } | null) => {
          if (!data?.startAt) return;
          setLiveStartAt(data.startAt);
          // If the startAt has arrived and we have a matching battle, auto-start playback
          if (data.secondsUntilStart !== null && data.secondsUntilStart <= 0) {
            setIsPlaying(true);
            setPlayhead(0);
          }
        })
        .catch(() => null);
    };
    poll();
    const interval = setInterval(poll, 3_000);
    return () => clearInterval(interval);
  }, []);

  // Keep latest replayState accessible inside RAF without closure capture
  useEffect(() => { replayStateRef.current = replayState; }, [replayState]);

  // Track pose start time whenever playhead advances (new battle event)
  useEffect(() => {
    if (playhead !== lastPlayheadRef.current) {
      poseStartTimeRef.current = performance.now();
      lastPlayheadRef.current = playhead;
    }
  }, [playhead]);

  // RAF animation loop — runs continuously while battle is loaded
  const startLoop = useCallback(() => {
    const loop = (time: number) => {
      const rs = replayStateRef.current;
      if (canvasRef.current && rs && battle) {
        const poseAge = time - poseStartTimeRef.current;
        drawStage(
          canvasRef.current, battle, rs,
          playerAvatarRef.current, defenderAvatarRef.current,
          playerSpriteRef.current, defenderSpriteRef.current,
          time, poseAge,
          audienceMembers,
          avatarImageCacheRef.current,
        );
      }
      animFrameRef.current = requestAnimationFrame(loop);
    };
    animFrameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [battle, audienceMembers]);

  useEffect(() => startLoop(), [startLoop]);

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

  const startRecording = () => {
    if (!canvasRef.current || !canRecord) {
      return;
    }

    const stream = canvasRef.current.captureStream(30);
    const mimeType = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"].find((item) => MediaRecorder.isTypeSupported(item));
    const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);

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

  const handleRematch = async () => {
    if (!battle) {
      return;
    }

    setRematchPending(true);
    try {
      const payload = await fetch("/api/arena/rematch", {
        body: JSON.stringify({ battleId: battle.id }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });

      if (!payload.ok) {
        throw new Error("创建 rematch 失败");
      }

      const data = (await payload.json()) as RematchResponse;
      router.push(`/arena?setupId=${data.setup.id}`);
    } finally {
      setRematchPending(false);
    }
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
              <button
                className="mk-button px-4 py-3"
                disabled={goLivePending}
                onClick={() => {
                  setGoLivePending(true);
                  void fetch("/api/arena/live", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ battleId: battle.id, delaySeconds: 5 }),
                  })
                    .then((res) => res.ok ? res.json() : null)
                    .then((data: { startAt: string } | null) => {
                      if (data?.startAt) setLiveStartAt(data.startAt);
                    })
                    .catch(() => null)
                    .finally(() => setGoLivePending(false));
                }}
                type="button"
                style={{ background: liveStartAt ? 'var(--gold-dim)' : undefined }}
              >
                {goLivePending ? "设置中..." : liveStartAt ? "已开播 ✓" : "Go Live"}
              </button>
              <button className="soft-button rounded-full border border-[var(--line)] bg-white/70 px-4 py-3 text-sm" disabled={rematchPending} onClick={() => void handleRematch()} type="button">
                {rematchPending ? "创建中..." : "以此为模板重开"}
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
                  {(battle.setupId ?? battle.sourceMeta?.setupId) ? (
                    <p style={{ marginTop: '4px' }}>配置 ID：{battle.setupId ?? battle.sourceMeta?.setupId}</p>
                  ) : null}
                  {(battle.originBattleId ?? battle.sourceMeta?.originBattleId) ? (
                    <p>来源对局：{battle.originBattleId ?? battle.sourceMeta?.originBattleId}</p>
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

            {/* Active card + soul for current round */}
            {replayState.round >= 1 && (() => {
              const round = replayState.round;
              const playerCard = battle.player.cards[(round - 1) % battle.player.cards.length];
              const defenderCard = battle.defender.cards[(round + 1) % battle.defender.cards.length];
              if (!playerCard && !defenderCard) return null;
              return (
                <article className="entry-fade mk-panel p-5">
                  <div className="mk-label-red mb-3">本回合装备卡</div>
                  <div className="grid gap-3" style={{ gridTemplateColumns: '1fr 1fr' }}>
                    {[{ card: playerCard, fighter: battle.player, isPlayer: true }, { card: defenderCard, fighter: battle.defender, isPlayer: false }].map(({ card, fighter, isPlayer }) => {
                      if (!card) return null;
                      const accent = isPlayer ? 'var(--red)' : 'var(--gold)';
                      return (
                        <div key={fighter.id} style={{ background: 'rgba(0,0,0,0.4)', border: `1px solid rgba(60,0,0,0.22)`, borderTop: `2px solid ${accent}`, padding: '8px' }}>
                          <p style={{ fontFamily: 'Impact, Arial Black, sans-serif', fontSize: '0.62rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: accent, marginBottom: '4px' }}>
                            {fighter.displayName}
                          </p>
                          <p style={{ fontFamily: 'Impact, Arial Black, sans-serif', fontSize: '0.75rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-bright)', marginBottom: '3px' }}>
                            {card.title}
                          </p>
                          <p style={{ fontFamily: "'Courier New', monospace", fontSize: '0.6rem', color: accent, marginBottom: '6px' }}>
                            {card.trait}
                          </p>
                          <div className="flex flex-col gap-1">
                            <MiniStatBar label="ATK" value={card.atk} max={20} accent="var(--red)" />
                            <MiniStatBar label="DEF" value={card.def} max={20} accent="var(--gold-dim)" />
                            <MiniStatBar label="PEN" value={card.pen} max={18} accent="#7a00cc" />
                            <MiniStatBar label="SPD" value={card.spd} max={18} accent="#006fa8" />
                          </div>
                          <p style={{ fontFamily: "'Courier New', monospace", fontSize: '0.58rem', color: 'var(--text-muted)', marginTop: '5px', lineHeight: '1.5' }}>
                            {card.hint}
                          </p>
                        </div>
                      );
                    })}
                  </div>

                  {/* Soul stats comparison */}
                  <div className="grid gap-3 mt-3" style={{ gridTemplateColumns: '1fr 1fr' }}>
                    {[{ fighter: battle.player, isPlayer: true }, { fighter: battle.defender, isPlayer: false }].map(({ fighter, isPlayer }) => (
                      <div key={fighter.id}>
                        <p style={{ fontFamily: 'Impact, Arial Black, sans-serif', fontSize: '0.6rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: isPlayer ? 'var(--red)' : 'var(--gold)', marginBottom: '5px' }}>
                          魂核
                        </p>
                        <SoulMiniBlock soul={fighter.soul} accent={isPlayer ? 'var(--red)' : 'var(--gold)'} />
                      </div>
                    ))}
                  </div>
                </article>
              );
            })()}

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
