import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {
  Component,
  ComponentSpec,
  ComponentContext,
  ComponentCapabilities
} from '@platform/contracts';
import {
  ApplicationLoadBalancerComponentConfigBuilder,
  ApplicationLoadBalancerConfig,
  AlbListenerConfig,
  AlbTargetGroupConfig
} from './application-load-balancer.builder';

export class ApplicationLoadBalancerComponent extends Component {
  private loadBalancer?: elbv2.ApplicationLoadBalancer;
  private targetGroups: elbv2.ApplicationTargetGroup[] = [];
  private listeners: elbv2.ApplicationListener[] = [];
  private managedSecurityGroup?: ec2.SecurityGroup;
  private vpc?: ec2.IVpc;
  private accessLogsBucket?: s3.IBucket;
  private createdAccessLogsBucket?: s3.Bucket;
  private config?: ApplicationLoadBalancerConfig;

  constructor(scope: Construct, id: string, context: ComponentContext, spec: ComponentSpec) {
    super(scope, id, context, spec);
  }

  public synth(): void {
    this.logComponentEvent('synthesis_start', 'Starting Application Load Balancer synthesis');

    try {
      const builder = new ApplicationLoadBalancerComponentConfigBuilder(this.context, this.spec);
      this.config = builder.buildSync();

      this.resolveVpc();
      this.configureSecurityGroup();
      this.configureAccessLogsBucket();
      this.createApplicationLoadBalancer();
      this.createTargetGroups();
      this.createListeners();
      this.configureMonitoring();

      this.registerConstruct('main', this.loadBalancer!);
      this.registerConstruct('loadBalancer', this.loadBalancer!);

      if (this.managedSecurityGroup) {
        this.registerConstruct('securityGroup', this.managedSecurityGroup);
      }

      if (this.createdAccessLogsBucket) {
        this.registerConstruct('accessLogsBucket', this.createdAccessLogsBucket);
      }

      this.targetGroups.forEach(tg => this.registerConstruct(`targetGroup:${tg.targetGroupName}`, tg));
      this.listeners.forEach(listener => this.registerConstruct(`listener:${listener.listenerPort}`, listener));

      this.registerCapability('net:load-balancer', this.buildLoadBalancerCapability());
      this.registerCapability('net:load-balancer-target', this.buildTargetCapability());

      this.logHardeningProfile();

      this.logComponentEvent('synthesis_complete', 'Application Load Balancer synthesis completed', {
        loadBalancerArn: this.loadBalancer!.loadBalancerArn,
        loadBalancerDnsName: this.loadBalancer!.loadBalancerDnsName,
        hardeningProfile: this.config!.hardeningProfile
      });
    } catch (error) {
      this.logError(error as Error, 'application-load-balancer synthesis failed');
      throw error;
    }
  }

  public getCapabilities(): ComponentCapabilities {
    this.validateSynthesized();
    return this.capabilities;
  }

  public getType(): string {
    return 'application-load-balancer';
  }

  private resolveVpc(): void {
    const vpcConfig = this.config!.vpc;

    if (vpcConfig.vpcId) {
      this.vpc = ec2.Vpc.fromLookup(this, 'Vpc', {
        vpcId: vpcConfig.vpcId
      });
      return;
    }

    this.vpc = ec2.Vpc.fromLookup(this, 'DefaultVpc', {
      isDefault: true
    });
  }

  private configureSecurityGroup(): void {
    const sgConfig = this.config!.securityGroups;

    if (sgConfig.create) {
      const securityGroup = new ec2.SecurityGroup(this, 'AlbSecurityGroup', {
        vpc: this.vpc!,
        description: `Security group for ${this.context.serviceName}-${this.spec.name} ALB`,
        allowAllOutbound: true
      });

      sgConfig.ingress.forEach(rule => {
        securityGroup.addIngressRule(
          ec2.Peer.ipv4(rule.cidr),
          this.resolvePort(rule),
          rule.description ?? `Allow ${rule.protocol ?? 'tcp'} ${rule.port}`
        );
      });

      this.applyStandardTags(securityGroup, {
        'resource-type': 'security-group',
        'alb-name': this.config!.loadBalancerName
      });

      this.logResourceCreation('security-group', securityGroup.securityGroupId);
      this.managedSecurityGroup = securityGroup;
    }
  }

