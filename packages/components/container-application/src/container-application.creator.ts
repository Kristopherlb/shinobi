/**
 * Creator for ContainerApplicationComponent Component
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
import { ContainerApplicationComponent } from './container-application.component';
import { ContainerApplicationConfig, CONTAINER_APPLICATION_CONFIG_SCHEMA } from './container-application.builder';

/**
 * Creator class for ContainerApplicationComponent component
 * 
 * Responsible for:
 * - Component factory creation
 * - Early validation of component specifications
 * - Schema definition and validation
 * - Component type identification
 */
export class ContainerApplicationComponentCreator implements IComponentCreator {
  
  /**
   * Component type identifier
   */
  public readonly componentType = 'container-application';
  
  /**
   * Component display name
   */
  public readonly displayName = 'Container Application';
  
  /**
   * Component description
   */
  public readonly description = 'Production-grade component that provisions containerized applications with integrated load balancing, service discovery, and observability. Deploy any containerized application with zero config.';
  
  /**
   * Component category for organization
   */
  public readonly category = 'compute';
  
  /**
   * AWS service this component manages
   */
  public readonly awsService = 'ECS';
  
  /**
   * Component tags for discovery
   */
  public readonly tags = [
    'container',
    'application',
    'ecs',
    'fargate',
    'load-balancer',
    'microservices',
    'docker',
    'observability',
    'monitoring',
    'aws',
    'scalable',
    'zero-config'
  ];
  
  /**
   * JSON Schema for component configuration validation
   */
  public readonly configSchema = CONTAINER_APPLICATION_CONFIG_SCHEMA;
  
  /**
   * Factory method to create component instances
   */
  public createComponent(
    scope: Construct, 
    id: string, 
    context: ComponentContext, 
    spec: ComponentSpec
  ): ContainerApplicationComponent {
    this.getLogger().info('Creating ContainerApplicationComponent instance', {
      componentType: this.componentType,
      id,
      environment: context.environment,
      complianceFramework: context.complianceFramework
    });

    return new ContainerApplicationComponent(scope, id, context, spec);
  }

  /**
   * Validate component specification before creation
   */
  public validateSpec(context: ComponentContext, spec: ComponentSpec): void {
    this.getLogger().info('Validating ContainerApplicationComponent specification', {
      componentType: this.componentType,
      environment: context.environment,
      complianceFramework: context.complianceFramework
    });

    // Validate required context properties
    if (!context.serviceName) {
      throw new Error('ContainerApplicationComponent requires serviceName in context');
    }

    if (!context.account) {
      throw new Error('ContainerApplicationComponent requires account in context');
    }

    if (!context.region) {
      throw new Error('ContainerApplicationComponent requires region in context');
    }

    // Validate required spec properties
    if (!spec.application) {
      throw new Error('ContainerApplicationComponent requires application configuration in spec');
    }

    if (!spec.application.name) {
      throw new Error('ContainerApplicationComponent requires application.name in spec');
    }

    if (!spec.application.port) {
      throw new Error('ContainerApplicationComponent requires application.port in spec');
    }

    // Validate application name format
    if (!/^[a-z0-9-]+$/.test(spec.application.name)) {
      throw new Error('ContainerApplicationComponent application.name must contain only lowercase letters, numbers, and hyphens');
    }

    // Validate port range
    if (spec.application.port < 1 || spec.application.port > 65535) {
      throw new Error('ContainerApplicationComponent application.port must be between 1 and 65535');
    }

    // Validate service configuration
    if (spec.service) {
      if (spec.service.desiredCount && (spec.service.desiredCount < 1 || spec.service.desiredCount > 10)) {
        throw new Error('ContainerApplicationComponent service.desiredCount must be between 1 and 10');
      }
      if (spec.service.cpu && ![256, 512, 1024, 2048, 4096].includes(spec.service.cpu)) {
        throw new Error('ContainerApplicationComponent service.cpu must be one of: 256, 512, 1024, 2048, 4096');
      }
      if (spec.service.memory && ![512, 1024, 2048, 4096, 8192].includes(spec.service.memory)) {
        throw new Error('ContainerApplicationComponent service.memory must be one of: 512, 1024, 2048, 4096, 8192');
      }
    }

    // Validate load balancer configuration
    if (spec.loadBalancer) {
      if (spec.loadBalancer.port && (spec.loadBalancer.port < 1 || spec.loadBalancer.port > 65535)) {
        throw new Error('ContainerApplicationComponent loadBalancer.port must be between 1 and 65535');
      }
      if (spec.loadBalancer.sslCertificateArn && !spec.loadBalancer.sslCertificateArn.startsWith('arn:aws:acm:')) {
        throw new Error('ContainerApplicationComponent loadBalancer.sslCertificateArn must be a valid ACM certificate ARN');
      }
    }

    // Validate observability configuration
    if (spec.observability) {
      if (spec.observability.logRetentionDays && ![1, 3, 5, 7, 14, 30, 60, 90, 120, 150, 180, 365, 400, 545, 731, 1096, 1827, 3653].includes(spec.observability.logRetentionDays)) {
        throw new Error('ContainerApplicationComponent observability.logRetentionDays must be a valid CloudWatch log retention value');
      }
      if (spec.observability.cpuThreshold && (spec.observability.cpuThreshold < 1 || spec.observability.cpuThreshold > 100)) {
        throw new Error('ContainerApplicationComponent observability.cpuThreshold must be between 1 and 100');
      }
      if (spec.observability.memoryThreshold && (spec.observability.memoryThreshold < 1 || spec.observability.memoryThreshold > 100)) {
        throw new Error('ContainerApplicationComponent observability.memoryThreshold must be between 1 and 100');
      }
    }

    this.getLogger().info('ContainerApplicationComponent specification validation passed');
  }

  /**
   * Get component capabilities
   */
  public getCapabilities(): string[] {
    return [
      'application:url',
      'ecr:repository',
      'cluster:name',
      'service:name',
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
        services: ['ECS', 'ECR', 'VPC', 'ALB', 'CloudWatch', 'SecretsManager', 'KMS'],
        permissions: [
          'ecs:*',
          'ecr:*',
          'ec2:*',
          'elasticloadbalancing:*',
          'logs:*',
          'secretsmanager:*',
          'kms:*'
        ]
      },
      external: {
        services: ['Docker Hub'],
        credentials: []
      }
    };
  }

  /**
   * Get component examples
   */
  public getExamples(): ComponentSpec[] {
    return [
      {
        application: {
          name: 'web-app',
          port: 3000,
          environment: {
            NODE_ENV: 'production',
            PORT: '3000'
          },
          secrets: {
            DATABASE_URL: 'myapp/database/url',
            API_KEY: 'myapp/api/key'
          }
        },
        service: {
          desiredCount: 2,
          cpu: 512,
          memory: 1024,
          healthCheck: {
            command: ['CMD-SHELL', 'curl -f http://localhost:3000/health || exit 1'],
            path: '/health',
            interval: 30,
            timeout: 5,
            retries: 3,
            startPeriod: 60,
            healthyHttpCodes: '200',
            healthyThresholdCount: 2,
            unhealthyThresholdCount: 3
          }
        },
        loadBalancer: {
          port: 80,
          sslCertificateArn: 'arn:aws:acm:us-east-1:123456789012:certificate/12345678-1234-1234-1234-123456789012'
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
export const containerApplicationComponentCreator = new ContainerApplicationComponentCreator();
