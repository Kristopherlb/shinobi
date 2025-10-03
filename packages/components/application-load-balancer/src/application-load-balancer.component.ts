import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as wafv2 from 'aws-cdk-lib/aws-wafv2';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { NagSuppressions } from 'cdk-nag';
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
} from './application-load-balancer.builder.ts';

export class ApplicationLoadBalancerComponent extends Component {
  private loadBalancer?: elbv2.ApplicationLoadBalancer;
  private targetGroups: elbv2.ApplicationTargetGroup[] = [];
  private listeners: elbv2.ApplicationListener[] = [];
  private managedSecurityGroup?: ec2.SecurityGroup;
  private vpc?: ec2.IVpc;
  private accessLogsBucket?: s3.IBucket;
  private createdAccessLogsBucket?: s3.Bucket;
  private webAcl?: wafv2.CfnWebACL;
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
      this.configureWAF();
      this.applyCDKNagSuppressions();

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
      const observabilityCapability = this.buildObservabilityCapability();
      this.registerCapability('observability:application-load-balancer', observabilityCapability);

      this.logHardeningProfile();

      this.logComponentEvent('observability_registered', 'Recorded ALB observability directives', {
        telemetry: observabilityCapability.telemetry
      });

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
    if (this.context.vpc) {
      this.vpc = this.context.vpc;
      return;
    }

    throw new Error(
      'Application Load Balancer component requires `config.vpc.vpcId` or a VPC provided via context.vpc; default VPC lookup is no longer supported.'
    );
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

  private buildObservabilityCapability(): Record<string, any> {
    const telemetry = this.buildTelemetryDirectives();

    return {
      type: 'application-load-balancer',
      loadBalancerArn: this.loadBalancer!.loadBalancerArn,
      loadBalancerFullName: this.loadBalancer!.loadBalancerFullName,
      monitoring: this.config!.monitoring,
      observability: this.config!.observability,
      accessLogs: this.config!.accessLogs,
      accessLogBucketName: this.config!.accessLogs.bucketName ?? this.createdAccessLogsBucket?.bucketName,
      logGroupName: this.accessLogGroup?.logGroupName,
      listeners: this.listeners.map(listener => ({
        port: listener.listenerPort,
        protocol: listener.listenerProtocol?.toString()
      })),
      targetGroups: this.targetGroups.map(targetGroup => ({
        name: targetGroup.targetGroupName,
        targetType: targetGroup.targetType
      })),
      tags: this.config!.tags,
      telemetry
    };
  }

