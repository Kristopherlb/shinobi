/**
 * Network Rules Command
 *
 * Implements the `shinobi network-rules` command, which synthesizes the cross-stack
 * security group rules stack. This command:
 *
 * - Queries SSM Parameter Store for all cross-stack security group rule specifications
 * - Creates a CDK stack with the network rules
 * - Synthesizes the stack to CloudFormation templates
 *
 * After synthesis, use `shinobi up` or `cdk deploy` to deploy the stack.
 *
 * This enables independent service deployment by allowing Service A to add rules
 * to Service B's security group without requiring Service B to be redeployed.
 *
 * Exit codes:
 * - 0: Command successful
 * - 1: Command failed (SSM errors, CDK errors, AWS API failures)
 */

import * as path from 'path';
import * as fsp from 'fs/promises';
import * as os from 'os';
import { SSMClient, GetParametersByPathCommand } from '@aws-sdk/client-ssm';
import { App } from 'aws-cdk-lib';
import { CrossStackRuleManager, type CrossStackRuleSpec } from '@shinobi/core';
import { Logger } from './console-logger.js';

export interface NetworkRulesOptions {
  region?: string;
  account?: string;
  stackName?: string;
  json?: boolean;
  outputDir?: string;
}

export interface NetworkRulesResult {
  success: boolean;
  exitCode: number;
  data?: {
    stackName: string;
    rulesCount: number;
    outputPath?: string;
  };
  error?: string;
}

export class NetworkRulesCommand {
  constructor(private dependencies: { logger: Logger }) {}

  async execute(options: NetworkRulesOptions): Promise<NetworkRulesResult> {
    const { logger } = this.dependencies;

    try {
      logger.info('Querying SSM Parameter Store for cross-stack security group rules...');

      // Initialize SSM client
      const ssmClient = new SSMClient({
        region: options.region || process.env.AWS_REGION || 'us-east-1',
        ...(options.profile && { credentials: undefined }) // Profile handled by AWS SDK default chain
      });

      // Query all network rules from SSM
      const params: string[] = [];
      let nextToken: string | undefined;

      do {
        const command = new GetParametersByPathCommand({
          Path: '/shinobi/network-rules',
          Recursive: true,
          NextToken: nextToken
        });

        const response = await ssmClient.send(command);
        
        if (response.Parameters) {
          params.push(...response.Parameters.map((p: any) => p.Value || ''));
        }

        nextToken = response.NextToken;
      } while (nextToken);

      if (params.length === 0) {
        logger.info('No cross-stack security group rules found in SSM Parameter Store.');
        return {
          success: true,
          exitCode: 0,
          data: {
            stackName: options.stackName || 'NetworkRulesStack',
            rulesCount: 0
          }
        };
      }

      logger.info(`Found ${params.length} rule specification(s) in SSM Parameter Store.`);

      // Parse rule specifications
      const ruleSpecs: CrossStackRuleSpec[] = [];
      for (const paramValue of params) {
        try {
          const spec = JSON.parse(paramValue) as CrossStackRuleSpec;
          ruleSpecs.push(spec);
        } catch (error) {
          logger.warn(`Failed to parse rule specification: ${error instanceof Error ? error.message : 'Unknown error'}`);
          logger.warn(`Skipping invalid parameter value: ${paramValue.substring(0, 100)}...`);
        }
      }

      if (ruleSpecs.length === 0) {
        logger.warn('No valid rule specifications found after parsing.');
        return {
          success: true,
          exitCode: 0,
          data: {
            stackName: options.stackName || 'NetworkRulesStack',
            rulesCount: 0
          }
        };
      }

      logger.info(`Parsed ${ruleSpecs.length} valid rule specification(s).`);

      // Create CDK app and stack
      const app = new App();
      const stackName = options.stackName || 'NetworkRulesStack';
      const stack = CrossStackRuleManager.createNetworkRulesStack(app, ruleSpecs, stackName);

      // Set stack context (region, account)
      if (options.region) {
        stack.node.setContext('@aws-cdk/core:target-partitions', ['aws', 'aws-cn', 'aws-us-gov']);
        stack.node.setContext('@aws-cdk/core:target-regions', [options.region]);
      }
      if (options.account) {
        stack.node.setContext('@aws-cdk/core:target-accounts', [options.account]);
      }

      // Synthesize the stack
      const outputDir = options.outputDir || path.join(process.cwd(), 'cdk.out');
      logger.info(`Synthesizing network-rules stack to ${outputDir}...`);

      await app.synth();

      logger.success(`Successfully synthesized network-rules stack with ${ruleSpecs.length} rule(s).`);

      // Deploy if requested
      if (options.deploy) {
        logger.info('Deploying network-rules stack...');

        const cdk = await AwsCdkCli.fromCdkAppDirectory(outputDir, {
          app: 'node',
          executable: 'cdk',
          output: outputDir
        });

        const requireApproval = options.requireApproval === 'never'
          ? RequireApproval.NEVER
          : options.requireApproval === 'broadening'
          ? RequireApproval.BROADENING
          : RequireApproval.ANY_CHANGE;

        await cdk.deploy({
          stacks: [stackName],
          requireApproval: options.yes ? RequireApproval.NEVER : requireApproval,
          profile: options.profile,
          outputsFile: options.json ? path.join(outputDir, 'outputs.json') : undefined
        });

        logger.success('Successfully deployed network-rules stack.');
      }

      return {
        success: true,
        exitCode: 0,
        data: {
          stackName,
          rulesCount: ruleSpecs.length,
          outputPath: outputDir
        }
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Network rules command failed: ${message}`);
      
      if (error instanceof Error && error.stack) {
        logger.debug(error.stack);
      }

      return {
        success: false,
        exitCode: 1,
        error: message
      };
    }
  }
}

