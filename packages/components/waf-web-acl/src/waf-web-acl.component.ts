/**
 * WAF Web ACL Component implementing Component API Contract v1.0
 * 
 * A Web Application Firewall to protect web applications from common exploits.
 * Implements three-tiered compliance model (Commercial/FedRAMP Moderate/FedRAMP High).
 */

import * as wafv2 from 'aws-cdk-lib/aws-wafv2';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as firehose from 'aws-cdk-lib/aws-kinesisfirehose';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {
  Component,
  ComponentSpec,
  ComponentContext,
  ComponentCapabilities
} from '../../../platform/contracts/src';

/**
 * Configuration interface for WAF Web ACL component
 */
export interface WafWebAclConfig {
  /** Web ACL name (optional, defaults to component name) */
  name?: string;
  
  /** Web ACL description */
  description?: string;
  
  /** Scope of the Web ACL */
  scope: 'REGIONAL' | 'CLOUDFRONT';
  
  /** Default action for requests that don't match any rules */
  defaultAction: 'allow' | 'block';
  
  /** AWS Managed Rule Groups */
  managedRuleGroups?: Array<{
    name: string;
    vendorName: string;
    priority: number;
    overrideAction?: 'none' | 'count';
    excludedRules?: string[];
  }>;
  
  /** Custom rules */
  customRules?: Array<{
    name: string;
    priority: number;
    action: 'allow' | 'block' | 'count';
    statement: {
      type: 'ip-set' | 'geo-match' | 'rate-based' | 'size-constraint' | 'sqli-match' | 'xss-match';
      ipSet?: string[];
      countries?: string[];
      rateLimit?: number;
      fieldToMatch?: {
        type: 'uri-path' | 'query-string' | 'header' | 'body';
        name?: string;
      };
      textTransformations?: Array<{
        priority: number;
        type: string;
      }>;
    };
  }>;
  
  /** Logging configuration */
  logging?: {
    enabled?: boolean;
    destinationArn?: string;
    logDestinationType?: 'kinesis-firehose' | 's3' | 'cloudwatch';
    redactedFields?: Array<{
      type: 'uri-path' | 'query-string' | 'header' | 'method';
      name?: string;
    }>;
  };
  
  /** Monitoring configuration */
  monitoring?: {
    enabled?: boolean;
    alarms?: {
      blockedRequestsThreshold?: number;
      allowedRequestsThreshold?: number;
      sampledRequestsEnabled?: boolean;
    };
  };
  
  /** Tags for the Web ACL */
  tags?: Record<string, string>;
}

/**
 * JSON Schema for WAF Web ACL configuration
 */
export const WAF_WEB_ACL_CONFIG_SCHEMA = {
  type: 'object',
  properties: {
    name: {
      type: 'string',
      pattern: '^[a-zA-Z0-9._-]+$',
      maxLength: 128
    },
    description: { type: 'string' },
    scope: {
      type: 'string',
      enum: ['REGIONAL', 'CLOUDFRONT']
    },
    defaultAction: {
      type: 'string',
      enum: ['allow', 'block']
    },
    managedRuleGroups: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          vendorName: { type: 'string' },
          priority: { type: 'number', minimum: 0 },
          overrideAction: {
            type: 'string',
            enum: ['none', 'count']
          },
          excludedRules: {
            type: 'array',
            items: { type: 'string' }
          }
        },
        required: ['name', 'vendorName', 'priority']
      }
    },
    customRules: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          priority: { type: 'number', minimum: 0 },
          action: {
            type: 'string',
            enum: ['allow', 'block', 'count']
          },
          statement: {
            type: 'object',
            properties: {
              type: {
                type: 'string',
                enum: ['ip-set', 'geo-match', 'rate-based', 'size-constraint', 'sqli-match', 'xss-match']
              },
              ipSet: {
                type: 'array',
                items: { type: 'string' }
              },
              countries: {
                type: 'array',
                items: { type: 'string' }
              },
              rateLimit: { type: 'number', minimum: 100 },
              fieldToMatch: {
                type: 'object',
                properties: {
                  type: {
                    type: 'string',
                    enum: ['uri-path', 'query-string', 'header', 'body']
                  },
                  name: { type: 'string' }
                },
                required: ['type']
              },
              textTransformations: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    priority: { type: 'number', minimum: 0 },
                    type: { type: 'string' }
                  },
                  required: ['priority', 'type']
                }
              }
            },
            required: ['type']
          }
        },
        required: ['name', 'priority', 'action', 'statement']
      }
    },
    logging: {
      type: 'object',
      properties: {
        enabled: { type: 'boolean' },
        destinationArn: { type: 'string' },
        logDestinationType: {
          type: 'string',
          enum: ['kinesis-firehose', 's3', 'cloudwatch']
        },
        redactedFields: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: {
                type: 'string',
                enum: ['uri-path', 'query-string', 'header', 'method']
              },
              name: { type: 'string' }
            },
            required: ['type']
          }
        }
      }
    },
    monitoring: {
      type: 'object',
      properties: {
        enabled: { type: 'boolean' },
        alarms: {
          type: 'object',
          properties: {
            blockedRequestsThreshold: { type: 'number', minimum: 0 },
            allowedRequestsThreshold: { type: 'number', minimum: 0 },
            sampledRequestsEnabled: { type: 'boolean' }
          }
        }
      }
    },
    tags: {
      type: 'object',
      additionalProperties: { type: 'string' }
    }
  },
  required: ['scope', 'defaultAction'],
  additionalProperties: false
};

