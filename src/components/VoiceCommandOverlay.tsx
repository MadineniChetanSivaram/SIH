/**
 * Voice Command Overlay & Assistant Panel
 * Displays speech recognition transcript, suggested commands, and quick voice shortcuts.
 */

import React from 'react';
import { 
  Mic, 
  MicOff, 
  X, 
  RotateCcw, 
  HelpCircle, 
  CheckCircle2, 
  AlertCircle,
  Eye,
  Navigation,
  Compass,
  BookmarkPlus
} from 'lucide-react';
import { VoiceCommandIntent } from '../types';
import { audioSynth } from '../services/audioSpatialSynth';

interface VoiceCommandOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  isListening: boolean;
  onToggleListening: () => void;
  transcript: string;
  onExecuteCommand: (intent: VoiceCommandIntent) => void;
  highContrast: boolean;
}

const COMMAND_SHORTCUTS = [
  { text: 'Start monitoring', action: 'START_MONITORING' as const, icon: Navigation, desc: 'Begin continuous comparison with spatial memory' },
  { text: 'Stop monitoring', action: 'STOP_MONITORING' as const, icon: X, desc: 'Pause environmental observation' },
  { text: 'What changed?', action: 'WHAT_CHANGED' as const, icon: AlertCircle, desc: 'Speak all ranked differences in current space' },
  { text: 'Describe surroundings', action: 'DESCRIBE_SURROUNDINGS' as const, icon: Eye, desc: 'Detailed spatial overview and landmark summary' },
  { text: 'Where am I?', action: 'WHERE_AM_I' as const, icon: Compass, desc: 'Identify current recognized environment and confidence' },
  { text: 'Where is the staircase?', action: 'FIND_OBJECT' as const, target: 'staircase', icon: Navigation, desc: 'Locate nearest stairs with clock angle and distance' },
  { text: 'Remember environment', action: 'REMEMBER_ENVIRONMENT' as const, icon: BookmarkPlus, desc: 'Map and anchor current environment into spatial memory' },
  { text: 'Repeat last alert', action: 'REPEAT_ALERT' as const, icon: RotateCcw, desc: 'Replay the most recent speech announcement' },
];

export const VoiceCommandOverlay: React.FC<VoiceCommandOverlayProps> = ({
  isOpen,
  onClose,
  isListening,
  onToggleListening,
  transcript,
  onExecuteCommand,
  highContrast,
}) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="voice-modal-title"
    >
      <div 
        className={`w-full max-w-2xl rounded-2xl border p-6 max-h-[90vh] overflow-y-auto ${
          highContrast 
            ? 'bg-black border-2 border-yellow-400 text-white' 
            : 'bg-slate-900 border-slate-700 text-slate-100 shadow-2xl'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-xl ${isListening ? 'bg-red-600 text-white animate-pulse' : 'bg-cyan-500/20 text-cyan-400'}`}>
              {isListening ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
            </div>
            <div>
              <h2 id="voice-modal-title" className="text-xl font-bold">Voice Assistant Interface</h2>
              <p className="text-sm text-slate-300">
                {isListening ? 'Listening for speech input...' : 'Microphone ready. Tap button or speak command.'}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              audioSynth.playClickSound();
              onClose();
            }}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            aria-label="Close voice command panel"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Live Transcript Box */}
        <div className="my-5 p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400 uppercase tracking-wider">
            <span>Speech Recognition Stream</span>
            {isListening && <span className="text-red-400 flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500 animate-ping" /> LIVE</span>}
          </div>
          <div className="min-h-[48px] flex items-center text-lg font-medium text-cyan-300">
            {transcript ? (
              <span>"{transcript}"</span>
            ) : (
              <span className="text-slate-500 italic">
                {isListening ? 'Listening... Speak your command now.' : 'Microphone inactive.'}
              </span>
            )}
          </div>
        </div>

        {/* Mic Toggle Button */}
        <div className="flex justify-center mb-6">
          <button
            onClick={() => {
              audioSynth.playClickSound();
              onToggleListening();
            }}
            className={`px-8 py-4 rounded-2xl font-bold text-lg flex items-center gap-3 transition-all active:scale-95 shadow-xl ${
              isListening
                ? 'bg-red-600 hover:bg-red-500 text-white ring-4 ring-red-500/30'
                : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 ring-4 ring-cyan-500/20'
            }`}
            aria-label={isListening ? 'Stop speech recognition' : 'Start speech recognition'}
          >
            {isListening ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
            <span>{isListening ? 'STOP LISTENING' : 'TAP TO SPEAK'}</span>
          </button>
        </div>

        {/* Shortcut Quick Action Commands */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Supported Voice Commands & Shortcuts
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {COMMAND_SHORTCUTS.map((cmd, idx) => {
              const Icon = cmd.icon;
              return (
                <button
                  key={idx}
                  onClick={() => {
                    audioSynth.playClickSound();
                    onExecuteCommand({
                      action: cmd.action,
                      targetObject: (cmd as any).target,
                      rawQuery: cmd.text,
                    });
                    onClose();
                  }}
                  className="p-3 rounded-xl bg-slate-800/80 hover:bg-slate-750 border border-slate-700 hover:border-cyan-500/50 text-left transition flex items-start gap-3"
                >
                  <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 shrink-0 mt-0.5">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-100">"{cmd.text}"</div>
                    <div className="text-xs text-slate-400 mt-0.5">{cmd.desc}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
