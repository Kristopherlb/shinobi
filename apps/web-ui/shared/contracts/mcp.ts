// MCP (Model Context Protocol) API Contracts
// Generated from mcp-api-schema.yaml

export interface MCPService {
  // Tools
  listTools(): Promise<ToolSummary[]>;
  executeTool(toolName: string, args: Record<string, any>): Promise<any>;
  
  // Platform
  listComponents(): Promise<PlatformComponent[]>;
  getComponentSchema(type: string): Promise<ComponentSchema>;
  listCapabilities(): Promise<CapabilityDefinition[]>;
  listBindings(): Promise<BindingMatrix[]>;
  validateManifest(manifest: ServiceManifest): Promise<ValidationResult>;
  
  // Services
  listServices(): Promise<ServiceInfo[]>;
  getService(name: string): Promise<ServiceInfo>;
  getServiceManifest(name: string): Promise<ServiceManifest>;
  getServiceStatus(name: string): Promise<ServiceStatus>;
  getServiceLogs(name: string, options?: LogOptions): Promise<LogEntry[]>;
  
  // Generative
  generateComponent(request: ComponentGenerationRequest): Promise<ComponentGenerationResult>;
  
  // Admin
  getHealthStatus(): Promise<HealthStatus>;
  reloadRegistry(): Promise<RegistryReloadResult>;
  queryAuditLogs(filters?: AuditLogFilters): Promise<AuditLogEntry[]>;
  getDependencyGraph(component?: string): Promise<DependencyGraph>;
  detectDrift(service?: string): Promise<DriftDetectionResult[]>;
}

// Core Data Types
export interface ToolSummary {
  name: string;
  description: string;
  parameters: Record<string, ToolParameter>;
}

export interface ToolParameter {
  type: string;
  description: string;
  required: boolean;
  enum?: string[];
  items?: object;
}

export interface PlatformComponent {
  name: string;
  type: string;
  version: string;
  description: string;
  author: string;
  keywords?: string[];
  supportedFrameworks?: string[];
  configSchema?: object | string;
  capabilities?: string[];
  bindings?: string[];
  triggers?: string[];
}

export interface ComponentSchema {
  type: string;
  title: string;
  description?: string;
  properties?: Record<string, object>;
  required?: string[];
  defaults?: Record<string, any>;
}

export interface CapabilityDefinition {
  name: string;
  description: string;
  type: 'compute' | 'storage' | 'database' | 'messaging' | 'api' | 'security' | 'monitoring';
  fields: Record<string, CapabilityField>;
  examples?: Record<string, any>[];
}

export interface CapabilityField {
  type: string;
  description: string;
  required: boolean;
}

export interface BindingMatrix {
  sourceType: string;
  targetType: string;
  capability: string;
  supportedAccess: string[];
  description?: string;
  strategy?: string;
  constraints?: Record<string, any>;
}

export interface ServiceManifest {
  name: string;
  version: string;
  description: string;
  owner: string;
  complianceFramework: 'commercial' | 'fedramp-moderate' | 'fedramp-high';
  environment: string;
  components: ComponentInstance[];
  bindings: BindingInstance[];
  triggers: TriggerInstance[];
}

export interface ComponentInstance {
  name: string;
  type: string;
  version: string;
  configuration: Record<string, any>;
  awsService?: string;
  region?: string;
  capabilities: string[];
  triggers: string[];
  metadata: Record<string, any>;
  bindings: BindingInfo[];
  metrics?: ComponentMetrics;
}

export interface BindingInfo {
  target: string;
  capability: string;
  access: string;
  status: 'active' | 'inactive' | 'error';
}

export interface ComponentMetrics {
  cpu?: MetricRange;
  memory?: MetricRange;
  requests?: RequestMetrics;
  connections?: ConnectionMetrics;
}

export interface MetricRange {
  average?: number;
  peak?: number;
  unit?: string;
}

export interface RequestMetrics {
  total?: number;
  errorRate?: number;
  averageLatency?: number;
  unit?: string;
}

export interface ConnectionMetrics {
  active?: number;
  peak?: number;
}

