/**
 * Singleton Resource Handler Service
 * 
 * Post-processes synthesized CloudFormation templates to handle singleton AWS resources.
 * 
 * Some AWS resources are singletons per account/region (e.g., AWS::ApiGateway::Account).
 * If these resources already exist, CDK attempts to create new ones, causing Early
 * Validation failures. This service handles these cases by removing singleton resources
 * from templates when they already exist.
 * 
 * This service follows the Single Responsibility Principle - it only handles singleton
 * resource post-processing, delegating to specific handlers for each resource type.
 */

import type { Logger } from '../../logger/src/index.js';
import { ApiGatewayAccountHandler, type PostProcessResult } from './api-gateway-account-handler.js';

export interface SingletonResourceHandlerServiceDependencies {
  logger: Logger;
}

export interface PostProcessTemplateOptions {
  assemblyDir: string;
  stackId: string;
  templateFileName: string;
  region: string;
}

export class SingletonResourceHandlerService {
  private apiGatewayAccountHandler: ApiGatewayAccountHandler;

  constructor(private dependencies: SingletonResourceHandlerServiceDependencies) {
    this.apiGatewayAccountHandler = new ApiGatewayAccountHandler({
      logger: dependencies.logger
    });
  }

  /**
   * Post-process synthesized CloudFormation template to handle singleton resources
   * 
   * @param options - Post-processing options
   * @returns Result indicating if template/manifest were modified
   */
  async postProcessTemplate(
    options: PostProcessTemplateOptions
  ): Promise<PostProcessResult> {
    const { assemblyDir, stackId, templateFileName, region } = options;

    this.dependencies.logger.debug(
      `Post-processing template for singleton resources: ${stackId}`
    );

    // Handle ApiGateway Account singleton
    const apiGatewayResult = await this.apiGatewayAccountHandler.postProcess(
      assemblyDir,
      stackId,
      templateFileName,
      region
    );

    // Future: Add other singleton resource handlers here
    // e.g., S3 Bucket Notification Config, etc.

    return {
      templateModified: apiGatewayResult.templateModified,
      manifestModified: apiGatewayResult.manifestModified
    };
  }
}

