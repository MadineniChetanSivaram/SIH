/**
 * Screen Curtain / Pocket Mode Component for Blind Users
 * Blanks out the display to pure black to save battery and prevent accidental touches in pockets or lanyards,
 * while spatial audio monitoring, haptic pulses, and voice announcements run in background.
 * Double-tap or 3-finger tap unlocks the screen.
 */

import React, { useState, useEffect } from 'react';
import { Shield, EyeOff, Volume2, Compass } from 'lucide-react';
import { audioSynth } from '../services/audioSpatialSynth';
import { hapticsService } from '../services/hapticsService';
import { speechService } from '../services/speechService';
import { EnvironmentalChange } from '../types';

interface ScreenCurtainProps {
  isOpen?: boolean;
  isActive?: boolean;
  onClose?: () => void;
  onDismiss?: () => void;
  isMonitoring: boolean;
  onToggleMonitoring?: () => void;
  onWhatChanged?: () => void;
  onDescribeSurroundings?: () => void;
  topChange?: EnvironmentalChange | null;
  latestChange?: EnvironmentalChange | null;
  headingDegrees?: number;
}

export const ScreenCurtain: React.FC<ScreenCurtainProps> = ({
  isOpen,
  isActive,
  onClose,
  onDismiss,
  isMonitoring,
  headingDegrees = 0,
}) => {
  const visible = isOpen ?? isActive ?? false;
  const handleClose = onClose ?? onDismiss ?? (() => {});

  const [tapCount, setTapCount] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<string>(() => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

  useEffect(() => {
    if (!visible) return;
    const interval = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }, 10000);
    return () => clearInterval(interval);
  }, [visible]);

  if (!visible) return null;

  const handleCurtainTap = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    audioSynth.playClickSound();
    hapticsService.trigger('tap');

    const nextCount = tapCount + 1;
    setTapCount(nextCount);

    if (nextCount >= 2) {
      audioSynth.playStateChime('success');
      hapticsService.trigger('info');
      speechService.speak('Screen curtain deactivated. Display visible.');
      handleClose();
      setTapCount(0);
    } else {
      speechService.speak('Tap once more to exit screen curtain.', { cooldownMs: 1500 });
      setTimeout(() => {
        setTapCount(0);
      }, 1200);
    }
  };

  const getCardinal = (deg: number) => {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const idx = Math.round(deg / 45) % 8;
    return directions[idx];
  };

  return (
    <div
      id="screen-curtain-overlay"
      onTouchStart={handleCurtainTap}
      onClick={handleCurtainTap}
      className="fixed inset-0 z-50 bg-black text-zinc-600 flex flex-col justify-between p-6 select-none cursor-pointer"
      role="region"
      aria-label="Screen Curtain active. Display is black to save battery. Double-tap screen to unlock."
    >
      {/* Top faint status for companion/caregiver inspection */}
      <div className="flex items-center justify-between text-xs opacity-40">
        <div className="flex items-center gap-2">
          <EyeOff className="w-4 h-4 text-cyan-500" />
          <span className="font-mono uppercase tracking-widest text-zinc-400">Pocket Mode Active</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <Compass className="w-3.5 h-3.5 text-zinc-400" />
            {headingDegrees}° {getCardinal(headingDegrees)}
          </span>
          <span className="flex items-center gap-1">
            <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
            Audio Active
          </span>
        </div>
      </div>

      {/* Center Minimal Tactile Info */}
      <div className="flex flex-col items-center justify-center text-center gap-4 my-auto">
        <div className="w-16 h-16 rounded-full border border-zinc-900 flex items-center justify-center text-zinc-700">
          <Shield className={`w-8 h-8 ${isMonitoring ? 'text-emerald-900 animate-pulse' : 'text-zinc-800'}`} />
        </div>

        <div>
          <h2 className="text-zinc-500 text-sm font-bold uppercase tracking-wider">SpatialEye Pocket Mode</h2>
          <p className="text-zinc-700 text-xs mt-1">
            {isMonitoring ? 'Continuous spatial memory monitoring running in background' : 'Monitoring on standby'}
          </p>
        </div>

        <div className="mt-4 px-4 py-2 rounded-xl bg-zinc-950 border border-zinc-900/60 text-xs text-zinc-600 font-mono">
          Double-tap anywhere to wake screen
        </div>
      </div>

      {/* Bottom info */}
      <div className="flex items-center justify-between text-xs opacity-30 text-zinc-500 font-mono">
        <span>{currentTime}</span>
        <span>SpatialEye Mobile</span>
      </div>
    </div>
  );
};