  private configureAccessLogsBucket(): void {
    const logging = this.config!.accessLogs;
    if (!logging.enabled) {
      return;
    }

    if (logging.bucketName) {
      this.accessLogsBucket = s3.Bucket.fromBucketName(this, 'ExistingAccessLogsBucket', logging.bucketName);
      return;
    }

    const bucketName = this.generateAccessLogBucketName();

    const bucket = new s3.Bucket(this, 'AlbAccessLogsBucket', {
      bucketName,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      lifecycleRules: [
        {
          id: 'AlbAccessLogRetention',
          enabled: true,
          expiration: cdk.Duration.days(logging.retentionDays)
        }
      ],
      removalPolicy: this.mapRemovalPolicy(logging.removalPolicy)
    });

    this.applyStandardTags(bucket, {
      'resource-type': 's3-bucket',
      'purpose': 'alb-access-logs'
    });

    this.logResourceCreation('s3-bucket', bucket.bucketName);
    this.accessLogsBucket = bucket;
    this.createdAccessLogsBucket = bucket;
  }

  private createApplicationLoadBalancer(): void {
    const subnets = this.resolveSubnets();
    const securityGroups = this.resolveSecurityGroups();
    const primarySecurityGroup = securityGroups.shift();

    this.loadBalancer = new elbv2.ApplicationLoadBalancer(this, 'ApplicationLoadBalancer', {
      loadBalancerName: this.config!.loadBalancerName,
      vpc: this.vpc!,
      vpcSubnets: subnets.length > 0 ? { subnets } : undefined,
      internetFacing: this.config!.scheme === 'internet-facing',
      ipAddressType: this.config!.ipAddressType === 'dualstack'
        ? elbv2.IpAddressType.DUAL_STACK
        : elbv2.IpAddressType.IPV4,
      securityGroup: primarySecurityGroup,
      deletionProtection: this.config!.deletionProtection,
      idleTimeout: cdk.Duration.seconds(this.config!.idleTimeoutSeconds)
    });

    securityGroups.forEach(sg => this.loadBalancer!.addSecurityGroup(sg));

    if (this.config!.accessLogs.enabled) {
      const bucket = this.accessLogsBucket ?? s3.Bucket.fromBucketName(
        this,
        'ImportedAccessLogsBucket',
        this.config!.accessLogs.bucketName!
      );
      this.loadBalancer.logAccessLogs(bucket, this.config!.accessLogs.prefix);
    }

    this.applyStandardTags(this.loadBalancer, {
      'resource-type': 'application-load-balancer',
      'scheme': this.config!.scheme,
      ...this.config!.tags
    });

    this.logResourceCreation('application-load-balancer', this.loadBalancer.loadBalancerArn, {
      dnsName: this.loadBalancer.loadBalancerDnsName
    });
  }

  private createTargetGroups(): void {
    if (this.config!.targetGroups.length === 0 && this.config!.deploymentStrategy.type === 'blue-green') {
      this.createBlueGreenTargetGroups();
      return;
    }

    this.config!.targetGroups.forEach(targetGroupConfig => {
      const targetGroup = this.buildTargetGroup(targetGroupConfig);
      this.targetGroups.push(targetGroup);
    });
  }

