import { Logger } from '../utils/logger';
import { ValidationOrchestrator } from '../services/validation-orchestrator';
import { FileDiscovery } from './utils/file-discovery';
import { CloudFormationClient, GetTemplateCommand } from '@aws-sdk/client-cloudformation';
import * as cdk from 'aws-cdk-lib';
import { load as loadYaml } from 'js-yaml';

export interface PlanOptions {
  file?: string;
  env?: string;
}

export interface PlanResult {
  success: boolean;
  exitCode: number;
  data?: {
    resolvedManifest: any;
    warnings: string[];
    synthesisResult?: any;
    cdkDiff?: any;
    cloudFormationTemplate?: any;
  };
  error?: string;
}

interface PlanDependencies {
  pipeline: ValidationOrchestrator;
  fileDiscovery: FileDiscovery;
  logger: Logger;
}

export class PlanCommand {
  private cloudFormationClient: CloudFormationClient;

  constructor(private dependencies: PlanDependencies) {
    this.cloudFormationClient = new CloudFormationClient({});
  }

  async execute(options: PlanOptions): Promise<PlanResult> {
    this.dependencies.logger.debug('Starting plan command', options);

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
      this.dependencies.logger.info(`Planning deployment for environment: ${env}`);
      this.dependencies.logger.info(`Using manifest: ${manifestPath}`);

      // Run full validation pipeline (all 4 stages)
      const validationResult = await this.dependencies.pipeline.plan(manifestPath, env);

      // Perform basic CDK synthesis (simplified for now)
      this.dependencies.logger.info('Synthesizing infrastructure components...');

      const synthesisResult = await this.performBasicCdkSynthesis(
        validationResult.resolvedManifest,
        env
      );

      // Perform CDK diff analysis
      this.dependencies.logger.info('Analyzing infrastructure changes...');
      const cdkDiff = await this.performCdkDiff(synthesisResult);

      // Format and display comprehensive plan output
      console.log('DEBUG: About to import PlanOutputFormatter');
      const { PlanOutputFormatter } = await import('../services/plan-output-formatter');
      console.log('DEBUG: PlanOutputFormatter imported successfully');
      const outputFormatter = new PlanOutputFormatter({
        logger: this.dependencies.logger
      });
      console.log('DEBUG: PlanOutputFormatter created successfully');

      const formattedOutput = outputFormatter.formatPlanOutput({
        synthesisResult: {
          ...synthesisResult,
          resolvedManifest: validationResult.resolvedManifest
        },
        cdkDiff,
        environment: env,
        complianceFramework: validationResult.resolvedManifest.complianceFramework || 'commercial'
      });

      this.dependencies.logger.success('Plan generation completed successfully');

      // Display formatted output
      this.dependencies.logger.info('\n' + formattedOutput.userFriendlySummary);

      // Display recommendations
      if (formattedOutput.recommendations.length > 0) {
        this.dependencies.logger.info('\n--- Recommendations ---');
        formattedOutput.recommendations.forEach(rec => {
          this.dependencies.logger.info(`  ${rec}`);
        });
      }

      // Display warnings
      if (formattedOutput.warnings.length > 0) {
        this.dependencies.logger.warn('\n--- Warnings ---');
        formattedOutput.warnings.forEach(warning => {
          this.dependencies.logger.warn(`  ${warning}`);
        });
      }

      // Display active compliance framework (AC-E3)
      this.dependencies.logger.info(`Active Framework: ${validationResult.resolvedManifest.complianceFramework || 'commercial'}`);

      if (validationResult.warnings && validationResult.warnings.length > 0) {
        this.dependencies.logger.warn(`Found ${validationResult.warnings.length} warning(s):`);
        validationResult.warnings.forEach(warning => {
          this.dependencies.logger.warn(`  - ${warning}`);
        });
      }

      this.dependencies.logger.info('\nResolved Configuration:');
      this.dependencies.logger.info(JSON.stringify(validationResult.resolvedManifest, null, 2));

      return {
        success: true,
        exitCode: 0,
        data: {
          resolvedManifest: validationResult.resolvedManifest,
          warnings: validationResult.warnings || [],
          synthesisResult: synthesisResult,
          cdkDiff: cdkDiff,
          cloudFormationTemplate: synthesisResult.app.synth().stacks[0].template
        }
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.dependencies.logger.error('Plan failed:', error);

      return {
        success: false,
        exitCode: 2,
        error: errorMessage
      };
    }
  }

