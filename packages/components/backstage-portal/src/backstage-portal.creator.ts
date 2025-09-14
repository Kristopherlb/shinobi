/**
 * Creator for BackstagePortalComponent Component
 * 
 * Implements the ComponentCreator pattern as defined in the Platform Component API Contract.
 * Makes the component discoverable by the platform and provides factory methods.
 */

import { Construct } from 'constructs';
import { 
  ComponentSpec, 
  ComponentContext, 
  IComponentCreator 
} from '../../../../src/platform/contracts/component-interfaces';
import { BackstagePortalComponent } from './backstage-portal.component';
import { BackstagePortalConfig, BACKSTAGE_PORTAL_CONFIG_SCHEMA } from './backstage-portal.builder';

/**
 * Creator class for BackstagePortalComponent component
 * 
 * Responsible for:
 * - Component factory creation
 * - Early validation of component specifications
 * - Schema definition and validation
 * - Component type identification
 */
export class BackstagePortalComponentCreator implements IComponentCreator {
  
  /**
   * Component type identifier
   */
  public readonly componentType = 'backstage-portal';
  
  /**
   * Component display name
   */
  public readonly displayName = 'Backstage Developer Portal';
  
  /**
   * Component description
   */
  public readonly description = 'Production-grade component that provisions a complete Backstage developer portal with integrated database, authentication, and observability capabilities. Zero-config developer portal that just works.';
  
  /**
   * Component category for organization
   */
  public readonly category = 'developer-portal';
  
  /**
   * AWS service this component manages
   */
  public readonly awsService = 'ECS';
  
  /**
   * Component tags for discovery
   */
  public readonly tags = [
    'backstage',
    'developer-portal',
    'portal',
    'catalog',
    'service-discovery',
    'developer-experience',
    'dx',
    'ecs',
    'fargate',
    'postgresql',
    'github',
    'oauth',
    'observability',
    'monitoring',
    'aws',
    'container',
    'microservices'
  ];
  
  /**
   * JSON Schema for component configuration validation
   */
  public readonly configSchema = BACKSTAGE_PORTAL_CONFIG_SCHEMA;
  
  /**
   * Factory method to create component instances
   */
  public createComponent(
    scope: Construct, 
    id: string, 
    context: ComponentContext, 
    spec: ComponentSpec
  ): BackstagePortalComponent {
    this.getLogger().info('Creating BackstagePortalComponent instance', {
      componentType: this.componentType,
      id,
      environment: context.environment,
      complianceFramework: context.complianceFramework
    });

    return new BackstagePortalComponent(scope, id, context, spec);
  }

  /**
   * Validate component specification before creation
   */
  public validateSpec(context: ComponentContext, spec: ComponentSpec): void {
    this.getLogger().info('Validating BackstagePortalComponent specification', {
      componentType: this.componentType,
      environment: context.environment,
      complianceFramework: context.complianceFramework
    });

    // Validate required context properties
    if (!context.serviceName) {
      throw new Error('BackstagePortalComponent requires serviceName in context');
    }

    if (!context.account) {
      throw new Error('BackstagePortalComponent requires account in context');
    }

    if (!context.region) {
      throw new Error('BackstagePortalComponent requires region in context');
    }

    // Validate required spec properties
    if (!spec.portal) {
      throw new Error('BackstagePortalComponent requires portal configuration in spec');
    }

    if (!spec.portal.name) {
      throw new Error('BackstagePortalComponent requires portal.name in spec');
    }

    if (!spec.portal.organization) {
      throw new Error('BackstagePortalComponent requires portal.organization in spec');
    }

    // Validate authentication configuration
    if (spec.auth) {
      if (spec.auth.provider === 'github' && spec.auth.github) {
        if (!spec.auth.github.clientId) {
          throw new Error('BackstagePortalComponent requires auth.github.clientId when using GitHub authentication');
        }
        if (!spec.auth.github.clientSecret) {
          throw new Error('BackstagePortalComponent requires auth.github.clientSecret when using GitHub authentication');
        }
      }
    }

    // Validate database configuration
    if (spec.database) {
      if (spec.database.allocatedStorage && spec.database.allocatedStorage < 20) {
        throw new Error('BackstagePortalComponent database.allocatedStorage must be at least 20 GB');
      }
      if (spec.database.maxAllocatedStorage && spec.database.maxAllocatedStorage < spec.database.allocatedStorage) {
        throw new Error('BackstagePortalComponent database.maxAllocatedStorage must be greater than or equal to allocatedStorage');
      }
    }

    // Validate service configuration
    if (spec.backend) {
      if (spec.backend.desiredCount && (spec.backend.desiredCount < 1 || spec.backend.desiredCount > 10)) {
        throw new Error('BackstagePortalComponent backend.desiredCount must be between 1 and 10');
      }
      if (spec.backend.cpu && ![256, 512, 1024, 2048, 4096].includes(spec.backend.cpu)) {
        throw new Error('BackstagePortalComponent backend.cpu must be one of: 256, 512, 1024, 2048, 4096');
      }
      if (spec.backend.memory && ![512, 1024, 2048, 4096, 8192].includes(spec.backend.memory)) {
        throw new Error('BackstagePortalComponent backend.memory must be one of: 512, 1024, 2048, 4096, 8192');
      }
    }

    if (spec.frontend) {
      if (spec.frontend.desiredCount && (spec.frontend.desiredCount < 1 || spec.frontend.desiredCount > 10)) {
        throw new Error('BackstagePortalComponent frontend.desiredCount must be between 1 and 10');
      }
      if (spec.frontend.cpu && ![256, 512, 1024, 2048, 4096].includes(spec.frontend.cpu)) {
        throw new Error('BackstagePortalComponent frontend.cpu must be one of: 256, 512, 1024, 2048, 4096');
      }
      if (spec.frontend.memory && ![512, 1024, 2048, 4096, 8192].includes(spec.frontend.memory)) {
        throw new Error('BackstagePortalComponent frontend.memory must be one of: 512, 1024, 2048, 4096, 8192');
      }
    }

    // Validate observability configuration
    if (spec.observability) {
      if (spec.observability.logRetentionDays && ![1, 3, 5, 7, 14, 30, 60, 90, 120, 150, 180, 365, 400, 545, 731, 1096, 1827, 3653].includes(spec.observability.logRetentionDays)) {
        throw new Error('BackstagePortalComponent observability.logRetentionDays must be a valid CloudWatch log retention value');
      }
      if (spec.observability.cpuThreshold && (spec.observability.cpuThreshold < 1 || spec.observability.cpuThreshold > 100)) {
        throw new Error('BackstagePortalComponent observability.cpuThreshold must be between 1 and 100');
      }
      if (spec.observability.memoryThreshold && (spec.observability.memoryThreshold < 1 || spec.observability.memoryThreshold > 100)) {
        throw new Error('BackstagePortalComponent observability.memoryThreshold must be between 1 and 100');
      }
    }

    // Validate catalog configuration
    if (spec.catalog && spec.catalog.providers) {
      for (const provider of spec.catalog.providers) {
        if (!provider.type || !['github', 'gitlab', 'bitbucket'].includes(provider.type)) {
          throw new Error('BackstagePortalComponent catalog provider type must be one of: github, gitlab, bitbucket');
        }
        if (!provider.id) {
          throw new Error('BackstagePortalComponent catalog provider must have an id');
        }
        if (!provider.org) {
          throw new Error('BackstagePortalComponent catalog provider must have an org');
        }
        if (!provider.catalogPath) {
          throw new Error('BackstagePortalComponent catalog provider must have a catalogPath');
        }
      }
    }

    this.getLogger().info('BackstagePortalComponent specification validation passed');
  }

