/**
 * EMR Binder Strategy
 * Handles big data processing bindings for Amazon EMR
 */

import { IBinderStrategy } from '../binder-strategy.js';
import { BindingContext } from '../../binding-context.js';
import { ComponentBinding } from '../../component-binding.js';

export class EmrBinderStrategy implements IBinderStrategy {
  readonly supportedCapabilities = ['emr:cluster', 'emr:step', 'emr:notebook'];

  async bind(
    sourceComponent: any,
    targetComponent: any,
    binding: ComponentBinding,
    context: BindingContext
  ): Promise<void> {
    const { capability, access } = binding;

    switch (capability) {
      case 'emr:cluster':
        await this.bindToCluster(sourceComponent, targetComponent, binding, context);
        break;
      case 'emr:step':
        await this.bindToStep(sourceComponent, targetComponent, binding, context);
        break;
      case 'emr:notebook':
        await this.bindToNotebook(sourceComponent, targetComponent, binding, context);
        break;
      default:
        throw new Error(`Unsupported EMR capability: ${capability}`);
    }
  }

  private async bindToCluster(
    sourceComponent: any,
    targetComponent: any,
    binding: ComponentBinding,
    context: BindingContext
  ): Promise<void> {
    const { access } = binding;

    // Grant cluster access permissions
    if (access.includes('read')) {
      sourceComponent.addToRolePolicy({
        Effect: 'Allow',
        Action: [
          'elasticmapreduce:DescribeCluster',
          'elasticmapreduce:ListClusters',
          'elasticmapreduce:ListInstances',
          'elasticmapreduce:ListInstanceGroups'
        ],
        Resource: targetComponent.clusterArn
      });
    }

    if (access.includes('write')) {
      sourceComponent.addToRolePolicy({
        Effect: 'Allow',
        Action: [
          'elasticmapreduce:RunJobFlow',
          'elasticmapreduce:TerminateJobFlows',
          'elasticmapreduce:ModifyInstanceGroups'
        ],
        Resource: targetComponent.clusterArn
      });
    }

    // Grant EC2 permissions for cluster management
    sourceComponent.addToRolePolicy({
      Effect: 'Allow',
      Action: [
        'ec2:DescribeInstances',
        'ec2:DescribeInstanceStatus',
        'ec2:DescribeSecurityGroups',
        'ec2:DescribeSubnets',
        'ec2:DescribeVpcs'
      ],
      Resource: '*'
    });

    // Grant IAM permissions for service roles
    if (targetComponent.serviceRole) {
      sourceComponent.addToRolePolicy({
        Effect: 'Allow',
        Action: [
          'iam:PassRole'
        ],
        Resource: targetComponent.serviceRole
      });
    }

    // Inject cluster environment variables
    sourceComponent.addEnvironment('EMR_CLUSTER_ID', targetComponent.clusterId);
    sourceComponent.addEnvironment('EMR_CLUSTER_ARN', targetComponent.clusterArn);
    sourceComponent.addEnvironment('EMR_CLUSTER_NAME', targetComponent.name);
    sourceComponent.addEnvironment('EMR_CLUSTER_STATUS', targetComponent.status.state);
    sourceComponent.addEnvironment('EMR_CLUSTER_RELEASE_LABEL', targetComponent.releaseLabel);

    // Configure cluster metadata
    sourceComponent.addEnvironment('EMR_CLUSTER_MASTER_PUBLIC_DNS', targetComponent.masterPublicDnsName);
    sourceComponent.addEnvironment('EMR_CLUSTER_LOG_URI', targetComponent.logUri);

    // Configure applications
    if (targetComponent.applications) {
      sourceComponent.addEnvironment('EMR_APPLICATIONS', targetComponent.applications.map((app: any) => app.name).join(','));
    }

    // Configure secure access if requested by manifest/config
    if ((binding.options && binding.options.requireSecureAccess) || context.tags?.RequireSecureAccess === 'true') {
      await this.configureSecureClusterAccess(sourceComponent, targetComponent, binding, context);
    }
  }

