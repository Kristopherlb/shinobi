/**
 * Compliance Control Mapping Service
 * 
 * Maps components to NIST/FedRAMP controls based on component type and framework.
 * Provides compliance plan generation and control validation.
 */

import { ComponentType, ComplianceFramework } from '../contracts/bindings.js';

// NIST Control definitions
export interface NISTControl {
  id: string;
  title: string;
  description: string;
  category: 'AC' | 'AT' | 'AU' | 'CA' | 'CM' | 'CP' | 'IA' | 'IR' | 'MA' | 'MP' | 'PE' | 'PL' | 'PS' | 'RA' | 'SA' | 'SC' | 'SI';
  severity: 'low' | 'moderate' | 'high';
  implementation_guidance: string[];
  assessment_procedures: string[];
}

// Component-specific control mappings
export interface ComponentControlMapping {
  componentType: ComponentType;
  controls: string[]; // NIST control IDs
  dataClassification?: 'public' | 'internal' | 'confidential' | 'pii';
  requiredTags: string[];
  complianceRules: ComplianceRule[];
}

// Compliance rule definition
export interface ComplianceRule {
  ruleId: string;
  description: string;
  severity: 'error' | 'warning' | 'info';
  validation: (component: any) => boolean;
  remediation?: string;
}

// Compliance plan for a component
export interface CompliancePlan {
  componentId: string;
  componentType: ComponentType;
  framework: ComplianceFramework;
  controls: NISTControl[];
  dataClassification?: string;
  requiredTags: Record<string, string>;
  complianceRules: ComplianceRule[];
  generatedAt: string;
  expiresAt: string;
}

