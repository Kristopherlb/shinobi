"use strict";
/**
 * @platform/efs-filesystem - EfsFilesystemComponent Component
 * EFS Filesystem Component
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EfsFilesystemComponentCreator = exports.EFS_FILESYSTEM_CONFIG_SCHEMA = exports.EfsFilesystemComponentConfigBuilder = exports.EfsFilesystemComponentComponent = void 0;
// Component exports
var efs_filesystem_component_1 = require("./efs-filesystem.component");
Object.defineProperty(exports, "EfsFilesystemComponentComponent", { enumerable: true, get: function () { return efs_filesystem_component_1.EfsFilesystemComponentComponent; } });
// Configuration exports
var efs_filesystem_builder_1 = require("./efs-filesystem.builder");
Object.defineProperty(exports, "EfsFilesystemComponentConfigBuilder", { enumerable: true, get: function () { return efs_filesystem_builder_1.EfsFilesystemComponentConfigBuilder; } });
Object.defineProperty(exports, "EFS_FILESYSTEM_CONFIG_SCHEMA", { enumerable: true, get: function () { return efs_filesystem_builder_1.EFS_FILESYSTEM_CONFIG_SCHEMA; } });
// Creator exports
var efs_filesystem_creator_1 = require("./efs-filesystem.creator");
Object.defineProperty(exports, "EfsFilesystemComponentCreator", { enumerable: true, get: function () { return efs_filesystem_creator_1.EfsFilesystemComponentCreator; } });
