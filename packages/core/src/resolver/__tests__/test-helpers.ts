import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { ResolverEngine } from '../resolver-engine.js';
import { UnifiedBinderRegistry } from '../../platform/binders/registry/unified-binder-registry.js';
import type {
  ComponentCapabilities,
  ComponentContext,
  ComponentSpec,
  IComponent
} from '../../platform/contracts/component-interfaces.js';
import type {
  BindingContext,
  EnhancedBindingResult,
  CompatibilityEntry,
  IUnifiedBinderStrategy
} from '../../platform/contracts/platform-binding-trigger-spec.js';

interface MockComponentOptions {
  name: string;
  type: string;
  capabilities?: ComponentCapabilities;
  contextOverrides?: Partial<ComponentContext>;
  onSynth?: () => void;
  constructs?: Record<string, Construct>;
}

export class MockComponent extends Construct implements IComponent {
  readonly spec: ComponentSpec;
  readonly context: ComponentContext;
  private capabilities: ComponentCapabilities;
  private onSynth?: () => void;
  private constructs: Record<string, Construct>;

  constructor(scope: Construct, id: string, options: MockComponentOptions) {
    super(scope, id);
    this.spec = {
      name: options.name,
      type: options.type,
      config: {},
      binds: []
    };
    this.context = {
      serviceName: 'test-service',
      environment: 'test',
      complianceFramework: 'commercial',
      scope,
      ...options.contextOverrides
    };
    this.capabilities = options.capabilities ?? {};
    this.onSynth = options.onSynth;
    this.constructs = options.constructs ?? {};
  }

  synth(): void {
    this.onSynth?.();
  }

  getCapabilities(): ComponentCapabilities {
    return this.capabilities;
  }

  getType(): string {
    return this.spec.type;
  }

  getName(): string {
    return this.spec.name;
  }

  getId(): string {
    return this.node.id;
  }

  getServiceName(): string {
    return this.context.serviceName;
  }

  getCapabilityData(): any {
    return this.capabilities;
  }

  getConstruct(handle: string): Construct | undefined {
    return this.constructs[handle];
  }

  _getSecurityGroupHandle(): any {
    return undefined;
  }
}

export const createTestStack = () => {
  const app = new cdk.App();
  return new cdk.Stack(app, 'TestStack');
};

export const createTestManifest = (components: Array<Partial<ComponentSpec>>): any => ({
  service: 'test-service',
  owner: 'platform-team',
  complianceFramework: 'commercial',
  environment: 'test',
  components
});

export const createMockBindingResult = (
  overrides: Partial<EnhancedBindingResult> = {}
): EnhancedBindingResult => ({
  environmentVariables: {},
  iamPolicies: [],
  securityGroupRules: [],
  compliance: {
    status: 'compliant',
    framework: 'commercial',
    actionsTaken: []
  },
  ...overrides
});

export const createTestLogger = () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
});

export const createTestResolverEngine = (options: { binderRegistry: UnifiedBinderRegistry; logger?: any }) => {
  return new ResolverEngine({
    logger: options.logger ?? createTestLogger(),
    binderRegistry: options.binderRegistry
  });
};

export const createMockBinderStrategy = (options: {
  supportedCapabilities: string[];
  canHandle?: (sourceType: string, capability: string) => boolean;
  bind: (context: BindingContext) => Promise<EnhancedBindingResult>;
  compatibility?: CompatibilityEntry[];
}): IUnifiedBinderStrategy => ({
  supportedCapabilities: options.supportedCapabilities,
  canHandle: options.canHandle ?? (() => true),
  bind: options.bind,
  getCompatibilityMatrix: () => options.compatibility ?? []
});

export const createMockBinderRegistry = (strategies: IUnifiedBinderStrategy[]): UnifiedBinderRegistry =>
  new UnifiedBinderRegistry(strategies);

export const createOutputsMap = (components: IComponent[], constructs?: Record<string, Construct>) => {
  const outputsMap = new Map<string, any>();
  for (const component of components) {
    outputsMap.set(component.spec.name, {
      construct: constructs?.[component.spec.name],
      capabilities: component.getCapabilities(),
      component
    });
  }
  return outputsMap;
};