  private async bindToStep(
    sourceComponent: any,
    targetComponent: any,
    binding: ComponentBinding,
    context: BindingContext
  ): Promise<void> {
    const { access } = binding;

    // Grant step access permissions
    if (access.includes('read')) {
      sourceComponent.addToRolePolicy({
        Effect: 'Allow',
        Action: [
          'elasticmapreduce:DescribeStep',
          'elasticmapreduce:ListSteps'
        ],
        Resource: targetComponent.stepArn
      });
    }

    if (access.includes('write')) {
      sourceComponent.addToRolePolicy({
        Effect: 'Allow',
        Action: [
          'elasticmapreduce:AddJobFlowSteps',
          'elasticmapreduce:CancelSteps'
        ],
        Resource: targetComponent.stepArn
      });
    }

    // Grant S3 permissions for step artifacts
    if (targetComponent.jar) {
      sourceComponent.addToRolePolicy({
        Effect: 'Allow',
        Action: [
          's3:GetObject'
        ],
        Resource: targetComponent.jar
      });
    }

    // Inject step environment variables
    sourceComponent.addEnvironment('EMR_STEP_ID', targetComponent.stepId);
    sourceComponent.addEnvironment('EMR_STEP_ARN', targetComponent.stepArn);
    sourceComponent.addEnvironment('EMR_STEP_NAME', targetComponent.name);
    sourceComponent.addEnvironment('EMR_STEP_STATUS', targetComponent.status.state);
    sourceComponent.addEnvironment('EMR_STEP_ACTION_ON_FAILURE', targetComponent.actionOnFailure);

    // Configure step metadata
    if (targetComponent.jar) {
      sourceComponent.addEnvironment('EMR_STEP_JAR', targetComponent.jar);
    }

    if (targetComponent.mainClass) {
      sourceComponent.addEnvironment('EMR_STEP_MAIN_CLASS', targetComponent.mainClass);
    }

    if (targetComponent.args) {
      sourceComponent.addEnvironment('EMR_STEP_ARGS', targetComponent.args.join(' '));
    }
  }

  private async bindToNotebook(
    sourceComponent: any,
    targetComponent: any,
    binding: ComponentBinding,
    context: BindingContext
  ): Promise<void> {
    const { access } = binding;

    // Grant notebook access permissions
    if (access.includes('read')) {
      sourceComponent.addToRolePolicy({
        Effect: 'Allow',
        Action: [
          'elasticmapreduce:DescribeNotebookExecution',
          'elasticmapreduce:ListNotebookExecutions'
        ],
        Resource: targetComponent.notebookExecutionId
      });
    }

    if (access.includes('write')) {
      sourceComponent.addToRolePolicy({
        Effect: 'Allow',
        Action: [
          'elasticmapreduce:StartNotebookExecution',
          'elasticmapreduce:StopNotebookExecution'
        ],
        Resource: targetComponent.notebookExecutionId
      });
    }

    // Grant S3 permissions for notebook storage
    if (targetComponent.notebookS3Location) {
      sourceComponent.addToRolePolicy({
        Effect: 'Allow',
        Action: [
          's3:GetObject',
          's3:PutObject'
        ],
        Resource: [
          targetComponent.notebookS3Location,
          `${targetComponent.notebookS3Location}/*`
        ]
      });
    }

    // Inject notebook environment variables
    sourceComponent.addEnvironment('EMR_NOTEBOOK_EXECUTION_ID', targetComponent.notebookExecutionId);
    sourceComponent.addEnvironment('EMR_NOTEBOOK_STATUS', targetComponent.status);
    sourceComponent.addEnvironment('EMR_NOTEBOOK_EDITOR_ID', targetComponent.editorId);
    sourceComponent.addEnvironment('EMR_NOTEBOOK_EXECUTION_ENGINE_ID', targetComponent.executionEngineId);

    // Configure notebook metadata
    if (targetComponent.notebookS3Location) {
      sourceComponent.addEnvironment('EMR_NOTEBOOK_S3_LOCATION', targetComponent.notebookS3Location);
    }

    if (targetComponent.outputNotebookS3Location) {
      sourceComponent.addEnvironment('EMR_NOTEBOOK_OUTPUT_S3_LOCATION', targetComponent.outputNotebookS3Location);
    }
  }

