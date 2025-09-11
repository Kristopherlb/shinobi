/**
 * @platform/static-website - Static Website Component
 * Static website hosting with S3 and CloudFront CDN
 */

// Component exports
export { StaticWebsiteComponent } from './static-website.component';

// Configuration exports
export { 
  StaticWebsiteConfig,
  StaticWebsiteConfigBuilder,
  STATIC_WEBSITE_CONFIG_SCHEMA
} from './static-website.builder';

// Creator exports
export { StaticWebsiteCreator } from './static-website.creator';