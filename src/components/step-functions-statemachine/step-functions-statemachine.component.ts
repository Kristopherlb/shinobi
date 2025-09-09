/**
 * Step Functions State Machine Component
 * 
 * AWS Step Functions State Machine for serverless workflow orchestration.
 * Implements Platform Component API Contract v1.1 with BaseComponent pattern.
 */

import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { BaseComponent } from '../../platform/contracts/component';
import { ComponentSpec, ComponentContext, ComponentCapabilities } from '../../platform/contracts/component-interfaces';
import { StepFunctionsStateMachineConfigBuilder, StepFunctionsStateMachineConfig } from './step-functions-statemachine.builder';

// Configuration interface is now defined in the builder file

// Schema and ConfigBuilder are now defined in the builder file

/**
 * Step Functions State Machine Component implementing Component API Contract v1.1
 * 
 * Extends BaseComponent and follows the 6-step synthesis pattern.
 */
export class StepFunctionsStateMachineComponent extends BaseComponent {
  private stateMachine?: sfn.StateMachine;
  private config?: StepFunctionsStateMachineConfig;
  private logger = this.getLogger();

  constructor(scope: Construct, id: string, context: ComponentContext, spec: ComponentSpec) {
    super(scope, id, context, spec);
  }

  public synth(): void {
    this.logger.info('Starting Step Functions State Machine component synthesis', {
      componentName: this.spec.name,
      componentType: this.getType()
    });

    try {
      // Step 1: Build configuration using ConfigBuilder
      const configBuilder = new StepFunctionsStateMachineConfigBuilder({ 
        context: this.context, 
        spec: this.spec 
      });
      this.config = configBuilder.buildSync();

      // Step 2: Create helper resources (if needed)
      // KMS key creation handled by BaseComponent if needed

      // Step 3: Instantiate AWS CDK L2 constructs
      this.createStateMachine();

      // Step 4: Apply standard tags
      this.applyStandardTags(this.stateMachine!, {
        'state-machine-type': this.config.stateMachineType || 'STANDARD',
        'workflow-orchestration': 'step-functions'
      });

      // Step 5: Register constructs for patches.ts access
      this.registerConstruct('main', this.stateMachine!);
      this.registerConstruct('stateMachine', this.stateMachine!);

      // Step 6: Register capabilities for component binding
      this.registerCapability('workflow:step-functions', {
        stateMachineArn: this.stateMachine!.stateMachineArn,
        stateMachineName: this.stateMachine!.stateMachineName
      });

      this.logger.info('Step Functions State Machine component synthesis completed successfully', {
        stateMachineArn: this.stateMachine!.stateMachineArn,
        stateMachineName: this.stateMachine!.stateMachineName
      });

    } catch (error) {
      this.logger.error('Step Functions State Machine component synthesis failed', error as Error, {
        componentName: this.spec.name,
        componentType: this.getType()
      });
      throw error;
    }
  }

  public getCapabilities(): ComponentCapabilities {
    if (!this.stateMachine) {
      throw new Error('Component must be synthesized before accessing capabilities');
    }
    return this.capabilities;
  }

  public getType(): string {
    return 'step-functions-statemachine';
  }

  private createStateMachine(): void {
    if (!this.config) {
      throw new Error('Configuration must be built before creating state machine');
    }

    // Build state machine definition
    const definition = this.buildDefinition();
    
    // Create state machine
    this.stateMachine = new sfn.StateMachine(this, 'StateMachine', {
      stateMachineName: this.buildStateMachineName(),
      stateMachineType: this.mapStateMachineType(this.config.stateMachineType || 'STANDARD'),
      definitionBody: definition,
      timeout: this.config.timeout?.seconds ? 
        cdk.Duration.seconds(this.config.timeout.seconds) : undefined,
      role: this.createExecutionRoleIfNeeded()
    });

    this.logger.info('Step Functions State Machine created', {
      stateMachineArn: this.stateMachine.stateMachineArn,
      stateMachineName: this.stateMachine.stateMachineName,
      stateMachineType: this.config.stateMachineType
    });
  }

  private buildDefinition(): sfn.DefinitionBody {
    if (!this.config?.definition) {
      // Default simple definition
      return sfn.DefinitionBody.fromChainable(
        new sfn.Pass(this, 'DefaultPass', {
          result: sfn.Result.fromObject({ message: 'Hello from Step Functions' })
        })
      );
    }

    if (this.config.definition.definitionString) {
      return sfn.DefinitionBody.fromString(this.config.definition.definitionString);
    }
    
    if (this.config.definition.definition) {
      return sfn.DefinitionBody.fromChainable(
        new sfn.Pass(this, 'DefinitionPass', {
          result: sfn.Result.fromObject(this.config.definition.definition)
        })
      );
    }

    throw new Error('State machine definition must be provided either as definitionString or definition object');
  }

  private mapStateMachineType(type: string): sfn.StateMachineType {
    switch (type.toUpperCase()) {
      case 'EXPRESS':
        return sfn.StateMachineType.EXPRESS;
      default:
        return sfn.StateMachineType.STANDARD;
    }
  }

  private buildStateMachineName(): string {
    if (this.config?.stateMachineName) {
      return this.config.stateMachineName;
    }
    return `${this.context.serviceName}-${this.spec.name}`;
  }

  private createExecutionRoleIfNeeded(): iam.IRole | undefined {
    if (this.config?.roleArn) {
      return iam.Role.fromRoleArn(this, 'ExistingRole', this.config.roleArn);
    }

    // Create a default execution role
    return new iam.Role(this, 'StateMachineRole', {
      assumedBy: new iam.ServicePrincipal('states.amazonaws.com'),
      description: `Execution role for ${this.buildStateMachineName()} state machine`,
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSStepFunctionsServiceRolePolicy')
      ]
    });
  }
}