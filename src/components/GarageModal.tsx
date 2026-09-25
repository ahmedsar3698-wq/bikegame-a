import React from 'react';
import { X, Check, Lock, Shield, Zap, Sparkles } from 'lucide-react';
import { GameProgress, BikeConfig } from '../types/game';
import { BIKES } from '../utils/storage';
import { soundManager } from '../utils/audio';

interface GarageModalProps {
  progress: GameProgress;
  onSelectBike: (bikeId: string) => void;
  onUnlockBike: (bikeId: string) => void;
  onClose: () => void;
}

export const GarageModal: React.FC<GarageModalProps> = ({
  progress,
  onSelectBike,
  onUnlockBike,
  onClose,
}) => {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl flex flex-col gap-4 text-slate-100 max-h-[90vh] overflow-y-auto my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-white">Bike Garage</h2>
            <p className="text-xs text-slate-400">Select or unlock high-performance machines</p>
          </div>
          <button
            type="button"
            onClick={() => {
              soundManager.playClick();
              onClose();
            }}
            className="w-9 h-9 rounded-xl bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Career Resource Counter */}
        <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-950 border border-slate-800/80 text-xs">
          <span className="text-slate-400">
            Total Distance: <strong className="text-slate-200 font-mono">{Math.floor(progress.totalDistanceMeters).toLocaleString()}m</strong>
          </span>
          <span className="text-slate-400">
            Coins: <strong className="text-amber-300 font-mono">★ {progress.totalCoins}</strong>
          </span>
        </div>

        {/* Bike List */}
        <div className="flex flex-col gap-3">
          {BIKES.map((bike) => {
            const isUnlocked = progress.unlockedBikes.includes(bike.id);
            const isSelected = progress.selectedBikeId === bike.id;

            let canUnlock = false;
            if (!isUnlocked) {
              if (bike.unlockType === 'distance' && progress.totalDistanceMeters >= bike.unlockRequirement) {
                canUnlock = true;
              } else if (bike.unlockType === 'coins' && progress.totalCoins >= bike.unlockRequirement) {
                canUnlock = true;
              }
            }

            return (
              <div
                key={bike.id}
                className={`p-4 rounded-2xl border transition-all ${
                  isSelected
                    ? 'bg-slate-800/90 border-cyan-500 shadow-md shadow-cyan-950/40'
                    : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-4 h-4 rounded-full shadow-[0_0_10px_currentColor]"
                      style={{ color: bike.color, backgroundColor: bike.color }}
                    />
                    <div>
                      <h3 className="text-base font-bold text-white tracking-tight">{bike.name}</h3>
                      <p className="text-xs text-slate-400 line-clamp-1">{bike.tagline}</p>
                    </div>
                  </div>

                  {isSelected && (
                    <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider px-2 py-0.5 rounded-md bg-cyan-950/60 border border-cyan-800/80">
                      Active
                    </span>
                  )}
                </div>

                {/* Bike Specs */}
                <div className="grid grid-cols-2 gap-2 mt-3 pt-2 border-t border-slate-800/60 text-xs">
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="text-slate-400">Top Speed:</span>
                    <span className="font-mono font-semibold">
                      {bike.speedBonus > 0 ? `+${bike.speedBonus}%` : 'Stock'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="text-slate-400">Agility:</span>
                    <span className="font-mono font-semibold">
                      {bike.handlingBonus > 0 ? `+${bike.handlingBonus}%` : 'Stock'}
                    </span>
                  </div>
                </div>

                {/* Bottom Action */}
                <div className="mt-3">
                  {isUnlocked ? (
                    <button
                      type="button"
                      disabled={isSelected}
                      onClick={() => {
                        soundManager.playClick();
                        onSelectBike(bike.id);
                      }}
                      className={`w-full h-10 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors ${
                        isSelected
                          ? 'bg-slate-800 text-cyan-400 cursor-default'
                          : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 active:scale-95'
                      }`}
                    >
                      {isSelected ? (
                        <>
                          <Check className="w-4 h-4" />
                          <span>Equipped</span>
                        </>
                      ) : (
                        <span>Equip Bike</span>
                      )}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        if (canUnlock) {
                          soundManager.playFanfare();
                          onUnlockBike(bike.id);
                        }
                      }}
                      disabled={!canUnlock}
                      className={`w-full h-10 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors ${
                        canUnlock
                          ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 hover:brightness-110 active:scale-95'
                          : 'bg-slate-900 border border-slate-800 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>
                        {canUnlock
                          ? `Unlock Now (${bike.unlockType === 'coins' ? `★ ${bike.unlockRequirement}` : `${bike.unlockRequirement}m`})`
                          : `Requires ${bike.unlockType === 'distance' ? `${bike.unlockRequirement.toLocaleString()}m distance` : `${bike.unlockRequirement} coins`}`}
                      </span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