  /**
   * Perform basic CDK synthesis using AWS CDK
   */
  private async performBasicCdkSynthesis(manifest: any, environment: string): Promise<any> {
    try {
      this.dependencies.logger.debug('Starting basic CDK synthesis');


      // Create CDK App
      const app = new cdk.App({
        context: {
          serviceName: manifest.service,
          owner: manifest.owner,
          environment,
          complianceFramework: manifest.complianceFramework || 'commercial'
        }
      });

      // Create stack
      const stack = new cdk.Stack(app, `${manifest.service}-stack`, {
        env: {
          account: process.env.CDK_DEFAULT_ACCOUNT || process.env.AWS_ACCOUNT_ID || '123456789012',
          region: process.env.CDK_DEFAULT_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1'
        }
      });

      // Apply stack context for downstream consumers
      stack.node.setContext('environment', environment);

      // Apply platform-standard tags that propagate to all resources

      stack.node.setContext('serviceName', manifest.service);
      stack.node.setContext('owner', manifest.owner);
      stack.node.setContext('complianceFramework', manifest.complianceFramework || 'commercial');
      stack.node.setContext('environment', environment);
      stack.node.setContext('platform:service-name', manifest.service);
      stack.node.setContext('platform:owner', manifest.owner);
      stack.node.setContext('platform:environment', environment);
      stack.node.setContext('platform:managed-by', 'shinobi');

      const stackTags: Record<string, string | undefined> = {
        'platform:service-name': manifest.service,
        'platform:owner': manifest.owner,
        'platform:environment': environment,
        'platform:managed-by': 'platform-cdk'
        'platform:managed-by': 'shinobi'
      };

      Object.entries(stackTags).forEach(([key, value]) => {
        if (value) {
          cdk.Tags.of(stack).add(key, value);
        }
      });

      // Create basic AWS resources based on components
      if (manifest.components && Array.isArray(manifest.components)) {
        for (const component of manifest.components) {
          await this.createBasicAwsResource(stack, component, manifest, environment);
        }
      }

      // Synthesize the app
      const synthesizedStacks = app.synth().stacks;
      const synthesizedStack = synthesizedStacks[0];

      this.dependencies.logger.info(`Synthesized stack: ${synthesizedStack.stackName}`);
      this.dependencies.logger.debug(`Resources: ${Object.keys(synthesizedStack.template.Resources || {}).length}`);

      return {
        app,
        stacks: [stack],
        synthesizedStack,
        template: synthesizedStack.template
      };

    } catch (error) {
      this.dependencies.logger.error('CDK synthesis failed:', error);
      throw error;
    }
  }

  /**
   * Create AWS resources using the real component factory
   */

