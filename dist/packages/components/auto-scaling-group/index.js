"use strict";
/**
 * @platform/auto-scaling-group - AutoScalingGroupComponent Component
 * Auto Scaling Group Component
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutoScalingGroupComponentCreator = exports.AUTO_SCALING_GROUP_CONFIG_SCHEMA = exports.AutoScalingGroupComponentConfigBuilder = exports.AutoScalingGroupComponentComponent = void 0;
// Component exports
var auto_scaling_group_component_1 = require("./auto-scaling-group.component");
Object.defineProperty(exports, "AutoScalingGroupComponentComponent", { enumerable: true, get: function () { return auto_scaling_group_component_1.AutoScalingGroupComponentComponent; } });
// Configuration exports
var auto_scaling_group_builder_1 = require("./auto-scaling-group.builder");
Object.defineProperty(exports, "AutoScalingGroupComponentConfigBuilder", { enumerable: true, get: function () { return auto_scaling_group_builder_1.AutoScalingGroupComponentConfigBuilder; } });
Object.defineProperty(exports, "AUTO_SCALING_GROUP_CONFIG_SCHEMA", { enumerable: true, get: function () { return auto_scaling_group_builder_1.AUTO_SCALING_GROUP_CONFIG_SCHEMA; } });
// Creator exports
var auto_scaling_group_creator_1 = require("./auto-scaling-group.creator");
Object.defineProperty(exports, "AutoScalingGroupComponentCreator", { enumerable: true, get: function () { return auto_scaling_group_creator_1.AutoScalingGroupComponentCreator; } });
