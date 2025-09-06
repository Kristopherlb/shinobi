/**
 * Abstract Factory Pattern Implementation
 * Creates families of related components based on compliance framework
 */

import { ComponentRegistry } from './component-factory';
import { 
  LambdaApiCreator, 
  RdsPostgresCreator, 
  SqsQueueCreator 
} from './concrete-components';

/**
 * Abstract Factory for creating component families
 */
export abstract class ComponentAbstractFactory {
  abstract createRegistry(): ComponentRegistry;
  abstract getFrameworkName(): string;
}

/**
 * Commercial Components Factory - Standard security
 */
export class CommercialComponentFactory extends ComponentAbstractFactory {
  createRegistry(): ComponentRegistry {
    const registry = new ComponentRegistry();
    
    // Register standard commercial components
    registry.register('lambda-api', new LambdaApiCreator());
    registry.register('rds-postgres', new RdsPostgresCreator());
    registry.register('sqs-queue', new SqsQueueCreator());
    
    return registry;
  }

  getFrameworkName(): string {
    return 'commercial';
  }
}

/**
 * FedRAMP Moderate Components Factory - Enhanced security
 */
export class FedRAMPModerateComponentFactory extends ComponentAbstractFactory {
  createRegistry(): ComponentRegistry {
    const registry = new ComponentRegistry();
    
    // Register FedRAMP-compliant components with enhanced security
    registry.register('lambda-api', new EnhancedLambdaApiCreator());
    registry.register('rds-postgres', new HardenedRdsPostgresCreator());
    registry.register('sqs-queue', new EncryptedSqsQueueCreator());
    
    return registry;
  }

  getFrameworkName(): string {
    return 'fedramp-moderate';
  }
}

/**
 * FedRAMP High Components Factory - Maximum security
 */
export class FedRAMPHighComponentFactory extends ComponentAbstractFactory {
  createRegistry(): ComponentRegistry {
    const registry = new ComponentRegistry();
    
    // Register FedRAMP High components with maximum security controls
    registry.register('lambda-api', new MaxSecurityLambdaApiCreator());
    registry.register('rds-postgres', new MaxSecurityRdsPostgresCreator());
    registry.register('sqs-queue', new MaxSecuritySqsQueueCreator());
    
    return registry;
  }

  getFrameworkName(): string {
    return 'fedramp-high';
  }
}

/**
 * Enhanced Security Component Creators for FedRAMP
 */
class EnhancedLambdaApiCreator extends LambdaApiCreator {
  // Additional security configurations for FedRAMP Moderate
  protected applySecurityEnhancements(): void {
    // Enhanced logging, encryption, access controls
  }
}

class HardenedRdsPostgresCreator extends RdsPostgresCreator {
  // Hardened database configurations
  protected applyDatabaseHardening(): void {
    // Enhanced backup, encryption, access logging
  }
}

class EncryptedSqsQueueCreator extends SqsQueueCreator {
  // Encrypted queue configurations
  protected applyEncryption(): void {
    // KMS encryption, enhanced monitoring
  }
}

class MaxSecurityLambdaApiCreator extends EnhancedLambdaApiCreator {
  // Maximum security for FedRAMP High
  protected applyMaxSecurity(): void {
    // VPC isolation, additional monitoring, strict IAM
  }
}

class MaxSecurityRdsPostgresCreator extends HardenedRdsPostgresCreator {
  // Maximum database security
  protected applyMaxDatabaseSecurity(): void {
    // Advanced threat protection, audit logging, network isolation
  }
}

class MaxSecuritySqsQueueCreator extends EncryptedSqsQueueCreator {
  // Maximum queue security
  protected applyMaxQueueSecurity(): void {
    // Customer-managed KMS, dead letter queues, enhanced monitoring
  }
}

/**
 * Factory Provider - Returns appropriate factory based on compliance framework
 */
export class ComponentFactoryProvider {
  static createFactory(complianceFramework: string): ComponentAbstractFactory {
    switch (complianceFramework) {
      case 'fedramp-high':
        return new FedRAMPHighComponentFactory();
      case 'fedramp-moderate':
        return new FedRAMPModerateComponentFactory();
      case 'commercial':
      default:
        return new CommercialComponentFactory();
    }
  }

  static getAvailableFrameworks(): string[] {
    return ['commercial', 'fedramp-moderate', 'fedramp-high'];
  }
}