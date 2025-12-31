import { LogLevel, Logger } from '../../core-engine/logger';
import { CloudFormationResource, StackAnalysisResult } from '../cloudformation-analyzer';
import { ResourceMapper } from '../resource-mapper';

describe('ResourceMapper dependency optimization', () => {
  const buildAnalysisResult = (resources: CloudFormationResource[]): StackAnalysisResult => ({
    stackName: 'TestStack',
    templatePath: 'template.json',
    template: {},
    resources,
    outputs: {},
    parameters: {},
    metadata: {}
  });

  it('serializes resource properties once per resource when discovering property-based dependencies', async () => {
    const mapper = new ResourceMapper(new Logger(LogLevel.ERROR));
    const resources: CloudFormationResource[] = [
      {
        logicalId: 'Topic',
        type: 'AWS::SNS::Topic',
        properties: {}
      },
      {
        logicalId: 'TopicPolicy',
        type: 'AWS::SNS::TopicPolicy',
        properties: {
          Topics: [{ Ref: 'Topic' }]
        }
      },
      {
        logicalId: 'Subscription',
        type: 'AWS::SNS::Subscription',
        properties: {
          TopicArn: { Ref: 'Topic' }
        }
      }
    ];

    const stringifySpy = jest.spyOn(JSON, 'stringify');

    await mapper.mapResources(buildAnalysisResult(resources), 'service', 'framework');

    expect(stringifySpy).toHaveBeenCalledTimes(3);

    stringifySpy.mockRestore();
  });

  it('resets cached dependency metadata between mapResources executions', async () => {
    const mapper = new ResourceMapper(new Logger(LogLevel.ERROR));
    const firstResources: CloudFormationResource[] = [
      {
        logicalId: 'LegacyPrimary',
        type: 'AWS::SNS::Topic',
        properties: {}
      },
      {
        logicalId: 'SharedPolicy',
        type: 'AWS::SNS::TopicPolicy',
        properties: {
          Topics: [{ Ref: 'LegacyPrimary' }]
        }
      }
    ];

    await mapper.mapResources(buildAnalysisResult(firstResources), 'service', 'framework');

    const stringifySpy = jest.spyOn(JSON, 'stringify');

    const secondResources: CloudFormationResource[] = [
      {
        logicalId: 'NewPrimary',
        type: 'AWS::SNS::Topic',
        properties: {}
      },
      {
        logicalId: 'SharedPolicy',
        type: 'AWS::SNS::TopicPolicy',
        properties: {
          Topics: [{ Ref: 'NewPrimary' }]
        }
      }
    ];

    await mapper.mapResources(buildAnalysisResult(secondResources), 'service', 'framework');

    expect(stringifySpy).toHaveBeenCalledTimes(2);

    stringifySpy.mockRestore();
  });
});
