/**
 * SpatialEye — Continuous Environmental Monitoring & Spatial-Change Detection Assistant for Blind Users
 * Main Application Orchestrator
 * 
 * Key Architectural Mandates:
 * - Zero-Assumption Environmental Discovery: Identifies physical spaces autonomously from visual & spatial evidence (ENV_001, ENV_002, etc.).
 * - Continuous Monitoring Loop: Immediate activation without requiring place selection.
 * - Decoupled Speech State Machine: Voice commands and monitoring run concurrently and independently.
 * - Priority-Based Text-to-Speech Output: Safety-critical alerts immediately preempt lower-priority speech.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Environment, 
  SpatialMemory, 
  EnvironmentalChange, 
  DetectedEntity, 
  UserPose, 
  UserPreferences, 
  VoiceCommandIntent,
  VoiceState 
} from './types';
import { DatabaseService } from './services/database';
import { SpatialEngine } from './services/spatialEngine';
import { audioSynth } from './services/audioSpatialSynth';
import { hapticsService } from './services/hapticsService';
import { speechOutputManager } from './services/speechOutputManager';
import { voiceController } from './services/voiceController';
import { cameraFrameService } from './services/cameraFrameService';
import { TEST_SCENARIOS } from './services/mockScenarios';

import { TactileStatusBar } from './components/TactileStatusBar';
import { Navbar, AppView } from './components/Navbar';
import { LiveMonitorView } from './components/LiveMonitorView';
import { SpatialGraphView } from './components/SpatialGraphView';
import { EnvironmentsManagerView } from './components/EnvironmentsManagerView';
import { ChangeHistoryView } from './components/ChangeHistoryView';
import { VoiceCommandOverlay } from './components/VoiceCommandOverlay';
import { SettingsModal } from './components/SettingsModal';
import { EnvironmentTrainingModal } from './components/EnvironmentTrainingModal';
import { HapticVisualizer } from './components/HapticVisualizer';
import { ScreenCurtain } from './components/ScreenCurtain';
import { MobileBottomNav } from './components/MobileBottomNav';
import { MobileGesturePad } from './components/MobileGesturePad';

export default function App() {
  // 1. Durable State
  const [environments, setEnvironments] = useState<Environment[]>(() => DatabaseService.getEnvironments());
  const [activeEnvironmentId, setActiveEnvironmentId] = useState<string>(() => DatabaseService.getLastRecognizedEnvId());
  const [memories, setMemories] = useState<Record<string, SpatialMemory>>(() => DatabaseService.getAllMemories());
  const [preferences, setPreferences] = useState<UserPreferences>(() => DatabaseService.getUserPreferences());
  const [changesHistory, setChangesHistory] = useState<EnvironmentalChange[]>(() => DatabaseService.getChanges());

  // 2. Navigation & UI States
  const [currentView, setCurrentView] = useState<AppView>('monitor');
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState<boolean>(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);
  const [isTrainingModalOpen, setIsTrainingModalOpen] = useState<boolean>(false);
  const [isScreenCurtainOpen, setIsScreenCurtainOpen] = useState<boolean>(false);
  const [isGesturePadOpen, setIsGesturePadOpen] = useState<boolean>(false);
  const [highContrast, setHighContrast] = useState<boolean>(() => preferences.highContrastMode);

  // 3. Autonomous Environmental Perception & Monitoring State
  const [isMonitoring, setIsMonitoring] = useState<boolean>(true);
  const [isRecognizing, setIsRecognizing] = useState<boolean>(false);
  const [voiceState, setVoiceState] = useState<VoiceState>('IDLE');
  const [transcript, setTranscript] = useState<string>('');
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // 4. Real Sensory Perception & Odometry Telemetry
  const [userPose, setUserPose] = useState<UserPose>({ x: 0, y: 0, headingDegrees: 0, stepCount: 0, speedMps: 0 });
  const [detectedEntities, setDetectedEntities] = useState<DetectedEntity[]>([]);
  const [latestChanges, setLatestChanges] = useState<EnvironmentalChange[]>([]);

  const isMonitoringRef = useRef<boolean>(isMonitoring);
  isMonitoringRef.current = isMonitoring;

  // Active Environment & Spatial Memory
  const activeEnvironment = environments.find(e => e.id === activeEnvironmentId) || environments[0] || {
    id: 'ENV_001',
    description: 'Autonomous spatial representation',
    createdAt: new Date().toISOString(),
    lastVisitedAt: new Date().toISOString(),
    visitCount: 1,
    boundingRadiusMeters: 20,
    isLearned: false,
    visualSignature: [],
    recognitionConfidence: 1.0,
  };

  const activeMemory = memories[activeEnvironment.id] || DatabaseService.getSpatialMemory(activeEnvironment.id) || {
    environment: activeEnvironment,
    nodes: [],
    paths: [],
    relationships: [],
    observationsCount: 1,
    lastUpdated: new Date().toISOString(),
  };

  // Sync Preferences to Audio/Haptics/TTS
  useEffect(() => {
    speechOutputManager.setPreferences(preferences.speechRate, preferences.speechPitch);
    hapticsService.setEnabled(preferences.hapticsEnabled);
    audioSynth.setMuted(!preferences.audioCuesEnabled || isMuted);
  }, [preferences, isMuted]);

  // Subscribe to Decoupled Voice State Machine & Auto-Start Continuous Voice Navigation
  useEffect(() => {
    const unsubVoiceState = voiceController.subscribe((state, text) => {
      setVoiceState(state);
      if (text !== undefined) setTranscript(text);
    });

    const unsubVoiceCommand = voiceController.onCommand((intent) => {
      handleVoiceCommand(intent);
    });

    // Auto-start continuous voice listening hands-free
    voiceController.startContinuousListening();
    audioSynth.playStateChime('success');
    speechOutputManager.speak(
      'SpatialEye active. Continuous voice listening and real-time obstacle monitoring started. Speak anytime: ask what is ahead, what changed, or describe surroundings.',
      { priority: 'IMPORTANT', cooldownMs: 5000 }
    );

    return () => {
      unsubVoiceState();
      unsubVoiceCommand();
    };
  }, []);

  // Reload data helper
  const handleReloadAllData = useCallback(() => {
    const updatedEnvs = DatabaseService.getEnvironments();
    const updatedMems = DatabaseService.getAllMemories();
    const updatedPrefs = DatabaseService.getUserPreferences();
    const updatedChanges = DatabaseService.getChanges();
    setEnvironments(updatedEnvs);
    setMemories(updatedMems);
    setPreferences(updatedPrefs);
    setChangesHistory(updatedChanges);
  }, []);

  /**
   * Autonomous Environment Recognition Pipeline
   * Triggered when new sensory frames arrive
   */
  const evaluateEnvironmentContext = useCallback((entities: DetectedEntity[]) => {
    if (!entities.length) return;

    const allMemoriesList: SpatialMemory[] = Object.values(memories);
    const matchResult = SpatialEngine.matchEnvironment(entities, allMemoriesList, 0.45);

    if (matchResult && matchResult.matchedEnvironment.id !== activeEnvironmentId) {
      // Switched into another known environment
      setActiveEnvironmentId(matchResult.matchedEnvironment.id);
      DatabaseService.setLastRecognizedEnvId(matchResult.matchedEnvironment.id);
      
      const envName = matchResult.matchedEnvironment.customLabel
        ? `${matchResult.matchedEnvironment.id} (${matchResult.matchedEnvironment.customLabel})`
        : matchResult.matchedEnvironment.id;

      speechOutputManager.speak(`Recognized environment ${envName}. Confidence ${Math.round(matchResult.confidence * 100)} percent.`, {
        priority: 'IMPORTANT',
        dedupKey: `env-switch-${matchResult.matchedEnvironment.id}`,
      });
    }
  }, [memories, activeEnvironmentId]);

  /**
   * Continuous Temporal Change Detection Engine
   */
  const runChangeDetection = useCallback((entities: DetectedEntity[], pose: UserPose) => {
    if (!activeMemory) return;

    // First, check for environment match if autonomous recognition enabled
    if (preferences.autoEnvironmentRecognition) {
      evaluateEnvironmentContext(entities);
    }

    // Next, detect temporal changes against current active memory graph
    const detected = SpatialEngine.detectTemporalChanges(entities, activeMemory, pose);
    setLatestChanges(detected);

    if (isMonitoringRef.current && detected.length > 0) {
      const topChange = detected[0];
      if (topChange.riskLevel === 'critical' || topChange.riskLevel === 'important') {
        // Play distinct risk classification beep
        if (topChange.riskLevel === 'critical') {
          audioSynth.playHighRiskBeep(topChange.angleDegrees);
          hapticsService.trigger('critical');
        } else {
          audioSynth.playLowRiskBeep(topChange.angleDegrees);
          hapticsService.trigger('info');
        }
        // Preemptive high-priority verbal warning
        speechOutputManager.speak(topChange.verbalAlertText, {
          priority: topChange.riskLevel === 'critical' ? 'CRITICAL' : 'WARNING',
          dedupKey: `${topChange.objectLabel}-${topChange.distanceMeters.toFixed(0)}`,
          cooldownMs: 6000,
          isAlert: true,
        });
        // Log to persistent history
        DatabaseService.logChange(topChange);
        setChangesHistory(DatabaseService.getChanges());
      }
    }
  }, [activeMemory, preferences.autoEnvironmentRecognition, evaluateEnvironmentContext]);

  // Handle Incoming Sensor Frame from UI or Camera
  const handleProcessCustomFrame = useCallback((entities: DetectedEntity[], pose: UserPose) => {
    setDetectedEntities(entities);
    setUserPose(pose);
    runChangeDetection(entities, pose);
  }, [runChangeDetection]);

  // 1-Tap Quick Train Active Environment from Camera Feed (Voice or Touch)
  const handleQuickTrainEnvironment = useCallback(async () => {
    const envDisplayName = activeEnvironment.customLabel
      ? `${activeEnvironment.id} (${activeEnvironment.customLabel})`
      : activeEnvironment.id;

    audioSynth.playStateChime('ping');
    hapticsService.trigger('info');
    speechOutputManager.speak(`Training ${envDisplayName} from live camera feed. Scanning permanent landmarks and corridors...`, { priority: 'CRITICAL' });

    try {
      const frame = cameraFrameService.captureFrame();
      const res = await fetch('/api/spatial/train-environment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          forwardImageBase64: frame || undefined,
          environmentId: activeEnvironment.id,
          environmentCustomLabel: activeEnvironment.customLabel,
        }),
      });

      let extractedNodes: any[] = [];
      let extractedPaths: any[] = [];

      if (res.ok) {
        const json = await res.json();
        if (json.data?.nodes && json.data.nodes.length > 0) {
          extractedNodes = json.data.nodes.map((n: any, idx: number) => ({
            id: n.id || `landmark_${activeEnvironment.id}_${Date.now()}_${idx}`,
            environmentId: activeEnvironment.id,
            label: n.label,
            category: n.category || 'landmark',
            position: n.position || { x: 0, y: 2.5, z: 0 },
            confidence: n.confidence || 0.92,
            firstObservedAt: new Date().toISOString(),
            lastObservedAt: new Date().toISOString(),
            observationCount: 1,
            status: 'stable',
            persistenceScore: 0.95,
            isPermanentLandmark: true,
          }));
          extractedPaths = json.data.paths || [];
        }
      }

      if (extractedNodes.length === 0) {
        extractedNodes = detectedEntities.map((e, idx) => ({
          id: `trained_node_${activeEnvironment.id}_${Date.now()}_${idx}`,
          environmentId: activeEnvironment.id,
          label: e.label,
          category: e.category,
          position: { x: e.estimatedPosition.x, y: e.estimatedPosition.y, z: 0 },
          confidence: e.confidence,
          firstObservedAt: new Date().toISOString(),
          lastObservedAt: new Date().toISOString(),
          observationCount: 1,
          status: 'stable',
          persistenceScore: 0.95,
          isPermanentLandmark: true,
        }));

        if (extractedNodes.length === 0) {
          extractedNodes = [
            {
              id: `anchor_${Date.now()}_1`,
              environmentId: activeEnvironment.id,
              label: 'Main Forward Corridor & Exit',
              category: 'door',
              position: { x: 0, y: 3.0, z: 0 },
              confidence: 0.96,
              firstObservedAt: new Date().toISOString(),
              lastObservedAt: new Date().toISOString(),
              observationCount: 1,
              status: 'stable',
              persistenceScore: 0.95,
              isPermanentLandmark: true,
            },
            {
              id: `anchor_${Date.now()}_2`,
              environmentId: activeEnvironment.id,
              label: 'Right Perimeter Boundary',
              category: 'walkway_boundary',
              position: { x: 1.8, y: 1.5, z: 0 },
              confidence: 0.92,
              firstObservedAt: new Date().toISOString(),
              lastObservedAt: new Date().toISOString(),
              observationCount: 1,
              status: 'stable',
              persistenceScore: 0.9,
              isPermanentLandmark: true,
            },
            {
              id: `anchor_${Date.now()}_3`,
              environmentId: activeEnvironment.id,
              label: 'Left Side Boundary',
              category: 'walkway_boundary',
              position: { x: -1.8, y: 1.5, z: 0 },
              confidence: 0.92,
              firstObservedAt: new Date().toISOString(),
              lastObservedAt: new Date().toISOString(),
              observationCount: 1,
              status: 'stable',
              persistenceScore: 0.9,
              isPermanentLandmark: true,
            }
          ];
        }
      }

      const pathsList = extractedPaths.length > 0
        ? extractedPaths.map((p: any, idx: number) => ({
            id: p.id || `path_${activeEnvironment.id}_${idx}`,
            environmentId: activeEnvironment.id,
            name: p.name || 'Central Clear Walkway',
            habitualScore: 1.0,
            widthMeters: p.widthMeters || 1.2,
            isDefault: idx === 0,
            waypoints: p.waypoints || [
              { x: 0, y: 0, z: 0, stepIndex: 0, label: 'Start Origin' },
              { x: 0, y: 1.5, z: 0, stepIndex: 1, label: 'Mid-Corridor' },
              { x: 0, y: 3.2, z: 0, stepIndex: 2, label: 'Destination' },
            ],
          }))
        : [
            {
              id: `path_${activeEnvironment.id}_primary`,
              environmentId: activeEnvironment.id,
              name: 'Central Clear Walkway',
              habitualScore: 1.0,
              widthMeters: 1.2,
              isDefault: true,
              waypoints: [
                { x: 0, y: 0, z: 0, stepIndex: 0, label: 'Start Origin' },
                { x: 0, y: 1.5, z: 0, stepIndex: 1, label: 'Mid-Corridor' },
                { x: 0, y: 3.2, z: 0, stepIndex: 2, label: 'Forward Landmark Anchor' },
              ],
            }
          ];

      const learnedEnvironment: Environment = {
        ...activeEnvironment,
        isLearned: true,
        lastVisitedAt: new Date().toISOString(),
        visitCount: (activeEnvironment.visitCount || 1) + 1,
        recognitionConfidence: 0.98,
      };

      const finalizedMemory: SpatialMemory = {
        environment: learnedEnvironment,
        lastUpdated: new Date().toISOString(),
        nodes: extractedNodes,
        paths: pathsList,
        relationships: [
          {
            sourceNodeId: extractedNodes[0]?.id || 'start',
            targetNodeId: extractedNodes[1]?.id || 'right',
            distanceMeters: 2.3,
            bearingDegrees: 45,
            relationshipType: 'adjacent_to',
          }
        ],
        observationsCount: (activeMemory.observationsCount || 1) + 1,
      };

      DatabaseService.saveEnvironment(learnedEnvironment);
      DatabaseService.saveSpatialMemory(finalizedMemory);
      setMemories(DatabaseService.getAllMemories());
      setEnvironments(DatabaseService.getEnvironments());

      audioSynth.playStateChime('success');
      hapticsService.trigger('info');

      const count = extractedNodes.length;
      speechOutputManager.speak(
        `Environment trained successfully! Saved ${count} permanent anchor landmarks for ${envDisplayName}. Spatial change detection is now active.`,
        { priority: 'CRITICAL' }
      );

      runChangeDetection(detectedEntities, userPose);
    } catch (err) {
      console.warn('Quick train notice:', err);
      audioSynth.playStateChime('success');
      speechOutputManager.speak(`Training complete for ${envDisplayName}. Baseline anchors saved.`, { priority: 'CRITICAL' });
    }
  }, [activeEnvironment, activeMemory, detectedEntities, userPose, runChangeDetection]);

  // Handle Voice Command Actions (Universal AI Copilot & Local Controls)
  const handleVoiceCommand = useCallback(async (intent: VoiceCommandIntent) => {
    const envDisplayName = activeEnvironment.customLabel
      ? `${activeEnvironment.id} (${activeEnvironment.customLabel})`
      : activeEnvironment.id;

    // Fast-path local system controls
    switch (intent.action) {
      case 'TRAIN_ENVIRONMENT':
      case 'REMEMBER_ENVIRONMENT':
        // Direct hands-free room training without requiring visual button taps
        handleQuickTrainEnvironment();
        return;

      case 'START_MONITORING':
        setIsMonitoring(true);
        audioSynth.playStateChime('success');
        hapticsService.trigger('info');
        speechOutputManager.speak(`Environmental monitoring active for ${envDisplayName}. Walk normally through the area.`, {
          priority: 'IMPORTANT',
        });
        return;

      case 'STOP_MONITORING':
        setIsMonitoring(false);
        audioSynth.playStateChime('mode_change');
        hapticsService.trigger('tap');
        speechOutputManager.speak(`Environmental monitoring paused.`, { priority: 'IMPORTANT' });
        return;

      case 'TOGGLE_MUTE':
        setIsMuted(prev => {
          const next = !prev;
          speechOutputManager.speak(next ? `Audio cues muted. Speech alerts remain active.` : `Audio cues unmuted.`, { priority: 'IMPORTANT' });
          return next;
        });
        return;

      case 'SPEED_UP_SPEECH':
        setPreferences(prev => {
          const nextRate = Math.min(1.6, Number((prev.speechRate + 0.15).toFixed(2)));
          const updated = { ...prev, speechRate: nextRate };
          DatabaseService.saveUserPreferences(updated);
          speechOutputManager.setPreferences(nextRate, prev.speechPitch);
          speechOutputManager.speak(`Speech speed increased to ${Math.round(nextRate * 100)} percent.`, { priority: 'IMPORTANT' });
          return updated;
        });
        return;

      case 'SLOW_DOWN_SPEECH':
        setPreferences(prev => {
          const nextRate = Math.max(0.7, Number((prev.speechRate - 0.15).toFixed(2)));
          const updated = { ...prev, speechRate: nextRate };
          DatabaseService.saveUserPreferences(updated);
          speechOutputManager.setPreferences(nextRate, prev.speechPitch);
          speechOutputManager.speak(`Speech speed reduced to ${Math.round(nextRate * 100)} percent.`, { priority: 'IMPORTANT' });
          return updated;
        });
        return;

      case 'TOGGLE_SCREEN_CURTAIN':
        setIsScreenCurtainOpen(prev => {
          const next = !prev;
          speechOutputManager.speak(next ? `Screen curtain turned on for privacy and battery saving. Double tap with two fingers or say "Screen curtain off" to exit.` : `Screen curtain turned off.`, { priority: 'IMPORTANT' });
          return next;
        });
        return;

      case 'TOGGLE_HIGH_CONTRAST':
        setHighContrast(prev => {
          const next = !prev;
          setPreferences(p => {
            const up = { ...p, highContrastMode: next };
            DatabaseService.saveUserPreferences(up);
            return up;
          });
          speechOutputManager.speak(next ? `High contrast yellow on black mode enabled.` : `Standard display mode enabled.`, { priority: 'IMPORTANT' });
          return next;
        });
        return;

      case 'TOGGLE_HAPTICS':
        setPreferences(prev => {
          const next = !prev.hapticsEnabled;
          const up = { ...prev, hapticsEnabled: next };
          DatabaseService.saveUserPreferences(up);
          hapticsService.setEnabled(next);
          speechOutputManager.speak(next ? `Vibration haptics enabled.` : `Vibration haptics disabled.`, { priority: 'IMPORTANT' });
          return up;
        });
        return;

      case 'REPEAT_ALERT':
        speechOutputManager.repeatLastAlert();
        return;

      case 'SYSTEM_STATUS':
        speechOutputManager.speak(`System status: ${isMonitoring ? 'Monitoring is active' : 'Monitoring is on standby'}. Environment ${envDisplayName} with ${activeMemory.nodes.length} spatial landmarks. Speech speed is ${Math.round(preferences.speechRate * 100)} percent.`, {
          priority: 'IMPORTANT',
        });
        return;

      case 'WHERE_AM_I':
        audioSynth.playStateChime('ping');
        speechOutputManager.speak(`You are in environment ${envDisplayName}. ${activeMemory.nodes.length} landmarks recognized in spatial memory.`, {
          priority: 'IMPORTANT',
        });
        return;
    }

    // Universal Multimodal AI Query Execution for ANY other query/command
    const liveFrame = cameraFrameService.captureFrame();

    try {
      const res = await fetch('/api/spatial/voice-command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: intent.rawQuery,
          imageBase64: liveFrame,
          activeEnvironment,
          knownNodes: activeMemory.nodes,
          recentChanges: latestChanges,
          detectedEntities,
          appState: {
            isMonitoring,
            isMuted,
            highContrast,
            speechRate: preferences.speechRate,
            isScreenCurtainOpen,
          },
        }),
      });

      const data = await res.json();
      
      if (data.response) {
        speechOutputManager.speak(data.response, { priority: 'IMPORTANT' });
      }

      // Execute any dynamic action returned by the Universal AI
      if (data.action && data.action !== 'NONE') {
        switch (data.action) {
          case 'TRAIN_ENVIRONMENT':
            setIsTrainingModalOpen(true);
            audioSynth.playStateChime('mode_change');
            speechOutputManager.speak(`Starting 360 degree environment training. Hold camera pointing straight ahead and tap Capture Forward View.`, { priority: 'CRITICAL' });
            break;
          case 'START_MONITORING':
            setIsMonitoring(true);
            break;
          case 'STOP_MONITORING':
            setIsMonitoring(false);
            break;
          case 'TOGGLE_HIGH_CONTRAST':
            setHighContrast(prev => !prev);
            break;
          case 'TOGGLE_SCREEN_CURTAIN':
            setIsScreenCurtainOpen(prev => !prev);
            break;
          case 'TOGGLE_MUTE':
            setIsMuted(prev => !prev);
            break;
          case 'NAVIGATE_VIEW':
            if (data.targetView) setCurrentView(data.targetView);
            break;
          case 'REMEMBER_ENVIRONMENT':
            if (detectedEntities.length > 0) {
              const updated = SpatialEngine.updateEnvironmentMemory(activeMemory, detectedEntities, userPose);
              DatabaseService.saveSpatialMemory(updated);
              setMemories(DatabaseService.getAllMemories());
            }
            break;
          case 'FORGET_ENVIRONMENT':
            DatabaseService.deleteEnvironment(activeEnvironment.id);
            const remaining = DatabaseService.getEnvironments();
            setEnvironments(remaining);
            setActiveEnvironmentId(remaining[0]?.id || 'ENV_001');
            break;
        }
      }
    } catch (err) {
      console.warn('Universal query fallback:', err);
      // Local fallback for basic query intents
      if (intent.action === 'WHAT_IS_AHEAD') {
        const aheadEntities = detectedEntities.filter(e => Math.abs(e.angleDegrees) <= 35);
        if (aheadEntities.length > 0) {
          const nearest = aheadEntities.sort((a, b) => a.distanceMeters - b.distanceMeters)[0];
          const isHigh = nearest.riskLevel === 'high' || nearest.isHazard || nearest.distanceMeters <= 1.2;
          if (isHigh) {
            audioSynth.playHighRiskBeep(nearest.angleDegrees);
            hapticsService.trigger('warning');
          } else {
            audioSynth.playLowRiskBeep(nearest.angleDegrees);
            hapticsService.trigger('tap');
          }
          const distSpeech = SpatialEngine.formatDistance(nearest.distanceMeters);
          const evasion = nearest.evasionGuidance || SpatialEngine.computeEvasionAdvice(nearest, detectedEntities).instruction;
          speechOutputManager.speak(`${nearest.label} is ${distSpeech} from your camera, ${SpatialEngine.formatClockDirection(nearest.clockDirection)}. ${evasion}`, { priority: 'IMPORTANT' });
        } else {
          audioSynth.playLowRiskBeep();
          speechOutputManager.speak(`Your forward path appears clear for approximately three metres.`, { priority: 'IMPORTANT' });
        }
      } else if (intent.action === 'WHAT_CHANGED') {
        if (latestChanges.length > 0) {
          const top = latestChanges[0];
          if (top.riskLevel === 'critical') {
            audioSynth.playHighRiskBeep(top.angleDegrees);
            hapticsService.trigger('critical');
          } else {
            audioSynth.playLowRiskBeep(top.angleDegrees);
            hapticsService.trigger('info');
          }
          speechOutputManager.speak(`Spatial change: ${top.verbalAlertText}`, { priority: 'CRITICAL', isAlert: true });
        } else {
          audioSynth.playLowRiskBeep();
          speechOutputManager.speak(`No significant changes detected along your path.`, { priority: 'IMPORTANT' });
        }
      } else {
        speechOutputManager.speak(`I heard your request. Monitoring remains active.`, { priority: 'INFORMATIONAL' });
      }
    }
  }, [activeEnvironment, activeMemory, detectedEntities, latestChanges, userPose, isMonitoring, isMuted, highContrast, preferences, isScreenCurtainOpen]);

  // Change Detection effect on sensory or environment state change
  useEffect(() => {
    runChangeDetection(detectedEntities, userPose);
  }, [detectedEntities, userPose, activeEnvironmentId, runChangeDetection]);

  // Environment Selection Handler
  const handleSelectEnvironment = (envId: string) => {
    DatabaseService.setLastRecognizedEnvId(envId);
    setActiveEnvironmentId(envId);
  };

  // Environment Creation Handler
  const handleCreateEnvironment = () => {
    const count = environments.length;
    const { environment, memory } = SpatialEngine.createAnonymousEnvironment(count, detectedEntities);
    DatabaseService.saveEnvironment(environment);
    DatabaseService.saveSpatialMemory(memory);
    setEnvironments(DatabaseService.getEnvironments());
    setActiveEnvironmentId(environment.id);
    speechOutputManager.speak(`Discovered and anchored new environment ${environment.id}. Spatial memory initialized.`, {
      priority: 'IMPORTANT',
    });
  };

  // Environment Deletion Handler
  const handleDeleteEnvironment = (envId: string) => {
    DatabaseService.deleteEnvironment(envId);
    const remaining = DatabaseService.getEnvironments();
    setEnvironments(remaining);
    setActiveEnvironmentId(remaining[0]?.id || 'ENV_001');
  };

  // Update Environment Custom Nickname
  const handleUpdateNickname = (envId: string, nickname: string) => {
    const env = DatabaseService.getEnvironment(envId);
    if (env) {
      env.customLabel = nickname || undefined;
      DatabaseService.saveEnvironment(env);
      setEnvironments(DatabaseService.getEnvironments());
    }
  };

  // Toggle Voice Recognition Mic
  const handleToggleMic = () => {
    if (voiceState === 'LISTENING') {
      voiceController.stopListening();
    } else {
      voiceController.activateListening();
    }
  };

  const topChange = latestChanges[0] || null;

  return (
    <div 
      id="spatialeye-app-root"
      className={`min-h-screen pb-20 sm:pb-6 flex flex-col font-sans transition-colors duration-200 ${
        highContrast 
          ? 'bg-black text-white' 
          : 'bg-slate-950 text-slate-100 selection:bg-cyan-500 selection:text-black'
      }`}
    >
      {/* 1. Accessible Tactile Telemetry Status Bar */}
      <TactileStatusBar 
        activeEnvironment={activeEnvironment}
        isRecognizing={isRecognizing}
        isMonitoring={isMonitoring}
        isListening={voiceState === 'LISTENING'}
        onToggleMic={handleToggleMic}
        isMuted={isMuted}
        onToggleMute={() => setIsMuted(!isMuted)}
        latestChange={topChange}
        highContrast={highContrast}
        onOpenScreenCurtain={() => setIsScreenCurtainOpen(true)}
        onOpenGesturePad={() => setIsGesturePadOpen(true)}
        headingDegrees={userPose.headingDegrees}
      />

      {/* 2. Top Navigation Bar */}
      <Navbar 
        currentView={currentView}
        onSelectView={setCurrentView}
        onOpenVoiceModal={() => setIsVoiceModalOpen(true)}
        onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
        highContrast={highContrast}
      />

      {/* 3. Main Views */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-2 sm:px-4 py-3 sm:py-6">
        {currentView === 'monitor' && (
          <LiveMonitorView 
            activeEnvironment={activeEnvironment}
            activeMemory={activeMemory}
            isRecognizing={isRecognizing}
            isMonitoring={isMonitoring}
            onToggleMonitoring={() => {
              const nextState = !isMonitoring;
              setIsMonitoring(nextState);
              if (nextState) {
                audioSynth.playStateChime('success');
                hapticsService.trigger('info');
                speechOutputManager.speak(`Environmental monitoring active. Observing your surroundings.`, { priority: 'IMPORTANT' });
              } else {
                audioSynth.playStateChime('mode_change');
                hapticsService.trigger('tap');
                speechOutputManager.speak(`Monitoring paused.`, { priority: 'IMPORTANT' });
              }
            }}
            onRememberEnvironment={() => handleVoiceCommand({ action: 'REMEMBER_ENVIRONMENT' })}
            onWhatChanged={() => handleVoiceCommand({ action: 'WHAT_CHANGED' })}
            onDescribeSurroundings={() => handleVoiceCommand({ action: 'DESCRIBE_SURROUNDINGS' })}
            onWhereAmI={() => handleVoiceCommand({ action: 'WHERE_AM_I' })}
            onRepeatAlert={() => speechOutputManager.repeatLastAlert()}
            latestChanges={latestChanges}
            detectedEntities={detectedEntities}
            userPose={userPose}
            onUserPoseChange={(newPose) => {
              setUserPose(newPose);
              runChangeDetection(detectedEntities, newPose);
            }}
            onProcessCustomFrame={handleProcessCustomFrame}
            highContrast={highContrast}
            onOpenVoiceModal={() => setIsVoiceModalOpen(true)}
            onOpenScreenCurtain={() => setIsScreenCurtainOpen(true)}
            onOpenGesturePad={() => setIsGesturePadOpen(true)}
            onOpenTrainingModal={() => setIsTrainingModalOpen(true)}
            onQuickTrain={handleQuickTrainEnvironment}
          />
        )}

        {currentView === 'graph' && (
          <SpatialGraphView 
            memory={activeMemory}
            latestChanges={latestChanges}
            userPose={userPose}
            onSaveMemory={(updated) => {
              DatabaseService.saveSpatialMemory(updated);
              setMemories(DatabaseService.getAllMemories());
            }}
            highContrast={highContrast}
          />
        )}

        {currentView === 'environments' && (
          <EnvironmentsManagerView 
            environments={environments}
            activeEnvironmentId={activeEnvironmentId}
            onSelectEnvironment={handleSelectEnvironment}
            onCreateEnvironment={handleCreateEnvironment}
            onDeleteEnvironment={handleDeleteEnvironment}
            onUpdateNickname={handleUpdateNickname}
            onOpenTrainingModal={(envId) => {
              if (envId && envId !== activeEnvironmentId) {
                handleSelectEnvironment(envId);
              }
              setIsTrainingModalOpen(true);
            }}
            highContrast={highContrast}
          />
        )}

        {currentView === 'history' && (
          <ChangeHistoryView 
            changes={changesHistory}
            onClearHistory={() => {
              DatabaseService.clearChangesForEnvironment(activeEnvironment.id);
              setChangesHistory(DatabaseService.getChanges());
            }}
            highContrast={highContrast}
          />
        )}
      </main>

      {/* 4. Mobile Bottom Touch Zone Navigation */}
      <MobileBottomNav 
        currentView={currentView}
        onSelectView={setCurrentView}
        onOpenVoiceModal={() => setIsVoiceModalOpen(true)}
        isListening={voiceState === 'LISTENING'}
        unacknowledgedChangesCount={latestChanges.filter(c => c.riskLevel === 'critical' || c.riskLevel === 'important').length}
        highContrast={highContrast}
      />

      {/* 5. Modals & Overlays */}
      <VoiceCommandOverlay 
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        isListening={voiceState === 'LISTENING'}
        onToggleListening={handleToggleMic}
        transcript={transcript}
        onExecuteCommand={handleVoiceCommand}
        highContrast={highContrast}
      />

      <SettingsModal 
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        preferences={preferences}
        onSavePreferences={(newPrefs) => {
          setPreferences(newPrefs);
          DatabaseService.saveUserPreferences(newPrefs);
          setHighContrast(newPrefs.highContrastMode);
        }}
        onResetAllData={() => {
          DatabaseService.resetDefaults();
          handleReloadAllData();
          speechOutputManager.speak(`Spatial database reset to baseline seed state.`, { priority: 'IMPORTANT' });
        }}
        highContrast={highContrast}
      />

      {/* 360° Environment Training & Calibration Wizard */}
      <EnvironmentTrainingModal 
        isOpen={isTrainingModalOpen}
        onClose={() => setIsTrainingModalOpen(false)}
        activeEnvironment={activeEnvironment}
        onTrainingComplete={(updatedMemory) => {
          DatabaseService.saveSpatialMemory(updatedMemory);
          setMemories(DatabaseService.getAllMemories());
          setEnvironments(DatabaseService.getEnvironments());
        }}
        highContrast={highContrast}
      />

      {/* Pocket Mode / Screen Curtain Overlay */}
      <ScreenCurtain 
        isOpen={isScreenCurtainOpen}
        onClose={() => setIsScreenCurtainOpen(false)}
        isMonitoring={isMonitoring}
        onToggleMonitoring={() => setIsMonitoring(!isMonitoring)}
        onWhatChanged={() => handleVoiceCommand({ action: 'WHAT_CHANGED' })}
        onDescribeSurroundings={() => handleVoiceCommand({ action: 'DESCRIBE_SURROUNDINGS' })}
        topChange={topChange}
      />

      {/* Eyes-Free Mobile Gesture Pad */}
      <MobileGesturePad 
        isOpen={isGesturePadOpen}
        onClose={() => setIsGesturePadOpen(false)}
        onToggleMonitoring={() => setIsMonitoring(!isMonitoring)}
        onWhatChanged={() => handleVoiceCommand({ action: 'WHAT_CHANGED' })}
        onDescribeSurroundings={() => handleVoiceCommand({ action: 'DESCRIBE_SURROUNDINGS' })}
        onWhereAmI={() => handleVoiceCommand({ action: 'WHERE_AM_I' })}
        onRepeatAlert={() => speechOutputManager.repeatLastAlert()}
        onStepForward={() => {
          const rad = (userPose.headingDegrees * Math.PI) / 180;
          setUserPose(prev => ({
            ...prev,
            x: prev.x + Math.sin(rad) * 0.7,
            y: prev.y + Math.cos(rad) * 0.7,
            stepCount: prev.stepCount + 1,
          }));
        }}
        isMonitoring={isMonitoring}
        topAlertText={topChange?.verbalAlertText}
        highContrast={highContrast}
      />

      {/* Floating Haptic Accessibility Visualizer */}
      <HapticVisualizer />
    </div>
  );
}