  private async configureSecureClusterAccess(
    sourceComponent: any,
    targetComponent: any,
    binding: ComponentBinding,
    context: BindingContext
  ): Promise<void> {
    // Configure encryption at rest
    if (targetComponent.encryptionConfiguration) {
      sourceComponent.addEnvironment('EMR_ENCRYPTION_ENABLED', 'true');

      if (targetComponent.encryptionConfiguration.kmsKeyId) {
        sourceComponent.addEnvironment('EMR_KMS_KEY_ID', targetComponent.encryptionConfiguration.kmsKeyId);

        // Grant KMS permissions
        sourceComponent.addToRolePolicy({
          Effect: 'Allow',
          Action: [
            'kms:Decrypt',
            'kms:GenerateDataKey'
          ],
          Resource: targetComponent.encryptionConfiguration.kmsKeyId
        });
      }
    }

    // Configure VPC for private cluster access
    if (targetComponent.ec2SubnetId) {
      sourceComponent.addEnvironment('EMR_SUBNET_ID', targetComponent.ec2SubnetId);
      sourceComponent.addEnvironment('EMR_VPC_ENABLED', 'true');
    }

    // Configure security groups
    if (targetComponent.emrManagedMasterSecurityGroup) {
      sourceComponent.addEnvironment('EMR_MASTER_SECURITY_GROUP', targetComponent.emrManagedMasterSecurityGroup);
    }

    if (targetComponent.emrManagedSlaveSecurityGroup) {
      sourceComponent.addEnvironment('EMR_SLAVE_SECURITY_GROUP', targetComponent.emrManagedSlaveSecurityGroup);
    }

    // Configure Kerberos authentication if requested
    if (binding.options && binding.options.enableKerberos === true) {
      sourceComponent.addEnvironment('EMR_KERBEROS_ENABLED', 'true');

      if (targetComponent.kerberosAttributes) {
        sourceComponent.addEnvironment('EMR_KERBEROS_REALM', targetComponent.kerberosAttributes.realm);
        sourceComponent.addEnvironment('EMR_KERBEROS_AD_DOMAIN_JOIN_USER', targetComponent.kerberosAttributes.adDomainJoinUser);
      }
    }

    // Configure logging
    if (targetComponent.logUri) {
      sourceComponent.addEnvironment('EMR_LOGGING_ENABLED', 'true');

      // Grant S3 permissions for logs
      sourceComponent.addToRolePolicy({
        Effect: 'Allow',
        Action: [
          's3:PutObject',
          's3:GetObject'
        ],
        Resource: [
          targetComponent.logUri,
          `${targetComponent.logUri}/*`
        ]
      });
    }

    // Configure monitoring and alerting
    sourceComponent.addEnvironment('EMR_MONITORING_ENABLED', 'true');

    // Grant CloudWatch permissions
    sourceComponent.addToRolePolicy({
      Effect: 'Allow',
      Action: [
        'cloudwatch:PutMetricData',
        'cloudwatch:GetMetricStatistics'
      ],
      Resource: '*'
    });

    // Configure audit logging if requested
    if (binding.options && binding.options.enableAuditLogging === true) {
      sourceComponent.addEnvironment('EMR_AUDIT_LOGGING_ENABLED', 'true');
    }

    // Grant CloudTrail permissions for audit logging
    sourceComponent.addToRolePolicy({
      Effect: 'Allow',
      Action: [
        'logs:CreateLogGroup',
        'logs:CreateLogStream',
        'logs:PutLogEvents'
      ],
      Resource: `arn:aws:logs:${context.region}:${context.accountId}:log-group:/aws/elasticmapreduce/*`
    });
  }
}