export interface BindingInstance {
  source: string;
  target: string;
  capability: string;
  access: string;
}

export interface TriggerInstance {
  name: string;
  type: string;
  source: string;
  event: string;
  target: string;
  action: string;
  configuration: Record<string, any>;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  suggestions: string[];
}

export interface ValidationError {
  component: string;
  field: string;
  message: string;
  code: string;
}

export interface ValidationWarning {
  component: string;
  field: string;
  message: string;
}

export interface ServiceInfo {
  name: string;
  version: string;
  description: string;
  owner: string;
  complianceFramework: string;
  environment: string;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  lastDeployed: string;
  components: ComponentInstance[];
  bindings: BindingInstance[];
  triggers: TriggerInstance[];
  metadata: Record<string, any>;
}

export interface ServiceStatus {
  service: string;
  environment: string;
  overallStatus: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  lastChecked: string;
  components: ServiceComponentStatus[];
  infrastructure?: {
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

export interface ServiceComponentStatus {
  name: string;
  type: string;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  awsResources: AwsResourceStatus[];
  healthChecks: ServiceHealthCheck[];
  alerts: Alert[];
}

export interface AwsResourceStatus {
  resourceType: string;
  resourceId: string;
  status: string;
  region: string;
  lastUpdated: string;
  configuration?: Record<string, any>;
  tags?: Record<string, string>;
}

export interface ServiceHealthCheck {
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

export interface LogOptions {
  limit?: number;
  startTime?: string;
}

export interface ComponentGenerationRequest {
  componentName: string;
  componentType: string;
  description: string;
  awsService: string;
  capabilities: string[];
  bindings: string[];
  triggers: string[];
  complianceFramework?: 'commercial' | 'fedramp-moderate' | 'fedramp-high';
  templateOptions?: {
    includeTests?: boolean;
    includeDocumentation?: boolean;
    includeBinders?: boolean;
    includeCreator?: boolean;
  };
}

export interface ComponentGenerationResult {
  componentName: string;
  files: GeneratedFile[];
  dependencies: string[];
  instructions: string[];
  summary: string;
}

export interface GeneratedFile {
  path: string;
  content: string;
  type: 'typescript' | 'json' | 'yaml' | 'markdown' | 'dockerfile' | 'terraform' | 'bash' | 'python';
  description: string;
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  environment: string;
  checks: AdminHealthCheck[];
  summary: {
    totalChecks: number;
    passing: number;
    failing: number;
    warnings: number;
  };
}

export interface AdminHealthCheck {
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

export interface AuditLogFilters {
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

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  service: string;
  component?: string;
  action: string;
  actor: AuditActor;
  target: AuditTarget;
  changes?: {
    before?: Record<string, any>;
    after?: Record<string, any>;
  };
  metadata: Record<string, any>;
  severity: 'info' | 'warning' | 'critical';
  complianceRelevant: boolean;
}

export interface AuditActor {
  type: 'user' | 'system' | 'automation';
  id: string;
  name: string;
}

export interface AuditTarget {
  type: string;
  id: string;
  name: string;
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
  expectedValue: string;
  actualValue: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'configuration' | 'security' | 'performance' | 'compliance';
  remediation: string;
}

// Collaboration Types
export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

export interface TeamMember extends UserProfile {
  role?: string;
  team?: string;
  permissions?: string[];
}

export interface MentionItem {
  userId: string;
  userName: string;
  position: number;
  context?: string;
}

export type PresenceStatus = 'active' | 'away' | 'busy' | 'offline';

export interface PresenceData {
  status: PresenceStatus;
  lastSeen: string;
  location?: string | null;
}

export interface UserActivity {
  type: 'editing' | 'viewing' | 'commenting' | 'investigating' | 'coordinating';
  target: string;
  timestamp: string;
}

export interface WorkspaceInfo {
  id: string;
  name: string;
  description?: string;
  owner: string;
  members: TeamMember[];
  visibility: 'private' | 'team' | 'organization';
  createdAt: string;
  updatedAt: string;
}