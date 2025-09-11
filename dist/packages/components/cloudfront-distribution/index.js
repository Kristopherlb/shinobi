"use strict";
/**
 * @platform/cloudfront-distribution - CloudFrontDistributionComponent Component
 * CloudFront Distribution Component implementing Component API Contract v1.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CloudFrontDistributionComponentCreator = exports.CLOUDFRONT_DISTRIBUTION_CONFIG_SCHEMA = exports.CloudFrontDistributionComponentConfigBuilder = exports.CloudFrontDistributionComponentComponent = void 0;
// Component exports
var cloudfront_distribution_component_1 = require("./cloudfront-distribution.component");
Object.defineProperty(exports, "CloudFrontDistributionComponentComponent", { enumerable: true, get: function () { return cloudfront_distribution_component_1.CloudFrontDistributionComponentComponent; } });
// Configuration exports
var cloudfront_distribution_builder_1 = require("./cloudfront-distribution.builder");
Object.defineProperty(exports, "CloudFrontDistributionComponentConfigBuilder", { enumerable: true, get: function () { return cloudfront_distribution_builder_1.CloudFrontDistributionComponentConfigBuilder; } });
Object.defineProperty(exports, "CLOUDFRONT_DISTRIBUTION_CONFIG_SCHEMA", { enumerable: true, get: function () { return cloudfront_distribution_builder_1.CLOUDFRONT_DISTRIBUTION_CONFIG_SCHEMA; } });
// Creator exports
var cloudfront_distribution_creator_1 = require("./cloudfront-distribution.creator");
Object.defineProperty(exports, "CloudFrontDistributionComponentCreator", { enumerable: true, get: function () { return cloudfront_distribution_creator_1.CloudFrontDistributionComponentCreator; } });
