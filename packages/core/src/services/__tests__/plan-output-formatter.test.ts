import { PlanOutputFormatter } from '../plan-output-formatter';
import { Logger } from '../../platform/logger/src';

describe('PlanOutputFormatter', () => {
  const logger = Logger.getLogger('PlanOutputFormatterTest');
  let formatter: PlanOutputFormatter;

  beforeEach(() => {
    formatter = new PlanOutputFormatter({ logger });
  });

  it('handles components without getAllConstructs without throwing', () => {
    const synthesisResult = {
      components: [
        {
          name: 'data-bucket',
          type: 's3-bucket'
        }
      ],
      patchesApplied: false
    };

    let output: ReturnType<PlanOutputFormatter['formatPlanOutput']> | undefined;
    expect(() => {
      output = formatter.formatPlanOutput({
        synthesisResult,
        environment: 'dev',
        complianceFramework: 'fedramp-moderate'
      });
    }).not.toThrow();

    expect(output?.recommendations).not.toContain(
      '⚠️  Ensure all data at rest is encrypted for FedRAMP compliance'
    );
  });

  it('detects unencrypted constructs when metadata is provided', () => {
    const componentWithConstructs = {
      name: 'database',
      type: 'rds-postgres',
      getAllConstructs: () => [
        [
          'rds.DatabaseInstancePrimary',
          {
            properties: {
              storageEncrypted: false
            }
          }
        ]
      ]
    };

    const synthesisResult = {
      components: [componentWithConstructs],
      patchesApplied: false
    };

    const output = formatter.formatPlanOutput({
      synthesisResult,
      environment: 'dev',
      complianceFramework: 'fedramp-high'
    });

    expect(output.recommendations).toContain(
      '⚠️  Ensure all data at rest is encrypted for FedRAMP compliance'
    );
  });
});
