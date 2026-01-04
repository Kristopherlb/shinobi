/**
 * Neptune Binder Strategy Tests (Unified)
 * 
 * Tests for NeptuneBinderStrategy following Platform Testing Standard v1.0
 * All tests assert EnhancedBindingResult structure (return-based, not mutation-based)
 */

import { NeptuneBinderStrategy } from '../neptune-binder-strategy.js';
import {
  createMockSourceComponent,
  createMockTargetComponent,
  createBindingContext,
  executeUnifiedBinding,
  assertEnhancedBindingResult,
  TEST_CONSTANTS
} from '../../security/__tests__/unified-strategy-test-helpers.js';

describe('NeptuneBinderStrategy', () => {
  describe('NeptuneBind__ValidClusterAccess__ReturnsEnhancedResult', () => {
    const metadata = {
      id: 'TP-binders-neptune-001',
      level: 'unit' as const,
      capability: 'Returns EnhancedBindingResult with NEPTUNE_CLUSTER_ARN for valid cluster binding',
      oracle: 'exact' as const,
      invariants: [
        'result.environmentVariables.NEPTUNE_CLUSTER_ARN matches input clusterArn',
        'result.environmentVariables.NEPTUNE_CLUSTER_IDENTIFIER matches input clusterIdentifier',
        'result.environmentVariables.NEPTUNE_CLUSTER_ENDPOINT matches input clusterEndpoint',
        'result.compliance.status exists',
        'result.iamPolicies is an array'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'NeptuneClusterCapabilityData'],
      inputs: {
        shape: 'BindingContext with neptune:cluster capability, clusterArn, clusterIdentifier, clusterEndpoint, port',
        notes: 'Basic valid binding with read access'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('NeptuneBind__ValidClusterAccess__ReturnsEnhancedResult', async () => {
      const strategy = new NeptuneBinderStrategy();
      const source = createMockSourceComponent('lambda-api', 'test-function');
      const clusterArn = 'arn:aws:rds:us-east-1:123456789012:cluster:graphdb';
      const clusterEndpoint = 'graphdb.cluster-xyz.us-east-1.neptune.amazonaws.com';
      const target = createMockTargetComponent('neptune-cluster', {
        'neptune:cluster': {
          clusterArn,
          clusterIdentifier: 'graphdb',
          clusterEndpoint,
          port: 8182,
          status: 'available',
          engine: 'neptune'
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'neptune:cluster',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      // Assert EnhancedBindingResult structure
      assertEnhancedBindingResult(result);

      // Primary assertion: Neptune cluster environment variables are set correctly
      expect(result.environmentVariables.NEPTUNE_CLUSTER_ARN).toBe(clusterArn);
      expect(result.environmentVariables.NEPTUNE_CLUSTER_IDENTIFIER).toBe('graphdb');
      expect(result.environmentVariables.NEPTUNE_CLUSTER_ENDPOINT).toBe(clusterEndpoint);
      expect(result.environmentVariables.NEPTUNE_CLUSTER_PORT).toBe('8182');

      // Invariants
      expect(['compliant', 'non-compliant', 'partially-compliant']).toContain(result.compliance.status);
      expect(result.compliance.framework).toBe(TEST_CONSTANTS.COMPLIANCE_FRAMEWORK);
      expect(Array.isArray(result.iamPolicies)).toBe(true);
    });
  });

  describe('NeptuneBind__ClusterReadAccess__GrantsRDSReadActions', () => {
    const metadata = {
      id: 'TP-binders-neptune-002',
      level: 'unit' as const,
      capability: 'Grants rds:DescribeDBClusters IAM actions for cluster read access',
      oracle: 'exact' as const,
      invariants: [
        'PolicyStatement includes rds:DescribeDBClusters',
        'PolicyStatement includes rds:DescribeDBClusterEndpoints',
        'PolicyStatement resources match clusterArn',
        'PolicyStatement Effect is Allow'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'NeptuneClusterCapabilityData'],
      inputs: {
        shape: 'BindingContext with neptune:cluster capability and read access',
        notes: 'Standard AccessLevel read value'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('NeptuneBind__ClusterReadAccess__GrantsRDSReadActions', async () => {
      const strategy = new NeptuneBinderStrategy();
      const source = createMockSourceComponent();
      const clusterArn = 'arn:aws:rds:us-east-1:123456789012:cluster:graphdb';
      const target = createMockTargetComponent('neptune-cluster', {
        'neptune:cluster': {
          clusterArn,
          clusterIdentifier: 'graphdb',
          clusterEndpoint: 'graphdb.cluster-xyz.us-east-1.neptune.amazonaws.com',
          port: 8182
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'neptune:cluster',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: IAM policies include RDS read actions for Neptune cluster
      expect(result.iamPolicies.length).toBeGreaterThan(0);
      
      const readPolicy = result.iamPolicies.find(policy => {
        const statementJson = policy.statement.toStatementJson();
        const actions = statementJson.Action as string[];
        return actions.includes('rds:DescribeDBClusters');
      });

      expect(readPolicy).toBeDefined();
      if (readPolicy) {
        const statementJson = readPolicy.statement.toStatementJson();
        const actions = statementJson.Action as string[];
        
        expect(actions).toContain('rds:DescribeDBClusters');
        expect(actions).toContain('rds:DescribeDBClusterEndpoints');
        expect(actions).toContain('rds:DescribeDBClusterParameters');
        expect(statementJson.Effect).toBe('Allow');
        
        const resources = Array.isArray(statementJson.Resource) 
          ? statementJson.Resource 
          : [statementJson.Resource];
        expect(resources).toContain(clusterArn);
      }
    });
  });

  describe('NeptuneBind__ClusterWriteAccess__GrantsRDSWriteActions', () => {
    const metadata = {
      id: 'TP-binders-neptune-003',
      level: 'unit' as const,
      capability: 'Grants rds:ModifyDBCluster and rds:DeleteDBCluster IAM actions for cluster write access',
      oracle: 'exact' as const,
      invariants: [
        'PolicyStatement includes rds:ModifyDBCluster',
        'PolicyStatement includes rds:DeleteDBCluster',
        'PolicyStatement resources match clusterArn',
        'PolicyStatement Effect is Allow'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'NeptuneClusterCapabilityData'],
      inputs: {
        shape: 'BindingContext with neptune:cluster capability and write access',
        notes: 'Standard AccessLevel write value'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('NeptuneBind__ClusterWriteAccess__GrantsRDSWriteActions', async () => {
      const strategy = new NeptuneBinderStrategy();
      const source = createMockSourceComponent();
      const clusterArn = 'arn:aws:rds:us-east-1:123456789012:cluster:graphdb';
      const target = createMockTargetComponent('neptune-cluster', {
        'neptune:cluster': {
          clusterArn,
          clusterIdentifier: 'graphdb',
          clusterEndpoint: 'graphdb.cluster-xyz.us-east-1.neptune.amazonaws.com',
          port: 8182
        }
      });

      const context = createBindingContext({
        source,
        target,
      capability: 'neptune:cluster',
        access: 'write'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: IAM policies include RDS write actions for Neptune cluster
      expect(result.iamPolicies.length).toBeGreaterThan(0);
      
      const writePolicy = result.iamPolicies.find(policy => {
        const statementJson = policy.statement.toStatementJson();
        const actions = statementJson.Action as string[];
        return actions.includes('rds:ModifyDBCluster');
      });

      expect(writePolicy).toBeDefined();
      if (writePolicy) {
        const statementJson = writePolicy.statement.toStatementJson();
        const actions = statementJson.Action as string[];
        
        expect(actions).toContain('rds:ModifyDBCluster');
        expect(actions).toContain('rds:DeleteDBCluster');
        expect(actions).toContain('rds:StartDBCluster');
        expect(actions).toContain('rds:StopDBCluster');
        expect(statementJson.Effect).toBe('Allow');
      }
    });
  });

  describe('NeptuneBind__ClusterReadwriteAccess__GrantsCombinedActions', () => {
    const metadata = {
      id: 'TP-binders-neptune-004',
      level: 'unit' as const,
      capability: 'Grants both read and write IAM actions for cluster readwrite access',
      oracle: 'exact' as const,
      invariants: [
        'PolicyStatement includes both rds:DescribeDBClusters (read) and rds:ModifyDBCluster (write)',
        'Both read and write policies are present',
        'PolicyStatement resources match clusterArn',
        'PolicyStatement Effect is Allow'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'NeptuneClusterCapabilityData'],
      inputs: {
        shape: 'BindingContext with neptune:cluster capability and readwrite access',
        notes: 'Combined read and write access level'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('NeptuneBind__ClusterReadwriteAccess__GrantsCombinedActions', async () => {
      const strategy = new NeptuneBinderStrategy();
      const source = createMockSourceComponent();
      const clusterArn = 'arn:aws:rds:us-east-1:123456789012:cluster:graphdb';
      const target = createMockTargetComponent('neptune-cluster', {
        'neptune:cluster': {
          clusterArn,
          clusterIdentifier: 'graphdb',
          clusterEndpoint: 'graphdb.cluster-xyz.us-east-1.neptune.amazonaws.com',
          port: 8182
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'neptune:cluster',
        access: 'readwrite'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: Both read and write IAM policies are present
      expect(result.iamPolicies.length).toBeGreaterThan(1);
      
      const readPolicy = result.iamPolicies.find(policy => {
        const statementJson = policy.statement.toStatementJson();
        const actions = statementJson.Action as string[];
        return actions.includes('rds:DescribeDBClusters');
      });

      const writePolicy = result.iamPolicies.find(policy => {
        const statementJson = policy.statement.toStatementJson();
        const actions = statementJson.Action as string[];
        return actions.includes('rds:ModifyDBCluster');
      });

      expect(readPolicy).toBeDefined();
      expect(writePolicy).toBeDefined();

      if (readPolicy) {
        const statementJson = readPolicy.statement.toStatementJson();
        const actions = statementJson.Action as string[];
        expect(actions).toContain('rds:DescribeDBClusters');
        expect(actions).toContain('rds:DescribeDBClusterEndpoints');
        expect(statementJson.Effect).toBe('Allow');
      }

      if (writePolicy) {
        const statementJson = writePolicy.statement.toStatementJson();
        const actions = statementJson.Action as string[];
        expect(actions).toContain('rds:ModifyDBCluster');
        expect(actions).toContain('rds:DeleteDBCluster');
        expect(statementJson.Effect).toBe('Allow');
      }
    });
  });

  describe('NeptuneBind__ClusterSecureAccess__AppliesEncryptionConfig', () => {
    const metadata = {
      id: 'TP-binders-neptune-005',
      level: 'unit' as const,
      capability: 'Applies encryption configuration when requireSecureAccess is enabled',
      oracle: 'exact' as const,
      invariants: [
        'NEPTUNE_ENCRYPTION_ENABLED environment variable is set',
        'NEPTUNE_KMS_KEY_ID environment variable is set when kmsKeyId provided',
        'KMS IAM policy is added for encryption key access',
        'Backup retention environment variable is set when provided'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'NeptuneClusterCapabilityData'],
      inputs: {
        shape: 'BindingContext with neptune:cluster capability, requireSecureAccess=true, storageEncrypted=true, kmsKeyId',
        notes: 'Secure access enabled with encryption at rest'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('NeptuneBind__ClusterSecureAccess__AppliesEncryptionConfig', async () => {
    const strategy = new NeptuneBinderStrategy();
      const source = createMockSourceComponent();
      const clusterArn = 'arn:aws:rds:us-east-1:123456789012:cluster:graphdb';
      const kmsKeyId = 'arn:aws:kms:us-east-1:123456789012:key/abc123';
      const target = createMockTargetComponent('neptune-cluster', {
        'neptune:cluster': {
          clusterArn,
      clusterIdentifier: 'graphdb',
      clusterEndpoint: 'graphdb.cluster-xyz.us-east-1.neptune.amazonaws.com',
      port: 8182,
      storageEncrypted: true,
          kmsKeyId,
      backupRetentionPeriod: 7,
          vpcSecurityGroupIds: ['sg-12345678'],
      dbSubnetGroupName: 'neptune-subnet'
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'neptune:cluster',
        access: 'read',
      options: { requireSecureAccess: true }
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: Secure access configuration is applied
      expect(result.environmentVariables.NEPTUNE_ENCRYPTION_ENABLED).toBe('true');
      expect(result.environmentVariables.NEPTUNE_KMS_KEY_ID).toBe(kmsKeyId);
      expect(result.environmentVariables.NEPTUNE_BACKUP_RETENTION_DAYS).toBe('7');
      expect(result.environmentVariables.NEPTUNE_SECURITY_GROUPS).toBe('sg-12345678');
      expect(result.environmentVariables.NEPTUNE_SUBNET_GROUP).toBe('neptune-subnet');
    });
  });

  describe('NeptuneBind__ClusterSecureAccess__HandlesMultipleSecurityGroups', () => {
    const metadata = {
      id: 'TP-binders-neptune-006',
      level: 'unit' as const,
      capability: 'Correctly handles array of multiple VPC security group IDs',
      oracle: 'exact' as const,
      invariants: [
        'NEPTUNE_SECURITY_GROUPS environment variable contains comma-separated list',
        'All security group IDs from array are present',
        'Order is preserved in comma-separated format'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'NeptuneClusterCapabilityData'],
      inputs: {
        shape: 'BindingContext with neptune:cluster capability, requireSecureAccess=true, vpcSecurityGroupIds array with multiple values',
        notes: 'Array handling for multiple security groups'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('NeptuneBind__ClusterSecureAccess__HandlesMultipleSecurityGroups', async () => {
      const strategy = new NeptuneBinderStrategy();
      const source = createMockSourceComponent();
      const clusterArn = 'arn:aws:rds:us-east-1:123456789012:cluster:graphdb';
      const securityGroupIds = ['sg-12345678', 'sg-87654321', 'sg-11223344'];
      const target = createMockTargetComponent('neptune-cluster', {
        'neptune:cluster': {
          clusterArn,
          clusterIdentifier: 'graphdb',
          clusterEndpoint: 'graphdb.cluster-xyz.us-east-1.neptune.amazonaws.com',
          port: 8182,
          storageEncrypted: true,
          vpcSecurityGroupIds: securityGroupIds,
          dbSubnetGroupName: 'neptune-subnet'
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'neptune:cluster',
        access: 'read',
        options: { requireSecureAccess: true }
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: Multiple security groups are correctly joined
      expect(result.environmentVariables.NEPTUNE_SECURITY_GROUPS).toBe('sg-12345678,sg-87654321,sg-11223344');
      
      // Invariants: All security group IDs are present
      const securityGroupsEnv = result.environmentVariables.NEPTUNE_SECURITY_GROUPS;
      securityGroupIds.forEach(sgId => {
        expect(securityGroupsEnv).toContain(sgId);
      });
    });
  });

  describe('NeptuneBind__ValidInstanceAccess__ReturnsEnhancedResult', () => {
    const metadata = {
      id: 'TP-binders-neptune-007',
      level: 'unit' as const,
      capability: 'Returns EnhancedBindingResult with NEPTUNE_INSTANCE_ARN for valid instance binding',
      oracle: 'exact' as const,
      invariants: [
        'result.environmentVariables.NEPTUNE_INSTANCE_ARN matches input instanceArn',
        'result.environmentVariables.NEPTUNE_INSTANCE_IDENTIFIER matches input instanceIdentifier',
        'result.environmentVariables.NEPTUNE_INSTANCE_ENDPOINT matches input endpoint',
        'result.compliance.status exists',
        'result.iamPolicies is an array'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'NeptuneInstanceCapabilityData'],
      inputs: {
        shape: 'BindingContext with neptune:instance capability, instanceArn, instanceIdentifier, endpoint, port',
        notes: 'Basic valid binding with read access'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('NeptuneBind__ValidInstanceAccess__ReturnsEnhancedResult', async () => {
      const strategy = new NeptuneBinderStrategy();
      const source = createMockSourceComponent('lambda-api', 'test-function');
      const instanceArn = 'arn:aws:rds:us-east-1:123456789012:db:graphdb-instance';
      const endpoint = 'graphdb-instance.xyz.us-east-1.neptune.amazonaws.com';
      const target = createMockTargetComponent('neptune-instance', {
        'neptune:instance': {
          instanceArn,
          instanceIdentifier: 'graphdb-instance',
          endpoint,
          port: 8182,
          dbInstanceStatus: 'available',
          dbInstanceClass: 'db.r5.xlarge'
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'neptune:instance',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      // Assert EnhancedBindingResult structure
      assertEnhancedBindingResult(result);

      // Primary assertion: Neptune instance environment variables are set correctly
      expect(result.environmentVariables.NEPTUNE_INSTANCE_ARN).toBe(instanceArn);
      expect(result.environmentVariables.NEPTUNE_INSTANCE_IDENTIFIER).toBe('graphdb-instance');
      expect(result.environmentVariables.NEPTUNE_INSTANCE_ENDPOINT).toBe(endpoint);
      expect(result.environmentVariables.NEPTUNE_INSTANCE_PORT).toBe('8182');

      // Invariants
      expect(['compliant', 'non-compliant', 'partially-compliant']).toContain(result.compliance.status);
      expect(result.compliance.framework).toBe(TEST_CONSTANTS.COMPLIANCE_FRAMEWORK);
      expect(Array.isArray(result.iamPolicies)).toBe(true);
    });
  });

  describe('NeptuneBind__InstanceReadAccess__GrantsRDSReadActions', () => {
    const metadata = {
      id: 'TP-binders-neptune-008',
      level: 'unit' as const,
      capability: 'Grants rds:DescribeDBInstances IAM actions for instance read access',
      oracle: 'exact' as const,
      invariants: [
        'PolicyStatement includes rds:DescribeDBInstances',
        'PolicyStatement includes rds:DescribeDBInstanceStatus',
        'PolicyStatement resources match instanceArn',
        'PolicyStatement Effect is Allow'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'NeptuneInstanceCapabilityData'],
      inputs: {
        shape: 'BindingContext with neptune:instance capability and read access',
        notes: 'Standard AccessLevel read value'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('NeptuneBind__InstanceReadAccess__GrantsRDSReadActions', async () => {
      const strategy = new NeptuneBinderStrategy();
      const source = createMockSourceComponent();
      const instanceArn = 'arn:aws:rds:us-east-1:123456789012:db:graphdb-instance';
      const target = createMockTargetComponent('neptune-instance', {
        'neptune:instance': {
          instanceArn,
          instanceIdentifier: 'graphdb-instance',
          endpoint: 'graphdb-instance.xyz.us-east-1.neptune.amazonaws.com',
          port: 8182
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'neptune:instance',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: IAM policies include RDS read actions for Neptune instance
      expect(result.iamPolicies.length).toBeGreaterThan(0);
      
      const readPolicy = result.iamPolicies.find(policy => {
        const statementJson = policy.statement.toStatementJson();
        const actions = statementJson.Action as string[];
        return actions.includes('rds:DescribeDBInstances');
      });

      expect(readPolicy).toBeDefined();
      if (readPolicy) {
        const statementJson = readPolicy.statement.toStatementJson();
        const actions = statementJson.Action as string[];
        
        expect(actions).toContain('rds:DescribeDBInstances');
        expect(actions).toContain('rds:DescribeDBInstanceStatus');
        expect(statementJson.Effect).toBe('Allow');
        
        const resources = Array.isArray(statementJson.Resource) 
          ? statementJson.Resource 
          : [statementJson.Resource];
        expect(resources).toContain(instanceArn);
      }
    });
  });

  describe('NeptuneBind__ValidQueryAccess__ReturnsEnhancedResult', () => {
    const metadata = {
      id: 'TP-binders-neptune-009',
      level: 'unit' as const,
      capability: 'Returns EnhancedBindingResult with NEPTUNE_QUERY_ENDPOINT for valid query binding',
      oracle: 'exact' as const,
      invariants: [
        'result.environmentVariables.NEPTUNE_QUERY_ENDPOINT matches input queryEndpoint',
        'result.environmentVariables.NEPTUNE_QUERY_PORT matches input port',
        'result.environmentVariables.NEPTUNE_QUERY_PROTOCOL is https',
        'result.compliance.status exists'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'NeptuneQueryCapabilityData'],
      inputs: {
        shape: 'BindingContext with neptune:query capability, queryEndpoint, port',
        notes: 'Basic valid binding with read access'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('NeptuneBind__ValidQueryAccess__ReturnsEnhancedResult', async () => {
      const strategy = new NeptuneBinderStrategy();
      const source = createMockSourceComponent('lambda-api', 'test-function');
      const queryEndpoint = 'graphdb.cluster-xyz.us-east-1.neptune.amazonaws.com';
      const target = createMockTargetComponent('neptune-query', {
        'neptune:query': {
          queryEndpoint,
          port: 8182,
          supportedQueryLanguages: ['sparql', 'gremlin'],
          sparqlEndpoint: 'graphdb.cluster-xyz.us-east-1.neptune.amazonaws.com:8182/sparql',
          gremlinEndpoint: 'graphdb.cluster-xyz.us-east-1.neptune.amazonaws.com:8182/gremlin'
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'neptune:query',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      // Assert EnhancedBindingResult structure
      assertEnhancedBindingResult(result);

      // Primary assertion: Neptune query environment variables are set correctly
      expect(result.environmentVariables.NEPTUNE_QUERY_ENDPOINT).toBe(queryEndpoint);
      expect(result.environmentVariables.NEPTUNE_QUERY_PORT).toBe('8182');
      expect(result.environmentVariables.NEPTUNE_QUERY_PROTOCOL).toBe('https');
      expect(result.environmentVariables.NEPTUNE_QUERY_LANGUAGES).toBe('sparql,gremlin');
      expect(result.environmentVariables.NEPTUNE_SPARQL_ENDPOINT).toBe('graphdb.cluster-xyz.us-east-1.neptune.amazonaws.com:8182/sparql');
      expect(result.environmentVariables.NEPTUNE_GREMLIN_ENDPOINT).toBe('graphdb.cluster-xyz.us-east-1.neptune.amazonaws.com:8182/gremlin');

      // Invariants
      expect(['compliant', 'non-compliant', 'partially-compliant']).toContain(result.compliance.status);
      expect(result.compliance.framework).toBe(TEST_CONSTANTS.COMPLIANCE_FRAMEWORK);
    });
  });

  describe('NeptuneBind__QuerySecureAccess__AppliesAuditLogging', () => {
    const metadata = {
      id: 'TP-binders-neptune-010',
      level: 'unit' as const,
      capability: 'Applies audit logging configuration when requireSecureAccess is enabled',
      oracle: 'exact' as const,
      invariants: [
        'NEPTUNE_SSL_ENABLED environment variable is set to true',
        'NEPTUNE_AUDIT_LOGGING_ENABLED environment variable is set when CloudWatch logs enabled',
        'CloudWatch Logs IAM policy is added when audit logging enabled',
        'NEPTUNE_IAM_AUTH_ENABLED is set when IAM authentication enabled'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'NeptuneQueryCapabilityData'],
      inputs: {
        shape: 'BindingContext with neptune:query capability, requireSecureAccess=true, enableCloudwatchLogsExports, iamDatabaseAuthenticationEnabled',
        notes: 'Secure access enabled with audit logging and IAM auth'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('NeptuneBind__QuerySecureAccess__AppliesAuditLogging', async () => {
      const strategy = new NeptuneBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('neptune-query', {
        'neptune:query': {
          queryEndpoint: 'graphdb.cluster-xyz.us-east-1.neptune.amazonaws.com',
          port: 8182,
          iamDatabaseAuthenticationEnabled: true,
          enableCloudwatchLogsExports: ['audit'],
          performanceInsightsEnabled: true
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'neptune:query',
        access: 'read',
        options: { requireSecureAccess: true }
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: Secure query access configuration is applied
      expect(result.environmentVariables.NEPTUNE_SSL_ENABLED).toBe('true');
      expect(result.environmentVariables.NEPTUNE_SSL_MODE).toBe('require');
      expect(result.environmentVariables.NEPTUNE_IAM_AUTH_ENABLED).toBe('true');
      expect(result.environmentVariables.NEPTUNE_AUDIT_LOGGING_ENABLED).toBe('true');
      expect(result.environmentVariables.NEPTUNE_CLOUDWATCH_LOGS).toBe('audit');
      expect(result.environmentVariables.NEPTUNE_PERFORMANCE_INSIGHTS_ENABLED).toBe('true');

      // Invariants: CloudWatch Logs policy should be present
      const logsPolicy = result.iamPolicies.find(policy => {
        const statementJson = policy.statement.toStatementJson();
        const actions = statementJson.Action as string[];
        return actions.includes('logs:CreateLogGroup');
      });
      expect(logsPolicy).toBeDefined();
    });
  });

  describe('NeptuneBind__QuerySecureAccess__AppliesPerformanceInsights', () => {
    const metadata = {
      id: 'TP-binders-neptune-011',
      level: 'unit' as const,
      capability: 'Applies Performance Insights configuration when requireSecureAccess is enabled',
      oracle: 'exact' as const,
      invariants: [
        'NEPTUNE_PERFORMANCE_INSIGHTS_ENABLED environment variable is set to true',
        'Other secure config options are still applied',
        'Performance Insights flag is correctly set from targetData'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'NeptuneQueryCapabilityData'],
      inputs: {
        shape: 'BindingContext with neptune:query capability, requireSecureAccess=true, performanceInsightsEnabled=true',
        notes: 'Secure access enabled with Performance Insights monitoring'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('NeptuneBind__QuerySecureAccess__AppliesPerformanceInsights', async () => {
      const strategy = new NeptuneBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('neptune-query', {
        'neptune:query': {
          queryEndpoint: 'graphdb.cluster-xyz.us-east-1.neptune.amazonaws.com',
          port: 8182,
          iamDatabaseAuthenticationEnabled: true,
          enableCloudwatchLogsExports: ['audit'],
          performanceInsightsEnabled: true
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'neptune:query',
        access: 'read',
        options: { requireSecureAccess: true }
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: Performance Insights configuration is applied
      expect(result.environmentVariables.NEPTUNE_PERFORMANCE_INSIGHTS_ENABLED).toBe('true');
      
      // Invariants: Other secure config options are still present
      expect(result.environmentVariables.NEPTUNE_SSL_ENABLED).toBe('true');
      expect(result.environmentVariables.NEPTUNE_IAM_AUTH_ENABLED).toBe('true');
      expect(result.environmentVariables.NEPTUNE_AUDIT_LOGGING_ENABLED).toBe('true');
    });
  });

  describe('NeptuneBind__MissingClusterArn__ThrowsActionableError', () => {
    const metadata = {
      id: 'TP-binders-neptune-012',
      level: 'unit' as const,
      capability: 'Throws actionable error when required clusterArn is missing',
      oracle: 'exact' as const,
      invariants: [
        'Error message mentions clusterArn',
        'Error message is descriptive and actionable',
        'Error is thrown before binding completes'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with neptune:cluster capability but missing clusterArn',
        notes: 'Negative test case for missing required field'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('NeptuneBind__MissingClusterArn__ThrowsActionableError', async () => {
      const strategy = new NeptuneBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('neptune-cluster', {
        'neptune:cluster': {
          clusterIdentifier: 'graphdb',
          clusterEndpoint: 'graphdb.cluster-xyz.us-east-1.neptune.amazonaws.com',
          port: 8182
          // Missing clusterArn
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'neptune:cluster',
        access: 'read'
      });

      // Primary assertion: Error is thrown with actionable message
      await expect(executeUnifiedBinding(strategy, context)).rejects.toThrow(/clusterArn/);
    });
  });

  describe('NeptuneBind__InvalidAccessType__ThrowsActionableError', () => {
    const metadata = {
      id: 'TP-binders-neptune-013',
      level: 'unit' as const,
      capability: 'Throws actionable error when invalid access type is provided',
      oracle: 'exact' as const,
      invariants: [
        'Error message mentions invalid access type',
        'Error message lists valid access types',
        'Error is thrown before binding completes'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with neptune:cluster capability and invalid access level (admin)',
        notes: 'Negative test case for invalid access type'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('NeptuneBind__InvalidAccessType__ThrowsActionableError', async () => {
      const strategy = new NeptuneBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('neptune-cluster', {
        'neptune:cluster': {
          clusterArn: 'arn:aws:rds:us-east-1:123456789012:cluster:graphdb',
          clusterIdentifier: 'graphdb',
          clusterEndpoint: 'graphdb.cluster-xyz.us-east-1.neptune.amazonaws.com',
          port: 8182
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'neptune:cluster',
        access: 'admin' as any // Invalid access level for Neptune
      });

      // Primary assertion: Error is thrown with actionable message listing valid access types
      await expect(executeUnifiedBinding(strategy, context)).rejects.toThrow(/Invalid access types/);
      await expect(executeUnifiedBinding(strategy, context)).rejects.toThrow(/read.*write.*readwrite/);
    });
  });

  describe('NeptuneBind__CommercialCompliance__ReturnsComplianceBlock', () => {
    const metadata = {
      id: 'TP-binders-neptune-014',
      level: 'unit' as const,
      capability: 'Returns compliance block with commercial framework for commercial compliance context',
      oracle: 'exact' as const,
      invariants: [
        'result.compliance.framework is commercial',
        'result.compliance.status is one of compliant/non-compliant/partially-compliant',
        'result.compliance.actionsTaken is an array',
        'result.compliance.violations may be present'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent', 'NeptuneClusterCapabilityData'],
      inputs: {
        shape: 'BindingContext with neptune:cluster capability and commercial compliance framework',
        notes: 'Compliance framework validation'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('NeptuneBind__CommercialCompliance__ReturnsComplianceBlock', async () => {
      const strategy = new NeptuneBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('neptune-cluster', {
        'neptune:cluster': {
          clusterArn: 'arn:aws:rds:us-east-1:123456789012:cluster:graphdb',
          clusterIdentifier: 'graphdb',
          clusterEndpoint: 'graphdb.cluster-xyz.us-east-1.neptune.amazonaws.com',
          port: 8182
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'neptune:cluster',
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

  describe('NeptuneBind__CustomActionsOverride__ReplacesCoarseActions', () => {
    const metadata = {
      id: 'TP-binders-neptune-010',
      level: 'unit' as const,
      capability: 'Custom actions override replaces default Neptune cluster actions',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'NeptuneBind__Condition__Outcome', example: 'NeptuneBind__CustomActionsOverride__ReplacesCoarseActions' },
      invariants: [
        'IAM policy actions match provided custom actions array',
        'Default Neptune cluster actions are not included when custom actions provided',
        'Actions array is used directly (replaces coarse access)'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with neptune:cluster capability and directive.actions array',
        notes: 'Granular actions override test'
      },
      risks: [],
      dependencies: ['action-resolver'],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('NeptuneBind__CustomActionsOverride__ReplacesCoarseActions', async () => {
      const strategy = new NeptuneBinderStrategy();
      const customActions = ['rds:DescribeDBClusters', 'rds:DescribeDBClusterEndpoints'];
      const clusterArn = 'arn:aws:rds:us-east-1:123456789012:cluster:graphdb';
      const target = createMockTargetComponent('neptune-cluster', {
        'neptune:cluster': {
          clusterArn,
          clusterIdentifier: 'graphdb',
          clusterEndpoint: 'graphdb.cluster-xyz.us-east-1.neptune.amazonaws.com',
          port: 8182
        }
      });

      const context = createBindingContext({
        source: createMockSourceComponent('lambda-api', 'test-source'),
        target,
        capability: 'neptune:cluster',
        access: 'read',
        actions: customActions
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      expect(result.iamPolicies.length).toBeGreaterThan(0);
      const policy = result.iamPolicies.find(p => p.description.includes('granular actions'));
      expect(policy).toBeDefined();
      
      const statementJson = policy!.statement.toStatementJson();
      const actions = Array.isArray(statementJson.Action)
        ? statementJson.Action
        : [statementJson.Action];

      // Primary assertion: Custom actions are used, default actions are not
      expect(actions).toEqual(expect.arrayContaining(customActions));
      expect(actions.length).toBe(customActions.length);
    });
  });

  describe('NeptuneBind__InstanceWriteAccess__GrantsRDSWriteActions', () => {
    const metadata = {
      id: 'TP-binders-neptune-016',
      level: 'unit' as const,
      capability: 'Instance write access grants RDS write actions',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'NeptuneBind__Condition__Outcome', example: 'NeptuneBind__InstanceWriteAccess__GrantsRDSWriteActions' },
      invariants: [
        'IAM policies include RDS instance write actions',
        'Write actions include CreateDBInstance and ModifyDBInstance'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with neptune:instance capability and write access',
        notes: 'Instance write access test'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('NeptuneBind__InstanceWriteAccess__GrantsRDSWriteActions', async () => {
      const strategy = new NeptuneBinderStrategy();
      const instanceArn = 'arn:aws:rds:us-east-1:123456789012:db:graphdb-instance-1';
      const target = createMockTargetComponent('neptune-instance', {
        'neptune:instance': {
          instanceArn,
          instanceIdentifier: 'graphdb-instance-1',
          clusterIdentifier: 'graphdb',
          endpoint: 'graphdb-instance-1.cluster-xyz.us-east-1.neptune.amazonaws.com',
          port: 8182
        }
      });

      const context = createBindingContext({
        source: createMockSourceComponent('lambda-api', 'test-source'),
        target,
        capability: 'neptune:instance',
        access: 'write'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      const policy = result.iamPolicies.find(p => p.description.includes('instance write access'));
      expect(policy).toBeDefined();
      
      const statementJson = policy!.statement.toStatementJson();
      const actions = Array.isArray(statementJson.Action)
        ? statementJson.Action
        : [statementJson.Action];

      expect(actions).toContain('rds:CreateDBInstance');
      expect(actions).toContain('rds:ModifyDBInstance');
      expect(actions).toContain('rds:DeleteDBInstance');
    });
  });

  describe('NeptuneBind__BackupReadAccess__ReturnsEnhancedResult', () => {
    const metadata = {
      id: 'TP-binders-neptune-017',
      level: 'unit' as const,
      capability: 'Backup read access returns enhanced result',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'NeptuneBind__Condition__Outcome', example: 'NeptuneBind__BackupReadAccess__ReturnsEnhancedResult' },
      invariants: [
        'Environment variables are set correctly',
        'IAM policies include Neptune backup read actions'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with neptune:backup capability and read access',
        notes: 'Backup read access test'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('NeptuneBind__BackupReadAccess__ReturnsEnhancedResult', async () => {
      const strategy = new NeptuneBinderStrategy();
      const clusterArn = 'arn:aws:rds:us-east-1:123456789012:cluster:graphdb';
      const target = createMockTargetComponent('neptune-cluster', {
        'neptune:backup': {
          clusterArn,
          clusterIdentifier: 'graphdb',
          backupRetentionPeriod: 7,
          snapshotIdentifier: 'graphdb-snapshot-1'
        }
      });

      const context = createBindingContext({
        source: createMockSourceComponent('lambda-backup', 'test-source'),
        target,
        capability: 'neptune:backup',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      expect(result.environmentVariables.NEPTUNE_CLUSTER_ARN).toBe(clusterArn);
      expect(result.environmentVariables.NEPTUNE_CLUSTER_IDENTIFIER).toBe('graphdb');
      expect(result.environmentVariables.NEPTUNE_BACKUP_RETENTION_DAYS).toBe('7');
      expect(result.environmentVariables.NEPTUNE_SNAPSHOT_IDENTIFIER).toBe('graphdb-snapshot-1');

      const policy = result.iamPolicies.find(p => p.description.includes('backup read access'));
      expect(policy).toBeDefined();
      
      const statementJson = policy!.statement.toStatementJson();
      const actions = Array.isArray(statementJson.Action)
        ? statementJson.Action
        : [statementJson.Action];

      expect(actions).toContain('rds:DescribeDBClusterSnapshots');
      expect(actions).toContain('rds:DescribeDBClusters');
    });
  });

  describe('NeptuneBind__BackupWriteAccess__GrantsWriteActions', () => {
    const metadata = {
      id: 'TP-binders-neptune-018',
      level: 'unit' as const,
      capability: 'Backup write access grants Neptune backup write actions',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'NeptuneBind__Condition__Outcome', example: 'NeptuneBind__BackupWriteAccess__GrantsWriteActions' },
      invariants: [
        'IAM policies include Neptune backup write actions',
        'Write actions include CreateDBClusterSnapshot and RestoreDBClusterFromSnapshot'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with neptune:backup capability and write access',
        notes: 'Backup write access test'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('NeptuneBind__BackupWriteAccess__GrantsWriteActions', async () => {
      const strategy = new NeptuneBinderStrategy();
      const clusterArn = 'arn:aws:rds:us-east-1:123456789012:cluster:graphdb';
      const target = createMockTargetComponent('neptune-cluster', {
        'neptune:backup': {
          clusterArn,
          clusterIdentifier: 'graphdb'
        }
      });

      const context = createBindingContext({
        source: createMockSourceComponent('lambda-backup', 'test-source'),
        target,
        capability: 'neptune:backup',
        access: 'write'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      const policy = result.iamPolicies.find(p => p.description.includes('backup write access'));
      expect(policy).toBeDefined();
      
      const statementJson = policy!.statement.toStatementJson();
      const actions = Array.isArray(statementJson.Action)
        ? statementJson.Action
        : [statementJson.Action];

      expect(actions).toContain('rds:CreateDBClusterSnapshot');
      expect(actions).toContain('rds:RestoreDBClusterFromSnapshot');
      expect(actions).toContain('rds:DeleteDBClusterSnapshot');
    });
  });

  describe('NeptuneBind__InstanceMissingInstanceArn__ThrowsError', () => {
    const metadata = {
      id: 'TP-binders-neptune-019',
      level: 'unit' as const,
      capability: 'Missing instanceArn throws error',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'NeptuneBind__Condition__Outcome', example: 'NeptuneBind__InstanceMissingInstanceArn__ThrowsError' },
      invariants: [
        'Error message indicates missing instanceArn',
        'Error is thrown before binding completes'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with neptune:instance capability but missing instanceArn',
        notes: 'Error case test'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('NeptuneBind__InstanceMissingInstanceArn__ThrowsError', async () => {
      const strategy = new NeptuneBinderStrategy();
      const target = createMockTargetComponent('neptune-instance', {
        'neptune:instance': {
          // Missing instanceArn
          instanceIdentifier: 'graphdb-instance-1'
        } as any
      });

      const context = createBindingContext({
        source: createMockSourceComponent('lambda-api', 'test-source'),
        target,
        capability: 'neptune:instance',
        access: 'read'
      });

      await expect(executeUnifiedBinding(strategy, context)).rejects.toThrow(
        'missing required instanceArn property'
      );
    });
  });

  describe('NeptuneBind__QueryMissingQueryEndpoint__ThrowsError', () => {
    const metadata = {
      id: 'TP-binders-neptune-020',
      level: 'unit' as const,
      capability: 'Missing queryEndpoint throws error',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'NeptuneBind__Condition__Outcome', example: 'NeptuneBind__QueryMissingQueryEndpoint__ThrowsError' },
      invariants: [
        'Error message indicates missing queryEndpoint',
        'Error is thrown before binding completes'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with neptune:query capability but missing queryEndpoint',
        notes: 'Error case test'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('NeptuneBind__QueryMissingQueryEndpoint__ThrowsError', async () => {
      const strategy = new NeptuneBinderStrategy();
      const target = createMockTargetComponent('neptune-query', {
        'neptune:query': {
          // Missing queryEndpoint
          port: 8182
        } as any
      });

      const context = createBindingContext({
        source: createMockSourceComponent('lambda-api', 'test-source'),
        target,
        capability: 'neptune:query',
        access: 'read'
      });

      await expect(executeUnifiedBinding(strategy, context)).rejects.toThrow(
        'missing required queryEndpoint property'
      );
    });
  });

  describe('NeptuneBind__BackupMissingClusterArn__ThrowsError', () => {
    const metadata = {
      id: 'TP-binders-neptune-021',
      level: 'unit' as const,
      capability: 'Backup missing clusterArn throws error',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'NeptuneBind__Condition__Outcome', example: 'NeptuneBind__BackupMissingClusterArn__ThrowsError' },
      invariants: [
        'Error message indicates missing clusterArn for backup',
        'Error is thrown before binding completes'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with neptune:backup capability but missing clusterArn',
        notes: 'Error case test for backup'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('NeptuneBind__BackupMissingClusterArn__ThrowsError', async () => {
      const strategy = new NeptuneBinderStrategy();
      const target = createMockTargetComponent('neptune-cluster', {
        'neptune:backup': {
          // Missing clusterArn
          clusterIdentifier: 'graphdb'
        } as any
      });

      const context = createBindingContext({
        source: createMockSourceComponent('lambda-backup', 'test-source'),
        target,
        capability: 'neptune:backup',
        access: 'read'
      });

      await expect(executeUnifiedBinding(strategy, context)).rejects.toThrow(
        'missing required clusterArn property'
      );
    });
  });

  describe('NeptuneBind__UnsupportedCapability__ThrowsError', () => {
    const metadata = {
      id: 'TP-binders-neptune-022',
      level: 'unit' as const,
      capability: 'Unsupported capability throws error',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'NeptuneBind__Condition__Outcome', example: 'NeptuneBind__UnsupportedCapability__ThrowsError' },
      invariants: [
        'Error message indicates unsupported capability',
        'Error lists supported capabilities'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with unsupported capability',
        notes: 'Error case test'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('NeptuneBind__UnsupportedCapability__ThrowsError', async () => {
      const strategy = new NeptuneBinderStrategy();
      const target = createMockTargetComponent('neptune-cluster', {
        'neptune:invalid': {
          clusterArn: 'arn:aws:rds:us-east-1:123456789012:cluster:graphdb'
        }
      });

      const context = createBindingContext({
        source: createMockSourceComponent('lambda-api', 'test-source'),
        target,
        capability: 'neptune:invalid',
        access: 'read'
      });

      await expect(executeUnifiedBinding(strategy, context)).rejects.toThrow(
        'Unsupported Neptune capability'
      );
    });
  });
});
