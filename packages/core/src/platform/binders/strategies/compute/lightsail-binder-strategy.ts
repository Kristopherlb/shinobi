/**
 * Lightsail Binder Strategy
 * Handles virtual private server bindings for Amazon Lightsail
 */

import { IBinderStrategy } from '../binder-strategy';
import { BindingContext } from '../../binding-context';
import { ComponentBinding } from '../../component-binding';
// Compliance framework branching removed; use binding.options/config instead

export class LightsailBinderStrategy implements IBinderStrategy {
  readonly supportedCapabilities = ['lightsail:instance', 'lightsail:database', 'lightsail:load-balancer', 'lightsail:container-service'];

  async bind(
    sourceComponent: any,
    targetComponent: any,
    binding: ComponentBinding,
    context: BindingContext
  ): Promise<void> {
    const { capability, access } = binding;

    switch (capability) {
      case 'lightsail:instance':
        await this.bindToInstance(sourceComponent, targetComponent, binding, context);
        break;
      case 'lightsail:database':
        await this.bindToDatabase(sourceComponent, targetComponent, binding, context);
        break;
      case 'lightsail:load-balancer':
        await this.bindToLoadBalancer(sourceComponent, targetComponent, binding, context);
        break;
      case 'lightsail:container-service':
        await this.bindToContainerService(sourceComponent, targetComponent, binding, context);
        break;
      default:
        throw new Error(`Unsupported Lightsail capability: ${capability}`);
    }
  }

  private async bindToInstance(
    sourceComponent: any,
    targetComponent: any,
    binding: ComponentBinding,
    context: BindingContext
  ): Promise<void> {
    const { access } = binding;

    // Grant instance access permissions
    if (access.includes('read')) {
      sourceComponent.addToRolePolicy({
        Effect: 'Allow',
        Action: [
          'lightsail:GetInstances',
          'lightsail:GetInstance',
          'lightsail:GetInstanceAccessDetails',
          'lightsail:GetInstancePortStates'
        ],
        Resource: targetComponent.instanceArn
      });
    }

    if (access.includes('write')) {
      sourceComponent.addToRolePolicy({
        Effect: 'Allow',
        Action: [
          'lightsail:CreateInstances',
          'lightsail:UpdateInstance',
          'lightsail:DeleteInstance',
          'lightsail:RebootInstance',
          'lightsail:StartInstance',
          'lightsail:StopInstance'
        ],
        Resource: targetComponent.instanceArn
      });
    }

    // Grant SSH key access for instance management
    if (targetComponent.sshKeyName) {
      sourceComponent.addToRolePolicy({
        Effect: 'Allow',
        Action: [
          'lightsail:GetKeyPair',
          'lightsail:GetKeyPairs'
        ],
        Resource: `arn:aws:lightsail:${context.region}:${context.accountId}:KeyPair/${targetComponent.sshKeyName}`
      });
    }

    // Inject instance environment variables
    sourceComponent.addEnvironment('LIGHTSAIL_INSTANCE_NAME', targetComponent.instanceName);
    sourceComponent.addEnvironment('LIGHTSAIL_INSTANCE_ARN', targetComponent.instanceArn);
    sourceComponent.addEnvironment('LIGHTSAIL_INSTANCE_STATE', targetComponent.state.name);
    sourceComponent.addEnvironment('LIGHTSAIL_INSTANCE_TYPE', targetComponent.bundleId);
    sourceComponent.addEnvironment('LIGHTSAIL_INSTANCE_IP', targetComponent.publicIpAddress);
    sourceComponent.addEnvironment('LIGHTSAIL_INSTANCE_PRIVATE_IP', targetComponent.privateIpAddress);

    // Configure networking
    if (targetComponent.networking) {
      sourceComponent.addEnvironment('LIGHTSAIL_PORTS', JSON.stringify(targetComponent.networking.ports));
    }

    // Configure secure access when requested via options/config
    if (binding.options?.requireSecureAccess === true) {
      await this.configureSecureInstanceAccess(sourceComponent, targetComponent, context);
    }
  }

