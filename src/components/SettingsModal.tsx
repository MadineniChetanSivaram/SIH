/**
 * Accessibility & System Settings Panel
 * Configures speech synthesis rate/pitch, haptics, risk sensitivity,
 * and handles offline backup export/import.
 */

import React, { useState } from 'react';
import { UserPreferences } from '../types';
import { 
  Sliders, 
  Volume2, 
  Vibrate, 
  ShieldAlert, 
  Download, 
  Upload, 
  RotateCcw, 
  X, 
  Check, 
  Sun, 
  Sparkles 
} from 'lucide-react';
import { audioSynth } from '../services/audioSpatialSynth';
import { hapticsService } from '../services/hapticsService';
import { speechService } from '../services/speechService';
import { DatabaseService } from '../services/database';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  preferences: UserPreferences;
  onSavePreferences: (updated: UserPreferences) => void;
  onReloadData: () => void;
  highContrast: boolean;
  onToggleHighContrast: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  preferences,
  onSavePreferences,
  onReloadData,
  highContrast,
  onToggleHighContrast,
}) => {
  const [speechRate, setSpeechRate] = useState<number>(preferences.speechRate);
  const [speechPitch, setSpeechPitch] = useState<number>(preferences.speechPitch);
  const [hapticsEnabled, setHapticsEnabled] = useState<boolean>(preferences.hapticsEnabled);
  const [audioCuesEnabled, setAudioCuesEnabled] = useState<boolean>(preferences.audioCuesEnabled);
  const [riskThreshold, setRiskThreshold] = useState<'low' | 'medium' | 'high'>(preferences.riskThreshold);

  if (!isOpen) return null;

  const handleSave = () => {
    const updated: UserPreferences = {
      ...preferences,
      speechRate,
      speechPitch,
      hapticsEnabled,
      audioCuesEnabled,
      riskThreshold,
    };
    onSavePreferences(updated);
    speechService.setPreferences(speechRate, speechPitch);
    hapticsService.setEnabled(hapticsEnabled);
    audioSynth.setMuted(!audioCuesEnabled);
    audioSynth.playStateChime('success');
    speechService.speak('Settings saved successfully.');
    onClose();
  };

  const handleTestSpeech = () => {
    speechService.setPreferences(speechRate, speechPitch);
    speechService.speak('This is a test of SpatialEye speech output at the selected speech rate.');
  };

  const handleTestHaptics = (type: 'info' | 'warning' | 'critical') => {
    hapticsService.trigger(type);
    audioSynth.playClickSound();
  };

  const handleExportJSON = () => {
    const jsonStr = DatabaseService.exportAllDataJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `spatialeye-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    speechService.speak('Spatial memory data exported successfully.');
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      const success = DatabaseService.importDataJSON(content);
      if (success) {
        onReloadData();
        speechService.speak('Spatial memory data imported successfully.');
        alert('Backup successfully restored!');
      } else {
        alert('Failed to parse backup JSON.');
      }
    };
    reader.readAsText(file);
  };

  const handleReset = () => {
    if (confirm('Reset all places, memories, and preferences to factory seed data?')) {
      DatabaseService.resetDefaults();
      onReloadData();
      speechService.speak('Reset to default spatial memories.');
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
    >
      <div 
        className={`w-full max-w-2xl rounded-2xl border p-6 max-h-[90vh] overflow-y-auto ${
          highContrast ? 'bg-black border-2 border-yellow-400 text-white' : 'bg-slate-900 border-slate-700 text-slate-100 shadow-2xl'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-cyan-500/20 text-cyan-400">
              <Sliders className="w-6 h-6" />
            </div>
            <div>
              <h2 id="settings-modal-title" className="text-xl font-bold">Preferences & Accessibility</h2>
              <p className="text-xs text-slate-300">Tune voice guidance, haptic pulse cadence, and memory backups.</p>
            </div>
          </div>

          <button
            onClick={() => {
              audioSynth.playClickSound();
              onClose();
            }}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            aria-label="Close settings"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="py-5 flex flex-col gap-6">
          
          {/* 1. Speech Synthesis Section */}
          <div className="flex flex-col gap-3 p-4 rounded-xl bg-slate-950 border border-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-sm text-cyan-300">
                <Volume2 className="w-4 h-4" />
                <span>Text-To-Speech (TTS) Voice Guidance</span>
              </div>
              <button
                type="button"
                onClick={handleTestSpeech}
                className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 text-xs font-bold transition"
              >
                Test Voice
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
              <div>
                <div className="flex justify-between text-xs font-bold text-slate-300">
                  <span>Speech Rate</span>
                  <span className="font-mono">{speechRate.toFixed(2)}x</span>
                </div>
                <input
                  type="range"
                  min="0.75"
                  max="1.5"
                  step="0.05"
                  value={speechRate}
                  onChange={e => setSpeechRate(Number(e.target.value))}
                  className="w-full mt-2 accent-cyan-400"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold text-slate-300">
                  <span>Pitch</span>
                  <span className="font-mono">{speechPitch.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.8"
                  max="1.3"
                  step="0.05"
                  value={speechPitch}
                  onChange={e => setSpeechPitch(Number(e.target.value))}
                  className="w-full mt-2 accent-cyan-400"
                />
              </div>
            </div>
          </div>

          {/* 2. Haptic Vibration & Audio Cues Section */}
          <div className="flex flex-col gap-3 p-4 rounded-xl bg-slate-950 border border-slate-800">
            <div className="flex items-center gap-2 font-bold text-sm text-cyan-300">
              <Vibrate className="w-4 h-4" />
              <span>Haptics & Directional Earcons</span>
            </div>

            <div className="flex flex-col gap-3 mt-2">
              <label className="flex items-center justify-between text-xs font-bold text-slate-300 cursor-pointer">
                <span>Enable Native Vibration Feedback</span>
                <input
                  type="checkbox"
                  checked={hapticsEnabled}
                  onChange={e => setHapticsEnabled(e.target.checked)}
                  className="w-4 h-4 accent-cyan-400"
                />
              </label>

              <label className="flex items-center justify-between text-xs font-bold text-slate-300 cursor-pointer">
                <span>Directional Audio Sonar Pings</span>
                <input
                  type="checkbox"
                  checked={audioCuesEnabled}
                  onChange={e => setAudioCuesEnabled(e.target.checked)}
                  className="w-4 h-4 accent-cyan-400"
                />
              </label>

              {/* Haptic Test Buttons */}
              <div className="pt-2 border-t border-slate-800 flex items-center gap-2">
                <span className="text-[11px] text-slate-400 font-bold">Test Patterns:</span>
                <button
                  type="button"
                  onClick={() => handleTestHaptics('info')}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs font-semibold"
                >
                  Light (Info)
                </button>
                <button
                  type="button"
                  onClick={() => handleTestHaptics('warning')}
                  className="px-2.5 py-1 rounded bg-amber-950 text-amber-300 hover:bg-amber-900 text-xs font-semibold"
                >
                  Caution
                </button>
                <button
                  type="button"
                  onClick={() => handleTestHaptics('critical')}
                  className="px-2.5 py-1 rounded bg-rose-950 text-rose-300 hover:bg-rose-900 text-xs font-semibold"
                >
                  Critical Hazard
                </button>
              </div>
            </div>
          </div>

          {/* 3. High Contrast & Display */}
          <div className="flex flex-col gap-3 p-4 rounded-xl bg-slate-950 border border-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-sm text-cyan-300">
                <Sun className="w-4 h-4" />
                <span>High Contrast Yellow-on-Black Mode</span>
              </div>
              <button
                type="button"
                onClick={onToggleHighContrast}
                className={`px-3 py-1 rounded-lg font-bold text-xs transition ${
                  highContrast ? 'bg-yellow-400 text-black' : 'bg-slate-800 text-slate-300'
                }`}
              >
                {highContrast ? 'Enabled' : 'Disabled'}
              </button>
            </div>
          </div>

          {/* 4. Backup & Export */}
          <div className="flex flex-col gap-3 p-4 rounded-xl bg-slate-950 border border-slate-800">
            <div className="font-bold text-sm text-cyan-300">
              Spatial Memory Backup & Portability
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={handleExportJSON}
                className="py-2 px-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold flex items-center gap-1.5 transition"
              >
                <Download className="w-4 h-4 text-cyan-400" />
                <span>Export Memories (JSON)</span>
              </button>

              <label className="py-2 px-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition">
                <Upload className="w-4 h-4 text-cyan-400" />
                <span>Restore Backup</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportJSON}
                  className="hidden"
                />
              </label>

              <button
                type="button"
                onClick={handleReset}
                className="py-2 px-3.5 rounded-xl bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 text-xs font-bold flex items-center gap-1.5 transition"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reset Seed Memories</span>
              </button>
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-700">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-extrabold shadow"
          >
            Save Preferences
          </button>
        </div>
      </div>
    </div>
  );
};
