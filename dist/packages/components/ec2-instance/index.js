"use strict";
/**
 * @platform/ec2-instance - Ec2InstanceComponent Component
 * EC2 Instance Component
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Ec2InstanceComponentCreator = exports.EC2_INSTANCE_CONFIG_SCHEMA = exports.Ec2InstanceComponentConfigBuilder = exports.Ec2InstanceComponentComponent = void 0;
// Component exports
var ec2_instance_component_1 = require("./ec2-instance.component");
Object.defineProperty(exports, "Ec2InstanceComponentComponent", { enumerable: true, get: function () { return ec2_instance_component_1.Ec2InstanceComponentComponent; } });
// Configuration exports
var ec2_instance_builder_1 = require("./ec2-instance.builder");
Object.defineProperty(exports, "Ec2InstanceComponentConfigBuilder", { enumerable: true, get: function () { return ec2_instance_builder_1.Ec2InstanceComponentConfigBuilder; } });
Object.defineProperty(exports, "EC2_INSTANCE_CONFIG_SCHEMA", { enumerable: true, get: function () { return ec2_instance_builder_1.EC2_INSTANCE_CONFIG_SCHEMA; } });
// Creator exports
var ec2_instance_creator_1 = require("./ec2-instance.creator");
Object.defineProperty(exports, "Ec2InstanceComponentCreator", { enumerable: true, get: function () { return ec2_instance_creator_1.Ec2InstanceComponentCreator; } });
