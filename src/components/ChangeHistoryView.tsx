/**
 * Temporal Change History & Evolution Timeline
 * Tracks chronological environmental drift, categorizing temporary vs persistent changes.
 */

import React, { useState } from 'react';
import { EnvironmentalChange, RiskLevel } from '../types';
import { 
  History, 
  AlertTriangle, 
  AlertOctagon, 
  Info, 
  Volume2, 
  Trash2, 
  Calendar, 
  Clock, 
  Filter,
  CheckCircle2,
  HelpCircle
} from 'lucide-react';
import { audioSynth } from '../services/audioSpatialSynth';
import { speechService } from '../services/speechService';
import { SpatialEngine } from '../services/spatialEngine';

interface ChangeHistoryViewProps {
  changes: EnvironmentalChange[];
  onClearHistory: () => void;
  highContrast: boolean;
}

export const ChangeHistoryView: React.FC<ChangeHistoryViewProps> = ({
  changes,
  onClearHistory,
  highContrast,
}) => {
  const [filterRisk, setFilterRisk] = useState<string>('all');

  const filteredChanges = changes.filter(c => {
    if (filterRisk === 'all') return true;
    return c.riskLevel === filterRisk;
  });

  const handleSpeakChange = (change: EnvironmentalChange) => {
    audioSynth.playClickSound();
    audioSynth.playSpatialCue(change.angleDegrees, change.distanceMeters, change.earconTone);
    speechService.speak(change.verbalAlertText, { priority: 'urgent' });
  };

  return (
    <div id="change-history-container" className="max-w-6xl mx-auto px-4 py-4 sm:py-6 flex flex-col gap-6">
      
      {/* Header & Filter Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-amber-500/20 text-amber-400">
            <History className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white">Temporal Change History</h2>
            <p className="text-xs text-slate-300">
              Historical record of physical changes, displaced furniture, and temporary obstructions.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Filter Pills */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-bold">
            <button
              onClick={() => setFilterRisk('all')}
              className={`px-3 py-1.5 rounded-lg transition ${filterRisk === 'all' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400'}`}
            >
              All ({changes.length})
            </button>
            <button
              onClick={() => setFilterRisk('critical')}
              className={`px-3 py-1.5 rounded-lg transition ${filterRisk === 'critical' ? 'bg-rose-600 text-white' : 'text-slate-400'}`}
            >
              Critical
            </button>
            <button
              onClick={() => setFilterRisk('important')}
              className={`px-3 py-1.5 rounded-lg transition ${filterRisk === 'important' ? 'bg-amber-500 text-slate-950' : 'text-slate-400'}`}
            >
              Important
            </button>
          </div>

          {changes.length > 0 && (
            <button
              onClick={() => {
                if (confirm('Clear all recorded change history?')) {
                  onClearHistory();
                  audioSynth.playClickSound();
                  speechService.speak('Change history cleared.');
                }
              }}
              className="p-2 text-slate-400 hover:text-rose-400 rounded-xl hover:bg-slate-800 transition"
              title="Clear history"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Changes List */}
      {filteredChanges.length === 0 ? (
        <div className="p-12 rounded-2xl bg-slate-900/50 border border-slate-800 text-center flex flex-col items-center gap-3 text-slate-400">
          <CheckCircle2 className="w-10 h-10 text-emerald-400" />
          <div className="font-extrabold text-white text-base">No Temporal Changes Recorded</div>
          <p className="text-xs max-w-md text-slate-400">
            When SpatialEye observes obstacles, displaced furniture, or modified entrances during monitoring, they will be logged here.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filteredChanges.map((change) => {
            const isCritical = change.riskLevel === 'critical';
            const isImportant = change.riskLevel === 'important';

            return (
              <div
                key={change.id}
                className={`p-4.5 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                  isCritical
                    ? 'bg-rose-950/40 border-rose-500/50 text-white'
                    : isImportant
                      ? 'bg-amber-950/30 border-amber-500/40 text-slate-200'
                      : 'bg-slate-900 border-slate-800 text-slate-200'
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <div className={`p-2.5 rounded-xl shrink-0 mt-0.5 ${
                    isCritical ? 'bg-rose-600 text-white' : isImportant ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-cyan-400'
                  }`}>
                    {isCritical ? <AlertOctagon className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-black text-sm text-white">{change.environmentName || change.environmentId}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                        {change.distanceMeters.toFixed(1)}m • {SpatialEngine.formatClockDirection(change.clockDirection)}
                      </span>
                      {change.evasionGuidance && (
                        <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/50">
                          {change.evasionGuidance}
                        </span>
                      )}
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        change.persistenceClassification === 'verified_persistent'
                          ? 'bg-purple-950 text-purple-300 border border-purple-800/50'
                          : change.persistenceClassification === 'potential_persistent'
                            ? 'bg-blue-950 text-blue-300 border border-blue-800/50'
                            : 'bg-slate-800 text-slate-400'
                      }`}>
                        {change.persistenceClassification.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>

                    <p className="font-extrabold text-sm sm:text-base text-white mt-1">
                      {change.verbalAlertText}
                    </p>

                    <div className="flex items-center gap-3 text-xs text-slate-400 mt-1.5 font-mono">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {new Date(change.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span>Confidence: {(change.confidence * 100).toFixed(0)}%</span>
                      {change.affectsHabitualPath && <span className="text-amber-400 font-bold">On Habitual Path</span>}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleSpeakChange(change)}
                  className="py-2 px-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold text-xs flex items-center gap-2 shrink-0 transition"
                  aria-label="Re-speak alert"
                >
                  <Volume2 className="w-4 h-4" />
                  <span>Re-speak</span>
                </button>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
