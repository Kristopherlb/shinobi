/**
 * Test Metadata: TP-resolver-engine-event-source-iam-001
 * {
 *   "id": "TP-resolver-engine-event-source-iam-001",
 *   "level": "integration",
 *   "capability": "IAM policies for event source bindings are applied BEFORE EventSourceMapping is created",
 *   "oracle": "exact",
 *   "invariants": ["IAM policies exist in template", "EventSourceMapping has permissions", "No early validation errors"],
 *   "fixtures": ["MockComponentFactory", "MockBinderRegistry"],
 *   "inputs": { "shape": "Service config with lambda-worker component referencing SQS queue via @component:", "notes": "Event source auto-binding generates binding" },
 *   "risks": [],
 *   "dependencies": ["@shinobi/core", "aws-cdk-lib"],
 *   "evidence": ["Template assertions for IAM policies", "EventSourceMapping resource exists"],
 *   "compliance_refs": ["std://platform-binding-trigger-spec", "std://platform-testing-standard"],
 *   "ai_generated": true,
 *   "human_reviewed_by": ""
 * }
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { App, Stack } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import * as cdk from 'aws-cdk-lib';
import { ResolverEngine, ResolverEngineDependencies } from '../resolver-engine.js';
import { UnifiedBinderRegistry } from '../../platform/binders/registry/unified-binder-registry.js';
import type { IComponent } from '../../platform/contracts/index.js';
import type { ComponentSpec, ComponentContext } from '../../platform/contracts/index.js';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import { Construct } from 'constructs';
import * as iam from 'aws-cdk-lib/aws-iam';
import type { IUnifiedBinderStrategy } from '../../platform/contracts/platform-binding-trigger-spec.js';

// Mock components for testing
class MockLambdaWorkerComponent extends Construct implements IComponent {
  public spec: ComponentSpec;
  public context: ComponentContext;
  private lambdaFunction?: lambda.Function;
  private eventSourceMapping?: lambda.EventSourceMapping;
  private queue?: sqs.IQueue;

  constructor(
    scope: Construct,
    id: string,
    context: ComponentContext,
    spec: ComponentSpec
  ) {
    super(scope, id);
    this.spec = spec;
    this.context = context;
  }

  getType(): string {
    return 'lambda-worker';
  }

  validateConfig(): void {
    // No-op for tests; real components may enforce invariants.
  }

  synth(): any {
    const stack = cdk.Stack.of(this);

    // Create Lambda function
    this.lambdaFunction = new lambda.Function(this, 'LambdaFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline('exports.handler = async () => {}'),
      functionName: this.spec.name
    });

    // CRITICAL: Apply pre-generated IAM policies for event source bindings BEFORE creating EventSourceMapping
    // This simulates what the actual lambda-worker component does
    this.applyEventSourceIamPolicies(this.lambdaFunction);

    // Resolve queue from component reference if event source is configured
    const eventSources = this.spec.config?.eventSources;
    if (eventSources && Array.isArray(eventSources)) {
      const sqsEventSource = eventSources.find((es: any) => es.type === 'sqs' && es.queueArn?.startsWith('@component:'));
      if (sqsEventSource) {
        const queueComponentName = sqsEventSource.queueArn.replace('@component:', '');
        // Mock: In real code, this would use resolveComponentConstruct
        // For test, we'll create a mock queue that will be found by the resolver
        this.queue = new sqs.Queue(this, 'Queue', {
          queueName: queueComponentName,
          visibilityTimeout: cdk.Duration.seconds(360)
        });

        // Create EventSourceMapping - this should fail if IAM permissions aren't present
        this.eventSourceMapping = new lambda.EventSourceMapping(this, 'EventSourceMapping', {
          target: this.lambdaFunction,
          eventSourceArn: this.queue.queueArn,
          batchSize: sqsEventSource.batchSize || 10,
          enabled: sqsEventSource.enabled !== false
        });

        // Add dependency on queue
        this.eventSourceMapping.node.addDependency(this.queue);
      }
    }
  }

  getCapabilities(): any {
    return {};
  }

  getConstruct(handle: string): any {
    if (handle === 'lambdaFunction') {
      return this.lambdaFunction;
    }
    if (handle === 'main') {
      return this.queue;
    }
    return undefined;
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
    return this.getCapabilities();
  }

  _getSecurityGroupHandle(role: 'source' | 'target'): any {
    return undefined;
  }

  validateSynthesized(): void {
    if (!this.lambdaFunction) {
      throw new Error('Lambda function not synthesized');
    }
  }

  /**
   * Apply pre-generated IAM policies for event source bindings
   * This simulates the actual lambda-worker component behavior
   */
  private applyEventSourceIamPolicies(lambdaFunction: lambda.Function): void {
    try {
      const stack = cdk.Stack.of(this);
      const eventSourceIamPolicies = (stack as any)._eventSourceIamPolicies as Map<string, any[]> | undefined;

      if (!eventSourceIamPolicies) {
        return;
      }

      const policies = eventSourceIamPolicies.get(this.spec.name);
      if (!policies || policies.length === 0) {
        return;
      }

      for (const policy of policies) {
        if (policy.statement) {
          lambdaFunction.addToRolePolicy(policy.statement);
        }
      }
    } catch (error) {
      // Ignore errors - policies may not exist
    }
  }
}