/**
 * ConfigBuilder for WAF Web ACL component
 */
export class WafWebAclConfigBuilder {
  constructor(private context: ComponentContext, private spec: ComponentSpec) {}

  /**
   * Asynchronous build method - delegates to synchronous implementation
   */
  public async build(): Promise<WafWebAclConfig> {
    return this.buildSync();
  }

  /**
   * Synchronous version of build for use in synth() method
   */
  public buildSync(): WafWebAclConfig {
    // Start with platform defaults
    const platformDefaults = this.getPlatformDefaults();
    
    // Apply compliance framework defaults
    const complianceDefaults = this.getComplianceFrameworkDefaults();
    
    // Merge user configuration from spec
    const userConfig = this.spec.config || {};
    
    // Merge configurations (user config takes precedence)
    const mergedConfig = this.mergeConfigs(
      this.mergeConfigs(platformDefaults, complianceDefaults),
      userConfig
    );
    
    return mergedConfig as WafWebAclConfig;
  }

  /**
   * Simple merge utility for combining configuration objects
   */
  private mergeConfigs(base: Record<string, any>, override: Record<string, any>): Record<string, any> {
    const result = { ...base };
    
    for (const [key, value] of Object.entries(override)) {
      if (value !== undefined && value !== null) {
        if (typeof value === 'object' && !Array.isArray(value) && typeof result[key] === 'object' && !Array.isArray(result[key])) {
          result[key] = this.mergeConfigs(result[key] || {}, value);
        } else {
          result[key] = value;
        }
      }
    }
    
    return result;
  }

  /**
   * Get platform-wide defaults with intelligent configuration
   */
  private getPlatformDefaults(): Partial<WafWebAclConfig> {
    return {
      description: `WAF Web ACL for ${this.spec.name}`,
      defaultAction: 'allow',
      managedRuleGroups: this.getDefaultManagedRuleGroups(),
      logging: {
        enabled: this.shouldEnableLogging(),
        logDestinationType: 'kinesis-firehose'
      },
      monitoring: {
        enabled: true,
        alarms: {
          blockedRequestsThreshold: this.getDefaultBlockedRequestsThreshold(),
          allowedRequestsThreshold: 1000,
          sampledRequestsEnabled: true
        }
      }
    };
  }

