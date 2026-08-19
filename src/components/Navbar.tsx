/**
 * Main Accessible Navigation Bar
 * Switches between Live Monitor, Spatial Memory Graph, Environments Directory, and Change History.
 */

import React from 'react';
import { 
  Eye, 
  Layers, 
  MapPin, 
  History, 
  Mic, 
  Sliders, 
  Volume2 
} from 'lucide-react';
import { audioSynth } from '../services/audioSpatialSynth';

export type AppView = 'monitor' | 'graph' | 'environments' | 'history';

interface NavbarProps {
  currentView: AppView;
  onSelectView: (view: AppView) => void;
  onOpenVoiceModal: () => void;
  onOpenSettingsModal: () => void;
  highContrast: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onSelectView,
  onOpenVoiceModal,
  onOpenSettingsModal,
  highContrast,
}) => {
  const navItems = [
    { id: 'monitor' as const, label: 'Live Monitor', icon: Eye, description: 'Primary continuous observation' },
    { id: 'graph' as const, label: 'Spatial Memory', icon: Layers, description: '2D Topological graph and landmarks' },
    { id: 'environments' as const, label: 'Environments', icon: MapPin, description: 'Discovered spatial memories' },
    { id: 'history' as const, label: 'Change History', icon: History, description: 'Temporal evolution timeline' },
  ];

  return (
    <nav 
      id="main-navigation-bar"
      className={`w-full border-b transition-colors ${
        highContrast 
          ? 'bg-black border-yellow-400 text-white' 
          : 'bg-slate-950 border-slate-800/80 text-slate-200'
      }`}
      role="navigation"
      aria-label="Main application tabs"
    >
      <div className="max-w-7xl mx-auto px-4 flex flex-wrap items-center justify-between gap-2">
        
        {/* Navigation Tabs */}
        <div className="flex items-center overflow-x-auto py-2 gap-1.5 sm:gap-2">
          {navItems.map((item) => {
            const isActive = currentView === item.id;
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                id={`nav-tab-${item.id}`}
                onClick={() => {
                  audioSynth.playClickSound();
                  onSelectView(item.id);
                }}
                className={`py-2.5 px-3.5 sm:px-4 rounded-xl font-extrabold text-xs sm:text-sm flex items-center gap-2 transition-all shrink-0 ${
                  isActive
                    ? highContrast
                      ? 'bg-yellow-400 text-black shadow'
                      : 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                    : highContrast
                      ? 'text-yellow-300 hover:bg-zinc-900'
                      : 'text-slate-300 hover:text-white hover:bg-slate-900'
                }`}
                role="tab"
                aria-selected={isActive}
                aria-label={`${item.label}: ${item.description}`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right Aux Buttons (Voice Command Sheet & Settings) */}
        <div className="flex items-center gap-2 py-2">
          <button
            id="btn-nav-voice-commands"
            onClick={() => {
              audioSynth.playClickSound();
              onOpenVoiceModal();
            }}
            className="py-2 px-3 rounded-xl bg-slate-900 border border-slate-700 hover:border-cyan-400 text-cyan-300 text-xs font-bold flex items-center gap-1.5 transition shadow"
            aria-label="Open voice command sheet"
          >
            <Mic className="w-4 h-4 text-cyan-400" />
            <span className="hidden sm:inline">Voice Assistant</span>
          </button>

          <button
            id="btn-nav-settings"
            onClick={() => {
              audioSynth.playClickSound();
              onOpenSettingsModal();
            }}
            className="p-2 sm:px-3 sm:py-2 rounded-xl bg-slate-900 border border-slate-700 hover:border-slate-500 text-slate-300 text-xs font-bold flex items-center gap-1.5 transition shadow"
            aria-label="Open settings and preferences"
          >
            <Sliders className="w-4 h-4" />
            <span className="hidden sm:inline">Settings</span>
          </button>
        </div>

      </div>
    </nav>
  );
};
