/**
 * @platform/kinesis-stream - KinesisStreamComponent Component
 * Kinesis Stream Component implementing Component API Contract v1.0
 */

// Component exports
export { KinesisStreamComponent } from './kinesis-stream.component.js';

// Configuration exports
export type { KinesisStreamConfig } from './kinesis-stream.builder.js';
export { 
  KinesisStreamComponentConfigBuilder,
  KINESIS_STREAM_CONFIG_SCHEMA
} from './kinesis-stream.builder.js';

// Creator exports
export { KinesisStreamComponentCreator } from './kinesis-stream.creator.js';