/**
 * Shinobi Component - Basic Usage Example
 * 
 * This example demonstrates how to use the Shinobi component in a service manifest
 * with various configuration options and feature flags.
 */

import { App, Stack } from 'aws-cdk-lib';
import { ShinobiComponent } from '../src/shinobi.component';
import { ComponentContext, ComponentSpec } from '@shinobi/core';

// Example 1: Basic Shinobi setup with minimal configuration
export function createBasicShinobi(stack: Stack, context: ComponentContext): ShinobiComponent {
  const spec: ComponentSpec = {
    name: 'platform-shinobi',
    type: 'shinobi',
    config: {
      // Enable all core data sources
      dataSources: {
        components: true,
        services: true,
        dependencies: true,
        compliance: true,
        cost: false,
        security: false,
        performance: false
      },
      
      // Enable feature flags for basic functionality
      featureFlags: {
        enabled: true,
        provider: 'aws-appconfig',
        defaults: {
          'shinobi.cost-optimization': true,
          'shinobi.security-scanning': true,
          'shinobi.compliance-monitoring': true,
          'shinobi.performance-profiling': true,
          'shinobi.dependency-analysis': true,
          'shinobi.change-impact': true
        }
      },
      
      // Internal API with load balancer
      api: {
        exposure: 'internal',
        loadBalancer: {
          enabled: true
        }
      },
      
      // Basic observability
      observability: {
        provider: 'cloudwatch',
        dashboards: ['reliability', 'performance'],
        alerts: {
          enabled: true
        }
      }
    }
  };

  return new ShinobiComponent(stack, spec.name, context, spec);
}

// Example 2: Enterprise Shinobi setup with all features enabled
export function createEnterpriseShinobi(stack: Stack, context: ComponentContext): ShinobiComponent {
  const spec: ComponentSpec = {
    name: 'enterprise-shinobi',
    type: 'shinobi',
    config: {
      // Enhanced compute resources
      compute: {
        mode: 'ecs',
        cpu: 1024,
        memory: 2048,
        taskCount: 3,
        containerPort: 3000
      },
      
      // Provisioned DynamoDB for better performance
      dataStore: {
        type: 'dynamodb',
        dynamodb: {
          billingMode: 'PROVISIONED',
          readCapacity: 100,
          writeCapacity: 100
        }
      },
      
      // Public API with custom domain
      api: {
        exposure: 'public',
        loadBalancer: {
          enabled: true,
          certificateArn: 'arn:aws:acm:us-east-1:123456789012:certificate/12345678-1234-1234-1234-123456789012',
          domainName: 'shinobi.example.com'
        },
        rateLimit: {
          requestsPerMinute: 2000,
          burstCapacity: 5000
        }
      },
      
      // All data sources enabled
      dataSources: {
        components: true,
        services: true,
        dependencies: true,
        compliance: true,
        cost: true,
        security: true,
        performance: true
      },
      
      // All feature flags enabled
      featureFlags: {
        enabled: true,
        provider: 'aws-appconfig',
        defaults: {
          'shinobi.advanced-analytics': true,
          'shinobi.ai-insights': true,
          'shinobi.auto-remediation': true,
          'shinobi.predictive-scaling': true,
          'shinobi.cost-optimization': true,
          'shinobi.security-scanning': true,
          'shinobi.compliance-monitoring': true,
          'shinobi.performance-profiling': true,
          'shinobi.dependency-analysis': true,
          'shinobi.change-impact': true,
          'shinobi.api.catalog': true,
          'shinobi.api.graph': true,
          'shinobi.api.manifest': true,
          'shinobi.api.reliability': true,
          'shinobi.api.observability': true,
          'shinobi.api.change': true,
          'shinobi.api.security': true,
          'shinobi.api.qa': true,
          'shinobi.api.cost': true,
          'shinobi.api.dx': true,
          'shinobi.api.governance': true
        }
      },
      
      // Enhanced observability
      observability: {
        provider: 'newrelic',
        dashboards: ['reliability', 'performance', 'security', 'compliance'],
        alerts: {
          enabled: true,
          thresholds: {
            cpuUtilization: 70,
            memoryUtilization: 70,
            responseTime: 1.5
          }
        }
      },
      
      // Enhanced compliance
      compliance: {
        securityLevel: 'enhanced',
        auditLogging: true
      },
      
      // Enhanced logging
      logging: {
        retentionDays: 90,
        logLevel: 'info',
        structuredLogging: true
      }
    }
  };

  return new ShinobiComponent(stack, spec.name, context, spec);
}

