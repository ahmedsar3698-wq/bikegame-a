import React, { useState, useEffect, useCallback } from 'react';
import { GameState, Difficulty, GameProgress, RunStats } from './types/game';
import {
  loadGameProgress,
  saveGameProgress,
  checkAndUnlockBikes,
} from './utils/storage';
import { soundManager } from './utils/audio';
import { GameCanvas } from './components/GameCanvas';
import { GameHUD } from './components/GameHUD';
import { TouchControls } from './components/TouchControls';
import { StartScreen } from './components/StartScreen';
import { PauseModal } from './components/PauseModal';
import { GameOverModal } from './components/GameOverModal';
import { GarageModal } from './components/GarageModal';

export default function App() {
  const [gameState, setGameState] = useState<GameState>('MENU');
  const [progress, setProgress] = useState<GameProgress>(loadGameProgress);
  const [isGarageOpen, setIsGarageOpen] = useState(false);
  const [latestRunStats, setLatestRunStats] = useState<RunStats | null>(null);

  // Real-time HUD data passed from Canvas
  const [hudData, setHudData] = useState({
    score: 0,
    speed: 0,
    distance: 0,
    boostFuel: 100,
    isBoosting: false,
    stageName: 'Neon Highway',
    hasShield: false,
  });

  // Current inputs (touch buttons or keyboard)
  const [inputState, setInputState] = useState({
    steerLeft: false,
    steerRight: false,
    boost: false,
    jump: false,
    brake: false,
  });

  // Unique run session key to force fresh game canvas on restart
  const [runKey, setRunKey] = useState(1);

  // Sync sound manager with progress state
  useEffect(() => {
    soundManager.setMuted(!progress.soundEnabled);
  }, [progress.soundEnabled]);

  // Keyboard controls listener for Desktop users
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;

      if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
        if (gameState === 'PLAYING') {
          setGameState('PAUSED');
        } else if (gameState === 'PAUSED') {
          setGameState('PLAYING');
        }
        return;
      }

      if (gameState !== 'PLAYING') return;

      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        setInputState((prev) => ({ ...prev, steerLeft: true }));
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        setInputState((prev) => ({ ...prev, steerRight: true }));
      } else if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W' || e.key === 'Shift') {
        setInputState((prev) => ({ ...prev, boost: true }));
      } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        setInputState((prev) => ({ ...prev, brake: true }));
      } else if (e.key === ' ' || e.key === 'j' || e.key === 'J') {
        // Spacebar triggers Jump
        setInputState((prev) => ({ ...prev, jump: true }));
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        setInputState((prev) => ({ ...prev, steerLeft: false }));
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        setInputState((prev) => ({ ...prev, steerRight: false }));
      } else if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W' || e.key === 'Shift') {
        setInputState((prev) => ({ ...prev, boost: false }));
      } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        setInputState((prev) => ({ ...prev, brake: false }));
      } else if (e.key === ' ' || e.key === 'j' || e.key === 'J') {
        setInputState((prev) => ({ ...prev, jump: false }));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState]);

  // Start new run
  const handleStartGame = useCallback(() => {
    setInputState({
      steerLeft: false,
      steerRight: false,
      boost: false,
      jump: false,
      brake: false,
    });
    setRunKey((prev) => prev + 1);
    setGameState('PLAYING');
  }, []);

  // Handle game over from canvas
  const handleGameOver = useCallback((stats: RunStats) => {
    setLatestRunStats(stats);
    setGameState('GAME_OVER');

    // Update persistence
    setProgress((prev) => {
      const curHigh = prev.highScores[prev.selectedDifficulty] || 0;
      const newHighScores = {
        ...prev.highScores,
        [prev.selectedDifficulty]: Math.max(curHigh, stats.score),
      };

      const updated: GameProgress = {
        ...prev,
        highScores: newHighScores,
        totalDistanceMeters: prev.totalDistanceMeters + stats.distanceMeters,
        totalCoins: prev.totalCoins + stats.coinsCollected,
        gamesPlayed: prev.gamesPlayed + 1,
      };

      // Check unlocks
      const { updatedProgress } = checkAndUnlockBikes(updated);
      saveGameProgress(updatedProgress);
      return updatedProgress;
    });
  }, []);

  // Update difficulty
  const handleSelectDifficulty = (diff: Difficulty) => {
    setProgress((prev) => {
      const next = { ...prev, selectedDifficulty: diff };
      saveGameProgress(next);
      return next;
    });
  };

  // Toggle sound
  const handleToggleSound = () => {
    setProgress((prev) => {
      const next = { ...prev, soundEnabled: !prev.soundEnabled };
      saveGameProgress(next);
      return next;
    });
  };

  // Toggle vibration
  const handleToggleVibration = () => {
    setProgress((prev) => {
      const next = { ...prev, vibrationEnabled: !prev.vibrationEnabled };
      saveGameProgress(next);
      return next;
    });
  };

  // Select active bike
  const handleSelectBike = (bikeId: string) => {
    setProgress((prev) => {
      const next = { ...prev, selectedBikeId: bikeId };
      saveGameProgress(next);
      return next;
    });
    setIsGarageOpen(false);
  };

  // Unlock bike
  const handleUnlockBike = (bikeId: string) => {
    setProgress((prev) => {
      const next = {
        ...prev,
        unlockedBikes: [...new Set([...prev.unlockedBikes, bikeId])],
        selectedBikeId: bikeId,
      };
      saveGameProgress(next);
      return next;
    });
  };

  return (
    <main className="w-full h-full flex items-center justify-center bg-slate-950 overflow-hidden select-none">
      {/* Container: Fluid mobile full-screen, centered on tablet/desktop */}
      <div className="relative w-full h-full max-w-md sm:max-h-[920px] sm:h-[95vh] sm:rounded-3xl sm:border sm:border-slate-800/80 sm:shadow-2xl overflow-hidden bg-slate-950 flex flex-col">
        {/* Game Canvas is active during PLAYING, PAUSED, and GAME_OVER */}
        {gameState !== 'MENU' && (
          <GameCanvas
            key={runKey}
            difficulty={progress.selectedDifficulty}
            progress={progress}
            isPaused={gameState === 'PAUSED'}
            onGameOver={handleGameOver}
            onUpdateHUD={setHudData}
            externalInput={inputState}
          />
        )}

        {/* HUD Overlay during active gameplay */}
        {gameState === 'PLAYING' && (
          <>
            <GameHUD
              score={hudData.score}
              highScore={progress.highScores[progress.selectedDifficulty] || 0}
              speed={hudData.speed}
              distance={hudData.distance}
              boostFuel={hudData.boostFuel}
              isBoosting={hudData.isBoosting}
              stageName={hudData.stageName}
              hasShield={hudData.hasShield}
              difficulty={progress.selectedDifficulty}
              soundEnabled={progress.soundEnabled}
              onToggleSound={handleToggleSound}
              onPause={() => setGameState('PAUSED')}
            />

            {/* Mobile Touch Controls cluster at bottom */}
            <TouchControls
              onInputStateChange={setInputState}
              inputState={inputState}
              boostFuel={hudData.boostFuel}
            />
          </>
        )}

        {/* Start Screen Menu */}
        {gameState === 'MENU' && (
          <StartScreen
            progress={progress}
            onSelectDifficulty={handleSelectDifficulty}
            onStartGame={handleStartGame}
            onOpenGarage={() => setIsGarageOpen(true)}
            onToggleSound={handleToggleSound}
          />
        )}

        {/* Pause Overlay Modal */}
        {gameState === 'PAUSED' && (
          <PauseModal
            progress={progress}
            onResume={() => setGameState('PLAYING')}
            onRestart={handleStartGame}
            onHome={() => setGameState('MENU')}
            onSelectDifficulty={handleSelectDifficulty}
            onToggleSound={handleToggleSound}
            onToggleVibration={handleToggleVibration}
          />
        )}

        {/* Game Over Modal */}
        {gameState === 'GAME_OVER' && latestRunStats && (
          <GameOverModal
            stats={latestRunStats}
            difficulty={progress.selectedDifficulty}
            progress={progress}
            onRestart={handleStartGame}
            onHome={() => setGameState('MENU')}
          />
        )}

        {/* Garage Modal */}
        {isGarageOpen && (
          <GarageModal
            progress={progress}
            onSelectBike={handleSelectBike}
            onUnlockBike={handleUnlockBike}
            onClose={() => setIsGarageOpen(false)}
          />
        )}
      </div>
    </main>
  );
}
