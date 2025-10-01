/**
 * CloudFormation Template Analyzer
 * Phase 1: Analyzes existing CDK project and extracts resource inventory
 */

import { Logger } from '../core-engine/logger.js';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export interface CloudFormationResource {
  logicalId: string;
  type: string;
  properties: any;
  metadata?: any;
  dependsOn?: string[];
}

export interface StackAnalysisResult {
  stackName: string;
  templatePath: string;
  template: any;
  resources: CloudFormationResource[];
  outputs: Record<string, any>;
  parameters: Record<string, any>;
  metadata: any;
}

/**
 * Analyzes existing CDK projects by synthesizing and parsing CloudFormation templates
 */
export class CloudFormationAnalyzer {
  constructor(private logger: Logger) {}

  /**
   * Analyze an existing CDK stack and extract complete resource inventory
   */
  async analyzeStack(cdkProjectPath: string, stackName: string): Promise<StackAnalysisResult> {
    this.logger.debug(`Analyzing CDK stack: ${stackName} at ${cdkProjectPath}`);

    // Validate CDK project exists and is valid
    this.validateCdkProject(cdkProjectPath);

    // Synthesize the CloudFormation template
    const templatePath = await this.synthesizeStack(cdkProjectPath, stackName);

    // Parse and analyze the template
    const template = JSON.parse(fs.readFileSync(templatePath, 'utf8'));
    
    const result: StackAnalysisResult = {
      stackName,
      templatePath,
      template,
      resources: this.extractResources(template),
      outputs: template.Outputs || {},
      parameters: template.Parameters || {},
      metadata: template.Metadata || {}
    };

    this.logger.debug(`Analysis complete: found ${result.resources.length} resources`);
    
    return result;
  }

  private validateCdkProject(projectPath: string): void {
    if (!fs.existsSync(projectPath)) {
      throw new Error(`CDK project path does not exist: ${projectPath}`);
    }

    const cdkJsonPath = path.join(projectPath, 'cdk.json');
    const packageJsonPath = path.join(projectPath, 'package.json');

    if (!fs.existsSync(cdkJsonPath) && !fs.existsSync(packageJsonPath)) {
      throw new Error(`Not a valid CDK project: missing cdk.json or package.json in ${projectPath}`);
    }

    // Check if AWS CDK is available
    try {
      execSync('npx cdk --version', { 
        cwd: projectPath, 
        stdio: 'pipe' 
      });
    } catch (error) {
      throw new Error(`CDK CLI not available. Please ensure AWS CDK is installed in the project: ${error}`);
    }
  }

