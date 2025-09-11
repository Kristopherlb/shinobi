/**
 * Platform Administration Endpoints (The "Super Admin" Toolkit)
 * These endpoints are protected by a higher privilege scope (admin:platform)
 * and are intended for use by the DevOps/Platform Engineering team.
 */
export interface HealthStatus {
    status: 'healthy' | 'degraded' | 'unhealthy';
    timestamp: string;
    version: string;
    environment: string;
    checks: HealthCheck[];
    summary: {
        totalChecks: number;
        passing: number;
        failing: number;
        warnings: number;
    };
}
export interface HealthCheck {
    name: string;
    status: 'passing' | 'warning' | 'critical';
    message: string;
    duration: number;
    lastChecked: string;
    metadata?: Record<string, any>;
}
export interface RegistryReloadResult {
    success: boolean;
    timestamp: string;
    componentsDiscovered: number;
    componentsLoaded: number;
    errors: string[];
    newComponents: string[];
    updatedComponents: string[];
    removedComponents: string[];
}
export interface AuditLogEntry {
    id: string;
    timestamp: string;
    service: string;
    component?: string;
    action: string;
    actor: {
        type: 'user' | 'system' | 'automation';
        id: string;
        name: string;
    };
    target: {
        type: string;
        id: string;
        name: string;
    };
    changes?: {
        before: Record<string, any>;
        after: Record<string, any>;
    };
    metadata: Record<string, any>;
    severity: 'info' | 'warning' | 'critical';
    complianceRelevant: boolean;
}
export interface AuditQueryParams {
    service?: string;
    component?: string;
    action?: string;
    actor?: string;
    severity?: 'info' | 'warning' | 'critical';
    startTime?: string;
    endTime?: string;
    limit?: number;
    offset?: number;
}
export interface DependencyGraph {
    services: ServiceNode[];
    edges: DependencyEdge[];
    metadata: {
        totalServices: number;
        totalBindings: number;
        generatedAt: string;
        criticalPaths: CriticalPath[];
    };
}
export interface ServiceNode {
    name: string;
    owner: string;
    complianceFramework: string;
    environment: string;
    components: ComponentNode[];
    status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
    criticality: 'low' | 'medium' | 'high' | 'critical';
}
export interface ComponentNode {
    name: string;
    type: string;
    capabilities: string[];
    bindings: BindingNode[];
}
export interface BindingNode {
    target: string;
    capability: string;
    access: string;
    type: 'inbound' | 'outbound';
}
export interface DependencyEdge {
    source: string;
    target: string;
    component: string;
    capability: string;
    access: string;
    strength: 'weak' | 'strong' | 'critical';
}
export interface CriticalPath {
    path: string[];
    description: string;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    impactRadius: number;
}
export interface DriftDetectionResult {
    service: string;
    environment: string;
    overallStatus: 'no-drift' | 'drift-detected' | 'scan-failed';
    scannedAt: string;
    components: ComponentDriftStatus[];
    summary: {
        totalComponents: number;
        componentsWithDrift: number;
        totalDrifts: number;
        criticalDrifts: number;
    };
}
export interface ComponentDriftStatus {
    name: string;
    type: string;
    status: 'no-drift' | 'drift-detected' | 'scan-failed';
    drifts: DriftItem[];
}
export interface DriftItem {
    resourceType: string;
    resourceId: string;
    property: string;
    expectedValue: any;
    actualValue: any;
    severity: 'low' | 'medium' | 'high' | 'critical';
    category: 'configuration' | 'security' | 'performance' | 'compliance';
    remediation: string;
}
/**
 * Admin Endpoints Service
 */
export declare class AdminEndpointsService {
    /**
     * GET /admin/health
     * Performs a deep health check of the MCP server and its data sources.
     */
    getHealth(): Promise<HealthStatus>;
    /**
     * POST /admin/registry/reload
     * Forces the server to clear its cache and reload the component registry.
     */
    reloadRegistry(): Promise<RegistryReloadResult>;
    /**
     * GET /admin/audit
     * Queries the platform's central audit log.
     */
    getAuditLogs(params?: AuditQueryParams): Promise<AuditLogEntry[]>;
    /**
     * GET /admin/dependencies
     * Returns a complete dependency graph of the entire ecosystem.
     */
    getDependencies(componentFilter?: string): Promise<DependencyGraph>;
    /**
     * GET /admin/drift
     * Triggers drift detection scan across all managed services.
     */
    detectDrift(serviceName?: string): Promise<DriftDetectionResult[]>;
    private checkGitConnectivity;
    private checkAwsConnectivity;
    private checkComponentRegistry;
    private checkDatabaseConnectivity;
    private checkTemplateRepository;
    private checkSystemResources;
    private scanServiceForDrift;
    private clearRegistryCache;
    private scanComponentsDirectory;
    private loadComponentInfo;
    private isNewComponent;
    private hasComponentChanged;
    private registerComponent;
    private getPreviouslyRegisteredComponents;
    private updateRegistryMetadata;
}
