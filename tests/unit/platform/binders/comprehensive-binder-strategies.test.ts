/**
 * Comprehensive tests for all binder strategies
 */

import { ComprehensiveBinderRegistry } from '../../../src/platform/binders/registry/comprehensive-binder-registry';

describe('Comprehensive Binder Strategies', () => {
  let registry: ComprehensiveBinderRegistry;

  beforeEach(() => {
    registry = new ComprehensiveBinderRegistry();
  });

  describe('Registry Management', () => {
    it('should register all binder strategies', () => {
      const serviceTypes = registry.getAllServiceTypes();

      expect(serviceTypes).toContain('ecs-fargate');
      expect(serviceTypes).toContain('eks');
      expect(serviceTypes).toContain('app-runner');
      expect(serviceTypes).toContain('batch');
      expect(serviceTypes).toContain('elastic-beanstalk');
      expect(serviceTypes).toContain('lightsail');
      expect(serviceTypes).toContain('dynamodb');
      expect(serviceTypes).toContain('neptune');
      expect(serviceTypes).toContain('vpc');
      expect(serviceTypes).toContain('kinesis');
      // Note: s3-bucket and rds-postgres would be included when their strategies are available
    });

    it('should categorize services correctly', () => {
      const categories = registry.getServicesByCategory();

      expect(categories.Compute).toContain('ecs-fargate');
      expect(categories.Compute).toContain('eks');
      expect(categories.Database).toContain('dynamodb');
      expect(categories.Database).toContain('neptune');
      expect(categories.Networking).toContain('vpc');
      expect(categories.Analytics).toContain('kinesis');
      // Note: Storage and Messaging categories would be populated when strategies are available
    });

    it('should validate bindings correctly', () => {
      expect(registry.validateBinding('ecs-fargate', 'ecs:cluster')).toBe(true);
      expect(registry.validateBinding('dynamodb', 'dynamodb:table')).toBe(true);
      expect(registry.validateBinding('neptune', 'neptune:cluster')).toBe(true);
      expect(registry.validateBinding('vpc', 'vpc:network')).toBe(true);
      expect(registry.validateBinding('kinesis', 'kinesis:stream')).toBe(true);
      expect(registry.validateBinding('invalid-service', 'invalid:capability')).toBe(false);
    });
  });

  describe('Strategy Availability', () => {
    it('should have ECS Fargate strategy available', () => {
      const strategy = registry.get('ecs-fargate');
      expect(strategy).toBeDefined();
      expect(strategy?.supportedCapabilities).toContain('ecs:cluster');
      expect(strategy?.supportedCapabilities).toContain('ecs:service');
    });

    it('should have DynamoDB strategy available', () => {
      const strategy = registry.get('dynamodb');
      expect(strategy).toBeDefined();
      expect(strategy?.supportedCapabilities).toContain('dynamodb:table');
      expect(strategy?.supportedCapabilities).toContain('dynamodb:stream');
    });

    it('should have VPC strategy available', () => {
      const strategy = registry.get('vpc');
      expect(strategy).toBeDefined();
      expect(strategy?.supportedCapabilities).toContain('vpc:network');
      expect(strategy?.supportedCapabilities).toContain('vpc:security-group');
    });

    it('should have Kinesis strategy available', () => {
      const strategy = registry.get('kinesis');
      expect(strategy).toBeDefined();
      expect(strategy?.supportedCapabilities).toContain('kinesis:stream');
      expect(strategy?.supportedCapabilities).toContain('kinesis:firehose');
    });
  });

  describe('Error Handling', () => {
    it('should return undefined for non-existent service type', () => {
      const strategy = registry.get('non-existent-service');
      expect(strategy).toBeUndefined();
    });
  });

  describe('Binding Recommendations', () => {
    it('should provide binding recommendations for ECS Fargate', () => {
      const recommendations = registry.getBindingRecommendations('ecs-fargate');

      expect(recommendations).toContain('Bind to ECS cluster for container orchestration');
      expect(recommendations).toContain('Configure IAM roles for task execution');
      expect(recommendations).toContain('Set up service discovery for inter-service communication');
    });

    it('should provide binding recommendations for DynamoDB', () => {
      const recommendations = registry.getBindingRecommendations('dynamodb');

      expect(recommendations).toContain('Configure appropriate read/write capacity');
      expect(recommendations).toContain('Set up global secondary indexes for query optimization');
      expect(recommendations).toContain('Enable point-in-time recovery for compliance');
    });

    it('should provide binding recommendations for VPC', () => {
      const recommendations = registry.getBindingRecommendations('vpc');

      expect(recommendations).toContain('Configure VPC with appropriate CIDR blocks');
      expect(recommendations).toContain('Set up public and private subnets across AZs');
      expect(recommendations).toContain('Configure security groups with least privilege access');
    });

    it('should provide binding recommendations for Kinesis', () => {
      const recommendations = registry.getBindingRecommendations('kinesis');

      expect(recommendations).toContain('Configure appropriate shard count for throughput');
      expect(recommendations).toContain('Set up encryption at rest and in transit');
      expect(recommendations).toContain('Enable monitoring and alerting');
    });

    it('should return empty array for services without recommendations', () => {
      const recommendations = registry.getBindingRecommendations('unknown-service');
      expect(recommendations).toEqual([]);
    });
  });
});
