// src/platform/contracts/observability/observability-example.ts
// Example integration showing compliance-aware observability in action

import { Construct } from 'constructs';
import {
  EnhancedBinderRegistry,
  EnhancedBindingContext,
  ComplianceFramework
} from '../enhanced-binder-registry.js';
import { ObservabilityBinderStrategy } from './observability-binder-strategy.js';
import { ObservabilityConfigFactory } from './observability-config-factory.js';
import { BaseComponentObservability } from './base-component-observability.js';

// Mock components for demonstration
class MockLambdaComponent {
  constructor(public name: string, public type: string = 'lambda-api') { }
  getName(): string { return this.name; }
  getType(): string { return this.type; }
  getId(): string { return `lambda-${this.name}`; }
  getCapabilityData(): Record<string, any> {
    return {
      functionName: this.name,
      runtime: 'nodejs20.x',
      environment: {}
    };
  }
}

class MockContainerComponent {
  constructor(public name: string, public type: string = 'ecs-fargate-service') { }
  getName(): string { return this.name; }
  getType(): string { return this.type; }
  getId(): string { return `container-${this.name}`; }
  getCapabilityData(): Record<string, any> {
    return {
      serviceName: this.name,
      clusterName: `${this.name}-cluster`,
      taskDefinition: {}
    };
  }
}

class MockVMComponent {
  constructor(public name: string, public type: string = 'ec2-instance') { }
  getName(): string { return this.name; }
  getType(): string { return this.type; }
  getId(): string { return `vm-${this.name}`; }
  getCapabilityData(): Record<string, any> {
    return {
      instanceId: this.name,
      instanceType: 't3.medium',
      operatingSystem: 'linux'
    };
  }
}

/**
 * Example: Commercial Environment Setup
 */
export async function demonstrateCommercialObservability() {
  console.log('🏢 Setting up Commercial Environment Observability...\n');

  const complianceFramework: ComplianceFramework = 'commercial';
  const config = ObservabilityConfigFactory.createConfig(complianceFramework);

  console.log('Commercial Configuration:');
  console.log(`- Tracing: ${config.tracing.enabled ? 'Enabled' : 'Disabled'} (${config.tracing.samplingRate * 100}% sampling)`);
  console.log(`- Logging: ${config.logging.enabled ? 'Enabled' : 'Disabled'} (${config.logging.retentionDays} days retention)`);
  console.log(`- Metrics: ${config.metrics.enabled ? 'Enabled' : 'Disabled'} (${config.metrics.collectionInterval}s interval)`);
  console.log(`- FIPS Compliance: ${config.security.fipsCompliant ? 'Required' : 'Not Required'}`);
  console.log(`- STIG Hardening: ${config.security.stigHardened ? 'Required' : 'Not Required'}\n`);

  // Set up binder registry with observability strategy
  const registry = new EnhancedBinderRegistry(undefined as any); // Mock logger
  const observabilityStrategy = new ObservabilityBinderStrategy(complianceFramework);

  // Register observability strategy (this would be done automatically in real implementation)
  // registry.registerStrategy(observabilityStrategy);

  // Demonstrate Lambda instrumentation
  const lambdaComponent = new MockLambdaComponent('user-service');
  const lambdaContext: EnhancedBindingContext = {
    source: lambdaComponent,
    target: lambdaComponent, // Self-binding for observability
    directive: {
      capability: 'db:postgres' as any,
      access: 'read' as any
    },
    environment: 'dev',
    complianceFramework,
    metadata: { description: 'Commercial Lambda observability setup' }
  };

  try {
    const lambdaResult = await observabilityStrategy.bind(lambdaContext);
    console.log('✅ Lambda Observability Result:');
    console.log(`- Environment Variables: ${Object.keys(lambdaResult.environmentVariables).length} configured`);
    console.log(`- IAM Policies: ${lambdaResult.iamPolicies.length} created`);
    console.log(`- Security Group Rules: ${lambdaResult.securityGroupRules.length} configured`);
    console.log(`- Compliance Actions: ${lambdaResult.complianceActions.length} applied\n`);
  } catch (error) {
    console.error('❌ Lambda observability setup failed:', error);
  }
}

/**
 * Example: FedRAMP Moderate Environment Setup
 */
