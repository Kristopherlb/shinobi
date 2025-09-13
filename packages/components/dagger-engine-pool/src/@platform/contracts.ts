// Mock implementation of @platform/contracts for testing
export interface ComponentContext {
  serviceName: string;
  environment: string;
  complianceFramework: string;
  owner?: string;
  account: string;
  region: string;
  observability?: {
    collectorEndpoint?: string;
  };
}

export interface ComponentSpec {
  type: string;
  name: string;
  config?: any;
}

export interface IComponentCreator {
  componentType: string;
  createComponent(scope: any, id: string, context: ComponentContext, spec: ComponentSpec): any;
  validateSpec(spec: ComponentSpec): void;
  getCapabilities(): string[];
  getDependencies(): string[];
}
