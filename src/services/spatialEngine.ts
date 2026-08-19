/**
 * SpatialEye Core Spatial Reasoning & Temporal Change Detection Engine
 * Zero-Assumption Environmental Discovery, Spatial Graph Reasoning,
 * Habitual Path Traversal Verification, and Hazard-Prioritized Change Alerts.
 */

import { 
  DetectedEntity, 
  Environment, 
  EnvironmentalChange, 
  EvasionAdvice,
  EvasionDirection,
  RiskLevel, 
  SpatialMemory, 
  SpatialNode, 
  SpatialPath, 
  UserPose, 
  Vector3D 
} from '../types';

export class SpatialEngine {
  /**
   * Calculate actionable spatial evasion maneuver (e.g. turn left/right, step left/right, stop)
   */
  public static computeEvasionAdvice(
    obstacle: { distanceMeters: number; clockDirection: number; angleDegrees: number; isHazard?: boolean; label?: string },
    allEntities: DetectedEntity[] = []
  ): EvasionAdvice {
    const clock = obstacle.clockDirection || this.angleToClockDirection(obstacle.angleDegrees);
    const dist = obstacle.distanceMeters;
    const name = obstacle.label ? obstacle.label.toLowerCase() : 'obstacle';

    // Obstacle is on user's right side -> Steer LEFT
    if (clock === 1 || clock === 2 || clock === 3 || obstacle.angleDegrees > 8) {
      if (dist < 1.0) {
        return {
          direction: 'left',
          instruction: `Take 1 step to your left to avoid the ${name} on your right`,
          shortBadge: '⬅️ Step Left',
        };
      }
      return {
        direction: 'slight_left',
        instruction: `Veer slightly to your left to go around the ${name}`,
        shortBadge: '↖️ Veer Left',
      };
    }

    // Obstacle is on user's left side -> Steer RIGHT
    if (clock === 9 || clock === 10 || clock === 11 || obstacle.angleDegrees < -8) {
      if (dist < 1.0) {
        return {
          direction: 'right',
          instruction: `Take 1 step to your right to avoid the ${name} on your left`,
          shortBadge: '➡️ Step Right',
        };
      }
      return {
        direction: 'slight_right',
        instruction: `Veer slightly to your right to go around the ${name}`,
        shortBadge: '↗️ Veer Right',
      };
    }

    // Obstacle is DIRECTLY STRAIGHT AHEAD in front of the user
    // Check clearance on left vs right sides using surrounding entities
    const leftObstacles = allEntities.filter(e => e.clockDirection >= 9 && e.clockDirection <= 11 && e.distanceMeters < 2.5);
    const rightObstacles = allEntities.filter(e => e.clockDirection >= 1 && e.clockDirection <= 3 && e.distanceMeters < 2.5);

    const preferLeft = leftObstacles.length <= rightObstacles.length;

    if (dist < 0.8) {
      return preferLeft
        ? {
            direction: 'stop',
            instruction: `Stop. ${name} is directly in front of you. Take 2 steps to your left to clear your path`,
            shortBadge: '🛑 Stop & Step Left',
          }
        : {
            direction: 'stop',
            instruction: `Stop. ${name} is directly in front of you. Take 2 steps to your right to clear your path`,
            shortBadge: '🛑 Stop & Step Right',
          };
    }

    if (preferLeft) {
      return {
        direction: 'slight_left',
        instruction: `Veer slightly to your left to bypass the ${name} ahead`,
        shortBadge: '↖️ Veer Left',
      };
    } else {
      return {
        direction: 'slight_right',
        instruction: `Veer slightly to your right to bypass the ${name} ahead`,
        shortBadge: '↗️ Veer Right',
      };
    }
  }

  /**
   * Convert angle in degrees (-180 to +180, where 0 is ahead) to clock direction (1 to 12)
   */
  public static angleToClockDirection(angleDegrees: number): number {
    let normalized = (angleDegrees + 360) % 360; // 0 to 360
    let clock = Math.round(normalized / 30);
    if (clock === 0) clock = 12;
    if (clock > 12) clock = 12;
    return clock;
  }

