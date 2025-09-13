/**
 * Shinobi Feature Flags Integration
 * 
 * Defines all feature flags used by the Shinobi component for controlling
 * functionality and enabling/disabling advanced features.
 */

import { Construct } from 'constructs';
import { FeatureFlagComponent } from '../../../feature-flag/src/feature-flag.component';
import { ComponentSpec, ComponentContext } from '../../../../src/platform/contracts/component-interfaces';

/**
 * Feature flag definitions for Shinobi component
 */
export const SHINOBI_FEATURE_FLAGS = {
  // Advanced Analytics & Intelligence
  'shinobi.advanced-analytics': {
    flagKey: 'shinobi.advanced-analytics',
    flagType: 'boolean' as const,
    defaultValue: false,
    description: 'Enable advanced analytics and machine learning insights',
    targetingRules: {
      percentage: 0, // Start with 0% rollout
      conditions: [
        {
          attribute: 'environment',
          operator: 'equals' as const,
          value: 'development'
        }
      ]
    }
  },

  'shinobi.ai-insights': {
    flagKey: 'shinobi.ai-insights',
    flagType: 'boolean' as const,
    defaultValue: false,
    description: 'Enable AI-powered insights and recommendations',
    targetingRules: {
      percentage: 0,
      conditions: [
        {
          attribute: 'compliance-framework',
          operator: 'in' as const,
          value: ['fedramp-high']
        }
      ]
    }
  },

  // Automation & Remediation
  'shinobi.auto-remediation': {
    flagKey: 'shinobi.auto-remediation',
    flagType: 'boolean' as const,
    defaultValue: false,
    description: 'Enable automatic remediation of common issues',
    targetingRules: {
      percentage: 0,
      conditions: [
        {
          attribute: 'environment',
          operator: 'not_equals' as const,
          value: 'production'
        }
      ]
    }
  },

  'shinobi.predictive-scaling': {
    flagKey: 'shinobi.predictive-scaling',
    flagType: 'boolean' as const,
    defaultValue: false,
    description: 'Enable predictive scaling based on historical patterns',
    targetingRules: {
      percentage: 0
    }
  },

  // Cost & Resource Optimization
  'shinobi.cost-optimization': {
    flagKey: 'shinobi.cost-optimization',
    flagType: 'boolean' as const,
    defaultValue: true,
    description: 'Enable cost optimization recommendations and monitoring',
    targetingRules: {
      percentage: 100
    }
  },

  // Security & Compliance
  'shinobi.security-scanning': {
    flagKey: 'shinobi.security-scanning',
    flagType: 'boolean' as const,
    defaultValue: true,
    description: 'Enable continuous security scanning and vulnerability detection',
    targetingRules: {
      percentage: 100,
      conditions: [
        {
          attribute: 'compliance-framework',
          operator: 'in' as const,
          value: ['fedramp-moderate', 'fedramp-high']
        }
      ]
    }
  },

  'shinobi.compliance-monitoring': {
    flagKey: 'shinobi.compliance-monitoring',
    flagType: 'boolean' as const,
    defaultValue: true,
    description: 'Enable real-time compliance monitoring and reporting',
    targetingRules: {
      percentage: 100,
      conditions: [
        {
          attribute: 'compliance-framework',
          operator: 'in' as const,
          value: ['fedramp-moderate', 'fedramp-high']
        }
      ]
    }
  },

  // Performance & Monitoring
  'shinobi.performance-profiling': {
    flagKey: 'shinobi.performance-profiling',
    flagType: 'boolean' as const,
    defaultValue: true,
    description: 'Enable detailed performance profiling and bottleneck analysis',
    targetingRules: {
      percentage: 100
    }
  },

  'shinobi.dependency-analysis': {
    flagKey: 'shinobi.dependency-analysis',
    flagType: 'boolean' as const,
    defaultValue: true,
    description: 'Enable comprehensive dependency analysis and impact assessment',
    targetingRules: {
      percentage: 100
    }
  },

  'shinobi.change-impact': {
    flagKey: 'shinobi.change-impact',
    flagType: 'boolean' as const,
    defaultValue: true,
    description: 'Enable change impact analysis and risk assessment',
    targetingRules: {
      percentage: 100
    }
  },

  // API & Endpoint Features
  'shinobi.api.catalog': {
    flagKey: 'shinobi.api.catalog',
    flagType: 'boolean' as const,
    defaultValue: true,
    description: 'Enable component catalog API endpoints',
    targetingRules: {
      percentage: 100
    }
  },

  'shinobi.api.graph': {
    flagKey: 'shinobi.api.graph',
    flagType: 'boolean' as const,
    defaultValue: true,
    description: 'Enable graph and topology API endpoints',
    targetingRules: {
      percentage: 100
    }
  },

  'shinobi.api.manifest': {
    flagKey: 'shinobi.api.manifest',
    flagType: 'boolean' as const,
    defaultValue: true,
    description: 'Enable manifest generation and validation API endpoints',
    targetingRules: {
      percentage: 100
    }
  },

  'shinobi.api.reliability': {
    flagKey: 'shinobi.api.reliability',
    flagType: 'boolean' as const,
    defaultValue: true,
    description: 'Enable reliability and SLO API endpoints',
    targetingRules: {
      percentage: 100
    }
  },

  'shinobi.api.observability': {
    flagKey: 'shinobi.api.observability',
    flagType: 'boolean' as const,
    defaultValue: true,
    description: 'Enable observability and dashboard API endpoints',
    targetingRules: {
      percentage: 100
    }
  },

  'shinobi.api.change': {
    flagKey: 'shinobi.api.change',
    flagType: 'boolean' as const,
    defaultValue: true,
    description: 'Enable change management and CI/CD API endpoints',
    targetingRules: {
      percentage: 100
    }
  },

  'shinobi.api.security': {
    flagKey: 'shinobi.api.security',
    flagType: 'boolean' as const,
    defaultValue: true,
    description: 'Enable security and compliance API endpoints',
    targetingRules: {
      percentage: 100
    }
  },

  'shinobi.api.qa': {
    flagKey: 'shinobi.api.qa',
    flagType: 'boolean' as const,
    defaultValue: true,
    description: 'Enable QA and testing API endpoints',
    targetingRules: {
      percentage: 100
    }
  },

  'shinobi.api.cost': {
    flagKey: 'shinobi.api.cost',
    flagType: 'boolean' as const,
    defaultValue: true,
    description: 'Enable cost and FinOps API endpoints',
    targetingRules: {
      percentage: 100
    }
  },

  'shinobi.api.dx': {
    flagKey: 'shinobi.api.dx',
    flagType: 'boolean' as const,
    defaultValue: true,
    description: 'Enable developer experience and self-service API endpoints',
    targetingRules: {
      percentage: 100
    }
  },

  'shinobi.api.governance': {
    flagKey: 'shinobi.api.governance',
    flagType: 'boolean' as const,
    defaultValue: true,
    description: 'Enable governance and executive insights API endpoints',
    targetingRules: {
      percentage: 100
    }
  },

  // Data Source Features
  'shinobi.data.components': {
    flagKey: 'shinobi.data.components',
    flagType: 'boolean' as const,
    defaultValue: true,
    description: 'Enable components catalog data source indexing',
    targetingRules: {
      percentage: 100
    }
  },

  'shinobi.data.services': {
    flagKey: 'shinobi.data.services',
    flagType: 'boolean' as const,
    defaultValue: true,
    description: 'Enable services registry data source indexing',
    targetingRules: {
      percentage: 100
    }
  },

  'shinobi.data.dependencies': {
    flagKey: 'shinobi.data.dependencies',
    flagType: 'boolean' as const,
    defaultValue: true,
    description: 'Enable dependencies graph data source indexing',
    targetingRules: {
      percentage: 100
    }
  },

  'shinobi.data.compliance': {
    flagKey: 'shinobi.data.compliance',
    flagType: 'boolean' as const,
    defaultValue: true,
    description: 'Enable compliance status data source indexing',
    targetingRules: {
      percentage: 100
    }
  },

  'shinobi.data.cost': {
    flagKey: 'shinobi.data.cost',
    flagType: 'boolean' as const,
    defaultValue: false,
    description: 'Enable cost data source indexing',
    targetingRules: {
      percentage: 0,
      conditions: [
        {
          attribute: 'compliance-framework',
          operator: 'in' as const,
          value: ['fedramp-moderate', 'fedramp-high']
        }
      ]
    }
  },

  'shinobi.data.security': {
    flagKey: 'shinobi.data.security',
    flagType: 'boolean' as const,
    defaultValue: false,
    description: 'Enable security posture data source indexing',
    targetingRules: {
      percentage: 0,
      conditions: [
        {
          attribute: 'compliance-framework',
          operator: 'in' as const,
          value: ['fedramp-moderate', 'fedramp-high']
        }
      ]
    }
  },

  'shinobi.data.performance': {
    flagKey: 'shinobi.data.performance',
    flagType: 'boolean' as const,
    defaultValue: false,
    description: 'Enable performance metrics data source indexing',
    targetingRules: {
      percentage: 0,
      conditions: [
        {
          attribute: 'compliance-framework',
          operator: 'in' as const,
          value: ['fedramp-moderate', 'fedramp-high']
        }
      ]
    }
  },

  // Local Development Features
  'shinobi.local.seed-data': {
    flagKey: 'shinobi.local.seed-data',
    flagType: 'boolean' as const,
    defaultValue: true,
    description: 'Enable seed data for local development',
    targetingRules: {
      percentage: 0,
      conditions: [
        {
          attribute: 'environment',
          operator: 'equals' as const,
          value: 'development'
        }
      ]
    }
  },

  'shinobi.local.mock-services': {
    flagKey: 'shinobi.local.mock-services',
    flagType: 'boolean' as const,
    defaultValue: true,
    description: 'Enable mock external services for local development',
    targetingRules: {
      percentage: 0,
      conditions: [
        {
          attribute: 'environment',
          operator: 'equals' as const,
          value: 'development'
        }
      ]
    }
  },

  // Experimental Features
  'shinobi.experimental.gui': {
    flagKey: 'shinobi.experimental.gui',
    flagType: 'boolean' as const,
    defaultValue: false,
    description: 'Enable experimental drag-and-drop GUI features',
    targetingRules: {
      percentage: 0,
      conditions: [
        {
          attribute: 'environment',
          operator: 'equals' as const,
          value: 'development'
        }
      ]
    }
  },

  'shinobi.experimental.voice': {
    flagKey: 'shinobi.experimental.voice',
    flagType: 'boolean' as const,
    defaultValue: false,
    description: 'Enable experimental voice command features',
    targetingRules: {
      percentage: 0,
      conditions: [
        {
          attribute: 'environment',
          operator: 'equals' as const,
          value: 'development'
        }
      ]
    }
  },

  // Mocking Control Flags
  'shinobi.disable-mocking': {
    flagKey: 'shinobi.disable-mocking',
    flagType: 'boolean' as const,
    defaultValue: false,
    description: 'Disable mocking and use real data sources for SLO status, cost estimates, and deployment readiness',
    targetingRules: {
      percentage: 0,
      conditions: [
        {
          attribute: 'environment',
          operator: 'in' as const,
          value: ['development', 'testing']
        }
      ]
    }
  },

  'shinobi.use-real-slo-data': {
    flagKey: 'shinobi.use-real-slo-data',
    flagType: 'boolean' as const,
    defaultValue: false,
    description: 'Use real CloudWatch metrics for SLO status instead of mock data',
    targetingRules: {
      percentage: 0,
      conditions: [
        {
          attribute: 'shinobi.disable-mocking',
          operator: 'equals' as const,
          value: true
        }
      ]
    }
  },

  'shinobi.use-real-cost-data': {
    flagKey: 'shinobi.use-real-cost-data',
    flagType: 'boolean' as const,
    defaultValue: false,
    description: 'Use real AWS pricing data for cost estimates instead of mock data',
    targetingRules: {
      percentage: 0,
      conditions: [
        {
          attribute: 'shinobi.disable-mocking',
          operator: 'equals' as const,
          value: true
        }
      ]
    }
  },

  // Test Control Flags
  'shinobi.run-audited-tests-only': {
    flagKey: 'shinobi.run-audited-tests-only',
    flagType: 'boolean' as const,
    defaultValue: false,
    description: 'Run tests only for audited components, skipping non-audited component tests to avoid hundreds of failing tests',
    targetingRules: {
      percentage: 0,
      conditions: [
        {
          attribute: 'environment',
          operator: 'in' as const,
          value: ['development', 'testing']
        }
      ]
    }
  }
};

/**
 * Create feature flag components for Shinobi
 */
export function createShinobiFeatureFlags(
  scope: Construct,
  context: ComponentContext,
  baseName: string
): FeatureFlagComponent[] {
  const featureFlags: FeatureFlagComponent[] = [];

  Object.entries(SHINOBI_FEATURE_FLAGS).forEach(([flagKey, flagConfig]) => {
    const spec: ComponentSpec = {
      name: `${baseName}-${flagKey.replace(/\./g, '-')}`,
      type: 'feature-flag',
      config: flagConfig
    };

    const featureFlag = new FeatureFlagComponent(
      scope,
      `${flagKey.replace(/\./g, '')}Flag`,
      context,
      spec
    );

    featureFlags.push(featureFlag);
  });

  return featureFlags;
}

/**
 * Get feature flag configuration for Shinobi
 */
export function getShinobiFeatureFlagConfig(): Record<string, any> {
  const config: Record<string, any> = {};

  Object.entries(SHINOBI_FEATURE_FLAGS).forEach(([flagKey, flagConfig]) => {
    config[flagKey] = flagConfig.defaultValue;
  });

  return config;
}