  private async createBasicAwsResource(
    stack: cdk.Stack,
    component: any,
    manifest: any,
    environment: string
  ): Promise<void> {
    // Get supported component types from the component factory
    const supportedTypes = this.getSupportedComponentTypes();

    // Validate component type exists - FAIL HARD for invalid types
    if (!supportedTypes.includes(component.type)) {
      const availableTypes = supportedTypes.join(', ');
      const errorMessage = `Unsupported component type: ${component.type}. ` +
        `Available types: ${availableTypes}. ` +
        `This is not a valid manifest.`;

      this.dependencies.logger.error(errorMessage);
      throw new Error(errorMessage);
    }

    try {
      // Import the component creator
      const componentCreator = await this.getComponentCreator(component.type);

      // Create component context
      const context = {
        serviceName: manifest.service,
        environment,
        owner: manifest.owner,
        complianceFramework: manifest.complianceFramework || 'commercial',
        region: process.env.AWS_DEFAULT_REGION || 'us-east-1'
      };

      // Create component spec
      const spec = {
        name: component.name,
        type: component.type,
        config: component.config || {}
      };

      // Create the component using the real factory
      const componentInstance = componentCreator.createComponent(stack, spec, context);

      this.dependencies.logger.debug(`Created ${component.type} component: ${component.name}`);

    } catch (error) {
      this.dependencies.logger.error(`Failed to create component ${component.name}:`, error);
      throw error;
    }
  }

  /**
   * Get supported component types from the component factory
   */
  private getSupportedComponentTypes(): string[] {
    return [
      'api-gateway-rest',
      'api-gateway-http',
      'ec2-instance',
      's3-bucket',
      'lambda-api',
      'rds-postgres',
      'elasticache-redis',
      'cloudwatch-dashboard',
      'vpc',
      'dynamodb-table',
      'sqs-queue',
      'sns-topic',
      'ecs-cluster',
      'ecs-fargate-service',
      'application-load-balancer',
      'certificate-manager',
      'cognito-user-pool',
      'cloudfront-distribution',
      'efs-filesystem',
      'eventbridge-rule-cron',
      'eventbridge-rule-pattern',
      'glue-job',
      'iam-policy',
      'iam-role',
      'kinesis-stream',
      'lambda-worker',
      'opensearch-domain',
      'route53-hosted-zone',
      'route53-record',
      'sagemaker-notebook-instance',
      'secrets-manager',
      'ssm-parameter',
      'static-website',
      'step-functions-statemachine',
      'waf-web-acl'
    ];
  }

