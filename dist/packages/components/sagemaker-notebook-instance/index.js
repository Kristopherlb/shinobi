"use strict";
/**
 * @platform/sagemaker-notebook-instance - SageMakerNotebookInstanceComponent Component
 * SageMaker Notebook Instance Component
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SageMakerNotebookInstanceComponentCreator = exports.SAGEMAKER_NOTEBOOK_INSTANCE_CONFIG_SCHEMA = exports.SageMakerNotebookInstanceComponentConfigBuilder = exports.SageMakerNotebookInstanceComponentComponent = void 0;
// Component exports
var sagemaker_notebook_instance_component_1 = require("./sagemaker-notebook-instance.component");
Object.defineProperty(exports, "SageMakerNotebookInstanceComponentComponent", { enumerable: true, get: function () { return sagemaker_notebook_instance_component_1.SageMakerNotebookInstanceComponentComponent; } });
// Configuration exports
var sagemaker_notebook_instance_builder_1 = require("./sagemaker-notebook-instance.builder");
Object.defineProperty(exports, "SageMakerNotebookInstanceComponentConfigBuilder", { enumerable: true, get: function () { return sagemaker_notebook_instance_builder_1.SageMakerNotebookInstanceComponentConfigBuilder; } });
Object.defineProperty(exports, "SAGEMAKER_NOTEBOOK_INSTANCE_CONFIG_SCHEMA", { enumerable: true, get: function () { return sagemaker_notebook_instance_builder_1.SAGEMAKER_NOTEBOOK_INSTANCE_CONFIG_SCHEMA; } });
// Creator exports
var sagemaker_notebook_instance_creator_1 = require("./sagemaker-notebook-instance.creator");
Object.defineProperty(exports, "SageMakerNotebookInstanceComponentCreator", { enumerable: true, get: function () { return sagemaker_notebook_instance_creator_1.SageMakerNotebookInstanceComponentCreator; } });
