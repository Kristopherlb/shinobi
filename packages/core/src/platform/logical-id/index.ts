/**
 * Logical ID Preservation System
 * Enhanced system for preserving CloudFormation logical IDs and avoiding drift
 */

// Core interfaces and types
export type {
  LogicalIdMapEntry,
  LogicalIdMap,
  DriftAvoidanceConfig
} from './logical-id-manager';

export type {
  PlanningContext,
  PlanningResult
} from './planning-integration';

export type {
  DriftAvoidanceStrategy,
  DriftAvoidanceCondition,
  DriftAvoidanceAction,
  DriftAnalysisResult,
  DetectedDrift,
  RecommendedAction
} from './drift-avoidance';

// Main classes
export {
  LogicalIdManager,
  LogicalIdPreservationAspect
} from './logical-id-manager';

export {
  PlanningLogicalIdIntegration
} from './planning-integration';

export {
  DriftAvoidanceEngine
} from './drift-avoidance';

// Import classes for utility functions
import { LogicalIdManager } from './logical-id-manager';
import { PlanningLogicalIdIntegration } from './planning-integration';
import { DriftAvoidanceEngine } from './drift-avoidance';

// Utility functions
export const createLogicalIdManager = (logger: any) => new LogicalIdManager(logger);
export const createPlanningIntegration = (logger: any) => new PlanningLogicalIdIntegration(logger);
export const createDriftAvoidanceEngine = (logger: any) => new DriftAvoidanceEngine(logger);
