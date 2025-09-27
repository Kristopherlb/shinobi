/**
 * S3 Bucket Component synthesis tests
 * Ensures generated CloudFormation matches compliance expectations.
 */

import { Template, Match } from 'aws-cdk-lib/assertions';
import { App, Stack } from 'aws-cdk-lib';
import {
  ComponentContext,
  ComponentSpec
} from '@shinobi/core';
import { S3BucketComponent } from '../s3-bucket.component';
import { S3BucketConfig } from '../s3-bucket.builder';

const createContext = (
  complianceFramework: ComponentContext['complianceFramework']
): ComponentContext => {
  const app = new App();
  const stack = new Stack(app, 'TestStack');

  return {
    serviceName: 'test-service',
    environment: 'dev',
    complianceFramework,
    scope: stack,
    region: 'us-east-1',
    accountId: '123456789012'
  } as ComponentContext;
};

const createSpec = (config: Partial<S3BucketConfig> = {}): ComponentSpec => ({
  name: 'test-bucket',
  type: 's3-bucket',
  config
});

const synthesize = (context: ComponentContext, spec: ComponentSpec) => {
  const stack = context.scope as Stack;
  const component = new S3BucketComponent(stack, spec.name, context, spec);
  component.synth();
  return Template.fromStack(stack);
};

