import React from 'react';
import { Play, Trophy, Gauge, Shield, Sparkles, Volume2, VolumeX, Smartphone, ArrowRight } from 'lucide-react';
import { Difficulty, GameProgress, BikeConfig } from '../types/game';
import { DIFFICULTY_CONFIGS, BIKES } from '../utils/storage';
import { soundManager } from '../utils/audio';

interface StartScreenProps {
  progress: GameProgress;
  onSelectDifficulty: (d: Difficulty) => void;
  onStartGame: () => void;
  onOpenGarage: () => void;
  onToggleSound: () => void;
}

export const StartScreen: React.FC<StartScreenProps> = ({
  progress,
  onSelectDifficulty,
  onStartGame,
  onOpenGarage,
  onToggleSound,
}) => {
  const currentDiff = progress.selectedDifficulty;
  const currentDiffConfig = DIFFICULTY_CONFIGS[currentDiff];
  const activeBike: BikeConfig = BIKES.find((b) => b.id === progress.selectedBikeId) || BIKES[0];
  const currentHighScore = progress.highScores[currentDiff] || 0;

  const handleDifficultyClick = (d: Difficulty) => {
    soundManager.playClick();
    onSelectDifficulty(d);
  };

  const handleStart = () => {
    soundManager.playClick();
    onStartGame();
  };

  return (
    <div className="absolute inset-0 z-40 flex flex-col justify-between overflow-y-auto bg-slate-950/95 text-slate-100 p-4 sm:p-6 pb-safe pt-safe overscroll-none">
      {/* Top Header Contract: Wordmark, Sound Toggle */}
      <header className="flex items-center justify-between w-full max-w-md mx-auto pt-2">
        <div className="flex flex-col">
          <h1 className="font-display text-4xl sm:text-5xl font-extrabold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-300 to-blue-500 leading-none">
            VELOCITY
          </h1>
          <p className="text-[11px] font-medium tracking-widest uppercase text-slate-400 mt-0.5">
            Arcade Highway Rush
          </p>
        </div>

        <button
          type="button"
          onClick={onToggleSound}
          aria-label={progress.soundEnabled ? 'Mute audio' : 'Unmute audio'}
          className="w-11 h-11 flex items-center justify-center rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
        >
          {progress.soundEnabled ? <Volume2 className="w-5 h-5 text-cyan-400" /> : <VolumeX className="w-5 h-5 text-slate-500" />}
        </button>
      </header>

      {/* Main Content Area */}
      <div className="flex flex-col gap-4 w-full max-w-md mx-auto my-auto py-4">
        {/* High Score & Quick Stats Showcase */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 backdrop-blur-md shadow-xl shadow-black/40">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                {currentDiff} Record
              </span>
            </div>
            <span className="font-mono text-2xl font-bold tracking-tight text-white tabular-nums">
              {currentHighScore.toLocaleString()}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-3 text-center">
            <div>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Career Dist</span>
              <span className="font-mono text-sm font-semibold text-slate-200 tabular-nums">
                {Math.floor(progress.totalDistanceMeters).toLocaleString()}m
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Coins Bank</span>
              <span className="font-mono text-sm font-semibold text-amber-300 tabular-nums">
                ★ {progress.totalCoins}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Runs</span>
              <span className="font-mono text-sm font-semibold text-slate-200 tabular-nums">
                {progress.gamesPlayed}
              </span>
            </div>
          </div>
        </div>

        {/* Selected Bike Garage Card */}
        <button
          type="button"
          onClick={() => {
            soundManager.playClick();
            onOpenGarage();
          }}
          className="group w-full text-left bg-gradient-to-br from-slate-900/90 to-slate-950 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 transition-all duration-200 active:scale-[0.98]"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className="w-3.5 h-3.5 rounded-full shadow-[0_0_8px_currentColor]"
                style={{ color: activeBike.color, backgroundColor: activeBike.color }}
              />
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Bike</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-cyan-400 font-medium group-hover:translate-x-0.5 transition-transform">
              <span>Garage</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>

          <div className="flex items-center justify-between mt-2">
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">{activeBike.name}</h2>
              <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">{activeBike.tagline}</p>
            </div>
            {/* Visual Bike Icon / Color Pill */}
            <div className="flex items-center gap-1 text-[11px] font-mono text-slate-300 bg-slate-800/80 px-2 py-1 rounded-md border border-slate-700/60">
              {activeBike.speedBonus > 0 && <span className="text-rose-400">+{activeBike.speedBonus}% Spd</span>}
              {activeBike.handlingBonus > 0 && <span className="text-emerald-400">+{activeBike.handlingBonus}% Hdl</span>}
              {activeBike.speedBonus === 0 && activeBike.handlingBonus === 0 && <span className="text-slate-400">Stock</span>}
            </div>
          </div>
        </button>

        {/* Difficulty Selector: Segmented Control Tabs */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-1">
            Difficulty Level
          </label>
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-xl">
            {(['easy', 'medium', 'hard'] as Difficulty[]).map((diff) => {
              const cfg = DIFFICULTY_CONFIGS[diff];
              const isSelected = currentDiff === diff;
              return (
                <button
                  key={diff}
                  type="button"
                  onClick={() => handleDifficultyClick(diff)}
                  className={`py-2.5 px-2 rounded-lg text-xs font-bold transition-all duration-150 flex flex-col items-center justify-center gap-0.5 ${
                    isSelected
                      ? 'bg-slate-800 text-white shadow-sm border border-slate-700'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span className="capitalize">{cfg.label}</span>
                  <span className="text-[10px] font-mono opacity-80">
                    {cfg.scoreMultiplier > 1 ? `${cfg.scoreMultiplier}x Score` : '1.0x'}
                  </span>
                </button>
              );
            })}
          </div>
          <p className="text-[11px] text-slate-400 px-1 mt-0.5">
            {currentDiffConfig.description}
          </p>
        </div>

        {/* Dynamic Road Color & Touch Steer Showcase Banner */}
        <div className="flex flex-col gap-2 p-3 rounded-2xl bg-slate-900/60 border border-slate-800/80">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-300">
            <span>Dynamic Highway</span>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(6,182,212,0.8)]" title="Blue" />
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 shadow-[0_0_6px_rgba(250,204,21,0.8)]" title="Yellow" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.8)]" title="Green" />
              <span className="w-2.5 h-2.5 rounded-full bg-white shadow-[0_0_6px_rgba(255,255,255,0.9)]" title="White" />
            </div>
          </div>
          <div className="flex items-center gap-2.5 text-[11px] text-slate-400">
            <Smartphone className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>Touch &amp; slide anywhere to steer. Double-tap or tap Jump to hop over obstacles!</span>
          </div>
        </div>
      </div>

      {/* Bottom Sticky Action: Start Ride CTA */}
      <footer className="w-full max-w-md mx-auto pt-2 pb-2">
        <button
          type="button"
          onClick={handleStart}
          className="w-full h-14 rounded-2xl bg-gradient-to-r from-cyan-500 via-teal-400 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-slate-950 font-bold text-lg tracking-wide uppercase flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/25 active:scale-[0.98] transition-all cursor-pointer"
        >
          <Play className="w-5 h-5 fill-current" />
          <span>Start Ride</span>
        </button>
      </footer>
    </div>
  );
};
