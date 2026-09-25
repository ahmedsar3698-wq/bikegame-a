import React from 'react';
import { Pause, Shield, Zap, Volume2, VolumeX } from 'lucide-react';
import { Difficulty } from '../types/game';

interface GameHUDProps {
  score: number;
  highScore: number;
  speed: number;
  distance: number;
  boostFuel: number;
  isBoosting: boolean;
  stageName: string;
  hasShield: boolean;
  difficulty: Difficulty;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onPause: () => void;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  score,
  highScore,
  speed,
  distance,
  boostFuel,
  isBoosting,
  stageName,
  hasShield,
  difficulty,
  soundEnabled,
  onToggleSound,
  onPause,
}) => {
  const isNewRecord = score > highScore && highScore > 0;

  return (
    <div className="absolute inset-x-0 top-0 pointer-events-none z-30 pt-safe">
      {/* Top Status Bar: Strict 3-zone contract, compact, clean unboxed metadata */}
      <header className="flex items-center justify-between px-4 py-3 bg-gradient-to-b from-slate-950/90 via-slate-950/60 to-transparent">
        {/* Left: Score & High Score */}
        <div className="flex flex-col">
          <div className="flex items-baseline gap-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Score</span>
            <span className="font-mono text-2xl font-bold tracking-tight text-white tabular-nums drop-shadow-sm">
              {score.toLocaleString()}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <span>Best {highScore.toLocaleString()}</span>
            {isNewRecord && (
              <>
                <span aria-hidden="true">·</span>
                <span className="font-semibold text-emerald-400 animate-pulse">New Record</span>
              </>
            )}
          </div>
        </div>

        {/* Center: Active Road Color Theme & Distance */}
        <div className="flex flex-col items-center">
          <span className="text-[11px] sm:text-xs font-bold text-slate-100 tracking-wider px-2 py-0.5 rounded-full bg-slate-900/90 border border-slate-700/80 shadow-md">
            {stageName}
          </span>
          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 capitalize mt-0.5">
            <span>{difficulty}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">{distance.toLocaleString()}m</span>
          </div>
        </div>

        {/* Right: Quick Action Controls */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {hasShield && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-medium">
              <Shield className="w-3.5 h-3.5 animate-pulse" />
              <span>Shield</span>
            </div>
          )}

          <button
            type="button"
            onClick={onToggleSound}
            aria-label={soundEnabled ? 'Mute audio' : 'Unmute audio'}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-900/80 backdrop-blur-md border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors active:scale-95"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
          </button>

          <button
            type="button"
            onClick={onPause}
            aria-label="Pause game"
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-900/80 backdrop-blur-md border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors active:scale-95"
          >
            <Pause className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Mid Speedometer & Nitro Overlay (Clean HUD elements) */}
      <div className="px-4 flex items-center justify-between mt-1">
        {/* Speedometer readout */}
        <div className="flex items-baseline gap-1 text-slate-100 drop-shadow-md">
          <span className="font-display text-4xl font-bold tracking-tight text-white leading-none tabular-nums">
            {speed}
          </span>
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">km/h</span>
        </div>

        {/* Compact Nitro Bar */}
        <div className="flex items-center gap-2 bg-slate-950/70 backdrop-blur-md px-2.5 py-1.5 rounded-lg border border-slate-800/80">
          <Zap className={`w-3.5 h-3.5 ${isBoosting ? 'text-cyan-400 animate-bounce' : 'text-slate-400'}`} />
          <div className="w-20 sm:w-28 h-2 bg-slate-800 rounded-full overflow-hidden p-0.5">
            <div
              className={`h-full rounded-full transition-all duration-75 ${
                isBoosting
                  ? 'bg-gradient-to-r from-cyan-400 to-blue-500 shadow-[0_0_8px_rgba(6,182,212,0.8)]'
                  : 'bg-cyan-500'
              }`}
              style={{ width: `${boostFuel}%` }}
            />
          </div>
          <span className="text-[10px] font-mono text-slate-400 tabular-nums w-6 text-right">
            {boostFuel}%
          </span>
        </div>
      </div>
    </div>
  );
};
