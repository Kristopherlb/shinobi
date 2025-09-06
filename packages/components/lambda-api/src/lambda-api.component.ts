/**
 * Lambda API Component - Serverless HTTP API
 * Implements CDK Construct Composer pattern with enterprise features
 */

import { 
  ComponentSpec, 
  ComponentContext, 
  ComponentCapabilities,
  IComponent,
  IConstruct 
} from '@platform/contracts';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as cdk from 'aws-cdk-lib';

export interface LambdaApiConfig {
  runtime: string;
  handler: string;
  codePath: string;
  timeout?: number;
  memorySize?: number;
  environment?: Record<string, string>;
  apiName?: string;
  corsEnabled?: boolean;
}

/**
 * Lambda API component following CDK Construct Composer pattern
 */
export class LambdaApiComponent implements IComponent {
  private readonly constructs: Map<string, IConstruct> = new Map();
  private capabilities: ComponentCapabilities = {};
  private synthesized: boolean = false;

  constructor(
    public readonly spec: ComponentSpec,
    private readonly context: ComponentContext
  ) {}

  getType(): string {
    return 'lambda-api';
  }

  synth(): void {
    // Step 1: Build comprehensive Lambda function properties
    const functionProps: lambda.FunctionProps = {
      runtime: this.getLambdaRuntime(),
      handler: this.spec.config.handler || 'index.handler',
      code: this.getLambdaCode(),
      functionName: `${this.context.serviceName}-${this.spec.name}`,
      timeout: this.getTimeout(),
      memorySize: this.getMemorySize(),
      environment: this.getEnvironmentVariables(),
      vpc: this.context.vpc,
      vpcSubnets: this.getVpcSubnets(),
      securityGroups: this.getSecurityGroups(),
      role: this.getExecutionRole(),
      reservedConcurrentExecutions: this.getReservedConcurrency(),
      deadLetterQueueEnabled: this.isDeadLetterQueueEnabled(),
      tracing: this.getTracingConfig(),
      logRetention: this.getLogRetention()
    };

    // Step 2: Create the Lambda function construct
    const lambdaFunction = new lambda.Function(
      this.context.scope,
      `${this.spec.name}-function`,
      functionProps
    );

    // Step 3: Create API Gateway if HTTP API is needed
    const api = this.createApiGateway(lambdaFunction);

    // Step 4: Store construct handles for binder access
    this.constructs.set('main', lambdaFunction);
    this.constructs.set('lambda.Function', lambdaFunction);
    if (api) {
      this.constructs.set('apigateway.RestApi', api);
      this.constructs.set('api', api);
    }

    // Step 5: Set capabilities with tokenized outputs
    this.setCapabilities({
      'compute:lambda': {
        functionName: lambdaFunction.functionName,
        functionArn: lambdaFunction.functionArn,
        role: lambdaFunction.role?.roleArn,
        ...(api && {
          apiUrl: api.url,
          apiId: api.restApiId
        })
      }
    });
  }

  getCapabilities(): ComponentCapabilities {
    this.ensureSynthesized();
    return this.capabilities;
  }

  getConstruct(handle: string): IConstruct | undefined {
    return this.constructs.get(handle);
  }

  getAllConstructs(): Map<string, IConstruct> {
    return new Map(this.constructs);
  }

  hasConstruct(handle: string): boolean {
    return this.constructs.has(handle);
  }

  getName(): string {
    return this.spec.name;
  }

  private setCapabilities(capabilities: ComponentCapabilities): void {
    this.capabilities = capabilities;
    this.synthesized = true;
  }

  private ensureSynthesized(): void {
    if (!this.synthesized) {
      throw new Error(`Component '${this.spec.name}' must be synthesized before accessing capabilities. Call synth() first.`);
    }
  }

  // Helper Methods for CDK Construct Composition

  private getLambdaRuntime(): lambda.Runtime {
    const runtimeStr = this.spec.config.runtime || 'nodejs18.x';
    
    // Map runtime strings to CDK Runtime objects
    switch (runtimeStr) {
      case 'nodejs18.x':
        return lambda.Runtime.NODEJS_18_X;
      case 'nodejs20.x':
        return lambda.Runtime.NODEJS_20_X;
      case 'python3.11':
        return lambda.Runtime.PYTHON_3_11;
      case 'python3.10':
        return lambda.Runtime.PYTHON_3_10;
      default:
        return lambda.Runtime.NODEJS_18_X;
    }
  }

