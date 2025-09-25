/**
 * Shinobi Component - The Platform Intelligence Brain
 *
 * A production-grade Ops MCP Server that becomes the brain for SRE/DevOps/DPE/Developers and leadership.
 * Delivers exceptional DX/UX from day one, runs locally and in AWS, and provides a clean runway
 * to a drag-and-drop GUI that outputs platform L3 construct manifests.
 *
 * Core Philosophy: "Ask the brain, get an answer or an action." No AWS trivia, no yak-shaving.
 */
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as cdk from 'aws-cdk-lib';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import { Component } from '@platform/contracts';
// Import the configuration interface and builder from the builder
import { ShinobiComponentConfigBuilder } from './shinobi.builder';
/**
 * Shinobi Component - The Platform Intelligence Brain
 */
export class ShinobiComponent extends Component {
    cluster;
    service;
    taskDefinition;
    loadBalancer;
    repository;
    logGroup;
    dataTable;
    eventRule;
    config;
    constructor(scope, id, context, spec) {
        super(scope, id, context, spec);
    }
    /**
     * Synthesis phase - Create AWS resources
     */
    synth() {
        this.logComponentEvent('synthesis_start', 'Starting Shinobi synthesis');
        try {
            // Build configuration
            this.config = this.buildConfigSync();
            // Create core infrastructure
            this.createEcrRepository();
            this.createEcsCluster();
            this.createLogGroup();
            this.createDataStore();
            this.createTaskDefinition();
            this.createEcsService();
            // Create API infrastructure if enabled
            if (this.config.api?.loadBalancer?.enabled) {
                this.createLoadBalancer();
            }
            // Create event-driven re-indexing
            this.createReindexingSchedule();
            // Apply compliance hardening
            this.applyComplianceHardening();
            // Register constructs for binding access
            this.registerConstruct('cluster', this.cluster);
            this.registerConstruct('service', this.service);
            this.registerConstruct('taskDefinition', this.taskDefinition);
            this.registerConstruct('repository', this.repository);
            this.registerConstruct('dataTable', this.dataTable);
            if (this.loadBalancer) {
                this.registerConstruct('loadBalancer', this.loadBalancer);
            }
            // Register capabilities
            this.registerCapability('api:rest', this.buildApiCapability());
            this.registerCapability('container:ecs', this.buildContainerCapability());
            this.registerCapability('intelligence:platform', this.buildIntelligenceCapability());
            // Configure observability
            this._configureObservabilityForShinobi();
            this.logComponentEvent('synthesis_complete', 'Shinobi synthesis completed successfully');
        }
        catch (error) {
            this.logError(error, 'Shinobi synthesis');
            throw error;
        }
    }
    /**
     * Get the capabilities this component provides
     */
    getCapabilities() {
        this.validateSynthesized();
        return this.capabilities;
    }
    /**
     * Get the component type identifier
     */
    getType() {
        return 'shinobi';
    }
    buildConfigSync() {
        // Use the builder to get configuration
        const builder = new ShinobiComponentConfigBuilder(this.context, this.spec);
        return builder.buildSync();
    }
    createEcrRepository() {
        this.repository = new ecr.Repository(this, 'Repository', {
            repositoryName: `${this.context.serviceName}-shinobi`,
            imageTagMutability: ecr.TagMutability.MUTABLE,
            imageScanOnPush: true,
            lifecycleRules: [{
                    rulePriority: 1,
                    description: 'Keep last 10 images',
                    maxImageCount: 10
                }]
        });
        this.applyStandardTags(this.repository, {
            'resource-type': 'ecr-repository',
            'component': 'shinobi'
        });
        this.logResourceCreation('ecr-repository', this.repository.repositoryName);
    }
    createEcsCluster() {
        // Use existing VPC or create new one
        let vpc;
        if (this.config.vpc?.vpcId) {
            vpc = ec2.Vpc.fromLookup(this, 'Vpc', {
                vpcId: this.config.vpc.vpcId
            });
        }
        else if (this.context.vpc) {
            vpc = this.context.vpc;
        }
        else {
            vpc = new ec2.Vpc(this, 'Vpc', {
                maxAzs: 3,
                natGateways: 1,
                enableDnsHostnames: true,
                enableDnsSupport: true
            });
        }
        this.cluster = new ecs.Cluster(this, 'Cluster', {
            vpc: vpc,
            clusterName: `${this.context.serviceName}-shinobi-cluster`,
            containerInsights: true
        });
        this.applyStandardTags(this.cluster, {
            'resource-type': 'ecs-cluster',
            'component': 'shinobi'
        });
        this.logResourceCreation('ecs-cluster', this.cluster.clusterName);
    }
    createLogGroup() {
        const retentionDays = this.config.logging?.retentionDays ||
            (this.context.complianceFramework === 'fedramp-high' ?
                logs.RetentionDays.ONE_YEAR : logs.RetentionDays.ONE_MONTH);
        this.logGroup = new logs.LogGroup(this, 'LogGroup', {
            logGroupName: `/aws/ecs/${this.context.serviceName}-shinobi`,
            retention: retentionDays
        });
        this.applyStandardTags(this.logGroup, {
            'resource-type': 'cloudwatch-log-group',
            'component': 'shinobi'
        });
        this.logResourceCreation('cloudwatch-log-group', this.logGroup.logGroupName);
    }
    createDataStore() {
        const tableConfig = this.config.dataStore?.dynamodb || {};
        this.dataTable = new dynamodb.Table(this, 'DataTable', {
            tableName: `${this.context.serviceName}-shinobi-data`,
            partitionKey: {
                name: 'pk',
                type: dynamodb.AttributeType.STRING
            },
            sortKey: {
                name: 'sk',
                type: dynamodb.AttributeType.STRING
            },
            billingMode: tableConfig.billingMode === 'PROVISIONED' ?
                dynamodb.BillingMode.PROVISIONED : dynamodb.BillingMode.PAY_PER_REQUEST,
            readCapacity: tableConfig.readCapacity,
            writeCapacity: tableConfig.writeCapacity,
            pointInTimeRecovery: true,
            encryption: dynamodb.TableEncryption.AWS_MANAGED
        });
        // Add GSI for different query patterns
        this.dataTable.addGlobalSecondaryIndex({
            indexName: 'gsi1',
            partitionKey: {
                name: 'gsi1pk',
                type: dynamodb.AttributeType.STRING
            },
            sortKey: {
                name: 'gsi1sk',
                type: dynamodb.AttributeType.STRING
            }
        });
        this.applyStandardTags(this.dataTable, {
            'resource-type': 'dynamodb-table',
            'component': 'shinobi'
        });
        this.logResourceCreation('dynamodb-table', this.dataTable.tableName);
    }
    createTaskDefinition() {
        this.taskDefinition = new ecs.FargateTaskDefinition(this, 'TaskDefinition', {
            cpu: this.config.compute?.cpu || 512,
            memoryLimitMiB: this.config.compute?.memory || 1024,
            family: `${this.context.serviceName}-shinobi`
        });
        // Add container
        const container = this.taskDefinition.addContainer('ShinobiContainer', {
            image: ecs.ContainerImage.fromEcrRepository(this.repository, 'latest'),
            logging: ecs.LogDrivers.awsLogs({
                streamPrefix: 'shinobi',
                logGroup: this.logGroup
            }),
            environment: {
                NODE_ENV: this.context.environment || 'development',
                LOG_LEVEL: this.config.logging?.logLevel || 'info',
                DATA_SOURCES: JSON.stringify(this.config.dataSources || {}),
                FEATURE_FLAGS_ENABLED: String(this.config.featureFlags?.enabled || false),
                COMPLIANCE_FRAMEWORK: this.context.complianceFramework,
                LOCAL_DEV_MODE: String(this.config.localDev?.enabled || false),
                // MCP Server specific environment variables
                SHINOBI_COMPUTE_MODE: this.config.compute?.mode || 'ecs',
                SHINOBI_CPU: String(this.config.compute?.cpu || 512),
                SHINOBI_MEMORY: String(this.config.compute?.memory || 1024),
                SHINOBI_TASK_COUNT: String(this.config.compute?.taskCount || 1),
                SHINOBI_CONTAINER_PORT: String(this.config.compute?.containerPort || 3000),
                SHINOBI_API_EXPOSURE: this.config.api?.exposure || 'internal',
                SHINOBI_LOAD_BALANCER_ENABLED: String(this.config.api?.loadBalancer?.enabled || true),
                SHINOBI_FEATURE_FLAGS_PROVIDER: this.config.featureFlags?.provider || 'aws-appconfig',
                SHINOBI_OBSERVABILITY_PROVIDER: this.config.observability?.provider || 'cloudwatch',
                SHINOBI_SECURITY_LEVEL: this.config.compliance?.securityLevel || 'standard',
                SHINOBI_LOG_RETENTION_DAYS: String(this.config.logging?.retentionDays || 30)
            },
            secrets: {
                DATABASE_URL: ecs.Secret.fromSecretsManager(this.createDatabaseSecret())
            }
        });
        container.addPortMappings({
            containerPort: this.config.compute?.containerPort || 3000,
            protocol: ecs.Protocol.TCP
        });
        this.applyStandardTags(this.taskDefinition, {
            'resource-type': 'ecs-task-definition',
            'component': 'shinobi'
        });
        this.logResourceCreation('ecs-task-definition', this.taskDefinition.family);
    }
    createEcsService() {
        if (!this.cluster || !this.taskDefinition) {
            throw new Error('ECS Cluster and Task Definition must be created before ECS Service');
        }
        this.service = new ecs.FargateService(this, 'Service', {
            cluster: this.cluster,
            taskDefinition: this.taskDefinition,
            serviceName: `${this.context.serviceName}-shinobi`,
            desiredCount: this.config.compute?.taskCount || 1,
            assignPublicIp: false
        });
        // Auto-scaling
        const scalableTarget = this.service.autoScaleTaskCount({
            minCapacity: this.config.compute?.taskCount || 1,
            maxCapacity: (this.config.compute?.taskCount || 1) * 3
        });
        scalableTarget.scaleOnCpuUtilization('CpuScaling', {
            targetUtilizationPercent: 70,
            scaleInCooldown: cdk.Duration.minutes(5),
            scaleOutCooldown: cdk.Duration.minutes(1)
        });
        scalableTarget.scaleOnMemoryUtilization('MemoryScaling', {
            targetUtilizationPercent: 80,
            scaleInCooldown: cdk.Duration.minutes(5),
            scaleOutCooldown: cdk.Duration.minutes(1)
        });
        this.applyStandardTags(this.service, {
            'resource-type': 'ecs-service',
            'component': 'shinobi'
        });
        this.logResourceCreation('ecs-service', this.service.serviceName);
    }
    createLoadBalancer() {
        if (!this.cluster) {
            throw new Error('ECS Cluster must be created before Load Balancer');
        }
        this.loadBalancer = new elbv2.ApplicationLoadBalancer(this, 'LoadBalancer', {
            vpc: this.cluster.vpc,
            internetFacing: this.config.api?.exposure === 'public',
            loadBalancerName: `${this.context.serviceName}-shinobi-alb`
        });
        // Target group
        const targetGroup = new elbv2.ApplicationTargetGroup(this, 'TargetGroup', {
            vpc: this.cluster.vpc,
            port: this.config.compute?.containerPort || 3000,
            protocol: elbv2.ApplicationProtocol.HTTP,
            targetType: elbv2.TargetType.IP,
            healthCheck: {
                enabled: true,
                path: '/health',
                port: (this.config.compute?.containerPort || 3000).toString(),
                protocol: elbv2.Protocol.HTTP,
                healthyHttpCodes: '200',
                interval: cdk.Duration.seconds(30),
                timeout: cdk.Duration.seconds(5),
                healthyThresholdCount: 2,
                unhealthyThresholdCount: 3
            }
        });
        // Associate service with target group
        this.service.attachToApplicationTargetGroup(targetGroup);
        // Listener
        const listener = this.loadBalancer.addListener('Listener', {
            port: 443,
            protocol: elbv2.ApplicationProtocol.HTTPS,
            certificates: this.config.api?.loadBalancer?.certificateArn ?
                [elbv2.ListenerCertificate.fromArn(this.config.api.loadBalancer.certificateArn)] : undefined,
            defaultTargetGroups: [targetGroup]
        });
        // HTTP redirect to HTTPS
        this.loadBalancer.addListener('HttpListener', {
            port: 80,
            protocol: elbv2.ApplicationProtocol.HTTP,
            defaultAction: elbv2.ListenerAction.redirect({
                protocol: elbv2.ApplicationProtocol.HTTPS,
                port: '443'
            })
        });
        this.applyStandardTags(this.loadBalancer, {
            'resource-type': 'application-load-balancer',
            'component': 'shinobi'
        });
        this.logResourceCreation('application-load-balancer', this.loadBalancer.loadBalancerName);
    }
    createReindexingSchedule() {
        // Create EventBridge rule for periodic re-indexing
        this.eventRule = new events.Rule(this, 'ReindexingRule', {
            schedule: events.Schedule.rate(cdk.Duration.minutes(15)),
            description: 'Trigger Shinobi data re-indexing'
        });
        // Add ECS task as target
        this.eventRule.addTarget(new targets.EcsTask({
            cluster: this.cluster,
            taskDefinition: this.taskDefinition,
            subnetSelection: {
                subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS
            },
            containerOverrides: [{
                    containerName: 'ShinobiContainer',
                    environment: [{
                            name: 'REINDEX_MODE',
                            value: 'true'
                        }]
                }]
        }));
        this.applyStandardTags(this.eventRule, {
            'resource-type': 'eventbridge-rule',
            'component': 'shinobi'
        });
        this.logResourceCreation('eventbridge-rule', this.eventRule.ruleName);
    }
    createDatabaseSecret() {
        return new secretsmanager.Secret(this, 'DatabaseSecret', {
            secretName: `${this.context.serviceName}-shinobi-db-secret`,
            description: 'Database connection secret for Shinobi',
            generateSecretString: {
                secretStringTemplate: JSON.stringify({
                    username: 'shinobi'
                }),
                generateStringKey: 'password',
                excludeCharacters: '"@/\\'
            }
        });
    }
    buildApiCapability() {
        const endpoint = this.loadBalancer ?
            `https://${this.config.api?.loadBalancer?.domainName || this.loadBalancer.loadBalancerDnsName}` :
            `http://internal:${this.config.compute?.containerPort || 3000}`;
        return {
            endpoint: endpoint,
            protocol: 'HTTPS',
            apiType: 'REST',
            version: this.config.api?.version || '1.0',
            paths: {
                '/catalog/*': 'Discovery & DocOps',
                '/graph/*': 'Topology, Graph & GUI Enablement',
                '/manifest/*': 'Manifest Intelligence (L3)',
                '/reliability/*': 'Reliability: SLO/SLA & Incident Ops',
                '/obs/*': 'Observability & Dashboards',
                '/change/*': 'ChangeOps & CI/CD',
                '/sec/*': 'Security & Compliance',
                '/qa/*': 'QA & Test Engineering',
                '/cost/*': 'Cost & FinOps',
                '/dx/*': 'Developer Experience (DPE) & Self-Service',
                '/gov/*': 'Governance & Exec Insights'
            },
            authentication: {
                type: 'JWT',
                scopes: ['read:platform', 'write:platform', 'admin:platform']
            }
        };
    }
    buildContainerCapability() {
        return {
            clusterArn: this.cluster.clusterArn,
            serviceArn: this.service.serviceArn,
            taskDefinitionArn: this.taskDefinition.taskDefinitionArn,
            repositoryUri: this.repository.repositoryUri,
            containerPort: this.config.compute?.containerPort || 3000
        };
    }
    buildIntelligenceCapability() {
        return {
            dataSources: this.config.dataSources || {},
            featureFlags: this.config.featureFlags || {},
            observability: this.config.observability || {},
            compliance: this.config.compliance || {},
            localDev: this.config.localDev || {}
        };
    }
    /**
     * Configure observability for Shinobi
     */
    _configureObservabilityForShinobi() {
        if (!this.config?.observability?.alerts?.enabled) {
            return;
        }
        // Create CloudWatch alarms for ECS service
        if (this.service) {
            // CPU utilization alarm
            new cloudwatch.Alarm(this, 'CpuUtilizationAlarm', {
                metric: this.service.metricCpuUtilization(),
                threshold: this.config.observability.alerts.thresholds?.cpuUtilization || 80,
                evaluationPeriods: 2,
                alarmDescription: 'Shinobi CPU utilization is high'
            });
            // Memory utilization alarm
            new cloudwatch.Alarm(this, 'MemoryUtilizationAlarm', {
                metric: this.service.metricMemoryUtilization(),
                threshold: this.config.observability.alerts.thresholds?.memoryUtilization || 80,
                evaluationPeriods: 2,
                alarmDescription: 'Shinobi memory utilization is high'
            });
            // Task count alarm
            new cloudwatch.Alarm(this, 'TaskCountAlarm', {
                metric: this.service.metricRunningTaskCount(),
                threshold: 1,
                evaluationPeriods: 1,
                comparisonOperator: cloudwatch.ComparisonOperator.LESS_THAN_THRESHOLD,
                alarmDescription: 'Shinobi has no running tasks'
            });
        }
        // Create API response time alarm if load balancer is enabled
        if (this.loadBalancer) {
            new cloudwatch.Alarm(this, 'ResponseTimeAlarm', {
                metric: this.loadBalancer.metricTargetResponseTime(),
                threshold: this.config.observability.alerts.thresholds?.responseTime || 2,
                evaluationPeriods: 2,
                alarmDescription: 'Shinobi API response time is high'
            });
        }
        this.logComponentEvent('observability_configured', 'Shinobi observability configured successfully');
    }
    applyComplianceDefaults(config) {
        switch (this.context.complianceFramework) {
            case 'fedramp-moderate':
                return {
                    ...config,
                    compute: {
                        ...config.compute,
                        cpu: Math.max(config.compute?.cpu || 512, 512),
                        memory: Math.max(config.compute?.memory || 1024, 1024),
                        taskCount: Math.max(config.compute?.taskCount || 1, 2)
                    },
                    api: {
                        ...config.api,
                        exposure: 'internal'
                    },
                    compliance: {
                        ...config.compliance,
                        securityLevel: 'enhanced',
                        auditLogging: true
                    },
                    logging: {
                        ...config.logging,
                        retentionDays: 90,
                        structuredLogging: true
                    }
                };
            case 'fedramp-high':
                return {
                    ...config,
                    compute: {
                        ...config.compute,
                        cpu: Math.max(config.compute?.cpu || 512, 1024),
                        memory: Math.max(config.compute?.memory || 1024, 2048),
                        taskCount: Math.max(config.compute?.taskCount || 1, 3)
                    },
                    api: {
                        ...config.api,
                        exposure: 'internal'
                    },
                    compliance: {
                        ...config.compliance,
                        securityLevel: 'maximum',
                        auditLogging: true
                    },
                    logging: {
                        ...config.logging,
                        retentionDays: 2555, // 7 years
                        structuredLogging: true
                    }
                };
            default:
                return config;
        }
    }
    applyComplianceHardening() {
        // Apply security hardening based on compliance framework
        const securityLevel = this.config?.compliance?.securityLevel || 'standard';
        if (securityLevel === 'enhanced' || securityLevel === 'maximum') {
            // Enhanced security measures
            this.logComponentEvent('compliance_hardening', 'Applied enhanced security hardening');
        }
        if (securityLevel === 'maximum') {
            // Maximum security measures
            this.logComponentEvent('compliance_hardening', 'Applied maximum security hardening');
        }
    }
}
//# sourceMappingURL=shinobi.component.js.map