  private async synthesizeStack(cdkProjectPath: string, stackName: string): Promise<string> {
    this.logger.debug(`Synthesizing stack: ${stackName}`);

    try {
      // Run cdk synth to generate CloudFormation template
      const synthOutput = execSync(`npx cdk synth ${stackName} --json`, {
        cwd: cdkProjectPath,
        encoding: 'utf8',
        stdio: 'pipe'
      });

      // CDK synth with --json outputs the template directly
      const outputDir = path.join(cdkProjectPath, 'cdk.out');
      const templatePath = path.join(outputDir, `${stackName}.template.json`);

      // If direct JSON output, save it to expected location
      if (!fs.existsSync(templatePath)) {
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
        }
        
        // Parse the synth output to extract the template
        try {
          const template = JSON.parse(synthOutput);
          fs.writeFileSync(templatePath, JSON.stringify(template, null, 2));
        } catch (parseError) {
          // If not JSON, run regular synth
          execSync(`npx cdk synth ${stackName}`, {
            cwd: cdkProjectPath,
            stdio: 'inherit'
          });
        }
      }

      if (!fs.existsSync(templatePath)) {
        throw new Error(`Template not found after synthesis: ${templatePath}`);
      }

      return templatePath;

    } catch (error: any) {
      if (error.message.includes('No stacks match')) {
        throw new Error(`Stack '${stackName}' not found. Available stacks can be listed with 'cdk list' in ${cdkProjectPath}`);
      }
      
      throw new Error(`Failed to synthesize stack '${stackName}': ${error.message}`);
    }
  }

  private extractResources(template: any): CloudFormationResource[] {
    const resources: CloudFormationResource[] = [];
    const resourcesSection = template.Resources || {};

    for (const [logicalId, resource] of Object.entries(resourcesSection)) {
      const cfnResource = resource as any;
      
      resources.push({
        logicalId,
        type: cfnResource.Type,
        properties: cfnResource.Properties || {},
        metadata: cfnResource.Metadata,
        dependsOn: cfnResource.DependsOn ? 
          (Array.isArray(cfnResource.DependsOn) ? cfnResource.DependsOn : [cfnResource.DependsOn]) : 
          undefined
      });
    }

    // Sort resources by dependency order for better analysis
    return this.sortResourcesByDependency(resources);
  }

  private sortResourcesByDependency(resources: CloudFormationResource[]): CloudFormationResource[] {
    const resourceMap = new Map<string, CloudFormationResource>();
    resources.forEach(resource => resourceMap.set(resource.logicalId, resource));

    const visited = new Set<string>();
    const visiting = new Set<string>();
    const sorted: CloudFormationResource[] = [];

    const visit = (logicalId: string): void => {
      if (visited.has(logicalId)) return;
      if (visiting.has(logicalId)) {
        // Circular dependency detected - continue without error for migration purposes
        this.logger.warn(`Circular dependency detected involving ${logicalId}`);
        return;
      }

      const resource = resourceMap.get(logicalId);
      if (!resource) return;

      visiting.add(logicalId);

      // Visit dependencies first
      if (resource.dependsOn) {
        resource.dependsOn.forEach(depId => {
          if (resourceMap.has(depId)) {
            visit(depId);
          }
        });
      }

      visiting.delete(logicalId);
      visited.add(logicalId);
      sorted.push(resource);
    };

    // Visit all resources
    resources.forEach(resource => visit(resource.logicalId));

    return sorted;
  }

  /**
   * Analyze resource relationships and extract binding patterns
   */
  analyzeResourceRelationships(resources: CloudFormationResource[]): Array<{
    source: string;
    target: string;
    relationship: string;
    evidence: any;
  }> {
    const relationships: Array<{
      source: string;
      target: string;
      relationship: string;
      evidence: any;
    }> = [];

    for (const resource of resources) {
      // Analyze common relationship patterns
      this.analyzeIAMRelationships(resource, resources, relationships);
      this.analyzeNetworkRelationships(resource, resources, relationships);
      this.analyzeDataRelationships(resource, resources, relationships);
    }

    return relationships;
  }

  private analyzeIAMRelationships(
    resource: CloudFormationResource,
    allResources: CloudFormationResource[],
    relationships: any[]
  ): void {
    // Look for IAM policies that grant permissions between resources
    if (resource.type === 'AWS::IAM::Policy' || resource.type === 'AWS::IAM::Role') {
      const policyDocument = resource.properties.PolicyDocument || resource.properties.AssumeRolePolicyDocument;
      
      if (policyDocument && policyDocument.Statement) {
        for (const statement of policyDocument.Statement) {
          if (statement.Effect === 'Allow' && statement.Resource) {
            const resourceArns = Array.isArray(statement.Resource) ? statement.Resource : [statement.Resource];
            
            for (const arn of resourceArns) {
              if (typeof arn === 'object' && arn.Ref) {
                relationships.push({
                  source: resource.logicalId,
                  target: arn.Ref,
                  relationship: 'iam-permission',
                  evidence: {
                    actions: statement.Action,
                    resource: arn
                  }
                });
              }
            }
          }
        }
      }
    }
  }

  private analyzeNetworkRelationships(
    resource: CloudFormationResource,
    allResources: CloudFormationResource[],
    relationships: any[]
  ): void {
    // Analyze security group rules
    if (resource.type === 'AWS::EC2::SecurityGroup') {
      const rules = [
        ...(resource.properties.SecurityGroupIngress || []),
        ...(resource.properties.SecurityGroupEgress || [])
      ];

      for (const rule of rules) {
        if (rule.SourceSecurityGroupId && typeof rule.SourceSecurityGroupId === 'object') {
          relationships.push({
            source: resource.logicalId,
            target: rule.SourceSecurityGroupId.Ref || rule.SourceSecurityGroupId.GetAtt?.[0],
            relationship: 'network-access',
            evidence: {
              port: rule.FromPort,
              protocol: rule.IpProtocol
            }
          });
        }
      }
    }
  }

  private analyzeDataRelationships(
    resource: CloudFormationResource,
    allResources: CloudFormationResource[],
    relationships: any[]
  ): void {
    // Look for references in properties that indicate data relationships
    const properties = JSON.stringify(resource.properties);
    const refMatches = properties.match(/\{"Ref":"([^"]+)"\}/g) || [];
    const getAttMatches = properties.match(/\{"Fn::GetAtt":\["([^"]+)",/g) || [];

    // Extract Ref relationships
    for (const match of refMatches) {
      const refTarget = match.match(/\{"Ref":"([^"]+)"\}/)?.[1];
      if (refTarget && refTarget !== resource.logicalId) {
        relationships.push({
          source: resource.logicalId,
          target: refTarget,
          relationship: 'data-reference',
          evidence: { type: 'Ref' }
        });
      }
    }

    // Extract GetAtt relationships  
    for (const match of getAttMatches) {
      const getAttTarget = match.match(/\{"Fn::GetAtt":\["([^"]+)",/)?.[1];
      if (getAttTarget && getAttTarget !== resource.logicalId) {
        relationships.push({
          source: resource.logicalId,
          target: getAttTarget,
          relationship: 'data-reference',
          evidence: { type: 'GetAtt' }
        });
      }
    }
  }
}