  /**
   * Get compliance framework-specific defaults
   */
  private getComplianceFrameworkDefaults(): Partial<WafWebAclConfig> {
    switch (this.context.complianceFramework) {
      case 'fedramp-high':
        return {
          managedRuleGroups: [
            ...this.getDefaultManagedRuleGroups(),
            ...this.getFedRAMPManagedRuleGroups()
          ],
          customRules: this.getFedRAMPCustomRules(),
          logging: {
            enabled: true, // Mandatory logging
            logDestinationType: 'kinesis-firehose',
            redactedFields: [] // No redaction for high compliance
          },
          monitoring: {
            enabled: true,
            alarms: {
              blockedRequestsThreshold: 10, // More sensitive monitoring
              allowedRequestsThreshold: 500,
              sampledRequestsEnabled: true
            }
          }
        };
        
      case 'fedramp-moderate':
        return {
          managedRuleGroups: [
            ...this.getDefaultManagedRuleGroups(),
            ...this.getFedRAMPManagedRuleGroups()
          ],
          customRules: this.getFedRAMPCustomRules(),
          logging: {
            enabled: true, // Recommended logging
            logDestinationType: 'kinesis-firehose'
          },
          monitoring: {
            enabled: true,
            alarms: {
              blockedRequestsThreshold: 25,
              allowedRequestsThreshold: 750,
              sampledRequestsEnabled: true
            }
          }
        };
        
      default: // commercial
        return {
          logging: {
            enabled: false // Optional for commercial
          },
          monitoring: {
            enabled: false // Optional monitoring
          }
        };
    }
  }

  /**
   * Get default AWS Managed Rule Groups
   */
  private getDefaultManagedRuleGroups(): Array<any> {
    return [
      {
        name: 'AWSManagedRulesCommonRuleSet',
        vendorName: 'AWS',
        priority: 1,
        overrideAction: 'none'
      },
      {
        name: 'AWSManagedRulesKnownBadInputsRuleSet',
        vendorName: 'AWS',
        priority: 2,
        overrideAction: 'none'
      },
      {
        name: 'AWSManagedRulesSQLiRuleSet',
        vendorName: 'AWS',
        priority: 3,
        overrideAction: 'none'
      }
    ];
  }

  /**
   * Get FedRAMP-specific managed rule groups
   */
  private getFedRAMPManagedRuleGroups(): Array<any> {
    return [
      {
        name: 'AWSManagedRulesLinuxRuleSet',
        vendorName: 'AWS',
        priority: 10,
        overrideAction: 'none'
      },
      {
        name: 'AWSManagedRulesUnixRuleSet',
        vendorName: 'AWS',
        priority: 11,
        overrideAction: 'none'
      }
    ];
  }

  /**
   * Get FedRAMP-specific custom rules
   */
  private getFedRAMPCustomRules(): Array<any> {
    return [
      {
        name: 'RateLimitRule',
        priority: 100,
        action: 'block',
        statement: {
          type: 'rate-based',
          rateLimit: 2000 // 2000 requests per 5 minutes
        }
      },
      {
        name: 'GeoBlockRule',
        priority: 101,
        action: 'block',
        statement: {
          type: 'geo-match',
          countries: ['CN', 'RU', 'KP'] // Block high-risk countries for compliance
        }
      }
    ];
  }

  /**
   * Determine if logging should be enabled by default
   */
  private shouldEnableLogging(): boolean {
    return ['fedramp-moderate', 'fedramp-high'].includes(this.context.complianceFramework);
  }

  /**
   * Get default blocked requests threshold based on compliance framework
   */
  private getDefaultBlockedRequestsThreshold(): number {
    switch (this.context.complianceFramework) {
      case 'fedramp-high':
        return 10; // More sensitive
      case 'fedramp-moderate':
        return 25; // Moderate sensitivity
      default:
        return 50; // Standard threshold
    }
  }
}

/**
 * WAF Web ACL Component implementing Component API Contract v1.0
 */
export class WafWebAclComponent extends Component {
  private webAcl?: wafv2.CfnWebACL;
  private logDestination?: s3.Bucket | firehose.DeliveryStream;
  private config?: WafWebAclConfig;

  constructor(scope: Construct, id: string, context: ComponentContext, spec: ComponentSpec) {
    super(scope, id, context, spec);
  }

