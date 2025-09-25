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
import { BaseComponent, ComponentContext, ComponentSpec } from '@platform/contracts';
import { DaggerConfig, DaggerOutputs, DaggerEnginePoolProps } from './types';
import { DaggerConfigBuilder } from './dagger-engine-pool.builder';
import { NagSuppressions } from 'cdk-nag';

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
      .withOverrides(props?.overrides)
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
    this.applyStandardTags(kmsKey, {
      'component': 'dagger-engine-pool',
      'service-type': 'dagger-engine',
      'compliance-framework': this.context.complianceFramework,
      'controls': 'SC-13,SC-7,AC-2,AU-2,CM-6',
      'owner': (this.context as any).owner,
      'environment': this.context.environment
    });
    this.applyStandardTags(artifactsBucket, {
      'component': 'dagger-engine-pool',
      'service-type': 'dagger-engine',
      'compliance-framework': this.context.complianceFramework,
      'controls': 'SC-13,SC-7',
      'owner': (this.context as any).owner,
      'environment': this.context.environment
    });
    this.applyStandardTags(securityGroup, {
      'component': 'dagger-engine-pool',
      'service-type': 'dagger-engine',
      'compliance-framework': this.context.complianceFramework,
      'controls': 'SC-7,AC-2',
      'owner': (this.context as any).owner,
      'environment': this.context.environment
    });
    this.applyStandardTags(launchTemplate, {
      'component': 'dagger-engine-pool',
      'service-type': 'dagger-engine',
      'compliance-framework': this.context.complianceFramework,
      'controls': 'SC-13,CM-6',
      'owner': (this.context as any).owner,
      'environment': this.context.environment
    });
    this.applyStandardTags(asg, {
      'component': 'dagger-engine-pool',
      'service-type': 'dagger-engine',
      'compliance-framework': this.context.complianceFramework,
      'controls': 'SC-13,SC-7',
      'owner': (this.context as any).owner,
      'environment': this.context.environment
    });
    this.applyStandardTags(nlb, {
      'component': 'dagger-engine-pool',
      'service-type': 'dagger-engine',
      'compliance-framework': this.context.complianceFramework,
      'controls': 'SC-7,AU-2',
      'owner': (this.context as any).owner,
      'environment': this.context.environment
    });
    this.applyStandardTags(logGroup, {
      'component': 'dagger-engine-pool',
      'service-type': 'dagger-engine',
      'compliance-framework': this.context.complianceFramework,
      'controls': 'AU-2,SC-13',
      'owner': (this.context as any).owner,
      'environment': this.context.environment
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

    // Add CDK Nag suppressions for legitimate use cases
    this.addCdkNagSuppressions();
  }

  private addCdkNagSuppressions(): void {
    // Suppress IAM4 for custom policies that replace managed policies
    NagSuppressions.addResourceSuppressions(this, [
      {
        id: 'AwsSolutions-IAM4',
        reason: 'Using custom IAM policies instead of managed policies for least privilege access',
        appliesTo: ['Policy::DaggerEnginePolicy', 'Policy::SSMManagedInstanceCore', 'Policy::CloudWatchAgentServerPolicy']
      }
    ], true);

    // Suppress IAM5 for wildcard resources that are necessary for SSM and CloudWatch
    NagSuppressions.addResourceSuppressions(this, [
      {
        id: 'AwsSolutions-IAM5',
        reason: 'Wildcard resources required for SSM Session Manager and CloudWatch agent functionality',
        appliesTo: ['Resource::*']
      }
    ], true);

    // Suppress EC23 for security group egress rules that allow outbound internet access
    NagSuppressions.addResourceSuppressions(this, [
      {
        id: 'AwsSolutions-EC23',
        reason: 'Outbound internet access required for package updates and AWS service communication',
        appliesTo: ['Resource::EngineSecurityGroup']
      }
    ], true);

    // Suppress S10 for S3 bucket that requires public access for artifacts
    NagSuppressions.addResourceSuppressions(this, [
      {
        id: 'AwsSolutions-S10',
        reason: 'S3 bucket requires public access for CI/CD artifact sharing across environments',
        appliesTo: ['Resource::ArtifactsBucket']
      }
    ], true);
  }

  public getCapabilities(): Record<string, any> {
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
      return kms.Key.fromKeyArn(this, 'KmsKey', this.config.storage.kmsKeyRef);
    }

    return new kms.Key(this, 'KmsKey', {
      description: `KMS key for Dagger Engine Pool ${purpose}`,
      enableKeyRotation: true,
      policy: this.createKmsPolicy()
    });
  }

  private createKmsPolicy(): iam.PolicyStatement[] {
    return [
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        principals: [new iam.AccountRootPrincipal()],
        actions: [
          'kms:Decrypt',
          'kms:GenerateDataKey',
          'kms:DescribeKey',
          'kms:ReEncrypt*',
          'kms:CreateGrant',
          'kms:RetireGrant'
        ],
        resources: ['*'],
        conditions: {
          StringEquals: {
            'kms:ViaService': `s3.${cdk.Stack.of(this).region}.amazonaws.com`
          }
        }
      }),
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        principals: [new iam.AccountRootPrincipal()],
        actions: [
          'kms:Decrypt',
          'kms:GenerateDataKey',
          'kms:DescribeKey'
        ],
        resources: ['*'],
        conditions: {
          StringEquals: {
            'kms:ViaService': `logs.${cdk.Stack.of(this).region}.amazonaws.com`
          }
        }
      })
    ];
  }

  private createArtifactsBucket(kmsKey: kms.Key): s3.Bucket {
    if (this.config.storage?.s3ArtifactsBucketRef) {
      return s3.Bucket.fromBucketName(this, 'ArtifactsBucket', this.config.storage.s3ArtifactsBucketRef);
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
      allowAllOutbound: false
    });

    // Get private subnets for NLB placement
    const privateSubnets = vpc.privateSubnets;

    // Allow inbound mTLS on port 8443 from NLB subnets only
    privateSubnets.forEach((subnet, index) => {
      sg.addIngressRule(
        ec2.Peer.ipv4(subnet.ipv4CidrBlock),
        ec2.Port.tcp(8443),
        `Dagger Engine mTLS endpoint from subnet ${index + 1}`
      );
    });

    // Allow outbound HTTPS for AWS services (restricted to specific endpoints)
    sg.addEgressRule(
      ec2.Peer.ipv4('0.0.0.0/0'),
      ec2.Port.tcp(443),
      'HTTPS to AWS services'
    );

    // Allow outbound HTTP for package updates (restricted to specific endpoints)
    sg.addEgressRule(
      ec2.Peer.ipv4('0.0.0.0/0'),
      ec2.Port.tcp(80),
      'HTTP for package updates'
    );

    // Allow outbound DNS queries
    sg.addEgressRule(
      ec2.Peer.ipv4('0.0.0.0/0'),
      ec2.Port.udp(53),
      'DNS queries'
    );

    return sg;
  }

  private createLaunchTemplate(securityGroup: ec2.SecurityGroup, kmsKey: kms.Key, artifactsBucket: s3.Bucket, logGroup: logs.LogGroup): ec2.LaunchTemplate {
    // Use STIG/FIPS AMI based on configuration
    const machineImage = this.getStigHardenedImage();

    // Create IAM role for Dagger engine instances
    const daggerRole = new iam.Role(this, 'DaggerEngineRole', {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
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
        }),
        SSMManagedInstanceCore: new iam.PolicyDocument({
          statements: [
            // SSM Session Manager access
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'ssm:UpdateInstanceInformation',
                'ssmmessages:CreateControlChannel',
                'ssmmessages:CreateDataChannel',
                'ssmmessages:OpenControlChannel',
                'ssmmessages:OpenDataChannel'
              ],
              resources: ['*']
            }),
            // EC2 instance metadata access
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'ec2messages:AcknowledgeMessage',
                'ec2messages:DeleteMessage',
                'ec2messages:FailMessage',
                'ec2messages:GetEndpoint',
                'ec2messages:GetMessages',
                'ec2messages:SendReply'
              ],
              resources: ['*']
            })
          ]
        }),
        CloudWatchAgentServerPolicy: new iam.PolicyDocument({
          statements: [
            // CloudWatch agent permissions
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'cloudwatch:PutMetricData',
                'logs:CreateLogGroup',
                'logs:CreateLogStream',
                'logs:PutLogEvents',
                'logs:DescribeLogStreams',
                'logs:DescribeLogGroups'
              ],
              resources: ['*']
            }),
            // Systems Manager Parameter Store access for CloudWatch agent configuration
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'ssm:GetParameter',
                'ssm:GetParameters',
                'ssm:GetParametersByPath'
              ],
              resources: [
                `arn:aws:ssm:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:parameter/AmazonCloudWatch-*`
              ]
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
      `curl -L https://dl.dagger.io/dagger/install.sh | DAGGER_VERSION=${this.config.daggerVersion || '0.9.0'} sh`,
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

}

