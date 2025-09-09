/**
 * @platform/kinesis-stream - KinesisStreamComponent Component
 * Kinesis Stream Component implementing Component API Contract v1.0
 */

// Component exports
export { KinesisStreamComponentComponent } from './kinesis-stream.component';

// Configuration exports
export { 
  KinesisStreamConfig,
  KinesisStreamComponentConfigBuilder,
  KINESIS_STREAM_CONFIG_SCHEMA
} from './kinesis-stream.builder';

// Creator exports
export { KinesisStreamComponentCreator } from './kinesis-stream.creator';