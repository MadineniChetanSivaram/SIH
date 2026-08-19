/**
 * Local Durable Spatial Database & Storage Management
 * Zero-Assumption Anonymous Environments, Spatial Memory Graphs, Habitual Trajectories,
 * Temporal Change History, and User Accessibility Preferences.
 */

import { 
  Environment, 
  EnvironmentalChange, 
  SpatialMemory, 
  SpatialNode, 
  SpatialPath, 
  UserPreferences 
} from '../types';

const STORAGE_KEYS = {
  ENVIRONMENTS: 'spatialeye_environments_v3',
  MEMORIES: 'spatialeye_memories_v3',
  CHANGES: 'spatialeye_changes_v3',
  PREFERENCES: 'spatialeye_preferences_v3',
  LAST_RECOGNIZED_ENV_ID: 'spatialeye_last_env_id_v3',
};

const DEFAULT_PREFERENCES: UserPreferences = {
  speechRate: 1.05,
  speechPitch: 1.0,
  verbosity: 'normal',
  hapticsEnabled: true,
  audioCuesEnabled: true,
  riskThreshold: 'medium',
  autoEnvironmentRecognition: true,
  continuousMonitoringIntervalMs: 2000,
  highContrastMode: false,
  voiceControlAlwaysListening: true,
  tactileFeedbackSound: true,
};

// Generic Anonymous Seed Environments (Constellation of spatial features)
const SEED_ENVIRONMENTS: Environment[] = [
  {
    id: 'ENV_001',
    description: 'Long corridor passage with boundary doorway, peripheral seating, and stair landing at 8.8m.',
    createdAt: '2026-06-10T09:00:00.000Z',
    lastVisitedAt: '2026-08-18T14:20:00.000Z',
    visitCount: 48,
    boundingRadiusMeters: 25,
    isLearned: true,
    visualSignature: ['boundary_double_door', 'wall_mounted_board', 'stair_landing'],
    recognitionConfidence: 0.96,
  },
  {
    id: 'ENV_002',
    description: 'Straight 1.4m wide transit pathway with side storage and boundary archway.',
    createdAt: '2026-05-01T08:00:00.000Z',
    lastVisitedAt: '2026-08-18T08:30:00.000Z',
    visitCount: 194,
    boundingRadiusMeters: 15,
    isLearned: true,
    visualSignature: ['portal_doorway', 'side_storage_unit', 'boundary_archway'],
    recognitionConfidence: 0.98,
  },
  {
    id: 'ENV_003',
    description: 'Wide transit foyer with dual entrance doors and partition counter.',
    createdAt: '2026-07-01T08:30:00.000Z',
    lastVisitedAt: '2026-08-18T17:15:00.000Z',
    visitCount: 32,
    boundingRadiusMeters: 30,
    isLearned: true,
    visualSignature: ['glass_double_doors', 'partition_counter', 'water_station'],
    recognitionConfidence: 0.91,
  },
];

