/**
 * Service-Level Endpoints (The "Running Systems")
 * These endpoints provide read-only context for observing existing infrastructure.
 */
export interface ServiceInfo {
    name: string;
    owner: string;
    complianceFramework: string;
    environment: string;
    region: string;
    status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
    deployedAt: string;
    lastUpdated: string;
    version: string;
    tags: Record<string, string>;
    components: ComponentInfo[];
}
export interface ComponentInfo {
    name: string;
    type: string;
    status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
    resourceIds: string[];
    capabilities: Record<string, any>;
    bindings: BindingInfo[];
    metrics: ComponentMetrics;
}
export interface BindingInfo {
    target: string;
    capability: string;
    access: string;
    status: 'active' | 'inactive' | 'error';
}
export interface ComponentMetrics {
    cpu?: {
        average: number;
        peak: number;
        unit: 'percent';
    };
    memory?: {
        average: number;
        peak: number;
        unit: 'percent';
    };
    requests?: {
        total: number;
        errorRate: number;
        averageLatency: number;
        unit: 'ms';
    };
    connections?: {
        active: number;
        peak: number;
    };
}
export interface ServiceManifest {
    service: string;
    owner: string;
    complianceFramework: string;
    environments?: Record<string, any>;
    components: Array<{
        name: string;
        type: string;
        config: Record<string, any>;
        binds?: Array<any>;
    }>;
    metadata?: {
        lastModified: string;
        modifiedBy: string;
        gitHash: string;
        gitBranch: string;
    };
}
export interface ServiceStatus {
    service: string;
    environment: string;
    overallStatus: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
    lastChecked: string;
    components: Array<{
        name: string;
        type: string;
        status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
        awsResources: AwsResourceStatus[];
        healthChecks: HealthCheck[];
        alerts: Alert[];
    }>;
    infrastructure: {
        vpc?: {
            vpcId: string;
            status: string;
            subnets: number;
        };
        loadBalancers?: Array<{
            arn: string;
            dnsName: string;
            status: string;
            targets: number;
        }>;
    };
}
export interface AwsResourceStatus {
    resourceType: string;
    resourceId: string;
    status: string;
    region: string;
    lastUpdated: string;
    configuration: Record<string, any>;
    tags: Record<string, string>;
}
export interface HealthCheck {
    name: string;
    status: 'passing' | 'warning' | 'critical';
    lastChecked: string;
    message: string;
    endpoint?: string;
}
export interface Alert {
    id: string;
    severity: 'info' | 'warning' | 'critical';
    title: string;
    description: string;
    createdAt: string;
    acknowledgedAt?: string;
    resolvedAt?: string;
}
export interface LogEntry {
    timestamp: string;
    level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
    component: string;
    message: string;
    metadata?: Record<string, any>;
    traceId?: string;
    spanId?: string;
    correlationId?: string;
}
/**
 * Service Endpoints Service
 */
export declare class ServiceEndpointsService {
    /**
     * GET /services
     * Lists all services managed by the platform.
     */
    getServices(): Promise<ServiceInfo[]>;
    /**
     * GET /services/{name}
     * Provides a consolidated view of a service.
     */
    getService(serviceName: string): Promise<ServiceInfo>;
    /**
     * GET /services/{name}/manifest
     * Returns the service's current service.yml.
     */
    getServiceManifest(serviceName: string): Promise<ServiceManifest>;
    /**
     * GET /services/{name}/status
     * Returns the actual state of the service from live AWS APIs.
     */
    getServiceStatus(serviceName: string): Promise<ServiceStatus>;
    /**
     * GET /services/{name}/logs
     * Returns a stream of correlated, structured logs for the service.
     */
    getServiceLogs(serviceName: string, limit?: number, startTime?: string): Promise<LogEntry[]>;
}
