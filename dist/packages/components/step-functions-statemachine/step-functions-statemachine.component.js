"use strict";
/**
 * Step Functions State Machine Component
 *
 * AWS Step Functions State Machine for serverless workflow orchestration.
 * Implements Platform Component API Contract v1.1 with BaseComponent pattern.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.StepFunctionsStateMachineComponent = void 0;
const sfn = __importStar(require("aws-cdk-lib/aws-stepfunctions"));
const iam = __importStar(require("aws-cdk-lib/aws-iam"));
const cdk = __importStar(require("aws-cdk-lib"));
const component_1 = require("../../../src/platform/contracts/component");
const step_functions_statemachine_builder_1 = require("./step-functions-statemachine.builder");
// Configuration interface is now defined in the builder file
// Schema and ConfigBuilder are now defined in the builder file
/**
 * Step Functions State Machine Component implementing Component API Contract v1.1
 *
 * Extends BaseComponent and follows the 6-step synthesis pattern.
 */
class StepFunctionsStateMachineComponent extends component_1.BaseComponent {
    stateMachine;
    config;
    logger = this.getLogger();
    constructor(scope, id, context, spec) {
        super(scope, id, context, spec);
    }
    synth() {
        this.logger.info('Starting Step Functions State Machine component synthesis', {
            componentName: this.spec.name,
            componentType: this.getType()
        });
        try {
            // Step 1: Build configuration using ConfigBuilder
            const configBuilder = new step_functions_statemachine_builder_1.StepFunctionsStateMachineConfigBuilder({
                context: this.context,
                spec: this.spec
            });
            this.config = configBuilder.buildSync();
            // Step 2: Create helper resources (if needed)
            // KMS key creation handled by BaseComponent if needed
            // Step 3: Instantiate AWS CDK L2 constructs
            this.createStateMachine();
            // Step 4: Apply standard tags
            this.applyStandardTags(this.stateMachine, {
                'state-machine-type': this.config.stateMachineType || 'STANDARD',
                'workflow-orchestration': 'step-functions'
            });
            // Step 5: Register constructs for patches.ts access
            this.registerConstruct('main', this.stateMachine);
            this.registerConstruct('stateMachine', this.stateMachine);
            // Step 6: Register capabilities for component binding
            this.registerCapability('workflow:step-functions', {
                stateMachineArn: this.stateMachine.stateMachineArn,
                stateMachineName: this.stateMachine.stateMachineName
            });
            this.logger.info('Step Functions State Machine component synthesis completed successfully', {
                stateMachineArn: this.stateMachine.stateMachineArn,
                stateMachineName: this.stateMachine.stateMachineName
            });
        }
        catch (error) {
            this.logger.error('Step Functions State Machine component synthesis failed', error, {
                componentName: this.spec.name,
                componentType: this.getType()
            });
            throw error;
        }
    }
    getCapabilities() {
        if (!this.stateMachine) {
            throw new Error('Component must be synthesized before accessing capabilities');
        }
        return this.capabilities;
    }
    getType() {
        return 'step-functions-statemachine';
    }
    createStateMachine() {
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
    buildDefinition() {
        if (!this.config?.definition) {
            // Default simple definition
            return sfn.DefinitionBody.fromChainable(new sfn.Pass(this, 'DefaultPass', {
                result: sfn.Result.fromObject({ message: 'Hello from Step Functions' })
            }));
        }
        if (this.config.definition.definitionString) {
            return sfn.DefinitionBody.fromString(this.config.definition.definitionString);
        }
        if (this.config.definition.definition) {
            return sfn.DefinitionBody.fromChainable(new sfn.Pass(this, 'DefinitionPass', {
                result: sfn.Result.fromObject(this.config.definition.definition)
            }));
        }
        throw new Error('State machine definition must be provided either as definitionString or definition object');
    }
    mapStateMachineType(type) {
        switch (type.toUpperCase()) {
            case 'EXPRESS':
                return sfn.StateMachineType.EXPRESS;
            default:
                return sfn.StateMachineType.STANDARD;
        }
    }
    buildStateMachineName() {
        if (this.config?.stateMachineName) {
            return this.config.stateMachineName;
        }
        return `${this.context.serviceName}-${this.spec.name}`;
    }
    createExecutionRoleIfNeeded() {
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
exports.StepFunctionsStateMachineComponent = StepFunctionsStateMachineComponent;
