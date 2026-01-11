/**
 * ElastiCache Redis Component
 *
 * Synthesizes an ElastiCache replication group using the platform configuration
 * precedence chain. Security, logging, and monitoring behaviour is completely
 * configuration-driven via the ElastiCacheRedisComponentConfigBuilder.
 */

import * as elasticache from 'aws-cdk-lib/aws-elasticache';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as cdk from 'aws-cdk-lib';
import * as path from 'path';
import { Construct } from 'constructs';
import {
  BaseComponent,
  ComponentCapabilities,
  ComponentContext,
  ComponentSpec,
  applySecurityGroupTags,
  resolveVpcForSubnetGroups
} from '@shinobi/core';
import {
  ElastiCacheRedisComponentConfigBuilder,
  ElastiCacheRedisConfig,
  RedisAlarmThresholdConfig,
  RedisLogDeliveryConfig
} from './elasticache-redis.builder.js';

interface CreatedAlarm {
  id: string;
  alarm: cloudwatch.Alarm;
}

export class ElastiCacheRedisComponent extends BaseComponent {
  private replicationGroup?: elasticache.CfnReplicationGroup;
  private subnetGroup?: elasticache.CfnSubnetGroup;
  private securityGroup?: ec2.SecurityGroup;
  private parameterGroup?: elasticache.CfnParameterGroup;
  private authTokenSecret?: secretsmanager.ISecret;
  private vpc?: ec2.IVpc;
  private config?: ElastiCacheRedisConfig;
  private readonly createdAlarms: CreatedAlarm[] = [];
  private loggingKmsKey?: kms.Key;

  constructor(scope: Construct, id: string, context: ComponentContext, spec: ComponentSpec) {
    super(scope, id, context, spec);
  }

  public synth(): void {
    this.logComponentEvent('synthesis_start', 'Starting ElastiCache Redis synthesis');

    try {
      
      const builder = new ElastiCacheRedisComponentConfigBuilder(this.context, this.spec);
      this.config = builder.buildSync();

      this.logComponentEvent('config_resolved', 'ElastiCache Redis configuration resolved', {
        engineVersion: this.config.engineVersion,
        nodeType: this.config.nodeType,
        encryptionAtRest: this.config.encryption.atRest,
        encryptionInTransit: this.config.encryption.inTransit,
        monitoringEnabled: this.config.monitoring.enabled
      });

      if (this.config.monitoring.enabled === false) {
        throw new Error('Monitoring cannot be disabled for the ElastiCache Redis component.');
      }

      if (!this.config.encryption.atRest || !this.config.encryption.inTransit) {
        throw new Error('Encryption at rest and in transit must remain enabled for the ElastiCache Redis component.');
      }

      if (!this.config.encryption.authToken.enabled) {
        throw new Error('Redis AUTH token enforcement must remain enabled. Provide encryption.authToken.secretArn for BYO secrets.');
      }

      this.resolveVpc();
      this.createParameterGroupIfNeeded();
      this.createSubnetGroup();
      this.createSecurityGroupIfNeeded();
      this.configureAuthToken();
      this.createReplicationGroup();
      this.configureMonitoring();

      this.registerConstruct('main', this.replicationGroup!);
      this.registerConstruct('replicationGroup', this.replicationGroup!);

      if (this.subnetGroup) {
        this.registerConstruct('subnetGroup', this.subnetGroup);
      }

      if (this.securityGroup) {
        this.registerConstruct('securityGroup', this.securityGroup);
      }

      if (this.parameterGroup) {
        this.registerConstruct('parameterGroup', this.parameterGroup);
      }

      if (this.authTokenSecret instanceof secretsmanager.Secret) {
        this.registerConstruct('authToken', this.authTokenSecret);
      }

      this.createdAlarms.forEach(({ id, alarm }) => {
        this.registerConstruct(`alarm:${id}`, alarm);
      });

      // Register primary capability
      this.registerCapability('cache:redis', this.buildCapability());
      
      // Register endpoint sub-capability for future multi-output patterns
      this.registerCapability('cache:redis:endpoint', {
        primaryEndpoint: {
          address: this.replicationGroup!.attrPrimaryEndPointAddress,
          port: this.replicationGroup!.attrPrimaryEndPointPort
        },
        readerEndpoint: {
          address: this.replicationGroup!.attrReaderEndPointAddress,
          port: this.replicationGroup!.attrReaderEndPointPort
        }
      });

      this.logComponentEvent('synthesis_complete', 'ElastiCache Redis synthesis completed', {
        clusterName: this.getClusterName(),
        authTokenProvided: !!this.authTokenSecret,
        monitoringEnabled: this.config.monitoring.enabled
      });
    } catch (error) {
      this.logError(error as Error, 'elasticache-redis:synth', {
        componentName: this.spec.name
      });
      throw error;
    }
  }

