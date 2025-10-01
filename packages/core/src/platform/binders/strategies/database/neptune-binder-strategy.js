/**
 * Neptune Binder Strategy
 * Handles graph database bindings for Amazon Neptune
 */
// Compliance framework branching removed; use binding.options/config instead
export class NeptuneBinderStrategy {
    supportedCapabilities = ['neptune:cluster', 'neptune:instance', 'neptune:query'];
    async bind(sourceComponent, targetComponent, binding, context) {
        const { capability, access } = binding;
        switch (capability) {
            case 'neptune:cluster':
                await this.bindToCluster(sourceComponent, targetComponent, binding, context);
                break;
            case 'neptune:instance':
                await this.bindToInstance(sourceComponent, targetComponent, binding, context);
                break;
            case 'neptune:query':
                await this.bindToQuery(sourceComponent, targetComponent, binding, context);
                break;
            default:
                throw new Error(`Unsupported Neptune capability: ${capability}`);
        }
    }
    async bindToCluster(sourceComponent, targetComponent, binding, context) {
        const { access } = binding;
        // Grant cluster access permissions
        if (access.includes('read')) {
            sourceComponent.addToRolePolicy({
                Effect: 'Allow',
                Action: [
                    'rds:DescribeDBClusters',
                    'rds:DescribeDBClusterEndpoints',
                    'rds:DescribeDBClusterParameters'
                ],
                Resource: targetComponent.clusterArn
            });
        }
        if (access.includes('write')) {
            sourceComponent.addToRolePolicy({
                Effect: 'Allow',
                Action: [
                    'rds:CreateDBCluster',
                    'rds:ModifyDBCluster',
                    'rds:DeleteDBCluster',
                    'rds:StartDBCluster',
                    'rds:StopDBCluster'
                ],
                Resource: targetComponent.clusterArn
            });
        }
        // Inject cluster environment variables
        sourceComponent.addEnvironment('NEPTUNE_CLUSTER_IDENTIFIER', targetComponent.clusterIdentifier);
        sourceComponent.addEnvironment('NEPTUNE_CLUSTER_ARN', targetComponent.clusterArn);
        sourceComponent.addEnvironment('NEPTUNE_CLUSTER_ENDPOINT', targetComponent.clusterEndpoint);
        sourceComponent.addEnvironment('NEPTUNE_CLUSTER_PORT', targetComponent.port.toString());
        sourceComponent.addEnvironment('NEPTUNE_CLUSTER_STATUS', targetComponent.status);
        sourceComponent.addEnvironment('NEPTUNE_CLUSTER_ENGINE', targetComponent.engine);
        // Configure secure access when requested via options/config
        if (binding.options?.requireSecureAccess === true) {
            await this.configureSecureClusterAccess(sourceComponent, targetComponent, context);
        }
    }
    async bindToInstance(sourceComponent, targetComponent, binding, context) {
        const { access } = binding;
        // Grant instance access permissions
        if (access.includes('read')) {
            sourceComponent.addToRolePolicy({
                Effect: 'Allow',
                Action: [
                    'rds:DescribeDBInstances',
                    'rds:DescribeDBInstanceStatus'
                ],
                Resource: targetComponent.instanceArn
            });
        }
        if (access.includes('write')) {
            sourceComponent.addToRolePolicy({
                Effect: 'Allow',
                Action: [
                    'rds:CreateDBInstance',
                    'rds:ModifyDBInstance',
                    'rds:DeleteDBInstance',
                    'rds:RebootDBInstance',
                    'rds:StartDBInstance',
                    'rds:StopDBInstance'
                ],
                Resource: targetComponent.instanceArn
            });
        }
        // Inject instance environment variables
        sourceComponent.addEnvironment('NEPTUNE_INSTANCE_IDENTIFIER', targetComponent.instanceIdentifier);
        sourceComponent.addEnvironment('NEPTUNE_INSTANCE_ARN', targetComponent.instanceArn);
        sourceComponent.addEnvironment('NEPTUNE_INSTANCE_ENDPOINT', targetComponent.endpoint);
        sourceComponent.addEnvironment('NEPTUNE_INSTANCE_PORT', targetComponent.port.toString());
        sourceComponent.addEnvironment('NEPTUNE_INSTANCE_STATUS', targetComponent.dbInstanceStatus);
        sourceComponent.addEnvironment('NEPTUNE_INSTANCE_CLASS', targetComponent.dbInstanceClass);
    }
    async bindToQuery(sourceComponent, targetComponent, binding, context) {
        const { access } = binding;
        // Configure query access (Neptune uses standard HTTP/HTTPS)
        sourceComponent.addEnvironment('NEPTUNE_QUERY_ENDPOINT', targetComponent.queryEndpoint);
        sourceComponent.addEnvironment('NEPTUNE_QUERY_PORT', targetComponent.port.toString());
        sourceComponent.addEnvironment('NEPTUNE_QUERY_PROTOCOL', 'https');
        // Configure query languages
        if (targetComponent.supportedQueryLanguages) {
            sourceComponent.addEnvironment('NEPTUNE_QUERY_LANGUAGES', targetComponent.supportedQueryLanguages.join(','));
        }
        // Configure SPARQL endpoint
        if (targetComponent.sparqlEndpoint) {
            sourceComponent.addEnvironment('NEPTUNE_SPARQL_ENDPOINT', targetComponent.sparqlEndpoint);
        }
        // Configure Gremlin endpoint
        if (targetComponent.gremlinEndpoint) {
            sourceComponent.addEnvironment('NEPTUNE_GREMLIN_ENDPOINT', targetComponent.gremlinEndpoint);
        }
        // Configure secure query access when requested via options/config
        if (binding.options?.requireSecureAccess === true) {
            await this.configureSecureQueryAccess(sourceComponent, targetComponent, context);
        }
    }
    async configureSecureClusterAccess(sourceComponent, targetComponent, context) {
        // Configure encryption at rest
        if (targetComponent.storageEncrypted) {
            sourceComponent.addEnvironment('NEPTUNE_ENCRYPTION_ENABLED', 'true');
            if (targetComponent.kmsKeyId) {
                sourceComponent.addEnvironment('NEPTUNE_KMS_KEY_ID', targetComponent.kmsKeyId);
                // Grant KMS permissions
                sourceComponent.addToRolePolicy({
                    Effect: 'Allow',
                    Action: [
                        'kms:Decrypt',
                        'kms:GenerateDataKey'
                    ],
                    Resource: targetComponent.kmsKeyId
                });
            }
        }
        // Configure backup retention when specified
        if (targetComponent.backupRetentionPeriod) {
            sourceComponent.addEnvironment('NEPTUNE_BACKUP_RETENTION_DAYS', String(targetComponent.backupRetentionPeriod));
        }
        // Configure VPC security groups for private access
        if (targetComponent.vpcSecurityGroupIds) {
            sourceComponent.addEnvironment('NEPTUNE_SECURITY_GROUPS', targetComponent.vpcSecurityGroupIds.join(','));
        }
        // Configure subnet group for private networking
        if (targetComponent.dbSubnetGroupName) {
            sourceComponent.addEnvironment('NEPTUNE_SUBNET_GROUP', targetComponent.dbSubnetGroupName);
        }
    }
    async configureSecureQueryAccess(sourceComponent, targetComponent, context) {
        // Configure IAM authentication for secure access
        if (targetComponent.iamDatabaseAuthenticationEnabled) {
            sourceComponent.addEnvironment('NEPTUNE_IAM_AUTH_ENABLED', 'true');
        }
        // Configure SSL/TLS for encrypted connections
        sourceComponent.addEnvironment('NEPTUNE_SSL_ENABLED', 'true');
        sourceComponent.addEnvironment('NEPTUNE_SSL_MODE', 'require');
        // Configure audit logging for compliance
        if (targetComponent.enableCloudwatchLogsExports) {
            sourceComponent.addEnvironment('NEPTUNE_AUDIT_LOGGING_ENABLED', 'true');
            sourceComponent.addEnvironment('NEPTUNE_CLOUDWATCH_LOGS', targetComponent.enableCloudwatchLogsExports.join(','));
        }
        // Configure performance insights for monitoring
        if (targetComponent.performanceInsightsEnabled) {
            sourceComponent.addEnvironment('NEPTUNE_PERFORMANCE_INSIGHTS_ENABLED', 'true');
        }
    }
}
//# sourceMappingURL=neptune-binder-strategy.js.map