/**
 * High-Fidelity Test Scenarios for Sensor Perception & Temporal Change Detection
 * Evaluates edge cases, temporal drift, obstacle risks, and zero-assumption environment discovery.
 */

import { DetectedEntity, UserPose } from '../types';

export interface TestScenario {
  id: string;
  name: string;
  environmentId: string; // Associated target environment (or empty for new environment)
  description: string;
  expectedAlertSummary: string;
  userPose: UserPose;
  entities: DetectedEntity[];
}

export const TEST_SCENARIOS: TestScenario[] = [
  {
    id: 'scen-barricade-env1',
    name: 'Spatial Space A: Maintenance Barricade in Walkway',
    environmentId: 'ENV_001',
    description: 'A temporary barrier has appeared midway along the central path toward the boundary stairs.',
    expectedAlertSummary: 'Critical alert: Yellow Maintenance Barricade 3.1 metres ahead on habitual path.',
    userPose: { x: 0, y: 0, headingDegrees: 0, stepCount: 24, speedMps: 0.9 },
    entities: [
      {
        id: 'ent-env1-1',
        label: 'Boundary Entrance Doorway',
        category: 'door',
        distanceMeters: 1.0,
        angleDegrees: 180,
        clockDirection: 6,
        estimatedPosition: { x: 0, y: 0, z: 0 },
        confidence: 0.99,
      },
      {
        id: 'ent-env1-2',
        label: 'Yellow Maintenance Barricade',
        category: 'hazard',
        distanceMeters: 3.1,
        angleDegrees: -3,
        clockDirection: 12,
        estimatedPosition: { x: -0.1, y: 3.1, z: 0.9 },
        confidence: 0.95,
        isHazard: true,
      },
      {
        id: 'ent-env1-3',
        label: 'Structural Staircase Landing',
        category: 'staircase',
        distanceMeters: 8.8,
        angleDegrees: 8,
        clockDirection: 12,
        estimatedPosition: { x: 1.5, y: 8.8, z: 0 },
        confidence: 0.94,
      },
    ],
  },
  {
    id: 'scen-chair-env2',
    name: 'Spatial Space B: Armchair Displaced into 1.4m Passage',
    environmentId: 'ENV_002',
    description: 'A seating armchair has been shifted from the perimeter directly into the habitual walking corridor.',
    expectedAlertSummary: 'Critical alert: Armchair blocking habitual walkway 2.1 metres ahead.',
    userPose: { x: 0, y: 0, headingDegrees: 0, stepCount: 12, speedMps: 0.8 },
    entities: [
      {
        id: 'ent-env2-1',
        label: 'Entryway Door Threshold',
        category: 'door',
        distanceMeters: 0.8,
        angleDegrees: 180,
        clockDirection: 6,
        estimatedPosition: { x: 0, y: 0, z: 0 },
        confidence: 0.98,
      },
      {
        id: 'ent-env2-2',
        label: 'Displaced Seating Armchair',
        category: 'furniture',
        distanceMeters: 2.1,
        angleDegrees: 2,
        clockDirection: 12,
        estimatedPosition: { x: 0.1, y: 2.1, z: 0.6 },
        confidence: 0.96,
        isHazard: true,
      },
      {
        id: 'ent-env2-3',
        label: 'Interior Portal Archway',
        category: 'entrance',
        distanceMeters: 6.4,
        angleDegrees: 0,
        clockDirection: 12,
        estimatedPosition: { x: 0, y: 6.5, z: 0 },
        confidence: 0.92,
      },
    ],
  },
  {
    id: 'scen-vehicle-env3',
    name: 'Spatial Space C: Heavy Transport Cart Blocking Walkway',
    environmentId: 'ENV_003',
    description: 'A metal transport cart is parked right across the foyer walkway.',
    expectedAlertSummary: 'Important alert: Metal transport cart 1.7 metres ahead.',
    userPose: { x: 0, y: 0, headingDegrees: 0, stepCount: 5, speedMps: 0.6 },
    entities: [
      {
        id: 'ent-env3-1',
        label: 'Glass Double Entrance Doors',
        category: 'door',
        distanceMeters: 1.5,
        angleDegrees: 180,
        clockDirection: 6,
        estimatedPosition: { x: 0, y: 0, z: 0 },
        confidence: 0.97,
      },
      {
        id: 'ent-env3-2',
        label: 'Metal Transport Cart',
        category: 'obstacle',
        distanceMeters: 1.7,
        angleDegrees: 5,
        clockDirection: 12,
        estimatedPosition: { x: 0.15, y: 1.7, z: 0.8 },
        confidence: 0.92,
        isHazard: true,
      },
    ],
  },
  {
    id: 'scen-clear-env1',
    name: 'Spatial Space A: Clear Familiar Passage',
    environmentId: 'ENV_001',
    description: 'The corridor is in its standard configuration with all habitual paths completely unhindered.',
    expectedAlertSummary: 'Observations consistent with spatial memory. No critical obstacles.',
    userPose: { x: 0, y: 0, headingDegrees: 0, stepCount: 0, speedMps: 0 },
    entities: [
      {
        id: 'ent-clr-1',
        label: 'Boundary Entrance Doorway',
        category: 'door',
        distanceMeters: 0.5,
        angleDegrees: 180,
        clockDirection: 6,
        estimatedPosition: { x: 0, y: 0, z: 0 },
        confidence: 0.99,
      },
      {
        id: 'ent-clr-2',
        label: 'Side Wall Bench',
        category: 'furniture',
        distanceMeters: 4.1,
        angleDegrees: -30,
        clockDirection: 11,
        estimatedPosition: { x: -2.2, y: 3.5, z: 0.5 },
        confidence: 0.96,
      },
      {
        id: 'ent-clr-3',
        label: 'Structural Staircase Landing',
        category: 'staircase',
        distanceMeters: 8.8,
        angleDegrees: 8,
        clockDirection: 12,
        estimatedPosition: { x: 1.5, y: 8.8, z: 0 },
        confidence: 0.98,
      },
    ],
  },
];
