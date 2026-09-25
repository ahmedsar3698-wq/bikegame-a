import React from 'react';
import { Play, RotateCcw, Home, Volume2, VolumeX, Vibrate } from 'lucide-react';
import { Difficulty, GameProgress } from '../types/game';
import { DIFFICULTY_CONFIGS } from '../utils/storage';
import { soundManager } from '../utils/audio';

interface PauseModalProps {
  progress: GameProgress;
  onResume: () => void;
  onRestart: () => void;
  onHome: () => void;
  onSelectDifficulty: (d: Difficulty) => void;
  onToggleSound: () => void;
  onToggleVibration: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  progress,
  onResume,
  onRestart,
  onHome,
  onSelectDifficulty,
  onToggleSound,
  onToggleVibration,
}) => {
  const currentDiff = progress.selectedDifficulty;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col gap-5 text-slate-100 animate-in fade-in zoom-in-95 duration-200">
        <div className="text-center">
          <span className="text-[11px] font-semibold text-cyan-400 uppercase tracking-widest block">
            Highway Paused
          </span>
          <h2 className="text-2xl font-bold tracking-tight text-white mt-1">Take a Breather</h2>
        </div>

        {/* Primary Action: Resume */}
        <button
          type="button"
          onClick={() => {
            soundManager.playClick();
            onResume();
          }}
          className="w-full h-12 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-base flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 active:scale-95 transition-all"
        >
          <Play className="w-4 h-4 fill-current" />
          <span>Resume Ride</span>
        </button>

        {/* Difficulty Switcher */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
            Difficulty for next run
          </span>
          <div className="grid grid-cols-3 gap-1 p-1 bg-slate-950 rounded-xl border border-slate-800">
            {(['easy', 'medium', 'hard'] as Difficulty[]).map((diff) => {
              const cfg = DIFFICULTY_CONFIGS[diff];
              const isSelected = currentDiff === diff;
              return (
                <button
                  key={diff}
                  type="button"
                  onClick={() => {
                    soundManager.playClick();
                    onSelectDifficulty(diff);
                  }}
                  className={`py-2 text-xs font-semibold rounded-lg capitalize transition-colors ${
                    isSelected
                      ? 'bg-slate-800 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {cfg.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Audio & Haptic Options */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onToggleSound}
            className={`h-11 rounded-xl flex items-center justify-center gap-2 border text-xs font-medium transition-colors ${
              progress.soundEnabled
                ? 'bg-slate-800/80 border-slate-700 text-cyan-300'
                : 'bg-slate-950/60 border-slate-800 text-slate-500'
            }`}
          >
            {progress.soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            <span>{progress.soundEnabled ? 'Audio On' : 'Muted'}</span>
          </button>

          <button
            type="button"
            onClick={onToggleVibration}
            className={`h-11 rounded-xl flex items-center justify-center gap-2 border text-xs font-medium transition-colors ${
              progress.vibrationEnabled
                ? 'bg-slate-800/80 border-slate-700 text-cyan-300'
                : 'bg-slate-950/60 border-slate-800 text-slate-500'
            }`}
          >
            <Vibrate className="w-4 h-4" />
            <span>{progress.vibrationEnabled ? 'Haptics On' : 'Haptics Off'}</span>
          </button>
        </div>

        {/* Secondary Navigation Buttons */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={() => {
              soundManager.playClick();
              onRestart();
            }}
            className="h-11 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs flex items-center justify-center gap-1.5 transition-colors active:scale-95"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Restart</span>
          </button>

          <button
            type="button"
            onClick={() => {
              soundManager.playClick();
              onHome();
            }}
            className="h-11 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs flex items-center justify-center gap-1.5 transition-colors active:scale-95"
          >
            <Home className="w-4 h-4" />
            <span>Main Menu</span>
          </button>
        </div>
      </div>
    </div>
  );
};
