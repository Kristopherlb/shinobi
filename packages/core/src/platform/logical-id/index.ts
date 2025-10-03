/**
 * Logical ID Preservation System
 * Enhanced system for preserving CloudFormation logical IDs and avoiding drift
 */

// Core interfaces and types
export type {
  LogicalIdMapEntry,
  LogicalIdMap,
  DriftAvoidanceConfig
} from './logical-id-manager.ts';

export type {
  PlanningContext,
  PlanningResult
} from './planning-integration.ts';

export type {
  DriftAvoidanceStrategy,
  DriftAvoidanceCondition,
  DriftAvoidanceAction,
  DriftAnalysisResult,
  DetectedDrift,
  RecommendedAction
} from './drift-avoidance.ts';

// Main classes
export {
  LogicalIdManager,
  LogicalIdPreservationAspect
} from './logical-id-manager.ts';

export {
  PlanningLogicalIdIntegration
} from './planning-integration.ts';

export {
  DriftAvoidanceEngine
} from './drift-avoidance.ts';

// Import classes for utility functions
import { LogicalIdManager } from './logical-id-manager.ts';
import { PlanningLogicalIdIntegration } from './planning-integration.ts';
import { DriftAvoidanceEngine } from './drift-avoidance.ts';

// Utility functions
export const createLogicalIdManager = (logger: any) => new LogicalIdManager(logger);
export const createPlanningIntegration = (logger: any) => new PlanningLogicalIdIntegration(logger);
export const createDriftAvoidanceEngine = (logger: any) => new DriftAvoidanceEngine(logger);
