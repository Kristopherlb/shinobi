/**
 * @platform/ec2-instance - Ec2InstanceComponent Component
 * EC2 Instance Component
 */

// Component exports
export { Ec2InstanceComponent } from './ec2-instance.component.js';

// Configuration exports
export type {
  Ec2InstanceConfig
} from './ec2-instance.builder.js';
export {
  Ec2InstanceComponentConfigBuilder,
  EC2_INSTANCE_CONFIG_SCHEMA
} from './ec2-instance.builder.js';

// Creator exports
export { Ec2InstanceComponentCreator } from './ec2-instance.creator.js';