  private buildTargetGroup(config: AlbTargetGroupConfig): elbv2.ApplicationTargetGroup {
    const targetGroup = new elbv2.ApplicationTargetGroup(this, `TargetGroup${config.name}`, {
      targetGroupName: `${this.context.serviceName}-${config.name}`.substring(0, 32),
      port: config.port,
      protocol: config.protocol === 'HTTPS' ? elbv2.ApplicationProtocol.HTTPS : elbv2.ApplicationProtocol.HTTP,
      vpc: this.vpc!,
      targetType: this.mapTargetType(config.targetType),
      healthCheck: config.healthCheck
        ? {
            enabled: config.healthCheck.enabled,
            path: config.healthCheck.path,
            protocol: config.healthCheck.protocol === 'HTTPS' ? elbv2.Protocol.HTTPS : elbv2.Protocol.HTTP,
            port: config.healthCheck.port ? config.healthCheck.port.toString() : undefined,
            healthyThresholdCount: config.healthCheck.healthyThresholdCount,
            unhealthyThresholdCount: config.healthCheck.unhealthyThresholdCount,
            timeout: config.healthCheck.timeoutSeconds
              ? cdk.Duration.seconds(config.healthCheck.timeoutSeconds)
              : undefined,
            interval: config.healthCheck.intervalSeconds
              ? cdk.Duration.seconds(config.healthCheck.intervalSeconds)
              : undefined,
            healthyHttpCodes: config.healthCheck.matcher
          }
        : undefined
    });

    if (config.stickiness?.enabled) {
      targetGroup.setAttribute('stickiness.enabled', 'true');
      targetGroup.setAttribute('stickiness.type', 'lb_cookie');
      if (config.stickiness.durationSeconds) {
        targetGroup.setAttribute('stickiness.lb_cookie.duration_seconds', config.stickiness.durationSeconds.toString());
      }
    }

    this.applyStandardTags(targetGroup, {
      'resource-type': 'target-group',
      'target-type': config.targetType
    });

    this.logResourceCreation('target-group', targetGroup.targetGroupArn);

    return targetGroup;
  }

  private createListeners(): void {
    this.config!.listeners.forEach(listenerConfig => {
      const listener = this.loadBalancer!.addListener(`Listener${listenerConfig.port}`, {
        port: listenerConfig.port,
        protocol: listenerConfig.protocol === 'HTTPS'
          ? elbv2.ApplicationProtocol.HTTPS
          : elbv2.ApplicationProtocol.HTTP,
        certificates: listenerConfig.certificateArn
          ? [elbv2.ListenerCertificate.fromArn(listenerConfig.certificateArn)]
          : undefined,
        sslPolicy: listenerConfig.sslPolicy as elbv2.SslPolicy | undefined,
        defaultAction: this.buildDefaultAction(listenerConfig)
      });

      if (listenerConfig.redirectToHttps && listenerConfig.protocol === 'HTTP') {
        listener.addAction('RedirectToHttps', {
          action: elbv2.ListenerAction.redirect({
            protocol: 'HTTPS',
            port: '443',
            permanent: true
          })
        });
      }

      this.listeners.push(listener);
      this.logResourceCreation('listener', listener.listenerArn, {
        port: listenerConfig.port
      });
    });
  }

  private buildDefaultAction(listenerConfig: AlbListenerConfig): elbv2.ListenerAction | undefined {
    if (!listenerConfig.defaultAction) {
      if (this.targetGroups.length > 0) {
        return elbv2.ListenerAction.forward(this.targetGroups);
      }

      return elbv2.ListenerAction.fixedResponse(200, {
        contentType: 'text/plain',
        messageBody: 'OK'
      });
    }

    const action = listenerConfig.defaultAction;
    switch (action.type) {
      case 'fixed-response':
        return elbv2.ListenerAction.fixedResponse(action.fixedResponse?.statusCode ?? 200, {
          contentType: action.fixedResponse?.contentType,
          messageBody: action.fixedResponse?.messageBody
        });
      case 'redirect':
        {
          const url = new URL(action.redirect!.redirectUrl);
          return elbv2.ListenerAction.redirect({
            host: url.hostname,
            path: url.pathname,
            protocol: url.protocol.replace(':', ''),
            port: url.port || undefined,
            permanent: true
          });
        }
      case 'forward':
        if (this.targetGroups.length === 0) {
          throw new Error('Listener default action "forward" requires at least one target group');
        }
        return elbv2.ListenerAction.forward(this.targetGroups);
      default:
        return undefined;
    }
  }