  /**
   * Get component creator for a specific type
   */
  private async getComponentCreator(componentType: string): Promise<any> {
    switch (componentType) {
      case 'api-gateway-rest':
        const { ApiGatewayRestComponentCreator } = await import('../../packages/components/api-gateway-rest/api-gateway-rest.creator');
        return new ApiGatewayRestComponentCreator();

      case 'api-gateway-http':
        const { ApiGatewayHttpComponentCreator } = await import('../../packages/components/api-gateway-http/api-gateway-http.creator');
        return new ApiGatewayHttpComponentCreator();

      case 'ec2-instance':
        const { Ec2InstanceComponentCreator } = await import('../../packages/components/ec2-instance/ec2-instance.creator');
        return new Ec2InstanceComponentCreator();

      case 's3-bucket':
        const { S3BucketComponentCreator } = await import('../../packages/components/s3-bucket/s3-bucket.creator');
        return new S3BucketComponentCreator();

      case 'lambda-api':
        const { LambdaApiComponentCreator } = await import('../../packages/components/lambda-api/lambda-api.creator');
        return new LambdaApiComponentCreator();

      case 'rds-postgres':
        const { RdsPostgresComponentCreator } = await import('../../packages/components/rds-postgres/rds-postgres.creator');
        return new RdsPostgresComponentCreator();

      case 'elasticache-redis':
        const { ElastiCacheRedisComponentCreator } = await import('../../packages/components/elasticache-redis/elasticache-redis.creator');
        return new ElastiCacheRedisComponentCreator();

      case 'vpc':
        const { VpcComponentCreator } = await import('../../packages/components/vpc/vpc.creator');
        return new VpcComponentCreator();

      case 'dynamodb-table':
        const { DynamoDbTableComponentCreator } = await import('../../packages/components/dynamodb-table/dynamodb-table.creator');
        return new DynamoDbTableComponentCreator();

      case 'sqs-queue':
        const { SqsQueueComponentCreator } = await import('../../packages/components/sqs-queue/sqs-queue.creator');
        return new SqsQueueComponentCreator();

      case 'sns-topic':
        const { SnsTopicComponentCreator } = await import('../../packages/components/sns-topic/sns-topic.creator');
        return new SnsTopicComponentCreator();

      case 'ecs-cluster':
        const { EcsClusterComponentCreator } = await import('../../packages/components/ecs-cluster/ecs-cluster.creator');
        return new EcsClusterComponentCreator();

      case 'ecs-fargate-service':
        const { EcsFargateServiceComponentCreator } = await import('../../packages/components/ecs-fargate-service/ecs-fargate-service.creator');
        return new EcsFargateServiceComponentCreator();

      case 'application-load-balancer':
        const { ApplicationLoadBalancerComponentCreator } = await import('../../packages/components/application-load-balancer/application-load-balancer.creator');
        return new ApplicationLoadBalancerComponentCreator();

      case 'certificate-manager':
        const { CertificateManagerComponentCreator } = await import('../../packages/components/certificate-manager/certificate-manager.creator');
        return new CertificateManagerComponentCreator();

      case 'cognito-user-pool':
        const { CognitoUserPoolComponentCreator } = await import('../../packages/components/cognito-user-pool/cognito-user-pool.creator');
        return new CognitoUserPoolComponentCreator();

      case 'cloudfront-distribution':
        const { CloudFrontDistributionComponentCreator } = await import('../../packages/components/cloudfront-distribution/cloudfront-distribution.creator');
        return new CloudFrontDistributionComponentCreator();

      case 'efs-filesystem':
        const { EfsFilesystemComponentCreator } = await import('../../packages/components/efs-filesystem/efs-filesystem.creator');
        return new EfsFilesystemComponentCreator();

      case 'eventbridge-rule-cron':
        const { EventBridgeRuleCronComponentCreator } = await import('../../packages/components/eventbridge-rule-cron/eventbridge-rule-cron.creator');
        return new EventBridgeRuleCronComponentCreator();

      case 'eventbridge-rule-pattern':
        const { EventBridgeRulePatternComponentCreator } = await import('../../packages/components/eventbridge-rule-pattern/eventbridge-rule-pattern.creator');
        return new EventBridgeRulePatternComponentCreator();

      case 'glue-job':
        const { GlueJobComponentCreator } = await import('../../packages/components/glue-job/glue-job.creator');
        return new GlueJobComponentCreator();

      case 'iam-policy':
        const { IamPolicyComponentCreator } = await import('../../packages/components/iam-policy/iam-policy.creator');
        return new IamPolicyComponentCreator();

      case 'iam-role':
        const { IamRoleComponentCreator } = await import('../../packages/components/iam-role/iam-role.creator');
        return new IamRoleComponentCreator();

      case 'kinesis-stream':
        const { KinesisStreamComponentCreator } = await import('../../packages/components/kinesis-stream/kinesis-stream.creator');
        return new KinesisStreamComponentCreator();

      case 'lambda-worker':
        const { LambdaWorkerComponentCreator } = await import('../../packages/components/lambda-worker/lambda-worker.creator');
        return new LambdaWorkerComponentCreator();

      case 'opensearch-domain':
        const { OpenSearchDomainComponentCreator } = await import('../../packages/components/opensearch-domain/opensearch-domain.creator');
        return new OpenSearchDomainComponentCreator();

      case 'route53-hosted-zone':
        const { Route53HostedZoneComponentCreator } = await import('../../packages/components/route53-hosted-zone/route53-hosted-zone.creator');
        return new Route53HostedZoneComponentCreator();

      case 'route53-record':
        const { Route53RecordComponentCreator } = await import('../../packages/components/route53-record/route53-record.creator');
        return new Route53RecordComponentCreator();

      case 'sagemaker-notebook-instance':
        const { SageMakerNotebookInstanceComponentCreator } = await import('../../packages/components/sagemaker-notebook-instance/sagemaker-notebook-instance.creator');
        return new SageMakerNotebookInstanceComponentCreator();

      case 'secrets-manager':
        const { SecretsManagerComponentCreator } = await import('../../packages/components/secrets-manager/secrets-manager.creator');
        return new SecretsManagerComponentCreator();

      case 'ssm-parameter':
        const { SsmParameterComponentCreator } = await import('../../packages/components/ssm-parameter/ssm-parameter.creator');
        return new SsmParameterComponentCreator();

      case 'static-website':
        const { StaticWebsiteComponentCreator } = await import('../../packages/components/static-website/static-website.creator');
        return new StaticWebsiteComponentCreator();

      case 'step-functions-statemachine':
        const { StepFunctionsStateMachineComponentCreator } = await import('../../packages/components/step-functions-statemachine/step-functions-statemachine.creator');
        return new StepFunctionsStateMachineComponentCreator();

      case 'waf-web-acl':
        const { WafWebAclComponentCreator } = await import('../../packages/components/waf-web-acl/waf-web-acl.creator');
        return new WafWebAclComponentCreator();

      default:
        throw new Error(`Component creator not found for type: ${componentType}`);
    }
  }

