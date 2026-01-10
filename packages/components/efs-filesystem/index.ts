/**
 * @platform/efs-filesystem - EfsFilesystemComponent Component
 * EFS Filesystem Component
 */

// Component exports
export { EfsFilesystemComponent } from './src/efs-filesystem.component.js';

// Configuration exports
export type { EfsFilesystemConfig } from './src/efs-filesystem.builder.js';
export {
  EfsFilesystemComponentConfigBuilder,
  EFS_FILESYSTEM_CONFIG_SCHEMA
} from './src/efs-filesystem.builder.js';

// Creator exports
export { EfsFilesystemComponentCreator } from './src/efs-filesystem.creator.js';