// Control mapping database
const CONTROL_MAPPINGS: Record<ComponentType, ComponentControlMapping> = {
  's3-bucket': {
    componentType: 's3-bucket',
    controls: ['AC-2', 'AC-3', 'AC-6', 'SC-7', 'SC-28', 'SC-28(1)', 'SI-12'],
    dataClassification: 'confidential', // Default for data stores
    requiredTags: ['Service', 'Component', 'Environment', 'Owner', 'DataClassification', 'ComplianceFramework'],
    complianceRules: [
      {
        ruleId: 'S3-001',
        description: 'S3 bucket must have encryption enabled',
        severity: 'error',
        validation: (component) => component.config?.encryption?.enabled === true,
        remediation: 'Enable server-side encryption for the S3 bucket'
      },
      {
        ruleId: 'S3-002',
        description: 'S3 bucket must block public access',
        severity: 'error',
        validation: (component) => component.config?.publicAccessBlock === true,
        remediation: 'Enable public access block for the S3 bucket'
      },
      {
        ruleId: 'S3-003',
        description: 'S3 bucket must have versioning enabled for FedRAMP',
        severity: 'warning',
        validation: (component) => component.config?.versioning?.enabled === true,
        remediation: 'Enable versioning for data protection and compliance'
      }
    ]
  },
  'lambda-api': {
    componentType: 'lambda-api',
    controls: ['AC-2', 'AC-3', 'AC-6', 'SC-7', 'SC-28', 'SI-2', 'SI-3', 'SI-4'],
    requiredTags: ['Service', 'Component', 'Environment', 'Owner', 'ComplianceFramework'],
    complianceRules: [
      {
        ruleId: 'LAMBDA-001',
        description: 'Lambda function must have least privilege IAM role',
        severity: 'error',
        validation: (component) => component.config?.iamRole?.leastPrivilege === true,
        remediation: 'Configure IAM role with minimal required permissions'
      },
      {
        ruleId: 'LAMBDA-002',
        description: 'Lambda function must have structured logging',
        severity: 'error',
        validation: (component) => component.config?.logging?.structured === true,
        remediation: 'Enable structured JSON logging for audit trails'
      },
      {
        ruleId: 'LAMBDA-003',
        description: 'Lambda function must have tracing enabled',
        severity: 'warning',
        validation: (component) => component.config?.tracing?.enabled === true,
        remediation: 'Enable X-Ray tracing for monitoring and debugging'
      }
    ]
  },
  'rds-postgres': {
    componentType: 'rds-postgres',
    controls: ['AC-2', 'AC-3', 'AC-6', 'SC-7', 'SC-28', 'SC-28(1)', 'SI-12', 'AU-2', 'AU-3'],
    dataClassification: 'confidential',
    requiredTags: ['Service', 'Component', 'Environment', 'Owner', 'DataClassification', 'ComplianceFramework'],
    complianceRules: [
      {
        ruleId: 'RDS-001',
        description: 'RDS instance must have encryption enabled',
        severity: 'error',
        validation: (component) => component.config?.encryption?.enabled === true,
        remediation: 'Enable encryption at rest for the RDS instance'
      },
      {
        ruleId: 'RDS-002',
        description: 'RDS instance must not be publicly accessible',
        severity: 'error',
        validation: (component) => component.config?.publiclyAccessible === false,
        remediation: 'Disable public access for the RDS instance'
      },
      {
        ruleId: 'RDS-003',
        description: 'RDS instance must have automated backups enabled',
        severity: 'error',
        validation: (component) => component.config?.backup?.enabled === true,
        remediation: 'Enable automated backups for data protection'
      }
    ]
  },
  'ec2-instance': {
    componentType: 'ec2-instance',
    controls: ['AC-2', 'AC-3', 'AC-6', 'SC-7', 'SC-28', 'SI-2', 'SI-3', 'SI-4', 'CM-2', 'CM-6'],
    requiredTags: ['Service', 'Component', 'Environment', 'Owner', 'ComplianceFramework'],
    complianceRules: [
      {
        ruleId: 'EC2-001',
        description: 'EC2 instance must have security group with least privilege',
        severity: 'error',
        validation: (component) => component.config?.securityGroups?.length > 0,
        remediation: 'Configure security groups with minimal required access'
      },
      {
        ruleId: 'EC2-002',
        description: 'EC2 instance must have monitoring enabled',
        severity: 'warning',
        validation: (component) => component.config?.monitoring?.enabled === true,
        remediation: 'Enable CloudWatch monitoring for the EC2 instance'
      }
    ]
  },
  'dynamodb-table': {
    componentType: 'dynamodb-table',
    controls: ['AC-2', 'AC-3', 'AC-6', 'SC-7', 'SC-28', 'SC-28(1)', 'SI-12'],
    dataClassification: 'confidential',
    requiredTags: ['Service', 'Component', 'Environment', 'Owner', 'DataClassification', 'ComplianceFramework'],
    complianceRules: [
      {
        ruleId: 'DYNAMODB-001',
        description: 'DynamoDB table must have encryption enabled',
        severity: 'error',
        validation: (component) => component.config?.encryption?.enabled === true,
        remediation: 'Enable encryption at rest for the DynamoDB table'
      },
      {
        ruleId: 'DYNAMODB-002',
        description: 'DynamoDB table must have point-in-time recovery enabled',
        severity: 'warning',
        validation: (component) => component.config?.pointInTimeRecovery?.enabled === true,
        remediation: 'Enable point-in-time recovery for data protection'
      }
    ]
  },
  'sqs-queue': {
    componentType: 'sqs-queue',
    controls: ['AC-2', 'AC-3', 'AC-6', 'SC-7', 'SC-28'],
    requiredTags: ['Service', 'Component', 'Environment', 'Owner', 'ComplianceFramework'],
    complianceRules: [
      {
        ruleId: 'SQS-001',
        description: 'SQS queue must have encryption enabled',
        severity: 'error',
        validation: (component) => component.config?.encryption?.enabled === true,
        remediation: 'Enable server-side encryption for the SQS queue'
      }
    ]
  },
  'sns-topic': {
    componentType: 'sns-topic',
    controls: ['AC-2', 'AC-3', 'AC-6', 'SC-7', 'SC-28'],
    requiredTags: ['Service', 'Component', 'Environment', 'Owner', 'ComplianceFramework'],
    complianceRules: [
      {
        ruleId: 'SNS-001',
        description: 'SNS topic must have encryption enabled',
        severity: 'error',
        validation: (component) => component.config?.encryption?.enabled === true,
        remediation: 'Enable server-side encryption for the SNS topic'
      }
    ]
  }
};

// NIST Control definitions
const NIST_CONTROLS: Record<string, NISTControl> = {
  'AC-2': {
    id: 'AC-2',
    title: 'Account Management',
    description: 'The organization manages information system accounts, including establishing, activating, modifying, disabling, and removing accounts.',
    category: 'AC',
    severity: 'moderate',
    implementation_guidance: [
      'Establish procedures for account creation and management',
      'Implement automated account provisioning and deprovisioning',
      'Regularly review and audit account access'
    ],
    assessment_procedures: [
      'Verify account management procedures are documented',
      'Test account creation and removal processes',
      'Review account access logs'
    ]
  },
  'AC-3': {
    id: 'AC-3',
    title: 'Access Enforcement',
    description: 'The information system enforces approved authorizations for logical access to information and system resources.',
    category: 'AC',
    severity: 'moderate',
    implementation_guidance: [
      'Implement role-based access control (RBAC)',
      'Enforce least privilege principle',
      'Regularly review and update access permissions'
    ],
    assessment_procedures: [
      'Verify access controls are properly configured',
      'Test access enforcement mechanisms',
      'Review access control logs'
    ]
  },
  'SC-7': {
    id: 'SC-7',
    title: 'Boundary Protection',
    description: 'The information system monitors and controls communications at the external boundary of the system.',
    category: 'SC',
    severity: 'moderate',
    implementation_guidance: [
      'Implement network firewalls and security groups',
      'Configure network segmentation',
      'Monitor network traffic at boundaries'
    ],
    assessment_procedures: [
      'Verify boundary protection controls are in place',
      'Test network segmentation',
      'Review network monitoring logs'
    ]
  },
  'SC-28': {
    id: 'SC-28',
    title: 'Protection of Information at Rest',
    description: 'The information system protects the confidentiality and integrity of information at rest.',
    category: 'SC',
    severity: 'high',
    implementation_guidance: [
      'Implement encryption for data at rest',
      'Use strong encryption algorithms',
      'Protect encryption keys'
    ],
    assessment_procedures: [
      'Verify encryption is enabled for data at rest',
      'Test encryption key management',
      'Review encryption configuration'
    ]
  }
};

