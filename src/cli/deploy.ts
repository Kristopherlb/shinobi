import { Logger } from './utils/logger';
import { FileDiscovery } from './utils/file-discovery';
import { execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

export interface DeployOptions {
  file?: string;
  env?: string;
  target?: string;
}

export interface DeployResult {
  success: boolean;
  exitCode: number;
  data?: {
    resolvedManifest: any;
    warnings: string[];
    synthesisResult?: any;
    deploymentOutputs?: any;
  };
  error?: string;
}

interface DeployDependencies {
  fileDiscovery: FileDiscovery;
  logger: Logger;
}

export class DeployCommand {
  constructor(private dependencies: DeployDependencies) {}

  async execute(options: DeployOptions): Promise<DeployResult> {
    this.dependencies.logger.debug('Starting deploy command', options);

    try {
      // Discover manifest file
      const manifestPath = options.file 
        ? options.file 
        : await this.dependencies.fileDiscovery.findManifest('.');

      if (!manifestPath) {
        return {
          success: false,
          exitCode: 2,
          error: 'No service.yml found in this directory or any parent directories.'
        };
      }

      const env = options.env || 'dev';
      const target = options.target || 'aws';
      
      this.dependencies.logger.info(`🚀 Deploying to ${target} (${env} environment)`);
      this.dependencies.logger.info(`Using manifest: ${manifestPath}`);

      if (target === 'localstack') {
        this.dependencies.logger.info('📡 Using LocalStack endpoint: http://localhost:4566');
        this.dependencies.logger.warn('⚠️  Make sure LocalStack is running: svc local up');
      }

      // For now, read and parse the manifest directly
      this.dependencies.logger.info('Reading service manifest...');
      const manifestContent = fs.readFileSync(manifestPath, 'utf8');
      const manifest = require('yaml').parse(manifestContent);
      
      // Simple validation - just check basic structure
      if (!manifest.service || !manifest.components) {
        throw new Error('Invalid manifest: missing required fields (service, components)');
      }
      
      this.dependencies.logger.info('Manifest loaded successfully');
      const synthesisResult = {
        serviceName: manifest.service,
        owner: manifest.owner,
        complianceFramework: manifest.complianceFramework || 'commercial',
        components: manifest.components
      };
      
      // Generate CDK app and deploy
      this.dependencies.logger.info('Generating CDK application...');
      const deploymentResult = await this.deployInfrastructure(synthesisResult, env, target);
      
      this.dependencies.logger.success('Deployment completed successfully');
      
      // Display deployment outputs if available
      if (deploymentResult.outputs) {
        this.dependencies.logger.info('\n--- Deployment Outputs ---');
        Object.entries(deploymentResult.outputs).forEach(([key, value]) => {
          this.dependencies.logger.info(`  ${key}: ${value}`);
        });
      }

      return {
        success: true,
        exitCode: 0,
        data: {
          resolvedManifest: manifest,
          warnings: [],
          synthesisResult: synthesisResult,
          deploymentOutputs: deploymentResult.outputs
        }
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.dependencies.logger.error('Deployment failed:', error);
      
      return {
        success: false,
        exitCode: 2,
        error: errorMessage
      };
    }
  }

  private async deployInfrastructure(synthesisResult: any, env: string, target: string): Promise<{ outputs?: any }> {
    // Create a temporary directory for the CDK app
    const tempDir = path.join(process.cwd(), '.cdk-deploy-temp');
    
    try {
      // Ensure temp directory exists
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      // Generate CDK app.ts file
      const appContent = this.generateCdkApp(synthesisResult, env);
      fs.writeFileSync(path.join(tempDir, 'app.ts'), appContent);

      // Generate package.json
      const packageJson = this.generatePackageJson(synthesisResult.serviceName);
      fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify(packageJson, null, 2));

      // Generate cdk.json
      const cdkJson = {
        app: 'npx ts-node app.ts',
        context: {
          '@aws-cdk/aws-lambda:recognizeLayerVersion': true,
          '@aws-cdk/core:checkSecretUsage': true,
          '@aws-cdk/core:target-partitions': ['aws', 'aws-cn'],
          '@aws-cdk-containers/ecs-service-extensions:enableLogging': true,
          '@aws-cdk/aws-ec2:uniqueImdsv2TemplateName': true,
          '@aws-cdk/aws-ecs:arnFormatIncludesClusterName': true,
          '@aws-cdk/core:validateSnapshotRemovalPolicy': true,
          '@aws-cdk/aws-codepipeline:crossAccountKeyAliasStackSafeResourceName': true,
          '@aws-cdk/aws-s3:createDefaultLoggingPolicy': true,
          '@aws-cdk/aws-sns-subscriptions:restrictSqsDescryption': true,
          '@aws-cdk/aws-apigateway:disableCloudWatchRole': false,
          '@aws-cdk/core:enablePartitionLiterals': true,
          '@aws-cdk/core:enableStackNameDuplicates': true,
          'aws-cdk:enableDiffNoFail': true,
          '@aws-cdk/core:stackRelativeExports': true
        }
      };
      fs.writeFileSync(path.join(tempDir, 'cdk.json'), JSON.stringify(cdkJson, null, 2));

      // Install dependencies
      this.dependencies.logger.info('Installing CDK dependencies...');
      execSync('npm install', { 
        cwd: tempDir, 
        stdio: 'inherit',
        timeout: 120000 // 2 minute timeout
      });

      // Set up environment for deployment
      const cdkEnv = { ...process.env };
      if (target === 'localstack') {
        cdkEnv.CDK_DEFAULT_ACCOUNT = '000000000000';
        cdkEnv.CDK_DEFAULT_REGION = 'us-east-1';
        cdkEnv.AWS_ACCESS_KEY_ID = 'test';
        cdkEnv.AWS_SECRET_ACCESS_KEY = 'test';
        cdkEnv.AWS_DEFAULT_REGION = 'us-east-1';
        cdkEnv.LOCALSTACK_ENDPOINT = 'http://localhost:4566';
      }

      // Bootstrap CDK (if needed)
      this.dependencies.logger.info('Bootstrapping CDK environment...');
      try {
        execSync(`npx cdk bootstrap --require-approval never`, {
          cwd: tempDir,
          env: cdkEnv,
          stdio: 'inherit',
          timeout: 300000 // 5 minute timeout
        });
      } catch (bootstrapError) {
        this.dependencies.logger.warn('CDK bootstrap may have failed, continuing with deployment...');
      }

      // Deploy the stack
      this.dependencies.logger.info('Deploying CDK stack...');
      const deployOutput = execSync(
        `npx cdk deploy --require-approval never --outputs-file outputs.json`, 
        {
          cwd: tempDir,
          env: cdkEnv,
          encoding: 'utf8',
          timeout: 900000 // 15 minute timeout
        }
      );

      this.dependencies.logger.debug('CDK Deploy Output:', deployOutput);

      // Read outputs if they exist
      let outputs;
      const outputsPath = path.join(tempDir, 'outputs.json');
      if (fs.existsSync(outputsPath)) {
        outputs = JSON.parse(fs.readFileSync(outputsPath, 'utf8'));
      }

      return { outputs };

    } finally {
      // Clean up temp directory
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    }
  }

  private generateCdkApp(synthesisResult: any, env: string): string {
    const stackName = `${synthesisResult.serviceName}-${env}`;
    
    return `#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';

class ${this.toPascalCase(synthesisResult.serviceName)}Stack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // Add synthesized constructs
    ${this.generateConstructCode(synthesisResult)}
  }
}

const app = new cdk.App();
new ${this.toPascalCase(synthesisResult.serviceName)}Stack(app, '${stackName}', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT || process.env.CDK_DEPLOY_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || process.env.CDK_DEPLOY_REGION || 'us-east-1',
  },
  tags: {
    'service-name': '${synthesisResult.serviceName}',
    'environment': '${env}',
    'owner': '${synthesisResult.owner || 'unknown'}',
    'compliance-framework': '${synthesisResult.complianceFramework || 'commercial'}'
  }
});
`;
  }

  private generateConstructCode(synthesisResult: any): string {
    // This is a simplified version - in a full implementation, we'd need to
    // serialize the actual CDK constructs from the synthesis result
    let code = '';
    
    if (synthesisResult.components) {
      synthesisResult.components.forEach((component: any, index: number) => {
        code += `    // Component: ${component.name} (${component.type})\n`;
        code += `    // TODO: Add actual construct instantiation for ${component.type}\n\n`;
      });
    }
    
    return code;
  }

  private generatePackageJson(serviceName: string) {
    return {
      name: `${serviceName}-cdk-deploy`,
      version: '0.1.0',
      private: true,
      scripts: {
        build: 'tsc',
        watch: 'tsc -w',
        test: 'jest',
        cdk: 'cdk'
      },
      devDependencies: {
        '@types/jest': '^29.4.0',
        '@types/node': '18.14.6',
        jest: '^29.5.0',
        'ts-jest': '^29.0.5',
        'aws-cdk': '2.87.0',
        typescript: '~4.9.5',
        'ts-node': '^10.9.1',
        'source-map-support': '^0.5.21'
      },
      dependencies: {
        'aws-cdk-lib': '2.87.0',
        constructs: '^10.0.0'
      }
    };
  }

  private toPascalCase(str: string): string {
    return str.replace(/(^\w|-\w)/g, (match) => match.replace('-', '').toUpperCase());
  }
}
