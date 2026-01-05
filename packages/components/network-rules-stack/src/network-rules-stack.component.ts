/**
 * Network Rules Stack Component
 * 
 * Reads cross-stack security group rule specifications from SSM Parameter Store
 * at deployment time and applies them to target security groups.
 * Implements the Platform Component API Contract.
 */

import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import {
  AwsCustomResource,
  AwsCustomResourcePolicy,
  PhysicalResourceId
} from 'aws-cdk-lib/custom-resources';
import { Construct } from 'constructs';
import {
  BaseComponent,
  ComponentSpec,
  ComponentContext,
  ComponentCapabilities
} from '@shinobi/core';
import { NetworkRulesStackConfig, NetworkRulesStackConfigBuilder } from './network-rules-stack.builder.js';

/**
 * Network Rules Stack Component
 * 
 * This component queries SSM Parameter Store for cross-stack security group rules
 * and applies them to target security groups. It handles pagination, error handling,
 * and rule lifecycle automatically.
 */
export class NetworkRulesStackComponent extends BaseComponent {
  private readonly config: NetworkRulesStackConfig;
  private ssmQueryLambda?: lambda.Function;
  private ssmQueryResource?: AwsCustomResource;
  private ruleApplicationLambda?: lambda.Function;
  private ruleApplicationResource?: cdk.CustomResource;

  constructor(scope: Construct, id: string, context: ComponentContext, spec: ComponentSpec) {
    super(scope, id, context, spec);

    // Build configuration using the 5-layer precedence chain
    const configBuilder = new NetworkRulesStackConfigBuilder({ context, spec });
    this.config = configBuilder.buildSync();
  }

  /**
   * Synthesis phase - Query SSM and apply security group rules
   */
  public synth(): void {
    if (this.ssmQueryResource) {
      this.logComponentEvent('synthesis_skipped', 'Network Rules Stack already synthesized');
      return;
    }

    this.logComponentEvent('synthesis_start', 'Starting Network Rules Stack synthesis', {
      ssmPathPrefix: this.config.ssmPathPrefix
    });

    const startTime = Date.now();

    try {
      // Create Lambda function for SSM query with pagination support
      this.createSsmQueryLambda();

      // Create Custom Resource to query SSM at deployment time
      this.createSsmQueryResource();

      // Create Lambda function to apply rules from SSM
      this.createRuleApplicationLambda();

      // Apply standard tags
      this.applyComponentTags();

      const duration = Date.now() - startTime;
      this.logComponentEvent('synthesis_complete', 'Network Rules Stack synthesis completed successfully', {
        ssmPathPrefix: this.config.ssmPathPrefix
      });

    } catch (error) {
      this.logError(error as Error, 'component synthesis', {
        componentType: 'network-rules-stack',
        stage: 'synthesis'
      });
      throw error;
    }
  }

  /**
   * Get the capabilities this component provides
   * This component is infrastructure-only and doesn't expose capabilities
   */
  public getCapabilities(): ComponentCapabilities {
    // Return empty capabilities - this is infrastructure-only
    return {};
  }

  /**
   * Get the component type identifier
   */
  public getType(): string {
    return 'network-rules-stack';
  }