  public getCapabilities(): ComponentCapabilities {
    this.validateSynthesized();
    return this.capabilities;
  }

  public getType(): string {
    return 'elasticache-redis';
  }

  private resolveVpc(): void {
    const componentName = this.spec.name;
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/31cd8a5c-c5a9-4c85-9dba-5f04dc91dc42',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'elasticache-redis.component.ts:166',message:'resolveVpc() entry - using platform VPC resolver',data:{componentName,configVpcId:this.config!.vpc.vpcId,configSubnetIds:this.config!.vpc.subnetIds,useDefaultVpc:this.config!.vpc.useDefaultVpc,hasContextVpc:!!this.context.vpc},timestamp:Date.now(),sessionId:'debug-session',runId:'run19',hypothesisId:'Q'})}).catch(()=>{});
    // #endregion
    
    try {
      // Use platform VPC resolver utility for consistent resolution across all components
      this.vpc = resolveVpcForSubnetGroups(this, 'Vpc', {
        vpcId: this.config!.vpc.vpcId,
        subnetIds: this.config!.vpc.subnetIds,
        availabilityZones: this.getDefaultAvailabilityZones(),
        region: this.context.region,
        vpcCidrBlock: this.config!.vpc.vpcCidrBlock, // Required when using fromVpcAttributes() with SecurityGroup
        useDefaultVpc: this.config!.vpc.useDefaultVpc ?? false,
        context: this.context,
        componentName: componentName
      });
      
      // #region agent log
      // Avoid accessing this.vpc.vpcId or this.vpc.constructor.name - may trigger CDK validation requiring vpcCidrBlock
      fetch('http://127.0.0.1:7242/ingest/31cd8a5c-c5a9-4c85-9dba-5f04dc91dc42',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'elasticache-redis.component.ts:175',message:'VPC resolved via platform resolver',data:{componentName,vpcId:this.config!.vpc.vpcId,vpcType:'ImportedVpc2 (fromVpcAttributes)',hasVpc:!!this.vpc},timestamp:Date.now(),sessionId:'debug-session',runId:'run19',hypothesisId:'Q'})}).catch(()=>{});
      // #endregion
    } catch (error) {
      this.logError(
        error as Error,
        'elasticache-redis:vpc-resolution',
        {
          guidance: 'Provide config.vpc.vpcId, inject context.vpc, or set config.vpc.useDefaultVpc to true.'
        }
      );
      throw error;
    }
  }

  private getDefaultAvailabilityZones(): string[] {
    const region = this.context.region ?? 'us-east-1';
    // Default to 3 AZs for most regions
    return [`${region}a`, `${region}b`, `${region}c`];
  }

  private createParameterGroupIfNeeded(): void {
    const parameters = this.config!.parameterGroup.parameters;
    if (!parameters || Object.keys(parameters).length === 0) {
      return;
    }

    this.parameterGroup = new elasticache.CfnParameterGroup(this, 'ParameterGroup', {
      cacheParameterGroupFamily: this.config!.parameterGroup.family,
      description: `Parameter group for ${this.getClusterName()}`,
      properties: parameters
    });

    // Use applyStandardTags consistently (preferred method)
    this.applyStandardTags(this.parameterGroup, {
      'resource-type': 'parameter-group',
      family: this.config!.parameterGroup.family
    });

    this.logResourceCreation('elasticache-parameter-group', this.parameterGroup.ref);
  }

  private createSubnetGroup(): void {
    const componentName = this.spec.name;
    const clusterName = this.getClusterName();
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/31cd8a5c-c5a9-4c85-9dba-5f04dc91dc42',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'elasticache-redis.component.ts:239',message:'createSubnetGroup() entry',data:{componentName,clusterName,configVpcId:this.config!.vpc.vpcId,configSubnetIds:this.config!.vpc.subnetIds,configSubnetIdsLength:this.config!.vpc.subnetIds.length,useDefaultVpc:this.config!.vpc.useDefaultVpc,hasVpc:!!this.vpc,vpcType:this.vpc?.constructor?.name},timestamp:Date.now(),sessionId:'debug-session',runId:'run19',hypothesisId:'Q'})}).catch(()=>{});
    // #endregion
    
    let providedSubnetIds: string[];
    
    if (this.config!.vpc.subnetIds.length > 0) {
      // Priority 1: Use explicit subnet IDs from config
      providedSubnetIds = this.config!.vpc.subnetIds;
      
      // #region agent log
      const manifestPath = (this.context as any).manifestPath || 'unknown';
      const manifestPathAbsolute = manifestPath !== 'unknown' ? path.resolve(manifestPath) : undefined;
      fetch('http://127.0.0.1:7242/ingest/31cd8a5c-c5a9-4c85-9dba-5f04dc91dc42',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'elasticache-redis.component.ts:250',message:'Subnet IDs source: config.vpc.subnetIds (explicit)',data:{componentName,subnetIds:providedSubnetIds,source:'config.vpc.subnetIds',subnetIdsLength:providedSubnetIds.length,manifestPath,manifestPathAbsolute,configSource:'service.yml component config',configPath:manifestPath},timestamp:Date.now(),sessionId:'debug-session',runId:'run19',hypothesisId:'Q'})}).catch(()=>{});
      // #endregion
    } else if (this.config!.vpc.useDefaultVpc && this.vpc) {
      // Priority 2: Default VPC - select private subnets from VPC
      // When using fromLookup() for default VPC, we can select subnets by type
      // because fromLookup() provides full VPC context (even though it runs after early validation)
      try {
        const selectedSubnets = this.vpc.selectSubnets({ subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS });
        providedSubnetIds = selectedSubnets.subnetIds;
        
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/31cd8a5c-c5a9-4c85-9dba-5f04dc91dc42',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'elasticache-redis.component.ts:258',message:'Subnet IDs source: default VPC private subnets (fromLookup)',data:{componentName,subnetIds:providedSubnetIds,source:'vpc.selectSubnets(PRIVATE_WITH_EGRESS)',subnetIdsLength:providedSubnetIds.length,vpcMethod:'fromLookup'},timestamp:Date.now(),sessionId:'debug-session',runId:'run19',hypothesisId:'Q'})}).catch(()=>{});
        // #endregion
        
        if (providedSubnetIds.length === 0) {
          // Fallback to public subnets if no private subnets found
          const publicSubnets = this.vpc.selectSubnets({ subnetType: ec2.SubnetType.PUBLIC });
          providedSubnetIds = publicSubnets.subnetIds;
          
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/31cd8a5c-c5a9-4c85-9dba-5f04dc91dc42',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'elasticache-redis.component.ts:265',message:'Subnet IDs source: default VPC public subnets (fallback)',data:{componentName,subnetIds:providedSubnetIds,source:'vpc.selectSubnets(PUBLIC)',subnetIdsLength:providedSubnetIds.length,reason:'no private subnets found'},timestamp:Date.now(),sessionId:'debug-session',runId:'run19',hypothesisId:'Q'})}).catch(()=>{});
          // #endregion
        }
      } catch (error) {
        // If subnet selection fails, fall back to public subnets
        const publicSubnets = this.vpc.selectSubnets({ subnetType: ec2.SubnetType.PUBLIC });
        providedSubnetIds = publicSubnets.subnetIds;
        
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/31cd8a5c-c5a9-4c85-9dba-5f04dc91dc42',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'elasticache-redis.component.ts:272',message:'Subnet IDs source: default VPC public subnets (error fallback)',data:{componentName,subnetIds:providedSubnetIds,source:'vpc.selectSubnets(PUBLIC)',subnetIdsLength:providedSubnetIds.length,error:error instanceof Error ? error.message : String(error)},timestamp:Date.now(),sessionId:'debug-session',runId:'run19',hypothesisId:'Q'})}).catch(()=>{});
        // #endregion
      }
    } else {
      // When using fromVpcAttributes() without explicit subnet IDs, we can't select subnets
      // because the VPC doesn't have subnet information. Subnet IDs must be provided explicitly.
      throw new Error(
        `ElastiCache Redis component '${this.spec.name}' requires explicit subnet IDs when using an explicit VPC ID. ` +
        'Please provide subnet IDs in config.vpc.subnetIds, or set config.vpc.useDefaultVpc to true to use the default VPC. ' +
        'To find subnet IDs: aws ec2 describe-subnets --filters "Name=vpc-id,Values=${vpcId}" --query "Subnets[*].SubnetId" --output text'
      );
    }

    // Set explicit subnet group name (like RDS pattern) to help CloudFormation early validation
    // CloudFormation can validate explicit names better than auto-generated tokens
    const explicitSubnetGroupName = this.config!.vpc.subnetGroupName ?? `${this.spec.name}-subnet-group`;
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/31cd8a5c-c5a9-4c85-9dba-5f04dc91dc42',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'elasticache-redis.component.ts:285',message:'Subnet group name strategy - using explicit name for early validation',data:{componentName,clusterName,subnetGroupName:explicitSubnetGroupName,strategy:'explicit name (like RDS pattern)'},timestamp:Date.now(),sessionId:'debug-session',runId:'run21',hypothesisId:'S'})}).catch(()=>{});
    // #endregion
    
    // Verify subnet IDs are literal strings (not tokens) for early validation
    // CloudFormation early validation requires literal strings to validate subnet IDs exist
    const subnetIdsAreTokens = providedSubnetIds.some(id => cdk.Token.isUnresolved(id));
    const subnetIdsTypes = providedSubnetIds.map(id => ({ 
      id, 
      type: typeof id, 
      isToken: cdk.Token.isUnresolved(id),
      isString: typeof id === 'string',
      startsWithSubnet: typeof id === 'string' && id.startsWith('subnet-')
    }));
    const vpcIdIsToken = cdk.Token.isUnresolved(this.config!.vpc.vpcId);
    
    // #region agent log
    // Avoid accessing this.vpc.constructor.name - may trigger CDK validation requiring vpcCidrBlock
    fetch('http://127.0.0.1:7242/ingest/31cd8a5c-c5a9-4c85-9dba-5f04dc91dc42',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'elasticache-redis.component.ts:295',message:'Creating CfnSubnetGroup - verifying subnet IDs and VPC ID are strings',data:{componentName,subnetGroupName:explicitSubnetGroupName || '(auto-generated)',subnetIds:providedSubnetIds,subnetIdsAreTokens,subnetIdsTypes,vpcId:this.config!.vpc.vpcId,vpcIdType:typeof this.config!.vpc.vpcId,vpcIdIsToken,vpcMethod:'ImportedVpc2 (fromVpcAttributes)'},timestamp:Date.now(),sessionId:'debug-session',runId:'run20',hypothesisId:'R'})}).catch(()=>{});
    // #endregion
    
    if (subnetIdsAreTokens) {
      throw new Error(
        `ElastiCache Redis component '${componentName}' subnet IDs must be literal strings, not CloudFormation tokens. ` +
        'This is required for CloudFormation early validation. Ensure subnet IDs come from config, not from VPC.selectSubnets() when using fromVpcAttributes().'
      );
    }
    
    if (vpcIdIsToken) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/31cd8a5c-c5a9-4c85-9dba-5f04dc91dc42',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'elasticache-redis.component.ts:305',message:'WARNING: VPC ID is a token - this may cause early validation issues',data:{componentName,vpcId:this.config!.vpc.vpcId},timestamp:Date.now(),sessionId:'debug-session',runId:'run20',hypothesisId:'R'})}).catch(()=>{});
      // #endregion
    }

    this.subnetGroup = new elasticache.CfnSubnetGroup(this, 'SubnetGroup', {
      cacheSubnetGroupName: explicitSubnetGroupName, // Always set explicit name (like RDS pattern)
      description: `Subnet group for ${clusterName}`,
      subnetIds: providedSubnetIds
    });
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/31cd8a5c-c5a9-4c85-9dba-5f04dc91dc42',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'elasticache-redis.component.ts:312',message:'CfnSubnetGroup created successfully',data:{componentName,subnetGroupLogicalId:this.subnetGroup.logicalId,subnetIdsCount:providedSubnetIds.length,subnetIdsAreAllStrings:providedSubnetIds.every(id => typeof id === 'string')},timestamp:Date.now(),sessionId:'debug-session',runId:'run20',hypothesisId:'R'})}).catch(()=>{});
    // #endregion

    this.applyStandardTags(this.subnetGroup, {
      'resource-type': 'subnet-group',
      'subnet-count': providedSubnetIds.length.toString()
    });

    // Use explicit name if provided, otherwise use logical ID (CloudFormation will auto-generate the name)
    const subnetGroupIdentifier = explicitSubnetGroupName || this.subnetGroup.node.id;
    this.logResourceCreation('elasticache-subnet-group', subnetGroupIdentifier);
  }

  private createSecurityGroupIfNeeded(): void {
    const security = this.config!.security;
    if (!security.create) {
      return;
    }

    // #region agent log
    // Avoid accessing this.vpc.constructor.name - may trigger CDK validation requiring vpcCidrBlock
    fetch('http://127.0.0.1:7242/ingest/31cd8a5c-c5a9-4c85-9dba-5f04dc91dc42',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'elasticache-redis.component.ts:261',message:'createSecurityGroupIfNeeded entry',data:{hasVpc:!!this.vpc,vpcId:this.config!.vpc.vpcId,vpcType:'ImportedVpc2 (fromVpcAttributes)',vpcCidrBlockProvided:!!this.config!.vpc.vpcCidrBlock},timestamp:Date.now(),sessionId:'debug-session',runId:'run4',hypothesisId:'D'})}).catch(()=>{});
    // #endregion

    this.securityGroup = new ec2.SecurityGroup(this, 'SecurityGroup', {
      vpc: this.vpc!,
      description: `Security group for ${this.getClusterName()}`,
      allowAllOutbound: false
    });

    const port = this.config!.port;
    security.allowedCidrs.forEach(cidr => {
      this.securityGroup!.addIngressRule(ec2.Peer.ipv4(cidr), ec2.Port.tcp(port), `Redis access from ${cidr}`);
    });

    this.applyStandardTags(this.securityGroup, {
      'resource-type': 'security-group',
      'purpose': 'redis-access'
    });

    // Apply security-group-specific tags (SG-009)
    applySecurityGroupTags(this.securityGroup, {
      ingressPolicy: 'manual',
      tier: 'data'
    });

    this.logResourceCreation('security-group', this.securityGroup.securityGroupId);
  }

  private configureAuthToken(): void {
    const authToken = this.config!.encryption.authToken;
    if (!authToken.enabled) {
      return;
    }

    /**
     * We avoid unsafeUnwrap() to prevent secrets from being exposed during CDK synthesis.
     * Instead, we pass SecretValue directly to ElastiCache, which resolves it at deployment time.
     */
    // Map config-driven removal policy to CDK RemovalPolicy enum
    const removalPolicy = authToken.removalPolicy === 'retain' 
      ? cdk.RemovalPolicy.RETAIN 
      : cdk.RemovalPolicy.DESTROY;

    if (authToken.secretArn) {
      this.authTokenSecret = secretsmanager.Secret.fromSecretCompleteArn(this, 'ImportedAuthToken', authToken.secretArn);
      // Set removal policy from config (compliance framework defaults handled in builder)
      if (this.authTokenSecret instanceof secretsmanager.Secret) {
        this.authTokenSecret.applyRemovalPolicy(removalPolicy);
      }
      return;
    }

    const secret = new secretsmanager.Secret(this, 'AuthToken', {
      description: authToken.description ?? `Redis AUTH token for ${this.getClusterName()}`,
      generateSecretString: {
        excludeCharacters: '"@/\\',
        passwordLength: 32,
        excludePunctuation: true
      },
      removalPolicy // Use config-driven removal policy (compliance framework defaults handled in builder)
    });

    this.applyStandardTags(secret, {
      'resource-type': 'secret',
      'purpose': 'redis-auth'
    });

    this.authTokenSecret = secret;

    this.logResourceCreation('secret', secret.secretName);
  }

  private createReplicationGroup(): void {
    const logDeliveryConfigs = this.buildLogDeliveryConfigurations();

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/31cd8a5c-c5a9-4c85-9dba-5f04dc91dc42',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'elasticache-redis.component.ts:315',message:'Passing windows to CloudFormation',data:{snapshotWindow:this.config!.backup.enabled ? this.config!.backup.window : undefined,preferredMaintenanceWindow:this.config!.maintenance.window,backupEnabled:this.config!.backup.enabled,backupWindow:this.config!.backup.window},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion

    const subnetGroupName = this.subnetGroup!.cacheSubnetGroupName;
    const securityGroupIds = this.composeSecurityGroupIds();
    
    // Check if subnet group name is a token (unresolved) or literal string
    const subnetGroupNameIsToken = cdk.Token.isUnresolved(subnetGroupName);
    const subnetGroupNameValue = subnetGroupNameIsToken ? '(token)' : subnetGroupName;
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/31cd8a5c-c5a9-4c85-9dba-5f04dc91dc42',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'elasticache-redis.component.ts:381',message:'Creating ReplicationGroup',data:{componentName:this.spec.name,subnetGroupName:subnetGroupNameValue,subnetGroupNameIsToken,subnetGroupNameType:typeof subnetGroupName,securityGroupIds,vpcId:this.config!.vpc.vpcId,subnetIds:this.config!.vpc.subnetIds,subnetGroupLogicalId:this.subnetGroup!.node.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run13',hypothesisId:'M'})}).catch(()=>{});
    // #endregion

    this.replicationGroup = new elasticache.CfnReplicationGroup(this, 'ReplicationGroup', {
      replicationGroupId: this.getClusterName(),
      replicationGroupDescription: this.config!.description ?? `Redis cluster for ${this.context.serviceName}`,
      engine: 'redis',
      engineVersion: this.config!.engineVersion,
      cacheNodeType: this.config!.nodeType,
      numCacheClusters: this.config!.numCacheNodes,
      port: this.config!.port,
      cacheSubnetGroupName: subnetGroupName,
      securityGroupIds: securityGroupIds,
      cacheParameterGroupName: this.parameterGroup?.ref,
      atRestEncryptionEnabled: this.config!.encryption.atRest,
      transitEncryptionEnabled: this.config!.encryption.inTransit,
      // Use secretValue directly when available (CDK v2.120+ supports SecretValue for authToken)
      // For Secret instances, pass secretValue directly to avoid unsafeUnwrap()
      // For imported secrets, use SecretValue.secretsManager
      // Note: CDK will resolve SecretValue to string at deployment time
      authToken: this.authTokenSecret
        ? (this.authTokenSecret instanceof secretsmanager.Secret
            ? this.authTokenSecret.secretValue.toString()
            : cdk.SecretValue.secretsManager(this.authTokenSecret.secretArn).toString())
        : undefined,
      snapshotRetentionLimit: this.config!.backup.enabled ? this.config!.backup.retentionDays : 0,
      snapshotWindow: this.config!.backup.enabled ? this.config!.backup.window : undefined,
      preferredMaintenanceWindow: this.config!.maintenance.window,
      notificationTopicArn: this.config!.maintenance.notificationTopicArn,
      multiAzEnabled: this.config!.multiAz.enabled,
      automaticFailoverEnabled: this.config!.multiAz.automaticFailover,
      logDeliveryConfigurations: logDeliveryConfigs.length ? logDeliveryConfigs : undefined
    });

    // Explicitly add dependency on subnet group to ensure it's created first
    if (this.subnetGroup) {
      this.replicationGroup.addDependency(this.subnetGroup);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/31cd8a5c-c5a9-4c85-9dba-5f04dc91dc42',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'elasticache-redis.component.ts:420',message:'Added dependency: ReplicationGroup depends on SubnetGroup',data:{componentName:this.spec.name,subnetGroupLogicalId:this.subnetGroup.node.id,replicationGroupLogicalId:this.replicationGroup.node.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run13',hypothesisId:'M'})}).catch(()=>{});
      // #endregion
    }

    this.applyStandardTags(this.replicationGroup, {
      'resource-type': 'redis-cluster',
      'engine-version': this.config!.engineVersion,
      'node-type': this.config!.nodeType,
      ...this.config!.tags
    });

    this.logResourceCreation('elasticache-replication-group', this.getClusterName());
  }

  private configureMonitoring(): void {
    if (!this.config!.monitoring.enabled) {
      return;
    }

    const alarms = this.config!.monitoring.alarms;
    this.maybeCreateAlarm('cpuUtilization', alarms.cpuUtilization, {
      metricName: 'CPUUtilization',
      namespace: 'AWS/ElastiCache',
      statistic: 'Average'
    });
    this.maybeCreateAlarm('cacheMisses', alarms.cacheMisses, {
      metricName: 'CacheMisses',
      namespace: 'AWS/ElastiCache',
      statistic: 'Sum'
    });
    this.maybeCreateAlarm('evictions', alarms.evictions, {
      metricName: 'Evictions',
      namespace: 'AWS/ElastiCache',
      statistic: 'Sum'
    });
    this.maybeCreateAlarm('connections', alarms.connections, {
      metricName: 'CurrConnections',
      namespace: 'AWS/ElastiCache',
      statistic: 'Average'
    });

    this.logComponentEvent('observability_configured', 'Monitoring configured for ElastiCache Redis', {
      clusterName: this.getClusterName(),
      alarmsCreated: this.createdAlarms.length
    });
  }

  private maybeCreateAlarm(id: string, config: RedisAlarmThresholdConfig, metricProps: { metricName: string; namespace: string; statistic: string; }): void {
    if (!config.enabled) {
      return;
    }

    // Use ReplicationGroupId dimension if available (cluster-level metrics)
    // For primary node-specific metrics, use CacheClusterId
    // ElastiCache metrics support both dimensions - prefer ReplicationGroupId for cluster-level
    const dimensionsMap: Record<string, string> = {
      ReplicationGroupId: this.getClusterName()
    };

    const alarm = new cloudwatch.Alarm(this, `${this.toPascal(id)}Alarm`, {
      alarmName: `${this.context.serviceName}-${this.spec.name}-${id}`,
      alarmDescription: `Alarm for Redis ${id}`,
      metric: new cloudwatch.Metric({
        namespace: metricProps.namespace,
        metricName: metricProps.metricName,
        statistic: metricProps.statistic,
        period: cdk.Duration.minutes(config.periodMinutes),
        dimensionsMap
      }),
      threshold: config.threshold,
      evaluationPeriods: config.evaluationPeriods,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING
    });

    this.applyStandardTags(alarm, {
      'alarm-type': id,
      threshold: config.threshold.toString()
    });

    this.createdAlarms.push({ id, alarm });
  }

  private buildLogDeliveryConfigurations(): elasticache.CfnReplicationGroup.LogDeliveryConfigurationRequestProperty[] {
    const enabledConfigs = this.config!.monitoring.logDelivery.filter(entry => entry.enabled);
    
    // Validate for conflicting log destination types (same logType with different destinationTypes)
    const logTypeMap = new Map<string, string>();
    for (const entry of enabledConfigs) {
      const existingType = logTypeMap.get(entry.logType);
      if (existingType && existingType !== entry.destinationType) {
        throw new Error(
          `Conflicting log destination types for ${entry.logType}: ` +
          `found both '${existingType}' and '${entry.destinationType}'. ` +
          `Each log type can only have one destination type.`
        );
      }
      logTypeMap.set(entry.logType, entry.destinationType);
    }
    
    return enabledConfigs.map((entry: RedisLogDeliveryConfig, index) => {
      // Validate that destination exists or is creatable
      if (entry.destinationType === 'cloudwatch-logs') {
        const logGroup = this.ensureManagedLogGroup(entry, index);
        if (!logGroup && !entry.destinationName.startsWith('/aws/')) {
          // If not managed and doesn't start with /aws/, validate it exists or can be created
          this.logComponentEvent('log_delivery_validation', 'Validating CloudWatch Logs destination', {
            destinationName: entry.destinationName,
            logType: entry.logType,
            note: 'Destination must exist or be managed by this component'
          });
        }
        if (logGroup) {
          this.registerConstruct(`log-group:${entry.logType}:${index}`, logGroup);
        }
        return {
          logType: entry.logType,
          destinationType: entry.destinationType,
          destinationDetails: {
            cloudWatchLogsDetails: {
              logGroup: entry.destinationName
            }
          },
          logFormat: entry.logFormat
        };
      } else {
        // For Kinesis Firehose, validate that the delivery stream exists
        // Note: We can't validate existence at synth time, but we log a warning
        if (!entry.destinationName) {
          throw new Error(
            `ElastiCache Redis log delivery configuration for ${entry.logType} requires a destinationName ` +
            `when destinationType is ${entry.destinationType}`
          );
        }
        this.logComponentEvent('log_delivery_validation', 'Kinesis Firehose destination configured', {
          destinationName: entry.destinationName,
          logType: entry.logType,
          note: 'Ensure the Kinesis Firehose delivery stream exists before deployment'
        });
        return {
          logType: entry.logType,
          destinationType: entry.destinationType,
          destinationDetails: {
            kinesisFirehoseDetails: {
              deliveryStream: entry.destinationName
            }
          },
          logFormat: entry.logFormat
        };
      }
    });
  }

  private ensureManagedLogGroup(entry: RedisLogDeliveryConfig, index: number): logs.LogGroup | undefined {
    if (entry.destinationType !== 'cloudwatch-logs') {
      return undefined;
    }

    const isManaged = entry.managed ?? entry.destinationName.startsWith('/aws/platform/redis/');
    if (!isManaged) {
      return undefined;
    }

    const kmsKey = this.resolveLoggingKmsKey();
    const logGroup = new logs.LogGroup(this, `${this.toPascal(entry.logType)}LogGroup${index}`, {
      logGroupName: entry.destinationName,
      retention: this.mapLogRetentionDays(this.governanceMetadata.logRetentionDays),
      encryptionKey: kmsKey,
      removalPolicy: cdk.RemovalPolicy.RETAIN
    });

    // Ensure log group depends on KMS key policy being applied
    // CloudWatch Logs needs the key policy to be in place before it can use the key
    if (kmsKey) {
      logGroup.node.addDependency(kmsKey);
    }

    this.applyStandardTags(logGroup, {
      'resource-type': 'log-group',
      'log-type': entry.logType
    });

    return logGroup;
  }

  private resolveLoggingKmsKey(): kms.IKey | undefined {
    if (this.config?.encryption.atRest === false && this.config?.encryption.inTransit === false) {
      return undefined;
    }

    // Use managed KMS key from platform context if available (for consistency)
    // Check if there's a platform-managed logging KMS key in the context
    // For now, create a component-specific key, but this can be extended to use
    // a shared platform key if one is available in the context
    if (!this.loggingKmsKey) {
      this.loggingKmsKey = new kms.Key(this, 'RedisLogsKmsKey', {
        description: `KMS key for ${this.getClusterName()} CloudWatch log encryption`,
        enableKeyRotation: true,
        removalPolicy: cdk.RemovalPolicy.RETAIN
      });

      // Grant CloudWatch Logs service permission to use the key for log group encryption
      // Use the stack's region to ensure it's properly resolved (not a token)
      const region = cdk.Stack.of(this).region ?? this.context.region ?? 'us-east-1';
      this.loggingKmsKey.addToResourcePolicy(new iam.PolicyStatement({
        sid: 'AllowCloudWatchLogs',
        principals: [new iam.ServicePrincipal(`logs.${region}.amazonaws.com`)],
        actions: [
          'kms:Decrypt',
          'kms:GenerateDataKey',
          'kms:DescribeKey'
        ],
        resources: ['*'] // Required by CloudFormation for KMS key policy statements
      }));

      this.applyStandardTags(this.loggingKmsKey, {
        'resource-type': 'kms-key',
        purpose: 'redis-log-encryption'
      });

      this.registerConstruct('kms:redis-log', this.loggingKmsKey);
      
      this.logComponentEvent('kms_key_created', 'Created KMS key for log encryption', {
        keyId: this.loggingKmsKey.keyId,
        purpose: 'redis-log-encryption',
        note: 'Consider using a platform-managed KMS key for consistency across components'
      });
    }

    return this.loggingKmsKey;
  }

  private composeSecurityGroupIds(): string[] {
    const ids: string[] = [];
    
    // Add config-provided security groups
    if (this.config!.security.securityGroupIds && this.config!.security.securityGroupIds.length > 0) {
      ids.push(...this.config!.security.securityGroupIds);
    }
    
    // Add managed security group if created
    if (this.securityGroup) {
      ids.push(this.securityGroup.securityGroupId);
    }

    if (ids.length === 0) {
      throw new Error(
        `ElastiCache Redis component '${this.spec.name}' must have at least one security group id ` +
          'either from config.security.securityGroupIds or a managed security group (security.create=true).'
      );
    }

    return Array.from(new Set(ids));
  }

  private buildCapability(): Record<string, any> {
    const primarySecurityGroupId = this.securityGroup?.securityGroupId ?? 
      (this.config!.security.securityGroupIds && this.config!.security.securityGroupIds.length > 0
        ? this.config!.security.securityGroupIds[0]
        : undefined);

    if (!primarySecurityGroupId) {
      throw new Error(
        `Capability export requires a security group. Provide securityGroupIds when security.create is false.`
      );
    }

    return {
      clusterId: this.getClusterName(),
      clusterName: this.getClusterName(),
      engineVersion: this.config!.engineVersion,
      nodeType: this.config!.nodeType,
      primaryEndpointAddress: this.replicationGroup!.attrPrimaryEndPointAddress,
      primaryEndpointPort: this.replicationGroup!.attrPrimaryEndPointPort,
      readerEndpointAddress: this.replicationGroup!.attrReaderEndPointAddress,
      readerEndpointPort: this.replicationGroup!.attrReaderEndPointPort,
      // Configuration endpoint for cluster mode (future-proof)
      configurationEndpointAddress: this.replicationGroup!.attrConfigurationEndPointAddress,
      configurationEndpointPort: this.replicationGroup!.attrConfigurationEndPointPort,
      port: this.config!.port,
      authTokenSecretArn: this.authTokenSecret?.secretArn,
      multiAz: this.config!.multiAz.enabled,
      sgId: primarySecurityGroupId,
      securityGroupIds: Array.from(new Set(this.composeSecurityGroupIds()))
    };
  }

  private getClusterName(): string {
    const explicitClusterName = this.config!.clusterName;
    // Include environment in generated name to ensure uniqueness across deployments
    // ElastiCache cluster names must be unique within an AWS account and region
    const generatedClusterName = `${this.context.serviceName}-${this.context.environment}-${this.spec.name}`;
    const clusterName = explicitClusterName ?? generatedClusterName;
    const clusterNameSource = explicitClusterName ? 'config.clusterName' : `generated from context.serviceName + context.environment + spec.name -> "${generatedClusterName}"`;
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/31cd8a5c-c5a9-4c85-9dba-5f04dc91dc42',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'elasticache-redis.component.ts:687',message:'getClusterName()',data:{componentName:this.spec.name,explicitClusterName,generatedClusterName,clusterName,clusterNameSource,serviceName:this.context.serviceName,environment:this.context.environment},timestamp:Date.now(),sessionId:'debug-session',runId:'run10',hypothesisId:'J'})}).catch(()=>{});
    // #endregion
    
    return clusterName;
  }

  private toPascal(value: string): string {
    return value
      .split(/[^a-zA-Z0-9]/)
      .filter(Boolean)
      .map(segment => segment.charAt(0).toUpperCase() + segment.slice(1))
      .join('');
  }
}
