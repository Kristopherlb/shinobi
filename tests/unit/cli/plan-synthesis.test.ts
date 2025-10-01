jest.mock('aws-cdk-lib', () => {
  class MockTagManager {
    private readonly tags: Array<{ Key: string; Value: string }> = [];
    constructor(private readonly onChange?: () => void) {}

    add(key: string, value: string) {
      this.tags.push({ Key: key, Value: value });
      this.onChange?.();
    }

    renderTags() {
      return this.tags.map(tag => ({ ...tag }));
    }
  }

  class MockApp {
    private readonly stacks: MockStack[] = [];
    private readonly context: Record<string, any>;

    public readonly node = {
      setContext: (key: string, value: any) => {
        this.context[key] = value;
      },
      tryGetContext: (key: string) => this.context[key]
    };

    constructor(options: { context?: Record<string, any> } = {}) {
      this.context = { ...(options.context || {}) };
    }

    _registerStack(stack: MockStack) {
      this.stacks.push(stack);
    }

    synth() {
      return {
        stacks: this.stacks.map(stack => stack._synth())
      };
    }
  }

  class MockStack {
    public readonly tags: MockTagManager;
    private readonly resources: Record<string, any> = {};
    private readonly context = new Map<string, any>();

    public readonly node = {
      setContext: (key: string, value: any) => {
        this.context.set(key, value);
      },
      tryGetContext: (key: string) => this.context.get(key),
      defaultChild: undefined as any
    };

    constructor(private readonly app: MockApp, private readonly id: string, public readonly props?: any) {
      this.tags = new MockTagManager(() => this.updateAllResourceTags());
      (this.app as any)._registerStack(this);
    }

    _registerResource(id: string, type: string, properties: Record<string, any>, construct: any) {
      const entry = {
        Type: type,
        Properties: { ...properties },
        tagManager: new MockTagManager(() => this.updateResourceTags(entry))
      };

      (construct as any)._resourceEntry = entry;
      (construct as any).node = { defaultChild: construct };

      this.resources[id] = entry;
      this.updateResourceTags(entry);
      return entry;
    }

    private updateAllResourceTags() {
      Object.values(this.resources).forEach(entry => this.updateResourceTags(entry));
    }

    private updateResourceTags(entry: any) {
      const merged: Record<string, string> = {};
      for (const tag of this.tags.renderTags()) {
        merged[tag.Key] = tag.Value;
      }
      for (const tag of entry.tagManager.renderTags()) {
        merged[tag.Key] = tag.Value;
      }
      entry.Properties = { ...entry.Properties };
      entry.Properties.Tags = Object.entries(merged).map(([Key, Value]) => ({ Key, Value }));
    }

    _synth() {
      return {
        stackName: this.id,
        template: {
          Resources: Object.fromEntries(
            Object.entries(this.resources).map(([key, entry]) => [
              key,
              {
                Type: entry.Type,
                Properties: entry.Properties
              }
            ])
          )
        }
      };
    }
  }

  class MockTags {
    static of(scope: any) {
      if (scope instanceof MockStack) {
        return {
          add: (key: string, value: string) => scope.tags.add(key, value)
        };
      }

      if (scope && scope._resourceEntry) {
        return {
          add: (key: string, value: string) => scope._resourceEntry.tagManager.add(key, value)
        };
      }

      throw new Error('Unsupported scope for Tags.of');
    }
  }

  return {
    App: MockApp,
    Stack: MockStack,
    Tags: MockTags
  };
});

jest.mock('aws-cdk-lib/aws-s3', () => {
  const { Stack } = jest.requireActual('aws-cdk-lib');

  class Bucket {
    public readonly node: { defaultChild: any };

    constructor(private readonly scope: InstanceType<typeof Stack>, private readonly id: string, private readonly props: Record<string, any> = {}) {
      this.node = { defaultChild: this };
      (this.scope as any)._registerResource(this.id, 'AWS::S3::Bucket', this.props, this);
    }
  }

  return {
    Bucket
  };
});

import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { PlanCommand } from '../../../src/cli/plan';

const createLogger = () => ({
  debug: jest.fn(),
  info: jest.fn(),
  success: jest.fn(),
  error: jest.fn(),
  warn: jest.fn()
});

describe('PlanCommand basic synthesis', () => {
  const dependencies = {
    pipeline: {} as any,
    fileDiscovery: {} as any,
    logger: createLogger()
  };

  let planCommand: PlanCommand;

  beforeEach(() => {
    jest.clearAllMocks();
    dependencies.logger = createLogger();
    planCommand = new PlanCommand(dependencies);
  });

  describe('performBasicCdkSynthesis', () => {
    it('uses provided environment for stack context and platform tags', async () => {
      const manifest = {
        service: 'test-service',
        owner: 'jane.doe',
        complianceFramework: 'commercial',
        components: []
      };

      const result = await (planCommand as any).performBasicCdkSynthesis(manifest, 'staging');
      const stack = result.stacks[0] as cdk.Stack;

      expect(stack.node.tryGetContext('environment')).toBe('staging');
      expect(stack.node.tryGetContext('platform:environment')).toBe('staging');

      const renderedTags = stack.tags.renderTags();
      expect(renderedTags).toEqual(expect.arrayContaining([
        expect.objectContaining({ Key: 'platform:service-name', Value: 'test-service' }),
        expect.objectContaining({ Key: 'platform:owner', Value: 'jane.doe' }),
        expect.objectContaining({ Key: 'platform:environment', Value: 'staging' }),
        expect.objectContaining({ Key: 'platform:managed-by', Value: 'shinobi' })
      ]));
    });

    it('propagates platform tags to child resources via CDK Tags', async () => {
      const manifest = {
        service: 'test-service',
        owner: 'jane.doe',
        complianceFramework: 'commercial',
        components: [
          {
            name: 'storage',
            type: 's3-bucket',
            config: {}
          }
        ]
      };

      const mockComponentCreator = {
        createComponent: jest.fn().mockImplementation((scope: cdk.Stack) => {
          new s3.Bucket(scope, 'TestBucket');
        })
      };

      (planCommand as any).getComponentCreator = jest.fn().mockResolvedValue(mockComponentCreator);

      const result = await (planCommand as any).performBasicCdkSynthesis(manifest, 'staging');
      const stack = result.stacks[0] as cdk.Stack;

      expect(mockComponentCreator.createComponent).toHaveBeenCalledWith(
        stack,
        expect.objectContaining({
          name: 'storage',
          type: 's3-bucket'
        }),
        expect.objectContaining({
          environment: 'staging',
          serviceName: 'test-service',
          owner: 'jane.doe'
        })
      );

      const bucketResource = Object.values(result.template.Resources || {}).find(
        (resource: any) => resource.Type === 'AWS::S3::Bucket'
      ) as any;

      expect(bucketResource).toBeDefined();
      expect(bucketResource.Properties?.Tags).toEqual(expect.arrayContaining([
        expect.objectContaining({ Key: 'platform:service-name', Value: 'test-service' }),
        expect.objectContaining({ Key: 'platform:owner', Value: 'jane.doe' }),
        expect.objectContaining({ Key: 'platform:environment', Value: 'staging' }),
        expect.objectContaining({ Key: 'platform:managed-by', Value: 'shinobi' })
      ]));
    });
  });
});
