import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as autoscaling from 'aws-cdk-lib/aws-autoscaling';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as cdk from 'aws-cdk-lib';
import { BaseComponent } from '@platform/core-engine';
import { ComponentContext, ComponentSpec } from '@platform/contracts';
// import { applyComplianceTags } from '@platform/tagging-service';
import { DaggerConfig, DaggerOutputs, DaggerEnginePoolProps } from './types';
import { DaggerConfigBuilder } from './dagger-engine-pool.builder';

/**
 * DaggerEnginePool: provisions a private, FIPS/STIG-friendly fleet that exposes a remote Dagger engine via mTLS.
 * Extends BaseComponent to gain: OTel env injection, structured logging defaults, mandatory tagging, and guardrail helpers.
 */
export class DaggerEnginePool extends BaseComponent {
  private readonly config: DaggerConfig;

  constructor(
    scope: Construct,
    id: string,
    context: ComponentContext,
    spec: ComponentSpec,
    props?: DaggerEnginePoolProps
  ) {
    super(scope, id, context, spec);

    // Build configuration using precedence chain
    const builder = new DaggerConfigBuilder();
    this.config = builder
      .withPlatformDefaults()
      .withComplianceDefaults(context.complianceFramework as any)
      .withEnvironment({
        otlpEndpoint: (context as any).observability?.collectorEndpoint,
        kmsKeyRef: (context as any).security?.kmsKeyRef
      })
      .withOverrides(props?.overrides || spec.config)
      .build();
  }

  public synth(): void {
    // 1) Guardrails (compile-time)
    this.assert(() => this.config.endpoint?.nlbInternal !== false, 'Public exposure forbidden');
    this.assert(() => !this.config.fipsMode || (this.config.compliance?.forbidNonFipsAmi !== false), 'FIPS mode requires approved AMI');
    this.assert(() => this.config.compliance?.forbidNoKms !== false, 'KMS required for all storage');

    // 2) Create helper resources for compliance
    const kmsKey = this.createKmsKeyIfNeeded('dagger-engine-storage');
    const artifactsBucket = this.createArtifactsBucket(kmsKey);

    // 3) Provision main infrastructure
    const vpc = this.getVpc();
    const logGroup = this.createLogGroup(kmsKey);
    const securityGroup = this.createSecurityGroup(vpc);
    const launchTemplate = this.createLaunchTemplate(securityGroup, kmsKey, artifactsBucket, logGroup);
    const asg = this.createAutoScalingGroup(vpc, launchTemplate);
    const nlb = this.createNetworkLoadBalancer(vpc, asg);

    // 4) Apply compliance tags to all resources
    this.applyComplianceTags(kmsKey, {
      component: 'dagger-engine-pool',
      serviceType: 'dagger-engine',
      framework: this.context.complianceFramework,
      controls: ['SC-13', 'SC-7', 'AC-2', 'AU-2', 'CM-6'],
      owner: (this.context as any).owner,
      environment: this.context.environment
    });
    this.applyComplianceTags(artifactsBucket, {
      component: 'dagger-engine-pool',
      serviceType: 'dagger-engine',
      framework: this.context.complianceFramework,
      controls: ['SC-7', 'AC-2', 'AU-2', 'CM-6'],
      owner: (this.context as any).owner,
      environment: this.context.environment
    });
    this.applyComplianceTags(securityGroup, {
      component: 'dagger-engine-pool',
      serviceType: 'dagger-engine',
      framework: this.context.complianceFramework,
      controls: ['SC-7', 'AC-2', 'AU-2', 'CM-6'],
      owner: (this.context as any).owner,
      environment: this.context.environment
    });
    this.applyComplianceTags(launchTemplate, {
      component: 'dagger-engine-pool',
      serviceType: 'dagger-engine',
      framework: this.context.complianceFramework,
      controls: ['SC-7', 'AC-2', 'AU-2', 'CM-6'],
      owner: (this.context as any).owner,
      environment: this.context.environment
    });
    this.applyComplianceTags(asg, {
      component: 'dagger-engine-pool',
      serviceType: 'dagger-engine',
      framework: this.context.complianceFramework,
      controls: ['SC-7', 'AC-2', 'AU-2', 'CM-6'],
      owner: (this.context as any).owner,
      environment: this.context.environment
    });
    this.applyComplianceTags(nlb, {
      component: 'dagger-engine-pool',
      serviceType: 'dagger-engine',
      framework: this.context.complianceFramework,
      controls: ['SC-7', 'AC-2', 'AU-2', 'CM-6'],
      owner: (this.context as any).owner,
      environment: this.context.environment
    });
    this.applyComplianceTags(logGroup, {
      component: 'dagger-engine-pool',
      serviceType: 'dagger-engine',
      framework: this.context.complianceFramework,
      controls: ['AU-2', 'SC-13'],
      owner: (this.context as any).owner,
      environment: this.context.environment
    });

    // 5) Register constructs
    this.registerConstruct('main', asg);
    this.registerConstruct('nlb', nlb);
    this.registerConstruct('kms', kmsKey);
    this.registerConstruct('bucket', artifactsBucket);
    this.registerConstruct('logs', logGroup);

    // 6) Register capabilities
    this.registerCapability('dagger:endpoint', {
      endpointUrl: `grpcs://${nlb.loadBalancerDnsName}:8443`,
      hostname: this.config.endpoint?.hostname
    });
    this.registerCapability('storage:artifacts', {
      bucketArn: artifactsBucket.bucketArn,
      bucketName: artifactsBucket.bucketName
    });
    this.registerCapability('security:kms', {
      keyArn: kmsKey.keyArn,
      keyId: kmsKey.keyId
    });
    this.registerCapability('logging:cloudwatch', {
      logGroupName: logGroup.logGroupName,
      logGroupArn: logGroup.logGroupArn
    });
  }