  /**
   * Get component capabilities
   */
  public getCapabilities(): string[] {
    return [
      'portal:url',
      'ecr:repository',
      'cluster:name',
      'database:endpoint',
      'database:port',
      'alb:dns-name',
      'alb:zone-id'
    ];
  }

  /**
   * Get component dependencies
   */
  public getDependencies(): string[] {
    return [
      'vpc',
      'rds-postgres',
      'ecr-repository',
      'secrets-manager'
    ];
  }

  /**
   * Get component requirements
   */
  public getRequirements(): { [key: string]: any } {
    return {
      aws: {
        services: ['ECS', 'ECR', 'RDS', 'VPC', 'ALB', 'CloudWatch', 'SecretsManager', 'KMS'],
        permissions: [
          'ecs:*',
          'ecr:*',
          'rds:*',
          'ec2:*',
          'elasticloadbalancing:*',
          'logs:*',
          'secretsmanager:*',
          'kms:*'
        ]
      },
      external: {
        services: ['GitHub API', 'Docker Hub'],
        credentials: ['GitHub OAuth App']
      }
    };
  }

  /**
   * Get component examples
   */
  public getExamples(): ComponentSpec[] {
    return [
      {
        portal: {
          name: 'My Company Portal',
          organization: 'My Company',
          description: 'Internal developer portal',
          baseUrl: 'https://backstage.mycompany.com'
        },
        database: {
          instanceClass: 'db.t3.small',
          allocatedStorage: 50,
          maxAllocatedStorage: 200,
          backupRetentionDays: 14,
          multiAz: true,
          deletionProtection: true
        },
        backend: {
          desiredCount: 2,
          cpu: 512,
          memory: 1024,
          healthCheckPath: '/health',
          healthCheckInterval: 30
        },
        frontend: {
          desiredCount: 2,
          cpu: 256,
          memory: 512,
          healthCheckPath: '/',
          healthCheckInterval: 30
        },
        auth: {
          provider: 'github',
          github: {
            clientId: '${GITHUB_CLIENT_ID}',
            clientSecret: '${GITHUB_CLIENT_SECRET}',
            organization: 'mycompany'
          }
        },
        catalog: {
          providers: [{
            type: 'github',
            id: 'mycompany',
            org: 'mycompany',
            catalogPath: '/catalog-info.yaml'
          }]
        }
      }
    ];
  }

  /**
   * Get logger instance
   */
  private getLogger() {
    // REVIEW: This should use the platform's logger service
    return {
      info: (message: string, meta?: any) => console.log(`[INFO] ${message}`, meta || ''),
      warn: (message: string, meta?: any) => console.warn(`[WARN] ${message}`, meta || ''),
      error: (message: string, meta?: any) => console.error(`[ERROR] ${message}`, meta || ''),
      debug: (message: string, meta?: any) => console.debug(`[DEBUG] ${message}`, meta || '')
    };
  }
}

// Export the creator instance for platform discovery
export const backstagePortalComponentCreator = new BackstagePortalComponentCreator();