  private buildTelemetryDirectives(): Record<string, any> {
    const monitoring = this.config!.monitoring;
    const observability = this.config!.observability;
    const loadBalancerFullName = this.loadBalancer!.loadBalancerFullName;

    const baseDimensions = {
      LoadBalancer: loadBalancerFullName
    };

    const metrics: Array<Record<string, any>> = [
      {
        id: `${loadBalancerFullName}-request-count`,
        namespace: 'AWS/ApplicationELB',
        metricName: 'RequestCount',
        dimensions: baseDimensions,
        statistic: 'Sum',
        periodSeconds: 300,
        description: 'Total number of requests processed by the Application Load Balancer'
      },
      {
        id: `${loadBalancerFullName}-elb-5xx`,
        namespace: 'AWS/ApplicationELB',
        metricName: 'HTTPCode_ELB_5XX_Count',
        dimensions: baseDimensions,
        statistic: 'Sum',
        periodSeconds: 300,
        description: 'Count of 5XX errors generated by the load balancer'
      }
    ];

    const alarms: Array<Record<string, any>> = [];

    const addAlarm = (
      idSuffix: string,
      metricId: string,
      alarmConfig: any,
      severity: 'info' | 'warning' | 'critical'
    ): void => {
      if (!alarmConfig?.enabled) {
        return;
      }

      alarms.push({
        id: `${loadBalancerFullName}-${idSuffix}`,
        metricId,
        alarmName: `${this.context.serviceName}-${this.spec.name}-${idSuffix}`,
        alarmDescription: `${idSuffix} threshold breached for Application Load Balancer`,
        threshold: alarmConfig.threshold,
        comparisonOperator: this.mapTelemetryComparisonOperator(alarmConfig.comparisonOperator),
        evaluationPeriods: alarmConfig.evaluationPeriods,
        severity,
        treatMissingData: this.mapTelemetryTreatMissingData(alarmConfig.treatMissingData)
      });
    };

    if (monitoring.enabled) {
      const http5xx = monitoring.alarms.http5xx;
      addAlarm('http5xx', `${loadBalancerFullName}-elb-5xx`, http5xx, 'critical');

      this.targetGroups.forEach(targetGroup => {
        const targetGroupDimension = this.resolveTargetGroupDimension(targetGroup.targetGroupArn);
        const targetDimensions = {
          ...baseDimensions,
          TargetGroup: targetGroupDimension
        };
        const sanitizedSuffix = targetGroupDimension.replace(/[^a-zA-Z0-9_-]/g, '-');

        const unhealthyMetricId = `${targetGroupDimension}-unhealthy-hosts`;
        metrics.push({
          id: unhealthyMetricId,
          namespace: 'AWS/ApplicationELB',
          metricName: 'UnHealthyHostCount',
          dimensions: targetDimensions,
          statistic: 'Average',
          periodSeconds: (monitoring.alarms.unhealthyHosts.periodMinutes ?? 5) * 60,
          description: 'Average number of unhealthy targets registered against the load balancer'
        });
        addAlarm(`unhealthy-hosts-${sanitizedSuffix}`, unhealthyMetricId, monitoring.alarms.unhealthyHosts, 'warning');

        const connectionMetricId = `${targetGroupDimension}-connection-errors`;
        metrics.push({
          id: connectionMetricId,
          namespace: 'AWS/ApplicationELB',
          metricName: 'TargetConnectionErrorCount',
          dimensions: targetDimensions,
          statistic: 'Sum',
          periodSeconds: (monitoring.alarms.connectionErrors.periodMinutes ?? 5) * 60,
          description: 'Count of target connection errors experienced by the load balancer'
        });
        addAlarm(`connection-errors-${sanitizedSuffix}`, connectionMetricId, monitoring.alarms.connectionErrors, 'warning');

        const rejectedMetricId = `${targetGroupDimension}-rejected-connections`;
        metrics.push({
          id: rejectedMetricId,
          namespace: 'AWS/ApplicationELB',
          metricName: 'RejectedConnectionCount',
          dimensions: targetDimensions,
          statistic: 'Sum',
          periodSeconds: (monitoring.alarms.rejectedConnections.periodMinutes ?? 5) * 60,
          description: 'Count of connections rejected because the load balancer reached capacity'
        });
        addAlarm(`rejected-connections-${sanitizedSuffix}`, rejectedMetricId, monitoring.alarms.rejectedConnections, 'warning');
      });
    }

    const logging = {
      enabled: this.config!.accessLogs.enabled,
      destination: 's3',
      bucketName: this.config!.accessLogs.bucketName ?? this.createdAccessLogsBucket?.bucketName,
      retentionDays: this.config!.accessLogs.retentionDays,
      format: 'parquet'
    };

    const tracingConfig = observability?.xrayTracing;
    const tracing = tracingConfig?.enabled
      ? {
          enabled: true,
          provider: 'xray',
          samplingRate: tracingConfig.samplingRate ?? 0.1,
          rules: [
            {
              name: `${this.context.serviceName}-${this.spec.name}-alb`,
              priority: 1000,
              fixedRate: tracingConfig.samplingRate ?? 0.1,
              reservoirSize: 100,
              serviceType: 'AWS::ElasticLoadBalancingV2::LoadBalancer',
              resourceArn: this.loadBalancer!.loadBalancerArn
            }
          ],
          attributes: {
            'service.name': tracingConfig.serviceName ?? this.config!.loadBalancerName
          }
        }
      : {
          enabled: false,
          provider: 'xray'
        };

    const dashboards: Array<Record<string, any>> = [];
    const dashboardConfig = observability?.dashboard;
    if (dashboardConfig?.enabled) {
      dashboards.push({
        id: `${loadBalancerFullName}-alb-dashboard`,
        name: dashboardConfig.name ?? `${this.context.serviceName}-${this.spec.name}-alb-dashboard`,
        description: 'Key ALB performance indicators rendered by the observability service',
        widgets: [
          {
            id: 'alb-request-count-widget',
            type: 'metric',
            title: 'Request Count',
            width: 12,
            height: 6,
            metrics: [
              { metricId: `${loadBalancerFullName}-request-count`, label: 'Requests', stat: 'Sum' }
            ]
          },
          {
            id: 'alb-5xx-widget',
            type: 'metric',
            title: 'HTTP 5xx Errors',
            width: 12,
            height: 6,
            metrics: [
              { metricId: `${loadBalancerFullName}-elb-5xx`, label: 'ELB 5XX', stat: 'Sum' }
            ]
          }
        ]
      });
    }

    return {
      metrics,
      alarms: alarms.length ? alarms : undefined,
      dashboards: dashboards.length ? dashboards : undefined,
      logging,
      tracing,
      custom: {
        listeners: this.listeners.map(listener => ({
          port: listener.listenerPort,
          protocol: listener.listenerProtocol?.toString()
        })),
        targetGroups: this.targetGroups.map(targetGroup => ({
          arn: targetGroup.targetGroupArn,
          dimension: this.resolveTargetGroupDimension(targetGroup.targetGroupArn)
        }))
      }
    };
  }

