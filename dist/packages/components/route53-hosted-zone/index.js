"use strict";
/**
 * @platform/route53-hosted-zone - Route53HostedZoneComponent Component
 * Route53 Hosted Zone Component
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Route53HostedZoneComponentCreator = exports.ROUTE53_HOSTED_ZONE_CONFIG_SCHEMA = exports.Route53HostedZoneComponentConfigBuilder = exports.Route53HostedZoneComponentComponent = void 0;
// Component exports
var route53_hosted_zone_component_1 = require("./route53-hosted-zone.component");
Object.defineProperty(exports, "Route53HostedZoneComponentComponent", { enumerable: true, get: function () { return route53_hosted_zone_component_1.Route53HostedZoneComponentComponent; } });
// Configuration exports
var route53_hosted_zone_builder_1 = require("./route53-hosted-zone.builder");
Object.defineProperty(exports, "Route53HostedZoneComponentConfigBuilder", { enumerable: true, get: function () { return route53_hosted_zone_builder_1.Route53HostedZoneComponentConfigBuilder; } });
Object.defineProperty(exports, "ROUTE53_HOSTED_ZONE_CONFIG_SCHEMA", { enumerable: true, get: function () { return route53_hosted_zone_builder_1.ROUTE53_HOSTED_ZONE_CONFIG_SCHEMA; } });
// Creator exports
var route53_hosted_zone_creator_1 = require("./route53-hosted-zone.creator");
Object.defineProperty(exports, "Route53HostedZoneComponentCreator", { enumerable: true, get: function () { return route53_hosted_zone_creator_1.Route53HostedZoneComponentCreator; } });