describe('S3BucketComponent__Synthesis__ComplianceBehaviors', () => {
  /*
   * Test Metadata: TP-S3-BUCKET-COMPONENT-001
   * {
   *   "id": "TP-S3-BUCKET-COMPONENT-001",
   *   "level": "unit",
   *   "capability": "Commercial synthesis uses platform defaults",
   *   "oracle": "contract",
   *   "invariants": ["AES256 encryption", "Versioning enabled"],
   *   "fixtures": ["cdk.Stack", "S3BucketComponent"],
   *   "inputs": { "shape": "Commercial context without overrides", "notes": "Validates default behavior" },
   *   "risks": [],
   *   "dependencies": ["config/commercial.yml"],
   *   "evidence": ["CloudFormation template"],
   *   "compliance_refs": ["std://configuration"],
   *   "ai_generated": false,
   *   "human_reviewed_by": ""
   * }
   */
  it('CommercialDefaults__BaselineConfiguration__SynthesizesAES256Bucket', () => {
    const context = createContext('commercial');
    const template = synthesize(context, createSpec());

    template.hasResourceProperties('AWS::S3::Bucket', Match.objectLike({
      VersioningConfiguration: { Status: 'Enabled' },
      BucketEncryption: {
        ServerSideEncryptionConfiguration: Match.arrayWith([
          Match.objectLike({
            ServerSideEncryptionByDefault: Match.objectLike({
              SSEAlgorithm: 'AES256'
            })
          })
        ])
      },
      LoggingConfiguration: Match.absent()
    }));

    template.resourceCountIs('AWS::KMS::Key', 0);
  });

  /*
   * Test Metadata: TP-S3-BUCKET-COMPONENT-002
   * {
   *   "id": "TP-S3-BUCKET-COMPONENT-002",
   *   "level": "unit",
   *   "capability": "FedRAMP Moderate defaults enforce KMS and logging",
   *   "oracle": "contract",
   *   "invariants": ["KMS CMK created", "Access logging enabled", "Metrics configuration present"],
   *   "fixtures": ["cdk.Stack", "S3BucketComponent"],
   *   "inputs": { "shape": "FedRAMP moderate context without overrides", "notes": "Validates compliance hardening" },
   *   "risks": [],
   *   "dependencies": ["config/fedramp-moderate.yml"],
   *   "evidence": ["CloudFormation template"],
   *   "compliance_refs": ["std://configuration", "std://observability"],
   *   "ai_generated": false,
   *   "human_reviewed_by": ""
   * }
   */
  it('FedRAMPModerateDefaults__ComplianceHardening__CreatesKmsAndLogging', () => {
    const context = createContext('fedramp-moderate');
    const template = synthesize(context, createSpec());

    template.hasResourceProperties('AWS::KMS::Key', {
      KeySpec: 'SYMMETRIC_DEFAULT'
    });

    template.hasResourceProperties('AWS::S3::Bucket', Match.objectLike({
      VersioningConfiguration: { Status: 'Enabled' },
      BucketEncryption: {
        ServerSideEncryptionConfiguration: Match.arrayWith([
          Match.objectLike({
            ServerSideEncryptionByDefault: Match.objectLike({
              SSEAlgorithm: 'aws:kms'
            })
          })
        ])
      },
      LoggingConfiguration: Match.objectLike({
        DestinationBucketName: Match.anyValue()
      }),
      MetricsConfigurations: Match.arrayWith([
        Match.objectLike({
          Id: 'EntireBucket'
        })
      ])
    }));

    template.hasResourceProperties('AWS::S3::BucketPolicy', Match.objectLike({
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({ Sid: 'DenyInsecureTransport' }),
          Match.objectLike({ Sid: 'RequireMFAForDelete' })
        ])
      }
    }));
  });

  /*
   * Test Metadata: TP-S3-BUCKET-COMPONENT-003
   * {
   *   "id": "TP-S3-BUCKET-COMPONENT-003",
   *   "level": "unit",
   *   "capability": "FedRAMP High object lock enforcement",
   *   "oracle": "contract",
   *   "invariants": ["Object lock enabled", "Compliance retention"],
   *   "fixtures": ["cdk.Stack", "S3BucketComponent"],
   *   "inputs": { "shape": "FedRAMP high context without overrides", "notes": "Validates object lock" },
   *   "risks": [],
   *   "dependencies": ["config/fedramp-high.yml"],
   *   "evidence": ["CloudFormation template"],
   *   "compliance_refs": ["std://configuration"],
   *   "ai_generated": false,
   *   "human_reviewed_by": ""
   * }
   */
  it('FedRAMPHighDefaults__ObjectLockCompliance__EnablesRetentionPolicies', () => {
    const context = createContext('fedramp-high');
    const template = synthesize(context, createSpec());

    template.hasResourceProperties('AWS::S3::Bucket', Match.objectLike({
      ObjectLockEnabled: true,
      ObjectLockConfiguration: Match.objectLike({
        Rule: Match.objectLike({
          DefaultRetention: Match.objectLike({
            Mode: 'COMPLIANCE',
            Days: 2555
          })
        })
      })
    }));

    template.hasResourceProperties('AWS::S3::BucketPolicy', Match.objectLike({
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({ Sid: 'DenyDeleteActions' })
        ])
      }
    }));
  });

  /*
   * Test Metadata: TP-S3-BUCKET-COMPONENT-004
   * {
   *   "id": "TP-S3-BUCKET-COMPONENT-004",
   *   "level": "unit",
   *   "capability": "FedRAMP overrides that disable audit logging are rejected",
   *   "oracle": "trace",
   *   "invariants": ["Audit logging required"],
   *   "fixtures": ["cdk.Stack", "S3BucketComponent"],
   *   "inputs": { "shape": "FedRAMP moderate with audit logging disabled", "notes": "Expect validation failure" },
   *   "risks": ["Missing access logs"],
   *   "dependencies": [],
   *   "evidence": ["Thrown error"],
   *   "compliance_refs": ["std://configuration"],
   *   "ai_generated": false,
   *   "human_reviewed_by": ""
   * }
   */
  it('ManifestOverrides__FedRAMPAuditLoggingDisabled__ThrowsComplianceError', () => {
    const context = createContext('fedramp-moderate');
    const spec = createSpec({
      compliance: { auditLogging: false }
    });

    expect(() => synthesize(context, spec)).toThrow(/FedRAMP deployments must enable compliance\.auditLogging/);
  });

  /*
   * Test Metadata: TP-S3-BUCKET-COMPONENT-005
   * {
   *   "id": "TP-S3-BUCKET-COMPONENT-005",
   *   "level": "unit",
   *   "capability": "Commercial overrides can disable audit logging",
   *   "oracle": "contract",
   *   "invariants": ["No audit bucket created"],
   *   "fixtures": ["cdk.Stack", "S3BucketComponent"],
   *   "inputs": { "shape": "Commercial context with audit logging disabled", "notes": "Allowed relaxation" },
   *   "risks": ["Reduced visibility"],
   *   "dependencies": [],
   *   "evidence": ["CloudFormation template"],
   *   "compliance_refs": ["std://configuration"],
   *   "ai_generated": false,
   *   "human_reviewed_by": ""
   * }
   */
  it('ManifestOverrides__CommercialAuditLoggingDisabled__OmitsAuditBucket', () => {
    const context = createContext('commercial');
    const template = synthesize(
      context,
      createSpec({ compliance: { auditLogging: false } })
    );

    template.resourceCountIs('AWS::S3::Bucket', 1);

    const buckets = template.findResources('AWS::S3::Bucket');
    Object.values(buckets).forEach(resource => {
      expect(resource.Properties?.LoggingConfiguration).toBeUndefined();
    });
  });

  /*
   * Test Metadata: TP-S3-BUCKET-COMPONENT-006
   * {
   *   "id": "TP-S3-BUCKET-COMPONENT-006",
   *   "level": "unit",
   *   "capability": "Audit bucket naming uniqueness",
   *   "oracle": "exact",
   *   "invariants": ["Generated name incorporates service, component, environment, and account"],
   *   "fixtures": ["cdk.Stack", "S3BucketComponent"],
   *   "inputs": { "shape": "FedRAMP moderate context with audit logging enabled", "notes": "Verifies deterministic bucket naming" },
   *   "risks": ["Bucket name collisions"],
   *   "dependencies": [],
   *   "evidence": ["Audit bucket CloudFormation resource"],
   *   "compliance_refs": ["std://configuration"],
   *   "ai_generated": false,
   *   "human_reviewed_by": ""
   * }
   */
  it('AuditBucketNaming__DefaultConfiguration__UsesDeterministicUniqueName', () => {
    const context = createContext('fedramp-moderate');
    const template = synthesize(context, createSpec());

    const auditBucket = template.findResources('AWS::S3::Bucket', {
      Properties: Match.objectLike({
        BucketName: Match.stringLikeRegexp('test-service-test-bucket-dev-audit-123456789012')
      })
    });

    expect(Object.keys(auditBucket)).toHaveLength(1);
  });

  /*
   * Test Metadata: TP-S3-BUCKET-COMPONENT-007
   * {
   *   "id": "TP-S3-BUCKET-COMPONENT-007",
   *   "level": "unit",
   *   "capability": "Object lock requires versioning",
   *   "oracle": "trace",
   *   "invariants": ["Validation error thrown"],
   *   "fixtures": ["cdk.Stack", "S3BucketComponent"],
   *   "inputs": { "shape": "Object lock enabled with versioning disabled", "notes": "Expect synth failure" },
   *   "risks": [],
   *   "dependencies": [],
   *   "evidence": ["Thrown error"],
   *   "compliance_refs": ["std://configuration"],
   *   "ai_generated": false,
   *   "human_reviewed_by": ""
   * }
   */
  it('ObjectLock__VersioningDisabled__ThrowsInformativeError', () => {
    const context = createContext('commercial');
    const spec = createSpec({
      versioning: false,
      compliance: {
        objectLock: {
          enabled: true,
          mode: 'COMPLIANCE',
          retentionDays: 365
        }
      }
    });

    expect(() => synthesize(context, spec)).toThrow(
      /objectLock\.enabled requires versioning to be true/
    );
  });
});
