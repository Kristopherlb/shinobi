/**
 * @platform/bindings - Component Binding Strategies and Registry
 * Strategies for connecting AWS components automatically
 */

// Re-export shared binding context
export { BindingContext } from '@platform/contracts';

// Export binding strategies
export { LambdaToRdsImportStrategy, LambdaToRdsImportStrategyDependencies } from './strategies/lambda-to-rds-import.strategy';
export { LambdaToSnsImportStrategy, LambdaToSnsImportStrategyDependencies } from './strategies/lambda-to-sns-import.strategy';
export { ComputeToOpenFeatureStrategy, ComputeToOpenFeatureStrategyDependencies } from './strategies/compute-to-openfeature.strategy';