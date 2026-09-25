export type GameState = 'MENU' | 'PLAYING' | 'PAUSED' | 'GAME_OVER';

export type Difficulty = 'easy' | 'medium' | 'hard';

export interface DifficultyConfig {
  id: Difficulty;
  label: string;
  description: string;
  baseSpeed: number; // in km/h
  maxSpeed: number;
  trafficInterval: number; // in ms
  trafficSpeedMin: number;
  trafficSpeedMax: number;
  scoreMultiplier: number;
  boostRechargeRate: number; // per second
  color: string;
}

export interface BikeConfig {
  id: string;
  name: string;
  tagline: string;
  color: string; // primary neon color
  secondaryColor: string;
  glowColor: string;
  trailColor: string;
  speedBonus: number; // percentage
  handlingBonus: number; // percentage
  unlockType: 'free' | 'distance' | 'coins';
  unlockRequirement: number;
  unlocked: boolean;
}

export interface PlayerState {
  x: number; // lane position (0 to 1 normalized, or pixels)
  y: number;
  width: number;
  height: number;
  speed: number; // current speed in km/h
  targetX: number;
  leanAngle: number; // -1 to 1 for turning animation
  isJumping: boolean;
  jumpProgress: number; // 0 to 1
  isBoosting: boolean;
  boostFuel: number; // 0 to 100
  hasShield: boolean;
  invulnerableTime: number; // in ms
}

export interface TrafficVehicle {
  id: number;
  lane: number;
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  type: 'sedan' | 'suv' | 'sports' | 'truck';
  color: string;
  isChangingLane: boolean;
  targetLane?: number;
  turnSignal?: 'left' | 'right';
  blinkTimer?: number;
  passedPlayer?: boolean;
}

export interface Collectible {
  id: number;
  lane: number;
  x: number;
  y: number;
  type: 'coin' | 'boost' | 'shield';
  collected: boolean;
  pulseTimer: number;
}

export interface RoadHazard {
  id: number;
  lane: number;
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'barrier' | 'oil' | 'cone';
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
}

export interface FloatingText {
  id: number;
  x: number;
  y: number;
  text: string;
  color: string;
  alpha: number;
  scale: number;
  life: number;
}

export interface GameProgress {
  highScores: Record<Difficulty, number>;
  totalDistanceMeters: number;
  totalCoins: number;
  gamesPlayed: number;
  unlockedBikes: string[];
  selectedBikeId: string;
  selectedDifficulty: Difficulty;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  controlMode: 'touch' | 'buttons';
}

export interface RunStats {
  score: number;
  distanceMeters: number;
  coinsCollected: number;
  nearMisses: number;
  maxSpeedAchieved: number;
  timeAliveSeconds: number;
  isNewRecord: boolean;
}
