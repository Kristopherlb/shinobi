/**
 * SageMaker Notebook Instance Component
 * 
 * AWS SageMaker Notebook Instance for machine learning development and experimentation.
 * Implements platform standards with configuration-driven compliance.
 */

// Export the main component
export { SageMakerNotebookInstanceComponent } from './sagemaker-notebook-instance.component';

// Export the configuration builder
export { SageMakerNotebookInstanceComponentConfigBuilder } from './sagemaker-notebook-instance.builder';

// Export the component creator
export { SageMakerNotebookInstanceComponentCreator } from './sagemaker-notebook-instance.creator';

// Export types and schema
export type { SageMakerNotebookInstanceConfig } from './sagemaker-notebook-instance.builder';
export { SAGEMAKER_NOTEBOOK_INSTANCE_CONFIG_SCHEMA } from './sagemaker-notebook-instance.builder';