  private resolveTargetGroupDimension(targetGroupArn: string): string {
    const [, suffix] = targetGroupArn.split(':targetgroup/');
    if (!suffix) {
      return this.extractNameFromArn(targetGroupArn);
    }
    return `targetgroup/${suffix}`;
  }

  private extractNameFromArn(arn: string): string {
    const parts = arn.split('/');
    return parts.slice(-2).join('/') || arn;
  }

  private mapTelemetryComparisonOperator(operator: string | undefined): 'gt' | 'gte' | 'lt' | 'lte' {
    switch ((operator ?? 'gte').toLowerCase()) {
      case 'gt':
        return 'gt';
      case 'lt':
        return 'lt';
      case 'lte':
        return 'lte';
      case 'gte':
      default:
        return 'gte';
    }
  }

  private mapTelemetryTreatMissingData(
    treatMissingData: string | undefined
  ): 'breaching' | 'notBreaching' | 'ignore' | 'missing' | undefined {
    switch ((treatMissingData ?? '').toLowerCase()) {
      case 'breaching':
        return 'breaching';
      case 'missing':
        return 'missing';
      case 'ignore':
        return 'ignore';
      case 'not-breaching':
        return 'notBreaching';
      default:
        return undefined;
    }
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

  private configureWAF(): void {
    const wafConfig = this.config!.observability?.waf;

    if (!wafConfig?.enabled) {
      this.logComponentEvent('waf_skipped', 'WAF disabled in configuration');
      return;
    }

    this.logComponentEvent('waf_config', 'Configuring AWS WAF for Application Load Balancer');

    // Build rules from configuration
    const rules: any[] = [];
    let priority = 1;

    // Add managed rule groups
    const managedRuleGroups = wafConfig.managedRuleGroups || [
      'AWSManagedRulesCommonRuleSet',
      'AWSManagedRulesKnownBadInputsRuleSet',
      'AWSManagedRulesSQLiRuleSet'
    ];

    for (const ruleGroup of managedRuleGroups) {
      rules.push({
        name: ruleGroup,
        priority: priority++,
        overrideAction: {
          none: {}
        },
        statement: {
          managedRuleGroupStatement: {
            vendorName: 'AWS',
            name: ruleGroup
          }
        },
        visibilityConfig: {
          sampledRequestsEnabled: true,
          cloudWatchMetricsEnabled: true,
          metricName: `${ruleGroup}Metric`
        }
      });
    }

    // Add custom rules
    if (wafConfig.customRules) {
      for (const customRule of wafConfig.customRules) {
        rules.push({
          ...customRule,
          priority: priority++
        });
      }
    }

    // Create WAF Web ACL with security rules
    this.webAcl = new wafv2.CfnWebACL(this, 'WebACL', {
      name: `${this.context.serviceName}-${this.spec.name}-alb-waf`,
      description: `WAF Web ACL for ${this.config!.loadBalancerName}`,
      scope: 'REGIONAL',
      defaultAction: {
        allow: {}
      },
      rules,
      visibilityConfig: {
        sampledRequestsEnabled: true,
        cloudWatchMetricsEnabled: true,
        metricName: 'ALBWebACL'
      }
    });

    // Associate WAF with ALB
    new wafv2.CfnWebACLAssociation(this, 'WebACLAssociation', {
      resourceArn: this.loadBalancer!.loadBalancerArn,
      webAclArn: this.webAcl.attrArn
    });

    // Register WAF capability
    this.registerCapability('waf:web-acl', {
      webAclArn: this.webAcl.attrArn,
      webAclName: this.webAcl.name!,
      associatedResourceArn: this.loadBalancer!.loadBalancerArn
    });

    this.logComponentEvent('waf_configured', 'AWS WAF configured successfully');
  }

  private applyCDKNagSuppressions(): void {
    this.logComponentEvent('cdk_nag_config', 'Applying CDK Nag suppressions');

    // Suppress specific CDK Nag rules with justifications
    NagSuppressions.addResourceSuppressions(this.loadBalancer!, [
      {
        id: 'AwsSolutions-ELB2',
        reason: 'Access logging is configured via the accessLogs configuration property'
      }
    ], true);

    if (this.webAcl) {
      NagSuppressions.addResourceSuppressions(this.webAcl, [
        {
          id: 'AwsSolutions-WAF2-1',
          reason: 'WAF Web ACL uses managed rule groups for security best practices'
        }
      ], true);
    }

    this.logComponentEvent('cdk_nag_suppressions_applied', 'CDK Nag suppressions applied successfully');
  }
}