const SEED_MEMORIES: Record<string, SpatialMemory> = {
  'ENV_001': {
    environment: SEED_ENVIRONMENTS[0],
    nodes: [
      {
        id: 'node-env1-1',
        environmentId: 'ENV_001',
        label: 'Boundary Entrance Doorway',
        category: 'door',
        position: { x: 0, y: 0, z: 0 },
        confidence: 0.98,
        firstObservedAt: '2026-06-10T09:00:00.000Z',
        lastObservedAt: '2026-08-18T14:20:00.000Z',
        observationCount: 48,
        status: 'stable',
        persistenceScore: 1.0,
        isPermanentLandmark: true,
      },
      {
        id: 'node-env1-2',
        environmentId: 'ENV_001',
        label: 'Side Wall Bench',
        category: 'furniture',
        position: { x: -2.2, y: 3.5, z: 0.5 },
        confidence: 0.95,
        firstObservedAt: '2026-06-10T09:00:00.000Z',
        lastObservedAt: '2026-08-18T14:20:00.000Z',
        observationCount: 45,
        status: 'stable',
        persistenceScore: 0.95,
        isPermanentLandmark: false,
      },
      {
        id: 'node-env1-3',
        environmentId: 'ENV_001',
        label: 'Structural Staircase Landing',
        category: 'staircase',
        position: { x: 1.5, y: 8.8, z: 0 },
        confidence: 0.99,
        firstObservedAt: '2026-06-10T09:00:00.000Z',
        lastObservedAt: '2026-08-18T14:20:00.000Z',
        observationCount: 48,
        status: 'stable',
        persistenceScore: 1.0,
        isPermanentLandmark: true,
      },
    ],
    paths: [
      {
        id: 'path-env1-main',
        environmentId: 'ENV_001',
        name: 'Habitual Central Walking Path',
        habitualScore: 0.95,
        widthMeters: 1.6,
        isDefault: true,
        waypoints: [
          { x: 0, y: 0, z: 0, stepIndex: 0 },
          { x: 0, y: 4.0, z: 0, stepIndex: 1 },
          { x: 0.8, y: 7.5, z: 0, stepIndex: 2 },
          { x: 1.5, y: 8.8, z: 0, stepIndex: 3 },
        ],
      },
    ],
    relationships: [
      {
        sourceNodeId: 'node-env1-1',
        targetNodeId: 'node-env1-3',
        relationshipType: 'leads_to',
        distanceMeters: 8.9,
        bearingDegrees: 10,
      },
    ],
    observationsCount: 48,
    lastUpdated: '2026-08-18T14:20:00.000Z',
  },

  'ENV_002': {
    environment: SEED_ENVIRONMENTS[1],
    nodes: [
      {
        id: 'node-env2-1',
        environmentId: 'ENV_002',
        label: 'Entryway Door Threshold',
        category: 'door',
        position: { x: 0, y: 0, z: 0 },
        confidence: 0.99,
        firstObservedAt: '2026-05-01T08:00:00.000Z',
        lastObservedAt: '2026-08-18T08:30:00.000Z',
        observationCount: 194,
        status: 'stable',
        persistenceScore: 1.0,
        isPermanentLandmark: true,
      },
      {
        id: 'node-env2-2',
        environmentId: 'ENV_002',
        label: 'Perimeter Wall Seating',
        category: 'furniture',
        position: { x: -1.8, y: 2.2, z: 0.5 },
        confidence: 0.94,
        firstObservedAt: '2026-05-01T08:00:00.000Z',
        lastObservedAt: '2026-08-18T08:30:00.000Z',
        observationCount: 190,
        status: 'stable',
        persistenceScore: 0.92,
        isPermanentLandmark: false,
      },
      {
        id: 'node-env2-3',
        environmentId: 'ENV_002',
        label: 'Interior Portal Archway',
        category: 'entrance',
        position: { x: 0, y: 6.5, z: 0 },
        confidence: 0.98,
        firstObservedAt: '2026-05-01T08:00:00.000Z',
        lastObservedAt: '2026-08-18T08:30:00.000Z',
        observationCount: 194,
        status: 'stable',
        persistenceScore: 1.0,
        isPermanentLandmark: true,
      },
    ],
    paths: [
      {
        id: 'path-env2-walkway',
        environmentId: 'ENV_002',
        name: 'Habitual Central Passage',
        habitualScore: 0.98,
        widthMeters: 1.4,
        isDefault: true,
        waypoints: [
          { x: 0, y: 0, z: 0, stepIndex: 0 },
          { x: 0, y: 3.0, z: 0, stepIndex: 1 },
          { x: 0, y: 6.5, z: 0, stepIndex: 2 },
        ],
      },
    ],
    relationships: [],
    observationsCount: 194,
    lastUpdated: '2026-08-18T08:30:00.000Z',
  },

  'ENV_003': {
    environment: SEED_ENVIRONMENTS[2],
    nodes: [
      {
        id: 'node-env3-1',
        environmentId: 'ENV_003',
        label: 'Glass Double Entrance Doors',
        category: 'door',
        position: { x: 0, y: 0, z: 0 },
        confidence: 0.97,
        firstObservedAt: '2026-07-01T08:30:00.000Z',
        lastObservedAt: '2026-08-18T17:15:00.000Z',
        observationCount: 32,
        status: 'stable',
        persistenceScore: 1.0,
        isPermanentLandmark: true,
      },
    ],
    paths: [],
    relationships: [],
    observationsCount: 32,
    lastUpdated: '2026-08-18T17:15:00.000Z',
  },
};

