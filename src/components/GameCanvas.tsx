import React, { useEffect, useRef, useCallback } from 'react';
import { Difficulty, GameProgress, BikeConfig, TrafficVehicle, Collectible, RoadHazard, Particle, FloatingText, PlayerState, RunStats } from '../types/game';
import { DIFFICULTY_CONFIGS, BIKES } from '../utils/storage';
import { soundManager } from '../utils/audio';

interface GameCanvasProps {
  difficulty: Difficulty;
  progress: GameProgress;
  isPaused: boolean;
  onGameOver: (stats: RunStats) => void;
  onUpdateHUD: (hudData: {
    score: number;
    speed: number;
    distance: number;
    boostFuel: number;
    isBoosting: boolean;
    stageName: string;
    hasShield: boolean;
  }) => void;
  // External inputs from touch buttons or keyboard
  externalInput: {
    steerLeft: boolean;
    steerRight: boolean;
    boost: boolean;
    jump: boolean;
    brake: boolean;
  };
}

// 4 Dynamic Road Color Themes: Blue -> Yellow -> Green -> White
interface RoadPalette {
  name: string;
  badge: string;
  horizonTop: [number, number, number];
  horizonBottom: [number, number, number];
  asphalt: [number, number, number];
  neonPrimary: [number, number, number];
  neonSecondary: [number, number, number];
  markingColor: [number, number, number];
}

const ROAD_PALETTES: RoadPalette[] = [
  // 1. Electric Blue
  {
    name: 'Electric Blue Rush',
    badge: '⚡ BLUE SECTOR',
    horizonTop: [4, 10, 30],
    horizonBottom: [10, 26, 60],
    asphalt: [12, 19, 36],
    neonPrimary: [0, 215, 255],     // Bright Cyan Blue
    neonSecondary: [37, 99, 235],    // Sapphire
    markingColor: [147, 197, 253],  // Ice Blue
  },
  // 2. Golden Yellow
  {
    name: 'Golden Yellow Speedway',
    badge: '★ YELLOW HIGHWAY',
    horizonTop: [24, 18, 4],
    horizonBottom: [48, 34, 6],
    asphalt: [24, 21, 16],
    neonPrimary: [250, 204, 21],    // Electric Yellow
    neonSecondary: [245, 158, 11],  // Warm Gold
    markingColor: [254, 240, 138],  // Amber White
  },
  // 3. Emerald Green
  {
    name: 'Emerald Green Matrix',
    badge: '◈ GREEN MATRIX',
    horizonTop: [3, 22, 15],
    horizonBottom: [6, 44, 28],
    asphalt: [10, 25, 20],
    neonPrimary: [16, 185, 129],    // Laser Green
    neonSecondary: [34, 197, 94],   // Emerald
    markingColor: [110, 231, 183],  // Mint Green
  },
  // 4. Hyper White / Platinum
  {
    name: 'Hyper White Cyberway',
    badge: '✦ WHITE SPEEDWAY',
    horizonTop: [14, 18, 28],
    horizonBottom: [28, 38, 54],
    asphalt: [19, 24, 32],
    neonPrimary: [255, 255, 255],   // Pure White
    neonSecondary: [203, 213, 225], // Platinum Silver
    markingColor: [255, 255, 255],  // Bright White
  },
];

function lerpRGB(c1: [number, number, number], c2: [number, number, number], t: number): [number, number, number] {
  return [
    Math.round(c1[0] + (c2[0] - c1[0]) * t),
    Math.round(c1[1] + (c2[1] - c1[1]) * t),
    Math.round(c1[2] + (c2[2] - c1[2]) * t),
  ];
}