export async function demonstrateFedRampModerateObservability() {
  console.log('🔒 Setting up FedRAMP Moderate Environment Observability...\n');

  const complianceFramework: ComplianceFramework = 'fedramp-moderate';
  const config = ObservabilityConfigFactory.createConfig(complianceFramework);

  console.log('FedRAMP Moderate Configuration:');
  console.log(`- Tracing: ${config.tracing.enabled ? 'Enabled' : 'Disabled'} (${config.tracing.samplingRate * 100}% sampling)`);
  console.log(`- Logging: ${config.logging.enabled ? 'Enabled' : 'Disabled'} (${config.logging.retentionDays} days retention)`);
  console.log(`- Audit Logging: ${config.logging.auditLogging ? 'Enabled' : 'Disabled'}`);
  console.log(`- Performance Logging: ${config.logging.performanceLogging ? 'Enabled' : 'Disabled'}`);
  console.log(`- FIPS Compliance: ${config.security.fipsCompliant ? 'Required' : 'Not Required'}`);
  console.log(`- STIG Hardening: ${config.security.stigHardened ? 'Required' : 'Not Required'}\n`);

  // Demonstrate Container instrumentation
  const containerComponent = new MockContainerComponent('payment-service');
  const observability = new BaseComponentObservability(complianceFramework);

  try {
    const containerResult = await observability.configureObservability({
      componentName: containerComponent.getName(),
      componentType: containerComponent.getType(),
      environment: 'prod',
      region: 'us-east-1',
      complianceFramework,
      construct: {} as any // Mock construct
    });

    console.log('✅ Container Observability Result:');
    console.log(`- Environment Variables: ${Object.keys(containerResult.environmentVariables).length} configured`);
    console.log(`- IAM Policies: ${containerResult.iamPolicies.length} created`);
    console.log(`- CloudWatch Log Groups: ${containerResult.cloudWatchLogGroups.length} created`);
    console.log(`- X-Ray Configurations: ${containerResult.xrayConfigurations.length} configured`);
    console.log(`- Sidecar Configurations: ${containerResult.sidecarConfigurations?.length ?? 0} configured`);
    console.log(`- Compliance Actions: ${containerResult.complianceActions.length} applied\n`);

    // Show compliance actions
    console.log('Compliance Actions Applied:');
    containerResult.complianceActions.forEach(action => {
      console.log(`- ${action.action}: ${action.description}`);
    });
    console.log();
  } catch (error) {
    console.error('❌ Container observability setup failed:', error);
  }
}

/**
 * Example: FedRAMP High Environment Setup
 */
export async function demonstrateFedRampHighObservability() {
  console.log('🔐 Setting up FedRAMP High Environment Observability...\n');

  const complianceFramework: ComplianceFramework = 'fedramp-high';
  const config = ObservabilityConfigFactory.createConfig(complianceFramework);

  console.log('FedRAMP High Configuration:');
  console.log(`- Tracing: ${config.tracing.enabled ? 'Enabled' : 'Disabled'} (${config.tracing.samplingRate * 100}% sampling)`);
  console.log(`- Logging: ${config.logging.enabled ? 'Enabled' : 'Disabled'} (${config.logging.retentionDays} days retention)`);
  console.log(`- Audit Logging: ${config.logging.auditLogging ? 'Enabled' : 'Disabled'}`);
  console.log(`- Performance Logging: ${config.logging.performanceLogging ? 'Enabled' : 'Disabled'}`);
  console.log(`- FIPS Compliance: ${config.security.fipsCompliant ? 'Required' : 'Not Required'}`);
  console.log(`- STIG Hardening: ${config.security.stigHardened ? 'Required' : 'Not Required'}\n`);

  // Demonstrate VM instrumentation
  const vmComponent = new MockVMComponent('database-server');
  const observability = new BaseComponentObservability(complianceFramework);

  try {
    const vmResult = await observability.configureObservability({
      componentName: vmComponent.getName(),
      componentType: vmComponent.getType(),
      environment: 'prod',
      region: 'us-gov-east-1',
      complianceFramework,
      construct: {} as any // Mock construct
    });

    console.log('✅ VM Observability Result:');
    console.log(`- Environment Variables: ${Object.keys(vmResult.environmentVariables).length} configured`);
    console.log(`- IAM Policies: ${vmResult.iamPolicies.length} created`);
    console.log(`- CloudWatch Log Groups: ${vmResult.cloudWatchLogGroups.length} created`);
    console.log(`- X-Ray Configurations: ${vmResult.xrayConfigurations.length} configured`);
    console.log(`- Agent Configurations: ${vmResult.agentConfigurations?.length ?? 0} configured`);
    console.log(`- Compliance Actions: ${vmResult.complianceActions.length} applied\n`);

    // Show compliance actions
    console.log('Compliance Actions Applied:');
    vmResult.complianceActions.forEach(action => {
      console.log(`- ${action.action}: ${action.description}`);
    });
    console.log();

    // Validate configuration
    const violations = ObservabilityBinderStrategy.validateObservabilityConfig(config);
    if (violations.length > 0) {
      console.log('⚠️  Configuration Violations:');
      violations.forEach(violation => {
        console.log(`- ${violation.rule}: ${violation.description}`);
        console.log(`  Remediation: ${violation.remediation}`);
      });
    } else {
      console.log('✅ Configuration validation passed');
    }

    // Show recommendations
    const recommendations = ObservabilityBinderStrategy.getObservabilityRecommendations(config);
    if (recommendations.length > 0) {
      console.log('\n📋 Recommendations:');
      recommendations.forEach(rec => {
        console.log(`- [${rec.priority.toUpperCase()}] ${rec.recommendation}: ${rec.description}`);
      });
    }
  } catch (error) {
    console.error('❌ VM observability setup failed:', error);
  }
}