  /**
   * Create Lambda function for querying SSM with pagination support
   */
  private createSsmQueryLambda(): void {
    this.ssmQueryLambda = new lambda.Function(this, 'QueryNetworkRulesLambda', {
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
import boto3
import json

def handler(event, context):
    ssm = boto3.client('ssm')
    path = event.get('Path', '/shinobi/network-rules')
    all_params = []
    next_token = None
    
    try:
        while True:
            if next_token:
                response = ssm.get_parameters_by_path(
                    Path=path,
                    Recursive=True,
                    NextToken=next_token
                )
            else:
                response = ssm.get_parameters_by_path(
                    Path=path,
                    Recursive=True
                )
            
            all_params.extend(response.get('Parameters', []))
            next_token = response.get('NextToken')
            
            if not next_token:
                break
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'Parameters': all_params,
                'Count': len(all_params)
            })
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({
                'error': str(e),
                'Parameters': [],
                'Count': 0
            })
        }
      `),
      timeout: cdk.Duration.seconds(60),
      description: 'Queries SSM Parameter Store for cross-stack security group rules with pagination support',
      memorySize: 256
    });

    // Grant SSM read permissions
    this.ssmQueryLambda.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'ssm:GetParameter',
          'ssm:GetParameters',
          'ssm:GetParametersByPath',
          'ssm:DescribeParameters'
        ],
        resources: [
          `arn:aws:ssm:*:*:parameter${this.config.ssmPathPrefix}*`
        ]
      })
    );

    this.applyStandardTags(this.ssmQueryLambda, {
      'resource-type': 'lambda-function',
      'purpose': 'ssm-query-pagination'
    });

    this.registerConstruct('ssmQueryLambda', this.ssmQueryLambda);
  }

  /**
   * Create Custom Resource to query SSM at deployment time
   */
  private createSsmQueryResource(): void {
    if (!this.ssmQueryLambda) {
      throw new Error('SSM Query Lambda must be created before Custom Resource');
    }

    this.ssmQueryResource = new AwsCustomResource(this, 'QueryNetworkRules', {
      onCreate: {
        service: 'Lambda',
        action: 'invoke',
        parameters: {
          FunctionName: this.ssmQueryLambda.functionName,
          Payload: JSON.stringify({ Path: this.config.ssmPathPrefix })
        },
        physicalResourceId: PhysicalResourceId.of('network-rules-query')
      },
      onUpdate: {
        // Re-query on update to pick up new rules
        service: 'Lambda',
        action: 'invoke',
        parameters: {
          FunctionName: this.ssmQueryLambda.functionName,
          Payload: JSON.stringify({ Path: this.config.ssmPathPrefix })
        },
        physicalResourceId: PhysicalResourceId.of('network-rules-query')
      },
      policy: AwsCustomResourcePolicy.fromSdkCalls({
        resources: AwsCustomResourcePolicy.ANY_RESOURCE
      }),
      timeout: cdk.Duration.minutes(5)
    });

    // Ensure Lambda is created before Custom Resource
    this.ssmQueryResource.node.addDependency(this.ssmQueryLambda);

    this.registerConstruct('ssmQueryResource', this.ssmQueryResource);
  }

  /**
   * Create Lambda function that applies security group rules from SSM data
   * 
   * Since CDK synthesis is static and we can't create constructs from runtime SSM data,
   * we use a Lambda-backed Custom Resource that queries SSM and applies rules via EC2 API.
   */
  private createRuleApplicationLambda(): void {
    if (!this.ssmQueryResource) {
      throw new Error('SSM Query Resource must be created before rule application Lambda');
    }

    this.ruleApplicationLambda = new lambda.Function(this, 'ApplyNetworkRulesLambda', {
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
import boto3
import json
import cfnresponse

def handler(event, context):
    ssm = boto3.client('ssm')
    ec2 = boto3.client('ec2')
    request_type = event.get('RequestType')
    
    if request_type == 'Delete':
        # On delete, rules are automatically removed when SSM params are deleted
        cfnresponse.send(event, context, cfnresponse.SUCCESS, {})
        return
    
    try:
        # Get SSM path from resource properties
        ssm_path = event.get('ResourceProperties', {}).get('SsmPath', '/shinobi/network-rules')
        
        # Query SSM with pagination
        all_params = []
        next_token = None
        
        while True:
            if next_token:
                response = ssm.get_parameters_by_path(
                    Path=ssm_path,
                    Recursive=True,
                    NextToken=next_token
                )
            else:
                response = ssm.get_parameters_by_path(
                    Path=ssm_path,
                    Recursive=True
                )
            
            all_params.extend(response.get('Parameters', []))
            next_token = response.get('NextToken')
            
            if not next_token:
                break
        
        # Parse rule specifications with error handling
        rule_specs = []
        invalid_params = []
        
        for param in all_params:
            try:
                spec = json.loads(param.get('Value', '{}'))
                # Validate required fields
                if not spec.get('targetSecurityGroupId') or not spec.get('rule') or not spec.get('bindingId'):
                    raise ValueError('Missing required fields')
                rule_specs.append(spec)
            except Exception as e:
                invalid_params.append(param.get('Name', 'unknown'))
        
        # Group rules by target security group
        rules_by_target = {}
        for spec in rule_specs:
            target_id = spec['targetSecurityGroupId']
            if target_id not in rules_by_target:
                rules_by_target[target_id] = []
            rules_by_target[target_id].append(spec)
        
        # Deduplicate and apply rules
        applied_rules = []
        for target_id, specs in rules_by_target.items():
            # Deduplicate rules (same peer, port, protocol, type)
            seen_rules = {}
            unique_specs = []
            for spec in specs:
                rule = spec['rule']
                peer_key = f"sg:{rule['peer']['id']}" if rule['peer']['kind'] == 'sg' else f"cidr:{rule['peer']['cidr']}"
                rule_key = f"{rule['type']}-{peer_key}-{rule['port']['protocol']}-{rule['port']['from']}-{rule['port']['to']}"
                if rule_key not in seen_rules:
                    seen_rules[rule_key] = spec
                    unique_specs.append(spec)
            
            # Apply rules via EC2 API
            for spec in unique_specs:
                rule = spec['rule']
                description = f"{rule.get('description', 'Cross-stack rule')} (from {spec.get('sourceComponent', 'unknown')})"
                
                try:
                    if rule['type'] == 'ingress':
                        if rule['peer']['kind'] == 'sg':
                            ec2.authorize_security_group_ingress(
                                GroupId=target_id,
                                IpPermissions=[{
                                    'IpProtocol': rule['port']['protocol'],
                                    'FromPort': rule['port']['from'],
                                    'ToPort': rule['port']['to'],
                                    'UserIdGroupPairs': [{
                                        'GroupId': rule['peer']['id']
                                    }]
                                }],
                                Description=description
                            )
                        else:  # cidr
                            ec2.authorize_security_group_ingress(
                                GroupId=target_id,
                                IpPermissions=[{
                                    'IpProtocol': rule['port']['protocol'],
                                    'FromPort': rule['port']['from'],
                                    'ToPort': rule['port']['to'],
                                    'IpRanges': [{
                                        'CidrIp': rule['peer']['cidr'],
                                        'Description': description
                                    }]
                                }]
                            )
                    else:  # egress
                        if rule['peer']['kind'] == 'sg':
                            ec2.authorize_security_group_egress(
                                GroupId=target_id,
                                IpPermissions=[{
                                    'IpProtocol': rule['port']['protocol'],
                                    'FromPort': rule['port']['from'],
                                    'ToPort': rule['port']['to'],
                                    'UserIdGroupPairs': [{
                                        'GroupId': rule['peer']['id']
                                    }]
                                }],
                                Description=description
                            )
                        else:  # cidr
                            ec2.authorize_security_group_egress(
                                GroupId=target_id,
                                IpPermissions=[{
                                    'IpProtocol': rule['port']['protocol'],
                                    'FromPort': rule['port']['from'],
                                    'ToPort': rule['port']['to'],
                                    'IpRanges': [{
                                        'CidrIp': rule['peer']['cidr'],
                                        'Description': description
                                    }]
                                }]
                            )
                    
                    applied_rules.append({
                        'targetSecurityGroupId': target_id,
                        'ruleId': spec.get('ruleId', 'unknown'),
                        'bindingId': spec.get('bindingId', 'unknown')
                    })
                except Exception as e:
                    # Rule might already exist - that's okay (idempotent)
                    error_str = str(e)
                    if 'InvalidPermission.Duplicate' in error_str or 'already exists' in error_str.lower():
                        # Rule already exists - skip it (idempotent operation)
                        pass
                    else:
                        # Re-raise other errors
                        raise
        
        result = {
            'AppliedRules': len(applied_rules),
            'InvalidParameters': len(invalid_params),
            'TotalParameters': len(all_params)
        }
        
        if invalid_params:
            result['InvalidParameterNames'] = invalid_params
        
        cfnresponse.send(event, context, cfnresponse.SUCCESS, result)
        
    except Exception as e:
        print(f'Error applying network rules: {str(e)}')
        import traceback
        traceback.print_exc()
        cfnresponse.send(event, context, cfnresponse.FAILED, {'Error': str(e)})
      `),
      timeout: cdk.Duration.seconds(300),
      description: 'Applies security group rules from SSM Parameter Store',
      memorySize: 512
    });

    // Grant EC2 permissions to modify security groups
    this.ruleApplicationLambda.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'ec2:AuthorizeSecurityGroupIngress',
          'ec2:AuthorizeSecurityGroupEgress',
          'ec2:RevokeSecurityGroupIngress',
          'ec2:RevokeSecurityGroupEgress',
          'ec2:DescribeSecurityGroups'
        ],
        resources: ['*']
      })
    );

    // Grant SSM permissions to read parameters
    this.ruleApplicationLambda.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'ssm:GetParameter',
          'ssm:GetParameters',
          'ssm:GetParametersByPath',
          'ssm:DescribeParameters'
        ],
        resources: [
          `arn:aws:ssm:*:*:parameter${this.config.ssmPathPrefix}*`
        ]
      })
    );

    this.applyStandardTags(this.ruleApplicationLambda, {
      'resource-type': 'lambda-function',
      'purpose': 'apply-network-rules'
    });

    // Create Custom Resource that triggers rule application
    this.ruleApplicationResource = new cdk.CustomResource(this, 'ApplyNetworkRules', {
      serviceToken: this.ruleApplicationLambda.functionArn,
      properties: {
        SsmPath: this.config.ssmPathPrefix
      }
    });

    // Ensure SSM query completes before applying rules
    this.ruleApplicationResource.node.addDependency(this.ssmQueryResource);

    this.registerConstruct('ruleApplicationLambda', this.ruleApplicationLambda);
    this.registerConstruct('ruleApplicationResource', this.ruleApplicationResource);

    this.logComponentEvent('rule_application_setup', 'Rule application Lambda and Custom Resource created', {
      ssmPathPrefix: this.config.ssmPathPrefix
    });
  }

  /**
   * Apply component tags
   */
  private applyComponentTags(): void {
    // Apply tags to the component itself (stack-level tags are applied automatically)
    if (this.config.tags) {
      Object.entries(this.config.tags).forEach(([key, value]) => {
        cdk.Tags.of(this).add(key, value);
      });
    }
  }
}
