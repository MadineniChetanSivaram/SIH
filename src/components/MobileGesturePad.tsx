/**
 * Mobile Eyes-Free Gesture Pad
 * Allows blind users to operate SpatialEye with single-hand touch gestures
 * without needing to look at or precisely aim for on-screen buttons.
 */

import React, { useState, useRef } from 'react';
import { 
  Touchpad, 
  ArrowUp, 
  ArrowDown, 
  ArrowLeft, 
  ArrowRight, 
  Play, 
  Square, 
  Mic, 
  Volume2, 
  HelpCircle,
  X
} from 'lucide-react';
import { audioSynth } from '../services/audioSpatialSynth';
import { hapticsService } from '../services/hapticsService';
import { speechService } from '../services/speechService';
import { VoiceCommandIntent } from '../types';

interface MobileGesturePadProps {
  isOpen: boolean;
  onClose: () => void;
  isMonitoring: boolean;
  onToggleMonitoring: () => void;
  onExecuteCommand: (intent: VoiceCommandIntent) => void;
  onOpenVoiceModal: () => void;
  highContrast: boolean;
}

export const MobileGesturePad: React.FC<MobileGesturePadProps> = ({
  isOpen,
  onClose,
  isMonitoring,
  onToggleMonitoring,
  onExecuteCommand,
  onOpenVoiceModal,
  highContrast,
}) => {
  const [touchFeedback, setTouchFeedback] = useState<string>('Ready for gesture');
  const [touchPos, setTouchPos] = useState<{ x: number; y: number } | null>(null);

  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const longPressTimerRef = useRef<number | null>(null);
  const lastTapTimeRef = useRef<number>(0);

  if (!isOpen) return null;

  const handleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    touchStartRef.current = { x: clientX, y: clientY, time: Date.now() };
    setTouchPos({ x: clientX, y: clientY });

    audioSynth.playClickSound();
    hapticsService.trigger('tap');

    // Long press detection for Voice Mic
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = window.setTimeout(() => {
      hapticsService.trigger('critical');
      audioSynth.playStateChime('ping');
      setTouchFeedback('🎙️ Voice Command Activated');
      speechService.speak('Listening for voice command...');
      onOpenVoiceModal();
      touchStartRef.current = null;
    }, 650);
  };

  const handleTouchEnd = (e: React.TouchEvent | React.MouseEvent) => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    if (!touchStartRef.current) return;

    const startX = touchStartRef.current.x;
    const startY = touchStartRef.current.y;
    const startTime = touchStartRef.current.time;
    const duration = Date.now() - startTime;

    const clientX = 'changedTouches' in e ? e.changedTouches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'changedTouches' in e ? e.changedTouches[0].clientY : (e as React.MouseEvent).clientY;

    const deltaX = clientX - startX;
    const deltaY = clientY - startY;
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    const minSwipeDist = 50;

    if (absX > minSwipeDist || absY > minSwipeDist) {
      // Swipe Detected
      if (absX > absY) {
        if (deltaX < 0) {
          // Swipe Left -> "What changed?"
          hapticsService.trigger('warning');
          audioSynth.playStateChime('mode_change');
          setTouchFeedback('⬅️ Swipe Left: What Changed?');
          onExecuteCommand({ action: 'WHAT_CHANGED', rawQuery: 'what changed' });
        } else {
          // Swipe Right -> "Repeat Alert"
          hapticsService.trigger('info');
          audioSynth.playClickSound();
          setTouchFeedback('➡️ Swipe Right: Repeat Alert');
          onExecuteCommand({ action: 'REPEAT_ALERT', rawQuery: 'repeat' });
        }
      } else {
        if (deltaY < 0) {
          // Swipe Up -> "Describe surroundings"
          hapticsService.trigger('info');
          audioSynth.playStateChime('ping');
          setTouchFeedback('⬆️ Swipe Up: Describe Surroundings');
          onExecuteCommand({ action: 'DESCRIBE_SURROUNDINGS', rawQuery: 'describe surroundings' });
        } else {
          // Swipe Down -> "Where am I?"
          hapticsService.trigger('info');
          audioSynth.playStateChime('ping');
          setTouchFeedback('⬇️ Swipe Down: Where Am I?');
          onExecuteCommand({ action: 'WHERE_AM_I', rawQuery: 'where am i' });
        }
      }
    } else if (duration < 400) {
      // Tap or Double Tap
      const now = Date.now();
      if (now - lastTapTimeRef.current < 350) {
        // Double Tap -> Toggle Monitoring
        hapticsService.trigger('critical');
        audioSynth.playStateChime('success');
        setTouchFeedback(isMonitoring ? '⏸️ Double Tap: Paused' : '▶️ Double Tap: Monitoring');
        onToggleMonitoring();
        lastTapTimeRef.current = 0;
      } else {
        // Single Tap -> What is ahead
        lastTapTimeRef.current = now;
        setTimeout(() => {
          if (Date.now() - lastTapTimeRef.current >= 340 && lastTapTimeRef.current !== 0) {
            hapticsService.trigger('tap');
            audioSynth.playClickSound();
            setTouchFeedback('👆 Single Tap: What is Ahead?');
            onExecuteCommand({ action: 'WHAT_IS_AHEAD', rawQuery: 'what is ahead' });
          }
        }, 350);
      }
    }

    touchStartRef.current = null;
    setTimeout(() => setTouchPos(null), 300);
  };

  return (
    <div
      id="mobile-gesture-pad-modal"
      className="fixed inset-0 z-50 bg-black/95 flex flex-col justify-between select-none touch-none"
      role="dialog"
      aria-label="Eyes-free tactile gesture pad"
    >
      {/* Top Header */}
      <div className="p-4 flex items-center justify-between border-b border-zinc-800 bg-zinc-950/80">
        <div className="flex items-center gap-2">
          <Touchpad className="w-5 h-5 text-cyan-400" />
          <h2 className="font-extrabold text-sm text-white">Eyes-Free Gesture Pad</h2>
        </div>
        <button
          onClick={() => {
            audioSynth.playClickSound();
            onClose();
          }}
          className="p-2 rounded-xl bg-zinc-800 text-zinc-300 hover:text-white"
          aria-label="Close gesture pad"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main Touch Canvas Area */}
      <div
        id="gesture-pad-touch-surface"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleTouchStart}
        onMouseUp={handleTouchEnd}
        className="flex-1 w-full flex flex-col items-center justify-center relative cursor-pointer active:bg-zinc-900/40 transition-colors"
      >
        {/* Dynamic Ripple circle on touch */}
        {touchPos && (
          <div
            className="absolute w-24 h-24 rounded-full border-2 border-cyan-400 bg-cyan-400/20 animate-ping pointer-events-none"
            style={{ left: touchPos.x - 48, top: touchPos.y - 48 }}
          />
        )}

        {/* Central Gesture Guide */}
        <div className="max-w-xs w-full px-6 flex flex-col items-center gap-6 text-center pointer-events-none">
          <div className="w-20 h-20 rounded-full border-2 border-cyan-500/40 bg-cyan-950/30 flex items-center justify-center shadow-lg shadow-cyan-500/10">
            <Touchpad className="w-10 h-10 text-cyan-400" />
          </div>

          <div className="px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-white font-bold text-sm">
            {touchFeedback}
          </div>

          {/* Gesture Cheat Sheet */}
          <div className="grid grid-cols-2 gap-2 text-left text-xs text-zinc-400 font-medium">
            <div className="p-2 rounded-lg bg-zinc-900/80 border border-zinc-800">
              <span className="text-cyan-400 font-bold">1 Tap:</span> What's Ahead
            </div>
            <div className="p-2 rounded-lg bg-zinc-900/80 border border-zinc-800">
              <span className="text-yellow-400 font-bold">2 Taps:</span> Start/Stop
            </div>
            <div className="p-2 rounded-lg bg-zinc-900/80 border border-zinc-800">
              <span className="text-emerald-400 font-bold">⬆️ Up:</span> Surroundings
            </div>
            <div className="p-2 rounded-lg bg-zinc-900/80 border border-zinc-800">
              <span className="text-amber-400 font-bold">⬅️ Left:</span> What Changed
            </div>
            <div className="p-2 rounded-lg bg-zinc-900/80 border border-zinc-800">
              <span className="text-indigo-400 font-bold">⬇️ Down:</span> Where Am I
            </div>
            <div className="p-2 rounded-lg bg-zinc-900/80 border border-zinc-800">
              <span className="text-rose-400 font-bold">Hold:</span> Voice Mic
            </div>
          </div>
        </div>
      </div>

      {/* Bottom status bar */}
      <div className="p-4 border-t border-zinc-800 bg-zinc-950 text-center text-xs text-zinc-500">
        Touch anywhere on screen. Full eyes-free feedback enabled.
      </div>
    </div>
  );
};
