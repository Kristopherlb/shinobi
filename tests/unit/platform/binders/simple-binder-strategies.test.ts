/**
 * Simple tests for binder strategies
 */

import { EcsFargateBinderStrategy } from '../../../src/platform/binders/strategies/compute/ecs-fargate-binder-strategy';
import { DynamoDbBinderStrategy } from '../../../src/platform/binders/strategies/database/dynamodb-binder-strategy';
import { VpcBinderStrategy } from '../../../src/platform/binders/strategies/networking/vpc-binder-strategy';
import { KinesisBinderStrategy } from '../../../src/platform/binders/strategies/analytics/kinesis-binder-strategy';

describe('Simple Binder Strategies', () => {
  describe('ECS Fargate Binder Strategy', () => {
    it('should have correct supported capabilities', () => {
      const strategy = new EcsFargateBinderStrategy();

      expect(strategy.supportedCapabilities).toContain('ecs:cluster');
      expect(strategy.supportedCapabilities).toContain('ecs:service');
      expect(strategy.supportedCapabilities).toContain('ecs:task-definition');
    });
  });

  describe('DynamoDB Binder Strategy', () => {
    it('should have correct supported capabilities', () => {
      const strategy = new DynamoDbBinderStrategy();

      expect(strategy.supportedCapabilities).toContain('dynamodb:table');
      expect(strategy.supportedCapabilities).toContain('dynamodb:index');
      expect(strategy.supportedCapabilities).toContain('dynamodb:stream');
    });
  });

  describe('VPC Binder Strategy', () => {
    it('should have correct supported capabilities', () => {
      const strategy = new VpcBinderStrategy();

      expect(strategy.supportedCapabilities).toContain('vpc:network');
      expect(strategy.supportedCapabilities).toContain('vpc:subnet');
      expect(strategy.supportedCapabilities).toContain('vpc:security-group');
      expect(strategy.supportedCapabilities).toContain('vpc:route-table');
      expect(strategy.supportedCapabilities).toContain('vpc:nat-gateway');
    });
  });

  describe('Kinesis Binder Strategy', () => {
    it('should have correct supported capabilities', () => {
      const strategy = new KinesisBinderStrategy();

      expect(strategy.supportedCapabilities).toContain('kinesis:stream');
      expect(strategy.supportedCapabilities).toContain('kinesis:analytics');
      expect(strategy.supportedCapabilities).toContain('kinesis:firehose');
    });
  });
});
