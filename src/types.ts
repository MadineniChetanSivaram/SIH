/**
 * SpatialEye Core Types & Interfaces
 * Continuous Environmental Monitoring & Temporal Change Detection for Blind Users
 * No hardcoded place assumptions: Environments are discovered and recognized from visual/spatial evidence.
 */

export type NodeCategory = 
  | 'landmark' 
  | 'obstacle' 
  | 'furniture' 
  | 'entrance' 
  | 'door' 
  | 'staircase' 
  | 'hazard' 
  | 'walkway_boundary' 
  | 'sign' 
  | 'vehicle';

export type NodeStatus = 'stable' | 'transient' | 'displaced' | 'removed';

export type RiskLevel = 'none' | 'informational' | 'important' | 'critical';

export type ChangeType = 
  | 'new_obstacle' 
  | 'missing_landmark' 
  | 'displaced_object' 
  | 'blocked_path' 
  | 'entrance_modified' 
  | 'temporary_hazard' 
  | 'structural_change';

export type PersistenceClassification = 'temporary' | 'potential_persistent' | 'verified_persistent';

export type VoiceState = 
  | 'IDLE' 
  | 'LISTENING' 
  | 'PROCESSING' 
  | 'COMMAND_RECOGNIZED' 
  | 'COMMAND_FAILED' 
  | 'TIMEOUT' 
  | 'ERROR';

export type SpeechPriority = 'CRITICAL' | 'WARNING' | 'IMPORTANT' | 'INFORMATIONAL';

export interface Vector3D {
  x: number; // Left (-) to Right (+) in meters relative to origin/anchor
  y: number; // Forward (+) in meters
  z: number; // Height (+) in meters
}

export interface SpatialNode {
  id: string;
  environmentId: string;
  label: string;
  category: NodeCategory;
  position: Vector3D;
  dimensions?: { width: number; height: number; depth: number };
  confidence: number; // 0 to 1
  firstObservedAt: string;
  lastObservedAt: string;
  observationCount: number;
  status: NodeStatus;
  persistenceScore: number; // 0 to 1
  isPermanentLandmark?: boolean;
  notes?: string;
}

export interface PathWaypoint extends Vector3D {
  label?: string;
  stepIndex: number;
}

export interface SpatialPath {
  id: string;
  environmentId: string;
  name: string;
  habitualScore: number; // 0 to 1 (frequency of traversal)
  waypoints: PathWaypoint[];
  widthMeters: number;
  isDefault: boolean;
}

export interface SpatialRelationship {
  sourceNodeId: string;
  targetNodeId: string;
  distanceMeters: number;
  bearingDegrees: number; // 0 to 360
  relationshipType: 'along_path' | 'adjacent_to' | 'blocks' | 'leads_to' | 'near';
}

/**
 * Environment (Anonymous Identity)
 * Discovered from visual/spatial evidence. Optional human-readable nickname.
 */
export interface Environment {
  id: string; // e.g. "ENV_001", "ENV_002"
  customLabel?: string; // Optional user-assigned nickname (e.g. "My regular route")
  description: string;
  createdAt: string;
  lastVisitedAt: string;
  visitCount: number;
  visualSignature: string[]; // key landmark and spatial cluster signatures
  boundingRadiusMeters: number;
  isLearned: boolean;
  recognitionConfidence?: number; // Runtime confidence when matched
}

export interface SpatialMemory {
  environment: Environment;
  nodes: SpatialNode[];
  paths: SpatialPath[];
  relationships: SpatialRelationship[];
  observationsCount: number;
  lastUpdated: string;
}

export type EvasionDirection = 'left' | 'right' | 'slight_left' | 'slight_right' | 'stop' | 'straight' | 'hold';

export interface EvasionAdvice {
  direction: EvasionDirection;
  instruction: string;
  shortBadge: string;
}

export interface DetectedEntity {
  id: string;
  label: string;
  category: NodeCategory;
  distanceMeters: number;
  angleDegrees: number; // -90 (left) to +90 (right), 0 is straight ahead
  clockDirection: number; // 1 to 12 (12 is straight ahead, 3 right, 9 left)
  estimatedPosition: Vector3D;
  boundingBox?: [number, number, number, number]; // [ymin, xmin, ymax, xmax] 0..1000
  confidence: number;
  riskLevel?: 'high' | 'low' | 'critical' | 'important' | 'informational';
  isHazard?: boolean;
  evasionGuidance?: string;
  evasionDirection?: EvasionDirection;
}

export interface UserPose {
  x: number;
  y: number;
  headingDegrees: number;
  stepCount: number;
  speedMps: number;
}

export interface EnvironmentalChange {
  id: string;
  environmentId: string;
  environmentName: string; // e.g. "ENV_001" or "ENV_001 (My regular route)"
  timestamp: string;
  changeType: ChangeType;
  objectLabel: string;
  distanceMeters: number;
  clockDirection: number; // 1 to 12
  angleDegrees: number;
  affectsHabitualPath: boolean;
  riskLevel: RiskLevel;
  riskScore: number; // 0 to 100
  persistenceClassification: PersistenceClassification;
  verbalAlertText: string;
  evasionGuidance?: string;
  evasionDirection?: EvasionDirection;
  earconTone: 'info' | 'warning' | 'critical' | 'clear';
  hapticPattern: number[];
  confidence: number;
  details: string;
  acknowledged?: boolean;
  resolved?: boolean;
}

export interface UserPreferences {
  speechRate: number; // 0.8 to 1.5
  speechPitch: number; // 0.8 to 1.3
  verbosity: 'concise' | 'normal' | 'detailed';
  hapticsEnabled: boolean;
  audioCuesEnabled: boolean;
  riskThreshold: 'low' | 'medium' | 'high';
  autoEnvironmentRecognition: boolean;
  continuousMonitoringIntervalMs: number;
  highContrastMode: boolean;
  voiceControlAlwaysListening: boolean;
  tactileFeedbackSound: boolean;
}

export interface VoiceCommandIntent {
  action: 
    | 'START_MONITORING'
    | 'STOP_MONITORING'
    | 'TRAIN_ENVIRONMENT'
    | 'REMEMBER_ENVIRONMENT'
    | 'WHAT_CHANGED'
    | 'WHERE_AM_I'
    | 'WHAT_IS_AHEAD'
    | 'FIND_OBJECT'
    | 'DESCRIBE_SURROUNDINGS'
    | 'REPEAT_ALERT'
    | 'FORGET_ENVIRONMENT'
    | 'TOGGLE_MUTE'
    | 'SPEED_UP_SPEECH'
    | 'SLOW_DOWN_SPEECH'
    | 'TOGGLE_HIGH_CONTRAST'
    | 'TOGGLE_SCREEN_CURTAIN'
    | 'TOGGLE_HAPTICS'
    | 'NAVIGATE_VIEW'
    | 'SYSTEM_STATUS'
    | 'HELP'
    | 'NATURAL_QUERY'
    | 'NONE'
    | 'UNKNOWN';
  targetObject?: string;
  environmentLabel?: string;
  targetView?: 'monitor' | 'graph' | 'environments' | 'changes' | 'settings';
  rawQuery: string;
}

export interface AIAnalysisResponse {
  environmentRecognized?: {
    environmentId: string;
    confidence: number;
    description?: string;
  };
  detectedEntities: DetectedEntity[];
  changes: EnvironmentalChange[];
  sceneDescription: string;
  safetySpeech: string;
}
