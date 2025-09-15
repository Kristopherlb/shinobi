/**
 * Canonical types for Logical ID Management
 * Centralized type definitions to ensure consistency across the module
 */

export type LogicalIdMapping = Record<string, string>; // currentId -> preservedId
export type LogicalIdMapTable = Record<string, LogicalIdMapEntry>; // currentId -> entry

export interface LogicalIdMapEntry {
  originalId: string;
  newId: string;
  resourceType: string;
  componentName: string;
  componentType: string;
  preservationStrategy: 'exact-match' | 'hash-suffix' | 'naming-convention' | 'deterministic';
  metadata?: {
    stackName?: string;
    environment?: string;
    createdAt: string;
    updatedAt: string;
  };
}

export interface LogicalIdMap {
  version: string;
  stackName: string;
  environment?: string;
  createdAt: string;
  updatedAt: string;
  mappings: LogicalIdMapTable;
  driftAvoidanceConfig: DriftAvoidanceConfig;
}

export interface DriftAvoidanceConfig {
  enableDeterministicNaming: boolean;
  preserveResourceOrder: boolean;
  validateBeforeApply: boolean;
  allowedResourceTypes: string[];
  blockedResourceTypes: string[];
}

export interface ValidationResult {
  valid: boolean;
  reason?: string;
}

export interface DriftAnalysisResult {
  resourceType: string;
  currentId: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  driftType: 'logical-id-change' | 'property-change' | 'dependency-change';
  recommendedAction: 'preserve' | 'migrate' | 'replace';
  confidence: number;
}

export interface StrategyCondition {
  type: 'resource-type' | 'resource-name' | 'property-value' | 'dependency-chain';
  operator: 'equals' | 'contains' | 'matches' | 'exists';
  value: string | RegExp;
}

export interface StrategyAction {
  type: 'preserve-logical-id' | 'deterministic-naming' | 'property-override';
  parameters: Record<string, any>;
}

export interface DriftAvoidanceStrategy {
  name: string;
  description: string;
  conditions: StrategyCondition[];
  actions: StrategyAction[];
  priority: number;
}

export interface StrategyApplicationReport {
  strategyName: string;
  matchedResources: string[];
  actionsApplied: string[];
  warnings: string[];
  errors: string[];
}
