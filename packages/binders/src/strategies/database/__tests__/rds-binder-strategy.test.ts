/**
 * RDS Binder Strategy Tests (Unified)
 * 
 * Tests for RdsBinderStrategy following Platform Testing Standard v1.0
 * All tests assert EnhancedBindingResult structure (return-based, not mutation-based)
 */

import { RdsBinderStrategy } from '../rds-binder-strategy.js';
import {
  createMockSourceComponent,
  createMockTargetComponent,
  createBindingContext,
  executeUnifiedBinding,
  assertEnhancedBindingResult,
  TEST_CONSTANTS
} from '../../security/__tests__/unified-strategy-test-helpers.js';

describe('RdsBinderStrategy', () => {
  describe('RdsBind__ValidPostgresAccess__ReturnsEnhancedResult', () => {
    const metadata = {
      id: 'TP-binders-rds-001',
      level: 'unit' as const,
      capability: 'Returns EnhancedBindingResult with DB_HOST and DB_SECRET_ARN for valid PostgreSQL binding',
      oracle: 'exact' as const,
      invariants: [
        'result.environmentVariables.DB_HOST matches input endpoints.host',
        'result.environmentVariables.DB_PORT matches input endpoints.port',
        'result.environmentVariables.DB_SECRET_ARN matches input secrets.masterSecretArn',
        'result.compliance.status exists',
        'result.iamPolicies is an array',
        'result.securityGroupRules is an array'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'PostgresCapabilityData'],
      inputs: {
        shape: 'BindingContext with db:postgres capability, endpoints, resources, secrets (securityGroups/subnetGroup optional)',
        notes: 'Basic valid binding with read access'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('RdsBind__ValidPostgresAccess__ReturnsEnhancedResult', async () => {
      const strategy = new RdsBinderStrategy();
      const source = createMockSourceComponent('lambda-api', 'test-function');
      const dbHost = 'postgres-instance.xyz.us-east-1.rds.amazonaws.com';
      const secretArn = 'arn:aws:secretsmanager:us-east-1:123456789012:secret:postgres-credentials-abc123';
      const target = createMockTargetComponent('rds-postgres', {
        'db:postgres': {
          type: 'db:postgres',
          endpoints: {
            host: dbHost,
            port: 5432,
            database: 'testdb'
          },
          resources: {
            arn: 'arn:aws:rds:us-east-1:123456789012:db:postgres-instance'
          },
          secrets: {
            masterSecretArn: secretArn
          },
          securityGroups: ['sg-12345678'],
          subnetGroup: 'postgres-subnet-group',
          kmsKeyId: 'arn:aws:kms:us-east-1:123456789012:key/test-key-12345'
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'db:postgres',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      // Assert EnhancedBindingResult structure
      assertEnhancedBindingResult(result);

      // Primary assertion: Database environment variables are set correctly
      expect(result.environmentVariables.DB_HOST).toBe(dbHost);
      expect(result.environmentVariables.DB_PORT).toBe('5432');
      expect(result.environmentVariables.DB_NAME).toBe('testdb');
      expect(result.environmentVariables.DB_SECRET_ARN).toBe(secretArn);
      expect(result.environmentVariables.DB_CONNECTION_STRING).toContain('postgresql://');
      expect(result.environmentVariables.DB_TYPE).toBe('db:postgres');

      // Invariants
      expect(['compliant', 'non-compliant', 'partially-compliant']).toContain(result.compliance.status);
      expect(result.compliance.framework).toBe(TEST_CONSTANTS.COMPLIANCE_FRAMEWORK);
      expect(Array.isArray(result.iamPolicies)).toBe(true);
      expect(Array.isArray(result.securityGroupRules)).toBe(true);
    });
  });

  describe('RdsBind__PostgresReadAccess__GrantsRDSAndSecretsActions', () => {
    const metadata = {
      id: 'TP-binders-rds-002',
      level: 'unit' as const,
      capability: 'Grants RDS metadata and Secrets Manager IAM actions for database access',
      oracle: 'exact' as const,
      invariants: [
        'PolicyStatement includes rds:DescribeDBInstances',
        'PolicyStatement includes secretsmanager:GetSecretValue',
        'PolicyStatement includes kms:Decrypt for secrets',
        'PolicyStatement resources match database ARN and secret ARN',
        'PolicyStatement Effect is Allow'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'PostgresCapabilityData'],
      inputs: {
        shape: 'BindingContext with db:postgres capability and read access',
        notes: 'Standard AccessLevel read value'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('RdsBind__PostgresReadAccess__GrantsRDSAndSecretsActions', async () => {
      const strategy = new RdsBinderStrategy();
      const source = createMockSourceComponent();
      const dbArn = 'arn:aws:rds:us-east-1:123456789012:db:postgres-instance';
      const secretArn = 'arn:aws:secretsmanager:us-east-1:123456789012:secret:postgres-credentials-abc123';
      const target = createMockTargetComponent('rds-postgres', {
        'db:postgres': {
          type: 'db:postgres',
          endpoints: {
            host: 'postgres-instance.xyz.us-east-1.rds.amazonaws.com',
            port: 5432,
            database: 'testdb'
          },
          resources: {
            arn: dbArn
          },
          secrets: {
            masterSecretArn: secretArn
          },
          securityGroups: ['sg-12345678'],
          subnetGroup: 'postgres-subnet-group',
          kmsKeyId: 'arn:aws:kms:us-east-1:123456789012:key/test-key-12345'
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'db:postgres',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: IAM policies include RDS, Secrets Manager, and KMS actions
      expect(result.iamPolicies.length).toBeGreaterThanOrEqual(3);
      
      const rdsPolicy = result.iamPolicies.find(policy => {
        const statementJson = policy.statement.toStatementJson();
        const actions = statementJson.Action as string[];
        return actions.includes('rds:DescribeDBInstances');
      });

      const secretsPolicy = result.iamPolicies.find(policy => {
        const statementJson = policy.statement.toStatementJson();
        const actions = statementJson.Action as string[];
        return actions.includes('secretsmanager:GetSecretValue');
      });

      const kmsPolicy = result.iamPolicies.find(policy => {
        const statementJson = policy.statement.toStatementJson();
        const actions = statementJson.Action as string[];
        return actions.includes('kms:Decrypt');
      });

      expect(rdsPolicy).toBeDefined();
      expect(secretsPolicy).toBeDefined();
      expect(kmsPolicy).toBeDefined();

      if (rdsPolicy) {
        const statementJson = rdsPolicy.statement.toStatementJson();
        const actions = statementJson.Action as string[];
        expect(actions).toContain('rds:DescribeDBInstances');
        expect(actions).toContain('rds:DescribeDBClusters');
        expect(statementJson.Effect).toBe('Allow');
        
        const resources = Array.isArray(statementJson.Resource) 
          ? statementJson.Resource 
          : [statementJson.Resource];
        expect(resources).toContain(dbArn);
      }

      if (secretsPolicy) {
        const statementJson = secretsPolicy.statement.toStatementJson();
        const resources = Array.isArray(statementJson.Resource) 
          ? statementJson.Resource 
          : [statementJson.Resource];
        expect(resources).toContain(secretArn);
      }
    });
  });

  describe('RdsBind__ValidMySQLAccess__ReturnsEnhancedResult', () => {
    const metadata = {
      id: 'TP-binders-rds-003',
      level: 'unit' as const,
      capability: 'Returns EnhancedBindingResult with mysql protocol for MySQL binding',
      oracle: 'exact' as const,
      invariants: [
        'result.environmentVariables.DB_CONNECTION_STRING contains mysql://',
        'result.environmentVariables.DB_TYPE is db:mysql',
        'result.compliance.status exists'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'MySQLCapabilityData'],
      inputs: {
        shape: 'BindingContext with db:mysql capability, endpoints, resources, secrets, securityGroups, subnetGroup',
        notes: 'Basic valid binding with read access for MySQL'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('RdsBind__ValidMySQLAccess__ReturnsEnhancedResult', async () => {
      const strategy = new RdsBinderStrategy();
      const source = createMockSourceComponent('lambda-api', 'test-function');
      const dbHost = 'mysql-instance.xyz.us-east-1.rds.amazonaws.com';
      const target = createMockTargetComponent('rds-mysql', {
        'db:mysql': {
          type: 'db:mysql',
          endpoints: {
            host: dbHost,
            port: 3306,
            database: 'testdb'
          },
          resources: {
            arn: 'arn:aws:rds:us-east-1:123456789012:db:mysql-instance'
          },
          secrets: {
            masterSecretArn: 'arn:aws:secretsmanager:us-east-1:123456789012:secret:mysql-credentials-abc123'
          },
          securityGroups: ['sg-12345678'],
          subnetGroup: 'mysql-subnet-group',
          kmsKeyId: 'arn:aws:kms:us-east-1:123456789012:key/test-key-12345'
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'db:mysql',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: MySQL connection string and type are correct
      expect(result.environmentVariables.DB_HOST).toBe(dbHost);
      expect(result.environmentVariables.DB_PORT).toBe('3306');
      expect(result.environmentVariables.DB_CONNECTION_STRING).toContain('mysql://');
      expect(result.environmentVariables.DB_TYPE).toBe('db:mysql');

      // Invariants
      expect(['compliant', 'non-compliant', 'partially-compliant']).toContain(result.compliance.status);
    });
  });

  describe('RdsBind__AuroraPostgresAccess__IncludesClusterArn', () => {
    const metadata = {
      id: 'TP-binders-rds-004',
      level: 'unit' as const,
      capability: 'Returns EnhancedBindingResult with DB_CLUSTER_ARN for Aurora PostgreSQL binding',
      oracle: 'exact' as const,
      invariants: [
        'result.environmentVariables.DB_CLUSTER_ARN matches input resources.clusterArn',
        'RDS policy includes clusterArn in resources',
        'Connection string uses postgresql protocol'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'AuroraPostgresCapabilityData'],
      inputs: {
        shape: 'BindingContext with db:aurora-postgres capability including clusterArn',
        notes: 'Aurora cluster binding with cluster ARN'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('RdsBind__AuroraPostgresAccess__IncludesClusterArn', async () => {
      const strategy = new RdsBinderStrategy();
      const source = createMockSourceComponent();
      const clusterArn = 'arn:aws:rds:us-east-1:123456789012:cluster:aurora-postgres-cluster';
      const target = createMockTargetComponent('aurora-postgres', {
        'db:aurora-postgres': {
          type: 'db:aurora-postgres',
          endpoints: {
            host: 'aurora-postgres-cluster.cluster-xyz.us-east-1.rds.amazonaws.com',
            port: 5432,
            database: 'testdb'
          },
          resources: {
            arn: 'arn:aws:rds:us-east-1:123456789012:db:aurora-postgres-instance',
            clusterArn
          },
          secrets: {
            masterSecretArn: 'arn:aws:secretsmanager:us-east-1:123456789012:secret:aurora-credentials-abc123'
          },
          securityGroups: ['sg-12345678'],
          subnetGroup: 'aurora-subnet-group',
          kmsKeyId: 'arn:aws:kms:us-east-1:123456789012:key/test-key-12345'
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'db:aurora-postgres',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: Cluster ARN is included in environment variables and policies
      expect(result.environmentVariables.DB_CLUSTER_ARN).toBe(clusterArn);
      expect(result.environmentVariables.DB_CONNECTION_STRING).toContain('postgresql://');
      expect(result.environmentVariables.DB_TYPE).toBe('db:aurora-postgres');

      // Invariants: RDS policy should include cluster ARN
      const rdsPolicy = result.iamPolicies.find(policy => {
        const statementJson = policy.statement.toStatementJson();
        const actions = statementJson.Action as string[];
        return actions.includes('rds:DescribeDBClusters');
      });
      expect(rdsPolicy).toBeDefined();
      if (rdsPolicy) {
        const statementJson = rdsPolicy.statement.toStatementJson();
        const resources = Array.isArray(statementJson.Resource) 
          ? statementJson.Resource 
          : [statementJson.Resource];
        expect(resources).toContain(clusterArn);
      }
    });
  });

  describe('RdsBind__SecurityGroupRules__ReturnsEmptyArray', () => {
    const metadata = {
      id: 'TP-binders-rds-005',
      level: 'unit' as const,
      capability: 'Returns empty security group rules array (network binding handled separately)',
      oracle: 'exact' as const,
      invariants: [
        'securityGroupRules is an empty array',
        'Network binding is handled via separate capability or patches',
        'IAM policies are still created for database access'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'PostgresCapabilityData'],
      inputs: {
        shape: 'BindingContext with db:postgres capability',
        notes: 'Security group rules are not created by this strategy - network binding is separate'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('RdsBind__SecurityGroupRules__ReturnsEmptyArray', async () => {
      const strategy = new RdsBinderStrategy();
      const source = createMockSourceComponent('lambda-api', 'test-function');
      const target = createMockTargetComponent('rds-postgres', {
        'db:postgres': {
          type: 'db:postgres',
          endpoints: {
            host: 'postgres-instance.xyz.us-east-1.rds.amazonaws.com',
            port: 5432,
            database: 'testdb'
          },
          resources: {
            arn: 'arn:aws:rds:us-east-1:123456789012:db:postgres-instance'
          },
          secrets: {
            masterSecretArn: 'arn:aws:secretsmanager:us-east-1:123456789012:secret:postgres-credentials-abc123'
          },
          securityGroups: ['sg-target-67890'],
          subnetGroup: 'postgres-subnet-group',
          kmsKeyId: 'arn:aws:kms:us-east-1:123456789012:key/test-key-12345'
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'db:postgres',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: Security group rules are empty (network binding handled separately)
      expect(result.securityGroupRules).toEqual([]);
      expect(Array.isArray(result.securityGroupRules)).toBe(true);
      
      // Invariants: IAM policies are still created
      expect(result.iamPolicies.length).toBeGreaterThan(0);
    });
  });

  describe('RdsBind__CustomEnvMappings__AppliesCustomVariables', () => {
    const metadata = {
      id: 'TP-binders-rds-006',
      level: 'unit' as const,
      capability: 'Applies custom environment variable mappings when provided in directive.env',
      oracle: 'exact' as const,
      invariants: [
        'Custom environment variable names are used instead of defaults',
        'Values match expected database connection parameters',
        'Default mappings are overridden by custom mappings'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'PostgresCapabilityData'],
      inputs: {
        shape: 'BindingContext with db:postgres capability and directive.env with custom mappings',
        notes: 'Custom environment variable name mappings'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('RdsBind__CustomEnvMappings__AppliesCustomVariables', async () => {
      const strategy = new RdsBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('rds-postgres', {
        'db:postgres': {
          type: 'db:postgres',
          endpoints: {
            host: 'postgres-instance.xyz.us-east-1.rds.amazonaws.com',
            port: 5432,
            database: 'testdb'
          },
          resources: {
            arn: 'arn:aws:rds:us-east-1:123456789012:db:postgres-instance'
          },
          secrets: {
            masterSecretArn: 'arn:aws:secretsmanager:us-east-1:123456789012:secret:postgres-credentials-abc123'
          },
          securityGroups: ['sg-12345678'],
          subnetGroup: 'postgres-subnet-group',
          kmsKeyId: 'arn:aws:kms:us-east-1:123456789012:key/test-key-12345'
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'db:postgres',
        access: 'read',
        env: {
          host: 'POSTGRES_HOST',
          port: 'POSTGRES_PORT',
          database: 'POSTGRES_DB',
          secretArn: 'POSTGRES_SECRET'
        }
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: Custom environment variable names are used
      expect(result.environmentVariables.POSTGRES_HOST).toBe('postgres-instance.xyz.us-east-1.rds.amazonaws.com');
      expect(result.environmentVariables.POSTGRES_PORT).toBe('5432');
      expect(result.environmentVariables.POSTGRES_DB).toBe('testdb');
      expect(result.environmentVariables.POSTGRES_SECRET).toBe('arn:aws:secretsmanager:us-east-1:123456789012:secret:postgres-credentials-abc123');
      
      // Invariants: Default names should not be present
      expect(result.environmentVariables.DB_HOST).toBeUndefined();
      expect(result.environmentVariables.DB_PORT).toBeUndefined();
    });
  });

  describe('RdsBind__SslModeOption__AppliesPreferredSslMode', () => {
    const metadata = {
      id: 'TP-binders-rds-007',
      level: 'unit' as const,
      capability: 'Applies preferred SSL mode from directive.options.preferredSslMode',
      oracle: 'exact' as const,
      invariants: [
        'DB_SSL_MODE environment variable matches options.preferredSslMode',
        'SSL mode is config-driven, not hard-coded framework branching'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'PostgresCapabilityData'],
      inputs: {
        shape: 'BindingContext with db:postgres capability and options.preferredSslMode=require',
        notes: 'Config-driven SSL mode configuration'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('RdsBind__SslModeOption__AppliesPreferredSslMode', async () => {
      const strategy = new RdsBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('rds-postgres', {
        'db:postgres': {
          type: 'db:postgres',
          endpoints: {
            host: 'postgres-instance.xyz.us-east-1.rds.amazonaws.com',
            port: 5432,
            database: 'testdb'
          },
          resources: {
            arn: 'arn:aws:rds:us-east-1:123456789012:db:postgres-instance'
          },
          secrets: {
            masterSecretArn: 'arn:aws:secretsmanager:us-east-1:123456789012:secret:postgres-credentials-abc123'
          },
          securityGroups: ['sg-12345678'],
          subnetGroup: 'postgres-subnet-group',
          kmsKeyId: 'arn:aws:kms:us-east-1:123456789012:key/test-key-12345'
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'db:postgres',
        access: 'read',
        options: { preferredSslMode: 'require' }
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: Preferred SSL mode is applied
      expect(result.environmentVariables.DB_SSL_MODE).toBe('require');
    });
  });

  describe('RdsBind__MissingRequiredFields__ThrowsActionableError', () => {
    const metadata = {
      id: 'TP-binders-rds-008',
      level: 'unit' as const,
      capability: 'Throws actionable error when required fields are missing',
      oracle: 'exact' as const,
      invariants: [
        'Error message indicates invalid capability data structure',
        'Error message is descriptive and actionable',
        'Error is thrown before binding completes',
        'Type guard validation occurs before specific field validation'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with db:postgres capability but missing required fields (secrets, etc.)',
        notes: 'Negative test case for missing required fields - type guard catches structural issues'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('RdsBind__MissingRequiredFields__ThrowsActionableError', async () => {
      const strategy = new RdsBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('rds-postgres', {
        'db:postgres': {
          type: 'db:postgres',
          endpoints: {
            host: 'postgres-instance.xyz.us-east-1.rds.amazonaws.com',
            port: 5432,
            database: 'testdb'
          },
          resources: {
            arn: 'arn:aws:rds:us-east-1:123456789012:db:postgres-instance'
          }
          // Missing secrets, securityGroups, subnetGroup
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'db:postgres',
        access: 'read'
      });

      // Primary assertion: Error is thrown with actionable message (type guard fails before specific validation)
      await expect(executeUnifiedBinding(strategy, context)).rejects.toThrow(/Invalid database capability data structure/);
    });
  });

  describe('RdsBind__CommercialCompliance__ReturnsComplianceBlock', () => {
    const metadata = {
      id: 'TP-binders-rds-009',
      level: 'unit' as const,
      capability: 'Returns compliance block with commercial framework for commercial compliance context',
      oracle: 'exact' as const,
      invariants: [
        'result.compliance.framework is commercial',
        'result.compliance.status is one of compliant/non-compliant/partially-compliant',
        'result.compliance.actionsTaken is an array',
        'result.compliance.violations may be present'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'PostgresCapabilityData'],
      inputs: {
        shape: 'BindingContext with db:postgres capability and commercial compliance framework',
        notes: 'Compliance framework validation'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('RdsBind__CommercialCompliance__ReturnsComplianceBlock', async () => {
      const strategy = new RdsBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('rds-postgres', {
        'db:postgres': {
          type: 'db:postgres',
          endpoints: {
            host: 'postgres-instance.xyz.us-east-1.rds.amazonaws.com',
            port: 5432,
            database: 'testdb'
          },
          resources: {
            arn: 'arn:aws:rds:us-east-1:123456789012:db:postgres-instance'
          },
          secrets: {
            masterSecretArn: 'arn:aws:secretsmanager:us-east-1:123456789012:secret:postgres-credentials-abc123'
          },
          securityGroups: ['sg-12345678'],
          subnetGroup: 'postgres-subnet-group',
          kmsKeyId: 'arn:aws:kms:us-east-1:123456789012:key/test-key-12345'
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'db:postgres',
        access: 'read',
        complianceFramework: 'commercial'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: Compliance block is present with correct framework
      expect(result.compliance.framework).toBe('commercial');
      expect(['compliant', 'non-compliant', 'partially-compliant']).toContain(result.compliance.status);
      expect(Array.isArray(result.compliance.actionsTaken)).toBe(true);
    });
  });
});