  private createBlueGreenTargetGroups(): void {
    const baseName = `${this.context.serviceName}-${this.spec.name}`;

    const blue = new elbv2.ApplicationTargetGroup(this, 'BlueTargetGroup', {
      targetGroupName: `${baseName}-blue`.substring(0, 32),
      port: 80,
      protocol: elbv2.ApplicationProtocol.HTTP,
      vpc: this.vpc!,
      targetType: elbv2.TargetType.INSTANCE,
      healthCheck: {
        enabled: true,
        path: '/health',
        protocol: elbv2.Protocol.HTTP,
        healthyThresholdCount: 2,
        unhealthyThresholdCount: 2,
        timeout: cdk.Duration.seconds(5),
        interval: cdk.Duration.seconds(30)
      }
    });

    const green = new elbv2.ApplicationTargetGroup(this, 'GreenTargetGroup', {
      targetGroupName: `${baseName}-green`.substring(0, 32),
      port: 80,
      protocol: elbv2.ApplicationProtocol.HTTP,
      vpc: this.vpc!,
      targetType: elbv2.TargetType.INSTANCE,
      healthCheck: {
        enabled: true,
        path: '/health',
        protocol: elbv2.Protocol.HTTP,
        healthyThresholdCount: 2,
        unhealthyThresholdCount: 2,
        timeout: cdk.Duration.seconds(5),
        interval: cdk.Duration.seconds(30)
      }
    });

    this.applyStandardTags(blue, {
      'resource-type': 'target-group',
      'deployment-strategy': 'blue-green',
      'environment-type': 'blue'
    });

    this.applyStandardTags(green, {
      'resource-type': 'target-group',
      'deployment-strategy': 'blue-green',
      'environment-type': 'green'
    });

    this.targetGroups.push(blue, green);
  }

