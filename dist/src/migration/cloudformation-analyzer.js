"use strict";
/**
 * CloudFormation Template Analyzer
 * Phase 1: Analyzes existing CDK project and extracts resource inventory
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
exports.CloudFormationAnalyzer = void 0;
const child_process_1 = require("child_process");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
/**
 * Analyzes existing CDK projects by synthesizing and parsing CloudFormation templates
 */
class CloudFormationAnalyzer {
    logger;
    constructor(logger) {
        this.logger = logger;
    }
    /**
     * Analyze an existing CDK stack and extract complete resource inventory
     */
    async analyzeStack(cdkProjectPath, stackName) {
        this.logger.debug(`Analyzing CDK stack: ${stackName} at ${cdkProjectPath}`);
        // Validate CDK project exists and is valid
        this.validateCdkProject(cdkProjectPath);
        // Synthesize the CloudFormation template
        const templatePath = await this.synthesizeStack(cdkProjectPath, stackName);
        // Parse and analyze the template
        const template = JSON.parse(fs.readFileSync(templatePath, 'utf8'));
        const result = {
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
    validateCdkProject(projectPath) {
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
            (0, child_process_1.execSync)('npx cdk --version', {
                cwd: projectPath,
                stdio: 'pipe'
            });
        }
        catch (error) {
            throw new Error(`CDK CLI not available. Please ensure AWS CDK is installed in the project: ${error}`);
        }
    }
    async synthesizeStack(cdkProjectPath, stackName) {
        this.logger.debug(`Synthesizing stack: ${stackName}`);
        try {
            // Run cdk synth to generate CloudFormation template
            const synthOutput = (0, child_process_1.execSync)(`npx cdk synth ${stackName} --json`, {
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
                }
                catch (parseError) {
                    // If not JSON, run regular synth
                    (0, child_process_1.execSync)(`npx cdk synth ${stackName}`, {
                        cwd: cdkProjectPath,
                        stdio: 'inherit'
                    });
                }
            }
            if (!fs.existsSync(templatePath)) {
                throw new Error(`Template not found after synthesis: ${templatePath}`);
            }
            return templatePath;
        }
        catch (error) {
            if (error.message.includes('No stacks match')) {
                throw new Error(`Stack '${stackName}' not found. Available stacks can be listed with 'cdk list' in ${cdkProjectPath}`);
            }
            throw new Error(`Failed to synthesize stack '${stackName}': ${error.message}`);
        }
    }
    extractResources(template) {
        const resources = [];
        const resourcesSection = template.Resources || {};
        for (const [logicalId, resource] of Object.entries(resourcesSection)) {
            const cfnResource = resource;
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
    sortResourcesByDependency(resources) {
        const resourceMap = new Map();
        resources.forEach(resource => resourceMap.set(resource.logicalId, resource));
        const visited = new Set();
        const visiting = new Set();
        const sorted = [];
        const visit = (logicalId) => {
            if (visited.has(logicalId))
                return;
            if (visiting.has(logicalId)) {
                // Circular dependency detected - continue without error for migration purposes
                this.logger.warn(`Circular dependency detected involving ${logicalId}`);
                return;
            }
            const resource = resourceMap.get(logicalId);
            if (!resource)
                return;
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
    analyzeResourceRelationships(resources) {
        const relationships = [];
        for (const resource of resources) {
            // Analyze common relationship patterns
            this.analyzeIAMRelationships(resource, resources, relationships);
            this.analyzeNetworkRelationships(resource, resources, relationships);
            this.analyzeDataRelationships(resource, resources, relationships);
        }
        return relationships;
    }
    analyzeIAMRelationships(resource, allResources, relationships) {
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
    analyzeNetworkRelationships(resource, allResources, relationships) {
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
    analyzeDataRelationships(resource, allResources, relationships) {
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
exports.CloudFormationAnalyzer = CloudFormationAnalyzer;
