/**
 * WAF Web ACL Component implementing Platform Component API Contract v1.1
 * 
 * AWS WAF Web Application Firewall with comprehensive security rules and compliance hardening.
 * Provides protection against common web exploits, OWASP Top 10, and compliance-specific threats.
 */

import { Construct, IConstruct } from 'constructs';
import { BaseComponent } from '../../../src/platform/contracts/component';
import {
  ComponentSpec,
  ComponentContext,
  ComponentCapabilities
} from '../../../src/platform/contracts/component-interfaces';
import { 
  WafWebAclConfig, 
  WafWebAclConfigBuilder 
} from './waf-web-acl.builder';

// AWS CDK imports
import * as wafv2 from 'aws-cdk-lib/aws-wafv2';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as cdk from 'aws-cdk-lib';

/**
 * WAF Web ACL Component
 * 
 * Extends BaseComponent and implements the Platform Component API Contract.
 */
export class WafWebAclComponent extends BaseComponent {
  
  /** Final resolved configuration */
  private config!: WafWebAclConfig;
  
  /** Main WAF Web ACL construct */
  private webAcl!: wafv2.CfnWebACL;
  
  /** CloudWatch Log Group for WAF logs */
  private logGroup?: logs.LogGroup;
  
  /** WAF logging configuration */
  private loggingConfiguration?: wafv2.CfnLoggingConfiguration;
  
  /**
   * Constructor
   */
  constructor(scope: Construct, spec: ComponentSpec, context: ComponentContext) {
    super(scope, spec.name, context, spec);
  }
  
  /**
   * Component type identifier
   */
  public getType(): string {
    return 'waf-web-acl';
  }
  
  /**
   * Main synthesis method following Platform Component API Contract
   */
  public synth(): void {
    // Step 1: Build configuration using ConfigBuilder
    const configBuilder = new WafWebAclConfigBuilder(this.context, this.spec);
    this.config = configBuilder.buildSync();
    
    // Step 2: Get logger from BaseComponent
    const logger = this.getLogger();
    logger.info('Starting WAF Web ACL synthesis', {
      context: {
        componentName: this.spec.name,
        componentType: this.getType(),
        scope: this.config.scope,
        defaultAction: this.config.defaultAction
      }
    });
    
    // Step 3: Create AWS resources
    this.createLogGroup();
    this.createWebAcl();
    this.createLoggingConfiguration();
    this.createMonitoringAlarms();
    
    // Step 4: Apply standard tags
    this.applyResourceTags();
    
    // Step 5: Register constructs
    this.registerConstructs();
    
    // Step 6: Register capabilities
    this.registerCapabilities();
    
    logger.info('WAF Web ACL synthesis completed', {
      context: {
        componentName: this.spec.name,
        webAclId: this.webAcl.attrId
      }
    });
  }
  
  /**
   * Creates CloudWatch log group if logging is enabled
   */
  private createLogGroup(): void {
    if (!this.config.logging?.enabled) return;
    
    this.logGroup = new logs.LogGroup(this, 'WafLogGroup', {
      logGroupName: `/aws/wafv2/${this.spec.name}`,
      retention: this.getLogRetentionDays(),
      removalPolicy: this.getRemovalPolicy()
    });
  }
  
  /**
   * Creates the main WAF Web ACL with rules
   */
  private createWebAcl(): void {
    const rules: wafv2.CfnWebACL.RuleProperty[] = [];
    
    // Add managed rule groups
    if (this.config.managedRuleGroups) {
      this.config.managedRuleGroups.forEach(group => {
        rules.push({
          name: group.name,
          priority: group.priority,
          overrideAction: {
            [group.overrideAction || 'none']: {}
          },
          statement: {
            managedRuleGroupStatement: {
              vendorName: group.vendorName,
              name: group.name,
              excludedRules: group.excludedRules?.map(ruleName => ({ name: ruleName }))
            }
          },
          visibilityConfig: {
            sampledRequestsEnabled: this.config.monitoring?.alarms?.sampledRequestsEnabled ?? true,
            cloudWatchMetricsEnabled: this.config.monitoring?.enabled ?? true,
            metricName: `${group.name}Metric`
          }
        });
      });
    }
    
    // Add custom rules
    if (this.config.customRules) {
      this.config.customRules.forEach(rule => {
        rules.push({
          name: rule.name,
          priority: rule.priority,
          action: {
            [rule.action]: {}
          },
          statement: this.buildCustomRuleStatement(rule.statement),
          visibilityConfig: {
            sampledRequestsEnabled: this.config.monitoring?.alarms?.sampledRequestsEnabled ?? true,
            cloudWatchMetricsEnabled: this.config.monitoring?.enabled ?? true,
            metricName: `${rule.name}Metric`
          }
        });
      });
    }
    
    // Create the Web ACL
    this.webAcl = new wafv2.CfnWebACL(this, 'WebAcl', {
      name: this.config.name || this.spec.name,
      description: this.config.description || `WAF Web ACL for ${this.spec.name}`,
      scope: this.config.scope || 'REGIONAL',
      defaultAction: {
        [this.config.defaultAction || 'allow']: {}
      },
      rules: rules,
      visibilityConfig: {
        sampledRequestsEnabled: this.config.monitoring?.alarms?.sampledRequestsEnabled ?? true,
        cloudWatchMetricsEnabled: this.config.monitoring?.enabled ?? true,
        metricName: `${this.spec.name}WebAcl`
      }
    });
  }
  