  private configureMonitoring(): void {
    if (!this.config!.monitoring.enabled) {
      return;
    }

    const loadBalancerFullName = this.loadBalancer!.loadBalancerFullName;
    const alarms = this.config!.monitoring.alarms;

    const http5xxAlarm = new cloudwatch.Alarm(this, 'AlbHttp5xxAlarm', {
      alarmName: `${this.context.serviceName}-${this.spec.name}-http-5xx-errors`,
      alarmDescription: 'ALB HTTP 5xx server errors alarm',
      metric: new cloudwatch.Metric({
        namespace: 'AWS/ApplicationELB',
        metricName: 'HTTPCode_Target_5XX_Count',
        dimensionsMap: { LoadBalancer: loadBalancerFullName },
        statistic: alarms.http5xx.statistic,
        period: cdk.Duration.minutes(alarms.http5xx.periodMinutes)
      }),
      threshold: alarms.http5xx.threshold,
      evaluationPeriods: alarms.http5xx.evaluationPeriods,
      comparisonOperator: this.mapComparisonOperator(alarms.http5xx.comparisonOperator),
      treatMissingData: this.mapTreatMissingData(alarms.http5xx.treatMissingData)
    });

    this.applyStandardTags(http5xxAlarm, {
      'alarm-type': 'http5xx',
      ...alarms.http5xx.tags
    });

    const unhealthyHostsAlarm = new cloudwatch.Alarm(this, 'AlbUnhealthyHostAlarm', {
      alarmName: `${this.context.serviceName}-${this.spec.name}-unhealthy-hosts`,
      alarmDescription: 'ALB unhealthy host count alarm',
      metric: new cloudwatch.Metric({
        namespace: 'AWS/ApplicationELB',
        metricName: 'UnHealthyHostCount',
        dimensionsMap: { LoadBalancer: loadBalancerFullName },
        statistic: alarms.unhealthyHosts.statistic,
        period: cdk.Duration.minutes(alarms.unhealthyHosts.periodMinutes)
      }),
      threshold: alarms.unhealthyHosts.threshold,
      evaluationPeriods: alarms.unhealthyHosts.evaluationPeriods,
      comparisonOperator: this.mapComparisonOperator(alarms.unhealthyHosts.comparisonOperator),
      treatMissingData: this.mapTreatMissingData(alarms.unhealthyHosts.treatMissingData)
    });

    this.applyStandardTags(unhealthyHostsAlarm, {
      'alarm-type': 'unhealthy-hosts',
      ...alarms.unhealthyHosts.tags
    });

    const connectionErrorsAlarm = new cloudwatch.Alarm(this, 'AlbConnectionErrorsAlarm', {
      alarmName: `${this.context.serviceName}-${this.spec.name}-connection-errors`,
      alarmDescription: 'ALB target connection errors alarm',
      metric: new cloudwatch.Metric({
        namespace: 'AWS/ApplicationELB',
        metricName: 'TargetConnectionErrorCount',
        dimensionsMap: { LoadBalancer: loadBalancerFullName },
        statistic: alarms.connectionErrors.statistic,
        period: cdk.Duration.minutes(alarms.connectionErrors.periodMinutes)
      }),
      threshold: alarms.connectionErrors.threshold,
      evaluationPeriods: alarms.connectionErrors.evaluationPeriods,
      comparisonOperator: this.mapComparisonOperator(alarms.connectionErrors.comparisonOperator),
      treatMissingData: this.mapTreatMissingData(alarms.connectionErrors.treatMissingData)
    });

    this.applyStandardTags(connectionErrorsAlarm, {
      'alarm-type': 'connection-errors',
      ...alarms.connectionErrors.tags
    });

    const rejectedConnectionsAlarm = new cloudwatch.Alarm(this, 'AlbRejectedConnectionsAlarm', {
      alarmName: `${this.context.serviceName}-${this.spec.name}-rejected-connections`,
      alarmDescription: 'ALB rejected connections alarm',
      metric: new cloudwatch.Metric({
        namespace: 'AWS/ApplicationELB',
        metricName: 'RejectedConnectionCount',
        dimensionsMap: { LoadBalancer: loadBalancerFullName },
        statistic: alarms.rejectedConnections.statistic,
        period: cdk.Duration.minutes(alarms.rejectedConnections.periodMinutes)
      }),
      threshold: alarms.rejectedConnections.threshold,
      evaluationPeriods: alarms.rejectedConnections.evaluationPeriods,
      comparisonOperator: this.mapComparisonOperator(alarms.rejectedConnections.comparisonOperator),
      treatMissingData: this.mapTreatMissingData(alarms.rejectedConnections.treatMissingData)
    });

    this.applyStandardTags(rejectedConnectionsAlarm, {
      'alarm-type': 'rejected-connections',
      ...alarms.rejectedConnections.tags
    });

    this.logComponentEvent('observability_configured', 'Monitoring enabled for Application Load Balancer', {
      alarmsCreated: 4,
      http5xxThreshold: alarms.http5xx.threshold,
      unhealthyHostThreshold: alarms.unhealthyHosts.threshold,
      connectionErrorThreshold: alarms.connectionErrors.threshold,
      rejectedConnectionThreshold: alarms.rejectedConnections.threshold
    });
  }

  private resolveSecurityGroups(): ec2.ISecurityGroup[] {
    const sgConfig = this.config!.securityGroups;
    const groups: ec2.ISecurityGroup[] = [];

    if (this.managedSecurityGroup) {
      groups.push(this.managedSecurityGroup);
    }

    sgConfig.securityGroupIds.forEach((sgId, index) => {
      const imported = ec2.SecurityGroup.fromSecurityGroupId(this, `ImportedAlbSG${index}`, sgId);
      groups.push(imported);
    });

    return groups;
  }

