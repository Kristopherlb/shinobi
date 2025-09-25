/**
 * Tagging Service
 * 
 * Provides standardized tagging functionality for platform components and services.
 * Implements the Platform Tagging Standard v1.0.
 */

import * as cdk from 'aws-cdk-lib';
import { IConstruct } from 'constructs';

/**
 * Context information needed for building standard tags
 */
export interface TaggingContext {
  serviceName: string;
  serviceLabels?: Record<string, string>;
  componentName: string;
  componentType: string;
  environment: string;
  complianceFramework: string;
  region?: string;
  accountId?: string;
}

/**
 * Tagging service interface
 */
export interface ITaggingService {
  buildStandardTags(context: TaggingContext): Record<string, string>;
  applyStandardTags(resource: IConstruct, context: TaggingContext, additionalTags?: Record<string, string>): void;
}

/**
 * Standard tagging service implementation
 */
export class TaggingService implements ITaggingService {
  /**
   * Build standard tags based on context
   * Implements Platform Tagging Standard v1.0
   */
  public buildStandardTags(context: TaggingContext): Record<string, string> {
    const now = new Date();
    const deploymentId = `deploy-${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}-${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}${now.getSeconds().toString().padStart(2, '0')}`;
    
    return {
      // Core Service Tags
      'service-name': context.serviceName,
      'service-version': context.serviceLabels?.version || '1.0.0',
      'component-name': context.componentName,
      'component-type': context.componentType,
      
      // Environment Tags
      'environment': context.environment,
      'deployment-id': deploymentId,
      'compliance-framework': context.complianceFramework,
      
      // AWS Tags
      'cloud-provider': 'aws',
      'cloud-region': context.region || 'us-east-1',
      'cloud-account': context.accountId || 'unknown',
      
      // Platform Tags
      'platform': 'cdk-lib',
      'platform-version': '1.0.0',
      'managed-by': 'platform-engineering',
      
      // Cost Management Tags
      'cost-center': 'platform',
      'project': context.serviceName,
      'owner': 'platform-engineering',
      
      // Security Tags
      'data-classification': this.getDataClassification(context.complianceFramework),
      'encryption-required': this.getEncryptionRequired(context.complianceFramework),
      
      // Operational Tags
      'backup-required': this.getBackupRequired(context.complianceFramework),
      'monitoring-level': this.getMonitoringLevel(context.complianceFramework),
      'retention-period': this.getRetentionPeriod(context.complianceFramework)
    };
  }

  /**
   * Apply standard tags to a CDK construct
   */
  public applyStandardTags(resource: IConstruct, context: TaggingContext, additionalTags?: Record<string, string>): void {
    const standardTags = this.buildStandardTags(context);
    
    // Apply all standard tags
    Object.entries(standardTags).forEach(([key, value]) => {
      cdk.Tags.of(resource).add(key, value);
    });
    
    // Apply any additional component-specific tags
    if (additionalTags) {
      Object.entries(additionalTags).forEach(([key, value]) => {
        cdk.Tags.of(resource).add(key, value);
      });
    }
  }

  /**
   * Get data classification based on compliance framework
   */
  private getDataClassification(framework: string): string {
    switch (framework) {
      case 'fedramp-high':
        return 'confidential';
      case 'fedramp-moderate':
        return 'internal';
      case 'commercial':
      default:
        return 'public';
    }
  }

  /**
   * Get encryption requirement based on compliance framework
   */
  private getEncryptionRequired(framework: string): string {
    switch (framework) {
      case 'fedramp-high':
      case 'fedramp-moderate':
        return 'required';
      case 'commercial':
      default:
        return 'recommended';
    }
  }

  /**
   * Get backup requirement based on compliance framework
   */
  private getBackupRequired(framework: string): string {
    switch (framework) {
      case 'fedramp-high':
      case 'fedramp-moderate':
        return 'required';
      case 'commercial':
      default:
        return 'recommended';
    }
  }

  /**
   * Get monitoring level based on compliance framework
   */
  private getMonitoringLevel(framework: string): string {
    switch (framework) {
      case 'fedramp-high':
        return 'enhanced';
      case 'fedramp-moderate':
        return 'standard';
      case 'commercial':
      default:
        return 'basic';
    }
  }

  /**
   * Get retention period based on compliance framework
   */
  private getRetentionPeriod(framework: string): string {
    switch (framework) {
      case 'fedramp-high':
        return '7-years';
      case 'fedramp-moderate':
        return '3-years';
      case 'commercial':
      default:
        return '1-year';
    }
  }
}

/**
 * Default tagging service instance
 */
export const defaultTaggingService = new TaggingService();
