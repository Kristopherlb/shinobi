/**
 * Unit Tests: Lightsail Binder Strategy (Unified)
 * Tests for Amazon Lightsail bindings with compliance enforcement
 */

import { LightsailBinderStrategy } from '../lightsail-binder-strategy.js';
import {
  createMockSourceComponent,
  createMockTargetComponent,
  createBindingContext,
  executeUnifiedBinding,
  assertEnhancedBindingResult,
  TEST_CONSTANTS
} from '../../security/__tests__/unified-strategy-test-helpers.js';

describe('LightsailBinderStrategy', () => {
  describe('LightsailBind__ValidInstanceAccess__ReturnsInstanceEnvVars', () => {
    const metadata = {
      id: 'TP-binders-lightsail-001',
      level: 'unit' as const,
      capability: 'Returns Lightsail instance environment variables for valid instance access',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: {
        pattern: 'Feature__Condition__ExpectedOutcome',
        feature: 'LightsailBind',
        condition: 'ValidInstanceAccess',
        outcome: 'ReturnsInstanceEnvVars'
      },
      invariants: [
        'Returns EnhancedBindingResult with compliance block',
        'Environment variables include LIGHTSAIL_INSTANCE_NAME, LIGHTSAIL_INSTANCE_ARN, LIGHTSAIL_INSTANCE_STATE',
        'IAM policies include Lightsail instance read actions',
        'Security group rules array is empty'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with lightsail:instance capability and read access',
        notes: 'Basic Lightsail instance read access binding'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('LightsailBind__ValidInstanceAccess__ReturnsInstanceEnvVars', async () => {
      const strategy = new LightsailBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('lightsail-instance', {
        'lightsail:instance': {
          type: 'lightsail:instance',
          instanceArn: 'arn:aws:lightsail:us-east-1:123456789012:Instance/test-instance',
          instanceName: 'test-instance',
          state: { name: 'running' },
          bundleId: 'nano_2_0',
          publicIpAddress: '54.123.45.67',
          privateIpAddress: '10.0.1.5'
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'lightsail:instance',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: Instance environment variables are set
      expect(result.environmentVariables['LIGHTSAIL_INSTANCE_NAME']).toBe('test-instance');
      expect(result.environmentVariables['LIGHTSAIL_INSTANCE_ARN']).toBe('arn:aws:lightsail:us-east-1:123456789012:Instance/test-instance');
      expect(result.environmentVariables['LIGHTSAIL_INSTANCE_STATE']).toBe('running');
      expect(result.environmentVariables['LIGHTSAIL_INSTANCE_TYPE']).toBe('nano_2_0');
      expect(result.environmentVariables['LIGHTSAIL_INSTANCE_IP']).toBe('54.123.45.67');
      expect(result.environmentVariables['LIGHTSAIL_INSTANCE_PRIVATE_IP']).toBe('10.0.1.5');
      
      // Assert IAM policies include Lightsail instance read actions
      const instancePolicy = result.iamPolicies.find(p => p.description.includes('instance') && p.description.includes('read'));
      expect(instancePolicy).toBeDefined();
      expect(instancePolicy!.statement.actions).toContain('lightsail:GetInstance');
      expect(instancePolicy!.statement.resources).toEqual(['arn:aws:lightsail:us-east-1:123456789012:Instance/test-instance']);
      
      expect(result.securityGroupRules).toEqual([]);
    });
  });

  describe('LightsailBind__InstanceWriteAccess__GrantsInstanceWriteActions', () => {
    const metadata = {
      id: 'TP-binders-lightsail-002',
      level: 'unit' as const,
      capability: 'Grants Lightsail instance write actions including CreateInstances and UpdateInstance for write access',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: {
        pattern: 'Feature__Condition__ExpectedOutcome',
        feature: 'LightsailBind',
        condition: 'InstanceWriteAccess',
        outcome: 'GrantsInstanceWriteActions'
      },
      invariants: [
        'IAM policies include Lightsail instance write actions (CreateInstances, UpdateInstance, DeleteInstance, RebootInstance)',
        'Read actions are included in write access',
        'Resources include instance ARN'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with lightsail:instance capability and write access',
        notes: 'Lightsail instance write access with instance management permissions'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('LightsailBind__InstanceWriteAccess__GrantsInstanceWriteActions', async () => {
      const strategy = new LightsailBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('lightsail-instance', {
        'lightsail:instance': {
          type: 'lightsail:instance',
          instanceArn: 'arn:aws:lightsail:us-east-1:123456789012:Instance/test-instance',
          instanceName: 'test-instance',
          state: { name: 'running' },
          bundleId: 'nano_2_0'
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'lightsail:instance',
        access: 'write'
      });

      const result = await executeUnifiedBinding(strategy, context);

      // Primary assertion: Write actions are granted
      const writePolicy = result.iamPolicies.find(p => p.description.includes('instance') && p.description.includes('write'));
      expect(writePolicy).toBeDefined();
      expect(writePolicy!.statement.actions).toContain('lightsail:CreateInstances');
      expect(writePolicy!.statement.actions).toContain('lightsail:UpdateInstance');
      expect(writePolicy!.statement.actions).toContain('lightsail:DeleteInstance');
      expect(writePolicy!.statement.actions).toContain('lightsail:RebootInstance');
      expect(writePolicy!.statement.actions).toContain('lightsail:GetInstance');
    });
  });

  describe('LightsailBind__ValidDatabaseAccess__ReturnsDatabaseEnvVars', () => {
    const metadata = {
      id: 'TP-binders-lightsail-003',
      level: 'unit' as const,
      capability: 'Returns Lightsail database environment variables for valid database access',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: {
        pattern: 'Feature__Condition__ExpectedOutcome',
        feature: 'LightsailBind',
        condition: 'ValidDatabaseAccess',
        outcome: 'ReturnsDatabaseEnvVars'
      },
      invariants: [
        'Environment variables include LIGHTSAIL_DATABASE_NAME, LIGHTSAIL_DATABASE_ARN, LIGHTSAIL_DATABASE_ENDPOINT',
        'IAM policies include Lightsail database read actions',
        'Master user password access is granted when master username is provided'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with lightsail:database capability and read access',
        notes: 'Basic Lightsail database read access binding'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('LightsailBind__ValidDatabaseAccess__ReturnsDatabaseEnvVars', async () => {
      const strategy = new LightsailBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('lightsail-database', {
        'lightsail:database': {
          type: 'lightsail:database',
          databaseArn: 'arn:aws:lightsail:us-east-1:123456789012:RelationalDatabase/test-db',
          relationalDatabaseName: 'test-db',
          relationalDatabaseBlueprintId: 'mysql_8_0',
          relationalDatabaseBundleId: 'mysql_8_0_t3_micro_1v',
          masterEndpoint: {
            address: 'test-db.abc123.us-east-1.rds.amazonaws.com',
            port: 3306
          },
          masterUsername: 'admin'
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'lightsail:database',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: Database environment variables are set
      expect(result.environmentVariables['LIGHTSAIL_DATABASE_NAME']).toBe('test-db');
      expect(result.environmentVariables['LIGHTSAIL_DATABASE_ARN']).toBe('arn:aws:lightsail:us-east-1:123456789012:RelationalDatabase/test-db');
      expect(result.environmentVariables['LIGHTSAIL_DATABASE_ENGINE']).toBe('mysql_8_0');
      expect(result.environmentVariables['LIGHTSAIL_DATABASE_ENDPOINT']).toBe('test-db.abc123.us-east-1.rds.amazonaws.com');
      expect(result.environmentVariables['LIGHTSAIL_DATABASE_PORT']).toBe('3306');
      expect(result.environmentVariables['LIGHTSAIL_DATABASE_USERNAME']).toBe('admin');
      
      // Assert IAM policies include master user password access
      const passwordPolicy = result.iamPolicies.find(p => p.description.includes('Master user password'));
      expect(passwordPolicy).toBeDefined();
      expect(passwordPolicy!.statement.actions).toContain('lightsail:GetRelationalDatabaseMasterUserPassword');
      expect(passwordPolicy!.statement.resources).toEqual(['arn:aws:lightsail:us-east-1:123456789012:RelationalDatabase/test-db']);
    });
  });

  describe('LightsailBind__ValidLoadBalancerAccess__ReturnsLoadBalancerEnvVars', () => {
    const metadata = {
      id: 'TP-binders-lightsail-004',
      level: 'unit' as const,
      capability: 'Returns Lightsail load balancer environment variables for valid load balancer access',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: {
        pattern: 'Feature__Condition__ExpectedOutcome',
        feature: 'LightsailBind',
        condition: 'ValidLoadBalancerAccess',
        outcome: 'ReturnsLoadBalancerEnvVars'
      },
      invariants: [
        'Environment variables include LIGHTSAIL_LOAD_BALANCER_NAME, LIGHTSAIL_LOAD_BALANCER_ARN, LIGHTSAIL_LOAD_BALANCER_DNS_NAME',
        'IAM policies include Lightsail load balancer read actions',
        'Health check and TLS certificate information are exposed when provided'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with lightsail:load-balancer capability and read access',
        notes: 'Basic Lightsail load balancer read access binding'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('LightsailBind__ValidLoadBalancerAccess__ReturnsLoadBalancerEnvVars', async () => {
      const strategy = new LightsailBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('lightsail-load-balancer', {
        'lightsail:load-balancer': {
          type: 'lightsail:load-balancer',
          loadBalancerArn: 'arn:aws:lightsail:us-east-1:123456789012:LoadBalancer/test-lb',
          loadBalancerName: 'test-lb',
          dnsName: 'test-lb-123456789.us-east-1.elb.amazonaws.com',
          state: { name: 'active' },
          healthCheck: {
            path: '/health',
            intervalSeconds: 30,
            timeoutSeconds: 5,
            healthyThresholdCount: 2
          },
          tlsCertificateSummaries: [
            { name: 'test-cert' }
          ]
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'lightsail:load-balancer',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: Load balancer environment variables are set
      expect(result.environmentVariables['LIGHTSAIL_LOAD_BALANCER_NAME']).toBe('test-lb');
      expect(result.environmentVariables['LIGHTSAIL_LOAD_BALANCER_ARN']).toBe('arn:aws:lightsail:us-east-1:123456789012:LoadBalancer/test-lb');
      expect(result.environmentVariables['LIGHTSAIL_LOAD_BALANCER_DNS_NAME']).toBe('test-lb-123456789.us-east-1.elb.amazonaws.com');
      expect(result.environmentVariables['LIGHTSAIL_HEALTH_CHECK_PATH']).toBe('/health');
      expect(result.environmentVariables['LIGHTSAIL_TLS_CERTIFICATES']).toBe('test-cert');
    });
  });

  describe('LightsailBind__ValidContainerServiceAccess__ReturnsContainerServiceEnvVars', () => {
    const metadata = {
      id: 'TP-binders-lightsail-005',
      level: 'unit' as const,
      capability: 'Returns Lightsail container service environment variables for valid container service access',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: {
        pattern: 'Feature__Condition__ExpectedOutcome',
        feature: 'LightsailBind',
        condition: 'ValidContainerServiceAccess',
        outcome: 'ReturnsContainerServiceEnvVars'
      },
      invariants: [
        'Environment variables include LIGHTSAIL_CONTAINER_SERVICE_NAME, LIGHTSAIL_CONTAINER_SERVICE_ARN, LIGHTSAIL_CONTAINER_SERVICE_URL',
        'IAM policies include Lightsail container service read actions',
        'ECR access is granted when container images are provided'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with lightsail:container-service capability and read access',
        notes: 'Basic Lightsail container service read access binding'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('LightsailBind__ValidContainerServiceAccess__ReturnsContainerServiceEnvVars', async () => {
      const strategy = new LightsailBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('lightsail-container-service', {
        'lightsail:container-service': {
          type: 'lightsail:container-service',
          containerServiceArn: 'arn:aws:lightsail:us-east-1:123456789012:ContainerService/test-service',
          containerServiceName: 'test-service',
          state: { name: 'active' },
          url: 'https://test-service.abc123.us-east-1.cs.amazonlightsail.com',
          power: 'nano',
          scale: 1,
          containerImages: [
            {
              image: '123456789012.dkr.ecr.us-east-1.amazonaws.com/test-repo:latest',
              ecrRepositoryArn: 'arn:aws:ecr:us-east-1:123456789012:repository/test-repo'
            }
          ]
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'lightsail:container-service',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: Container service environment variables are set
      expect(result.environmentVariables['LIGHTSAIL_CONTAINER_SERVICE_NAME']).toBe('test-service');
      expect(result.environmentVariables['LIGHTSAIL_CONTAINER_SERVICE_ARN']).toBe('arn:aws:lightsail:us-east-1:123456789012:ContainerService/test-service');
      expect(result.environmentVariables['LIGHTSAIL_CONTAINER_SERVICE_URL']).toBe('https://test-service.abc123.us-east-1.cs.amazonlightsail.com');
      expect(result.environmentVariables['LIGHTSAIL_POWER']).toBe('nano');
      expect(result.environmentVariables['LIGHTSAIL_SCALE']).toBe('1');
      expect(result.environmentVariables['LIGHTSAIL_CONTAINER_IMAGES']).toBe('123456789012.dkr.ecr.us-east-1.amazonaws.com/test-repo:latest');
      
      // Assert IAM policies include ECR access
      const ecrPolicy = result.iamPolicies.find(p => p.description.includes('ECR'));
      expect(ecrPolicy).toBeDefined();
      expect(ecrPolicy!.statement.actions).toContain('ecr:GetAuthorizationToken');
      expect(ecrPolicy!.statement.resources).toEqual(['arn:aws:ecr:us-east-1:123456789012:repository/test-repo']);
    });
  });

  describe('LightsailBind__SecureAccessEnabled__ConfiguresSecureFeatures', () => {
    const metadata = {
      id: 'TP-binders-lightsail-006',
      level: 'unit' as const,
      capability: 'Configures secure access features when requireSecureAccess is enabled',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: {
        pattern: 'Feature__Condition__ExpectedOutcome',
        feature: 'LightsailBind',
        condition: 'SecureAccessEnabled',
        outcome: 'ConfiguresSecureFeatures'
      },
      invariants: [
        'Instance secure access configures SSH key and secure ports',
        'Database secure access configures SSL, backup retention, and maintenance window',
        'Secure access configuration is optional and only applied when requireSecureAccess is true'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with lightsail:instance and lightsail:database capabilities with requireSecureAccess option',
        notes: 'Lightsail bindings with secure access enabled'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('LightsailBind__SecureInstanceAccess__ConfiguresSecureInstanceFeatures', async () => {
      const strategy = new LightsailBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('lightsail-instance', {
        'lightsail:instance': {
          type: 'lightsail:instance',
          instanceArn: 'arn:aws:lightsail:us-east-1:123456789012:Instance/test-instance',
          instanceName: 'test-instance',
          state: { name: 'running' },
          bundleId: 'nano_2_0',
          sshKeyName: 'test-key',
          networking: {
            ports: [
              { fromPort: 22, toPort: 22, protocol: 'tcp' },
              { fromPort: 443, toPort: 443, protocol: 'tcp' },
              { fromPort: 80, toPort: 80, protocol: 'tcp' }
            ]
          }
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'lightsail:instance',
        access: 'read',
        options: {
          requireSecureAccess: true
        }
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: Secure instance features are configured
      expect(result.environmentVariables['LIGHTSAIL_SSH_KEY_NAME']).toBe('test-key');
      expect(result.environmentVariables['LIGHTSAIL_SSH_ACCESS_ENABLED']).toBe('true');
      expect(result.environmentVariables['LIGHTSAIL_MONITORING_ENABLED']).toBe('true');
      
      // Assert secure ports are filtered (only 22 and 443)
      const securePorts = JSON.parse(result.environmentVariables['LIGHTSAIL_SECURE_PORTS']);
      expect(securePorts.length).toBe(2);
      expect(securePorts.some((p: any) => p.fromPort === 22)).toBe(true);
      expect(securePorts.some((p: any) => p.fromPort === 443)).toBe(true);
    });

    test('LightsailBind__SecureDatabaseAccess__ConfiguresSecureDatabaseFeatures', async () => {
      const strategy = new LightsailBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('lightsail-database', {
        'lightsail:database': {
          type: 'lightsail:database',
          databaseArn: 'arn:aws:lightsail:us-east-1:123456789012:RelationalDatabase/test-db',
          relationalDatabaseName: 'test-db',
          relationalDatabaseBlueprintId: 'mysql_8_0',
          relationalDatabaseBundleId: 'mysql_8_0_t3_micro_1v',
          masterEndpoint: {
            address: 'test-db.abc123.us-east-1.rds.amazonaws.com',
            port: 3306
          },
          backupRetentionEnabled: true,
          parameterApplyStatus: 'applied',
          preferredMaintenanceWindow: 'mon:03:00-mon:04:00'
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'lightsail:database',
        access: 'read',
        options: {
          requireSecureAccess: true,
          backupRetentionDays: 14
        }
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: Secure database features are configured
      expect(result.environmentVariables['LIGHTSAIL_DATABASE_SSL_ENABLED']).toBe('true');
      expect(result.environmentVariables['LIGHTSAIL_BACKUP_RETENTION_ENABLED']).toBe('true');
      expect(result.environmentVariables['LIGHTSAIL_BACKUP_RETENTION_DAYS']).toBe('14');
      expect(result.environmentVariables['LIGHTSAIL_PARAMETER_APPLY_STATUS']).toBe('applied');
      expect(result.environmentVariables['LIGHTSAIL_MAINTENANCE_WINDOW']).toBe('mon:03:00-mon:04:00');
    });
  });

  describe('LightsailBind__ValidStaticIpAccess__ReturnsStaticIpEnvVars', () => {
    const metadata = {
      id: 'TP-binders-lightsail-005',
      level: 'unit' as const,
      capability: 'Returns Lightsail static IP environment variables for valid static IP access',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: {
        pattern: 'Feature__Condition__ExpectedOutcome',
        feature: 'LightsailBind',
        condition: 'ValidStaticIpAccess',
        outcome: 'ReturnsStaticIpEnvVars'
      },
      invariants: [
        'Environment variables include LIGHTSAIL_STATIC_IP_NAME, LIGHTSAIL_STATIC_IP_ARN, LIGHTSAIL_STATIC_IP_ADDRESS',
        'IAM policies include Lightsail static IP read actions',
        'Attached resource is exposed when static IP is attached'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with lightsail:static-ip capability and read access',
        notes: 'Basic Lightsail static IP read access binding'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('LightsailBind__ValidStaticIpAccess__ReturnsStaticIpEnvVars', async () => {
      const strategy = new LightsailBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('lightsail-static-ip', {
        'lightsail:static-ip': {
          type: 'lightsail:static-ip',
          staticIpArn: 'arn:aws:lightsail:us-east-1:123456789012:StaticIp/test-static-ip',
          staticIpName: 'test-static-ip',
          ipAddress: '54.123.45.67',
          attachedTo: 'test-instance',
          isAttached: true
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'lightsail:static-ip',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: Static IP environment variables are set
      expect(result.environmentVariables['LIGHTSAIL_STATIC_IP_NAME']).toBe('test-static-ip');
      expect(result.environmentVariables['LIGHTSAIL_STATIC_IP_ARN']).toBe('arn:aws:lightsail:us-east-1:123456789012:StaticIp/test-static-ip');
      expect(result.environmentVariables['LIGHTSAIL_STATIC_IP_ADDRESS']).toBe('54.123.45.67');
      expect(result.environmentVariables['LIGHTSAIL_STATIC_IP_ATTACHED']).toBe('true');
      expect(result.environmentVariables['LIGHTSAIL_STATIC_IP_ATTACHED_TO']).toBe('test-instance');
      
      // Assert IAM policies include Lightsail static IP read actions
      const staticIpPolicy = result.iamPolicies.find(p => p.description.includes('static IP') && p.description.includes('read'));
      expect(staticIpPolicy).toBeDefined();
      expect(staticIpPolicy!.statement.actions).toContain('lightsail:GetStaticIp');
      expect(staticIpPolicy!.statement.resources).toEqual(['arn:aws:lightsail:us-east-1:123456789012:StaticIp/test-static-ip']);
    });
  });

  describe('LightsailBind__ValidDistributionAccess__ReturnsDistributionEnvVars', () => {
    const metadata = {
      id: 'TP-binders-lightsail-006',
      level: 'unit' as const,
      capability: 'Returns Lightsail distribution environment variables for valid distribution access',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: {
        pattern: 'Feature__Condition__ExpectedOutcome',
        feature: 'LightsailBind',
        condition: 'ValidDistributionAccess',
        outcome: 'ReturnsDistributionEnvVars'
      },
      invariants: [
        'Environment variables include LIGHTSAIL_DISTRIBUTION_NAME, LIGHTSAIL_DISTRIBUTION_ARN, LIGHTSAIL_DISTRIBUTION_DOMAIN',
        'IAM policies include Lightsail distribution read actions',
        'Origin and cache behavior configuration is exposed',
        'SSL certificate name is exposed when provided'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with lightsail:distribution capability and read access',
        notes: 'Basic Lightsail distribution read access binding'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('LightsailBind__ValidDistributionAccess__ReturnsDistributionEnvVars', async () => {
      const strategy = new LightsailBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('lightsail-distribution', {
        'lightsail:distribution': {
          type: 'lightsail:distribution',
          distributionArn: 'arn:aws:lightsail:us-east-1:123456789012:Distribution/test-distribution',
          distributionName: 'test-distribution',
          domainName: 'test-distribution.cloudfront.net',
          status: 'Deployed',
          origin: {
            name: 'test-origin',
            region: 'us-east-1',
            protocolPolicy: 'https-only'
          },
          defaultCacheBehavior: {
            behavior: 'cache',
            cachePolicyId: 'test-cache-policy'
          },
          certificateName: 'test-cert',
          isEnabled: true
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'lightsail:distribution',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: Distribution environment variables are set
      expect(result.environmentVariables['LIGHTSAIL_DISTRIBUTION_NAME']).toBe('test-distribution');
      expect(result.environmentVariables['LIGHTSAIL_DISTRIBUTION_ARN']).toBe('arn:aws:lightsail:us-east-1:123456789012:Distribution/test-distribution');
      expect(result.environmentVariables['LIGHTSAIL_DISTRIBUTION_DOMAIN']).toBe('test-distribution.cloudfront.net');
      expect(result.environmentVariables['LIGHTSAIL_DISTRIBUTION_STATUS']).toBe('Deployed');
      expect(result.environmentVariables['LIGHTSAIL_DISTRIBUTION_ENABLED']).toBe('true');
      expect(result.environmentVariables['LIGHTSAIL_DISTRIBUTION_ORIGIN_NAME']).toBe('test-origin');
      expect(result.environmentVariables['LIGHTSAIL_DISTRIBUTION_ORIGIN_REGION']).toBe('us-east-1');
      expect(result.environmentVariables['LIGHTSAIL_DISTRIBUTION_ORIGIN_PROTOCOL']).toBe('https-only');
      expect(result.environmentVariables['LIGHTSAIL_DISTRIBUTION_CACHE_BEHAVIOR']).toBe('cache');
      expect(result.environmentVariables['LIGHTSAIL_DISTRIBUTION_CACHE_POLICY_ID']).toBe('test-cache-policy');
      expect(result.environmentVariables['LIGHTSAIL_DISTRIBUTION_CERTIFICATE_NAME']).toBe('test-cert');
      
      // Assert IAM policies include Lightsail distribution read actions
      const distributionPolicy = result.iamPolicies.find(p => p.description.includes('distribution') && p.description.includes('read'));
      expect(distributionPolicy).toBeDefined();
      expect(distributionPolicy!.statement.actions).toContain('lightsail:GetDistribution');
      expect(distributionPolicy!.statement.resources).toEqual(['arn:aws:lightsail:us-east-1:123456789012:Distribution/test-distribution']);
    });
  });

  describe('LightsailBind__CustomActionsOverride__ReplacesCoarseActions', () => {
    const metadata = {
      id: 'TP-binders-compute-lightsail-010',
      level: 'unit' as const,
      capability: 'Custom actions override replaces default Lightsail actions',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'LightsailBind__Condition__Outcome', example: 'LightsailBind__CustomActionsOverride__ReplacesCoarseActions' },
      invariants: [
        'IAM policy actions match provided custom actions array',
        'Default Lightsail actions are not included when custom actions provided',
        'Actions array is used directly (replaces coarse access)'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with lightsail:instance capability and directive.actions array',
        notes: 'Granular actions override test'
      },
      risks: [],
      dependencies: ['action-resolver'],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('LightsailBind__CustomActionsOverride__ReplacesCoarseActions', async () => {
      const strategy = new LightsailBinderStrategy();
      const customActions = ['lightsail:GetInstances', 'lightsail:GetInstance'];
      const target = createMockTargetComponent('lightsail-instance', {
        'lightsail:instance': {
          type: 'lightsail:instance',
          instanceArn: 'arn:aws:lightsail:us-east-1:123456789012:Instance/test-instance',
          instanceName: 'test-instance',
          state: { name: 'running' },
          bundleId: 'nano_2_0'
        }
      });

      const context = createBindingContext({
        source: createMockSourceComponent(),
        target,
        capability: 'lightsail:instance',
        access: 'read',
        actions: customActions
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      expect(result.iamPolicies.length).toBeGreaterThan(0);
      const policy = result.iamPolicies.find(p => p.description.includes('instance'));
      expect(policy).toBeDefined();
      
      const statementJson = policy!.statement.toStatementJson();
      const actions = Array.isArray(statementJson.Action)
        ? statementJson.Action
        : [statementJson.Action];

      expect(actions).toEqual(expect.arrayContaining(customActions));
      expect(actions.length).toBe(customActions.length);
    });
  });
});