  /**
   * Synthesis phase - Create WAF Web ACL with security rules
   */
  public synth(): void {
    this.logComponentEvent('synthesis_start', 'Starting WAF Web ACL synthesis');
    
    try {
      // Build configuration using ConfigBuilder
      const configBuilder = new WafWebAclConfigBuilder(this.context, this.spec);
      this.config = configBuilder.buildSync();
      
      // Create log destination if logging is enabled
      this.createLogDestinationIfNeeded();
      
      // Create WAF Web ACL
      this.createWafWebAcl();
      
      // Configure logging
      this.configureLogging();
      
      // Configure observability
      this.configureWafObservability();
      
      // Apply compliance hardening
      this.applyComplianceHardening();
      
      // Register constructs
      this.registerConstruct('webAcl', this.webAcl!);
      if (this.logDestination) {
        this.registerConstruct('logDestination', this.logDestination);
      }
      
      // Register capabilities
      this.registerCapability('security:waf', this.buildWafCapability());
      
      this.logComponentEvent('synthesis_complete', 'WAF Web ACL synthesis completed successfully');
    } catch (error) {
      this.logError(error as Error, 'WAF Web ACL synthesis');
      throw error;
    }
  }

  /**
   * Get the capabilities this component provides
   */
  public getCapabilities(): ComponentCapabilities {
    this.validateSynthesized();
    return this.capabilities;
  }

  /**
   * Get the component type identifier
   */
  public getType(): string {
    return 'waf-web-acl';
  }

  /**
   * Create log destination if logging is enabled
   */
  private createLogDestinationIfNeeded(): void {
    if (!this.config!.logging?.enabled) {
      return;
    }

    switch (this.config!.logging!.logDestinationType) {
      case 's3':
        this.logDestination = new s3.Bucket(this, 'WafLogsBucket', {
          bucketName: `${this.context.serviceName}-${this.spec.name}-waf-logs`,
          encryption: s3.BucketEncryption.S3_MANAGED,
          blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
          removalPolicy: this.context.complianceFramework.startsWith('fedramp') ? 
            cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY
        });
        break;
        
      case 'kinesis-firehose':
        // Create S3 bucket for Firehose destination
        const firehoseBucket = new s3.Bucket(this, 'FirehoseDestinationBucket', {
          bucketName: `${this.context.serviceName}-${this.spec.name}-waf-firehose`,
          encryption: s3.BucketEncryption.S3_MANAGED,
          blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL
        });

        // Create Firehose delivery stream
        this.logDestination = new firehose.DeliveryStream(this, 'WafFirehoseStream', {
          deliveryStreamName: `${this.context.serviceName}-${this.spec.name}-waf-logs`,
          destinations: [new firehose.destinations.S3Bucket(firehoseBucket, {
            bufferingInterval: cdk.Duration.minutes(1),
            bufferingSize: cdk.Size.mebibytes(5)
          })]
        });
        break;
        
      default:
        // CloudWatch logs - handled during logging configuration
        break;
    }

    if (this.logDestination) {
      // Apply standard tags
      this.applyStandardTags(this.logDestination, {
        'log-type': 'waf-logs'
      });

      this.logResourceCreation('waf-log-destination', 
        this.config!.logging!.logDestinationType!, {
        destinationType: this.config!.logging!.logDestinationType
      });
    }
  }

  /**
   * Create WAF Web ACL
   */
  private createWafWebAcl(): void {
    const name = this.config!.name || `${this.context.serviceName}-${this.spec.name}`;

    const rules: wafv2.CfnWebACL.RuleProperty[] = [
      ...this.buildManagedRuleGroupRules(),
      ...this.buildCustomRules()
    ];

    this.webAcl = new wafv2.CfnWebACL(this, 'WafWebAcl', {
      name,
      description: this.config!.description,
      scope: this.config!.scope,
      defaultAction: {
        [this.config!.defaultAction]: {}
      },
      rules,
      tags: this.buildTagsArray()
    });

    this.logResourceCreation('waf-web-acl', name, {
      scope: this.config!.scope,
      defaultAction: this.config!.defaultAction,
      rulesCount: rules.length
    });
  }

