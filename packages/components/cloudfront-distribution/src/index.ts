/**
 * @platform/cloudfront-distribution - CloudFrontDistributionComponent Component
 * CloudFront Distribution Component implementing Component API Contract v1.0
 */

// Component exports
export { CloudFrontDistributionComponent } from './cloudfront-distribution.component.ts';

// Configuration exports
export {
  CloudFrontDistributionComponentConfigBuilder,
  CLOUDFRONT_DISTRIBUTION_CONFIG_SCHEMA
} from './cloudfront-distribution.builder.ts';

// Type exports
export type { CloudFrontDistributionConfig } from './cloudfront-distribution.builder.ts';

// Creator exports
export { CloudFrontDistributionComponentCreator } from './cloudfront-distribution.creator.ts';
