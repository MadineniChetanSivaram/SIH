/**
 * Accessible Tactile Status Bar
 * Displays active environment ID, autonomous recognition state, safety alerts, and voice status.
 */

import React from 'react';
import { Environment, EnvironmentalChange } from '../types';
import { 
  ShieldCheck, 
  AlertTriangle, 
  AlertOctagon, 
  Layers, 
  Eye, 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  EyeOff, 
  Touchpad, 
  Compass,
  Cpu
} from 'lucide-react';
import { audioSynth } from '../services/audioSpatialSynth';
import { hapticsService } from '../services/hapticsService';

interface TactileStatusBarProps {
  activeEnvironment: Environment | null;
  isRecognizing?: boolean;
  isMonitoring: boolean;
  isListening: boolean;
  onToggleMic: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  latestChange: EnvironmentalChange | null;
  highContrast: boolean;
  onOpenScreenCurtain?: () => void;
  onOpenGesturePad?: () => void;
  headingDegrees?: number;
}

export const TactileStatusBar: React.FC<TactileStatusBarProps> = ({
  activeEnvironment,
  isRecognizing = false,
  isMonitoring,
  isListening,
  onToggleMic,
  isMuted,
  onToggleMute,
  latestChange,
  highContrast,
  onOpenScreenCurtain,
  onOpenGesturePad,
  headingDegrees = 0,
}) => {
  const getCardinal = (deg: number) => {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const idx = Math.round(deg / 45) % 8;
    return directions[idx];
  };

  const getRiskBadge = () => {
    if (!isMonitoring) {
      return (
        <div 
          id="status-monitoring-idle"
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs sm:text-sm font-semibold ${
            highContrast ? 'bg-zinc-800 text-yellow-300 border border-yellow-400' : 'bg-slate-800 text-slate-300'
          }`}
          role="status"
          aria-label="Monitoring is currently paused"
        >
          <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-slate-400" />
          <span>Monitoring Standby</span>
        </div>
      );
    }

    if (isRecognizing) {
      return (
        <div 
          id="status-recognizing-badge"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs sm:text-sm font-semibold bg-amber-950/80 text-amber-300 border border-amber-500/40"
        >
          <Cpu className="w-3.5 h-3.5 animate-spin" />
          <span>Discovering Environment...</span>
        </div>
      );
    }

    if (!latestChange || latestChange.riskLevel === 'none') {
      return (
        <div 
          id="status-safe-banner"
          className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-semibold ${
            highContrast 
              ? 'bg-black text-green-300 border-2 border-green-400' 
              : 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/30'
          }`}
          role="status"
          aria-label="No significant changes detected along your familiar path"
        >
          <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400 shrink-0" />
          <span>Path Consistent</span>
        </div>
      );
    }

    if (latestChange.riskLevel === 'critical') {
      return (
        <div 
          id="status-critical-banner"
          className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-bold animate-pulse ${
            highContrast 
              ? 'bg-black text-rose-300 border-2 border-rose-500' 
              : 'bg-rose-950/90 text-rose-200 border border-rose-500/50 shadow-lg shadow-rose-950/50'
          }`}
          role="alert"
          aria-live="assertive"
          aria-label={`Critical warning: ${latestChange.verbalAlertText}`}
        >
          <AlertOctagon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-400 shrink-0" />
          <span>Obstacle on Habitual Route</span>
        </div>
      );
    }

    return (
      <div 
        id="status-warning-banner"
        className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-semibold ${
          highContrast 
            ? 'bg-black text-yellow-300 border-2 border-yellow-400' 
            : 'bg-amber-950/80 text-amber-300 border border-amber-500/30'
        }`}
        role="alert"
        aria-live="polite"
        aria-label={`Caution: ${latestChange.verbalAlertText}`}
      >
        <AlertTriangle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400 shrink-0" />
        <span>New Environmental Difference</span>
      </div>
    );
  };

  const envDisplay = activeEnvironment?.customLabel 
    ? `${activeEnvironment.id} • ${activeEnvironment.customLabel}`
    : activeEnvironment?.id || 'Unknown Environment';

  return (
    <header 
      id="tactile-telemetry-header"
      className={`w-full border-b transition-colors ${
        highContrast 
          ? 'bg-black border-yellow-400 text-white' 
          : 'bg-slate-900/95 border-slate-800 text-slate-100 backdrop-blur-md'
      }`}
      role="banner"
      aria-label="SpatialEye Telemetry and Quick Controls"
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 sm:gap-4">
        
        {/* Brand & Active Environment */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div 
            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center font-black text-sm tracking-tight ${
              highContrast ? 'bg-yellow-400 text-black' : 'bg-cyan-500 text-slate-950'
            }`}
            aria-hidden="true"
          >
            <Eye className="w-5 h-5" />
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-sm sm:text-base tracking-tight">SpatialEye</span>
              <span className="text-[10px] font-mono uppercase px-1.5 py-0.2 rounded bg-slate-800 text-cyan-400 border border-slate-700">
                v2.0
              </span>
            </div>
            
            <div className="flex items-center gap-1 text-xs text-slate-400">
              <Layers className="w-3 h-3 text-cyan-400 shrink-0" />
              <span className="truncate max-w-[160px] sm:max-w-[240px] font-medium text-slate-200">
                {envDisplay}
              </span>
            </div>
          </div>
        </div>

        {/* Dynamic Safety & Change Status Banner */}
        <div className="order-3 sm:order-2 w-full sm:w-auto flex justify-center sm:justify-start">
          {getRiskBadge()}
        </div>

        {/* Quick Hardware Controls (Compass, Pocket Mode, Gesture Pad, Voice Mic, Mute) */}
        <div className="order-2 sm:order-3 flex items-center gap-1.5 sm:gap-2">
          
          {/* Compass Telemetry Chip */}
          <div 
            className="hidden md:flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/80 text-xs font-mono text-cyan-300"
            title={`Heading: ${headingDegrees}° (${getCardinal(headingDegrees)})`}
            aria-label={`Compass orientation: ${getCardinal(headingDegrees)} at ${headingDegrees} degrees`}
          >
            <Compass className="w-3.5 h-3.5 text-cyan-400" />
            <span>{getCardinal(headingDegrees)} {headingDegrees}°</span>
          </div>

          {/* Pocket Mode / Screen Curtain Trigger */}
          {onOpenScreenCurtain && (
            <button
              id="btn-pocket-curtain-quick"
              onClick={() => {
                audioSynth.playClickSound();
                hapticsService.trigger('light');
                onOpenScreenCurtain();
              }}
              className="p-2 sm:p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-purple-300 border border-slate-700 transition-transform active:scale-95"
              title="Pocket Mode: Blank screen to protect battery and touches while audio navigation runs"
              aria-label="Activate pocket mode screen curtain"
            >
              <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          )}

          {/* Eyes-Free Gesture Pad Trigger */}
          {onOpenGesturePad && (
            <button
              id="btn-gesture-pad-quick"
              onClick={() => {
                audioSynth.playClickSound();
                hapticsService.trigger('light');
                onOpenGesturePad();
              }}
              className="p-2 sm:p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-cyan-300 border border-slate-700 transition-transform active:scale-95"
              title="Eyes-Free Gesture Pad: One-handed full-screen gestures for blind navigation"
              aria-label="Open eyes-free gesture pad"
            >
              <Touchpad className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          )}

          {/* Voice Microphone Activation Button */}
          <button
            id="btn-quick-voice-toggle"
            onClick={() => {
              onToggleMic();
            }}
            className={`p-2 sm:p-2.5 rounded-xl border transition-transform active:scale-95 flex items-center justify-center ${
              isListening
                ? 'bg-rose-500 text-white border-rose-400 ring-2 ring-rose-400/50 animate-pulse'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
            aria-label={isListening ? 'Microphone active, listening for commands' : 'Tap to activate voice command'}
            title={isListening ? 'Listening...' : 'Voice command (tap to speak)'}
          >
            {isListening ? (
              <Mic className="w-4 h-4 sm:w-5 sm:h-5" />
            ) : (
              <MicOff className="w-4 h-4 sm:w-5 sm:h-5" />
            )}
          </button>

          {/* Audio Mute/Unmute */}
          <button
            id="btn-quick-mute-toggle"
            onClick={() => {
              audioSynth.playClickSound();
              hapticsService.trigger('tap');
              onToggleMute();
            }}
            className={`p-2 sm:p-2.5 rounded-xl border transition-transform active:scale-95 flex items-center justify-center ${
              isMuted
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
            aria-label={isMuted ? 'Unmute assistive audio feedback' : 'Mute audio sonar and alerts'}
            title={isMuted ? 'Unmute' : 'Mute audio'}
          >
            {isMuted ? (
              <VolumeX className="w-4 h-4 sm:w-5 sm:h-5" />
            ) : (
              <Volume2 className="w-4 h-4 sm:w-5 sm:h-5" />
            )}
          </button>

        </div>

      </div>
    </header>
  );
};