  private async bindToDatabase(
    sourceComponent: any,
    targetComponent: any,
    binding: ComponentBinding,
    context: BindingContext
  ): Promise<void> {
    const { access } = binding;

    // Grant database access permissions
    if (access.includes('read')) {
      sourceComponent.addToRolePolicy({
        Effect: 'Allow',
        Action: [
          'lightsail:GetRelationalDatabase',
          'lightsail:GetRelationalDatabases',
          'lightsail:GetRelationalDatabaseParameters',
          'lightsail:GetRelationalDatabaseSnapshots'
        ],
        Resource: targetComponent.databaseArn
      });
    }

    if (access.includes('write')) {
      sourceComponent.addToRolePolicy({
        Effect: 'Allow',
        Action: [
          'lightsail:CreateRelationalDatabase',
          'lightsail:UpdateRelationalDatabase',
          'lightsail:DeleteRelationalDatabase',
          'lightsail:RebootRelationalDatabase',
          'lightsail:StartRelationalDatabase',
          'lightsail:StopRelationalDatabase'
        ],
        Resource: targetComponent.databaseArn
      });
    }

    // Grant master user password access
    if (targetComponent.masterUsername) {
      sourceComponent.addToRolePolicy({
        Effect: 'Allow',
        Action: [
          'lightsail:GetRelationalDatabaseMasterUserPassword'
        ],
        Resource: targetComponent.databaseArn
      });
    }

    // Inject database environment variables
    sourceComponent.addEnvironment('LIGHTSAIL_DATABASE_NAME', targetComponent.relationalDatabaseName);
    sourceComponent.addEnvironment('LIGHTSAIL_DATABASE_ARN', targetComponent.databaseArn);
    sourceComponent.addEnvironment('LIGHTSAIL_DATABASE_ENGINE', targetComponent.relationalDatabaseBlueprintId);
    sourceComponent.addEnvironment('LIGHTSAIL_DATABASE_VERSION', targetComponent.relationalDatabaseBundleId);
    sourceComponent.addEnvironment('LIGHTSAIL_DATABASE_ENDPOINT', targetComponent.masterEndpoint.address);
    sourceComponent.addEnvironment('LIGHTSAIL_DATABASE_PORT', targetComponent.masterEndpoint.port.toString());
    sourceComponent.addEnvironment('LIGHTSAIL_DATABASE_USERNAME', targetComponent.masterUsername);

    // Configure secure database access when requested via options/config
    if (binding.options?.requireSecureAccess === true) {
      await this.configureSecureDatabaseAccess(sourceComponent, targetComponent, context, binding);
    }
  }

  private async bindToLoadBalancer(
    sourceComponent: any,
    targetComponent: any,
    binding: ComponentBinding,
    context: BindingContext
  ): Promise<void> {
    const { access } = binding;

    // Grant load balancer access permissions
    if (access.includes('read')) {
      sourceComponent.addToRolePolicy({
        Effect: 'Allow',
        Action: [
          'lightsail:GetLoadBalancer',
          'lightsail:GetLoadBalancers',
          'lightsail:GetLoadBalancerTlsCertificates'
        ],
        Resource: targetComponent.loadBalancerArn
      });
    }

    if (access.includes('write')) {
      sourceComponent.addToRolePolicy({
        Effect: 'Allow',
        Action: [
          'lightsail:CreateLoadBalancer',
          'lightsail:UpdateLoadBalancer',
          'lightsail:DeleteLoadBalancer',
          'lightsail:AttachInstancesToLoadBalancer',
          'lightsail:DetachInstancesFromLoadBalancer'
        ],
        Resource: targetComponent.loadBalancerArn
      });
    }

    // Inject load balancer environment variables
    sourceComponent.addEnvironment('LIGHTSAIL_LOAD_BALANCER_NAME', targetComponent.loadBalancerName);
    sourceComponent.addEnvironment('LIGHTSAIL_LOAD_BALANCER_ARN', targetComponent.loadBalancerArn);
    sourceComponent.addEnvironment('LIGHTSAIL_LOAD_BALANCER_DNS_NAME', targetComponent.dnsName);
    sourceComponent.addEnvironment('LIGHTSAIL_LOAD_BALANCER_STATE', targetComponent.state.name);

    // Configure health check
    if (targetComponent.healthCheck) {
      sourceComponent.addEnvironment('LIGHTSAIL_HEALTH_CHECK_PATH', targetComponent.healthCheck.path);
      sourceComponent.addEnvironment('LIGHTSAIL_HEALTH_CHECK_INTERVAL', targetComponent.healthCheck.intervalSeconds.toString());
      sourceComponent.addEnvironment('LIGHTSAIL_HEALTH_CHECK_TIMEOUT', targetComponent.healthCheck.timeoutSeconds.toString());
      sourceComponent.addEnvironment('LIGHTSAIL_HEALTH_CHECK_THRESHOLD', targetComponent.healthCheck.healthyThresholdCount.toString());
    }

    // Configure SSL/TLS for secure access
    if (targetComponent.tlsCertificateSummaries) {
      sourceComponent.addEnvironment('LIGHTSAIL_TLS_CERTIFICATES',
        targetComponent.tlsCertificateSummaries.map((cert: any) => cert.name).join(','));
    }
  }

