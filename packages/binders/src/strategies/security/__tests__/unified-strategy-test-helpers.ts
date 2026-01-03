/**
 * Test Helpers for Unified Binder Strategy Tests
 * 
 * Provides deterministic, contract-compliant mocks and helpers for testing
 * unified binder strategies following Platform Testing Standard v1.0.
 * 
 * Key principles:
 * - Deterministic fixtures (fixed ARNs, IDs, no I/O)
 * - Contract-based (implements IComponent interface)
 * - Return-based testing (EnhancedBindingResult structure)
 */

import { Construct } from 'constructs';
import type { IComponent, ComponentSpec, ComponentContext, ComponentCapabilities } from '@shinobi/core/index.js';
import type { BindingContext, EnhancedBindingResult, IUnifiedBinderStrategy, AccessLevel } from '@shinobi/core/platform-binding-trigger-spec.js';

/**
 * Deterministic test constants (fixed values for reproducibility)
 */
export const TEST_CONSTANTS = {
  REGION: 'us-east-1',
  ACCOUNT_ID: '123456789012',
  SERVICE_NAME: 'test-service',
  ENVIRONMENT: 'test',
  COMPLIANCE_FRAMEWORK: 'commercial' as const,
  
  // Fixed ARNs for deterministic testing
  KMS_KEY_ARN: 'arn:aws:kms:us-east-1:123456789012:key/abc123def456',
  KMS_KEY_ID: 'abc123def456',
  SECRET_ARN: 'arn:aws:secretsmanager:us-east-1:123456789012:secret:test-secret-abc123',
  CERTIFICATE_ARN: 'arn:aws:acm:us-east-1:123456789012:certificate/12345678-1234-1234-1234-123456789012',
  USER_POOL_ARN: 'arn:aws:cognito-idp:us-east-1:123456789012:userpool/us-east-1_AbCdEfGh',
  USER_POOL_ID: 'us-east-1_AbCdEfGh'
};

/**
 * Create a mock source component implementing IComponent interface
 * 
 * @param type - Component type (e.g., 'lambda-api', 'ecs-task')
 * @param name - Component name
 * @returns Mock IComponent instance
 */
export function createMockSourceComponent(type: string = 'lambda-api', name: string = 'test-function'): IComponent {
  const spec: ComponentSpec = {
    name,
    type,
    config: {},
    binds: []
  };

  // Create a minimal Construct for the mock
  const construct = new Construct(undefined as any, `${name}-construct`);

  const context: ComponentContext = {
    serviceName: TEST_CONSTANTS.SERVICE_NAME,
    environment: TEST_CONSTANTS.ENVIRONMENT,
    complianceFramework: TEST_CONSTANTS.COMPLIANCE_FRAMEWORK,
    region: TEST_CONSTANTS.REGION,
    accountId: TEST_CONSTANTS.ACCOUNT_ID,
    scope: construct
  };

  return {
    spec,
    context,
    node: construct.node,
    synth(): void {
      // No-op for tests
    },
    getCapabilities(): ComponentCapabilities {
      return {};
    },
    getType(): string {
      return type;
    },
    getName(): string {
      return name;
    },
    getId(): string {
      return `${name}-id`;
    },
    getServiceName(): string {
      return TEST_CONSTANTS.SERVICE_NAME;
    },
    getCapabilityData(): any {
      return {};
    },
    getConstruct(_handle: string): Construct | undefined {
      return undefined;
    },
    _getSecurityGroupHandle(_role: 'source' | 'target'): any {
      return undefined;
    }
  } as IComponent;
}

/**
 * Create a mock target component with specified capabilities
 * 
 * @param name - Component name
 * @param capabilities - Capability data map (capability key -> data object)
 * @returns Mock IComponent instance with capabilities
 */
