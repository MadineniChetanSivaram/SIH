/**
 * Environments Manager View: Autonomous Spatial Memory Directory
 * Displays discovered environments (ENV_001, ENV_002, etc.), landmark graphs,
 * optional user nicknames, visit frequencies, and privacy-first erasure.
 */

import React, { useState } from 'react';
import { Environment, SpatialMemory } from '../types';
import { 
  Layers, 
  Plus, 
  Check, 
  Trash2, 
  Calendar, 
  Footprints, 
  RotateCw,
  Sparkles,
  MapPin,
  Tag,
  Eye,
  Shield,
  Clock,
  Compass
} from 'lucide-react';
import { audioSynth } from '../services/audioSpatialSynth';
import { speechService } from '../services/speechService';
import { DatabaseService } from '../services/database';

interface EnvironmentsManagerViewProps {
  environments: Environment[];
  activeEnvironmentId: string;
  onSelectEnvironment: (envId: string) => void;
  onCreateEnvironment: () => void;
  onDeleteEnvironment: (envId: string) => void;
  onUpdateNickname: (envId: string, nickname: string) => void;
  onOpenTrainingModal?: (envId?: string) => void;
  highContrast: boolean;
}

export const EnvironmentsManagerView: React.FC<EnvironmentsManagerViewProps> = ({
  environments,
  activeEnvironmentId,
  onSelectEnvironment,
  onCreateEnvironment,
  onDeleteEnvironment,
  onUpdateNickname,
  onOpenTrainingModal,
  highContrast,
}) => {
  const [editingEnvId, setEditingEnvId] = useState<string | null>(null);
  const [nicknameInput, setNicknameInput] = useState<string>('');

  const handleStartEdit = (env: Environment) => {
    setEditingEnvId(env.id);
    setNicknameInput(env.customLabel || '');
  };

  const handleSaveNickname = (envId: string) => {
    onUpdateNickname(envId, nicknameInput.trim());
    setEditingEnvId(null);
    audioSynth.playStateChime('success');
    speechService.speak(`Updated label for environment ${envId}.`);
  };

  const handleDelete = (env: Environment) => {
    const label = env.customLabel ? `${env.id} (${env.customLabel})` : env.id;
    if (confirm(`Are you sure you want to forget all spatial memories for ${label}?`)) {
      onDeleteEnvironment(env.id);
      audioSynth.playClickSound();
      speechService.speak(`Erased spatial memory for ${env.id}.`);
    }
  };

  return (
    <div id="environments-manager-container" className="max-w-6xl mx-auto px-4 py-4 sm:py-6 flex flex-col gap-6">
      
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-white">Discovered Spatial Environments</h2>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
              {environments.length} Total
            </span>
          </div>
          <p className="text-xs text-slate-300 mt-1">
            Zero-assumption spatial memories recognized autonomously from your camera and sensory telemetry.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onOpenTrainingModal && (
            <button
              id="btn-calibrate-active-environment"
              onClick={() => {
                audioSynth.playClickSound();
                onOpenTrainingModal(activeEnvironmentId);
              }}
              className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm flex items-center gap-2 transition-all active:scale-95 shadow-md"
            >
              <Compass className="w-4 h-4" />
              <span>Train / Calibrate 360°</span>
            </button>
          )}

          <button
            id="btn-discover-new-environment"
            onClick={() => {
              audioSynth.playClickSound();
              onCreateEnvironment();
            }}
            className="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm flex items-center gap-2 transition-all active:scale-95 shadow-md"
          >
            <Plus className="w-4 h-4" />
            <span>Discover New</span>
          </button>
        </div>
      </div>

      {/* Environments Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {environments.map((env) => {
          const isActive = env.id === activeEnvironmentId;
          const memory = DatabaseService.getSpatialMemory(env.id);
          const landmarkCount = memory?.nodes.length || 0;
          const pathCount = memory?.paths.length || 0;

          return (
            <div
              key={env.id}
              className={`rounded-2xl p-5 border flex flex-col justify-between gap-4 transition-all ${
                isActive
                  ? 'bg-slate-900 border-cyan-500 ring-2 ring-cyan-500/30 shadow-lg shadow-cyan-950/20'
                  : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="space-y-3">
                {/* ID & Status Row */}
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                    {env.id}
                  </span>

                  {isActive ? (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-500/40">
                      <Check className="w-3.5 h-3.5" />
                      Active Context
                    </span>
                  ) : (
                    <button
                      onClick={() => {
                        onSelectEnvironment(env.id);
                        audioSynth.playClickSound();
                        speechService.speak(`Switched active context to ${env.customLabel || env.id}.`);
                      }}
                      className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 underline"
                    >
                      Select
                    </button>
                  )}
                </div>

                {/* Nickname / Custom Label */}
                <div>
                  {editingEnvId === env.id ? (
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="text"
                        value={nicknameInput}
                        onChange={(e) => setNicknameInput(e.target.value)}
                        placeholder="e.g. Living Room Walkway"
                        className="flex-1 px-3 py-1.5 rounded-lg bg-slate-950 border border-cyan-500 text-xs text-white focus:outline-hidden"
                        autoFocus
                      />
                      <button
                        onClick={() => handleSaveNickname(env.id)}
                        className="px-2.5 py-1.5 rounded-lg bg-cyan-500 text-slate-950 font-bold text-xs"
                      >
                        Save
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between group">
                      <h3 className="font-bold text-base text-slate-100">
                        {env.customLabel || <span className="text-slate-400 italic">Unlabeled Environment</span>}
                      </h3>
                      <button
                        onClick={() => handleStartEdit(env)}
                        className="text-slate-400 hover:text-cyan-400 text-xs p-1"
                        title="Add or edit custom nickname"
                      >
                        <Tag className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                    {env.description}
                  </p>
                </div>

                {/* Telemetry Stats */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800 text-xs text-slate-300">
                  <div className="flex items-center gap-1.5">
                    <Compass className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{landmarkCount} Landmarks</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Footprints className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{env.visitCount} Observations</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-purple-400" />
                    <span>{pathCount} Habitual Paths</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span>{new Date(env.lastVisitedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-slate-500 font-mono">
                    Confidence: {((env.recognitionConfidence || 0.95) * 100).toFixed(0)}%
                  </span>
                  {onOpenTrainingModal && (
                    <button
                      onClick={() => {
                        onSelectEnvironment(env.id);
                        audioSynth.playClickSound();
                        onOpenTrainingModal(env.id);
                      }}
                      className="text-xs font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                    >
                      <Compass className="w-3.5 h-3.5" />
                      <span>Calibrate</span>
                    </button>
                  )}
                </div>

                <button
                  onClick={() => handleDelete(env)}
                  className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
                  title="Forget this environment memory"
                  aria-label={`Forget spatial memory for ${env.id}`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