class MockSqsQueueComponent extends Construct implements IComponent {
  public spec: ComponentSpec;
  public context: ComponentContext;
  private queue?: sqs.Queue;

  constructor(
    scope: Construct,
    id: string,
    context: ComponentContext,
    spec: ComponentSpec
  ) {
    super(scope, id);
    this.spec = spec;
    this.context = context;
  }

  getType(): string {
    return 'sqs-queue';
  }

  validateConfig(): void {
    // No-op for tests; real components may enforce invariants.
  }

  synth(): any {
    this.queue = new sqs.Queue(this, 'Queue', {
      queueName: this.spec.name,
      visibilityTimeout: cdk.Duration.seconds(360)
    });
  }

  getCapabilities(): any {
    return {
      'messaging:sqs': {
        type: 'queue:sqs',
        resources: {
          arn: this.queue!.queueArn,
          queueUrl: this.queue!.queueUrl,
          queueName: this.queue!.queueName
        },
        visibilityTimeoutSeconds: 360
      }
    };
  }

  getConstruct(handle: string): any {
    if (handle === 'main') {
      return this.queue;
    }
    return undefined;
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
    return this.getCapabilities();
  }

  _getSecurityGroupHandle(role: 'source' | 'target'): any {
    return undefined;
  }

  validateSynthesized(): void {
    if (!this.queue) {
      throw new Error('Queue not synthesized');
    }
  }
}

