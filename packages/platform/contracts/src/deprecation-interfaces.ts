/**
 * Platform Automated Deprecation & Dependency Analysis Standard v1.0
 * Interfaces and types for dependency analysis and deprecation management
 */

/**
 * Dependency node in the ecosystem graph
 */
export interface DependencyNode {
  /** Unique identifier for the node */
  id: string;
  /** Type of the dependency (service, component, api, library) */
  type: 'service' | 'component' | 'api' | 'library' | 'database' | 'queue' | 'storage';
  /** Name of the dependency */
  name: string;
  /** Version of the dependency */
  version: string;
  /** Repository or source location */
  repository?: string;
  /** Owner team or individual */
  owner?: string;
  /** Current lifecycle status */
  status: 'active' | 'deprecated' | 'end-of-life' | 'planned';
  /** Deprecation information if applicable */
  deprecation?: DeprecationInfo;
  /** Metadata about the dependency */
  metadata: Record<string, any>;
}

/**
 * Dependency edge representing a relationship between nodes
 */
export interface DependencyEdge {
  /** Source node ID */
  from: string;
  /** Target node ID */
  to: string;
  /** Type of dependency relationship */
  type: 'uses' | 'extends' | 'implements' | 'calls' | 'imports' | 'configures';
  /** Strength of the dependency */
  strength: 'critical' | 'important' | 'optional';
  /** Version constraints or requirements */
  constraints?: string;
  /** Additional metadata about the relationship */
  metadata?: Record<string, any>;
}

/**
 * Complete dependency graph structure
 */
export interface DependencyGraph {
  /** All nodes in the graph */
  nodes: DependencyNode[];
  /** All edges in the graph */
  edges: DependencyEdge[];
  /** Timestamp when the graph was generated */
  generatedAt: string;
  /** Version of the graph format */
  version: string;
  /** Additional metadata about the graph */
  metadata?: Record<string, any>;
}

/**
 * Deprecation lifecycle information
 */
export interface DeprecationInfo {
  /** When the deprecation was announced */
  announcedAt: string;
  /** Planned end-of-life date */
  endOfLifeDate?: string;
  /** Deprecation reason */
  reason: string;
  /** Migration guide or replacement information */
  migrationGuide?: string;
  /** Replacement service or component */
  replacement?: string;
  /** Current phase in deprecation lifecycle */
  phase: 'announced' | 'warning' | 'error' | 'blocked';
  /** Contact for deprecation questions */
  contact?: string;
}

/**
 * Impact analysis result for a potential change
 */
export interface ImpactAnalysis {
  /** The target being analyzed for change/deprecation */
  target: DependencyNode;
  /** Direct dependencies that would be affected */
  directDependents: DependencyNode[];
  /** All transitive dependencies that would be affected */
  transitiveDependents: DependencyNode[];
  /** Risk assessment of the change */
  riskAssessment: RiskAssessment;
  /** Recommended migration path */
  migrationPath?: MigrationPath[];
  /** Estimated effort for migration */
  estimatedEffort: 'low' | 'medium' | 'high' | 'critical';
  /** Timestamp of analysis */
  analyzedAt: string;
}

/**
 * Risk assessment for dependency changes
 */
export interface RiskAssessment {
  /** Overall risk level */
  overallRisk: 'low' | 'medium' | 'high' | 'critical';
  /** Number of services affected */
  servicesAffected: number;
  /** Number of components affected */
  componentsAffected: number;
  /** Business criticality of affected systems */
  businessCriticality: 'low' | 'medium' | 'high' | 'critical';
  /** Factors contributing to risk */
  riskFactors: string[];
  /** Mitigation strategies */
  mitigationStrategies: string[];
}

/**
 * Migration path step
 */
export interface MigrationPath {
  /** Step number in the migration */
  step: number;
  /** Description of the step */
  description: string;
  /** Type of action required */
  action: 'update' | 'replace' | 'remove' | 'configure';
  /** Target for the action */
  target: string;
  /** Estimated effort for this step */
  effort: 'low' | 'medium' | 'high';
  /** Dependencies for this step */
  dependencies?: string[];
  /** Validation criteria for completion */
  validation?: string[];
}

