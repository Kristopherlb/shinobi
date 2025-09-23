export interface ComponentContext {
  serviceName: string;
  service?: string; // Legacy property for backward compatibility
  environment: string;
  complianceFramework: 'commercial' | 'fedramp-moderate' | 'fedramp-high';
  compliance?: string; // Legacy property for backward compatibility
  owner?: string;
  accountId?: string;
  account?: string; // Legacy property for backward compatibility
  region?: string;
  scope: any; // CDK Construct scope - required
  vpc?: any; // VPC construct for components that need it
  observability?: {
    collectorEndpoint?: string;
    adotLayerArn?: string;
    adotLayerArnMap?: Record<string, string>;
    enableTracing?: boolean;
    enableMetrics?: boolean;
    enableLogs?: boolean;
  };
  tags?: Record<string, string>;
}

export interface ComponentSpec {
  type: string;
  name: string;
  config: any;
  binds?: any[];
  triggers?: any[];
  policy?: any;
}

export interface ComponentConfig {
  [key: string]: any;
}

export interface ComponentBinding {
  from: string;
  to: string;
  capability: string;
}

export interface ComponentMetadata {
  version: string;
  description?: string;
  tags?: string[];
  compliance?: string[];
}

export interface ComponentCapabilities {
  [key: string]: any;
}

export interface BaseComponent {
  synth(): void;
}
