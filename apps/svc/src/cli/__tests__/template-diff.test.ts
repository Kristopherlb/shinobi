import { diffCloudFormationTemplates } from '../utils/template-diff';

describe('diffCloudFormationTemplates', () => {
  it('detects added resources when stack does not yet contain them', () => {
    const currentTemplate = {
      Resources: {
        ExistingBucket: { Type: 'AWS::S3::Bucket' }
      }
    };

    const desiredTemplate = {
      Resources: {
        ExistingBucket: { Type: 'AWS::S3::Bucket' },
        NewLambda: {
          Type: 'AWS::Lambda::Function',
          Properties: {
            Runtime: 'nodejs20.x'
          }
        }
      }
    };

    const diff = diffCloudFormationTemplates('TestStack', currentTemplate, desiredTemplate);

    expect(diff.addedResources).toEqual(['NewLambda']);
    expect(diff.removedResources).toEqual([]);
    expect(diff.changedResources).toHaveLength(0);
    expect(diff.hasChanges).toBe(true);
  });

  it('captures property modifications within a shared resource', () => {
    const currentTemplate = {
      Resources: {
        Func: {
          Type: 'AWS::Lambda::Function',
          Properties: {
            Timeout: 10,
            MemorySize: 128
          }
        }
      }
    };

    const desiredTemplate = {
      Resources: {
        Func: {
          Type: 'AWS::Lambda::Function',
          Properties: {
            Timeout: 15,
            MemorySize: 256
          }
        }
      }
    };

    const diff = diffCloudFormationTemplates('TestStack', currentTemplate, desiredTemplate);

    expect(diff.changedResources).toHaveLength(1);
    const change = diff.changedResources[0];
    expect(change.resource).toBe('Func');
    expect(change.changePaths.some((changePath: string) => changePath.includes('Timeout'))).toBe(true);
    expect(change.changePaths.some((changePath: string) => changePath.includes('MemorySize'))).toBe(true);
    expect(diff.hasChanges).toBe(true);
  });
});