function rgbToString(c: [number, number, number], alpha = 1): string {
  return alpha === 1 ? `rgb(${c[0]}, ${c[1]}, ${c[2]})` : `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${alpha})`;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  difficulty,
  progress,
  isPaused,
  onGameOver,
  onUpdateHUD,
  externalInput,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Active bike config
  const activeBike: BikeConfig = BIKES.find((b) => b.id === progress.selectedBikeId) || BIKES[0];
  const diffConfig = DIFFICULTY_CONFIGS[difficulty];

  // Game internal state references to avoid stale closure in animation loop
  const stateRef = useRef({
    score: 0,
    distanceMeters: 0,
    coinsCollected: 0,
    nearMisses: 0,
    maxSpeedAchieved: 0,
    startTime: Date.now(),
    isGameOver: false,

    // Road scroll offset
    roadOffset: 0,
    roadMarkingOffset: 0,

    // Active color theme interpolation
    currentColorIndex: 0,
    lastAnnouncedColorIndex: -1,

    // Player state
    player: {
      x: 0.5, // 0 to 1 normalized road width
      y: 0.78, // normalized vertical position
      width: 44,
      height: 78,
      speed: diffConfig.baseSpeed,
      targetX: 0.5,
      leanAngle: 0,
      isJumping: false,
      jumpProgress: 0,
      isBoosting: false,
      boostFuel: 100,
      hasShield: false,
      invulnerableTime: 0,
    } as PlayerState,

    // World entities
    traffic: [] as TrafficVehicle[],
    collectibles: [] as Collectible[],
    hazards: [] as RoadHazard[],
    particles: [] as Particle[],
    floatingTexts: [] as FloatingText[],
    roadsidePylons: [] as { id: number; y: number }[],

    // Timers
    lastTrafficSpawn: 0,
    lastCollectibleSpawn: 0,
    lastHazardSpawn: 0,
    lastPylonSpawn: 0,

    // Touch dragging tracking
    isTouching: false,
    touchScreenX: 0,
    touchScreenY: 0,
    lastTapTime: 0,
    touchStartY: 0,

    // Screen dimensions
    width: 400,
    height: 700,
    roadLeft: 40,
    roadRight: 360,
    roadWidth: 320,
    laneWidth: 80,
  });

  const nextEntityId = useRef(1);

  // Haptic trigger helper
  const triggerHaptic = useCallback((pattern: number | number[]) => {
    if (progress.vibrationEnabled && typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch {
        // Ignore
      }
    }
  }, [progress.vibrationEnabled]);

  // Handle Jump trigger
  const triggerJump = useCallback(() => {
    const s = stateRef.current;
    if (s.player.isJumping || s.isGameOver) return;
    s.player.isJumping = true;
    s.player.jumpProgress = 0;
    soundManager.playJump();
    triggerHaptic(25);
  }, [triggerHaptic]);

  // Watch for external jump input
  useEffect(() => {
    if (externalInput.jump) {
      triggerJump();
    }
  }, [externalInput.jump, triggerJump]);

  // Main Game Loop Effect
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    let animationFrameId: number;
    let lastTime = performance.now();

    // Start engine hum
    soundManager.startEngine();

    // Resize handler
    const updateSize = () => {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2.5);

      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);

      const s = stateRef.current;
      s.width = rect.width;
      s.height = rect.height;

      // Responsive road: 88% width on phone, max 460px
      const maxRoadW = Math.min(rect.width * 0.88, 460);
      s.roadWidth = Math.max(maxRoadW, 260);
      s.roadLeft = (rect.width - s.roadWidth) / 2;
      s.roadRight = s.roadLeft + s.roadWidth;
      s.laneWidth = s.roadWidth / 4;
    };

    updateSize();
    window.addEventListener('resize', updateSize);

    // Spawn Helper Functions
    const spawnTraffic = (now: number) => {
      const s = stateRef.current;
      const interval = Math.max(diffConfig.trafficInterval - (s.distanceMeters / 1500) * 120, 500);
      if (now - s.lastTrafficSpawn < interval) return;
      s.lastTrafficSpawn = now;

      // Choose a lane (0, 1, 2, 3)
      const lane = Math.floor(Math.random() * 4);
      const hasCloseVehicle = s.traffic.some((v) => v.lane === lane && v.y < 120);
      if (hasCloseVehicle) return;

      const types: ('sedan' | 'suv' | 'sports' | 'truck')[] = ['sedan', 'sports', 'suv', 'truck'];
      const weights = difficulty === 'hard' ? [0.3, 0.3, 0.2, 0.2] : [0.45, 0.3, 0.15, 0.1];
      const rand = Math.random();
      let type: 'sedan' | 'suv' | 'sports' | 'truck' = 'sedan';
      let cumulative = 0;
      for (let i = 0; i < types.length; i++) {
        cumulative += weights[i];
        if (rand <= cumulative) {
          type = types[i];
          break;
        }
      }

      const colors = ['#f43f5e', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#6366f1', '#e2e8f0'];
      const color = colors[Math.floor(Math.random() * colors.length)];

      const speedBase = diffConfig.trafficSpeedMin + Math.random() * (diffConfig.trafficSpeedMax - diffConfig.trafficSpeedMin);
      const vehicleSpeed = type === 'truck' ? speedBase * 0.75 : type === 'sports' ? speedBase * 1.2 : speedBase;

      const vehicleWidth = type === 'truck' ? s.laneWidth * 0.72 : s.laneWidth * 0.62;
      const vehicleHeight = type === 'truck' ? 120 : type === 'suv' ? 84 : 74;

      const laneCenterX = s.roadLeft + lane * s.laneWidth + s.laneWidth / 2;

      s.traffic.push({
        id: nextEntityId.current++,
        lane,
        x: laneCenterX - vehicleWidth / 2,
        y: -vehicleHeight - 20,
        width: vehicleWidth,
        height: vehicleHeight,
        speed: vehicleSpeed,
        type,
        color,
        isChangingLane: false,
      });
    };

    const spawnCollectible = (now: number) => {
      const s = stateRef.current;
      if (now - s.lastCollectibleSpawn < 1200) return;
      s.lastCollectibleSpawn = now;

      const rand = Math.random();
      const type: 'coin' | 'boost' | 'shield' = rand < 0.7 ? 'coin' : rand < 0.9 ? 'boost' : 'shield';

      const lane = Math.floor(Math.random() * 4);
      const laneCenterX = s.roadLeft + lane * s.laneWidth + s.laneWidth / 2;

      s.collectibles.push({
        id: nextEntityId.current++,
        lane,
        x: laneCenterX,
        y: -40,
        type,
        collected: false,
        pulseTimer: 0,
      });
    };

    const spawnHazard = (now: number) => {
      const s = stateRef.current;
      if (difficulty === 'easy' && s.distanceMeters < 1200) return;
      const interval = difficulty === 'hard' ? 3200 : 5000;
      if (now - s.lastHazardSpawn < interval) return;
      s.lastHazardSpawn = now;

      const lane = Math.floor(Math.random() * 4);
      const laneCenterX = s.roadLeft + lane * s.laneWidth + s.laneWidth / 2;
      const type: 'oil' | 'cone' | 'barrier' = Math.random() < 0.5 ? 'oil' : 'cone';

      s.hazards.push({
        id: nextEntityId.current++,
        lane,
        x: laneCenterX - 22,
        y: -50,
        width: 44,
        height: 38,
        type,
      });
    };

    const spawnPylons = (now: number) => {
      const s = stateRef.current;
      if (now - s.lastPylonSpawn < 400) return;
      s.lastPylonSpawn = now;
      s.roadsidePylons.push({
        id: nextEntityId.current++,
        y: -30,
      });
    };

    // Particle Emitter
    const emitParticles = (x: number, y: number, color: string, count = 4, spread = 2, speedY = 4) => {
      const s = stateRef.current;
      for (let i = 0; i < count; i++) {
        s.particles.push({
          x: x + (Math.random() - 0.5) * 8,
          y,
          vx: (Math.random() - 0.5) * spread,
          vy: speedY + Math.random() * 3,
          size: Math.random() * 3.5 + 2,
          color,
          alpha: 1,
          life: 0,
          maxLife: 20 + Math.random() * 15,
        });
      }
    };

    // Floating Text Emitter
    const emitFloatingText = (x: number, y: number, text: string, color: string) => {
      const s = stateRef.current;
      s.floatingTexts.push({
        id: nextEntityId.current++,
        x,
        y,
        text,
        color,
        alpha: 1,
        scale: 1.2,
        life: 0,
      });
    };

    // Main Update Function
    const update = (dt: number, now: number) => {
      const s = stateRef.current;
      if (s.isGameOver || isPaused) return;

      const p = s.player;
      const speedBonusFactor = 1 + activeBike.speedBonus / 100;
      const handlingFactor = 1 + activeBike.handlingBonus / 100;

      // Boost handling
      const wantsBoost = externalInput.boost && p.boostFuel > 0;
      if (wantsBoost) {
        p.isBoosting = true;
        p.boostFuel = Math.max(0, p.boostFuel - 26 * dt);
        if (p.boostFuel <= 0) {
          p.isBoosting = false;
        }
      } else {
        p.isBoosting = false;
        p.boostFuel = Math.min(100, p.boostFuel + diffConfig.boostRechargeRate * dt);
      }

      // Speed Target calculation
      let targetSpeed = diffConfig.baseSpeed * speedBonusFactor;
      if (p.isBoosting) {
        targetSpeed = diffConfig.maxSpeed * speedBonusFactor;
      } else if (externalInput.brake) {
        targetSpeed = diffConfig.baseSpeed * 0.65;
      }

      // Acceleration
      const accelRate = p.isBoosting ? 190 : externalInput.brake ? 250 : 85;
      if (p.speed < targetSpeed) {
        p.speed = Math.min(targetSpeed, p.speed + accelRate * dt);
      } else if (p.speed > targetSpeed) {
        p.speed = Math.max(targetSpeed, p.speed - accelRate * 1.5 * dt);
      }

      if (p.speed > s.maxSpeedAchieved) {
        s.maxSpeedAchieved = p.speed;
      }

      // Audio engine pitch
      const speedRatio = (p.speed - diffConfig.baseSpeed * 0.6) / (diffConfig.maxSpeed - diffConfig.baseSpeed * 0.6);
      soundManager.updateEnginePitch(Math.max(0, Math.min(1, speedRatio)), p.isBoosting);

      // Distance and score
      const metersPerSec = (p.speed * 1000) / 3600;
      const distanceDelta = metersPerSec * dt;
      s.distanceMeters += distanceDelta;
      s.score += distanceDelta * 1.2 * diffConfig.scoreMultiplier;

      // Road Color Cycle Progression:
      // Every 320m changes between Blue -> Yellow -> Green -> White -> Blue
      const colorCycleMeters = 320;
      const totalPalettes = ROAD_PALETTES.length;
      const currentCyclePhase = s.distanceMeters / colorCycleMeters;
      const activeColorIndex = Math.floor(currentCyclePhase) % totalPalettes;
      s.currentColorIndex = activeColorIndex;

      // Announce new road color zone when crossing
      if (activeColorIndex !== s.lastAnnouncedColorIndex && s.distanceMeters > 50) {
        s.lastAnnouncedColorIndex = activeColorIndex;
        const pal = ROAD_PALETTES[activeColorIndex];
        soundManager.playCoin();
        triggerHaptic([30, 40]);
        emitFloatingText(
          s.roadLeft + s.roadWidth / 2,
          s.height * 0.35,
          pal.badge,
          rgbToString(pal.neonPrimary)
        );
      }

      // Road scroll animation
      const scrollPixels = (p.speed / 60) * 130 * dt;
      s.roadOffset = (s.roadOffset + scrollPixels) % 60;
      s.roadMarkingOffset = (s.roadMarkingOffset + scrollPixels) % 80;

      // Keyboard steer fallback for desktop users
      let steerDir = 0;
      if (externalInput.steerLeft) steerDir -= 1;
      if (externalInput.steerRight) steerDir += 1;
      if (steerDir !== 0) {
        const steerSpeed = (0.85 * handlingFactor) * dt;
        p.targetX = Math.max(0.08, Math.min(0.92, p.targetX + steerDir * steerSpeed));
      }

      // Silky Smooth interpolation of bike to touch targetX
      // High responsiveness so touch feels 1:1 and instant
      const lerpSpeed = 16 * handlingFactor * dt;
      p.x += (p.targetX - p.x) * Math.min(1, lerpSpeed);

      // Realistic Lean angle calculation (-1 to +1)
      const diffX = p.targetX - p.x;
      const targetLean = Math.max(-1, Math.min(1, diffX * 14 + steerDir * 0.7));
      p.leanAngle += (targetLean - p.leanAngle) * Math.min(1, 16 * dt);

      // Jump animation
      if (p.isJumping) {
        p.jumpProgress += dt / 0.52; // jump ~0.52s
        if (p.jumpProgress >= 1) {
          p.isJumping = false;
          p.jumpProgress = 0;
        }
      }

      // Invulnerability timer
      if (p.invulnerableTime > 0) {
        p.invulnerableTime = Math.max(0, p.invulnerableTime - dt * 1000);
      }

      // Exhaust and tire sparks
      const playerPixelX = s.roadLeft + p.x * s.roadWidth;
      const playerPixelY = s.height * p.y;
      if (p.isBoosting) {
        emitParticles(playerPixelX - 7, playerPixelY + 36, activeBike.trailColor, 2, 1.5, 7);
        emitParticles(playerPixelX + 7, playerPixelY + 36, activeBike.trailColor, 2, 1.5, 7);
      } else if (Math.abs(p.leanAngle) > 0.5) {
        // Drifting tire sparks when steering hard
        emitParticles(playerPixelX + (p.leanAngle > 0 ? -12 : 12), playerPixelY + 34, '#fbbf24', 2, 2.5, 4);
      }

      // Spawning
      spawnTraffic(now);
      spawnCollectible(now);
      spawnHazard(now);
      spawnPylons(now);

      // Update Roadside Pylons
      for (let i = s.roadsidePylons.length - 1; i >= 0; i--) {
        const pyl = s.roadsidePylons[i];
        pyl.y += scrollPixels;
        if (pyl.y > s.height + 40) {
          s.roadsidePylons.splice(i, 1);
        }
      }

      // Update Traffic
      for (let i = s.traffic.length - 1; i >= 0; i--) {
        const v = s.traffic[i];
        const relativeSpeed = p.speed - v.speed;
        const vPixelsPerSec = (relativeSpeed / 60) * 115;
        v.y += vPixelsPerSec * dt;

        // Lane changes
        if (!v.isChangingLane && Math.random() < (difficulty === 'hard' ? 0.007 : 0.002) && v.y > 60 && v.y < s.height - 220) {
          const possibleLanes = [v.lane - 1, v.lane + 1].filter((l) => l >= 0 && l <= 3);
          if (possibleLanes.length > 0) {
            const nextLane = possibleLanes[Math.floor(Math.random() * possibleLanes.length)];
            v.isChangingLane = true;
            v.targetLane = nextLane;
            v.turnSignal = nextLane > v.lane ? 'right' : 'left';
            v.blinkTimer = 0;
          }
        }

        if (v.isChangingLane && v.targetLane !== undefined) {
          const targetLaneCenterX = s.roadLeft + v.targetLane * s.laneWidth + s.laneWidth / 2;
          const targetX = targetLaneCenterX - v.width / 2;
          v.x += (targetX - v.x) * Math.min(1, 2.8 * dt);
          if (Math.abs(targetX - v.x) < 2) {
            v.lane = v.targetLane;
            v.isChangingLane = false;
            v.turnSignal = undefined;
          }
        }

        // Near-Miss check
        if (!v.passedPlayer && v.y > playerPixelY - 30 && v.y < playerPixelY + 40) {
          const carCenterX = v.x + v.width / 2;
          const distHorizontal = Math.abs(playerPixelX - carCenterX);
          const clearanceThreshold = (v.width / 2) + 26;

          if (distHorizontal <= clearanceThreshold && distHorizontal > (v.width / 2) + 8 && p.speed > 130) {
            v.passedPlayer = true;
            s.nearMisses++;
            const nearMissBonus = Math.round(50 * diffConfig.scoreMultiplier);
            s.score += nearMissBonus;
            soundManager.playNearMiss();
            triggerHaptic([30, 30]);
            emitFloatingText(playerPixelX, playerPixelY - 40, `NEAR MISS +${nearMissBonus}`, '#38bdf8');
          }
        }

        // Collision Check with Player
        if (!p.isJumping && p.invulnerableTime <= 0) {
          const playerHitbox = {
            left: playerPixelX - 14,
            right: playerPixelX + 14,
            top: playerPixelY - 30,
            bottom: playerPixelY + 30,
          };
          const carHitbox = {
            left: v.x + 4,
            right: v.x + v.width - 4,
            top: v.y + 6,
            bottom: v.y + v.height - 6,
          };

          const isColliding =
            playerHitbox.right > carHitbox.left &&
            playerHitbox.left < carHitbox.right &&
            playerHitbox.bottom > carHitbox.top &&
            playerHitbox.top < carHitbox.bottom;

          if (isColliding) {
            if (p.hasShield) {
              p.hasShield = false;
              p.invulnerableTime = 1400;
              soundManager.playCrash();
              triggerHaptic([60, 40, 60]);
              emitFloatingText(playerPixelX, playerPixelY - 50, 'SHIELD BROKEN!', '#38bdf8');
              v.y += 60;
            } else {
              handleCrash();
              return;
            }
          }
        }

        if (v.y > s.height + 150 || v.y < -300) {
          s.traffic.splice(i, 1);
        }
      }

      // Update Collectibles
      for (let i = s.collectibles.length - 1; i >= 0; i--) {
        const c = s.collectibles[i];
        const relativeScroll = (p.speed / 60) * 115;
        c.y += relativeScroll * dt;
        c.pulseTimer += dt * 4;

        const dist = Math.hypot(c.x - playerPixelX, c.y - playerPixelY);
        if (dist < 38 && !c.collected) {
          c.collected = true;
          if (c.type === 'coin') {
            s.coinsCollected++;
            s.score += 25 * diffConfig.scoreMultiplier;
            soundManager.playCoin();
            triggerHaptic(20);
            emitFloatingText(c.x, c.y, '+25', '#fbbf24');
          } else if (c.type === 'boost') {
            p.boostFuel = 100;
            soundManager.playBoost();
            triggerHaptic([40, 30]);
            emitFloatingText(c.x, c.y, 'NITRO FULL!', '#38bdf8');
          } else if (c.type === 'shield') {
            p.hasShield = true;
            soundManager.playBoost();
            triggerHaptic([50, 50]);
            emitFloatingText(c.x, c.y, 'SHIELD ON!', '#4ade80');
          }
          s.collectibles.splice(i, 1);
          continue;
        }

        if (c.y > s.height + 60) {
          s.collectibles.splice(i, 1);
        }
      }

      // Update Hazards
      for (let i = s.hazards.length - 1; i >= 0; i--) {
        const h = s.hazards[i];
        const relativeScroll = (p.speed / 60) * 115;
        h.y += relativeScroll * dt;

        if (!p.isJumping && p.invulnerableTime <= 0) {
          const dist = Math.hypot(h.x + h.width / 2 - playerPixelX, h.y + h.height / 2 - playerPixelY);
          if (dist < 26) {
            if (h.type === 'oil') {
              p.targetX = Math.max(0.1, Math.min(0.9, p.targetX + (Math.random() > 0.5 ? 0.22 : -0.22)));
              p.speed = Math.max(60, p.speed - 50);
              emitFloatingText(playerPixelX, playerPixelY - 30, 'SKID!', '#cbd5e1');
              soundManager.playCrash();
              triggerHaptic([40, 40]);
              s.hazards.splice(i, 1);
              continue;
            } else {
              if (p.hasShield) {
                p.hasShield = false;
                p.invulnerableTime = 1200;
                soundManager.playCrash();
                triggerHaptic([60, 60]);
                emitFloatingText(playerPixelX, playerPixelY - 40, 'SHIELD BROKEN!', '#38bdf8');
                s.hazards.splice(i, 1);
                continue;
              } else {
                handleCrash();
                return;
              }
            }
          }
        }

        if (h.y > s.height + 60) {
          s.hazards.splice(i, 1);
        }
      }

      // Update Particles
      for (let i = s.particles.length - 1; i >= 0; i--) {
        const pt = s.particles[i];
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.life++;
        pt.alpha = 1 - pt.life / pt.maxLife;
        if (pt.life >= pt.maxLife) {
          s.particles.splice(i, 1);
        }
      }

      // Update Floating Texts
      for (let i = s.floatingTexts.length - 1; i >= 0; i--) {
        const ft = s.floatingTexts[i];
        ft.y -= 1.2;
        ft.life += dt;
        ft.alpha = Math.max(0, 1 - ft.life / 0.9);
        if (ft.life >= 0.9) {
          s.floatingTexts.splice(i, 1);
        }
      }

      // Send HUD update
      const activeTheme = ROAD_PALETTES[s.currentColorIndex];
      onUpdateHUD({
        score: Math.floor(s.score),
        speed: Math.round(p.speed),
        distance: Math.floor(s.distanceMeters),
        boostFuel: Math.round(p.boostFuel),
        isBoosting: p.isBoosting,
        stageName: activeTheme.badge,
        hasShield: p.hasShield,
      });
    };

    // Crash Handler
    const handleCrash = () => {
      const s = stateRef.current;
      s.isGameOver = true;
      soundManager.stopEngine();
      soundManager.playCrash();
      triggerHaptic([180, 80, 240]);

      const playerPixelX = s.roadLeft + s.player.x * s.roadWidth;
      const playerPixelY = s.height * s.player.y;
      for (let i = 0; i < 40; i++) {
        s.particles.push({
          x: playerPixelX,
          y: playerPixelY,
          vx: (Math.random() - 0.5) * 12,
          vy: (Math.random() - 0.5) * 12,
          size: Math.random() * 5 + 3,
          color: Math.random() > 0.5 ? activeBike.color : '#fbbf24',
          alpha: 1,
          life: 0,
          maxLife: 45,
        });
      }

      const currentHigh = progress.highScores[difficulty] || 0;
      const finalScore = Math.floor(s.score);
      const isNewRecord = finalScore > currentHigh;

      if (isNewRecord) {
        soundManager.playFanfare();
      }

      setTimeout(() => {
        onGameOver({
          score: finalScore,
          distanceMeters: Math.floor(s.distanceMeters),
          coinsCollected: s.coinsCollected,
          nearMisses: s.nearMisses,
          maxSpeedAchieved: Math.round(s.maxSpeedAchieved),
          timeAliveSeconds: Math.floor((Date.now() - s.startTime) / 1000),
          isNewRecord,
        });
      }, 700);
    };

    // Main Draw Function with Blue -> Yellow -> Green -> White Road Interpolation
    const draw = () => {
      const s = stateRef.current;

      // 1. Calculate dynamic road palette colors
      const colorCycleMeters = 320;
      const totalPalettes = ROAD_PALETTES.length;
      const currentPhase = s.distanceMeters / colorCycleMeters;
      const curIdx = Math.floor(currentPhase) % totalPalettes;
      const nextIdx = (curIdx + 1) % totalPalettes;
      const localT = currentPhase - Math.floor(currentPhase);

      // Smooth blend over the last 30% of each sector
      let blendFactor = 0;
      if (localT > 0.7) {
        const norm = (localT - 0.7) / 0.3;
        blendFactor = norm * norm * (3 - 2 * norm); // smoothstep
      }

      const p1 = ROAD_PALETTES[curIdx];
      const p2 = ROAD_PALETTES[nextIdx];

      const horizonTop = lerpRGB(p1.horizonTop, p2.horizonTop, blendFactor);
      const horizonBottom = lerpRGB(p1.horizonBottom, p2.horizonBottom, blendFactor);
      const asphalt = lerpRGB(p1.asphalt, p2.asphalt, blendFactor);
      const neonPrimary = lerpRGB(p1.neonPrimary, p2.neonPrimary, blendFactor);
      const neonSecondary = lerpRGB(p1.neonSecondary, p2.neonSecondary, blendFactor);
      const marking = lerpRGB(p1.markingColor, p2.markingColor, blendFactor);

      // 2. Background Horizon Sky
      const skyGrad = ctx.createLinearGradient(0, 0, 0, s.height);
      skyGrad.addColorStop(0, rgbToString(horizonTop));
      skyGrad.addColorStop(1, rgbToString(horizonBottom));
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, s.width, s.height);

      // Cyber grid background lines
      ctx.strokeStyle = rgbToString(neonPrimary, 0.06);
      ctx.lineWidth = 1;
      const gridSpacing = 42;
      for (let x = 0; x < s.width; x += gridSpacing) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, s.height);
        ctx.stroke();
      }

      // 3. Road Surface
      ctx.fillStyle = rgbToString(asphalt);
      ctx.fillRect(s.roadLeft, 0, s.roadWidth, s.height);

      // Subtle asphalt light gradient
      const roadLightGrad = ctx.createLinearGradient(s.roadLeft, 0, s.roadRight, 0);
      roadLightGrad.addColorStop(0, rgbToString(neonPrimary, 0.08));
      roadLightGrad.addColorStop(0.5, 'rgba(0,0,0,0)');
      roadLightGrad.addColorStop(1, rgbToString(neonPrimary, 0.08));
      ctx.fillStyle = roadLightGrad;
      ctx.fillRect(s.roadLeft, 0, s.roadWidth, s.height);

      // 4. Glowing Neon Road Curbs (Dynamic Color: Blue, Yellow, Green, White)
      ctx.save();
      ctx.shadowBlur = 16;
      ctx.shadowColor = rgbToString(neonPrimary);
      ctx.fillStyle = rgbToString(neonPrimary);
      // Left and right luminous curbs
      ctx.fillRect(s.roadLeft - 5, 0, 5, s.height);
      ctx.fillRect(s.roadRight, 0, 5, s.height);
      ctx.restore();

      // Alternating Road Rumbles (Pulsing in sync with active road color)
      const rumbleH = 26;
      const numRumbles = Math.ceil(s.height / rumbleH) + 1;
      for (let i = -1; i < numRumbles; i++) {
        const y = i * rumbleH + (s.roadOffset % rumbleH);
        const isLight = (i + Math.floor(s.distanceMeters / 15)) % 2 === 0;
        ctx.fillStyle = isLight ? rgbToString(neonSecondary, 0.7) : 'rgba(0, 0, 0, 0.45)';
        ctx.fillRect(s.roadLeft - 10, y, 5, rumbleH);
        ctx.fillRect(s.roadRight + 5, y, 5, rumbleH);
      }

      // Roadside Futuristic Light Pylons
      s.roadsidePylons.forEach((pyl) => {
        // Left pylon lamp
        ctx.fillStyle = rgbToString(neonPrimary);
        ctx.beginPath();
        ctx.arc(s.roadLeft - 18, pyl.y, 4, 0, Math.PI * 2);
        ctx.fill();
        // Right pylon lamp
        ctx.beginPath();
        ctx.arc(s.roadRight + 18, pyl.y, 4, 0, Math.PI * 2);
        ctx.fill();
      });

      // 5. Dashed Lane Dividers (Glowing matching road color)
      ctx.strokeStyle = rgbToString(marking, 0.45);
      ctx.lineWidth = 2.5;
      ctx.setLineDash([26, 26]);
      ctx.lineDashOffset = -s.roadMarkingOffset;

      for (let lane = 1; lane < 4; lane++) {
        const laneX = s.roadLeft + lane * s.laneWidth;
        ctx.beginPath();
        ctx.moveTo(laneX, 0);
        ctx.lineTo(laneX, s.height);
        ctx.stroke();
      }
      ctx.setLineDash([]);

      // 6. Draw Hazards
      s.hazards.forEach((h) => {
        if (h.type === 'oil') {
          ctx.save();
          ctx.beginPath();
          ctx.ellipse(h.x + h.width / 2, h.y + h.height / 2, h.width / 2, h.height / 2, 0, 0, Math.PI * 2);
          const grad = ctx.createLinearGradient(h.x, h.y, h.x + h.width, h.y + h.height);
          grad.addColorStop(0, '#0f172a');
          grad.addColorStop(0.5, rgbToString(neonPrimary, 0.7));
          grad.addColorStop(1, '#6366f1');
          ctx.fillStyle = grad;
          ctx.fill();
          ctx.restore();
        } else {
          ctx.save();
          ctx.fillStyle = '#f97316';
          ctx.beginPath();
          ctx.moveTo(h.x + h.width / 2, h.y);
          ctx.lineTo(h.x + h.width, h.y + h.height);
          ctx.lineTo(h.x, h.y + h.height);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(h.x + h.width * 0.25, h.y + h.height * 0.45, h.width * 0.5, 6);
          ctx.restore();
        }
      });

      // 7. Draw Collectibles
      s.collectibles.forEach((c) => {
        const floatY = c.y + Math.sin(c.pulseTimer) * 4;
        ctx.save();
        if (c.type === 'coin') {
          ctx.shadowBlur = 12;
          ctx.shadowColor = '#fbbf24';
          ctx.fillStyle = '#fbbf24';
          ctx.beginPath();
          ctx.arc(c.x, floatY, 13, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#fef08a';
          ctx.beginPath();
          ctx.arc(c.x, floatY, 9, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#b45309';
          ctx.font = 'bold 12px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('★', c.x, floatY + 0.5);
        } else if (c.type === 'boost') {
          ctx.shadowBlur = 12;
          ctx.shadowColor = '#06b6d4';
          ctx.fillStyle = '#06b6d4';
          ctx.fillRect(c.x - 9, floatY - 14, 18, 28);
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 10px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('N₂O', c.x, floatY);
        } else {
          ctx.shadowBlur = 14;
          ctx.shadowColor = '#10b981';
          ctx.strokeStyle = '#34d399';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(c.x, floatY, 14, 0, Math.PI * 2);
          ctx.stroke();

          ctx.fillStyle = 'rgba(52, 211, 153, 0.3)';
          ctx.fill();
        }
        ctx.restore();
      });

      // 8. Draw Traffic Vehicles
      s.traffic.forEach((v) => {
        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.fillRect(v.x + 3, v.y + 6, v.width - 2, v.height);

        ctx.fillStyle = v.color;
        const cornerR = v.type === 'truck' ? 4 : 8;
        ctx.beginPath();
        ctx.roundRect(v.x, v.y, v.width, v.height, [cornerR, cornerR, cornerR, cornerR]);
        ctx.fill();

        const windshieldY = v.y + (v.type === 'truck' ? 14 : v.height * 0.22);
        const windshieldH = v.type === 'truck' ? 18 : v.height * 0.35;
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.roundRect(v.x + 4, windshieldY, v.width - 8, windshieldH, 3);
        ctx.fill();

        if (v.type !== 'truck') {
          ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
          ctx.fillRect(v.x + 6, v.y + v.height * 0.68, v.width - 12, v.height * 0.16);
        }

        ctx.shadowBlur = 8;
        ctx.shadowColor = '#ef4444';
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(v.x + 4, v.y + v.height - 4, 8, 4);
        ctx.fillRect(v.x + v.width - 12, v.y + v.height - 4, 8, 4);
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#fef08a';
        ctx.fillRect(v.x + 4, v.y, 7, 4);
        ctx.fillRect(v.x + v.width - 11, v.y, 7, 4);

        if (v.turnSignal) {
          const blink = Math.floor(Date.now() / 250) % 2 === 0;
          if (blink) {
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#f59e0b';
            ctx.fillStyle = '#f59e0b';
            const signalX = v.turnSignal === 'left' ? v.x : v.x + v.width - 6;
            ctx.fillRect(signalX, v.y + v.height - 6, 6, 6);
            ctx.fillRect(signalX, v.y, 6, 6);
            ctx.shadowBlur = 0;
          }
        }
        ctx.restore();
      });

      // 9. Touch Reticle Indicator (Shows where user is touching to steer on mobile)
      if (s.isTouching) {
        ctx.save();
        const targetScreenX = s.roadLeft + s.player.targetX * s.roadWidth;
        const playerScreenY = s.height * s.player.y;

        ctx.shadowBlur = 14;
        ctx.shadowColor = rgbToString(neonPrimary);
        ctx.strokeStyle = rgbToString(neonPrimary, 0.7);
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);

        // Steer guideline connecting bike to touch lane
        ctx.beginPath();
        ctx.moveTo(s.roadLeft + s.player.x * s.roadWidth, playerScreenY);
        ctx.lineTo(targetScreenX, playerScreenY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Pulsing touch steer circle
        ctx.beginPath();
        ctx.arc(targetScreenX, playerScreenY, 14, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = rgbToString(neonPrimary, 0.2);
        ctx.fill();
        ctx.restore();
      }

      // 10. Draw Player Motorcycle
      const p = s.player;
      const playerPixelX = s.roadLeft + p.x * s.roadWidth;
      const playerPixelY = s.height * p.y;
      const jumpScale = p.isJumping ? 1 + Math.sin(p.jumpProgress * Math.PI) * 0.32 : 1;
      const shadowOffsetY = p.isJumping ? 18 + Math.sin(p.jumpProgress * Math.PI) * 24 : 8;

      ctx.save();

      // Shadow underneath
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.beginPath();
      ctx.ellipse(playerPixelX, playerPixelY + shadowOffsetY, 16 * jumpScale, 34 * jumpScale, 0, 0, Math.PI * 2);
      ctx.fill();

      // Dynamic Headlight Beam projecting forward
      ctx.save();
      const beamGrad = ctx.createRadialGradient(
        playerPixelX,
        playerPixelY - 20,
        10,
        playerPixelX,
        playerPixelY - 200,
        200
      );
      beamGrad.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
      beamGrad.addColorStop(0.5, rgbToString(neonPrimary, 0.15));
      beamGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = beamGrad;
      ctx.beginPath();
      ctx.moveTo(playerPixelX - 10, playerPixelY - 20);
      ctx.lineTo(playerPixelX - 75, playerPixelY - 220);
      ctx.lineTo(playerPixelX + 75, playerPixelY - 220);
      ctx.lineTo(playerPixelX + 10, playerPixelY - 20);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // Position, lean, and jump scale
      ctx.translate(playerPixelX, playerPixelY);
      ctx.scale(jumpScale, jumpScale);
      ctx.rotate(p.leanAngle * 0.34);

      if (p.invulnerableTime > 0 && Math.floor(Date.now() / 80) % 2 === 0) {
        ctx.globalAlpha = 0.4;
      }

      // Shield Bubble
      if (p.hasShield) {
        ctx.save();
        ctx.shadowBlur = 18;
        ctx.shadowColor = '#38bdf8';
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.9)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.ellipse(0, 0, 34, 50, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = 'rgba(56, 189, 248, 0.16)';
        ctx.fill();
        ctx.restore();
      }

      // Rear tire
      ctx.fillStyle = '#090d16';
      ctx.fillRect(-7, 18, 14, 25);
      // Front tire
      ctx.fillRect(-6, -38, 12, 23);

      // Bike Body Fairing
      ctx.fillStyle = activeBike.color;
      ctx.shadowBlur = 12;
      ctx.shadowColor = activeBike.glowColor;
      ctx.beginPath();
      ctx.moveTo(0, -34);
      ctx.lineTo(14, -10);
      ctx.lineTo(10, 18);
      ctx.lineTo(-10, 18);
      ctx.lineTo(-14, -10);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;

      // Handlebars
      ctx.fillStyle = '#475569';
      ctx.fillRect(-18, -26, 36, 4);
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(-19, -27, 4, 6);
      ctx.fillRect(15, -27, 4, 6);

      // Rider in leather racing suit
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.ellipse(0, -4, 12, 16, 0, 0, Math.PI * 2);
      ctx.fill();

      // Rider Helmet
      ctx.fillStyle = activeBike.secondaryColor;
      ctx.beginPath();
      ctx.ellipse(0, -14, 9, 11, 0, 0, Math.PI * 2);
      ctx.fill();

      // Helmet Visor
      ctx.fillStyle = '#020617';
      ctx.fillRect(-6, -20, 12, 5);

      // Exhaust Pipes
      ctx.fillStyle = '#64748b';
      ctx.fillRect(-8, 26, 4, 8);
      ctx.fillRect(4, 26, 4, 8);

      if (p.isBoosting) {
        ctx.shadowBlur = 16;
        ctx.shadowColor = activeBike.trailColor;
        ctx.fillStyle = activeBike.trailColor;
        const flameLength = 18 + Math.random() * 14;

        ctx.beginPath();
        ctx.moveTo(-9, 34);
        ctx.lineTo(-6, 34 + flameLength);
        ctx.lineTo(-3, 34);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(3, 34);
        ctx.lineTo(6, 34 + flameLength);
        ctx.lineTo(9, 34);
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      ctx.restore();

      // 11. High-Speed Edge Streaks (> 180 km/h or boosting)
      if (p.speed > 180 || p.isBoosting) {
        ctx.save();
        ctx.strokeStyle = rgbToString(neonPrimary, 0.3);
        ctx.lineWidth = 1.5;
        const streakCount = p.isBoosting ? 8 : 4;
        for (let i = 0; i < streakCount; i++) {
          const sx = Math.random() < 0.5 ? Math.random() * s.roadLeft : s.roadRight + Math.random() * (s.width - s.roadRight);
          const sy = Math.random() * s.height;
          const slen = 30 + Math.random() * 60;
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(sx, sy + slen);
          ctx.stroke();
        }
        ctx.restore();
      }

      // 12. Draw Particles
      s.particles.forEach((pt) => {
        ctx.save();
        ctx.globalAlpha = pt.alpha;
        ctx.fillStyle = pt.color;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // 13. Draw Floating Texts
      s.floatingTexts.forEach((ft) => {
        ctx.save();
        ctx.globalAlpha = ft.alpha;
        ctx.font = 'bold 15px var(--font-display), sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = ft.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = ft.color;
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();
      });
    };

    // Animation Loop
    const loop = (currentTime: number) => {
      const dt = Math.min((currentTime - lastTime) / 1000, 0.1);
      lastTime = currentTime;

      update(dt, currentTime);
      draw();

      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', updateSize);
      soundManager.stopEngine();
    };
  }, [difficulty, progress, isPaused, activeBike, diffConfig, externalInput, onGameOver, onUpdateHUD, triggerHaptic]);

  // Touch and Mouse Direct-Steering Handlers (Ultra-responsive 1:1 finger tracking)
  const handleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    const s = stateRef.current;
    if (s.isGameOver || isPaused) return;

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const now = Date.now();
    // Double tap anywhere on screen -> bunny-hop Jump!
    if (now - s.lastTapTime < 280) {
      triggerJump();
    }
    s.lastTapTime = now;

    s.isTouching = true;
    s.touchScreenX = clientX;
    s.touchScreenY = clientY;
    s.touchStartY = clientY;

    // Directly steer bike towards touch X position
    const touchRelX = (clientX - (rect.left + s.roadLeft)) / s.roadWidth;
    s.player.targetX = Math.max(0.08, Math.min(0.92, touchRelX));
  };

  const handleTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
    const s = stateRef.current;
    if (!s.isTouching || s.isGameOver || isPaused) return;

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    // Swipe up detection for Jump
    if (s.touchStartY - clientY > 55 && !s.player.isJumping) {
      triggerJump();
      s.touchStartY = clientY;
    }

    s.touchScreenX = clientX;
    s.touchScreenY = clientY;

    // Direct 1:1 steering tracking
    const touchRelX = (clientX - (rect.left + s.roadLeft)) / s.roadWidth;
    s.player.targetX = Math.max(0.08, Math.min(0.92, touchRelX));
  };

  const handleTouchEnd = () => {
    const s = stateRef.current;
    s.isTouching = false;
  };

  return (
    <div className="relative w-full h-full overflow-hidden select-none bg-slate-950 flex items-center justify-center">
      <canvas
        ref={canvasRef}
        className="w-full h-full block touch-none cursor-grab active:cursor-grabbing"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        onMouseDown={handleTouchStart}
        onMouseMove={handleTouchMove}
        onMouseUp={handleTouchEnd}
        onMouseLeave={handleTouchEnd}
      />
    </div>
  );
};
