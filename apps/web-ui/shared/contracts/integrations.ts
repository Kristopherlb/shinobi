// Integration Service Contracts

export interface IIntegrationService {
  getAvailableIntegrations(): Promise<IntegrationDefinition[]>;
  getInstalledIntegrations(userId: string): Promise<Integration[]>;
  installIntegration(type: string, config: IntegrationConfig): Promise<Integration>;
  updateIntegration(id: string, config: Partial<IntegrationConfig>): Promise<Integration>;
  uninstallIntegration(id: string): Promise<void>;
  testConnection(id: string): Promise<ConnectionTestResult>;
  getIntegrationData(id: string, endpoint: string, params?: Record<string, any>): Promise<any>;
  syncIntegration(id: string): Promise<SyncResult>;
}

export interface IntegrationDefinition {
  type: string;
  name: string;
  description: string;
  category: IntegrationCategory;
  icon: string;
  version: string;
  provider: string;
  capabilities: IntegrationCapability[];
  configSchema: IntegrationConfigSchema;
  authType: AuthenticationType;
  webhookSupport: boolean;
  rateLimits?: RateLimit;
}

export interface Integration {
  id: string;
  type: string;
  name: string;
  userId: string;
  config: IntegrationConfig;
  status: IntegrationStatus;
  lastSync?: Date;
  syncStatus?: SyncStatus;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface IntegrationConfig {
  name: string;
  credentials: Record<string, any>;
  settings: Record<string, any>;
  mappings?: FieldMapping[];
  filters?: IntegrationFilter[];
  syncSchedule?: SyncSchedule;
}

export interface IntegrationConfigSchema {
  credentials: ConfigFieldSchema[];
  settings: ConfigFieldSchema[];
  mappings?: MappingSchema[];
}

export interface ConfigFieldSchema {
  key: string;
  label: string;
  type: 'text' | 'password' | 'url' | 'select' | 'boolean' | 'number';
  required: boolean;
  description?: string;
  placeholder?: string;
  options?: Array<{ value: string; label: string }>;
  validation?: ConfigValidation;
}

export interface ConfigValidation {
  pattern?: string;
  min?: number;
  max?: number;
  custom?: (value: any) => boolean;
}

export interface FieldMapping {
  localField: string;
  remoteField: string;
  transformation?: string;
  direction: 'import' | 'export' | 'bidirectional';
}

export interface MappingSchema {
  localFields: string[];
  remoteFields: string[];
  required: boolean;
  direction: 'import' | 'export' | 'bidirectional';
}

export interface IntegrationFilter {
  field: string;
  operator: string;
  value: any;
}

export interface SyncSchedule {
  enabled: boolean;
  frequency: 'manual' | 'realtime' | 'hourly' | 'daily' | 'weekly';
  time?: string; // HH:mm format for daily/weekly
  day?: number; // Day of week for weekly (0-6)
}

export interface ConnectionTestResult {
  success: boolean;
  message: string;
  details?: Record<string, any>;
  capabilities?: IntegrationCapability[];
}

export interface SyncResult {
  success: boolean;
  recordsProcessed: number;
  recordsImported: number;
  recordsExported: number;
  errors: SyncError[];
  startTime: Date;
  endTime: Date;
  duration: number;
}

export interface SyncError {
  type: 'import' | 'export' | 'validation' | 'connection';
  message: string;
  recordId?: string;
  field?: string;
  details?: Record<string, any>;
}

export interface RateLimit {
  requests: number;
  period: 'second' | 'minute' | 'hour' | 'day';
  burstLimit?: number;
}

export type IntegrationCategory = 
  | 'development'
  | 'project_management'
  | 'communication'
  | 'analytics'
  | 'storage'
  | 'ci_cd'
  | 'monitoring'
  | 'security';

export type IntegrationCapability = 
  | 'tasks'
  | 'users'
  | 'projects'
  | 'comments'
  | 'files'
  | 'analytics'
  | 'notifications'
  | 'webhooks'
  | 'oauth';

export type AuthenticationType = 
  | 'api_key'
  | 'oauth2'
  | 'basic_auth'
  | 'token'
  | 'custom';

export type IntegrationStatus = 
  | 'active'
  | 'inactive'
  | 'error'
  | 'pending'
  | 'expired';

export type SyncStatus = 
  | 'idle'
  | 'syncing'
  | 'success'
  | 'error'
  | 'partial';

export interface IOAuthProvider {
  getAuthUrl(integrationId: string, redirectUri: string): Promise<string>;
  handleCallback(code: string, state: string): Promise<OAuthResult>;
  refreshToken(integrationId: string): Promise<OAuthResult>;
  revokeToken(integrationId: string): Promise<void>;
}

export interface OAuthResult {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  scope?: string[];
  userInfo?: Record<string, any>;
}

export interface IWebhookService {
  registerWebhook(integrationId: string, events: string[], url: string): Promise<Webhook>;
  unregisterWebhook(webhookId: string): Promise<void>;
  getWebhooks(integrationId: string): Promise<Webhook[]>;
  processWebhook(payload: WebhookPayload): Promise<void>;
}

export interface Webhook {
  id: string;
  integrationId: string;
  events: string[];
  url: string;
  secret: string;
  isActive: boolean;
  createdAt: Date;
}

export interface WebhookPayload {
  event: string;
  data: Record<string, any>;
  timestamp: Date;
  signature?: string;
}