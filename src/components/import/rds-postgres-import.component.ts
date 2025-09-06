/**
 * RDS Postgres Import Component
 * Imports an existing RDS PostgreSQL database instance for binding purposes
 * Does NOT create new infrastructure - only references existing resources
 */

import * as rds from 'aws-cdk-lib/aws-rds';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';
import { BaseComponent, ComponentContext, ComponentCapabilities } from '../base/base-component';
import { Logger } from '../../utils/logger';

export interface RdsPostgresImportConfig {
  instanceArn: string;
  securityGroupId: string;
  secretArn: string;
  engine?: string; // Defaults to 'postgres'
}

export interface RdsPostgresImportDependencies {
  logger: Logger;
}

/**
 * Import component for existing RDS PostgreSQL instances
 * Enables secure binding to shared database resources managed by other teams
 */
export class RdsPostgresImportComponent extends BaseComponent<RdsPostgresImportConfig> {
  private databaseInstance: rds.IDatabaseInstance;
  private secret: secretsmanager.ISecret;
  private securityGroup: ec2.ISecurityGroup;

  constructor(
    scope: Construct,
    id: string,
    private config: RdsPostgresImportConfig,
    private dependencies: RdsPostgresImportDependencies
  ) {
    super(scope, id);
    
    // Validate required configuration
    this.validateConfig();
    
    // Import the existing resources
    this.importExistingResources();
  }

  /**
   * Synthesis phase - Import existing resources without creating new ones
   */
  async synth(context: ComponentContext): Promise<void> {
    this.dependencies.logger.debug(`Importing existing RDS PostgreSQL instance: ${this.config.instanceArn}`);
    
    // The resources are already imported in constructor
    // This method is called for consistency with the platform lifecycle
    
    this.dependencies.logger.debug('RDS PostgreSQL import component synthesis completed');
  }

  /**
   * Get the capabilities this imported database provides
   */
  getCapabilities(): ComponentCapabilities {
    return {
      'db:postgres': {
        description: 'PostgreSQL database access',
        bindings: {
          read: {
            description: 'Read-only access to the database',
            environmentVariables: {
              DATABASE_URL: 'Connection string for read access',
              DB_HOST: 'Database hostname',
              DB_PORT: 'Database port',
              DB_NAME: 'Database name',
              DB_USERNAME: 'Database username',
              DB_PASSWORD: 'Database password (from secret)'
            }
          },
          write: {
            description: 'Write access to the database',
            environmentVariables: {
              DATABASE_URL: 'Connection string for write access',
              DB_HOST: 'Database hostname',
              DB_PORT: 'Database port',
              DB_NAME: 'Database name',
              DB_USERNAME: 'Database username',
              DB_PASSWORD: 'Database password (from secret)'
            }
          },
          readwrite: {
            description: 'Full read/write access to the database',
            environmentVariables: {
              DATABASE_URL: 'Connection string for full access',
              DB_HOST: 'Database hostname',
              DB_PORT: 'Database port',
              DB_NAME: 'Database name',
              DB_USERNAME: 'Database username',
              DB_PASSWORD: 'Database password (from secret)'
            }
          },
          admin: {
            description: 'Administrative access to the database',
            environmentVariables: {
              DATABASE_URL: 'Connection string for admin access',
              DB_HOST: 'Database hostname',
              DB_PORT: 'Database port',
              DB_NAME: 'Database name',
              DB_USERNAME: 'Database username (admin)',
              DB_PASSWORD: 'Database password (from secret)'
            }
          }
        }
      }
    };
  }

  /**
   * Get the imported database instance for binding strategies
   */
  getDatabaseInstance(): rds.IDatabaseInstance {
    return this.databaseInstance;
  }

  /**
   * Get the imported secret for credential access
   */
  getSecret(): secretsmanager.ISecret {
    return this.secret;
  }

  /**
   * Get the imported security group for network access control
   */
  getSecurityGroup(): ec2.ISecurityGroup {
    return this.securityGroup;
  }

  /**
   * Validate the import configuration
   */
  private validateConfig(): void {
    if (!this.config.instanceArn) {
      throw new Error('instanceArn is required for RDS PostgreSQL import component');
    }

    if (!this.config.securityGroupId) {
      throw new Error('securityGroupId is required for RDS PostgreSQL import component');
    }

    if (!this.config.secretArn) {
      throw new Error('secretArn is required for RDS PostgreSQL import component');
    }

    // Validate ARN formats
    if (!this.config.instanceArn.startsWith('arn:aws:rds:')) {
      throw new Error(`Invalid RDS instance ARN format: ${this.config.instanceArn}`);
    }

    if (!this.config.secretArn.startsWith('arn:aws:secretsmanager:')) {
      throw new Error(`Invalid Secrets Manager ARN format: ${this.config.secretArn}`);
    }

    // Validate security group ID format
    if (!this.config.securityGroupId.startsWith('sg-')) {
      throw new Error(`Invalid security group ID format: ${this.config.securityGroupId}`);
    }
  }

  /**
   * Import existing AWS resources using CDK's fromXxx methods
   */
  private importExistingResources(): void {
    this.dependencies.logger.debug('Importing existing RDS resources');

    // Parse ARN to extract database identifier
    const arnParts = this.config.instanceArn.split(':');
    if (arnParts.length < 6) {
      throw new Error(`Invalid RDS ARN format: ${this.config.instanceArn}`);
    }
    
    const region = arnParts[3];
    const accountId = arnParts[4];
    const instanceIdentifier = arnParts[5].replace('db:', '');

    // Import the RDS database instance
    this.databaseInstance = rds.DatabaseInstance.fromDatabaseInstanceAttributes(
      this,
      'ImportedDatabase',
      {
        instanceIdentifier,
        instanceEndpointAddress: `${instanceIdentifier}.${region}.rds.amazonaws.com`,
        port: 5432, // Standard PostgreSQL port
        securityGroups: [], // Will be populated separately
        engine: rds.DatabaseInstanceEngine.postgres({
          version: rds.PostgresEngineVersion.VER_15_4 // Default version, actual doesn't matter for imports
        })
      }
    );

    // Import the secret containing database credentials
    this.secret = secretsmanager.Secret.fromSecretCompleteArn(
      this,
      'ImportedSecret',
      this.config.secretArn
    );

    // Import the security group
    this.securityGroup = ec2.SecurityGroup.fromSecurityGroupId(
      this,
      'ImportedSecurityGroup',
      this.config.securityGroupId
    );

    this.dependencies.logger.debug('RDS resources imported successfully');
  }

  /**
   * Get resource references for CloudFormation outputs or binding
   */
  getResourceReferences(): Record<string, any> {
    return {
      databaseInstance: this.databaseInstance,
      secret: this.secret,
      securityGroup: this.securityGroup,
      instanceArn: this.config.instanceArn,
      secretArn: this.config.secretArn,
      securityGroupId: this.config.securityGroupId
    };
  }
}