  /**
   * Configure WAF logging
   */
  private configureLogging(): void {
    if (!this.config!.logging?.enabled || !this.webAcl) {
      return;
    }

    let destinationArn: string;

    if (this.config!.logging!.destinationArn) {
      destinationArn = this.config!.logging!.destinationArn;
    } else if (this.logDestination) {
      if (this.logDestination instanceof s3.Bucket) {
        destinationArn = this.logDestination.bucketArn;
      } else if (this.logDestination instanceof firehose.DeliveryStream) {
        destinationArn = this.logDestination.deliveryStreamArn;
      } else {
        throw new Error('Unsupported log destination type');
      }
    } else {
      return;
    }

    new wafv2.CfnLoggingConfiguration(this, 'WafLoggingConfig', {
      resourceArn: this.webAcl.attrArn,
      logDestinationConfigs: [destinationArn],
      redactedFields: this.buildRedactedFields()
    });

    this.logComponentEvent('logging_configured', 'WAF logging configured', {
      destinationType: this.config!.logging!.logDestinationType,
      destinationArn: destinationArn
    });
  }

  /**
   * Configure CloudWatch observability for WAF Web ACL
   */
  private configureWafObservability(): void {
    if (!this.config!.monitoring?.enabled) {
      return;
    }

    const webAclName = this.webAcl!.name!;

    // 1. Blocked Requests Alarm
    new cloudwatch.Alarm(this, 'BlockedRequestsAlarm', {
      alarmName: `${this.context.serviceName}-${this.spec.name}-blocked-requests`,
      alarmDescription: 'WAF blocked requests alarm',
      metric: new cloudwatch.Metric({
        namespace: 'AWS/WAFV2',
        metricName: 'BlockedRequests',
        dimensionsMap: {
          WebACL: webAclName,
          Region: this.context.region
        },
        statistic: 'Sum',
        period: cdk.Duration.minutes(5)
      }),
      threshold: this.config!.monitoring!.alarms?.blockedRequestsThreshold || 50,
      evaluationPeriods: 2,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING
    });

    // 2. Allowed Requests Alarm (for traffic monitoring)
    new cloudwatch.Alarm(this, 'AllowedRequestsAlarm', {
      alarmName: `${this.context.serviceName}-${this.spec.name}-allowed-requests`,
      alarmDescription: 'WAF allowed requests monitoring',
      metric: new cloudwatch.Metric({
        namespace: 'AWS/WAFV2',
        metricName: 'AllowedRequests',
        dimensionsMap: {
          WebACL: webAclName,
          Region: this.context.region
        },
        statistic: 'Sum',
        period: cdk.Duration.minutes(5)
      }),
      threshold: this.config!.monitoring!.alarms?.allowedRequestsThreshold || 1000,
      evaluationPeriods: 3,
      comparisonOperator: cloudwatch.ComparisonOperator.LESS_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.BREACHING
    });

    this.logComponentEvent('observability_configured', 'OpenTelemetry observability standard applied to WAF Web ACL', {
      alarmsCreated: 2,
      webAclName: webAclName,
      monitoringEnabled: true
    });
  }

  /**
   * Apply compliance hardening based on framework
   */
  private applyComplianceHardening(): void {
    if (!this.webAcl) return;

    switch (this.context.complianceFramework) {
      case 'fedramp-high':
      case 'fedramp-moderate':
        // For FedRAMP environments, ensure WAF has proper rule coverage and logging
        this.webAcl.addMetadata('ComplianceFramework', this.context.complianceFramework);
        
        this.logComponentEvent('compliance_hardening_applied', 'FedRAMP compliance hardening applied', {
          framework: this.context.complianceFramework,
          managedRulesCount: this.config!.managedRuleGroups?.length || 0,
          customRulesCount: this.config!.customRules?.length || 0,
          loggingEnabled: this.config!.logging?.enabled
        });
        break;
        
      default:
        // No special hardening needed for commercial
        break;
    }
  }

  /**
   * Build WAF capability descriptor
   */
  private buildWafCapability(): any {
    return {
      type: 'security:waf',
      webAclArn: this.webAcl!.attrArn,
      webAclId: this.webAcl!.attrId,
      name: this.webAcl!.name,
      scope: this.config!.scope,
      defaultAction: this.config!.defaultAction
    };
  }

