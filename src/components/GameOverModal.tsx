import React from 'react';
import { RotateCcw, Home, Trophy, Gauge, Zap, Flame } from 'lucide-react';
import { RunStats, Difficulty, GameProgress } from '../types/game';
import { soundManager } from '../utils/audio';

interface GameOverModalProps {
  stats: RunStats;
  difficulty: Difficulty;
  progress: GameProgress;
  onRestart: () => void;
  onHome: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  stats,
  difficulty,
  progress,
  onRestart,
  onHome,
}) => {
  const currentBest = progress.highScores[difficulty] || 0;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col gap-4 text-slate-100 animate-in fade-in zoom-in-95 duration-200 my-auto">
        {/* Header Status */}
        <div className="text-center">
          <span className="text-[11px] font-bold text-rose-400 uppercase tracking-widest block">
            Wipeout!
          </span>
          <h2 className="text-2xl font-extrabold tracking-tight text-white mt-0.5">Run Terminated</h2>
        </div>

        {/* Score Card with Record Callout */}
        <div className={`p-4 rounded-2xl border text-center transition-all ${
          stats.isNewRecord
            ? 'bg-gradient-to-b from-cyan-950/40 to-slate-900 border-cyan-500/60 shadow-[0_0_20px_rgba(6,182,212,0.15)]'
            : 'bg-slate-950/80 border-slate-800'
        }`}>
          {stats.isNewRecord ? (
            <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-cyan-400 mb-1">
              <Trophy className="w-4 h-4 fill-current" />
              <span>NEW ALL-TIME RECORD!</span>
            </div>
          ) : (
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-0.5">
              Final Run Score
            </span>
          )}

          <div className="font-mono text-4xl font-extrabold tracking-tight text-white tabular-nums drop-shadow-sm">
            {stats.score.toLocaleString()}
          </div>

          <div className="flex items-center justify-center gap-2 text-xs text-slate-400 mt-1 capitalize">
            <span>{difficulty} Mode</span>
            <span aria-hidden="true">·</span>
            <span>Best: {currentBest.toLocaleString()}</span>
          </div>
        </div>

        {/* Run Breakdown Metrics Grid */}
        <div className="grid grid-cols-2 gap-2 text-left">
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex flex-col">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider">Distance</span>
            <span className="font-mono text-base font-bold text-slate-100 tabular-nums">
              {stats.distanceMeters.toLocaleString()}m
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex flex-col">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider">Coins Gathered</span>
            <span className="font-mono text-base font-bold text-amber-300 tabular-nums">
              ★ {stats.coinsCollected}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex flex-col">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider">Near Misses</span>
            <span className="font-mono text-base font-bold text-cyan-400 tabular-nums">
              {stats.nearMisses}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex flex-col">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider">Top Speed</span>
            <span className="font-mono text-base font-bold text-slate-100 tabular-nums">
              {stats.maxSpeedAchieved} km/h
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2 pt-2">
          <button
            type="button"
            onClick={() => {
              soundManager.playClick();
              onRestart();
            }}
            className="w-full h-13 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-slate-950 font-bold text-base flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/25 active:scale-[0.98] transition-all cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Ride Again</span>
          </button>

          <button
            type="button"
            onClick={() => {
              soundManager.playClick();
              onHome();
            }}
            className="w-full h-11 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-medium text-xs flex items-center justify-center gap-1.5 transition-colors active:scale-[0.98]"
          >
            <Home className="w-4 h-4" />
            <span>Return to Menu</span>
          </button>
        </div>
      </div>
    </div>
  );
};
