/**
 * Audit Lambda Example
 * 
 * Demonstrates how to use the Lambda Worker Component with
 * Lambda Observability Service and Powertools for compliance auditing.
 * 
 * This example shows:
 * - Enhanced observability with OTEL + X-Ray + Powertools
 * - Business metrics for audit operations
 * - Parameter store integration for audit rules
 * - Structured logging with automatic Lambda context
 * 
 * The Lambda Worker Component now includes platform-level Lambda Powertools services
 * that provide the same enhanced observability capabilities.
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { Logger, Metrics, Tracer } from '@aws-lambda-powertools/commons';
import { getParameter } from '@aws-lambda-powertools/parameters/ssm';

// Initialize Powertools with automatic Lambda context injection
const logger = new Logger({
  serviceName: 'audit-service',
  persistentLogAttributes: {
    service: 'shinobi-platform',
    environment: process.env.ENVIRONMENT || 'development',
    version: process.env.SERVICE_VERSION || '1.0.0'
  }
});

const metrics = new Metrics({
  namespace: 'Shinobi/Audit',
  serviceName: 'audit-service'
});

const tracer = new Tracer({
  serviceName: 'audit-service'
});

/**
 * Audit event interface
 */
interface AuditEvent {
  auditType: string;
  resourceId: string;
  complianceFramework: string;
  auditId: string;
  requestedBy: string;
  parameters?: Record<string, any>;
}

/**
 * Audit result interface
 */
interface AuditResult {
  auditId: string;
  status: 'success' | 'failure' | 'partial';
  findings: AuditFinding[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  duration: number;
  timestamp: string;
}

/**
 * Audit finding interface
 */
interface AuditFinding {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  recommendation: string;
  complianceFramework: string;
}

/**
 * Main audit handler
 * 
 * Demonstrates enhanced observability capabilities:
 * - Automatic Lambda context injection in logs
 * - Business metrics for audit operations
 * - Parameter store integration for audit rules
 * - X-Ray tracing correlation
 */
export const auditHandler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {

  // Start audit span for X-Ray tracing
  const auditSpan = tracer.createSubSegment('compliance-audit');

  const startTime = Date.now();
  let auditResult: AuditResult;

  try {
    // Parse audit request
    const auditEvent: AuditEvent = JSON.parse(event.body || '{}');

    // Log audit start with automatic Lambda context
    logger.info('Audit process started', {
      auditType: auditEvent.auditType,
      resourceId: auditEvent.resourceId,
      complianceFramework: auditEvent.complianceFramework,
      auditId: auditEvent.auditId,
      requestedBy: auditEvent.requestedBy
    });

    // Record business metrics
    metrics.addMetric('AuditsStarted', 'Count', 1);
    metrics.addDimension('AuditType', auditEvent.auditType);
    metrics.addDimension('ComplianceFramework', auditEvent.complianceFramework);

    // Retrieve audit rules from Parameter Store (with caching)
    const auditRules = await getParameter(
      `/shinobi/audit/rules/${auditEvent.complianceFramework}`,
      {
        decrypt: true,
        maxAge: 300 // Cache for 5 minutes
      }
    );

    if (!auditRules) {
      throw new Error(`No audit rules found for framework: ${auditEvent.complianceFramework}`);
    }

    logger.info('Audit rules retrieved', {
      auditId: auditEvent.auditId,
      rulesCount: JSON.parse(auditRules).length
    });

    // Perform compliance audit
    const findings = await performComplianceAudit(auditEvent, JSON.parse(auditRules));

    // Calculate risk level
    const riskLevel = calculateRiskLevel(findings);

    // Record audit completion metrics
    const duration = Date.now() - startTime;
    metrics.addMetric('AuditDuration', 'Milliseconds', duration);
    metrics.addMetric('AuditFindings', 'Count', findings.length);
    metrics.addDimension('RiskLevel', riskLevel);

    // Create audit result
    auditResult = {
      auditId: auditEvent.auditId,
      status: findings.length === 0 ? 'success' : findings.some(f => f.severity === 'critical') ? 'failure' : 'partial',
      findings,
      riskLevel,
      duration,
      timestamp: new Date().toISOString()
    };

    // Log audit completion with correlation
    logger.info('Audit completed successfully', {
      auditId: auditEvent.auditId,
      status: auditResult.status,
      findingsCount: findings.length,
      riskLevel: riskLevel,
      duration: duration,
      // Lambda context automatically included:
      // functionName, functionVersion, awsRequestId, memoryLimitInMB, etc.
    });

    // Publish stored metrics
    metrics.publishStoredMetrics();

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-Audit-Id': auditEvent.auditId,
        'X-Risk-Level': riskLevel
      },
      body: JSON.stringify(auditResult)
    };

  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = (error as Error).message;

