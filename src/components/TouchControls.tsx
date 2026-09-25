import React from 'react';
import { Zap, ArrowUp, ArrowDown, Hand } from 'lucide-react';

interface TouchControlsProps {
  onInputStateChange: (input: {
    steerLeft: boolean;
    steerRight: boolean;
    boost: boolean;
    jump: boolean;
    brake: boolean;
  }) => void;
  inputState: {
    steerLeft: boolean;
    steerRight: boolean;
    boost: boolean;
    jump: boolean;
    brake: boolean;
  };
  boostFuel: number;
}

export const TouchControls: React.FC<TouchControlsProps> = ({
  onInputStateChange,
  inputState,
  boostFuel,
}) => {
  const setKey = (key: keyof typeof inputState, value: boolean) => {
    onInputStateChange({
      ...inputState,
      [key]: value,
    });
  };

  const bindTouch = (key: keyof typeof inputState) => ({
    onTouchStart: (e: React.TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setKey(key, true);
    },
    onTouchEnd: (e: React.TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setKey(key, false);
    },
    onTouchCancel: (e: React.TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setKey(key, false);
    },
    onMouseDown: (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setKey(key, true);
    },
    onMouseUp: (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setKey(key, false);
    },
    onMouseLeave: (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setKey(key, false);
    },
  });

  return (
    <div className="absolute inset-x-0 bottom-0 pointer-events-none z-30 pb-safe pb-3 px-4 select-none">
      {/* Center Subtle Steering Helper Hint (Touch Anywhere) */}
      <div className="flex items-center justify-center mb-2 pointer-events-none opacity-80 transition-opacity">
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-950/70 backdrop-blur-md border border-slate-800 text-[11px] font-medium text-slate-300 shadow-lg">
          <Hand className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
          <span>Touch &amp; Slide screen to steer</span>
        </div>
      </div>

      <div className="flex items-end justify-between max-w-md mx-auto pointer-events-auto">
        {/* Left Action: Quick Brake Button */}
        <button
          type="button"
          {...bindTouch('brake')}
          aria-label="Brake"
          className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center transition-all duration-100 ${
            inputState.brake
              ? 'bg-amber-500 text-slate-950 scale-95 shadow-[0_0_20px_rgba(245,158,11,0.6)]'
              : 'bg-slate-900/80 backdrop-blur-md border border-slate-700/80 text-slate-200 active:scale-95 shadow-xl shadow-black/50 hover:bg-slate-800/80'
          }`}
        >
          <ArrowDown className="w-5 h-5" />
          <span className="text-[10px] font-bold uppercase tracking-wider mt-0.5">Brake</span>
        </button>

        {/* Right Action Cluster: Jump & Nitro Boost */}
        <div className="flex items-center gap-2.5">
          {/* Jump Button */}
          <button
            type="button"
            {...bindTouch('jump')}
            aria-label="Jump Bunny-Hop"
            className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center transition-all duration-100 ${
              inputState.jump
                ? 'bg-emerald-400 text-slate-950 scale-95 shadow-[0_0_20px_rgba(52,211,153,0.7)]'
                : 'bg-slate-900/80 backdrop-blur-md border border-slate-700/80 text-slate-200 active:scale-95 shadow-xl shadow-black/50 hover:bg-slate-800/80'
            }`}
          >
            <ArrowUp className="w-5 h-5" />
            <span className="text-[10px] font-extrabold uppercase tracking-wider mt-0.5">Jump</span>
          </button>

          {/* Nitro Boost Button */}
          <button
            type="button"
            {...bindTouch('boost')}
            disabled={boostFuel <= 0}
            aria-label="Nitro Boost"
            className={`w-16 h-16 rounded-2xl flex flex-col items-center justify-center transition-all duration-100 ${
              inputState.boost && boostFuel > 0
                ? 'bg-gradient-to-tr from-cyan-400 to-blue-500 text-slate-950 scale-95 shadow-[0_0_28px_rgba(6,182,212,0.9)]'
                : boostFuel <= 0
                ? 'bg-slate-900/40 border border-slate-800/80 text-slate-600 opacity-60'
                : 'bg-slate-900/90 backdrop-blur-md border border-cyan-500/60 text-cyan-400 active:scale-95 shadow-xl shadow-cyan-950/40 hover:border-cyan-400'
            }`}
          >
            <Zap className="w-6 h-6 fill-current animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-wider mt-0.5">Nitro</span>
          </button>
        </div>
      </div>
    </div>
  );
};

