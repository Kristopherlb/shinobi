/**
 * Logical ID Preservation System
 * Enhanced system for preserving CloudFormation logical IDs and avoiding drift
 */

// Core interfaces and types
export type {
  LogicalIdMapEntry,
  LogicalIdMap,
  DriftAvoidanceConfig
} from './logical-id-manager.js';

export type {
  PlanningContext,
  PlanningResult
} from './planning-integration.js';

export type {
  DriftAvoidanceStrategy,
  DriftAvoidanceCondition,
  DriftAvoidanceAction,
  DriftAnalysisResult,
  DetectedDrift,
  RecommendedAction
} from './drift-avoidance.js';

// Main classes
export {
  LogicalIdManager,
  LogicalIdPreservationAspect
} from './logical-id-manager.js';

export {
  PlanningLogicalIdIntegration
} from './planning-integration.js';

export {
  DriftAvoidanceEngine
} from './drift-avoidance.js';

// Import classes for utility functions
import { LogicalIdManager } from './logical-id-manager.js';
import { PlanningLogicalIdIntegration } from './planning-integration.js';
import { DriftAvoidanceEngine } from './drift-avoidance.js';

// Utility functions
export const createLogicalIdManager = (logger: any) => new LogicalIdManager(logger);
export const createPlanningIntegration = (logger: any) => new PlanningLogicalIdIntegration(logger);
export const createDriftAvoidanceEngine = (logger: any) => new DriftAvoidanceEngine(logger);
