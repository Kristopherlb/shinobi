/**
 * @platform/cloudfront-distribution - CloudFrontDistributionComponent Component
 * CloudFront Distribution Component implementing Component API Contract v1.0
 */

// Component exports
export { CloudFrontDistributionComponentComponent } from './src/cloudfront-distribution.component.js';

// Configuration exports
export {
  CloudFrontDistributionComponentConfigBuilder,
  CLOUDFRONT_DISTRIBUTION_CONFIG_SCHEMA
} from './src/cloudfront-distribution.builder.js';

// Type exports
export type { CloudFrontDistributionConfig } from './src/cloudfront-distribution.builder.js';

// Creator exports
export { CloudFrontDistributionComponentCreator } from './src/cloudfront-distribution.creator.js';