  /**
   * Creates WAF logging configuration
   */
  private createLoggingConfiguration(): void {
    if (!this.config.logging?.enabled || !this.webAcl || !this.logGroup) return;
    
    this.loggingConfiguration = new wafv2.CfnLoggingConfiguration(this, 'LoggingConfig', {
      resourceArn: this.webAcl.attrArn,
      logDestinationConfigs: [this.logGroup.logGroupArn],
      redactedFields: this.config.logging.redactedFields?.map(field => ({
        [field.type.replace('-', '')]: field.name ? { name: field.name } : {}
      }))
    });
  }
  
  /**
   * Creates CloudWatch monitoring alarms
   */
  private createMonitoringAlarms(): void {
    if (!this.config.monitoring?.enabled || !this.webAcl) return;
    
    const alarmConfig = this.config.monitoring.alarms;
    if (!alarmConfig) return;
    
    // Blocked requests alarm
    if (alarmConfig.blockedRequestsThreshold) {
      new cloudwatch.Alarm(this, 'BlockedRequestsAlarm', {
        metric: new cloudwatch.Metric({
          namespace: 'AWS/WAFV2',
          metricName: 'BlockedRequests',
          dimensionsMap: {
            WebACL: this.webAcl.name || this.spec.name,
            Region: this.context.region || 'us-east-1'
          }
        }),
        threshold: alarmConfig.blockedRequestsThreshold,
        evaluationPeriods: 2,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
        alarmDescription: `High number of blocked requests in WAF ${this.spec.name}`
      });
    }
  }

  /**
   * Applies standard tags to all resources
   */
  private applyResourceTags(): void {
    const additionalTags = {
      'component-type': this.getType(),
      'waf-scope': this.config.scope || 'REGIONAL',
      'default-action': this.config.defaultAction || 'allow'
    };
    
    this.applyStandardTags(this.webAcl, additionalTags);
    
    if (this.logGroup) {
      this.applyStandardTags(this.logGroup, { 'log-type': 'waf-logs' });
    }
  }

  /**
   * Registers construct handles for patches.ts access
   */
  private registerConstructs(): void {
    this.registerConstruct('main', this.webAcl);
    this.registerConstruct('webAcl', this.webAcl);
    
    if (this.logGroup) {
      this.registerConstruct('logGroup', this.logGroup);
    }
    
    if (this.loggingConfiguration) {
      this.registerConstruct('loggingConfiguration', this.loggingConfiguration);
    }
  }

  /**
   * Registers capabilities for component binding
   */
  private registerCapabilities(): void {
    const capabilities: ComponentCapabilities = {};
    
    // Main WAF capability
    capabilities['security:waf-web-acl'] = {
      webAclId: this.webAcl.attrId,
      webAclArn: this.webAcl.attrArn,
      webAclName: this.webAcl.name,
      scope: this.config.scope
    };
    
    // Monitoring capability
    capabilities['monitoring:waf-web-acl'] = {
      metricsNamespace: 'AWS/WAFV2',
      webAclName: this.webAcl.name
    };
    
    // WAF-specific capability
    capabilities['waf:web-acl'] = {
      id: this.webAcl.attrId,
      arn: this.webAcl.attrArn,
      name: this.webAcl.name,
      scope: this.config.scope,
      defaultAction: this.config.defaultAction
    };
    
    // Protection capability
    capabilities['protection:web-application'] = {
      type: 'waf-web-acl',
      scope: this.config.scope,
      rulesCount: (this.config.managedRuleGroups?.length || 0) + (this.config.customRules?.length || 0),
      loggingEnabled: this.config.logging?.enabled || false
    };
    
    // Register all capabilities
    Object.entries(capabilities).forEach(([key, data]) => {
      this.registerCapability(key, data);
    });
  }

  /**
   * Returns the machine-readable capabilities of the component
   */
  public getCapabilities(): ComponentCapabilities {
    return this.capabilities || {};
  }
  
  // Helper methods
  
  /**
   * Builds a custom rule statement based on configuration
   */
  private buildCustomRuleStatement(statement: any): wafv2.CfnWebACL.StatementProperty {
    switch (statement.type) {
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
      case 'ip-set':
        // For IP sets, we'd need to create an IP set resource first
        // This is a simplified implementation
        return {
          ipSetReferenceStatement: {
            arn: 'arn:aws:wafv2:region:account:regional/ipset/name/id' // Would be actual IP set ARN
          }
        };
      default:
        throw new Error(`Unsupported custom rule statement type: ${statement.type}`);
    }
  }
  
  /**
   * Gets log retention days based on compliance framework
   */
  private getLogRetentionDays(): number {
    switch (this.context.complianceFramework) {
      case 'fedramp-high':
        return 2555; // 7 years
      case 'fedramp-moderate':
        return 1095; // 3 years
      default:
        return 365; // 1 year
    }
  }

  /**
   * Gets removal policy based on compliance framework
   */
  private getRemovalPolicy(): cdk.RemovalPolicy {
    return ['fedramp-moderate', 'fedramp-high'].includes(this.context.complianceFramework) 
      ? cdk.RemovalPolicy.RETAIN 
      : cdk.RemovalPolicy.DESTROY;
  }
}