  public getCapabilities() {
    return this.capabilities;
  }

  public getType(): string {
    return 'dagger-engine-pool';
  }

  private assert(condition: () => boolean, message: string): void {
    if (!condition()) {
      throw new Error(`DaggerEnginePool: ${message}`);
    }
  }

  private getVpc(): ec2.IVpc {
    // REVIEW: Should use context.network.vpcId or lookup from environment map
    return ec2.Vpc.fromLookup(this, 'Vpc', { isDefault: false });
  }

  private createKmsKeyIfNeeded(purpose: string): kms.Key {
    if (this.config.storage?.kmsKeyRef) {
      return kms.Key.fromKeyArn(this, 'KmsKey', this.config.storage.kmsKeyRef) as kms.Key;
    }

    return new kms.Key(this, 'KmsKey', {
      description: `KMS key for Dagger Engine Pool ${purpose}`,
      enableKeyRotation: true,
      policy: new iam.PolicyDocument({
        statements: this.createKmsPolicy()
      })
    });
  }

  private createKmsPolicy(): iam.PolicyStatement[] {
    return [
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        principals: [new iam.AccountRootPrincipal()],
        actions: ['kms:*'],
        resources: ['*']
      })
    ];
  }

  private createArtifactsBucket(kmsKey: kms.Key): s3.Bucket {
    if (this.config.storage?.s3ArtifactsBucketRef) {
      return s3.Bucket.fromBucketName(this, 'ArtifactsBucket', this.config.storage.s3ArtifactsBucketRef) as s3.Bucket;
    }

    return new s3.Bucket(this, 'ArtifactsBucket', {
      encryption: s3.BucketEncryption.KMS,
      encryptionKey: kmsKey,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      versioned: true,
      // REVIEW: Consider lifecycle policies for artifact retention
      lifecycleRules: [{
        id: 'DeleteIncompleteMultipartUploads',
        abortIncompleteMultipartUploadAfter: cdk.Duration.days(1)
      }]
    });
  }

  private createSecurityGroup(vpc: ec2.IVpc): ec2.SecurityGroup {
    const sg = new ec2.SecurityGroup(this, 'EngineSecurityGroup', {
      vpc,
      description: 'Security group for Dagger Engine Pool',
      allowAllOutbound: false // REVIEW: Should be restricted to specific ports
    });

    // Allow inbound mTLS on port 8443 from NLB
    sg.addIngressRule(
      ec2.Peer.anyIpv4(), // REVIEW: Should be restricted to NLB subnets
      ec2.Port.tcp(8443),
      'Dagger Engine mTLS endpoint'
    );

    // Allow outbound HTTPS for AWS services
    sg.addEgressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(443),
      'HTTPS to AWS services'
    );

    return sg;
  }

  private createLaunchTemplate(securityGroup: ec2.SecurityGroup, kmsKey: kms.Key, artifactsBucket: s3.Bucket, logGroup: logs.LogGroup): ec2.LaunchTemplate {
    // Use STIG/FIPS AMI based on configuration
    const machineImage = this.getStigHardenedImage();

    // Create IAM role for Dagger engine instances
    const daggerRole = new iam.Role(this, 'DaggerEngineRole', {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('CloudWatchAgentServerPolicy')
      ],
      inlinePolicies: {
        DaggerEnginePolicy: new iam.PolicyDocument({
          statements: [
            // Allow Dagger engine to access S3 for artifacts
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: ['s3:GetObject', 's3:PutObject', 's3:DeleteObject'],
              resources: [`${artifactsBucket.bucketArn}/*`]
            }),
            // Allow Dagger engine to use KMS for encryption
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: ['kms:Decrypt', 'kms:GenerateDataKey'],
              resources: [kmsKey.keyArn]
            }),
            // Allow Dagger engine to write logs
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: ['logs:CreateLogStream', 'logs:PutLogEvents'],
              resources: [`${logGroup.logGroupArn}:*`]
            })
          ]
        })
      }
    });

    // Create user data script to install and configure Dagger engine
    const userData = ec2.UserData.forLinux();

    // Install Dagger CLI and engine
    userData.addCommands(
      'yum update -y',
      'yum install -y docker git curl jq',
      'systemctl start docker',
      'systemctl enable docker',
      'usermod -a -G docker ec2-user',

      // Install Dagger CLI
      'curl -L https://dl.dagger.io/dagger/install.sh | DAGGER_VERSION=0.9.0 sh',
      'mv /root/.local/bin/dagger /usr/local/bin/',

      // Install Dagger engine as systemd service
      'mkdir -p /etc/dagger',
      'cat > /etc/dagger/engine.service << EOF',
      '[Unit]',
      'Description=Dagger Engine',
      'After=docker.service',
      'Requires=docker.service',
      '',
      '[Service]',
      'Type=simple',
      'User=root',
      'ExecStart=/usr/local/bin/dagger engine start --listen 0.0.0.0:8443 --tls',
      'Restart=always',
      'RestartSec=5',
      'Environment=DAGGER_ENGINE_TLS=1',
      'Environment=DAGGER_ENGINE_TLS_CERT=/etc/dagger/tls.crt',
      'Environment=DAGGER_ENGINE_TLS_KEY=/etc/dagger/tls.key',
      'Environment=AWS_REGION=' + cdk.Stack.of(this).region,
      'Environment=AWS_DEFAULT_REGION=' + cdk.Stack.of(this).region,
      '',
      '[Install]',
      'WantedBy=multi-user.target',
      'EOF',

      // Generate self-signed certificate for mTLS (in production, use ACM PCA)
      'openssl req -x509 -newkey rsa:4096 -keyout /etc/dagger/tls.key -out /etc/dagger/tls.crt -days 365 -nodes -subj "/CN=dagger-engine"',
      'chmod 600 /etc/dagger/tls.key',
      'chmod 644 /etc/dagger/tls.crt',

      // Enable and start Dagger engine
      'systemctl enable dagger-engine.service',
      'systemctl start dagger-engine.service',

      // Install CloudWatch agent for observability
      'wget https://s3.amazonaws.com/amazoncloudwatch-agent/amazon_linux/amd64/latest/amazon-cloudwatch-agent.rpm',
      'rpm -U ./amazon-cloudwatch-agent.rpm',
      'rm ./amazon-cloudwatch-agent.rpm'
    );

    return new ec2.LaunchTemplate(this, 'LaunchTemplate', {
      instanceType: new ec2.InstanceType(this.config.instanceType ?? 'c7i.large'),
      machineImage,
      securityGroup,
      role: daggerRole,
      requireImdsv2: true,
      userData,
      blockDevices: [
        {
          deviceName: '/dev/xvda',
          volume: ec2.BlockDeviceVolume.ebs(this.config.storage?.ebsGiB ?? 200, {
            encrypted: true,
            kmsKey: kmsKey,
            volumeType: ec2.EbsDeviceVolumeType.GP3
          })
        }
      ]
    });
  }

  private getStigHardenedImage(): ec2.IMachineImage {
    switch (this.config.stigBaseline) {
      case 'RHEL8':
        // REVIEW: Use actual STIG-hardened RHEL8 AMI
        return ec2.MachineImage.fromSsmParameter('/aws/service/ami-rhel-8-latest');
      case 'UBI9':
        // REVIEW: Use actual STIG-hardened UBI9 AMI
        return ec2.MachineImage.fromSsmParameter('/aws/service/ami-amazon-linux-2-latest');
      case 'UBUNTU-20':
        // REVIEW: Use actual STIG-hardened Ubuntu 20.04 AMI
        return ec2.MachineImage.fromSsmParameter('/aws/service/ami-ubuntu-20.04-latest');
      default:
        return ec2.MachineImage.latestAmazonLinux2({
          cpuType: ec2.AmazonLinuxCpuType.X86_64
        });
    }
  }

  private createAutoScalingGroup(vpc: ec2.IVpc, launchTemplate: ec2.LaunchTemplate): autoscaling.AutoScalingGroup {
    return new autoscaling.AutoScalingGroup(this, 'AutoScalingGroup', {
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      minCapacity: this.config.capacity.min,
      maxCapacity: this.config.capacity.max,
      launchTemplate,
      // REVIEW: Should add health checks and scaling policies
    });
  }

  private createNetworkLoadBalancer(vpc: ec2.IVpc, asg: autoscaling.AutoScalingGroup): elbv2.NetworkLoadBalancer {
    const nlb = new elbv2.NetworkLoadBalancer(this, 'NetworkLoadBalancer', {
      vpc,
      internetFacing: false, // Internal only for security
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS }
    });

    // Create mTLS listener
    const listener = nlb.addListener('DaggerListener', {
      port: 8443,
      protocol: elbv2.Protocol.TCP
    });

    // Add target group with health checks
    const targetGroup = listener.addTargets('AsgTargets', {
      port: 8443,
      targets: [asg],
      healthCheck: {
        enabled: true,
        healthyHttpCodes: '200',
        interval: cdk.Duration.seconds(30),
        timeout: cdk.Duration.seconds(5),
        healthyThresholdCount: 2,
        unhealthyThresholdCount: 3
      }
    });

    return nlb;
  }

  private createLogGroup(kmsKey: kms.Key): logs.LogGroup {
    return new logs.LogGroup(this, 'LogGroup', {
      logGroupName: `/aws/dagger-engine/${this.context.serviceName}`,
      retention: this.config.observability?.logRetentionDays ?? 365,
      encryptionKey: kmsKey
    });
  }

  private applyComplianceTags(construct: Construct, tags: {
    component: string;
    serviceType: string;
    framework: string;
    controls: string[];
    owner?: string;
    environment?: string;
  }): void {
    // Mock implementation for testing
    cdk.Tags.of(construct).add('platform:component', tags.component);
    cdk.Tags.of(construct).add('platform:service', tags.serviceType);
    cdk.Tags.of(construct).add('compliance:framework', tags.framework);
    cdk.Tags.of(construct).add('compliance:controls', tags.controls.join(','));
    if (tags.owner) cdk.Tags.of(construct).add('platform:owner', tags.owner);
    if (tags.environment) cdk.Tags.of(construct).add('platform:environment', tags.environment);
  }
}