  private getLambdaCode(): lambda.Code {
    const codePath = this.spec.config.codePath || './src';
    return lambda.Code.fromAsset(codePath);
  }

  private getTimeout(): cdk.Duration {
    const timeoutSeconds = this.spec.config.timeout || 30;
    
    // FedRAMP may require shorter timeouts for security
    if (this.context.complianceFramework.startsWith('fedramp')) {
      return cdk.Duration.seconds(Math.min(timeoutSeconds, 60));
    }
    
    return cdk.Duration.seconds(timeoutSeconds);
  }

  private getMemorySize(): number {
    return this.spec.config.memorySize || 512;
  }

  private getEnvironmentVariables(): Record<string, string> {
    return {
      NODE_ENV: this.context.environment,
      SERVICE_NAME: this.context.serviceName,
      COMPONENT_NAME: this.spec.name,
      COMPLIANCE_FRAMEWORK: this.context.complianceFramework,
      ...this.spec.config.environment
    };
  }

  private getVpcSubnets(): lambda.SubnetSelection | undefined {
    if (!this.context.vpc) return undefined;
    
    // Use private subnets for better security
    return { subnetType: lambda.SubnetType.PRIVATE_WITH_EGRESS };
  }

  private getSecurityGroups(): lambda.ISecurityGroup[] | undefined {
    if (!this.context.vpc) return undefined;

    const sg = new lambda.SecurityGroup(this.context.scope, `${this.spec.name}-sg`, {
      vpc: this.context.vpc,
      description: `Security group for ${this.spec.name} Lambda function`,
      allowAllOutbound: true
    });

    return [sg];
  }

  private getExecutionRole(): iam.IRole | undefined {
    // Let CDK create default role, but with enhanced permissions for FedRAMP
    if (this.context.complianceFramework.startsWith('fedramp')) {
      const role = new iam.Role(this.context.scope, `${this.spec.name}-role`, {
        assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
        managedPolicies: [
          iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaVPCAccessExecutionRole'),
          iam.ManagedPolicy.fromAwsManagedPolicyName('AWSXRayDaemonWriteAccess')
        ]
      });
      
      return role;
    }
    
    return undefined; // Use CDK default
  }

  private getReservedConcurrency(): number | undefined {
    if (this.context.complianceFramework.startsWith('fedramp')) {
      // Limit concurrency for FedRAMP compliance
      return this.spec.config.maxConcurrency || 50;
    }
    
    return this.spec.config.maxConcurrency;
  }

  private isDeadLetterQueueEnabled(): boolean {
    return this.context.complianceFramework.startsWith('fedramp') || 
           this.spec.config.deadLetterQueue === true;
  }

  private getTracingConfig(): lambda.Tracing {
    if (this.context.complianceFramework.startsWith('fedramp')) {
      return lambda.Tracing.ACTIVE; // Required for FedRAMP compliance
    }
    
    return this.spec.config.tracing === true 
      ? lambda.Tracing.ACTIVE 
      : lambda.Tracing.DISABLED;
  }

  private getLogRetention(): lambda.RetentionDays {
    if (this.context.complianceFramework.startsWith('fedramp')) {
      return lambda.RetentionDays.ONE_YEAR; // FedRAMP retention requirement
    }
    
    return lambda.RetentionDays.ONE_MONTH;
  }

  private createApiGateway(lambdaFunction: lambda.Function): apigateway.RestApi | undefined {
    if (!this.spec.config.createApi) return undefined;

    const api = new apigateway.RestApi(this.context.scope, `${this.spec.name}-api`, {
      restApiName: this.spec.config.apiName || `${this.context.serviceName}-${this.spec.name}-api`,
      description: `API for ${this.spec.name} Lambda function`,
      endpointConfiguration: {
        types: [apigateway.EndpointType.REGIONAL]
      },
      defaultCorsPreflightOptions: this.spec.config.corsEnabled ? {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'X-Amz-Date', 'Authorization', 'X-Api-Key']
      } : undefined
    });

    // Create Lambda integration
    const integration = new apigateway.LambdaIntegration(lambdaFunction);
    
    // Add proxy resource
    api.root.addProxy({
      defaultIntegration: integration,
      anyMethod: true
    });

    return api;
  }
}