export class ComplianceControlMappingService {
  /**
   * Get control mapping for a component type
   */
  getControlMapping(componentType: ComponentType): ComponentControlMapping | undefined {
    return CONTROL_MAPPINGS[componentType];
  }

  /**
   * Get NIST control definition
   */
  getNISTControl(controlId: string): NISTControl | undefined {
    return NIST_CONTROLS[controlId];
  }

  /**
   * Generate compliance plan for a component
   */
  generateCompliancePlan(
    componentId: string,
    componentType: ComponentType,
    framework: ComplianceFramework,
    componentConfig: any
  ): CompliancePlan {
    const mapping = this.getControlMapping(componentType);
    if (!mapping) {
      throw new Error(`No control mapping found for component type: ${componentType}`);
    }

    const controls = mapping.controls.map(controlId => this.getNISTControl(controlId)).filter(Boolean) as NISTControl[];

    // Generate required tags based on framework
    const requiredTags = this.generateRequiredTags(componentId, componentType, framework, componentConfig);

    // Validate compliance rules
    const validatedRules = mapping.complianceRules.map(rule => ({
      ...rule,
      valid: rule.validation(componentConfig)
    }));

    return {
      componentId,
      componentType,
      framework,
      controls,
      dataClassification: mapping.dataClassification,
      requiredTags,
      complianceRules: mapping.complianceRules,
      generatedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() // 1 year
    };
  }

  /**
   * Generate required tags for a component
   */
  private generateRequiredTags(
    componentId: string,
    componentType: ComponentType,
    framework: ComplianceFramework,
    componentConfig: any
  ): Record<string, string> {
    const tags: Record<string, string> = {
      Service: componentConfig.service || 'unknown',
      Component: componentId,
      ComponentType: componentType,
      Environment: componentConfig.environment || 'unknown',
      Owner: componentConfig.owner || 'unknown',
      ComplianceFramework: framework,
      ManagedBy: 'Shinobi'
    };

    // Add data classification if applicable
    if (componentConfig.dataClassification) {
      tags.DataClassification = componentConfig.dataClassification;
    }

    // Add framework-specific tags
    if (framework === 'fedramp-moderate' || framework === 'fedramp-high') {
      tags.FedRAMPCompliant = 'true';
      tags.SSPId = componentConfig.sspId || 'pending';
    }

    return tags;
  }

  /**
   * Validate component compliance
   */
  validateCompliance(component: any, framework: ComplianceFramework): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const mapping = this.getControlMapping(component.type);
    if (!mapping) {
      return {
        valid: false,
        errors: [`No control mapping found for component type: ${component.type}`],
        warnings: []
      };
    }

    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate compliance rules
    mapping.complianceRules.forEach(rule => {
      const isValid = rule.validation(component);
      if (!isValid) {
        const message = `${rule.ruleId}: ${rule.description}`;
        if (rule.severity === 'error') {
          errors.push(message);
        } else {
          warnings.push(message);
        }
      }
    });

    // Validate data classification for data stores
    if (mapping.dataClassification && !component.config?.dataClassification) {
      errors.push(`Data classification is required for ${component.type} components`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Get all supported component types
   */
  getSupportedComponentTypes(): ComponentType[] {
    return Object.keys(CONTROL_MAPPINGS) as ComponentType[];
  }

  /**
   * Get controls for a specific framework
   */
  getControlsForFramework(framework: ComplianceFramework): NISTControl[] {
    const allControls = new Set<string>();

    Object.values(CONTROL_MAPPINGS).forEach(mapping => {
      mapping.controls.forEach(controlId => allControls.add(controlId));
    });

    return Array.from(allControls)
      .map(controlId => this.getNISTControl(controlId))
      .filter(Boolean) as NISTControl[];
  }
}