  private resolveSubnets(): ec2.ISubnet[] {
    const vpcConfig = this.config!.vpc;

    if (vpcConfig.subnetIds.length > 0) {
      return vpcConfig.subnetIds.map((subnetId, index) =>
        ec2.Subnet.fromSubnetId(this, `AlbSubnet${index}`, subnetId)
      );
    }

    return vpcConfig.subnetType === 'public'
      ? this.vpc!.publicSubnets
      : this.vpc!.privateSubnets;
  }

  private mapTargetType(targetType: 'instance' | 'ip' | 'lambda'): elbv2.TargetType {
    switch (targetType) {
      case 'instance':
        return elbv2.TargetType.INSTANCE;
      case 'ip':
        return elbv2.TargetType.IP;
      case 'lambda':
        return elbv2.TargetType.LAMBDA;
      default:
        throw new Error(`Unsupported target type: ${targetType}`);
    }
  }

  private mapComparisonOperator(operator: 'gt' | 'gte' | 'lt' | 'lte'): cloudwatch.ComparisonOperator {
    switch (operator) {
      case 'gt':
        return cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD;
      case 'gte':
        return cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD;
      case 'lt':
        return cloudwatch.ComparisonOperator.LESS_THAN_THRESHOLD;
      case 'lte':
        return cloudwatch.ComparisonOperator.LESS_THAN_OR_EQUAL_TO_THRESHOLD;
      default:
        return cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD;
    }
  }

  private mapTreatMissingData(mode: 'breaching' | 'not-breaching' | 'ignore' | 'missing'): cloudwatch.TreatMissingData {
    switch (mode) {
      case 'breaching':
        return cloudwatch.TreatMissingData.BREACHING;
      case 'not-breaching':
        return cloudwatch.TreatMissingData.NOT_BREACHING;
      case 'ignore':
        return cloudwatch.TreatMissingData.IGNORE;
      case 'missing':
        return cloudwatch.TreatMissingData.MISSING;
      default:
        return cloudwatch.TreatMissingData.NOT_BREACHING;
    }
  }

  private mapRemovalPolicy(policy: 'retain' | 'destroy'): cdk.RemovalPolicy {
    return policy === 'retain' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY;
  }

  private resolvePort(rule: { port: number; protocol?: string }): ec2.IPort {
    switch (rule.protocol) {
      case 'udp':
        return ec2.Port.udp(rule.port);
      case 'icmp':
        return ec2.Port.icmpTypeAndCode();
      default:
        return ec2.Port.tcp(rule.port);
    }
  }

  private buildLoadBalancerCapability(): Record<string, any> {
    return {
      arn: this.loadBalancer!.loadBalancerArn,
      dnsName: this.loadBalancer!.loadBalancerDnsName,
      hostedZoneId: this.loadBalancer!.loadBalancerCanonicalHostedZoneId,
      scheme: this.config!.scheme,
      ipAddressType: this.config!.ipAddressType,
      monitoringEnabled: this.config!.monitoring.enabled,
      hardeningProfile: this.config!.hardeningProfile
    };
  }

  private buildTargetCapability(): Record<string, any> {
    return {
      targetGroups: this.targetGroups.map(targetGroup => ({
        arn: targetGroup.targetGroupArn,
        name: targetGroup.targetGroupName
      }))
    };
  }

  private logHardeningProfile(): void {
    this.logComplianceEvent('hardening_profile_applied', 'Applied Application Load Balancer hardening profile', {
      hardeningProfile: this.config!.hardeningProfile
    });
  }

  private generateAccessLogBucketName(): string {
    const base = `${this.context.serviceName}-${this.spec.name}-alb-logs`
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-');

    const trimmed = base.substring(0, 50).replace(/-+$/, '');
    return `${trimmed}-${this.node.addr.slice(-6)}`;
  }
}