export class DatabaseService {
  public static getEnvironments(): Environment[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ENVIRONMENTS);
      if (data) return JSON.parse(data);
    } catch {}
    this.saveEnvironments(SEED_ENVIRONMENTS);
    return SEED_ENVIRONMENTS;
  }

  public static getEnvironment(id: string): Environment | undefined {
    return this.getEnvironments().find(e => e.id === id);
  }

  public static saveEnvironments(envs: Environment[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.ENVIRONMENTS, JSON.stringify(envs));
    } catch {}
  }

  public static saveEnvironment(env: Environment): void {
    const envs = this.getEnvironments();
    const idx = envs.findIndex(e => e.id === env.id);
    if (idx >= 0) {
      envs[idx] = env;
    } else {
      envs.push(env);
    }
    this.saveEnvironments(envs);
  }

  public static deleteEnvironment(id: string): void {
    const envs = this.getEnvironments().filter(e => e.id !== id);
    this.saveEnvironments(envs);
    const mems = this.getAllMemories();
    delete mems[id];
    this.saveAllMemories(mems);
  }

  public static getLastRecognizedEnvId(): string {
    try {
      const id = localStorage.getItem(STORAGE_KEYS.LAST_RECOGNIZED_ENV_ID);
      if (id && this.getEnvironment(id)) return id;
    } catch {}
    return 'ENV_001';
  }

  public static setLastRecognizedEnvId(id: string): void {
    try {
      localStorage.setItem(STORAGE_KEYS.LAST_RECOGNIZED_ENV_ID, id);
    } catch {}
  }

  public static getAllMemories(): Record<string, SpatialMemory> {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.MEMORIES);
      if (data) return JSON.parse(data);
    } catch {}
    this.saveAllMemories(SEED_MEMORIES);
    return SEED_MEMORIES;
  }

  public static getSpatialMemory(envId: string): SpatialMemory | undefined {
    return this.getAllMemories()[envId];
  }

  public static saveSpatialMemory(mem: SpatialMemory): void {
    const all = this.getAllMemories();
    all[mem.environment.id] = mem;
    this.saveAllMemories(all);
  }

  public static saveAllMemories(mems: Record<string, SpatialMemory>): void {
    try {
      localStorage.setItem(STORAGE_KEYS.MEMORIES, JSON.stringify(mems));
    } catch {}
  }

  public static getChanges(): EnvironmentalChange[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CHANGES);
      if (data) return JSON.parse(data);
    } catch {}
    return [];
  }

  public static logChange(change: EnvironmentalChange): void {
    const list = this.getChanges();
    // Prepend and cap at 200 items
    list.unshift(change);
    try {
      localStorage.setItem(STORAGE_KEYS.CHANGES, JSON.stringify(list.slice(0, 200)));
    } catch {}
  }

  public static clearChangesForEnvironment(envId: string): void {
    const list = this.getChanges().filter(c => c.environmentId !== envId);
    try {
      localStorage.setItem(STORAGE_KEYS.CHANGES, JSON.stringify(list));
    } catch {}
  }

  public static getUserPreferences(): UserPreferences {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PREFERENCES);
      if (data) return { ...DEFAULT_PREFERENCES, ...JSON.parse(data) };
    } catch {}
    return DEFAULT_PREFERENCES;
  }

  public static saveUserPreferences(prefs: UserPreferences): void {
    try {
      localStorage.setItem(STORAGE_KEYS.PREFERENCES, JSON.stringify(prefs));
    } catch {}
  }

  public static exportAllDataJSON(): string {
    const bundle = {
      environments: this.getEnvironments(),
      memories: this.getAllMemories(),
      changes: this.getChanges(),
      preferences: this.getUserPreferences(),
      exportedAt: new Date().toISOString(),
      version: '3.0',
    };
    return JSON.stringify(bundle, null, 2);
  }

  public static importDataJSON(jsonStr: string): boolean {
    try {
      const parsed = JSON.parse(jsonStr);
      if (parsed.environments && Array.isArray(parsed.environments)) {
        this.saveEnvironments(parsed.environments);
      }
      if (parsed.memories) {
        this.saveAllMemories(parsed.memories);
      }
      if (parsed.changes) {
        localStorage.setItem(STORAGE_KEYS.CHANGES, JSON.stringify(parsed.changes));
      }
      if (parsed.preferences) {
        this.saveUserPreferences(parsed.preferences);
      }
      return true;
    } catch {
      return false;
    }
  }

  public static resetDefaults(): void {
    try {
      localStorage.removeItem(STORAGE_KEYS.ENVIRONMENTS);
      localStorage.removeItem(STORAGE_KEYS.MEMORIES);
      localStorage.removeItem(STORAGE_KEYS.CHANGES);
      localStorage.removeItem(STORAGE_KEYS.PREFERENCES);
      localStorage.removeItem(STORAGE_KEYS.LAST_RECOGNIZED_ENV_ID);
    } catch {}
    this.saveEnvironments(SEED_ENVIRONMENTS);
    this.saveAllMemories(SEED_MEMORIES);
    this.saveUserPreferences(DEFAULT_PREFERENCES);
  }
}
