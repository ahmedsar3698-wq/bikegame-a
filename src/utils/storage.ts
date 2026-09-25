import { Difficulty, GameProgress, BikeConfig, DifficultyConfig } from '../types/game';

export const DIFFICULTY_CONFIGS: Record<Difficulty, DifficultyConfig> = {
  easy: {
    id: 'easy',
    label: 'Easy',
    description: 'Calm highway flow with lighter traffic & quick nitro refill.',
    baseSpeed: 120,
    maxSpeed: 190,
    trafficInterval: 1400,
    trafficSpeedMin: 65,
    trafficSpeedMax: 85,
    scoreMultiplier: 1.0,
    boostRechargeRate: 14,
    color: '#10b981', // Emerald
  },
  medium: {
    id: 'medium',
    label: 'Medium',
    description: 'Dynamic traffic with lane-changing cars & balanced challenge.',
    baseSpeed: 160,
    maxSpeed: 250,
    trafficInterval: 1000,
    trafficSpeedMin: 75,
    trafficSpeedMax: 105,
    scoreMultiplier: 1.5,
    boostRechargeRate: 9,
    color: '#06b6d4', // Cyan
  },
  hard: {
    id: 'hard',
    label: 'Hard',
    description: 'Fast hyper-speed rush, aggressive traffic & double score bonus.',
    baseSpeed: 200,
    maxSpeed: 320,
    trafficInterval: 750,
    trafficSpeedMin: 90,
    trafficSpeedMax: 130,
    scoreMultiplier: 2.0,
    boostRechargeRate: 6,
    color: '#f43f5e', // Rose
  },
};

export const BIKES: BikeConfig[] = [
  {
    id: 'specter',
    name: 'Specter Neo',
    tagline: 'Balanced urban street racer with cyber-blue neon chassis.',
    color: '#06b6d4',
    secondaryColor: '#3b82f6',
    glowColor: 'rgba(6, 182, 212, 0.4)',
    trailColor: '#22d3ee',
    speedBonus: 0,
    handlingBonus: 0,
    unlockType: 'free',
    unlockRequirement: 0,
    unlocked: true,
  },
  {
    id: 'crimson',
    name: 'Crimson Hayabusa',
    tagline: 'High-velocity speedster optimized for straight-line acceleration.',
    color: '#f43f5e',
    secondaryColor: '#ea580c',
    glowColor: 'rgba(244, 63, 94, 0.45)',
    trailColor: '#fb7185',
    speedBonus: 15,
    handlingBonus: 0,
    unlockType: 'distance',
    unlockRequirement: 2000,
    unlocked: false,
  },
  {
    id: 'viper',
    name: 'Viper ZX',
    tagline: 'Featherlight frame with razor-sharp handling and lane weaving.',
    color: '#10b981',
    secondaryColor: '#84cc16',
    glowColor: 'rgba(16, 185, 129, 0.45)',
    trailColor: '#34d399',
    speedBonus: 5,
    handlingBonus: 25,
    unlockType: 'coins',
    unlockRequirement: 120,
    unlocked: false,
  },
  {
    id: 'thunder',
    name: 'Thunderbolt 99',
    tagline: 'Hyper-tuned electric prototype with extended boost capacitor.',
    color: '#a855f7',
    secondaryColor: '#ec4899',
    glowColor: 'rgba(168, 85, 247, 0.5)',
    trailColor: '#c084fc',
    speedBonus: 20,
    handlingBonus: 15,
    unlockType: 'distance',
    unlockRequirement: 5000,
    unlocked: false,
  },
];

const STORAGE_KEY = 'velocity_bike_progress_v1';

const DEFAULT_PROGRESS: GameProgress = {
  highScores: {
    easy: 0,
    medium: 0,
    hard: 0,
  },
  totalDistanceMeters: 0,
  totalCoins: 0,
  gamesPlayed: 0,
  unlockedBikes: ['specter'],
  selectedBikeId: 'specter',
  selectedDifficulty: 'medium',
  soundEnabled: true,
  vibrationEnabled: true,
  controlMode: 'buttons',
};

export function loadGameProgress(): GameProgress {
  if (typeof window === 'undefined') return DEFAULT_PROGRESS;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PROGRESS;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_PROGRESS,
      ...parsed,
      highScores: {
        ...DEFAULT_PROGRESS.highScores,
        ...(parsed.highScores || {}),
      },
      unlockedBikes: Array.isArray(parsed.unlockedBikes)
        ? Array.from(new Set(['specter', ...parsed.unlockedBikes]))
        : ['specter'],
    };
  } catch (e) {
    console.error('Failed to load game progress from localStorage:', e);
    return DEFAULT_PROGRESS;
  }
}

export function saveGameProgress(progress: GameProgress): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch (e) {
    console.error('Failed to save game progress to localStorage:', e);
  }
}

export function checkAndUnlockBikes(progress: GameProgress): {
  updatedProgress: GameProgress;
  newlyUnlocked: BikeConfig[];
} {
  const currentUnlocked = new Set(progress.unlockedBikes);
  const newlyUnlocked: BikeConfig[] = [];

  BIKES.forEach((bike) => {
    if (currentUnlocked.has(bike.id)) return;

    let shouldUnlock = false;
    if (bike.unlockType === 'distance' && progress.totalDistanceMeters >= bike.unlockRequirement) {
      shouldUnlock = true;
    } else if (bike.unlockType === 'coins' && progress.totalCoins >= bike.unlockRequirement) {
      shouldUnlock = true;
    }

    if (shouldUnlock) {
      currentUnlocked.add(bike.id);
      newlyUnlocked.push(bike);
    }
  });

  const updatedProgress: GameProgress = {
    ...progress,
    unlockedBikes: Array.from(currentUnlocked),
  };

  if (newlyUnlocked.length > 0) {
    saveGameProgress(updatedProgress);
  }

  return { updatedProgress, newlyUnlocked };
}