/**
 * Dependency analysis query parameters
 */
export interface DependencyQuery {
  /** Target node to analyze */
  target: string;
  /** Type of analysis to perform */
  analysisType: 'impact' | 'dependents' | 'dependencies' | 'path';
  /** Depth of analysis (how many levels to traverse) */
  depth?: number;
  /** Filter criteria */
  filters?: {
    /** Node types to include */
    nodeTypes?: string[];
    /** Dependency types to include */
    edgeTypes?: string[];
    /** Status filters */
    statuses?: string[];
  };
  /** Include metadata in results */
  includeMetadata?: boolean;
}

/**
 * MCP Server dependency endpoint response
 */
export interface MCPDependencyResponse {
  /** Success status */
  success: boolean;
  /** Response data */
  data?: DependencyGraph | ImpactAnalysis | DependencyNode[];
  /** Error message if failed */
  error?: string;
  /** Request metadata */
  metadata: {
    /** Query that was executed */
    query: DependencyQuery;
    /** Execution time in milliseconds */
    executionTime: number;
    /** Number of nodes processed */
    nodesProcessed: number;
    /** Cache status */
    cached: boolean;
  };
}

/**
 * Deprecation policy configuration
 */
export interface DeprecationPolicy {
  /** Policy name */
  name: string;
  /** Policy version */
  version: string;
  /** Minimum deprecation notice period */
  minimumNoticeHours: number;
  /** Required approval levels for different risk categories */
  approvalRequirements: {
    low: string[];
    medium: string[];
    high: string[];
    critical: string[];
  };
  /** Automated actions that can be taken */
  automatedActions: {
    /** Send notifications */
    notifications: boolean;
    /** Create tickets */
    ticketing: boolean;
    /** Block deployments */
    deploymentBlocking: boolean;
    /** Generate reports */
    reporting: boolean;
  };
  /** Compliance requirements */
  compliance?: {
    /** Required documentation */
    documentation: string[];
    /** Audit trail requirements */
    auditTrail: boolean;
    /** Stakeholder sign-off required */
    signOffRequired: boolean;
  };
}

/**
 * Deprecation lifecycle state machine
 */
export interface DeprecationLifecycle {
  /** Current state */
  currentState: 'active' | 'deprecation-announced' | 'deprecation-warning' | 'deprecation-error' | 'end-of-life';
  /** Allowed transitions from current state */
  allowedTransitions: string[];
  /** State transition history */
  history: DeprecationStateTransition[];
  /** Next scheduled transition */
  nextTransition?: {
    /** Target state */
    targetState: string;
    /** Scheduled date */
    scheduledDate: string;
    /** Transition triggers */
    triggers: string[];
  };
}

/**
 * Deprecation state transition record
 */
export interface DeprecationStateTransition {
  /** Previous state */
  from: string;
  /** New state */
  to: string;
  /** Timestamp of transition */
  timestamp: string;
  /** User or system that triggered the transition */
  triggeredBy: string;
  /** Reason for transition */
  reason: string;
  /** Additional metadata */
  metadata?: Record<string, any>;
}

/**
 * Dependency health metrics
 */
export interface DependencyHealthMetrics {
  /** Node ID being measured */
  nodeId: string;
  /** Health score (0-100) */
  healthScore: number;
  /** Individual metric scores */
  metrics: {
    /** Security vulnerability score */
    security: number;
    /** Performance score */
    performance: number;
    /** Reliability score */
    reliability: number;
    /** Maintainability score */
    maintainability: number;
    /** Support/community score */
    support: number;
  };
  /** Trending direction */
  trend: 'improving' | 'stable' | 'declining' | 'critical';
  /** Last updated timestamp */
  lastUpdated: string;
  /** Data sources used for metrics */
  sources: string[];
}