/**
 * Example: Cross-component observability setup
 */
export async function demonstrateCrossComponentObservability() {
  console.log('🔗 Setting up Cross-Component Observability...\n');

  const complianceFramework: ComplianceFramework = 'commercial';

  // Create multiple components
  const components = [
    new MockLambdaComponent('api-gateway'),
    new MockContainerComponent('user-service'),
    new MockContainerComponent('payment-service'),
    new MockVMComponent('database-server')
  ];

  console.log('Components to instrument:');
  components.forEach(comp => {
    const strategy = ObservabilityBinderStrategy.getObservabilityStrategy(comp.getType());
    console.log(`- ${comp.getName()} (${comp.getType()}) → ${strategy} strategy`);
  });
  console.log();

  // Instrument each component
  const observability = new BaseComponentObservability(complianceFramework);

  for (const component of components) {
    try {
      const result = await observability.configureObservability({
        componentName: component.getName(),
        componentType: component.getType(),
        environment: 'prod',
        region: 'us-east-1',
        complianceFramework,
        construct: {} as any // Mock construct
      });

      console.log(`✅ ${component.getName()}: ${Object.keys(result.environmentVariables).length} env vars, ${result.iamPolicies.length} policies, ${result.complianceActions.length} compliance actions`);
    } catch (error) {
      console.error(`❌ ${component.getName()} instrumentation failed:`, error);
    }
  }

  console.log('\n🎉 Cross-component observability setup complete!');
}

/**
 * Main demonstration function
 */
export async function runObservabilityDemonstration() {
  console.log('🚀 Shinobi Observability & Logging per Compliance Tier Demonstration\n');
  console.log('='.repeat(80));

  try {
    await demonstrateCommercialObservability();
    console.log('-'.repeat(80));

    await demonstrateFedRampModerateObservability();
    console.log('-'.repeat(80));

    await demonstrateFedRampHighObservability();
    console.log('-'.repeat(80));

    await demonstrateCrossComponentObservability();

    console.log('\n🎯 Key Features Demonstrated:');
    console.log('✅ Automatic instrumentation based on component type');
    console.log('✅ Compliance-tier-aware configuration');
    console.log('✅ ADOT Lambda layer integration');
    console.log('✅ Container sidecar collector injection');
    console.log('✅ VM agent installation scripts');
    console.log('✅ CloudWatch log group configuration per tier');
    console.log('✅ X-Ray tracing with compliance-specific sampling');
    console.log('✅ FedRAMP-specific security configurations');
    console.log('✅ Integration with binder strategy system');
    console.log('✅ Comprehensive validation and recommendations');

  } catch (error) {
    console.error('❌ Demonstration failed:', error);
  }
}

// Export for use in other modules
export {
  ObservabilityBinderStrategy,
  ObservabilityConfigFactory,
  BaseComponentObservability
};