  /**
   * Format direction into clear natural conversational spatial voice terms (NO clock jargon)
   */
  public static formatClockDirection(clock: number): string {
    if (clock === 12) return "directly in front of you";
    if (clock === 1 || clock === 2) return "slightly to your right";
    if (clock === 3) return "directly on your right side";
    if (clock === 4 || clock === 5) return "behind you on your right";
    if (clock === 6) return "directly behind you";
    if (clock === 7 || clock === 8) return "behind you on your left";
    if (clock === 9) return "directly on your left side";
    if (clock === 10 || clock === 11) return "slightly to your left";
    return "in front of you";
  }

  /**
   * Format physical distance from the camera into intuitive spoken units (metres and human walking paces)
   */
  public static formatDistance(distanceMeters: number): string {
    if (distanceMeters <= 0.4) {
      return `${distanceMeters.toFixed(1)} metres, within arm's reach`;
    }
    if (distanceMeters <= 0.8) {
      return `${distanceMeters.toFixed(1)} metres, about 1 step`;
    }
    const steps = Math.round(distanceMeters / 0.7);
    return `${distanceMeters.toFixed(1)} metres, about ${steps} steps`;
  }

  /**
   * Get 8-point cardinal compass string from degrees (0 = North)
   */
  public static getCompassDirection(degrees: number): string {
    const norm = (degrees % 360 + 360) % 360;
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const index = Math.round(norm / 45) % 8;
    return directions[index];
  }

  /**
   * Calculate 2D Euclidean distance
   */
  public static distance2D(a: { x: number; y: number }, b: { x: number; y: number }): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Calculate minimum distance from a point to a line segment
   */
  public static pointToSegmentDistance(
    p: { x: number; y: number },
    a: { x: number; y: number },
    b: { x: number; y: number }
  ): number {
    const l2 = Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2);
    if (l2 === 0) return this.distance2D(p, a);

    let t = ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / l2;
    t = Math.max(0, Math.min(1, t));

