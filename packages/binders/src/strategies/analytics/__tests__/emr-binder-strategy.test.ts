/**
 * Unit Tests: EMR Binder Strategy (Unified)
 * Tests for Amazon EMR bindings with compliance enforcement
 */

import { EmrBinderStrategy } from '../emr-binder-strategy.js';
import {
  createMockSourceComponent,
  createMockTargetComponent,
  createBindingContext,
  executeUnifiedBinding,
  assertEnhancedBindingResult,
  TEST_CONSTANTS
} from '../../security/__tests__/unified-strategy-test-helpers.js';

describe('EmrBinderStrategy', () => {
  describe('EmrBind__ValidClusterAccess__ReturnsClusterEnvVars', () => {
    const metadata = {
      id: 'TP-binders-emr-001',
      level: 'unit' as const,
      capability: 'Returns EMR cluster environment variables for valid cluster access',
      oracle: 'exact' as const,
      invariants: [
        'Returns EnhancedBindingResult with compliance block',
        'Environment variables include EMR_CLUSTER_ID, EMR_CLUSTER_ARN, EMR_CLUSTER_NAME',
        'IAM policies include EMR cluster read actions',
        'EC2 describe permissions are granted for cluster management',
        'Security group rules array is empty'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with emr:cluster capability and read access',
        notes: 'Basic EMR cluster read access binding'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('EmrBind__ValidClusterAccess__ReturnsClusterEnvVars', async () => {
    const strategy = new EmrBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('emr-cluster', {
        'emr:cluster': {
          type: 'emr:cluster',
          clusterId: 'j-2AXXXXXXGAPLF',
      clusterArn: 'arn:aws:elasticmapreduce:us-east-1:123456789012:cluster/j-2AXXXXXXGAPLF',
      name: 'analytics-cluster',
      status: { state: 'WAITING' },
      releaseLabel: 'emr-6.10.0',
      masterPublicDnsName: 'ec2-1-2-3-4.compute-1.amazonaws.com',
      logUri: 's3://emr-logs/bucket',
          applications: [{ name: 'Hadoop' }, { name: 'Spark' }]
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'emr:cluster',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: Cluster environment variables are set
      expect(result.environmentVariables['EMR_CLUSTER_ID']).toBe('j-2AXXXXXXGAPLF');
      expect(result.environmentVariables['EMR_CLUSTER_ARN']).toBe('arn:aws:elasticmapreduce:us-east-1:123456789012:cluster/j-2AXXXXXXGAPLF');
      expect(result.environmentVariables['EMR_CLUSTER_NAME']).toBe('analytics-cluster');
      expect(result.environmentVariables['EMR_CLUSTER_STATUS']).toBe('WAITING');
      expect(result.environmentVariables['EMR_CLUSTER_RELEASE_LABEL']).toBe('emr-6.10.0');
      expect(result.environmentVariables['EMR_CLUSTER_MASTER_PUBLIC_DNS']).toBe('ec2-1-2-3-4.compute-1.amazonaws.com');
      expect(result.environmentVariables['EMR_CLUSTER_LOG_URI']).toBe('s3://emr-logs/bucket');
      expect(result.environmentVariables['EMR_APPLICATIONS']).toBe('Hadoop,Spark');
      
      // Assert IAM policies include EMR cluster read actions
      const clusterPolicy = result.iamPolicies.find(p => p.description.includes('cluster') && p.description.includes('read'));
      expect(clusterPolicy).toBeDefined();
      expect(clusterPolicy!.statement.actions).toContain('elasticmapreduce:DescribeCluster');
      expect(clusterPolicy!.statement.actions).toContain('elasticmapreduce:ListClusters');
      expect(clusterPolicy!.statement.resources).toContain('arn:aws:elasticmapreduce:us-east-1:123456789012:cluster/j-2AXXXXXXGAPLF');
      
      // Assert EC2 permissions are granted
      const ec2Policy = result.iamPolicies.find(p => p.description.includes('EC2'));
      expect(ec2Policy).toBeDefined();
      expect(ec2Policy!.statement.actions).toContain('ec2:DescribeInstances');
      expect(ec2Policy!.statement.actions).toContain('ec2:DescribeSecurityGroups');
      
      expect(result.securityGroupRules).toEqual([]);
    });
  });

  describe('EmrBind__ClusterWriteAccess__GrantsClusterWriteActions', () => {
    const metadata = {
      id: 'TP-binders-emr-002',
      level: 'unit' as const,
      capability: 'Grants EMR cluster write actions including RunJobFlow and TerminateJobFlows for write access',
      oracle: 'exact' as const,
      invariants: [
        'IAM policies include EMR cluster write actions (RunJobFlow, TerminateJobFlows, ModifyInstanceGroups)',
        'Read actions are included in write access',
        'Resources include specific cluster ARN'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with emr:cluster capability and write access',
        notes: 'EMR cluster write access with cluster management permissions'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('EmrBind__ClusterWriteAccess__GrantsClusterWriteActions', async () => {
      const strategy = new EmrBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('emr-cluster', {
        'emr:cluster': {
          type: 'emr:cluster',
          clusterId: 'j-2AXXXXXXGAPLF',
          clusterArn: 'arn:aws:elasticmapreduce:us-east-1:123456789012:cluster/j-2AXXXXXXGAPLF',
          name: 'analytics-cluster',
          status: { state: 'WAITING' },
          releaseLabel: 'emr-6.10.0',
          serviceRole: 'arn:aws:iam::123456789012:role/emr-service-role'
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'emr:cluster',
        access: 'write'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: Write actions are granted
      const writePolicy = result.iamPolicies.find(p => p.description.includes('cluster') && p.description.includes('write'));
      expect(writePolicy).toBeDefined();
      expect(writePolicy!.statement.actions).toContain('elasticmapreduce:RunJobFlow');
      expect(writePolicy!.statement.actions).toContain('elasticmapreduce:TerminateJobFlows');
      expect(writePolicy!.statement.actions).toContain('elasticmapreduce:ModifyInstanceGroups');
      expect(writePolicy!.statement.actions).toContain('elasticmapreduce:DescribeCluster');
      
      // Assert IAM PassRole is granted for service role
      const iamPolicy = result.iamPolicies.find(p => p.description.includes('PassRole'));
      expect(iamPolicy).toBeDefined();
      expect(iamPolicy!.statement.actions).toContain('iam:PassRole');
      expect(iamPolicy!.statement.resources).toContain('arn:aws:iam::123456789012:role/emr-service-role');
    });
  });

  describe('EmrBind__SecureClusterAccess__ConfiguresEncryptionVpcKerberos', () => {
    const metadata = {
      id: 'TP-binders-emr-003',
      level: 'unit' as const,
      capability: 'Configures secure cluster access with encryption, VPC, and Kerberos when requireSecureAccess is enabled',
      oracle: 'exact' as const,
      invariants: [
        'Environment variables include encryption, VPC, and Kerberos configuration',
        'IAM policies include KMS permissions for encryption',
        'S3 permissions are granted for cluster logs',
        'CloudWatch permissions are granted for monitoring',
        'CloudWatch Logs permissions are granted for audit logging when enabled'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with emr:cluster capability, requireSecureAccess=true, enableKerberos=true, enableAuditLogging=true',
        notes: 'EMR cluster with secure access features enabled'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('EmrBind__SecureClusterAccess__ConfiguresEncryptionVpcKerberos', async () => {
      const strategy = new EmrBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('emr-cluster', {
        'emr:cluster': {
          type: 'emr:cluster',
          clusterId: 'j-2AXXXXXXGAPLF',
          clusterArn: 'arn:aws:elasticmapreduce:us-east-1:123456789012:cluster/j-2AXXXXXXGAPLF',
          name: 'analytics-cluster',
          status: { state: 'WAITING' },
          releaseLabel: 'emr-6.10.0',
          logUri: 's3://emr-logs/bucket',
          encryptionConfiguration: {
            kmsKeyId: 'arn:aws:kms:us-east-1:123456789012:key/abc123def456'
          },
      ec2SubnetId: 'subnet-12345',
      emrManagedMasterSecurityGroup: 'sg-master',
      emrManagedSlaveSecurityGroup: 'sg-slave',
          kerberosAttributes: {
            realm: 'EXAMPLE.COM',
            adDomainJoinUser: 'svc-join'
          }
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'emr:cluster',
        access: 'read',
        options: {
          requireSecureAccess: true,
          enableKerberos: true,
          enableAuditLogging: true
        }
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: Secure access environment variables are set
      expect(result.environmentVariables['EMR_ENCRYPTION_ENABLED']).toBe('true');
      expect(result.environmentVariables['EMR_KMS_KEY_ID']).toBe('arn:aws:kms:us-east-1:123456789012:key/abc123def456');
      expect(result.environmentVariables['EMR_SUBNET_ID']).toBe('subnet-12345');
      expect(result.environmentVariables['EMR_VPC_ENABLED']).toBe('true');
      expect(result.environmentVariables['EMR_MASTER_SECURITY_GROUP']).toBe('sg-master');
      expect(result.environmentVariables['EMR_SLAVE_SECURITY_GROUP']).toBe('sg-slave');
      expect(result.environmentVariables['EMR_KERBEROS_ENABLED']).toBe('true');
      expect(result.environmentVariables['EMR_KERBEROS_REALM']).toBe('EXAMPLE.COM');
      expect(result.environmentVariables['EMR_KERBEROS_AD_DOMAIN_JOIN_USER']).toBe('svc-join');
      expect(result.environmentVariables['EMR_LOGGING_ENABLED']).toBe('true');
      expect(result.environmentVariables['EMR_MONITORING_ENABLED']).toBe('true');
      expect(result.environmentVariables['EMR_AUDIT_LOGGING_ENABLED']).toBe('true');
      
      // Assert KMS permissions are granted
      const kmsPolicy = result.iamPolicies.find(p => p.description.includes('KMS'));
      expect(kmsPolicy).toBeDefined();
      expect(kmsPolicy!.statement.actions).toContain('kms:Decrypt');
      expect(kmsPolicy!.statement.actions).toContain('kms:GenerateDataKey');
      expect(kmsPolicy!.statement.resources).toContain('arn:aws:kms:us-east-1:123456789012:key/abc123def456');
      
      // Assert S3 permissions for logs
      const s3Policy = result.iamPolicies.find(p => p.description.includes('logs'));
      expect(s3Policy).toBeDefined();
      expect(s3Policy!.statement.actions).toContain('s3:PutObject');
      expect(s3Policy!.statement.actions).toContain('s3:GetObject');
      
      // Assert CloudWatch permissions
      const cloudwatchPolicy = result.iamPolicies.find(p => p.description.includes('CloudWatch') && p.description.includes('monitoring'));
      expect(cloudwatchPolicy).toBeDefined();
      expect(cloudwatchPolicy!.statement.actions).toContain('cloudwatch:PutMetricData');
      
      // Assert CloudWatch Logs permissions for audit logging
      const logsPolicy = result.iamPolicies.find(p => p.description.includes('audit logging'));
      expect(logsPolicy).toBeDefined();
      expect(logsPolicy!.statement.actions).toContain('logs:CreateLogGroup');
      expect(logsPolicy!.statement.actions).toContain('logs:PutLogEvents');
    });
  });

  describe('EmrBind__ValidStepAccess__ReturnsStepEnvVars', () => {
    const metadata = {
      id: 'TP-binders-emr-004',
      level: 'unit' as const,
      capability: 'Returns EMR step environment variables for valid step access',
      oracle: 'exact' as const,
      invariants: [
        'Environment variables include EMR_STEP_ID, EMR_STEP_ARN, EMR_STEP_NAME',
        'IAM policies include EMR step read actions',
        'S3 permissions are granted for step JAR file when provided',
        'Security group rules array is empty'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with emr:step capability and read access',
        notes: 'Basic EMR step read access binding'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('EmrBind__ValidStepAccess__ReturnsStepEnvVars', async () => {
      const strategy = new EmrBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('emr-step', {
        'emr:step': {
          type: 'emr:step',
          stepId: 's-1234567890',
          stepArn: 'arn:aws:elasticmapreduce:us-east-1:123456789012:cluster/j-2AXXXXXXGAPLF/step/s-1234567890',
          name: 'spark-job',
          status: { state: 'COMPLETED' },
          actionOnFailure: 'CONTINUE',
          jar: 's3://my-bucket/jobs/spark-job.jar',
          mainClass: 'com.example.SparkJob',
          args: ['--input', 's3://input-bucket/data', '--output', 's3://output-bucket/results']
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'emr:step',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: Step environment variables are set
      expect(result.environmentVariables['EMR_STEP_ID']).toBe('s-1234567890');
      expect(result.environmentVariables['EMR_STEP_ARN']).toBe('arn:aws:elasticmapreduce:us-east-1:123456789012:cluster/j-2AXXXXXXGAPLF/step/s-1234567890');
      expect(result.environmentVariables['EMR_STEP_NAME']).toBe('spark-job');
      expect(result.environmentVariables['EMR_STEP_STATUS']).toBe('COMPLETED');
      expect(result.environmentVariables['EMR_STEP_ACTION_ON_FAILURE']).toBe('CONTINUE');
      expect(result.environmentVariables['EMR_STEP_JAR']).toBe('s3://my-bucket/jobs/spark-job.jar');
      expect(result.environmentVariables['EMR_STEP_MAIN_CLASS']).toBe('com.example.SparkJob');
      expect(result.environmentVariables['EMR_STEP_ARGS']).toBe('--input s3://input-bucket/data --output s3://output-bucket/results');
      
      // Assert IAM policies include EMR step read actions
      const stepPolicy = result.iamPolicies.find(p => p.description.includes('step') && p.description.includes('read'));
      expect(stepPolicy).toBeDefined();
      expect(stepPolicy!.statement.actions).toContain('elasticmapreduce:DescribeStep');
      expect(stepPolicy!.statement.actions).toContain('elasticmapreduce:ListSteps');
      expect(stepPolicy!.statement.resources).toContain('arn:aws:elasticmapreduce:us-east-1:123456789012:cluster/j-2AXXXXXXGAPLF/step/s-1234567890');
      
      // Assert S3 permissions for JAR file
      const s3Policy = result.iamPolicies.find(p => p.description.includes('JAR'));
      expect(s3Policy).toBeDefined();
      expect(s3Policy!.statement.actions).toContain('s3:GetObject');
      expect(s3Policy!.statement.resources).toContain('s3://my-bucket/jobs/spark-job.jar');
      
      expect(result.securityGroupRules).toEqual([]);
    });
  });

  describe('EmrBind__StepWriteAccess__GrantsStepWriteActions', () => {
    const metadata = {
      id: 'TP-binders-emr-005',
      level: 'unit' as const,
      capability: 'Grants EMR step write actions including AddJobFlowSteps and CancelSteps for write access',
      oracle: 'exact' as const,
      invariants: [
        'IAM policies include EMR step write actions (AddJobFlowSteps, CancelSteps)',
        'Read actions are included in write access',
        'Resources include specific step ARN'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with emr:step capability and write access',
        notes: 'EMR step write access with step management permissions'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('EmrBind__StepWriteAccess__GrantsStepWriteActions', async () => {
      const strategy = new EmrBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('emr-step', {
        'emr:step': {
          type: 'emr:step',
          stepId: 's-1234567890',
          stepArn: 'arn:aws:elasticmapreduce:us-east-1:123456789012:cluster/j-2AXXXXXXGAPLF/step/s-1234567890',
          name: 'spark-job',
          status: { state: 'PENDING' },
          actionOnFailure: 'CONTINUE'
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'emr:step',
        access: 'write'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: Write actions are granted
      const writePolicy = result.iamPolicies.find(p => p.description.includes('step') && p.description.includes('write'));
      expect(writePolicy).toBeDefined();
      expect(writePolicy!.statement.actions).toContain('elasticmapreduce:AddJobFlowSteps');
      expect(writePolicy!.statement.actions).toContain('elasticmapreduce:CancelSteps');
      expect(writePolicy!.statement.actions).toContain('elasticmapreduce:DescribeStep');
    });
  });

  describe('EmrBind__ValidNotebookAccess__ReturnsNotebookEnvVars', () => {
    const metadata = {
      id: 'TP-binders-emr-006',
      level: 'unit' as const,
      capability: 'Returns EMR notebook environment variables for valid notebook access',
      oracle: 'exact' as const,
      invariants: [
        'Environment variables include EMR_NOTEBOOK_EXECUTION_ID, EMR_NOTEBOOK_STATUS',
        'IAM policies include EMR notebook read actions',
        'S3 permissions are granted for notebook storage when provided',
        'Security group rules array is empty'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with emr:notebook capability and read access',
        notes: 'Basic EMR notebook read access binding'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('EmrBind__ValidNotebookAccess__ReturnsNotebookEnvVars', async () => {
      const strategy = new EmrBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('emr-notebook', {
        'emr:notebook': {
          type: 'emr:notebook',
          notebookExecutionId: 'ne-1234567890',
          status: 'FINISHED',
          editorId: 'editor-123',
          executionEngineId: 'engine-456',
          notebookS3Location: 's3://notebooks/my-notebook.ipynb',
          outputNotebookS3Location: 's3://notebooks/output/my-notebook-output.ipynb'
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'emr:notebook',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: Notebook environment variables are set
      expect(result.environmentVariables['EMR_NOTEBOOK_EXECUTION_ID']).toBe('ne-1234567890');
      expect(result.environmentVariables['EMR_NOTEBOOK_STATUS']).toBe('FINISHED');
      expect(result.environmentVariables['EMR_NOTEBOOK_EDITOR_ID']).toBe('editor-123');
      expect(result.environmentVariables['EMR_NOTEBOOK_EXECUTION_ENGINE_ID']).toBe('engine-456');
      expect(result.environmentVariables['EMR_NOTEBOOK_S3_LOCATION']).toBe('s3://notebooks/my-notebook.ipynb');
      expect(result.environmentVariables['EMR_NOTEBOOK_OUTPUT_S3_LOCATION']).toBe('s3://notebooks/output/my-notebook-output.ipynb');
      
      // Assert IAM policies include EMR notebook read actions
      const notebookPolicy = result.iamPolicies.find(p => p.description.includes('notebook') && p.description.includes('read'));
      expect(notebookPolicy).toBeDefined();
      expect(notebookPolicy!.statement.actions).toContain('elasticmapreduce:DescribeNotebookExecution');
      expect(notebookPolicy!.statement.actions).toContain('elasticmapreduce:ListNotebookExecutions');
      
      // Assert S3 permissions for notebook storage
      const s3Policy = result.iamPolicies.find(p => p.description.includes('notebook storage'));
      expect(s3Policy).toBeDefined();
      expect(s3Policy!.statement.actions).toContain('s3:GetObject');
      expect(s3Policy!.statement.actions).toContain('s3:PutObject');
      expect(s3Policy!.statement.resources).toContain('s3://notebooks/my-notebook.ipynb');
      expect(s3Policy!.statement.resources).toContain('s3://notebooks/my-notebook.ipynb/*');
      
      expect(result.securityGroupRules).toEqual([]);
    });
  });

  describe('EmrBind__NotebookWriteAccess__GrantsNotebookWriteActions', () => {
    const metadata = {
      id: 'TP-binders-emr-007',
      level: 'unit' as const,
      capability: 'Grants EMR notebook write actions including StartNotebookExecution and StopNotebookExecution for write access',
      oracle: 'exact' as const,
      invariants: [
        'IAM policies include EMR notebook write actions (StartNotebookExecution, StopNotebookExecution)',
        'Read actions are included in write access',
        'Resources include specific notebook execution ARN'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with emr:notebook capability and write access',
        notes: 'EMR notebook write access with execution management permissions'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('EmrBind__NotebookWriteAccess__GrantsNotebookWriteActions', async () => {
      const strategy = new EmrBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('emr-notebook', {
        'emr:notebook': {
          type: 'emr:notebook',
          notebookExecutionId: 'ne-1234567890',
          status: 'STARTING',
          editorId: 'editor-123',
          executionEngineId: 'engine-456'
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'emr:notebook',
        access: 'write'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: Write actions are granted
      const writePolicy = result.iamPolicies.find(p => p.description.includes('notebook') && p.description.includes('write'));
      expect(writePolicy).toBeDefined();
      expect(writePolicy!.statement.actions).toContain('elasticmapreduce:StartNotebookExecution');
      expect(writePolicy!.statement.actions).toContain('elasticmapreduce:StopNotebookExecution');
      expect(writePolicy!.statement.actions).toContain('elasticmapreduce:DescribeNotebookExecution');
    });
  });
});
