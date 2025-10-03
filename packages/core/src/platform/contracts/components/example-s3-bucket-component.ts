// src/platform/contracts/components/example-s3-bucket-component.ts
// Example S3 Bucket component implementation

import { BaseComponent } from './base-component.ts';
import { ComponentContext } from '../component-interfaces.ts';
import { S3CapabilityData } from '../bindings.ts';

/**
 * Example S3 Bucket component implementation
 * Demonstrates the component pattern for Shinobi platform
 */
export class ExampleS3BucketComponent extends BaseComponent {
  private bucketName: string;
  private bucketArn: string;

  constructor(config: Record<string, any>, context: ComponentContext) {
    super(config, context);

    // Validate configuration
    this.validateConfig();

    // Apply manifest-driven configuration (no framework branching)
    this.applyConfig(this.config);

    // Initialize component-specific properties
    this.bucketName = this.generateBucketName();
    this.bucketArn = this.generateBucketArn();
  }

  /**
   * Get component name
   */
  getName(): string {
    return this.getConfigValue('name', 's3-bucket');
  }

  /**
   * Get component ID
   */
  getId(): string {
    return `${this.getServiceName()}-${this.getEnvironment()}-${this.getName()}`;
  }

  /**
   * Get component type
   */
  getType(): string {
    return 's3-bucket';
  }

  /**
   * Get component capability data
   */
  getCapabilityData(): S3CapabilityData {
    return {
      type: 'storage:s3',
      resources: {
        arn: this.bucketArn,
        name: this.bucketName,
        region: this.getRegion()
      },
      encryption: {
        enabled: true,
        algorithm: this.getConfigValue('encryption', 'AES256')
      },
      versioning: {
        enabled: this.getConfigValue('versioned', false)
      },
      accessLogging: {
        enabled: this.getConfigValue('accessLogging', false)
      }
    };
  }

  /**
   * Synthesize CDK constructs
   */
  synth(): void {
    // In real implementation, this would create CDK constructs
    // For now, we'll just log the configuration
    console.log(`Synthesizing S3 bucket: ${this.bucketName}`);
    console.log('Configuration:', this.getConfig());
    console.log('Tags:', this.getTags());
  }

  // Removed framework-specific apply methods; configuration should be driven by manifest input

  /**
   * Validate component-specific configuration
   */
  public validateConfig(): void {
    super.validateConfig();

    // Validate S3-specific configuration
    if (this.hasConfigKey('encryption') && !['AES256', 'aws:kms'].includes(this.config.encryption)) {
      throw new Error('Invalid encryption type. Must be AES256 or aws:kms');
    }

    // Policy restrictions should be enforced by validators/policies, not hardcoded here
  }

  /**
   * Generate bucket name based on service and environment
   */
  private generateBucketName(): string {
    const serviceName = this.getServiceName().toLowerCase().replace(/[^a-z0-9-]/g, '-');
    const environment = this.getEnvironment().toLowerCase();
    const region = this.getRegion().toLowerCase();
    const randomSuffix = Math.random().toString(36).substring(2, 8);

    return `${serviceName}-${environment}-${region}-${randomSuffix}`;
  }

  /**
   * Generate bucket ARN
   */
  private generateBucketArn(): string {
    return `arn:aws:s3:::${this.bucketName}`;
  }

  /**
   * Get bucket name
   */
  getBucketName(): string {
    return this.bucketName;
  }

  /**
   * Get bucket ARN
   */
  getBucketArn(): string {
    return this.bucketArn;
  }
}
