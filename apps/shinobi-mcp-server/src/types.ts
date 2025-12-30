export interface ServiceManifestComponent {
  name: string;
  type: string;
  config?: Record<string, any>;
}

export interface ServiceManifestBinding {
  source: string;
  target: string;
  capability: string;
  access?: string;
  description?: string;
}

export interface ServiceMetadata {
  name: string;
  owner: string;
  environment: string;
  complianceFramework: string;
  description?: string;
  costCenter?: string;
}

export interface ServiceManifest {
  service: ServiceMetadata;
  components: ServiceManifestComponent[];
  bindings?: ServiceManifestBinding[];
  policies?: Record<string, any>;
}

/**
 * MCP Tool Definition
 */
export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: object;
}

/**
 * Domain context passed to all tool handlers
 */
export interface DomainContext {
  workspaceRoot: string;
  logger?: any;
}

/**
 * Unified Domain Module Interface
 * Supports both function-based and class-based implementations
 */
export interface DomainModule {
  getToolDefinitions(): ToolDefinition[];
  handleToolCall(name: string, args: any, context: DomainContext): Promise<any>;
}