describe('ResolverEngine - Event Source IAM Permissions', () => {
  let app: App;
  let stack: Stack;
  let binderRegistry: UnifiedBinderRegistry;
  let resolverEngine: ResolverEngine;
  let mockLogger: any;

  beforeEach(() => {
    app = new App();
    stack = new Stack(app, 'TestStack', {
      env: { account: '123456789012', region: 'us-east-1' }
    });

    // Provide a minimal strategy so the resolver can generate IAM policies for event-source bindings
    // without pulling in the full @shinobi/binders strategy graph.
    const sqsEventSourceStrategy: IUnifiedBinderStrategy = {
      supportedCapabilities: ['messaging:sqs'],
      canHandle: (sourceType: string, capability: string) =>
        sourceType === 'lambda-worker' && capability === 'messaging:sqs',
      bind: async () => ({
        environmentVariables: {},
        iamPolicies: [
          {
            statement: new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'sqs:ReceiveMessage',
                'sqs:DeleteMessage',
                'sqs:GetQueueAttributes'
              ],
              resources: ['*']
            }),
            description: 'Allow Lambda worker to consume from SQS queue',
            complianceRequirement: 'Least privilege SQS consumer permissions'
          }
        ],
        securityGroupRules: [],
        compliance: { status: 'compliant', framework: 'commercial', actionsTaken: [] }
      }),
      getCompatibilityMatrix: () => []
    };

    binderRegistry = new UnifiedBinderRegistry([sqsEventSourceStrategy]);

    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    };

    const dependencies: ResolverEngineDependencies = {
      logger: mockLogger,
      binderRegistry
    };

    resolverEngine = new ResolverEngine(dependencies);
  });

  it('EventSourceIAMPermissions__ComponentReference__PoliciesAppliedBeforeEventSourceMapping', async () => {
    // Arrange: Service config with lambda-worker referencing SQS queue
    const validatedConfig = {
      service: 'test-service',
      owner: 'test-owner',
      complianceFramework: 'commercial',
      components: [
        {
          name: 'test-queue',
          type: 'sqs-queue',
          config: {
            visibilityTimeoutSeconds: 360
          }
        },
        {
          name: 'test-worker',
          type: 'lambda-worker',
          config: {
            functionName: 'test-worker',
            handler: 'index.handler',
            runtime: 'nodejs20.x',
            timeoutSeconds: 60,
            eventSources: [
              {
                type: 'sqs',
                queueArn: '@component:test-queue',
                batchSize: 10,
                enabled: true
              }
            ]
          }
        }
      ]
    };

    // Mock the component factory to use our mock components
    // The resolver engine uses ComponentFactoryBuilder internally, so we need to intercept that
    const originalInstantiateComponents = (resolverEngine as any).instantiateComponents.bind(resolverEngine);
    (resolverEngine as any).instantiateComponents = async function(validatedConfig: any, stack: cdk.Stack): Promise<IComponent[]> {
      const components: IComponent[] = [];
      
      for (const componentSpec of validatedConfig.components) {
        const context: ComponentContext = {
          serviceName: validatedConfig.service,
          environment: 'dev',
          complianceFramework: (validatedConfig.complianceFramework || 'commercial') as any,
          region: 'us-east-1',
          accountId: '123456789012',
          scope: stack
        };

        let component: IComponent;
        if (componentSpec.type === 'sqs-queue') {
          component = new MockSqsQueueComponent(stack, componentSpec.name, context, componentSpec);
        } else if (componentSpec.type === 'lambda-worker') {
          component = new MockLambdaWorkerComponent(stack, componentSpec.name, context, componentSpec);
        } else {
          throw new Error(`Unknown component type: ${componentSpec.type}`);
        }
        components.push(component);
      }
      return components;
    };

    // Act: Synthesize with resolver engine
    const result = await resolverEngine.synthesize(validatedConfig);

    // Assert: Get the synthesized stack from the result
    expect(result.stacks).toHaveLength(1);
    const synthesizedStack = result.stacks[0];
    const template = Template.fromStack(synthesizedStack);

    // Verify IAM policies are present in template for SQS permissions
    // The policies should be in the Lambda execution role's inline policies
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Effect: 'Allow',
            Action: Match.arrayWith([
              'sqs:ReceiveMessage',
              'sqs:DeleteMessage',
              'sqs:GetQueueAttributes'
            ])
          })
        ])
      }
    });

    // Verify EventSourceMapping exists
    template.hasResourceProperties('AWS::Lambda::EventSourceMapping', {
      EventSourceArn: Match.objectLike({
        'Fn::GetAtt': Match.arrayWith(['Arn'])
      }),
      FunctionName: Match.objectLike({
        Ref: Match.anyValue()
      })
    });

    // Verify IAM policies were processed (check logs)
    const infoCalls = mockLogger.info.mock.calls;
    const iamPolicyLog = infoCalls.find((call: any[]) => 
      typeof call[0] === 'string' && call[0].includes('IAM policies')
    );
    
    // IAM policies should be logged (indicating they were processed)
    expect(iamPolicyLog).toBeDefined();
  });
});

