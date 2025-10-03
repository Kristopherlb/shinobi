/**
 * @platform/s3-bucket - Enterprise S3 Bucket Component
 * S3 bucket with encryption, versioning, and compliance features
 */

export { S3BucketComponent } from './s3-bucket.component.ts';

export {
  S3BucketComponentConfigBuilder,
  S3_BUCKET_CONFIG_SCHEMA
} from './s3-bucket.builder.ts';
export type { S3BucketConfig } from './s3-bucket.builder.ts';

export { S3BucketComponentCreator } from './s3-bucket.creator.ts';