// Example 3: FedRAMP High compliant Shinobi setup
export function createFedRampHighShinobi(stack: Stack, context: ComponentContext): ShinobiComponent {
  const spec: ComponentSpec = {
    name: 'fedramp-shinobi',
    type: 'shinobi',
    config: {
      // Maximum compute resources for FedRAMP High
      compute: {
        mode: 'ecs',
        cpu: 1024,
        memory: 2048,
        taskCount: 3,
        containerPort: 3000
      },
      
      // Internal API only (required for FedRAMP High)
      api: {
        exposure: 'internal',
        loadBalancer: {
          enabled: true
        }
      },
      
      // All data sources enabled for comprehensive monitoring
      dataSources: {
        components: true,
        services: true,
        dependencies: true,
        compliance: true,
        cost: true,
        security: true,
        performance: true
      },
      
      // All feature flags enabled for maximum capability
      featureFlags: {
        enabled: true,
        provider: 'aws-appconfig',
        defaults: {
          'shinobi.advanced-analytics': true,
          'shinobi.ai-insights': true,
          'shinobi.auto-remediation': true,
          'shinobi.predictive-scaling': true,
          'shinobi.cost-optimization': true,
          'shinobi.security-scanning': true,
          'shinobi.compliance-monitoring': true,
          'shinobi.performance-profiling': true,
          'shinobi.dependency-analysis': true,
          'shinobi.change-impact': true
        }
      },
      
      // Enhanced observability with compliance focus
      observability: {
        provider: 'cloudwatch',
        dashboards: ['reliability', 'performance', 'security', 'compliance'],
        alerts: {
          enabled: true,
          thresholds: {
            cpuUtilization: 60,
            memoryUtilization: 60,
            responseTime: 1
          }
        }
      },
      
      // Maximum security and compliance
      compliance: {
        securityLevel: 'maximum',
        auditLogging: true
      },
      
      // Extended logging retention for FedRAMP High
      logging: {
        retentionDays: 2555, // 7 years
        logLevel: 'info',
        structuredLogging: true
      }
    }
  };

  return new ShinobiComponent(stack, 'FedRampShinobi', context, spec);
}

// Example 4: Local development Shinobi setup
export function createLocalDevShinobi(stack: Stack, context: ComponentContext): ShinobiComponent {
  const spec: ComponentSpec = {
    name: 'local-shinobi',
    type: 'shinobi',
    config: {
      // Minimal compute for local development
      compute: {
        mode: 'ecs',
        cpu: 256,
        memory: 512,
        taskCount: 1,
        containerPort: 3000
      },
      
      // Internal API
      api: {
        exposure: 'internal',
        loadBalancer: {
          enabled: false
        }
      },
      
      // Basic data sources
      dataSources: {
        components: true,
        services: true,
        dependencies: true,
        compliance: false,
        cost: false,
        security: false,
        performance: false
      },
      
      // Feature flags for development
      featureFlags: {
        enabled: true,
        provider: 'aws-appconfig',
        defaults: {
          'shinobi.advanced-analytics': false,
          'shinobi.ai-insights': false,
          'shinobi.auto-remediation': false,
          'shinobi.predictive-scaling': false,
          'shinobi.cost-optimization': false,
          'shinobi.security-scanning': false,
          'shinobi.compliance-monitoring': false,
          'shinobi.performance-profiling': true,
          'shinobi.dependency-analysis': true,
          'shinobi.change-impact': true,
          'shinobi.local.seed-data': true,
          'shinobi.local.mock-services': true,
          'shinobi.experimental.gui': true,
          'shinobi.experimental.voice': true
        }
      },
      
      // Local development mode
      localDev: {
        enabled: true,
        seedData: {
          sampleComponents: true,
          sampleServices: true,
          sampleMetrics: true
        },
        mockServices: true
      },
      
      // Basic observability
      observability: {
        provider: 'cloudwatch',
        dashboards: ['reliability'],
        alerts: {
          enabled: false
        }
      },
      
      // Standard compliance
      compliance: {
        securityLevel: 'standard',
        auditLogging: false
      },
      
      // Minimal logging
      logging: {
        retentionDays: 7,
        logLevel: 'debug',
        structuredLogging: true
      }
    }
  };

  return new ShinobiComponent(stack, 'LocalDevShinobi', context, spec);
}

