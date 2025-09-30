/**
 * Artifact Contracts for CLI Commands
 *
 * Defines the output artifacts and contracts for svc plan, svc up, and svc migrate commands.
 * Ensures structured, machine-readable outputs for CI/CD integration and auditing.
 */
import { ComponentType, ComplianceFramework } from './bindings';
export interface BaseArtifact {
    version: string;
    timestamp: string;
    command: string;
    environment: string;
    serviceName: string;
    complianceFramework: ComplianceFramework;
}
export interface PlanArtifact extends BaseArtifact {
    command: 'plan';
    components: ComponentPlanArtifact[];
    summary: PlanSummary;
    validation: ValidationResult;
    compliance: ComplianceSummary;
}
export interface DeploymentArtifact extends BaseArtifact {
    command: 'up';
    deploymentId: string;
    status: 'success' | 'failure' | 'partial';
    stacks: StackDeploymentResult[];
    resources: ResourceDeploymentResult[];
    outputs: Record<string, any>;
    changes: DeploymentChanges;
    duration: number;
}
export interface MigrationArtifact extends BaseArtifact {
    command: 'migrate';
    migrationId: string;
    sourcePath: string;
    targetPath: string;
    status: 'success' | 'failure' | 'partial';
    components: ComponentMigrationResult[];
    logicalIdMap: LogicalIdMapping;
    report: MigrationReport;
    artifacts: MigrationArtifacts;
}
export interface ComponentPlanArtifact {
    componentId: string;
    componentType: ComponentType;
    config: ComponentConfig;
    complianceControls: string[];
    compliancePlan?: string;
    dependencies: string[];
    resources: PlannedResource[];
    changes: ComponentChanges;
}
export interface ComponentConfig {
    final: Record<string, any>;
    appliedDefaults: Record<string, any>;
    environmentOverrides: Record<string, any>;
    complianceDefaults: Record<string, any>;
}
export interface PlannedResource {
    logicalId: string;
    type: string;
    properties: Record<string, any>;
    tags: Record<string, string>;
    complianceControls: string[];
}
export interface ComponentChanges {
    added: PlannedResource[];
    modified: PlannedResource[];
    removed: PlannedResource[];
    unchanged: PlannedResource[];
}
export interface StackDeploymentResult {
    stackName: string;
    status: 'CREATE_COMPLETE' | 'UPDATE_COMPLETE' | 'DELETE_COMPLETE' | 'CREATE_FAILED' | 'UPDATE_FAILED' | 'DELETE_FAILED';
    stackId: string;
    outputs: Record<string, string>;
    resources: string[];
    events: DeploymentEvent[];
    duration: number;
}
export interface ResourceDeploymentResult {
    logicalId: string;
    physicalId: string;
    type: string;
    status: 'CREATE_COMPLETE' | 'UPDATE_COMPLETE' | 'DELETE_COMPLETE' | 'CREATE_FAILED' | 'UPDATE_FAILED' | 'DELETE_FAILED';
    stackName: string;
    outputs?: Record<string, any>;
}
export interface DeploymentEvent {
    timestamp: string;
    resourceLogicalId: string;
    resourceType: string;
    status: string;
    statusReason?: string;
    resourceStatus?: string;
}
export interface DeploymentChanges {
    added: number;
    modified: number;
    removed: number;
    unchanged: number;
    total: number;
}
export interface ComponentMigrationResult {
    componentId: string;
    componentType: ComponentType;
    status: 'mapped' | 'manual' | 'failed';
    originalResources: OriginalResource[];
    mappedResources: MappedResource[];
    unmappedResources: UnmappedResource[];
    manualPatches: ManualPatch[];
}
export interface OriginalResource {
    logicalId: string;
    type: string;
    properties: Record<string, any>;
    metadata?: Record<string, any>;
}
export interface MappedResource {
    logicalId: string;
    type: string;
    componentType: ComponentType;
    componentId: string;
    properties: Record<string, any>;
    complianceControls: string[];
}
export interface UnmappedResource {
    logicalId: string;
    type: string;
    reason: string;
    suggestedComponentType?: ComponentType;
    properties: Record<string, any>;
}
export interface ManualPatch {
    componentId: string;
    description: string;
    code: string;
    priority: 'high' | 'medium' | 'low';
}
export interface LogicalIdMapping {
    version: string;
    mappings: Record<string, string>;
    reverse: Record<string, string>;
    components: Record<string, string>;
}
export interface MigrationReport {
    summary: MigrationSummary;
    components: ComponentMigrationResult[];
    unmappedResources: UnmappedResource[];
    manualPatches: ManualPatch[];
    driftCheck: DriftCheckResult;
    recommendations: string[];
}
export interface MigrationSummary {
    totalResources: number;
    mappedResources: number;
    unmappedResources: number;
    componentsCreated: number;
    manualPatchesRequired: number;
    driftDetected: boolean;
}
export interface DriftCheckResult {
    hasDrift: boolean;
    driftDetails: DriftDetail[];
    emptyDiff: boolean;
}
export interface DriftDetail {
    resourceLogicalId: string;
    property: string;
    expected: any;
    actual: any;
    reason: string;
}
export interface MigrationArtifacts {
    serviceManifest: string;
    logicalIdMap: string;
    migrationReport: string;
    patchesFile: string;
    srcDirectory: string;
}
export interface PlanSummary {
    totalComponents: number;
    totalResources: number;
    changes: ComponentChanges;
    estimatedCost?: CostEstimate;
    complianceStatus: 'compliant' | 'non-compliant' | 'partial';
    warnings: string[];
    errors: string[];
}
export interface ValidationResult {
    valid: boolean;
    errors: ValidationError[];
    warnings: ValidationWarning[];
    complianceErrors: ComplianceError[];
}
export interface ValidationError {
    componentId?: string;
    field: string;
    message: string;
    severity: 'error' | 'warning';
}
export interface ValidationWarning {
    componentId?: string;
    field: string;
    message: string;
    recommendation?: string;
}
export interface ComplianceError {
    componentId: string;
    controlId: string;
    message: string;
    remediation: string;
    severity: 'error' | 'warning';
}
export interface ComplianceSummary {
    framework: ComplianceFramework;
    totalControls: number;
    compliantComponents: number;
    nonCompliantComponents: number;
    partialCompliantComponents: number;
    controls: ControlSummary[];
}
export interface ControlSummary {
    controlId: string;
    title: string;
    affectedComponents: number;
    complianceStatus: 'compliant' | 'non-compliant' | 'partial';
}
export interface CostEstimate {
    monthly: number;
    currency: string;
    breakdown: CostBreakdown[];
    assumptions: string[];
}
export interface CostBreakdown {
    componentId: string;
    componentType: ComponentType;
    monthly: number;
    resources: ResourceCost[];
}
export interface ResourceCost {
    type: string;
    monthly: number;
    configuration: Record<string, any>;
}
export interface ArtifactSerializer {
    serialize(artifact: BaseArtifact): string;
    deserialize<T extends BaseArtifact>(data: string): T;
    writeToFile(artifact: any, filePath: string): Promise<void>;
    readFromFile<T extends BaseArtifact>(filePath: string): Promise<T>;
}
export interface ArtifactWriter {
    writePlanArtifact(artifact: PlanArtifact, outputDir: string): Promise<string[]>;
    writeDeploymentArtifact(artifact: DeploymentArtifact, outputDir: string): Promise<string[]>;
    writeMigrationArtifact(artifact: MigrationArtifact, outputDir: string): Promise<string[]>;
}
export interface CLIOutputFormat {
    format: 'json' | 'yaml' | 'table' | 'markdown';
    includeDetails: boolean;
    includeCompliance: boolean;
    includeCosts: boolean;
}
export interface CLIOutputOptions {
    format: CLIOutputFormat;
    outputFile?: string;
    quiet: boolean;
    verbose: boolean;
    color: boolean;
}
//# sourceMappingURL=artifacts.d.ts.map