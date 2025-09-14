// tests/unit/observability/observability-binder-strategy.test.ts
// Unit tests for ObservabilityBinderStrategy

import { ObservabilityBinderStrategy } from '../../../src/platform/contracts/observability/observability-binder-strategy';
import { ObservabilityConfigFactory } from '../../../src/platform/contracts/observability/observability-config-factory';
import { ComplianceFramework, Capability, PostgresCapabilityData } from '../../../src/platform/contracts/bindings';
import { EnhancedBindingContext } from '../../../src/platform/contracts/bindings';

// Mock components for testing
class MockComponent {
  constructor(
    public name: string,
    public type: string,
    public id: string = `${type}-${name}`
  ) { }

  getName(): string { return this.name; }
  getServiceName(): string { return this.name; }
  getType(): string { return this.type; }
  getId(): string { return this.id; }
  getCapabilityData(): PostgresCapabilityData {
    return {
      type: 'db:postgres',
      endpoints: {
        host: 'localhost',
        port: 5432,
        database: 'testdb'
      },
      resources: {
        arn: 'arn:aws:rds:us-east-1:123456789012:db:testdb',
        clusterArn: 'arn:aws:rds:us-east-1:123456789012:cluster:testdb-cluster'
      },
      secrets: {
        masterSecretArn: 'arn:aws:secretsmanager:us-east-1:123456789012:secret:test-secret'
      },
      securityGroups: ['sg-12345678'],
      subnetGroup: 'testdb-subnet-group'
    };
  }
}

