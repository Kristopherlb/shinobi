// src/platform/contracts/observability/observability-config-factory.ts
// Factory for creating compliance-tier-aware observability configurations

import { ComplianceFramework } from '../bindings.js';
import {
  ObservabilityConfig,
  ObservabilityTier,
  TracingConfig,
  LoggingConfig,
  MetricsConfig,
  SecurityConfig
} from './observability-types.js';

export class ObservabilityConfigFactory {
  private static readonly ADOT_LAYER_ARNS = {
    'us-east-1': 'arn:aws:lambda:us-east-1:901920570463:layer:aws-otel-nodejs-amd64-ver-1-18-1:2',
    'us-west-2': 'arn:aws:lambda:us-west-2:901920570463:layer:aws-otel-nodejs-amd64-ver-1-18-1:2',
    'eu-west-1': 'arn:aws:lambda:eu-west-1:901920570463:layer:aws-otel-nodejs-amd64-ver-1-18-1:2',
  };

  private static readonly FEDRAMP_ENDPOINTS = {
    'fedramp-moderate': [
      'https://logs.us-east-1.amazonaws.com',
      'https://xray.us-east-1.amazonaws.com',
      'https://monitoring.us-east-1.amazonaws.com'
    ],
    'fedramp-high': [
      'https://logs.us-gov-east-1.amazonaws.com',
      'https://xray.us-gov-east-1.amazonaws.com',
      'https://monitoring.us-gov-east-1.amazonaws.com'
    ]
  };

  static createConfig(framework: ComplianceFramework): ObservabilityConfig {
    const tier = this.mapFrameworkToTier(framework);

    return {
      framework,
      tier,
      tracing: this.createTracingConfig(tier),
      logging: this.createLoggingConfig(tier),
      metrics: this.createMetricsConfig(tier),
      security: this.createSecurityConfig(tier)
    };
  }

  private static mapFrameworkToTier(framework: ComplianceFramework): ObservabilityTier {
    switch (framework) {
      case 'commercial':
        return 'commercial';
      case 'fedramp-moderate':
        return 'fedramp-moderate';
      case 'fedramp-high':
        return 'fedramp-high';
      default:
        throw new Error(`Unsupported compliance framework: ${framework}`);
    }
  }

  private static createTracingConfig(tier: ObservabilityTier): TracingConfig {
    switch (tier) {
      case 'commercial':
        return {
          enabled: true,
          provider: 'xray',
          samplingRate: 0.1, // 10% sampling
          maxTraceDuration: 300, // 5 minutes
          includeMetadata: true,
          customAttributes: {
            'environment': 'commercial',
            'tier': 'standard'
          }
        };

      case 'fedramp-moderate':
        return {
          enabled: true,
          provider: 'xray',
          samplingRate: 0.2, // 20% sampling for enhanced monitoring
          maxTraceDuration: 600, // 10 minutes
          includeMetadata: true,
          customAttributes: {
            'environment': 'fedramp-moderate',
            'tier': 'enhanced',
            'compliance': 'moderate'
          }
        };

      case 'fedramp-high':
        return {
          enabled: true,
          provider: 'xray',
          samplingRate: 0.5, // 50% sampling for high security
          maxTraceDuration: 900, // 15 minutes
          includeMetadata: true,
          customAttributes: {
            'environment': 'fedramp-high',
            'tier': 'maximum',
            'compliance': 'high',
            'classification': 'confidential'
          }
        };
    }
  }

