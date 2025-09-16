import { PlanOutputFormatter } from '../../../src/services/plan-output-formatter';

describe('PlanOutputFormatter multi-stack diff support', () => {
  const logger = {
    info: jest.fn(),
    error: jest.fn(),
    success: jest.fn()
  } as any;

  const formatter = new PlanOutputFormatter({ logger });

  const baseSynthesisResult = {
    resolvedManifest: {
      components: [
        { name: 'api', type: 'lambda-api', config: {} },
        { name: 'database', type: 'rds-postgres', config: {} }
      ],
      binds: []
    },
    components: [],
    bindings: [],
    stacks: [],
    patchesApplied: false,
    synthesisTime: 125
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('aggregates diff summaries across multiple stacks', () => {
    const cdkDiff = {
      'service-stack-primary': {
        resources: {
          added: {
            ApiResource: { type: 'AWS::ApiGateway::RestApi', properties: {} }
          },
          modified: {},
          removed: {}
        },
        changes: { added: 1, modified: 0, removed: 0, total: 1 },
        hasChanges: true,
        stackName: 'service-stack-primary'
      },
      'service-stack-analytics': {
        resources: {
          added: {},
          modified: {
            WorkerLambda: {
              type: 'AWS::Lambda::Function',
              existing: {},
              updated: {}
            }
          },
          removed: {
            LegacyTable: { type: 'AWS::DynamoDB::Table', properties: {} }
          }
        },
        changes: { added: 0, modified: 1, removed: 1, total: 2 },
        hasChanges: true,
        stackName: 'service-stack-analytics',
        security: {
          warnings: ['Ensure encryption at rest for DynamoDB tables']
        }
      }
    };

    const output = formatter.formatPlanOutput({
      synthesisResult: baseSynthesisResult,
      cdkDiff,
      environment: 'dev',
      complianceFramework: 'commercial'
    });

    expect(output.structuredData.changes.totals).toEqual({
      added: 1,
      modified: 1,
      removed: 1,
      total: 3
    });

    expect(output.structuredData.changes.stacks).toHaveLength(2);
    expect(output.structuredData.changes.hasChanges).toBe(true);
    expect(output.warnings).toContain('Ensure encryption at rest for DynamoDB tables');
    expect(output.userFriendlySummary).toContain('Stack: service-stack-primary');
    expect(output.userFriendlySummary).toContain('Stack: service-stack-analytics');
  });
});

