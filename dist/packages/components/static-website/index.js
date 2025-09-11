"use strict";
/**
 * @platform/static-website - Static Website Component
 * Static website hosting with S3 and CloudFront CDN
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.StaticWebsiteCreator = exports.STATIC_WEBSITE_CONFIG_SCHEMA = exports.StaticWebsiteConfigBuilder = exports.StaticWebsiteComponent = void 0;
// Component exports
var static_website_component_1 = require("./static-website.component");
Object.defineProperty(exports, "StaticWebsiteComponent", { enumerable: true, get: function () { return static_website_component_1.StaticWebsiteComponent; } });
// Configuration exports
var static_website_builder_1 = require("./static-website.builder");
Object.defineProperty(exports, "StaticWebsiteConfigBuilder", { enumerable: true, get: function () { return static_website_builder_1.StaticWebsiteConfigBuilder; } });
Object.defineProperty(exports, "STATIC_WEBSITE_CONFIG_SCHEMA", { enumerable: true, get: function () { return static_website_builder_1.STATIC_WEBSITE_CONFIG_SCHEMA; } });
// Creator exports
var static_website_creator_1 = require("./static-website.creator");
Object.defineProperty(exports, "StaticWebsiteCreator", { enumerable: true, get: function () { return static_website_creator_1.StaticWebsiteCreator; } });