    const projection = {
      x: a.x + t * (b.x - a.x),
      y: a.y + t * (b.y - a.y),
    };
    return this.distance2D(p, projection);
  }

  /**
   * Check if a position intersects or is directly on any habitual walking path
   */
  public static isPointOnHabitualPath(
    pos: { x: number; y: number },
    paths: SpatialPath[],
    safetyBufferMeters: number = 0.5
  ): { onPath: boolean; closestDistance: number; pathName?: string } {
    let minDistance = Infinity;
    let matchingPath: SpatialPath | undefined;

    for (const path of paths) {
      const waypoints = path.waypoints;
      if (waypoints.length < 2) continue;

      for (let i = 0; i < waypoints.length - 1; i++) {
        const segDist = this.pointToSegmentDistance(pos, waypoints[i], waypoints[i + 1]);
        if (segDist < minDistance) {
          minDistance = segDist;
          matchingPath = path;
        }
      }
    }

    const threshold = matchingPath ? (matchingPath.widthMeters / 2 + safetyBufferMeters) : 1.2;
    const onPath = minDistance <= threshold;

    return {
      onPath,
      closestDistance: minDistance === Infinity ? 0 : minDistance,
      pathName: matchingPath?.name,
    };
  }

  /**
   * Autonomous Environment Recognition Matcher
   * Matches current visual & spatial features against stored anonymous environment memories.
   * Does NOT rely on hardcoded names or GPS.
   */
  public static matchEnvironment(
    detectedEntities: DetectedEntity[],
    storedMemories: SpatialMemory[],
    confidenceThreshold: number = 0.45
  ): { matchedEnvironment: Environment; memory: SpatialMemory; confidence: number } | null {
    if (!storedMemories.length || !detectedEntities.length) return null;

    let bestScore = 0;
    let bestMemory: SpatialMemory | null = null;

    for (const memory of storedMemories) {
      if (!memory.nodes.length) continue;

      // Extract permanent landmarks & stable nodes
      const stableNodes = memory.nodes.filter(n => n.status === 'stable' || n.isPermanentLandmark);
      if (!stableNodes.length) continue;

      let matchPoints = 0;
      let totalWeight = 0;

      for (const entity of detectedEntities) {
        // Skip fleeting transient items like moving people from baseline signature
        const isStructural = ['door', 'entrance', 'staircase', 'landmark', 'furniture'].includes(entity.category);
        const weight = isStructural ? 2.0 : 1.0;
        totalWeight += weight;

        const matchingNode = stableNodes.find(n => {
          const labelMatch = n.label.toLowerCase().includes(entity.label.toLowerCase()) ||
            entity.label.toLowerCase().includes(n.label.toLowerCase());
          const categoryMatch = n.category === entity.category;
          const posDist = this.distance2D(
            { x: n.position.x, y: n.position.y },
            { x: entity.estimatedPosition.x, y: entity.estimatedPosition.y }
          );
          return (labelMatch && posDist < 3.5) || (categoryMatch && isStructural && posDist < 2.0);
        });

        if (matchingNode) {
          matchPoints += weight;
        }
      }

      const score = totalWeight > 0 ? (matchPoints / totalWeight) : 0;
      if (score > bestScore) {
        bestScore = score;
        bestMemory = memory;
      }
    }

    if (bestMemory && bestScore >= confidenceThreshold) {
      const confidence = Math.min(0.98, Math.max(0.48, bestScore));
      return {
        matchedEnvironment: {
          ...bestMemory.environment,
          recognitionConfidence: confidence,
        },
        memory: bestMemory,
        confidence,
      };
    }

    return null;
  }

  /**
   * Create a new Anonymous Environment (e.g. ENV_001, ENV_002)
   */
  public static createAnonymousEnvironment(
    existingCount: number,
    initialEntities?: DetectedEntity[]
  ): { environment: Environment; memory: SpatialMemory } {
    const paddedNum = String(existingCount + 1).padStart(3, '0');
    const envId = `ENV_${paddedNum}`;

    const signatures = initialEntities 
      ? initialEntities.slice(0, 3).map(e => e.label.toLowerCase().replace(/\s+/g, '_'))
      : ['entry_threshold', 'main_corridor'];

    const environment: Environment = {
      id: envId,
      description: `Autonomous spatial representation observed from visual & sensor telemetry.`,
      createdAt: new Date().toISOString(),
      lastVisitedAt: new Date().toISOString(),
      visitCount: 1,
      visualSignature: signatures,
      boundingRadiusMeters: 20,
      isLearned: false,
      recognitionConfidence: 1.0,
    };

    const initialNodes: SpatialNode[] = (initialEntities || []).map((e, idx) => ({
      id: `node-${envId}-${idx + 1}`,
      environmentId: envId,
      label: e.label,
      category: e.category,
      position: { ...e.estimatedPosition },
      confidence: e.confidence,
      firstObservedAt: new Date().toISOString(),
      lastObservedAt: new Date().toISOString(),
      observationCount: 1,
      status: 'stable',
      persistenceScore: 0.8,
      isPermanentLandmark: ['door', 'entrance', 'staircase'].includes(e.category),
    }));

    const memory: SpatialMemory = {
      environment,
      nodes: initialNodes,
      paths: [
        {
          id: `path-${envId}-habitual`,
          environmentId: envId,
          name: `Habitual Walking Path`,
          habitualScore: 0.9,
          widthMeters: 1.6,
          isDefault: true,
          waypoints: [
            { x: 0, y: 0, z: 0, label: 'Observed Origin', stepIndex: 0 },
            { x: 0, y: 3.5, z: 0, label: 'Forward Waypoint 1', stepIndex: 1 },
            { x: 0, y: 7.0, z: 0, label: 'Forward Waypoint 2', stepIndex: 2 },
          ],
        },
      ],
      relationships: [],
      observationsCount: 1,
      lastUpdated: new Date().toISOString(),
    };

    return { environment, memory };
  }

  /**
   * Incrementally update an environment's spatial memory as the user moves
   */
  public static updateEnvironmentMemory(
    memory: SpatialMemory,
    detectedEntities: DetectedEntity[],
    userPose: UserPose
  ): SpatialMemory {
    const updated = { ...memory };
    const nodes = [...updated.nodes];
    const now = new Date().toISOString();

    for (const entity of detectedEntities) {
      const existingIdx = nodes.findIndex(n => {
        const labelMatch = n.label.toLowerCase() === entity.label.toLowerCase();
        const dist = this.distance2D(
          { x: n.position.x, y: n.position.y },
          { x: entity.estimatedPosition.x, y: entity.estimatedPosition.y }
        );
        return labelMatch || (n.category === entity.category && dist < 1.0);
      });

      if (existingIdx >= 0) {
        // Update existing node
        nodes[existingIdx] = {
          ...nodes[existingIdx],
          observationCount: nodes[existingIdx].observationCount + 1,
          lastObservedAt: now,
          confidence: Math.min(0.99, nodes[existingIdx].confidence * 0.9 + entity.confidence * 0.1),
          persistenceScore: Math.min(1.0, nodes[existingIdx].persistenceScore + 0.05),
        };
      } else if (['landmark', 'door', 'entrance', 'staircase', 'furniture'].includes(entity.category)) {
        // Add new stable candidate node
        nodes.push({
          id: `node-${memory.environment.id}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          environmentId: memory.environment.id,
          label: entity.label,
          category: entity.category,
          position: { ...entity.estimatedPosition },
          confidence: entity.confidence,
          firstObservedAt: now,
          lastObservedAt: now,
          observationCount: 1,
          status: 'stable',
          persistenceScore: 0.7,
          isPermanentLandmark: ['door', 'entrance', 'staircase'].includes(entity.category),
        });
      }
    }

    updated.nodes = nodes;
    updated.observationsCount += 1;
    updated.lastUpdated = now;
    return updated;
  }

  /**
   * Central Temporal Change Detection Algorithm
   * Compares current sensory observation against historical spatial memory
   */
  public static detectTemporalChanges(
    detectedEntities: DetectedEntity[],
    spatialMemory: SpatialMemory,
    userPose: UserPose
  ): EnvironmentalChange[] {
    const changes: EnvironmentalChange[] = [];
    const memoryNodes = spatialMemory.nodes;
    const habitualPaths = spatialMemory.paths;
    const envId = spatialMemory.environment.id;
    const envDisplayName = spatialMemory.environment.customLabel
      ? `${envId} (${spatialMemory.environment.customLabel})`
      : envId;

    // 1. Detect New Obstacles, Barricades, Vehicles, or Displacements
    for (const entity of detectedEntities) {
      const clockDirection = entity.clockDirection || this.angleToClockDirection(entity.angleDegrees);

      // Check if this entity was previously observed in memory
      const matchedNode = memoryNodes.find(n => {
        const labelSimilar = n.label.toLowerCase().includes(entity.label.toLowerCase()) ||
          entity.label.toLowerCase().includes(n.label.toLowerCase());
        const distanceDelta = this.distance2D(
          { x: n.position.x, y: n.position.y },
          { x: entity.estimatedPosition.x, y: entity.estimatedPosition.y }
        );
        return labelSimilar && distanceDelta < 2.5;
      });

      const pathCheck = this.isPointOnHabitualPath(
        { x: entity.estimatedPosition.x, y: entity.estimatedPosition.y },
        habitualPaths
      );

      // A: Completely new entity not in memory
      if (!matchedNode) {
        if (['obstacle', 'furniture', 'hazard', 'vehicle', 'door', 'staircase'].includes(entity.category)) {
          const risk = this.calculateRisk({
            distanceMeters: entity.distanceMeters,
            angleDegrees: entity.angleDegrees,
            onHabitualPath: pathCheck.onPath,
            category: entity.category,
            label: entity.label,
          });

          // Compute actionable evasion guidance (e.g. step left / veer right)
          const evasion = this.computeEvasionAdvice({
            distanceMeters: entity.distanceMeters,
            clockDirection,
            angleDegrees: entity.angleDegrees,
            isHazard: risk.level === 'critical',
            label: entity.label,
          }, detectedEntities);

          // Generate safety-first verbal alert with actionable evasion instruction
          const roundedDist = entity.distanceMeters < 1.0 
            ? 'under one metre' 
            : `approximately ${entity.distanceMeters.toFixed(1)} metres`;
          
          const clockPhrase = this.formatClockDirection(clockDirection);
          const pathPhrase = pathCheck.onPath ? 'on your habitual path' : 'off to the side';
          
          let alertText = '';
          if (risk.level === 'critical') {
            alertText = `Warning. ${entity.label} directly ahead, ${roundedDist}, blocking path. ${evasion.instruction}.`;
          } else if (risk.level === 'important') {
            alertText = `Caution. ${entity.label}, ${roundedDist} ${clockPhrase}. ${evasion.instruction}.`;
          } else if (risk.level === 'informational') {
            alertText = `Notice. ${entity.label} located ${roundedDist} ${clockPhrase}.`;
          }

          let changeType = pathCheck.onPath ? 'blocked_path' : 'new_obstacle';
          if (entity.category === 'hazard') changeType = 'temporary_hazard';
          if (entity.category === 'vehicle') changeType = 'blocked_path';

          changes.push({
            id: `change-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            environmentId: envId,
            environmentName: envDisplayName,
            timestamp: new Date().toISOString(),
            changeType: changeType as any,
            objectLabel: entity.label,
            distanceMeters: entity.distanceMeters,
            clockDirection,
            angleDegrees: entity.angleDegrees,
            affectsHabitualPath: pathCheck.onPath,
            riskLevel: risk.level,
            riskScore: risk.score,
            persistenceClassification: 'temporary',
            verbalAlertText: alertText,
            evasionGuidance: evasion.instruction,
            evasionDirection: evasion.direction,
            earconTone: risk.level === 'critical' ? 'critical' : risk.level === 'important' ? 'warning' : 'info',
            hapticPattern: risk.level === 'critical' ? [250, 80, 250, 80, 350] : [120, 70, 140],
            confidence: entity.confidence,
            details: `Detected ${entity.label} at (${entity.estimatedPosition.x.toFixed(1)}m, ${entity.estimatedPosition.y.toFixed(1)}m). Guidance: ${evasion.instruction}.`,
          });
        }
      } else {
        // B: Node exists in memory, check if displaced significantly (> 0.6m)
        const displacement = this.distance2D(
          { x: matchedNode.position.x, y: matchedNode.position.y },
          { x: entity.estimatedPosition.x, y: entity.estimatedPosition.y }
        );

        if (displacement >= 0.7 && pathCheck.onPath) {
          const risk = this.calculateRisk({
            distanceMeters: entity.distanceMeters,
            angleDegrees: entity.angleDegrees,
            onHabitualPath: pathCheck.onPath,
            category: entity.category,
            label: entity.label,
          });

          const evasion = this.computeEvasionAdvice({
            distanceMeters: entity.distanceMeters,
            clockDirection,
            angleDegrees: entity.angleDegrees,
            isHazard: true,
            label: entity.label,
          }, detectedEntities);

          const roundedDist = `approximately ${entity.distanceMeters.toFixed(1)} metres`;
          const clockPhrase = this.formatClockDirection(clockDirection);

          changes.push({
            id: `change-disp-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            environmentId: envId,
            environmentName: envDisplayName,
            timestamp: new Date().toISOString(),
            changeType: 'displaced_object',
            objectLabel: entity.label,
            distanceMeters: entity.distanceMeters,
            clockDirection,
            angleDegrees: entity.angleDegrees,
            affectsHabitualPath: true,
            riskLevel: risk.level,
            riskScore: risk.score,
            persistenceClassification: 'potential_persistent',
            verbalAlertText: `Caution. Displaced ${entity.label} in path, ${roundedDist} ${clockPhrase}. ${evasion.instruction}.`,
            evasionGuidance: evasion.instruction,
            evasionDirection: evasion.direction,
            earconTone: 'warning',
            hapticPattern: [120, 80, 120],
            confidence: entity.confidence * 0.9,
            details: `Previously at (${matchedNode.position.x.toFixed(1)}, ${matchedNode.position.y.toFixed(1)}), now at (${entity.estimatedPosition.x.toFixed(1)}, ${entity.estimatedPosition.y.toFixed(1)}). Guidance: ${evasion.instruction}.`,
          });
        }
      }
    }

    // 2. Sort changes by Risk Score descending (highest hazard first)
    changes.sort((a, b) => b.riskScore - a.riskScore);

    return changes;
  }

  /**
   * Risk and Importance Scoring Engine
   */
  public static calculateRisk(params: {
    distanceMeters: number;
    angleDegrees: number;
    onHabitualPath: boolean;
    category: string;
    label: string;
  }): { score: number; level: RiskLevel } {
    let score = 0;

    // 1. Proximity score (0 to 45 pts)
    if (params.distanceMeters <= 1.0) {
      score += 45;
    } else if (params.distanceMeters <= 2.0) {
      score += 35;
    } else if (params.distanceMeters <= 3.5) {
      score += 20;
    } else {
      score += 8;
    }

    // 2. Habitual Path alignment (0 to 35 pts)
    if (params.onHabitualPath) {
      score += 35;
    } else {
      score += 5;
    }

    // 3. Heading Angle alignment (0 to 15 pts)
    const absAngle = Math.abs(params.angleDegrees);
    if (absAngle <= 20) {
      score += 15; // Directly in line of movement
    } else if (absAngle <= 45) {
      score += 10;
    } else {
      score += 3;
    }

    // 4. Object Category hazard weight multiplier
    let multiplier = 1.0;
    const cat = params.category.toLowerCase();
    const lbl = params.label.toLowerCase();

    if (cat === 'hazard' || lbl.includes('barricade') || lbl.includes('hole') || lbl.includes('stairs') || lbl.includes('vehicle')) {
      multiplier = 1.35;
    } else if (cat === 'staircase' || lbl.includes('step') || lbl.includes('curb')) {
      multiplier = 1.25;
    } else if (cat === 'door' || cat === 'entrance') {
      multiplier = 1.1;
    }

    score = Math.min(100, Math.round(score * multiplier));

    let level: RiskLevel = 'none';
    if (score >= 68) {
      level = 'critical';
    } else if (score >= 42) {
      level = 'important';
    } else if (score >= 18) {
      level = 'informational';
    } else {
      level = 'none';
    }

    return { score, level };
  }

  /**
   * Safe surroundings description complying with safety mandate:
   * "SpatialEye is an assistive system. It must NEVER claim 'The path is definitely safe.'"
   */
  public static generateSurroundingsSummary(
    environmentDisplayName: string,
    detected: DetectedEntity[],
    changes: EnvironmentalChange[]
  ): string {
    if (!detected.length) {
      return `Observing environment ${environmentDisplayName}. No recognizable obstacles in camera view. Maintain standard cane navigation.`;
    }

    const criticalOrImportant = changes.filter(c => c.riskLevel === 'critical' || c.riskLevel === 'important');
    if (criticalOrImportant.length > 0) {
      const topChange = criticalOrImportant[0];
      return `In ${environmentDisplayName}. Attention: ${topChange.verbalAlertText}`;
    }

    const landmarkCount = detected.filter(d => d.category === 'landmark' || d.category === 'door' || d.category === 'staircase').length;
    return `In ${environmentDisplayName}. ${landmarkCount > 0 ? `Identified ${landmarkCount} known structural landmarks.` : 'Current observations appear consistent with your spatial memory.'} No critical obstacles on your habitual path.`;
  }
}
