"use strict";
/**
 * Route 53 Record Component Package
 *
 * Exports all Route 53 record component classes and interfaces.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Route53RecordCreator = exports.ROUTE53_RECORD_CONFIG_SCHEMA = exports.Route53RecordConfigBuilder = exports.Route53RecordComponent = void 0;
// Main component class
var route53_record_component_1 = require("./route53-record.component");
Object.defineProperty(exports, "Route53RecordComponent", { enumerable: true, get: function () { return route53_record_component_1.Route53RecordComponent; } });
// Configuration builder and interfaces
var route53_record_builder_1 = require("./route53-record.builder");
Object.defineProperty(exports, "Route53RecordConfigBuilder", { enumerable: true, get: function () { return route53_record_builder_1.Route53RecordConfigBuilder; } });
Object.defineProperty(exports, "ROUTE53_RECORD_CONFIG_SCHEMA", { enumerable: true, get: function () { return route53_record_builder_1.ROUTE53_RECORD_CONFIG_SCHEMA; } });
// Component creator factory
var route53_record_creator_1 = require("./route53-record.creator");
Object.defineProperty(exports, "Route53RecordCreator", { enumerable: true, get: function () { return route53_record_creator_1.Route53RecordCreator; } });
