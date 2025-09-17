/**
 * @platform/bindings - Component Binding Strategies and Registry
 * Strategies for connecting AWS components automatically
 */

// Re-export shared binding context
export { BindingContext } from '../platform/contracts';

// Export binding strategies
// Note: These strategy files don't exist yet, commenting out for now
// export { LambdaToRdsImportStrategy, LambdaToRdsImportStrategyDependencies } from './strategies/lambda-to-rds-import.strategy';
// export { LambdaToSnsImportStrategy, LambdaToSnsImportStrategyDependencies } from './strategies/lambda-to-sns-import.strategy';
export { ComputeToOpenFeatureStrategy, ComputeToOpenFeatureStrategyDependencies } from './strategies/compute-to-openfeature.strategy';
export { ComputeToServiceConnectBinder } from './strategies/compute-to-service-connect.strategy';
export { ComputeToIamRoleBinder } from './strategies/compute-to-iam-role.strategy';
export { ComputeToSecurityGroupImportBinder } from './strategies/compute-to-security-group-import.strategy';