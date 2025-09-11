"use strict";
/**
 * @platform/vpc - VPC Component
 * AWS Virtual Private Cloud component for network isolation with compliance-aware configurations
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.VpcCreator = exports.VPC_CONFIG_SCHEMA = exports.VpcConfigBuilder = exports.VpcComponent = void 0;
// Component exports
var vpc_component_1 = require("./vpc.component");
Object.defineProperty(exports, "VpcComponent", { enumerable: true, get: function () { return vpc_component_1.VpcComponent; } });
// Configuration exports
var vpc_builder_1 = require("./vpc.builder");
Object.defineProperty(exports, "VpcConfigBuilder", { enumerable: true, get: function () { return vpc_builder_1.VpcConfigBuilder; } });
Object.defineProperty(exports, "VPC_CONFIG_SCHEMA", { enumerable: true, get: function () { return vpc_builder_1.VPC_CONFIG_SCHEMA; } });
// Creator exports
var vpc_creator_1 = require("./vpc.creator");
Object.defineProperty(exports, "VpcCreator", { enumerable: true, get: function () { return vpc_creator_1.VpcCreator; } });
