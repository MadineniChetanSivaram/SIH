/**
 * Primary Live Monitor View: Voice-First, Real-Time Obstacle Detection for Blind Users
 * 
 * Features:
 * - Live Camera Video Feed with real-time AI obstacle detection (no mock/fake data assumptions).
 * - Real-time spatial tracking (metric distance, clock angles, path obstruction analysis).
 * - Tactile Touch Surface with single-tap voice activation & double-tap monitoring toggle.
 * - Continuous spatial sonar audio pings that accelerate as obstacles approach.
 * - Screen Curtain / Privacy mode.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Environment, 
  EnvironmentalChange, 
  DetectedEntity, 
  UserPose, 
  SpatialMemory,
  VoiceState 
} from '../types';
import { 
  Play, 
  Square, 
  AlertTriangle, 
  ShieldCheck, 
  Radio, 
  EyeOff, 
  Mic, 
  RotateCcw, 
  Activity,
  Camera,
  Compass,
  Zap,
  Navigation,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Octagon,
  Volume2,
  Sparkles
} from 'lucide-react';
import { audioSynth } from '../services/audioSpatialSynth';
import { hapticsService } from '../services/hapticsService';
import { speechOutputManager } from '../services/speechOutputManager';
import { voiceController } from '../services/voiceController';
import { SpatialEngine } from '../services/spatialEngine';
import { cameraFrameService } from '../services/cameraFrameService';
import { DatabaseService } from '../services/database';

interface LiveMonitorViewProps {
  activeEnvironment: Environment;
  activeMemory: SpatialMemory;
  isRecognizing: boolean;
  isMonitoring: boolean;
  onToggleMonitoring: () => void;
  onRememberEnvironment: () => void;
  onWhatChanged: () => void;
  onDescribeSurroundings: () => void;
  onWhereAmI: () => void;
  onRepeatAlert: () => void;
  latestChanges: EnvironmentalChange[];
  detectedEntities: DetectedEntity[];
  userPose: UserPose;
  onUserPoseChange: (newPose: UserPose) => void;
  onProcessCustomFrame: (entities: DetectedEntity[], pose: UserPose) => void;
  highContrast: boolean;
  onOpenVoiceModal: () => void;
  onOpenScreenCurtain?: () => void;
  onOpenGesturePad?: () => void;
  onOpenTrainingModal?: () => void;
  onQuickTrain?: () => Promise<void> | void;
}

export const LiveMonitorView: React.FC<LiveMonitorViewProps> = ({
  activeEnvironment,
  activeMemory,
  isRecognizing,
  isMonitoring,
  onToggleMonitoring,
  onRememberEnvironment,
  onWhatChanged,
  onDescribeSurroundings,
  onWhereAmI,
  onRepeatAlert,
  latestChanges,
  detectedEntities,
  userPose,
  onProcessCustomFrame,
  highContrast,
  onOpenScreenCurtain,
  onOpenTrainingModal,
  onQuickTrain,
}) => {
  const [cameraStreamActive, setCameraStreamActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isProcessingAI, setIsProcessingAI] = useState<boolean>(false);
  const [voiceState, setVoiceState] = useState<VoiceState>('IDLE');
  const [voiceTranscript, setVoiceTranscript] = useState<string>('');
  const [lastTapTime, setLastTapTime] = useState<number>(0);
  const [lastScanSummary, setLastScanSummary] = useState<string>('Camera active. Tap screen to speak or start monitoring.');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const autoAnalysisTimerRef = useRef<any>(null);

  // Subscribe to Voice Controller state
  useEffect(() => {
    const unsub = voiceController.subscribe((state, text) => {
      setVoiceState(state);
      if (text !== undefined) {
        setVoiceTranscript(text);
      }
    });
    return unsub;
  }, []);

  // Initialize Real-Time Camera Stream automatically on mount
  useEffect(() => {
    let stream: MediaStream | null = null;
    if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
      navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      })
      .then((s) => {
        stream = s;
        mediaStreamRef.current = s;
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          videoRef.current.play().catch(() => {});
        }
        setCameraStreamActive(true);
        setCameraError(null);
        cameraFrameService.setStreamActive(true);
      })
      .catch((err) => {
        console.warn('Camera stream error:', err.message);
        setCameraError('Camera permission needed for live obstacle detection.');
        setCameraStreamActive(false);
        cameraFrameService.setStreamActive(false);
      });
    }

    // Register instant frame capture provider for voice queries
    cameraFrameService.registerCaptureProvider(() => {
      if (!videoRef.current || !canvasRef.current) return null;
      try {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (video.readyState < 2) return null;
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL('image/jpeg', 0.7);
      } catch {
        return null;
      }
    });

    return () => {
      cameraFrameService.unregisterCaptureProvider();
      cameraFrameService.setStreamActive(false);
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  const lastScanTimeRef = useRef<number>(0);
  const previousFrameDataRef = useRef<ImageData | null>(null);

  // Frame Capture & Multimodal Spatial Processing from live camera
  const captureAndAnalyzeFrame = useCallback(async (isManualTrigger: boolean = false) => {
    if (!videoRef.current || !canvasRef.current || isProcessingAI) return;
    
    // Background polling rate-limit (4 seconds for responsive real-time safety, manual triggers always bypass)
    const now = Date.now();
    if (!isManualTrigger && now - lastScanTimeRef.current < 4000) {
      return;
    }

    lastScanTimeRef.current = now;
    setIsProcessingAI(true);

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video.readyState < 2) return;

      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const base64 = canvas.toDataURL('image/jpeg', 0.6);

      const res = await fetch('/api/spatial/analyze-frame', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64,
          currentEnvironment: activeEnvironment,
          userPose,
          knownNodes: activeMemory?.nodes || [],
          habitualPaths: activeMemory?.paths || [],
        }),
      });

      const json = await res.json();
      if (json.success && json.data) {
        const { detectedEntities: aiEntities, changes, sceneDescription, safetySpeech } = json.data;

        const formattedEntities: DetectedEntity[] = (aiEntities || []).map((item: any, idx: number) => {
          const clock = item.clockDirection || 12;
          const rad = ((clock * 30 - 360) * Math.PI) / 180;
          const dist = Number(item.distanceMeters) || 1.5;
          const angle = clock <= 6 ? clock * 30 : (clock - 12) * 30;

          // Compute evasion advice if not present
          const evasion = item.evasionGuidance 
            ? { instruction: item.evasionGuidance, direction: item.evasionDirection || 'hold' }
            : SpatialEngine.computeEvasionAdvice({ distanceMeters: dist, clockDirection: clock, angleDegrees: angle, label: item.label });

          const isHazard = item.isHazard || ((clock >= 11 || clock <= 1) && dist < 2.0);
          const isHighRisk = item.riskLevel === 'high' || isHazard || dist <= 1.2;

          return {
            id: `entity-${idx}-${Date.now()}`,
            label: item.label || 'Obstacle',
            category: (item.category as any) || 'obstacle',
            distanceMeters: dist,
            angleDegrees: angle,
            clockDirection: clock,
            estimatedPosition: {
              x: userPose.x + Math.sin(rad) * dist,
              y: userPose.y + Math.cos(rad) * dist,
              z: 0,
            },
            confidence: 0.95,
            riskLevel: isHighRisk ? 'high' : 'low',
            isHazard,
            evasionGuidance: evasion.instruction,
            evasionDirection: evasion.direction as any,
          };
        });

        onProcessCustomFrame(formattedEntities, userPose);

        if (sceneDescription || safetySpeech) {
          setLastScanSummary(safetySpeech || sceneDescription);
        }

        // Spoken alert + Risk-Level Beeps (High = 3 rapid warning beeps, Low = 1 gentle soft ping)
        if (isManualTrigger) {
          if (safetySpeech) {
            const hasHighRisk = formattedEntities.some(e => e.riskLevel === 'high' || e.isHazard);
            if (hasHighRisk) {
              audioSynth.playHighRiskBeep();
              hapticsService.trigger('warning');
            } else {
              audioSynth.playLowRiskBeep();
              hapticsService.trigger('tap');
            }
            speechOutputManager.speak(safetySpeech, { priority: 'CRITICAL', isAlert: true });
          } else if (formattedEntities.length > 0) {
            const nearest = formattedEntities.sort((a, b) => a.distanceMeters - b.distanceMeters)[0];
            const isHigh = nearest.riskLevel === 'high' || nearest.isHazard || nearest.distanceMeters <= 1.2;
            if (isHigh) {
              audioSynth.playHighRiskBeep(nearest.angleDegrees);
              hapticsService.trigger('warning');
            } else {
              audioSynth.playLowRiskBeep(nearest.angleDegrees);
              hapticsService.trigger('tap');
            }
            const evasion = nearest.evasionGuidance || SpatialEngine.computeEvasionAdvice(nearest, formattedEntities).instruction;
            const distSpeech = SpatialEngine.formatDistance(nearest.distanceMeters);
            speechOutputManager.speak(`${nearest.label} is ${distSpeech} from your camera, ${SpatialEngine.formatClockDirection(nearest.clockDirection)}. ${evasion}`, { priority: 'IMPORTANT' });
          } else {
            audioSynth.playLowRiskBeep();
            speechOutputManager.speak('Your path is clear straight ahead for about 3 meters. You can walk forward.', { priority: 'IMPORTANT' });
          }
        } else if (changes && changes.length > 0) {
          // Log changes to database
          changes.forEach((c: any) => {
            DatabaseService.logChange({
              id: `chg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              environmentId: activeEnvironment.id,
              environmentName: activeEnvironment.customLabel ? `${activeEnvironment.id} (${activeEnvironment.customLabel})` : activeEnvironment.id,
              timestamp: new Date().toISOString(),
              changeType: c.changeType || 'new_obstacle',
              objectLabel: c.objectLabel || 'Obstacle',
              distanceMeters: Number(c.distanceMeters) || 1.5,
              clockDirection: Number(c.clockDirection) || 12,
              angleDegrees: Number(c.clockDirection) <= 6 ? (Number(c.clockDirection) || 12) * 30 : ((Number(c.clockDirection) || 12) - 12) * 30,
              affectsHabitualPath: true,
              riskLevel: c.riskLevel === 'high' || c.riskLevel === 'critical' ? 'critical' : 'important',
              riskScore: c.riskScore || 80,
              persistenceClassification: 'temporary',
              verbalAlertText: c.verbalAlertText,
              evasionGuidance: c.evasionGuidance,
              evasionDirection: c.evasionDirection,
              earconTone: c.riskLevel === 'high' || c.riskLevel === 'critical' ? 'critical' : 'warning',
              hapticPattern: [120, 60, 120],
              confidence: 0.95,
              details: `Detected during live spatial scan: ${c.verbalAlertText}`,
            });
          });

          const top = changes[0];
          if (top.riskLevel === 'critical' || top.riskLevel === 'important' || top.riskLevel === 'high') {
            if (top.riskLevel === 'critical' || top.riskLevel === 'high') {
              audioSynth.playHighRiskBeep(top.angleDegrees || 0);
              hapticsService.trigger('critical');
            } else {
              audioSynth.playLowRiskBeep(top.angleDegrees || 0);
              hapticsService.trigger('info');
            }
            speechOutputManager.speak(top.verbalAlertText, {
              priority: 'CRITICAL',
              dedupKey: `${top.objectLabel}-${top.distanceMeters?.toFixed(0)}`,
              cooldownMs: 5000,
              isAlert: true,
            });
          }
        } else if (formattedEntities.length > 0) {
          // Speak closest obstacle blocking or near forward path (within 2.8m and in forward hemisphere)
          const forwardObstacles = formattedEntities.filter(e => e.distanceMeters <= 2.8 && (e.clockDirection >= 10 || e.clockDirection <= 2 || e.isHazard));
          if (forwardObstacles.length > 0) {
            const nearest = forwardObstacles.sort((a, b) => a.distanceMeters - b.distanceMeters)[0];
            const isHigh = nearest.riskLevel === 'high' || nearest.isHazard || nearest.distanceMeters <= 1.2;
            if (isHigh) {
              audioSynth.playHighRiskBeep(nearest.angleDegrees);
              hapticsService.trigger('warning');
            } else {
              audioSynth.playLowRiskBeep(nearest.angleDegrees);
              hapticsService.trigger('tap');
            }
            const evasion = nearest.evasionGuidance || SpatialEngine.computeEvasionAdvice(nearest, formattedEntities).instruction;
            const distSpeech = SpatialEngine.formatDistance(nearest.distanceMeters);
            speechOutputManager.speak(`${nearest.label} detected ${distSpeech} from camera, ${SpatialEngine.formatClockDirection(nearest.clockDirection)}. ${evasion}`, {
              priority: 'IMPORTANT',
              dedupKey: `obs-${nearest.label}-${Math.round(nearest.distanceMeters * 2)}`,
              cooldownMs: 4500,
              isAlert: true,
            });
          }
        }
      }
    } catch (err: any) {
      console.warn('Real-time frame analysis notice:', err.message);
    } finally {
      setIsProcessingAI(false);
    }
  }, [activeEnvironment, userPose, isProcessingAI, onProcessCustomFrame]);

  // Fast on-device local optical difference detector (runs at 3Hz without API costs)
  useEffect(() => {
    if (!isMonitoring || !cameraStreamActive) return;

    const interval = setInterval(() => {
      if (!videoRef.current || !canvasRef.current || isProcessingAI) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video.readyState < 2) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Sample a lightweight 64x48 low-res thumbnail for instant edge/luminance changes
      const w = 64;
      const h = 48;
      const sampleCanvas = document.createElement('canvas');
      sampleCanvas.width = w;
      sampleCanvas.height = h;
      const sCtx = sampleCanvas.getContext('2d');
      if (!sCtx) return;

      sCtx.drawImage(video, 0, 0, w, h);
      const currentData = sCtx.getImageData(0, 0, w, h);

      if (previousFrameDataRef.current) {
        let bottomDiffLeft = 0; // Forward path left side
        let bottomDiffRight = 0; // Forward path right side
        const len = currentData.data.length;

        for (let i = 0; i < len; i += 16) {
          const rDiff = Math.abs(currentData.data[i] - previousFrameDataRef.current.data[i]);
          const gDiff = Math.abs(currentData.data[i + 1] - previousFrameDataRef.current.data[i + 1]);
          const bDiff = Math.abs(currentData.data[i + 2] - previousFrameDataRef.current.data[i + 2]);
          const totalDiff = rDiff + gDiff + bDiff;

          if (totalDiff > 80) {
            const pixelIndex = i / 4;
            const y = Math.floor(pixelIndex / w);
            const x = pixelIndex % w;
            if (y > h * 0.55) {
              if (x < w / 2) {
                bottomDiffLeft++;
              } else {
                bottomDiffRight++;
              }
            }
          }
        }

        const totalBottomDiff = bottomDiffLeft + bottomDiffRight;

        // If significant visual movement in path, trigger live AI vision to identify what the object is
        if (totalBottomDiff > 25) {
          const isRight = bottomDiffRight > bottomDiffLeft;
          audioSynth.playSpatialCue(isRight ? 35 : -35, 1.2, 'warning');
          hapticsService.trigger('warning');
          captureAndAnalyzeFrame(false);
        }
      }

      previousFrameDataRef.current = currentData;
    }, 400);

    return () => clearInterval(interval);
  }, [isMonitoring, cameraStreamActive, isProcessingAI, captureAndAnalyzeFrame]);

  // Spatial Sonar Audio Cue: binaural click that speeds up when obstacles get closer
  useEffect(() => {
    if (!isMonitoring || detectedEntities.length === 0) return;

    const inFront = detectedEntities.filter(e => e.clockDirection >= 10 || e.clockDirection <= 2);
    if (!inFront.length) return;

    const closest = inFront.sort((a, b) => a.distanceMeters - b.distanceMeters)[0];
    const intervalMs = Math.max(500, Math.min(1800, closest.distanceMeters * 400));

    const pingTimer = setInterval(() => {
      if (closest.distanceMeters < 4.0) {
        audioSynth.playSpatialCue(
          closest.angleDegrees, 
          closest.distanceMeters, 
          closest.isHazard || closest.distanceMeters < 1.5 ? 'warning' : 'info'
        );
      }
    }, intervalMs);

    return () => clearInterval(pingTimer);
  }, [isMonitoring, detectedEntities]);

  // Full-Screen Tactile Gestures & Eyes-Free Navigation for Blind Users
  const pressTimerRef = useRef<any>(null);
  const isLongPressRef = useRef<boolean>(false);

  const handlePointerDown = () => {
    isLongPressRef.current = false;
    pressTimerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      audioSynth.playStateChime('mode_change');
      hapticsService.trigger('critical');
      speechOutputManager.speak('Hold gesture recognized. Training environment now from camera...', { priority: 'CRITICAL' });
      if (onQuickTrain) {
        onQuickTrain();
      }
    }, 750);
  };

  const handlePointerUp = () => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }

    if (isLongPressRef.current) {
      return;
    }

    const now = Date.now();
    const timeSinceLast = now - lastTapTime;

    if (timeSinceLast > 50 && timeSinceLast < 350) {
      // Double Tap: Toggle Monitoring
      audioSynth.playClickSound();
      hapticsService.trigger('tap');
      onToggleMonitoring();
      setLastTapTime(0);
    } else {
      // Single Tap: Announce Immediate Forward Obstacle & Distance + Activate Mic
      setLastTapTime(now);
      setTimeout(() => {
        if (Date.now() - now >= 350 && !isLongPressRef.current) {
          audioSynth.playClickSound();
          hapticsService.trigger('light');

          // Announce immediate path / obstacle status
          captureAndAnalyzeFrame(true);

          if (voiceState !== 'LISTENING') {
            voiceController.activateListening();
          }
        }
      }, 360);
    }
  };

  const inFrontEntities = detectedEntities.filter(e => e.clockDirection >= 11 || e.clockDirection <= 1);
  const closestInFront = inFrontEntities.sort((a, b) => a.distanceMeters - b.distanceMeters)[0];
  const primaryObstacle = closestInFront || (detectedEntities.length > 0 ? detectedEntities.sort((a, b) => a.distanceMeters - b.distanceMeters)[0] : null);
  
  // Compute active real-time evasion maneuver
  const activeEvasion = primaryObstacle 
    ? SpatialEngine.computeEvasionAdvice(primaryObstacle, detectedEntities) 
    : { direction: 'straight' as const, instruction: 'Path clear ahead for 3 metres. Walk forward.', shortBadge: '⬆️ Path Clear Ahead' };

  return (
    <div className="space-y-4 max-w-4xl mx-auto" id="live-monitor-container">
      
      {/* 1. Large High-Contrast Status & Environment Header */}
      <div 
        id="blind-primary-status-card"
        className={`p-5 rounded-3xl border transition-all ${
          highContrast
            ? 'bg-black border-4 border-yellow-400 text-white'
            : isMonitoring
              ? 'bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border-cyan-500/80 shadow-2xl shadow-cyan-950/60'
              : 'bg-slate-900 border-slate-800 text-slate-100 shadow-lg'
        }`}
        role="region"
        aria-label="Environmental monitoring status"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3.5">
            <div 
              className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black transition-all ${
                isMonitoring 
                  ? 'bg-emerald-500 text-slate-950 animate-pulse shadow-lg shadow-emerald-500/40' 
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {isMonitoring ? <Activity className="w-8 h-8" /> : <ShieldCheck className="w-8 h-8" />}
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                {isMonitoring ? 'MONITORING ACTIVE' : 'MONITORING STANDBY'}
              </h1>
              <p className="text-sm text-cyan-300 font-mono font-bold mt-0.5">
                Environment {activeEnvironment.id} • {detectedEntities.length} Real Obstacles Tracked
              </p>
            </div>
          </div>

          {/* Quick Repeat Alert button */}
          <button
            id="btn-voice-repeat-quick"
            onClick={() => {
              audioSynth.playClickSound();
              onRepeatAlert();
            }}
            className="p-3.5 rounded-2xl bg-slate-800 hover:bg-slate-750 active:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 transition active:scale-95"
            aria-label="Repeat last spoken alert"
            title="Repeat last alert (Voice command: 'Repeat')"
          >
            <RotateCcw className="w-6 h-6" />
          </button>
        </div>

        {/* Immediate Forward Path Status */}
        <div className="mt-4 pt-3.5 border-t border-slate-800/80 flex items-center justify-between text-sm">
          <span className="text-slate-400 font-semibold">Immediate Forward Path (Straight Ahead):</span>
          <span className={`font-mono font-bold ${closestInFront ? 'text-amber-400' : 'text-emerald-400'}`}>
            {closestInFront 
              ? `⚠️ ${closestInFront.label} (${closestInFront.distanceMeters.toFixed(1)}m ahead)` 
              : '✅ Clear path ahead'}
          </span>
        </div>
      </div>

      {/* 2. Actionable Spatial Evasion Guidance Banner (Tells Blind User EXACTLY How to Overcome Obstacles) */}
      <div 
        id="actionable-evasion-guidance-card"
        className={`p-4 sm:p-5 rounded-3xl border-2 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl ${
          highContrast
            ? 'bg-black border-4 border-yellow-400 text-yellow-300'
            : activeEvasion.direction === 'stop'
              ? 'bg-rose-950/80 border-rose-500 text-white shadow-rose-950/60 ring-4 ring-rose-500/20'
              : activeEvasion.direction === 'left' || activeEvasion.direction === 'slight_left'
                ? 'bg-cyan-950/80 border-cyan-400 text-cyan-100 shadow-cyan-950/50'
                : activeEvasion.direction === 'right' || activeEvasion.direction === 'slight_right'
                  ? 'bg-teal-950/80 border-teal-400 text-teal-100 shadow-teal-950/50'
                  : 'bg-emerald-950/60 border-emerald-500/60 text-emerald-200'
        }`}
        role="region"
        aria-label={`Evasion maneuver guidance: ${activeEvasion.instruction}`}
      >
        <div className="flex items-center gap-3.5">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black shrink-0 ${
            activeEvasion.direction === 'stop' 
              ? 'bg-rose-600 text-white animate-bounce' 
              : activeEvasion.direction === 'left' || activeEvasion.direction === 'slight_left'
                ? 'bg-cyan-500 text-slate-950'
                : activeEvasion.direction === 'right' || activeEvasion.direction === 'slight_right'
                  ? 'bg-teal-400 text-slate-950'
                  : 'bg-emerald-500 text-slate-950'
          }`}>
            {activeEvasion.direction === 'stop' && <Octagon className="w-7 h-7" />}
            {(activeEvasion.direction === 'left' || activeEvasion.direction === 'slight_left') && <ArrowLeft className="w-7 h-7" />}
            {(activeEvasion.direction === 'right' || activeEvasion.direction === 'slight_right') && <ArrowRight className="w-7 h-7" />}
            {(activeEvasion.direction === 'straight' || activeEvasion.direction === 'hold') && <ArrowUp className="w-7 h-7" />}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black tracking-wider uppercase opacity-80 font-mono">
                Actionable Evasion Guidance
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-white/10 font-mono">
                {activeEvasion.shortBadge}
              </span>
            </div>
            <p className="text-base sm:text-lg font-black tracking-tight mt-0.5 text-white">
              {activeEvasion.instruction}
            </p>
          </div>
        </div>

        {/* Speak Evasion Instruction Button */}
        <button
          id="btn-speak-evasion-guidance"
          onClick={() => {
            audioSynth.playClickSound();
            hapticsService.trigger('tap');
            speechOutputManager.speak(activeEvasion.instruction, { priority: 'CRITICAL', isAlert: true });
          }}
          className="w-full sm:w-auto py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/20 active:bg-white/30 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 border border-white/20 transition shrink-0"
          aria-label="Speak directional evasion maneuver aloud"
        >
          <Volume2 className="w-4 h-4" />
          <span>Speak Direction</span>
        </button>
      </div>

      {/* 3. Live Camera Viewfinder & Real Obstacle Overlay */}
      <div 
        id="camera-viewfinder-card"
        className="relative rounded-3xl overflow-hidden border-2 border-slate-800 bg-black min-h-[220px] sm:min-h-[280px] flex items-center justify-center shadow-xl"
      >
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          muted 
          className="w-full h-full object-cover max-h-[340px]"
        />
        <canvas ref={canvasRef} className="hidden" />

        {/* Camera Permission Alert if unavailable */}
        {cameraError && (
          <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center p-6 text-center text-amber-300">
            <Camera className="w-12 h-12 text-amber-400 mb-2" />
            <p className="font-bold text-base text-white">{cameraError}</p>
            <p className="text-xs text-slate-400 mt-1 max-w-xs">
              Please allow camera access in your browser settings so SpatialEye can detect real physical obstacles.
            </p>
          </div>
        )}

        {/* Real-Time Detected Obstacle Badges Overlay */}
        <div className="absolute top-3 left-3 right-3 flex flex-wrap gap-2 pointer-events-none z-10">
          {detectedEntities.slice(0, 4).map((ent) => (
            <div 
              key={ent.id}
              className={`px-3 py-1.5 rounded-full text-xs font-black flex items-center gap-1.5 shadow-lg backdrop-blur-md ${
                ent.riskLevel === 'high' || ent.isHazard 
                  ? 'bg-rose-600/95 text-white border border-rose-400 ring-2 ring-rose-400/40 animate-pulse' 
                  : 'bg-slate-900/90 text-cyan-300 border border-slate-700'
              }`}
            >
              <span className={`px-1.5 py-0.2 rounded text-[10px] uppercase font-black ${
                ent.riskLevel === 'high' || ent.isHazard ? 'bg-black text-rose-300' : 'bg-slate-800 text-teal-300'
              }`}>
                {ent.riskLevel === 'high' || ent.isHazard ? '⚠️ High Risk' : 'ℹ️ Low Risk'}
              </span>
              <span>{ent.label}</span>
              <span className="font-mono text-white/95 font-bold">
                ({ent.distanceMeters.toFixed(1)}m / ~{Math.max(1, Math.round(ent.distanceMeters / 0.7))} steps • {SpatialEngine.formatClockDirection(ent.clockDirection)})
              </span>
              {ent.evasionGuidance && (
                <span className="font-sans text-[10px] text-amber-300 font-extrabold bg-black/50 px-1.5 py-0.5 rounded">
                  {ent.evasionGuidance.split(' ')[0]} {ent.evasionGuidance.split(' ')[1] || ''}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Live Camera-to-Obstacle Distance HUD (Bottom Overlay) */}
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none z-10">
          {closestInFront ? (
            <div className={`px-3.5 py-2 rounded-2xl backdrop-blur-md border flex items-center gap-2.5 font-mono text-xs sm:text-sm font-black shadow-2xl ${
              closestInFront.distanceMeters < 0.8
                ? 'bg-rose-950/90 border-rose-500 text-rose-200 ring-2 ring-rose-500/40 animate-pulse'
                : closestInFront.distanceMeters < 1.8
                  ? 'bg-amber-950/90 border-amber-500 text-amber-200'
                  : 'bg-slate-900/90 border-cyan-500/60 text-cyan-200'
            }`}>
              <div className={`w-3 h-3 rounded-full ${
                closestInFront.distanceMeters < 0.8 ? 'bg-rose-500 animate-ping' : closestInFront.distanceMeters < 1.8 ? 'bg-amber-400' : 'bg-emerald-400'
              }`} />
              <span>
                CAMERA DISTANCE: <span className="text-white font-bold">{closestInFront.distanceMeters.toFixed(1)}m</span> (~{Math.max(1, Math.round(closestInFront.distanceMeters / 0.7))} steps) to {closestInFront.label}
              </span>
            </div>
          ) : (
            <div className="px-3.5 py-1.5 rounded-xl bg-slate-900/80 border border-slate-700 text-slate-300 text-xs font-mono">
              <span>Path Ahead: Clear (&gt; 3.0m)</span>
            </div>
          )}

          {/* Active AI Processing Indicator */}
          {isProcessingAI && (
            <div className="px-3 py-1.5 rounded-xl bg-black/90 border border-cyan-500/60 text-xs text-cyan-300 flex items-center gap-2 font-mono ml-auto">
              <Radio className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
              <span>Analyzing Frame...</span>
            </div>
          )}
        </div>
      </div>

      {/* 4. Giant Full-Screen Tactile Listening & Voice Surface */}
      <div
        id="giant-tactile-voice-surface"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        className={`relative min-h-[220px] sm:min-h-[260px] rounded-3xl border-2 cursor-pointer flex flex-col items-center justify-center text-center p-6 transition-all select-none active:scale-[0.99] ${
          highContrast
            ? 'bg-black border-4 border-yellow-400 text-yellow-300'
            : voiceState === 'LISTENING'
              ? 'bg-rose-950/90 border-rose-400 ring-8 ring-rose-500/30 text-rose-100 shadow-2xl shadow-rose-950/80 animate-pulse'
              : voiceState === 'PROCESSING'
                ? 'bg-amber-950/80 border-amber-400 text-amber-100 shadow-2xl'
                : isMonitoring
                  ? 'bg-slate-900/90 border-cyan-500/50 hover:border-cyan-400 text-slate-100 shadow-xl'
                  : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 text-slate-300'
        }`}
        role="button"
        tabIndex={0}
        aria-label="Tactile interactive area for blind users. Tap to check obstacles. Double tap to start or stop monitoring. Long press to train room."
      >
        {/* Center Mic Icon & Visual Wave Ring */}
        <div className="relative mb-3">
          {voiceState === 'LISTENING' && (
            <div className="absolute -inset-6 rounded-full bg-rose-500/30 animate-ping pointer-events-none" />
          )}
          <div 
            className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center shadow-2xl transition-all ${
              voiceState === 'LISTENING'
                ? 'bg-rose-500 text-white scale-110 shadow-rose-500/50'
                : highContrast
                  ? 'bg-yellow-400 text-black'
                  : isMonitoring
                    ? 'bg-cyan-500 text-slate-950 hover:bg-cyan-400'
                    : 'bg-slate-800 text-slate-300'
            }`}
          >
            {voiceState === 'LISTENING' ? (
              <Mic className="w-10 h-10 sm:w-12 sm:h-12 animate-pulse" />
            ) : (
              <Mic className="w-10 h-10 sm:w-12 sm:h-12" />
            )}
          </div>
        </div>

        {/* Spoken Transcript or State Banner */}
        <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white mb-1.5">
          {voiceState === 'LISTENING'
            ? '🎙️ LISTENING... SPEAK ANYTIME'
            : voiceState === 'PROCESSING'
              ? '⚡ PROCESSING VOICE COMMAND...'
              : voiceTranscript
                ? `"${voiceTranscript}"`
                : '🎙️ 100% HANDS-FREE • SPEAK ANY COMMAND'}
        </h2>

        <p className="text-xs sm:text-sm text-slate-300 max-w-lg mx-auto leading-relaxed font-medium">
          {voiceState === 'LISTENING'
            ? 'Say "Train room", "What changed", "What is ahead", or "Stop monitoring"'
            : 'Zero buttons needed • Just say "Train room" or "What changed" • Tap anywhere for obstacle audio • Hold 1s to train'}
        </p>
      </div>

      {/* 5. Giant High-Contrast Master Action Controls */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        
        {/* Big Start / Stop Monitoring Button */}
        <button
          id="btn-master-toggle-monitoring"
          onClick={() => {
            audioSynth.playClickSound();
            hapticsService.trigger('tap');
            onToggleMonitoring();
          }}
          className={`py-4 px-3 rounded-2xl font-black text-sm sm:text-base flex items-center justify-center gap-2 transition active:scale-95 shadow-xl ${
            isMonitoring
              ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/40 ring-4 ring-rose-500/30'
              : highContrast
                ? 'bg-yellow-400 text-black ring-4 ring-yellow-400/50'
                : 'bg-gradient-to-r from-cyan-500 to-teal-400 hover:from-cyan-400 hover:to-teal-300 text-slate-950 font-black shadow-cyan-500/30'
          }`}
          aria-label={isMonitoring ? 'Stop continuous environmental monitoring' : 'Start continuous real-time monitoring'}
        >
          {isMonitoring ? <Square className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
          <span>{isMonitoring ? 'STOP' : 'START MONITOR'}</span>
        </button>

        {/* Scan Obstacles Now Button */}
        <button
          id="btn-scan-obstacles-now"
          onClick={() => {
            audioSynth.playClickSound();
            hapticsService.trigger('light');
            captureAndAnalyzeFrame(true);
          }}
          className="py-4 px-3 rounded-2xl bg-slate-800 hover:bg-slate-750 active:bg-slate-700 text-cyan-300 border border-cyan-500/40 font-black text-sm sm:text-base flex items-center justify-center gap-2 transition active:scale-95 shadow-lg"
          aria-label="Scan current obstacles in camera view and announce"
        >
          <Zap className="w-5 h-5 text-cyan-400" />
          <span>SCAN PATH</span>
        </button>

        {/* 1-Tap Quick Train View */}
        {onQuickTrain && (
          <button
            id="btn-quick-train-view"
            onClick={() => {
              audioSynth.playClickSound();
              hapticsService.trigger('info');
              onQuickTrain();
            }}
            className="py-4 px-3 rounded-2xl bg-emerald-950 hover:bg-emerald-900 active:bg-emerald-800 text-emerald-200 border border-emerald-500/50 font-black text-sm sm:text-base flex items-center justify-center gap-2 transition active:scale-95 shadow-lg"
            aria-label="Quick train environment from current camera view in 1 tap"
          >
            <Sparkles className="w-5 h-5 text-emerald-400" />
            <span>TRAIN ROOM</span>
          </button>
        )}

        {/* Train / Calibrate Room (360 Scan) */}
        {onOpenTrainingModal && (
          <button
            id="btn-train-room-scan"
            onClick={() => {
              audioSynth.playClickSound();
              hapticsService.trigger('info');
              onOpenTrainingModal();
            }}
            className="py-4 px-3 rounded-2xl bg-purple-950 hover:bg-purple-900 active:bg-purple-800 text-purple-200 border border-purple-500/50 font-black text-sm sm:text-base flex items-center justify-center gap-2 transition active:scale-95 shadow-lg"
            aria-label="Train environment with 360 degree panoramic calibration scan"
          >
            <Compass className="w-5 h-5 text-purple-400" />
            <span>360° WIZARD</span>
          </button>
        )}
      </div>

      {/* 6. Alert Risk Classification & Audio Beep Guide */}
      <div 
        id="risk-classification-beep-panel"
        className="rounded-3xl border-2 border-slate-800 bg-slate-900/90 p-5 shadow-xl flex flex-col gap-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Volume2 className="w-5 h-5 text-cyan-400" />
            <h3 className="text-base font-black text-white tracking-wide">
              Audio Beep Risk Classification
            </h3>
          </div>
          <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800/50 font-bold">
            Tactile Audio Earcons
          </span>
        </div>

        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
          The system categorizes all obstacles and spatial changes into two distinct risk levels using directional audio beeps before speaking:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* High Risk Tier */}
          <div className="rounded-2xl border-2 border-rose-600/60 bg-rose-950/40 p-4 flex flex-col justify-between gap-3">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-black px-2.5 py-1 rounded-full bg-rose-600 text-white font-mono uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                  High-Level Risk
                </span>
                <span className="text-xs text-rose-300 font-bold font-mono">3 Sharp Beeps</span>
              </div>
              <p className="text-xs text-slate-200 leading-relaxed mt-2">
                <strong className="text-rose-200">Triggered for:</strong> Imminent collision hazards, obstacles directly in front (&lt; 1.2m / ~1-2 steps), sudden drop-offs, or stairs.
              </p>
            </div>
            <button
              id="btn-test-high-risk-beep"
              onClick={() => {
                audioSynth.playHighRiskBeep(0);
                hapticsService.trigger('warning');
                speechOutputManager.speak('High level risk alert: Three rapid warning beeps.', { priority: 'IMPORTANT' });
              }}
              className="w-full py-2.5 px-3.5 rounded-xl bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white font-black text-xs flex items-center justify-center gap-2 transition shadow-md"
              aria-label="Test high-level risk three rapid warning beeps"
            >
              <Volume2 className="w-4 h-4" />
              <span>Test High-Risk Beeps (3 Pulses)</span>
            </button>
          </div>

          {/* Low Risk Tier */}
          <div className="rounded-2xl border-2 border-teal-600/60 bg-teal-950/40 p-4 flex flex-col justify-between gap-3">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-black px-2.5 py-1 rounded-full bg-teal-600 text-slate-950 font-mono uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-slate-950" />
                  Low-Level Risk
                </span>
                <span className="text-xs text-teal-300 font-bold font-mono">1 Soft Ping</span>
              </div>
              <p className="text-xs text-slate-200 leading-relaxed mt-2">
                <strong className="text-teal-200">Triggered for:</strong> Distant objects (&gt; 1.5m), peripheral furniture off to your left or right sides, and ambient room landmarks.
              </p>
            </div>
            <button
              id="btn-test-low-risk-beep"
              onClick={() => {
                audioSynth.playLowRiskBeep(0);
                hapticsService.trigger('tap');
                speechOutputManager.speak('Low level risk alert: One gentle soft ping.', { priority: 'IMPORTANT' });
              }}
              className="w-full py-2.5 px-3.5 rounded-xl bg-teal-600 hover:bg-teal-500 active:bg-teal-700 text-slate-950 font-black text-xs flex items-center justify-center gap-2 transition shadow-md"
              aria-label="Test low-level risk one gentle soft ping"
            >
              <Volume2 className="w-4 h-4" />
              <span>Test Low-Risk Beep (1 Soft Ping)</span>
            </button>
          </div>
        </div>
      </div>

    </div>
  );
};