  /**
   * Helper methods for building WAF properties
   */
  private buildManagedRuleGroupRules(): wafv2.CfnWebACL.RuleProperty[] {
    if (!this.config!.managedRuleGroups) {
      return [];
    }

    return this.config!.managedRuleGroups.map(ruleGroup => ({
      name: ruleGroup.name,
      priority: ruleGroup.priority,
      statement: {
        managedRuleGroupStatement: {
          name: ruleGroup.name,
          vendorName: ruleGroup.vendorName,
          excludedRules: ruleGroup.excludedRules?.map(ruleName => ({ name: ruleName }))
        }
      },
      overrideAction: {
        [ruleGroup.overrideAction || 'none']: {}
      },
      visibilityConfig: {
        sampledRequestsEnabled: true,
        cloudWatchMetricsEnabled: true,
        metricName: `${ruleGroup.name}Metric`
      }
    }));
  }

  private buildCustomRules(): wafv2.CfnWebACL.RuleProperty[] {
    if (!this.config!.customRules) {
      return [];
    }

    return this.config!.customRules.map(rule => ({
      name: rule.name,
      priority: rule.priority,
      statement: this.buildRuleStatement(rule.statement),
      action: {
        [rule.action]: {}
      },
      visibilityConfig: {
        sampledRequestsEnabled: true,
        cloudWatchMetricsEnabled: true,
        metricName: `${rule.name}Metric`
      }
    }));
  }

  private buildRuleStatement(statement: any): wafv2.CfnWebACL.StatementProperty {
    switch (statement.type) {
      case 'ip-set':
        return {
          ipSetReferenceStatement: {
            arn: `arn:aws:wafv2:${this.context.region}:${this.context.accountId}:${this.config!.scope.toLowerCase()}/ipset/${statement.name}/1234567890` // Placeholder
          }
        };
        
      case 'geo-match':
        return {
          geoMatchStatement: {
            countryCodes: statement.countries || []
          }
        };
        
      case 'rate-based':
        return {
          rateBasedStatement: {
            limit: statement.rateLimit || 2000,
            aggregateKeyType: 'IP'
          }
        };
        
      case 'sqli-match':
        return {
          sqliMatchStatement: {
            fieldToMatch: this.buildFieldToMatch(statement.fieldToMatch),
            textTransformations: statement.textTransformations || [
              {
                priority: 0,
                type: 'URL_DECODE'
              }
            ]
          }
        };
        
      case 'xss-match':
        return {
          xssMatchStatement: {
            fieldToMatch: this.buildFieldToMatch(statement.fieldToMatch),
            textTransformations: statement.textTransformations || [
              {
                priority: 0,
                type: 'HTML_ENTITY_DECODE'
              }
            ]
          }
        };
        
      default:
        throw new Error(`Unsupported rule statement type: ${statement.type}`);
    }
  }

  private buildFieldToMatch(fieldToMatch?: any): wafv2.CfnWebACL.FieldToMatchProperty {
    if (!fieldToMatch) {
      return { allQueryArguments: {} };
    }

    switch (fieldToMatch.type) {
      case 'uri-path':
        return { uriPath: {} };
      case 'query-string':
        return { queryString: {} };
      case 'header':
        return { 
          singleHeader: { 
            name: fieldToMatch.name || 'user-agent' 
          } 
        };
      case 'body':
        return { body: {} };
      default:
        return { allQueryArguments: {} };
    }
  }

  private buildRedactedFields(): wafv2.CfnLoggingConfiguration.FieldToMatchProperty[] {
    if (!this.config!.logging?.redactedFields) {
      return [];
    }

    return this.config!.logging.redactedFields.map(field => {
      switch (field.type) {
        case 'uri-path':
          return { uriPath: {} };
        case 'query-string':
          return { queryString: {} };
        case 'header':
          return { 
            singleHeader: { 
              name: field.name || 'authorization' 
            } 
          };
        case 'method':
          return { method: {} };
        default:
          return { queryString: {} };
      }
    });
  }

  private buildTagsArray(): wafv2.CfnWebACL.TagProperty[] {
    const tags = this.config!.tags || {};
    return Object.entries(tags).map(([key, value]) => ({
      key,
      value
    }));
  }
}