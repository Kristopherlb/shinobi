/**
 * Static Website Component
 *
 * Static website hosting with S3 and CloudFront CDN for global performance.
 * Implements Platform Component API Contract v1.1 with BaseComponent extension.
 */
import { Construct } from 'constructs';
import { BaseComponent } from '../../platform/core/base-component';
import { ComponentSpec, ComponentContext, ComponentCapabilities } from '../../../src/platform/contracts/component-interfaces';
/**
 * Static Website Component implementing Component API Contract v1.1
 */
export declare class StaticWebsiteComponent extends BaseComponent {
    private bucket?;
    private distribution?;
    private deployment?;
    private accessLogBucket?;
    private distributionLogBucket?;
    private config?;
    private logger;
    constructor(scope: Construct, id: string, context: ComponentContext, spec: ComponentSpec);
    synth(): void;
    getCapabilities(): ComponentCapabilities;
    getType(): string;
    private createAccessLogBucketIfNeeded;
    private createDistributionLogBucketIfNeeded;
    private createWebsiteBucket;
    private createCloudFrontDistribution;
    private createDnsRecordsIfNeeded;
    private createDeploymentIfNeeded;
    private buildWebsiteName;
    private getBucketRemovalPolicy;
    private getLogRetentionDays;
    private buildWebsiteCapability;
}
