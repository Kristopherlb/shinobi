/**
 * Configuration Builder for ShinobiComponent Component
 * 
 * Implements the ConfigBuilder pattern as defined in the Platform Component API Contract.
 * Provides 5-layer configuration precedence chain and compliance-aware defaults.
 */

import { ConfigBuilder, ConfigBuilderContext } from '../../../../src/platform/contracts/config-builder';
import { ShinobiConfig, SHINOBI_CONFIG_SCHEMA } from './shinobi.component';

/**
 * ConfigBuilder for ShinobiComponent component
 * 
 * Implements the 5-layer configuration precedence chain:
 * 1. Hardcoded Fallbacks (ultra-safe baseline)
 * 2. Platform Defaults (from platform config)
 * 3. Environment Defaults (from environment config) 
 * 4. Component Overrides (from service.yml)
 * 5. Policy Overrides (from governance policies)
 */
export class ShinobiComponentConfigBuilder extends ConfigBuilder<ShinobiConfig> {
  
  /**
   * Layer 1: Hardcoded Fallbacks
   * Ultra-safe baseline configuration that works in any environment
   */
  protected getHardcodedFallbacks(): Partial<ShinobiConfig> {
    return {
      compute: {
        mode: 'ecs',
        cpu: 256,
        memory: 512,
        taskCount: 1,
        containerPort: 3000
      },
      dataStore: {
        type: 'dynamodb',
        dynamodb: {
          billingMode: 'PAY_PER_REQUEST'
        }
      },
      api: {
        exposure: 'internal',
        loadBalancer: {
          enabled: true
        },
        version: '1.0',
        rateLimit: {
          requestsPerMinute: 1000,
          burstCapacity: 2000
        }
      },
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
          'shinobi.performance-profiling': false,
          'shinobi.dependency-analysis': false,
          'shinobi.change-impact': false
        }
      },
      dataSources: {
        components: true,
        services: true,
        dependencies: true,
        compliance: true,
        cost: false,
        security: false,
        performance: false
      },
      observability: {
        provider: 'cloudwatch',
        dashboards: ['reliability', 'performance'],
        alerts: {
          enabled: true,
          thresholds: {
            cpuUtilization: 80,
            memoryUtilization: 80,
            responseTime: 2
          }
        }
      },
      compliance: {
        securityLevel: 'standard',
        auditLogging: false
      },
      localDev: {
        enabled: false,
        seedData: {
          sampleComponents: true,
          sampleServices: true,
          sampleMetrics: true
        },
        mockServices: true
      },
      logging: {
        retentionDays: 30,
        logLevel: 'info',
        structuredLogging: true
      },
      tags: {}
    };
  }
  
  /**
   * Layer 2: Compliance Framework Defaults
   * Security and compliance-specific configurations
   */
  protected getComplianceFrameworkDefaults(): Partial<ShinobiConfig> {
    const framework = this.builderContext.context.complianceFramework;
    
    const baseCompliance: Partial<ShinobiConfig> = {
      observability: {
        provider: 'cloudwatch',
        dashboards: ['reliability', 'performance', 'security'],
        alerts: {
          enabled: true,
          thresholds: {
            cpuUtilization: 70,
            memoryUtilization: 70,
            responseTime: 1.5
          }
        }
      },
      compliance: {
        securityLevel: 'enhanced',
        auditLogging: true
      },
      logging: {
        retentionDays: 90,
        logLevel: 'info',
        structuredLogging: true
      }
    };
    
    if (framework === 'fedramp-moderate') {
      return {
        ...baseCompliance,
        compute: {
          cpu: 512,
          memory: 1024,
          taskCount: 2
        },
        api: {
          exposure: 'internal'
        },
        featureFlags: {
          enabled: true,
          provider: 'aws-appconfig',
          defaults: {
            'shinobi.advanced-analytics': true,
            'shinobi.ai-insights': false,
            'shinobi.auto-remediation': false,
            'shinobi.predictive-scaling': false,
            'shinobi.cost-optimization': true,
            'shinobi.security-scanning': true,
            'shinobi.compliance-monitoring': true,
            'shinobi.performance-profiling': true,
            'shinobi.dependency-analysis': true,
            'shinobi.change-impact': true
          }
        },
        dataSources: {
          components: true,
          services: true,
          dependencies: true,
          compliance: true,
          cost: true,
          security: true,
          performance: true
        },
        compliance: {
          securityLevel: 'enhanced',
          auditLogging: true
        },
        logging: {
          retentionDays: 90,
          logLevel: 'info',
          structuredLogging: true
        }
      };
    }
    
    if (framework === 'fedramp-high') {
      return {
        ...baseCompliance,
        compute: {
          cpu: 1024,
          memory: 2048,
          taskCount: 3
        },
        api: {
          exposure: 'internal'
        },
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
        dataSources: {
          components: true,
          services: true,
          dependencies: true,
          compliance: true,
          cost: true,
          security: true,
          performance: true
        },
        compliance: {
          securityLevel: 'maximum',
          auditLogging: true
        },
        logging: {
          retentionDays: 2555, // 7 years
          logLevel: 'info',
          structuredLogging: true
        }
      };
    }
    
    return baseCompliance;
  }
  
  /**
   * Get the JSON Schema for validation
   */
  public getSchema(): any {
    return SHINOBI_CONFIG_SCHEMA;
  }
}
