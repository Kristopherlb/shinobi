/**
 * Platform Component API Contract v1.0
 * 
 * This is the public API for the component contract system. All components
 * and platform services should import from this module to ensure they use
 * the standardized interfaces and base classes.
 */

// Core Component Contract
export { Component } from './component';

// Interface Definitions
export type {
  ComponentSpec,
  ComponentContext,
  ComponentCapabilities,
  ComponentBinding,
  ComponentSelector,
  ComponentOverrides,
  ComponentPolicy
} from './interfaces';

// Standard Capability Vocabulary
export type {
  DbPostgresCapability,
  DbDynamoDbCapability,
  QueueSqsCapability,
  TopicSnsCapability,
  BucketS3Capability,
  ApiRestCapability,
  LambdaFunctionCapability,
  NetVpcCapability,
  NetLoadBalancerTargetCapability,
  NetSshAccessCapability,
  ServiceConnectCapability,
  EventTriggerCapability,
  StandardCapabilityData,
  StandardCapabilityKey
} from './capabilities';

export {
  STANDARD_CAPABILITIES
} from './capabilities';

// Configuration Contract
export type {
  ComponentConfigSchema,
  ConfigValidationResult,
  ConfigValidationError,
  ConfigValidationWarning,
  ConfigBuilderContext,
  SchemaValidationHandler
} from './configuration';

export { ConfigBuilder } from './configuration';

// Extensibility Contract
export type {
  ComponentOverrideSpec,
  ComponentOverrideRegistry,
  AllowedOverridePath,
  OverrideProcessor,
  PatchContext,
  PatchFunction,
  PatchRegistration,
  PatchEngine,
  PatchValidationResult,
  ExtensionsConfig
} from './extensibility';

export { RDS_POSTGRES_OVERRIDE_REGISTRY } from './extensibility';

/**
 * Version information for the Component API Contract
 */
export const CONTRACT_VERSION = '1.0.0';

/**
 * Minimum supported platform version for this contract
 */
export const MIN_PLATFORM_VERSION = '2.0.0';