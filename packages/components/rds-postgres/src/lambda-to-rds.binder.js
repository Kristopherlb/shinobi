"use strict";
/**
 * Lambda to RDS Binder Strategy
 * Enterprise-grade binding with CDK L2 construct integration
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
exports.LambdaToRdsBinderStrategy = void 0;
const iam = __importStar(require("aws-cdk-lib/aws-iam"));
/**
 * Enhanced Lambda to RDS binding with enterprise security
 */
class LambdaToRdsBinderStrategy {
    canHandle(sourceType, targetCapability) {
        return (sourceType === 'lambda-api' || sourceType === 'lambda-worker') &&
            targetCapability === 'database:rds';
    }
    bind(context) {
        const { source, target, directive } = context;
        // 1. Get the REAL L2 construct handles from the component instances
        const lambdaConstruct = source.getConstruct('main');
        const rdsConstruct = target.getConstruct('main');
        if (!lambdaConstruct || !rdsConstruct) {
            throw new Error(`Could not retrieve construct handles for binding ${source.spec.name} -> ${target.spec.name}`);
        }
        // 2. Use high-level L2 methods to apply database connections and permissions
        this.grantRDSAccess(rdsConstruct, lambdaConstruct, directive.access);
        // 3. Configure VPC connectivity using CDK security groups
        this.configureNetworkAccess(rdsConstruct, lambdaConstruct, context);
        // 4. Apply compliance-specific security enhancements
        if (context.complianceFramework.startsWith('fedramp')) {
            this.applyFedRAMPSecurityEnhancements(rdsConstruct, lambdaConstruct, context);
        }
        // 5. Handle SSL/TLS configuration for secure connections
        if (directive.options?.ssl !== false) {
            this.configureSecureConnection(rdsConstruct, lambdaConstruct, context);
        }
        // 6. Return environment variables from the REAL construct
        return {
            environmentVariables: {
                [directive.env?.host || 'DB_HOST']: rdsConstruct.instanceEndpoint.hostname,
                [directive.env?.port || 'DB_PORT']: rdsConstruct.instanceEndpoint.port.toString(),
                [directive.env?.database || 'DB_NAME']: target.getCapabilities()['database:rds'].database,
                [directive.env?.connectionString || 'DATABASE_URL']: this.buildConnectionString(rdsConstruct, target, directive.options?.ssl !== false)
            }
        };
    }
    /**
     * Grant Lambda access to the database using CDK L2 methods
     */
    grantRDSAccess(rdsConstruct, lambdaConstruct, access) {
        switch (access) {
            case 'read':
            case 'readwrite': // Both read and readwrite need secret access
                // Grant Lambda permission to read database credentials from Secrets Manager
                rdsConstruct.secret?.grantRead(lambdaConstruct);
                break;
            case 'write':
                // Write operations still need credential access
                rdsConstruct.secret?.grantRead(lambdaConstruct);
                break;
            case 'admin':
                // Full access including secret management
                rdsConstruct.secret?.grantRead(lambdaConstruct);
                rdsConstruct.secret?.grantWrite(lambdaConstruct);
                break;
            default:
                throw new Error(`Invalid access level: ${access}. Valid values: read, write, readwrite, admin`);
        }
    }
    /**
     * Configure VPC network access using CDK security groups
     */
    configureNetworkAccess(rdsConstruct, lambdaConstruct, context) {
        // Use CDK's high-level connection methods to allow Lambda to connect to RDS
        rdsConstruct.connections.allowDefaultPortFrom(lambdaConstruct.connections, `Allow ${context.source.spec.name} to connect to ${context.target.spec.name}`);
    }
    /**
     * Apply FedRAMP-specific security enhancements using CDK
     */
    applyFedRAMPSecurityEnhancements(rdsConstruct, lambdaConstruct, context) {
        // Add enhanced monitoring permissions for FedRAMP compliance
        lambdaConstruct.addToRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                'rds:DescribeDBInstances',
                'rds:DescribeDBClusters',
                'rds:ListTagsForResource'
            ],
            resources: [rdsConstruct.instanceArn],
            conditions: {
                'StringEquals': {
                    'aws:RequestedRegion': context.environment,
                    'aws:SecureTransport': 'true'
                }
            }
        }));
    }
    /**
     * Configure SSL/TLS secure connection requirements
     */
    configureSecureConnection(rdsConstruct, lambdaConstruct, context) {
        // Add environment variable to enforce SSL connections
        lambdaConstruct.addEnvironment('DB_SSL_MODE', 'require');
        // For FedRAMP, enforce certificate verification
        if (context.complianceFramework.startsWith('fedramp')) {
            lambdaConstruct.addEnvironment('DB_SSL_MODE', 'verify-full');
        }
    }
    /**
     * Build secure connection string with proper SSL configuration
     */
    buildConnectionString(rdsConstruct, target, requireSsl) {
        const dbName = target.getCapabilities()['database:rds'].database;
        const sslParam = requireSsl ? '?sslmode=require' : '';
        return `postgresql://{username}:{password}@${rdsConstruct.instanceEndpoint.hostname}:${rdsConstruct.instanceEndpoint.port}/${dbName}${sslParam}`;
    }
}
exports.LambdaToRdsBinderStrategy = LambdaToRdsBinderStrategy;
//# sourceMappingURL=lambda-to-rds.binder.js.map