  private async bindToContainerService(
    sourceComponent: any,
    targetComponent: any,
    binding: ComponentBinding,
    context: BindingContext
  ): Promise<void> {
    const { access } = binding;

    // Grant container service access permissions
    if (access.includes('read')) {
      sourceComponent.addToRolePolicy({
        Effect: 'Allow',
        Action: [
          'lightsail:GetContainerServices',
          'lightsail:GetContainerService',
          'lightsail:GetContainerServiceDeployments'
        ],
        Resource: targetComponent.containerServiceArn
      });
    }

    if (access.includes('write')) {
      sourceComponent.addToRolePolicy({
        Effect: 'Allow',
        Action: [
          'lightsail:CreateContainerService',
          'lightsail:UpdateContainerService',
          'lightsail:DeleteContainerService',
          'lightsail:CreateContainerServiceDeployment'
        ],
        Resource: targetComponent.containerServiceArn
      });
    }

    // Grant ECR access for container images
    if (targetComponent.containerImages) {
      sourceComponent.addToRolePolicy({
        Effect: 'Allow',
        Action: [
          'ecr:GetAuthorizationToken',
          'ecr:BatchCheckLayerAvailability',
          'ecr:GetDownloadUrlForLayer',
          'ecr:BatchGetImage'
        ],
        Resource: targetComponent.containerImages.map((img: any) => img.ecrRepositoryArn)
      });
    }

    // Inject container service environment variables
    sourceComponent.addEnvironment('LIGHTSAIL_CONTAINER_SERVICE_NAME', targetComponent.containerServiceName);
    sourceComponent.addEnvironment('LIGHTSAIL_CONTAINER_SERVICE_ARN', targetComponent.containerServiceArn);
    sourceComponent.addEnvironment('LIGHTSAIL_CONTAINER_SERVICE_STATE', targetComponent.state.name);
    sourceComponent.addEnvironment('LIGHTSAIL_CONTAINER_SERVICE_URL', targetComponent.url);

    // Configure power and scale
    sourceComponent.addEnvironment('LIGHTSAIL_POWER', targetComponent.power);
    sourceComponent.addEnvironment('LIGHTSAIL_SCALE', targetComponent.scale.toString());

    // Configure container images
    if (targetComponent.containerImages) {
      sourceComponent.addEnvironment('LIGHTSAIL_CONTAINER_IMAGES',
        targetComponent.containerImages.map((img: any) => img.image).join(','));
    }
  }

  private async configureSecureInstanceAccess(
    sourceComponent: any,
    targetComponent: any,
    context: BindingContext
  ): Promise<void> {
    // Configure secure SSH access
    if (targetComponent.sshKeyName) {
      sourceComponent.addEnvironment('LIGHTSAIL_SSH_KEY_NAME', targetComponent.sshKeyName);

      // Ensure only authorized SSH keys are used
      sourceComponent.addEnvironment('LIGHTSAIL_SSH_ACCESS_ENABLED', 'true');
    }

    // Configure firewall rules for secure access
    if (targetComponent.networking?.ports) {
      const securePorts = targetComponent.networking.ports.filter((port: any) =>
        port.protocol === 'tcp' && (port.fromPort === 443 || port.fromPort === 22)
      );
      sourceComponent.addEnvironment('LIGHTSAIL_SECURE_PORTS', JSON.stringify(securePorts));
    }

    // Configure monitoring and alerting
    sourceComponent.addEnvironment('LIGHTSAIL_MONITORING_ENABLED', 'true');
  }

  private async configureSecureDatabaseAccess(
    sourceComponent: any,
    targetComponent: any,
    context: BindingContext,
    binding?: ComponentBinding
  ): Promise<void> {
    // Configure encrypted connections
    sourceComponent.addEnvironment('LIGHTSAIL_DATABASE_SSL_ENABLED', 'true');

    // Configure backup retention for compliance
    if (targetComponent.backupRetentionEnabled) {
      sourceComponent.addEnvironment('LIGHTSAIL_BACKUP_RETENTION_ENABLED', 'true');
      sourceComponent.addEnvironment('LIGHTSAIL_BACKUP_RETENTION_DAYS',
        (binding as any)?.options?.backupRetentionDays ? String((binding as any).options.backupRetentionDays) : '7');
    }

    // Configure parameter groups for security
    if (targetComponent.parameterApplyStatus) {
      sourceComponent.addEnvironment('LIGHTSAIL_PARAMETER_APPLY_STATUS', targetComponent.parameterApplyStatus);
    }

    // Configure maintenance window
    if (targetComponent.preferredMaintenanceWindow) {
      sourceComponent.addEnvironment('LIGHTSAIL_MAINTENANCE_WINDOW', targetComponent.preferredMaintenanceWindow);
    }
  }
}