// Example 5: Service manifest usage
export const exampleServiceManifest = `
# service.yml - Shinobi Platform Intelligence Brain
service: platform-intelligence
owner: platform-team
environment: production
complianceFramework: fedramp-moderate

components:
  - name: platform-shinobi
    type: shinobi
    config:
      # Data sources to index
      dataSources:
        components: true
        services: true
        dependencies: true
        compliance: true
        cost: true
        security: true
        performance: true
      
      # Feature flags for functionality control
      featureFlags:
        enabled: true
        provider: "aws-appconfig"
        defaults:
          "shinobi.advanced-analytics": true
          "shinobi.ai-insights": false
          "shinobi.auto-remediation": false
          "shinobi.predictive-scaling": false
          "shinobi.cost-optimization": true
          "shinobi.security-scanning": true
          "shinobi.compliance-monitoring": true
          "shinobi.performance-profiling": true
          "shinobi.dependency-analysis": true
          "shinobi.change-impact": true
      
      # API configuration
      api:
        exposure: "internal"
        loadBalancer:
          enabled: true
        rateLimit:
          requestsPerMinute: 1000
          burstCapacity: 2000
      
      # Observability
      observability:
        provider: "cloudwatch"
        dashboards: ["reliability", "performance", "security"]
        alerts:
          enabled: true
          thresholds:
            cpuUtilization: 70
            memoryUtilization: 70
            responseTime: 1.5
      
      # Compliance
      compliance:
        securityLevel: "enhanced"
        auditLogging: true
      
      # Logging
      logging:
        retentionDays: 90
        logLevel: "info"
        structuredLogging: true

  # Example: Bind Shinobi to a feature flag provider
  - name: openfeature-provider
    type: openfeature-provider
    config:
      provider: "aws-appconfig"
      applicationName: "shinobi-feature-flags"
      environmentName: "production"
      configurationProfileName: "shinobi-flags"

bindings:
  - from: platform-shinobi
    to: openfeature-provider
    capability: "feature:flags:provider"
`;

// Example 6: API usage examples
export const apiUsageExamples = `
# Health check
curl http://localhost:3000/health

# Get component catalog
curl http://localhost:3000/catalog/components

# Get component schema
curl http://localhost:3000/catalog/components/lambda-api/schema

# Generate manifest
curl -X POST http://localhost:3000/manifest/generate \\
  -H "Content-Type: application/json" \\
  -d '{"prompt": "Generate a serverless API with a DynamoDB table for storing user data"}'

# Check SLO status
curl "http://localhost:3000/reliability/slo/status?service=user-api"

# Get security attestations
curl "http://localhost:3000/sec/attestations?service=user-api"

# Check change readiness
curl "http://localhost:3000/change/ready?env=production"

# Get cost attribution
curl "http://localhost:3000/cost/attribution?service=user-api"

# Get governance scorecard
curl "http://localhost:3000/gov/scorecard?service=user-api"

# Get executive brief
curl -X POST http://localhost:3000/gov/brief \\
  -H "Content-Type: application/json" \\
  -d '{"timeframe": "last-7-days"}'
`;

// Example 7: Feature flag usage
export const featureFlagExamples = `
# Check if advanced analytics is enabled
const isAdvancedAnalyticsEnabled = await featureFlagClient.getBooleanValue(
  'shinobi.advanced-analytics',
  false,
  { environment: 'production' }
);

# Check if AI insights are enabled
const isAiInsightsEnabled = await featureFlagClient.getBooleanValue(
  'shinobi.ai-insights',
  false,
  { complianceFramework: 'fedramp-high' }
);

# Check if auto-remediation is enabled
const isAutoRemediationEnabled = await featureFlagClient.getBooleanValue(
  'shinobi.auto-remediation',
  false,
  { environment: 'production' }
);

# Check if cost optimization is enabled
const isCostOptimizationEnabled = await featureFlagClient.getBooleanValue(
  'shinobi.cost-optimization',
  true,
  { environment: 'production' }
);
`;