export function createMockTargetComponent(
  name: string = 'test-target',
  capabilities: Record<string, any> = {}
): IComponent {
  const spec: ComponentSpec = {
    name,
    type: 'test-target-type',
    config: {},
    binds: []
  };

  const construct = new Construct(undefined as any, `${name}-construct`);

  const context: ComponentContext = {
    serviceName: TEST_CONSTANTS.SERVICE_NAME,
    environment: TEST_CONSTANTS.ENVIRONMENT,
    complianceFramework: TEST_CONSTANTS.COMPLIANCE_FRAMEWORK,
    region: TEST_CONSTANTS.REGION,
    accountId: TEST_CONSTANTS.ACCOUNT_ID,
    scope: construct
  };

  return {
    spec,
    context,
    node: construct.node,
    synth(): void {
      // No-op for tests
    },
    getCapabilities(): ComponentCapabilities {
      return capabilities;
    },
    getType(): string {
      return 'test-target-type';
    },
    getName(): string {
      return name;
    },
    getId(): string {
      return `${name}-id`;
    },
    getServiceName(): string {
      return TEST_CONSTANTS.SERVICE_NAME;
    },
    getCapabilityData(): any {
      // Return first capability data for backward compatibility
      const capabilityKeys = Object.keys(capabilities);
      return capabilityKeys.length > 0 ? capabilities[capabilityKeys[0]] : {};
    },
    getConstruct(_handle: string): Construct | undefined {
      return undefined;
    },
    _getSecurityGroupHandle(_role: 'source' | 'target'): any {
      return undefined;
    }
  } as IComponent;
}

/**
 * Create a BindingContext for unified strategy testing
 * 
 * @param options - Context configuration options
 * @returns BindingContext instance
 */
export function createBindingContext(options: {
  source?: IComponent;
  target?: IComponent;
  capability: string;
  access?: 'read' | 'write' | 'readwrite' | 'admin';
  options?: Record<string, any>;
  env?: Record<string, string>;
  complianceFramework?: string;
  environment?: string;
}): BindingContext {
  const source = options.source ?? createMockSourceComponent();
  const target = options.target ?? createMockTargetComponent('target', {});

  return {
    source,
    target,
    directive: {
      capability: options.capability,
      access: options.access ?? 'read',
      options: options.options,
      env: options.env
    },
    environment: options.environment ?? TEST_CONSTANTS.ENVIRONMENT,
    complianceFramework: (options.complianceFramework ?? TEST_CONSTANTS.COMPLIANCE_FRAMEWORK) as any
  };
}

/**
 * Execute a unified binding and return the EnhancedBindingResult
 * 
 * This helper executes strategy.bind(context) and returns the result structure
 * for contract-based assertions (not mutation-based).
 * 
 * @param strategy - The unified binder strategy to test
 * @param context - Binding context
 * @returns Promise resolving to EnhancedBindingResult
 */
export async function executeUnifiedBinding(
  strategy: IUnifiedBinderStrategy,
  context: BindingContext
): Promise<EnhancedBindingResult> {
  return await strategy.bind(context);
}

/**
 * Assert that an EnhancedBindingResult has the required structure
 * 
 * @param result - The binding result to validate
 * @throws Error if result doesn't match expected structure
 */
export function assertEnhancedBindingResult(result: any): asserts result is EnhancedBindingResult {
  if (!result) {
    throw new Error('Binding result is null or undefined');
  }

  if (typeof result.environmentVariables !== 'object') {
    throw new Error('Binding result missing environmentVariables');
  }

  if (!Array.isArray(result.iamPolicies)) {
    throw new Error('Binding result missing iamPolicies array');
  }

  if (!Array.isArray(result.securityGroupRules)) {
    throw new Error('Binding result missing securityGroupRules array');
  }

  if (!result.compliance || typeof result.compliance !== 'object') {
    throw new Error('Binding result missing compliance block');
  }

  if (!['compliant', 'non-compliant', 'partially-compliant'].includes(result.compliance.status)) {
    throw new Error(`Invalid compliance status: ${result.compliance.status}`);
  }

  if (typeof result.compliance.framework !== 'string') {
    throw new Error('Binding result compliance.framework must be a string');
  }

  if (!Array.isArray(result.compliance.actionsTaken)) {
    throw new Error('Binding result compliance.actionsTaken must be an array');
  }
}
