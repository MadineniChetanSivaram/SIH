/**
 * Mobile Bottom Navigation Bar
 * Ergonomic thumb-zone navigation bar with 48px+ touch targets, haptic feedback,
 * and high-contrast accessibility themes.
 */

import React from 'react';
import { Eye, Layers, MapPin, History, Mic } from 'lucide-react';
import { AppView } from './Navbar';
import { audioSynth } from '../services/audioSpatialSynth';
import { hapticsService } from '../services/hapticsService';

interface MobileBottomNavProps {
  currentView: AppView;
  onSelectView: (view: AppView) => void;
  onOpenVoiceModal: () => void;
  isListening: boolean;
  unacknowledgedChangesCount: number;
  highContrast: boolean;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentView,
  onSelectView,
  onOpenVoiceModal,
  isListening,
  unacknowledgedChangesCount,
  highContrast,
}) => {
  const tabs = [
    { id: 'monitor' as const, label: 'Monitor', icon: Eye, description: 'Live camera and spatial sonar' },
    { id: 'graph' as const, label: 'Memory', icon: Layers, description: 'Spatial landmarks graph' },
    { id: 'environments' as const, label: 'Environments', icon: MapPin, description: 'Discovered memories' },
    { id: 'history' as const, label: 'Changes', icon: History, description: 'Temporal differences timeline', badge: unacknowledgedChangesCount },
  ];

  return (
    <nav
      id="mobile-bottom-navigation"
      className={`fixed bottom-0 left-0 right-0 z-40 pb-safe border-t transition-colors select-none ${
        highContrast
          ? 'bg-black border-yellow-400 text-white shadow-2xl'
          : 'bg-slate-950/95 border-slate-800/90 text-slate-200 backdrop-blur-lg shadow-2xl shadow-black/80'
      }`}
      role="navigation"
      aria-label="Mobile Bottom App Navigation"
    >
      <div className="max-w-lg mx-auto px-2 flex items-center justify-around relative">
        
        {/* Left 2 Tabs */}
        {tabs.slice(0, 2).map((tab) => {
          const isActive = currentView === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              id={`mobile-tab-${tab.id}`}
              onClick={() => {
                audioSynth.playClickSound();
                hapticsService.trigger('tap');
                onSelectView(tab.id);
              }}
              className={`flex-1 py-3 px-1 flex flex-col items-center justify-center gap-1 min-h-[56px] transition-all relative ${
                isActive
                  ? highContrast
                    ? 'text-yellow-400 font-black scale-105'
                    : 'text-cyan-400 font-extrabold scale-105'
                  : highContrast
                    ? 'text-zinc-400 hover:text-white font-medium'
                    : 'text-slate-400 hover:text-slate-200 font-medium'
              }`}
              role="tab"
              aria-selected={isActive}
              aria-label={`${tab.label}: ${tab.description}`}
            >
              <Icon className={`w-5 h-5 ${isActive ? (highContrast ? 'stroke-[2.5]' : 'text-cyan-400') : ''}`} />
              <span className="text-[11px] tracking-tight">{tab.label}</span>
              {isActive && (
                <div
                  className={`w-4 h-1 rounded-full mt-0.5 ${
                    highContrast ? 'bg-yellow-400' : 'bg-cyan-400 shadow-sm shadow-cyan-400/50'
                  }`}
                />
              )}
            </button>
          );
        })}

        {/* Center Floating Mic Trigger (Thumb center action) */}
        <div className="px-1 -mt-5 flex flex-col items-center">
          <button
            id="mobile-center-voice-trigger"
            onClick={() => {
              audioSynth.playClickSound();
              hapticsService.trigger('info');
              onOpenVoiceModal();
            }}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-transform active:scale-95 shadow-xl ${
              isListening
                ? 'bg-rose-500 text-white ring-4 ring-rose-400/50 animate-pulse'
                : highContrast
                  ? 'bg-yellow-400 text-black ring-4 ring-yellow-400/30'
                  : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 ring-4 ring-cyan-500/20 shadow-cyan-500/30'
            }`}
            aria-label={isListening ? 'Microphone listening' : 'Activate Voice Assistant'}
            title="Tap to speak voice command"
          >
            <Mic className="w-6 h-6 stroke-[2.5]" />
          </button>
          <span className="text-[9px] font-bold text-cyan-400 mt-1 uppercase tracking-wider">Voice</span>
        </div>

        {/* Right 2 Tabs */}
        {tabs.slice(2, 4).map((tab) => {
          const isActive = currentView === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              id={`mobile-tab-${tab.id}`}
              onClick={() => {
                audioSynth.playClickSound();
                hapticsService.trigger('tap');
                onSelectView(tab.id);
              }}
              className={`flex-1 py-3 px-1 flex flex-col items-center justify-center gap-1 min-h-[56px] transition-all relative ${
                isActive
                  ? highContrast
                    ? 'text-yellow-400 font-black scale-105'
                    : 'text-cyan-400 font-extrabold scale-105'
                  : highContrast
                    ? 'text-zinc-400 hover:text-white font-medium'
                    : 'text-slate-400 hover:text-slate-200 font-medium'
              }`}
              role="tab"
              aria-selected={isActive}
              aria-label={`${tab.label}: ${tab.description}`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? (highContrast ? 'stroke-[2.5]' : 'text-cyan-400') : ''}`} />
                {Boolean(tab.badge && tab.badge > 0) && (
                  <span className="absolute -top-1 -right-2 w-4 h-4 rounded-full bg-rose-500 text-white font-black text-[9px] flex items-center justify-center">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className="text-[11px] tracking-tight">{tab.label}</span>
              {isActive && (
                <div
                  className={`w-4 h-1 rounded-full mt-0.5 ${
                    highContrast ? 'bg-yellow-400' : 'bg-cyan-400 shadow-sm shadow-cyan-400/50'
                  }`}
                />
              )}
            </button>
          );
        })}

      </div>
    </nav>
  );
};