  /**
   * Perform CDK diff analysis to show infrastructure changes
   * This is the missing piece that makes shinobi plan actually useful
   */
  private async performCdkDiff(synthesisResult: any): Promise<any> {
    try {
      this.dependencies.logger.debug('Starting CDK diff analysis');

      // Synthesize the CDK app to get CloudFormation templates
      const synthesizedStacks = synthesisResult.app.synth().stacks;
      const stack = synthesizedStacks[0];
      const stackName = stack.stackName;
      const newTemplate = stack.template;

      this.dependencies.logger.debug(`Analyzing stack: ${stackName}`);

      // Check if stack exists in AWS
      const existingTemplate = await this.getExistingStackTemplate(stackName);

      if (!existingTemplate) {
        // New stack - all resources will be added
        this.dependencies.logger.info('New stack detected - all resources will be created');
        return this.analyzeNewStack(newTemplate, stackName);
      } else {
        // Existing stack - compare templates
        this.dependencies.logger.info('Existing stack detected - comparing templates');
        return this.compareTemplates(existingTemplate, newTemplate, stackName);
      }

    } catch (error) {
      this.dependencies.logger.warn('CDK diff analysis failed, showing new stack analysis only');
      this.dependencies.logger.debug('Diff error:', error);

      // Fallback to new stack analysis
      const synthesizedStacks = synthesisResult.app.synth().stacks;
      const stack = synthesizedStacks[0];
      return this.analyzeNewStack(stack.template, stack.stackName);
    }
  }

  /**
   * Get existing stack template from AWS
   */
  private async getExistingStackTemplate(stackName: string): Promise<any | null> {
    try {
      const response = await this.cloudFormationClient.send(new GetTemplateCommand({
        StackName: stackName
      }));

      const templateBody = response.TemplateBody;
      if (!templateBody) {
        this.dependencies.logger.debug(`No template body returned for stack ${stackName}`);
        return null;
      }

      try {
        return JSON.parse(templateBody);
      } catch (jsonError) {
        try {
          const yamlTemplate = loadYaml(templateBody);
          return yamlTemplate === undefined ? null : yamlTemplate;
        } catch (yamlError) {
          this.dependencies.logger.debug('Failed to parse stack template body as JSON or YAML', {
            jsonError,
            yamlError
          });
          return null;
        }
      }
    } catch (error: any) {
      if (this.isStackDoesNotExistError(error)) {
        this.dependencies.logger.debug(`Stack ${stackName} does not exist in AWS`);
        return null;
      }

      if (this.isAccessOrCredentialError(error)) {
        const message = error?.message ?? 'Access denied retrieving stack template';
        this.dependencies.logger.warn(`Unable to retrieve existing stack template for ${stackName}: ${message}`);
        this.dependencies.logger.debug('Access error details:', error);
        return null;
      }

      this.dependencies.logger.debug('Failed to get existing stack template:', error);
      return null;
    }
  }