  private static createLoggingConfig(tier: ObservabilityTier): LoggingConfig {
    switch (tier) {
      case 'commercial':
        return {
          enabled: true,
          format: 'json',
          level: 'info',
          retentionDays: 30,
          encryptionAtRest: true,
          auditLogging: false,
          performanceLogging: true,
          customFields: {
            'service': 'shinobi',
            'tier': 'commercial'
          }
        };

      case 'fedramp-moderate':
        return {
          enabled: true,
          format: 'json',
          level: 'debug',
          retentionDays: 90, // Longer retention for compliance
          encryptionAtRest: true,
          auditLogging: true, // Enhanced audit logging
          performanceLogging: true,
          customFields: {
            'service': 'shinobi',
            'tier': 'fedramp-moderate',
            'compliance': 'moderate',
            'audit': 'enabled'
          }
        };

      case 'fedramp-high':
        return {
          enabled: true,
          format: 'json',
          level: 'debug',
          retentionDays: 2555, // 7 years for high compliance
          encryptionAtRest: true,
          auditLogging: true,
          performanceLogging: true,
          customFields: {
            'service': 'shinobi',
            'tier': 'fedramp-high',
            'compliance': 'high',
            'classification': 'confidential',
            'audit': 'enabled',
            'stig': 'hardened'
          }
        };
    }
  }

  private static createMetricsConfig(tier: ObservabilityTier): MetricsConfig {
    switch (tier) {
      case 'commercial':
        return {
          enabled: true,
          collectionInterval: 60, // 1 minute
          customMetrics: true,
          resourceMetrics: true,
          performanceMetrics: true,
          customDimensions: {
            'Environment': 'commercial',
            'Service': 'shinobi'
          }
        };

      case 'fedramp-moderate':
        return {
          enabled: true,
          collectionInterval: 30, // 30 seconds for enhanced monitoring
          customMetrics: true,
          resourceMetrics: true,
          performanceMetrics: true,
          customDimensions: {
            'Environment': 'fedramp-moderate',
            'Service': 'shinobi',
            'Compliance': 'moderate'
          }
        };

      case 'fedramp-high':
        return {
          enabled: true,
          collectionInterval: 15, // 15 seconds for maximum monitoring
          customMetrics: true,
          resourceMetrics: true,
          performanceMetrics: true,
          customDimensions: {
            'Environment': 'fedramp-high',
            'Service': 'shinobi',
            'Compliance': 'high',
            'Classification': 'confidential'
          }
        };
    }
  }

  private static createSecurityConfig(tier: ObservabilityTier): SecurityConfig {
    switch (tier) {
      case 'commercial':
        return {
          fipsCompliant: false,
          stigHardened: false,
          encryptionInTransit: true,
          encryptionAtRest: true,
          auditTrail: false,
          accessLogging: true
        };

      case 'fedramp-moderate':
        return {
          fipsCompliant: false,
          stigHardened: false,
          encryptionInTransit: true,
          encryptionAtRest: true,
          auditTrail: true,
          accessLogging: true,
          allowedEndpoints: this.FEDRAMP_ENDPOINTS['fedramp-moderate']
        };

      case 'fedramp-high':
        return {
          fipsCompliant: true,
          stigHardened: true,
          encryptionInTransit: true,
          encryptionAtRest: true,
          auditTrail: true,
          accessLogging: true,
          allowedEndpoints: this.FEDRAMP_ENDPOINTS['fedramp-high'],
          blockedEndpoints: [
            'http://',
            'ftp://',
            'telnet://'
          ]
        };
    }
  }

  static getAdotLayerArn(region: string, tier: ObservabilityTier): string {
    const baseArn = this.ADOT_LAYER_ARNS[region as keyof typeof this.ADOT_LAYER_ARNS];
    if (!baseArn) {
      throw new Error(`ADOT layer not available in region: ${region}`);
    }

    // For FedRAMP High, we might need FIPS-compliant layers
    if (tier === 'fedramp-high') {
      // TODO: Add FIPS-compliant ADOT layer ARNs when available
      console.warn('FIPS-compliant ADOT layers not yet available, using standard layer');
    }

    return baseArn;
  }

  static getComplianceEndpoints(tier: ObservabilityTier): string[] {
    return this.FEDRAMP_ENDPOINTS[tier as keyof typeof this.FEDRAMP_ENDPOINTS] || [];
  }

  static isFipsRequired(tier: ObservabilityTier): boolean {
    return tier === 'fedramp-high';
  }

  static isStigRequired(tier: ObservabilityTier): boolean {
    return tier === 'fedramp-high';
  }
}