    // Log error with automatic correlation
    logger.error('Audit failed', {
      error: errorMessage,
      duration: duration,
      // Lambda context automatically included
    });

    // Record error metrics
    metrics.addMetric('AuditFailures', 'Count', 1);
    metrics.publishStoredMetrics();

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        error: 'Audit failed',
        message: errorMessage,
        timestamp: new Date().toISOString()
      })
    };

  } finally {
    // Close X-Ray span
    auditSpan.close();
  }
};

/**
 * Perform compliance audit
 */
async function performComplianceAudit(
  auditEvent: AuditEvent,
  auditRules: any[]
): Promise<AuditFinding[]> {

  const auditSpan = tracer.createSubSegment('perform-compliance-audit');

  try {
    const findings: AuditFinding[] = [];

    logger.info('Performing compliance audit', {
      auditId: auditEvent.auditId,
      rulesCount: auditRules.length
    });

    // Simulate audit checks
    for (const rule of auditRules) {
      const finding = await checkComplianceRule(auditEvent, rule);
      if (finding) {
        findings.push(finding);
      }
    }

    logger.info('Compliance audit completed', {
      auditId: auditEvent.auditId,
      findingsCount: findings.length,
      criticalFindings: findings.filter(f => f.severity === 'critical').length
    });

    return findings;

  } finally {
    auditSpan.close();
  }
}

/**
 * Check individual compliance rule
 */
async function checkComplianceRule(
  auditEvent: AuditEvent,
  rule: any
): Promise<AuditFinding | null> {

  const ruleSpan = tracer.createSubSegment(`check-rule-${rule.id}`);

  try {
    // Simulate rule check (in real implementation, this would be actual compliance logic)
    const isCompliant = Math.random() > 0.3; // 70% compliance rate for demo

    if (isCompliant) {
      return null; // No finding
    }

    // Create finding for non-compliant resource
    const finding: AuditFinding = {
      id: `finding-${Date.now()}`,
      type: rule.type,
      severity: rule.severity || 'medium',
      description: `Compliance violation: ${rule.description}`,
      recommendation: rule.recommendation || 'Review and remediate the identified issue',
      complianceFramework: auditEvent.complianceFramework
    };

    logger.warn('Compliance violation found', {
      auditId: auditEvent.auditId,
      ruleId: rule.id,
      findingId: finding.id,
      severity: finding.severity
    });

    return finding;

  } finally {
    ruleSpan.close();
  }
}

/**
 * Calculate risk level based on findings
 */
function calculateRiskLevel(findings: AuditFinding[]): 'low' | 'medium' | 'high' | 'critical' {
  if (findings.length === 0) return 'low';

  const criticalCount = findings.filter(f => f.severity === 'critical').length;
  const highCount = findings.filter(f => f.severity === 'high').length;
  const mediumCount = findings.filter(f => f.severity === 'medium').length;

  if (criticalCount > 0) return 'critical';
  if (highCount > 2) return 'high';
  if (highCount > 0 || mediumCount > 3) return 'medium';
  return 'low';
}

/**
 * Example usage in CDK
 */
export function createAuditLambda(scope: any, id: string): EnhancedLambdaWorkerComponent {
  return new EnhancedLambdaWorkerComponent(scope, id, {
    runtime: 'nodejs20.x',
    architecture: 'x86_64',
    memorySize: 512,
    timeoutSeconds: 300,
    handler: 'audit-lambda.example.auditHandler',
    code: lambda.Code.fromAsset('./dist'),
    observability: {
      enabled: true,
      serviceName: 'audit-service',
      complianceFramework: 'fedramp-moderate',
      powertools: {
        businessMetrics: true,
        parameterStore: true,
        auditLogging: true,
        logLevel: 'INFO'
      }
    },
    environment: {
      ENVIRONMENT: 'production',
      SERVICE_VERSION: '1.0.0'
    },
    policies: [
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'ssm:GetParameter',
          'ssm:GetParameters',
          'ssm:GetParametersByPath'
        ],
        resources: [
          'arn:aws:ssm:*:*:parameter/shinobi/audit/*'
        ]
      })
    ]
  });
}