  private isStackDoesNotExistError(error: any): boolean {
    const message = (error?.message ?? '').toString().toLowerCase();
    return message.includes('does not exist');
  }

  private isAccessOrCredentialError(error: any): boolean {
    const code = (error?.name ?? error?.code ?? '').toString().toLowerCase();
    const statusCode = error?.$metadata?.httpStatusCode;
    if (statusCode === 403) {
      return true;
    }

    const accessErrorCodes = [
      'accessdenied',
      'accessdeniedexception',
      'unrecognizedclient',
      'unrecognizedclientexception',
      'invalidclienttokenid',
      'expiredtoken',
      'expiredtokenexception',
      'credentialsprovidererror'
    ];

    if (code && accessErrorCodes.some(errorCode => code.includes(errorCode))) {
      return true;
    }

    const message = (error?.message ?? '').toString().toLowerCase();
    const accessKeywords = [
      'not authorized',
      'access denied',
      'unable to locate credentials',
      'missing credentials',
      'could not load credentials',
      'unrecognized client',
      'invalid client token',
      'security token included in the request is expired',
      'expired token'
    ];

    return accessKeywords.some(keyword => message.includes(keyword));
  }

  /**
   * Analyze a new stack (no existing template)
   */
  private analyzeNewStack(template: any, stackName: string): any {
    const resources = template.Resources || {};
    const resourceNames = Object.keys(resources);

    const added: Record<string, any> = {};
    resourceNames.forEach(name => {
      added[name] = {
        type: resources[name].Type,
        properties: resources[name].Properties || {}
      };
    });

    return {
      resources: {
        added,
        modified: {},
        removed: {}
      },
      changes: {
        added: resourceNames.length,
        modified: 0,
        removed: 0,
        total: resourceNames.length
      },
      hasChanges: resourceNames.length > 0,
      stackName
    };
  }

  /**
   * Compare existing and new templates to find changes
   */
  private compareTemplates(existingTemplate: any, newTemplate: any, stackName: string): any {
    const existingResources = existingTemplate.Resources || {};
    const newResources = newTemplate.Resources || {};

    const existingNames = new Set(Object.keys(existingResources));
    const newNames = new Set(Object.keys(newResources));

    const added: Record<string, any> = {};
    const modified: Record<string, any> = {};
    const removed: Record<string, any> = {};

    // Find added resources
    for (const name of Array.from(newNames)) {
      if (!existingNames.has(name)) {
        added[name] = {
          type: newResources[name].Type,
          properties: newResources[name].Properties || {}
        };
      }
    }

    // Find removed resources
    for (const name of Array.from(existingNames)) {
      if (!newNames.has(name)) {
        removed[name] = {
          type: existingResources[name].Type,
          properties: existingResources[name].Properties || {}
        };
      }
    }

    // Find modified resources
    for (const name of Array.from(newNames)) {
      if (existingNames.has(name)) {
        const existing = existingResources[name];
        const updated = newResources[name];

        if (this.hasResourceChanged(existing, updated)) {
          modified[name] = {
            type: updated.Type,
            existing: existing.Properties || {},
            updated: updated.Properties || {}
          };
        }
      }
    }

    const totalChanges = Object.keys(added).length + Object.keys(modified).length + Object.keys(removed).length;

    return {
      resources: { added, modified, removed },
      changes: {
        added: Object.keys(added).length,
        modified: Object.keys(modified).length,
        removed: Object.keys(removed).length,
        total: totalChanges
      },
      hasChanges: totalChanges > 0,
      stackName
    };
  }

  /**
   * Check if a resource has changed between templates
   */
  private hasResourceChanged(existing: any, updated: any): boolean {
    // Simple comparison - in production this would be more sophisticated
    return JSON.stringify(existing) !== JSON.stringify(updated);
  }
}