describe('ObservabilityBinderStrategy', () => {
  let strategy: ObservabilityBinderStrategy;
  let mockContext: EnhancedBindingContext;

  beforeEach(() => {
    const sourceComponent = new MockComponent('user-service', 'lambda-api');
    const targetComponent = new MockComponent('user-database', 'rds-postgres');

    mockContext = {
      source: sourceComponent,
      target: targetComponent,
      directive: {
        capability: 'db:postgres' as Capability,
        access: 'read' as any
      },
      environment: 'dev',
      complianceFramework: 'commercial' as ComplianceFramework,
      targetCapabilityData: targetComponent.getCapabilityData()
    };
  });

  describe('constructor and basic methods', () => {
    it('should create strategy with commercial framework', () => {
      strategy = new ObservabilityBinderStrategy('commercial');
      expect(strategy.getStrategyName()).toBe('ObservabilityBinderStrategy');
    });

    it('should create strategy with FedRAMP Moderate framework', () => {
      strategy = new ObservabilityBinderStrategy('fedramp-moderate');
      expect(strategy.getStrategyName()).toBe('ObservabilityBinderStrategy');
    });

    it('should create strategy with FedRAMP High framework', () => {
      strategy = new ObservabilityBinderStrategy('fedramp-high');
      expect(strategy.getStrategyName()).toBe('ObservabilityBinderStrategy');
    });

    it('should handle all component types', () => {
      strategy = new ObservabilityBinderStrategy('commercial');

      expect(strategy.canHandle('lambda-api', 'db:postgres' as Capability)).toBe(true);
      expect(strategy.canHandle('ecs-fargate-service', 'storage:s3' as Capability)).toBe(true);
      expect(strategy.canHandle('ec2-instance', 'queue:sqs' as Capability)).toBe(true);
      expect(strategy.canHandle('api-gateway-rest', 'topic:sns' as Capability)).toBe(true);
    });
  });

  describe('bind method', () => {
    beforeEach(() => {
      strategy = new ObservabilityBinderStrategy('commercial');
    });

    it('should create observability binding result', async () => {
      const result = await strategy.bind(mockContext);

      expect(result).toBeDefined();
      expect(result.environmentVariables).toBeDefined();
      expect(result.iamPolicies).toBeDefined();
      expect(result.securityGroupRules).toBeDefined();
      expect(result.complianceActions).toBeDefined();
      expect(result.metadata).toBeDefined();
    });

    it('should include observability metadata', async () => {
      const result = await strategy.bind(mockContext);

      expect((result.metadata as any)?.observability).toBeDefined();
      expect((result.metadata as any)?.observability.config).toBeDefined();
      expect((result.metadata as any)?.observability.cloudWatchLogGroups).toBeDefined();
      expect((result.metadata as any)?.observability.xrayConfigurations).toBeDefined();
    });

    it('should create environment variables for observability', async () => {
      const result = await strategy.bind(mockContext);

      expect(result.environmentVariables).toHaveProperty('OTEL_SERVICE_NAME');
      expect(result.environmentVariables).toHaveProperty('OTEL_SERVICE_VERSION');
      expect(result.environmentVariables).toHaveProperty('AWS_XRAY_TRACING_NAME');
      expect(result.environmentVariables).toHaveProperty('LOG_LEVEL');
      expect(result.environmentVariables).toHaveProperty('COMPLIANCE_FRAMEWORK');
    });

    it('should create IAM policies for observability', async () => {
      const result = await strategy.bind(mockContext);

      expect(result.iamPolicies.length).toBeGreaterThan(0);

      const cloudWatchPolicy = result.iamPolicies.find((p: any) =>
        p.description.includes('CloudWatch Logs')
      );
      expect(cloudWatchPolicy).toBeDefined();
      expect(cloudWatchPolicy?.complianceRequirement).toContain('LOGS-001');

      const xrayPolicy = result.iamPolicies.find((p: any) =>
        p.description.includes('X-Ray')
      );
      expect(xrayPolicy).toBeDefined();
      expect(xrayPolicy?.complianceRequirement).toContain('XRAY-001');
    });

    it('should create compliance actions', async () => {
      const result = await strategy.bind(mockContext);

      expect(result.complianceActions.length).toBeGreaterThan(0);

      const frameworkAction = result.complianceActions.find((a: any) =>
        a.action.includes('COMPLIANCE')
      );
      expect(frameworkAction).toBeDefined();
    });
  });

  describe('FedRAMP Moderate configuration', () => {
    beforeEach(() => {
      strategy = new ObservabilityBinderStrategy('fedramp-moderate');
      mockContext.complianceFramework = 'fedramp-moderate';
    });

    it('should include FedRAMP-specific environment variables', async () => {
      const result = await strategy.bind(mockContext);

      expect(result.environmentVariables).toHaveProperty('COMPLIANCE_AUDIT_ENABLED');
      expect(result.environmentVariables).toHaveProperty('COMPLIANCE_FRAMEWORK');
      expect(result.environmentVariables).toHaveProperty('COMPLIANCE_TIER');
      expect(result.environmentVariables.COMPLIANCE_FRAMEWORK).toBe('fedramp-moderate');
    });

    it('should create enhanced compliance actions', async () => {
      const result = await strategy.bind(mockContext);

      const auditAction = result.complianceActions.find((a: any) =>
        a.action === 'ENHANCED_AUDIT_LOGGING'
      );
      expect(auditAction).toBeDefined();
      expect((auditAction as any)?.description).toContain('FedRAMP Moderate');
    });
  });

  describe('FedRAMP High configuration', () => {
    beforeEach(() => {
      strategy = new ObservabilityBinderStrategy('fedramp-high');
      mockContext.complianceFramework = 'fedramp-high';
    });

    it('should include FedRAMP High-specific environment variables', async () => {
      const result = await strategy.bind(mockContext);

      expect(result.environmentVariables).toHaveProperty('FIPS_COMPLIANCE_REQUIRED');
      expect(result.environmentVariables).toHaveProperty('STIG_HARDENING_ENABLED');
      expect(result.environmentVariables).toHaveProperty('EXTENDED_RETENTION_ENABLED');
      expect(result.environmentVariables.FIPS_COMPLIANCE_REQUIRED).toBe('true');
      expect(result.environmentVariables.STIG_HARDENING_ENABLED).toBe('true');
      expect(result.environmentVariables.EXTENDED_RETENTION_ENABLED).toBe('true');
    });

    it('should create high-security compliance actions', async () => {
      const result = await strategy.bind(mockContext);

      const fipsAction = result.complianceActions.find((a: any) =>
        a.action === 'FIPS_COMPLIANCE'
      );
      expect(fipsAction).toBeDefined();
      expect((fipsAction as any)?.description).toContain('FIPS-140-2');

      const stigAction = result.complianceActions.find((a: any) =>
        a.action === 'STIG_HARDENING'
      );
      expect(stigAction).toBeDefined();
      expect((stigAction as any)?.description).toContain('STIG-hardened');

      const retentionAction = result.complianceActions.find((a: any) =>
        a.action === 'EXTENDED_RETENTION'
      );
      expect(retentionAction).toBeDefined();
      expect((retentionAction as any)?.description).toContain('7 years');
    });
  });

  describe('static methods', () => {
    describe('getObservabilityConfig', () => {
      it('should return configuration for commercial framework', () => {
        const config = ObservabilityBinderStrategy.getObservabilityConfig('commercial');
        expect(config.framework).toBe('commercial');
        expect(config.tier).toBe('commercial');
      });

      it('should return configuration for FedRAMP Moderate framework', () => {
        const config = ObservabilityBinderStrategy.getObservabilityConfig('fedramp-moderate');
        expect(config.framework).toBe('fedramp-moderate');
        expect(config.tier).toBe('fedramp-moderate');
      });

      it('should return configuration for FedRAMP High framework', () => {
        const config = ObservabilityBinderStrategy.getObservabilityConfig('fedramp-high');
        expect(config.framework).toBe('fedramp-high');
        expect(config.tier).toBe('fedramp-high');
      });
    });

    describe('isObservabilityRequired', () => {
      it('should return true for most component types', () => {
        expect(ObservabilityBinderStrategy.isObservabilityRequired('lambda-api')).toBe(true);
        expect(ObservabilityBinderStrategy.isObservabilityRequired('ecs-fargate-service')).toBe(true);
        expect(ObservabilityBinderStrategy.isObservabilityRequired('ec2-instance')).toBe(true);
        expect(ObservabilityBinderStrategy.isObservabilityRequired('rds-postgres')).toBe(true);
      });

      it('should return false for exempt component types', () => {
        expect(ObservabilityBinderStrategy.isObservabilityRequired('vpc')).toBe(false);
        expect(ObservabilityBinderStrategy.isObservabilityRequired('subnet')).toBe(false);
        expect(ObservabilityBinderStrategy.isObservabilityRequired('route-table')).toBe(false);
        expect(ObservabilityBinderStrategy.isObservabilityRequired('internet-gateway')).toBe(false);
      });
    });

    describe('getObservabilityStrategy', () => {
      it('should return lambda strategy for Lambda components', () => {
        expect(ObservabilityBinderStrategy.getObservabilityStrategy('lambda-api')).toBe('lambda');
        expect(ObservabilityBinderStrategy.getObservabilityStrategy('lambda-worker')).toBe('lambda');
        expect(ObservabilityBinderStrategy.getObservabilityStrategy('function')).toBe('lambda');
      });

      it('should return container strategy for container components', () => {
        expect(ObservabilityBinderStrategy.getObservabilityStrategy('ecs-fargate-service')).toBe('container');
        expect(ObservabilityBinderStrategy.getObservabilityStrategy('container-application')).toBe('container');
        expect(ObservabilityBinderStrategy.getObservabilityStrategy('docker')).toBe('container');
      });

      it('should return vm strategy for VM components', () => {
        expect(ObservabilityBinderStrategy.getObservabilityStrategy('ec2-instance')).toBe('vm');
        expect(ObservabilityBinderStrategy.getObservabilityStrategy('instance')).toBe('vm');
        expect(ObservabilityBinderStrategy.getObservabilityStrategy('vm')).toBe('vm');
      });

      it('should return api strategy for API components', () => {
        expect(ObservabilityBinderStrategy.getObservabilityStrategy('api-gateway-rest')).toBe('api');
        expect(ObservabilityBinderStrategy.getObservabilityStrategy('api-gateway-http')).toBe('api');
        expect(ObservabilityBinderStrategy.getObservabilityStrategy('api')).toBe('api');
      });

      it('should return database strategy for database components', () => {
        expect(ObservabilityBinderStrategy.getObservabilityStrategy('rds-postgres')).toBe('database');
        expect(ObservabilityBinderStrategy.getObservabilityStrategy('rds-mysql')).toBe('database');
        expect(ObservabilityBinderStrategy.getObservabilityStrategy('database')).toBe('database');
      });

      it('should return container as default strategy', () => {
        expect(ObservabilityBinderStrategy.getObservabilityStrategy('unknown-component')).toBe('container');
      });
    });

    describe('validateObservabilityConfig', () => {
      it('should return no violations for valid commercial config', () => {
        const config = ObservabilityConfigFactory.createConfig('commercial');
        const violations = ObservabilityBinderStrategy.validateObservabilityConfig(config);
        expect(violations).toHaveLength(0);
      });

      it('should return no violations for valid FedRAMP Moderate config', () => {
        const config = ObservabilityConfigFactory.createConfig('fedramp-moderate');
        const violations = ObservabilityBinderStrategy.validateObservabilityConfig(config);
        expect(violations).toHaveLength(0);
      });

      it('should return no violations for valid FedRAMP High config', () => {
        const config = ObservabilityConfigFactory.createConfig('fedramp-high');
        const violations = ObservabilityBinderStrategy.validateObservabilityConfig(config);
        expect(violations).toHaveLength(0);
      });

      it('should detect FIPS compliance violation', () => {
        const config = ObservabilityConfigFactory.createConfig('fedramp-high');
        config.security.fipsCompliant = false; // Simulate violation

        const violations = ObservabilityBinderStrategy.validateObservabilityConfig(config);
        expect(violations.length).toBeGreaterThan(0);

        const fipsViolation = violations.find(v => v.rule === 'FEDRAMP-HIGH-FIPS-001');
        expect(fipsViolation).toBeDefined();
        expect(fipsViolation?.severity).toBe('error');
      });

      it('should detect STIG hardening violation', () => {
        const config = ObservabilityConfigFactory.createConfig('fedramp-high');
        config.security.stigHardened = false; // Simulate violation

        const violations = ObservabilityBinderStrategy.validateObservabilityConfig(config);
        expect(violations.length).toBeGreaterThan(0);

        const stigViolation = violations.find(v => v.rule === 'FEDRAMP-HIGH-STIG-001');
        expect(stigViolation).toBeDefined();
        expect(stigViolation?.severity).toBe('error');
      });

      it('should detect audit logging violation', () => {
        const config = ObservabilityConfigFactory.createConfig('fedramp-moderate');
        config.logging.auditLogging = false; // Simulate violation

        const violations = ObservabilityBinderStrategy.validateObservabilityConfig(config);
        expect(violations.length).toBeGreaterThan(0);

        const auditViolation = violations.find(v => v.rule === 'FEDRAMP-MODERATE-AUDIT-001');
        expect(auditViolation).toBeDefined();
        expect(auditViolation?.severity).toBe('error');
      });

      it('should detect encryption violations', () => {
        const config = ObservabilityConfigFactory.createConfig('commercial');
        config.security.encryptionAtRest = false; // Simulate violation
        config.security.encryptionInTransit = false; // Simulate violation

        const violations = ObservabilityBinderStrategy.validateObservabilityConfig(config);
        expect(violations.length).toBeGreaterThan(0);

        const restViolation = violations.find(v => v.rule === 'COMPLIANCE-ENCRYPTION-001');
        expect(restViolation).toBeDefined();

        const transitViolation = violations.find(v => v.rule === 'COMPLIANCE-ENCRYPTION-002');
        expect(transitViolation).toBeDefined();
      });
    });

    describe('getObservabilityRecommendations', () => {
      it('should return recommendations for low sampling rate', () => {
        const config = ObservabilityConfigFactory.createConfig('commercial');
        config.tracing.samplingRate = 0.05; // Very low sampling rate

        const recommendations = ObservabilityBinderStrategy.getObservabilityRecommendations(config);
        expect(recommendations.length).toBeGreaterThan(0);

        const samplingRecommendation = recommendations.find(r =>
          r.recommendation === 'INCREASE_TRACE_SAMPLING'
        );
        expect(samplingRecommendation).toBeDefined();
        expect(samplingRecommendation?.priority).toBe('high');
      });

      it('should return recommendations for high metric interval', () => {
        const config = ObservabilityConfigFactory.createConfig('commercial');
        config.metrics.collectionInterval = 120; // High interval

        const recommendations = ObservabilityBinderStrategy.getObservabilityRecommendations(config);
        expect(recommendations.length).toBeGreaterThan(0);

        const intervalRecommendation = recommendations.find(r =>
          r.recommendation === 'DECREASE_METRIC_INTERVAL'
        );
        expect(intervalRecommendation).toBeDefined();
        expect(intervalRecommendation?.priority).toBe('medium');
      });

      it('should return recommendations for disabled performance logging', () => {
        const config = ObservabilityConfigFactory.createConfig('commercial');
        config.logging.performanceLogging = false;

        const recommendations = ObservabilityBinderStrategy.getObservabilityRecommendations(config);
        expect(recommendations.length).toBeGreaterThan(0);

        const perfRecommendation = recommendations.find(r =>
          r.recommendation === 'ENABLE_PERFORMANCE_LOGGING'
        );
        expect(perfRecommendation).toBeDefined();
        expect(perfRecommendation?.priority).toBe('low');
      });

      it('should return no recommendations for optimal configuration', () => {
        const config = ObservabilityConfigFactory.createConfig('commercial');
        // Use default optimal configuration

        const recommendations = ObservabilityBinderStrategy.getObservabilityRecommendations(config);
        expect(recommendations).toHaveLength(0);
      });
    });
  });

  describe('error handling', () => {
    beforeEach(() => {
      strategy = new ObservabilityBinderStrategy('commercial');
    });

    it('should handle missing context gracefully', async () => {
      const invalidContext = {
        ...mockContext,
        source: null as any
      };

      await expect(strategy.bind(invalidContext)).rejects.toThrow();
    });

    it('should handle invalid compliance framework', () => {
      expect(() => {
        new ObservabilityBinderStrategy('invalid-framework' as ComplianceFramework);
      }).toThrow();
    });
  });
});
