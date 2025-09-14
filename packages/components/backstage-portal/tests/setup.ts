/**
 * Jest setup file for Backstage Portal component tests
 */

// Export mocks as modules for moduleNameMapper
export const BaseComponent = class MockBaseComponent {
  context: any;
  spec: any;
  logger: any;

  constructor(scope: any, id: string, context: any, spec: any) {
    this.context = context;
    this.spec = spec;
    this.logger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    };
  }

  getLogger() {
    return this.logger;
  }

  registerCapability(key: string, value: any) {
    // Mock capability registration
  }

  applyStandardTags(construct: any) {
    // Mock tag application
  }

  _registerConstruct(alias: string, construct: any) {
    // Mock construct registration
  }

  _registerCapability(capabilityKey: string, data: any) {
    // Mock capability registration
  }

  _createKmsKeyIfNeeded(purpose: string) {
    // Mock KMS key creation
    return {
      keyId: `mock-kms-key-${purpose}`,
      keyArn: `arn:aws:kms:us-east-1:123456789012:key/mock-kms-key-${purpose}`
    };
  }

  _createVpcIfNeeded() {
    // Mock VPC creation
    return {
      vpcId: 'mock-vpc-id',
      vpcArn: 'arn:aws:ec2:us-east-1:123456789012:vpc/mock-vpc-id'
    };
  }
};

export const IComponent = {}; // Mock IComponent as an empty object

export const ConfigBuilder = class MockConfigBuilder {
  builderContext: any;

  constructor(builderContext: any, schema: any) {
    this.builderContext = builderContext;
  }

  buildSync() {
    return {
      ...this.builderContext.spec,
      environment: this.builderContext.context.environment || 'dev',
      complianceFramework: this.builderContext.context.complianceFramework || 'commercial',
      portal: {
        name: 'Shinobi Developer Portal',
        organization: 'Shinobi Platform',
        description: 'Developer portal for Shinobi platform components and services',
        baseUrl: 'https://backstage.shinobi.local'
      },
      database: {
        instanceClass: 'db.t3.micro',
        allocatedStorage: 20,
        maxAllocatedStorage: 100,
        backupRetentionDays: 7,
        multiAz: false,
        deletionProtection: true
      },
      backend: {
        desiredCount: 2,
        cpu: 512,
        memory: 1024,
        healthCheckPath: '/health',
        healthCheckInterval: 30
      },
      frontend: {
        desiredCount: 2,
        cpu: 256,
        memory: 512,
        healthCheckPath: '/',
        healthCheckInterval: 30
      },
      ecr: {
        maxImageCount: 10,
        imageScanOnPush: true
      },
      observability: {
        logRetentionDays: 30,
        cpuThreshold: 80,
        memoryThreshold: 85,
        enableTracing: true,
        enableMetrics: true
      },
      security: {
        enableEncryption: true,
        enableVpcFlowLogs: true,
        enableWaf: false
      },
      auth: {
        provider: 'github',
        github: {
          clientId: 'mock-client-id',
          clientSecret: 'mock-client-secret',
          organization: 'shinobi-platform'
        }
      },
      catalog: {
        providers: [{
          type: 'github',
          id: 'shinobi-platform',
          org: 'shinobi-platform',
          catalogPath: '/catalog-info.yaml'
        }]
      }
    };
  }

  getHardcodedFallbacks() {
    return {
      environment: 'dev',
      complianceFramework: 'commercial',
      portal: {
        name: 'Shinobi Developer Portal',
        organization: 'Shinobi Platform',
        description: 'Developer portal for Shinobi platform components and services',
        baseUrl: 'https://backstage.shinobi.local'
      }
    };
  }

  getComplianceFrameworkDefaults() {
    const framework = this.builderContext.context.complianceFramework || 'commercial';

    const frameworkDefaults: Record<string, any> = {
      'commercial': {
        security: { enableEncryption: true, enableVpcFlowLogs: true, enableWaf: false },
        observability: { logRetentionDays: 30, cpuThreshold: 80, memoryThreshold: 85 }
      },
      'fedramp-moderate': {
        database: { multiAz: true, deletionProtection: true, backupRetentionDays: 14 },
        security: { enableEncryption: true, enableVpcFlowLogs: true, enableWaf: true },
        observability: { logRetentionDays: 90, cpuThreshold: 70, memoryThreshold: 80 }
      },
      'fedramp-high': {
        database: { multiAz: true, deletionProtection: true, backupRetentionDays: 30 },
        security: { enableEncryption: true, enableVpcFlowLogs: true, enableWaf: true },
        observability: { logRetentionDays: 180, cpuThreshold: 60, memoryThreshold: 75 }
      },
      'iso27001': {
        database: { multiAz: true, deletionProtection: true, backupRetentionDays: 21 },
        security: { enableEncryption: true, enableVpcFlowLogs: true, enableWaf: true },
        observability: { logRetentionDays: 120, cpuThreshold: 75, memoryThreshold: 80 }
      },
      'soc2': {
        database: { multiAz: true, deletionProtection: true, backupRetentionDays: 14 },
        security: { enableEncryption: true, enableVpcFlowLogs: true, enableWaf: true },
        observability: { logRetentionDays: 90, cpuThreshold: 75, memoryThreshold: 80 }
      }
    };

    return frameworkDefaults[framework] || frameworkDefaults['commercial'];
  }

  getEnvironmentDefaults() {
    const env = this.builderContext.context.environment || 'dev';

    const envDefaults: Record<string, any> = {
      dev: {
        environment: 'dev',
        backend: { desiredCount: 1, cpu: 256, memory: 512 },
        frontend: { desiredCount: 1, cpu: 256, memory: 512 },
        database: { instanceClass: 'db.t3.micro', allocatedStorage: 20 },
        observability: { logRetentionDays: 7, cpuThreshold: 90, memoryThreshold: 90 }
      },
      staging: {
        environment: 'staging',
        backend: { desiredCount: 2, cpu: 512, memory: 1024 },
        frontend: { desiredCount: 2, cpu: 256, memory: 512 },
        database: { instanceClass: 'db.t3.small', allocatedStorage: 50 },
        observability: { logRetentionDays: 14, cpuThreshold: 80, memoryThreshold: 85 }
      },
      prod: {
        environment: 'prod',
        backend: { desiredCount: 3, cpu: 1024, memory: 2048 },
        frontend: { desiredCount: 3, cpu: 512, memory: 1024 },
        database: { instanceClass: 'db.t3.medium', allocatedStorage: 100 },
        observability: { logRetentionDays: 30, cpuThreshold: 70, memoryThreshold: 80 }
      }
    };

    return envDefaults[env] || envDefaults['dev'];
  }

  getPlatformDefaults() {
    return {
      portal: {
        name: 'Shinobi Developer Portal',
        organization: 'Shinobi Platform',
        description: 'Developer portal for Shinobi platform components and services',
        baseUrl: 'https://backstage.shinobi.local'
      },
      security: { enableEncryption: true, enableVpcFlowLogs: true, enableWaf: false },
      observability: { enableTracing: true, enableMetrics: true }
    };
  }
};

// Mock AWS CDK constructs
jest.mock('aws-cdk-lib', () => ({
  ...jest.requireActual('aws-cdk-lib'),
  Duration: {
    seconds: (value: number) => ({ toSeconds: () => value }),
    minutes: (value: number) => ({ toMinutes: () => value }),
    hours: (value: number) => ({ toHours: () => value }),
    days: (value: number) => ({ toDays: () => value })
  },
  RemovalPolicy: {
    DESTROY: 'DESTROY',
    RETAIN: 'RETAIN'
  }
}));

// Mock AWS CDK ECS constructs
jest.mock('aws-cdk-lib/aws-ecs', () => ({
  ...jest.requireActual('aws-cdk-lib/aws-ecs'),
  Cluster: jest.fn().mockImplementation(() => ({
    clusterName: 'mock-cluster',
    clusterArn: 'arn:aws:ecs:us-east-1:123456789012:cluster/mock-cluster',
    vpc: { vpcId: 'mock-vpc-id' },
    metricCpuUtilization: jest.fn().mockReturnValue({}),
    metricMemoryUtilization: jest.fn().mockReturnValue({}),
    metricRunningTaskCount: jest.fn().mockReturnValue({})
  })),
  FargateService: jest.fn().mockImplementation(() => ({
    serviceName: 'mock-service',
    serviceArn: 'arn:aws:ecs:us-east-1:123456789012:service/mock-service',
    attachToApplicationTargetGroup: jest.fn()
  })),
  FargateTaskDefinition: jest.fn().mockImplementation(() => ({
    family: 'mock-task-family',
    taskDefinitionArn: 'arn:aws:ecs:us-east-1:123456789012:task-definition/mock-task-family',
    addContainer: jest.fn().mockReturnValue({})
  })),
  ContainerImage: {
    fromEcrRepository: jest.fn().mockReturnValue({})
  },
  LogDrivers: {
    awsLogs: jest.fn().mockReturnValue({})
  },
  Protocol: {
    TCP: 'TCP',
    UDP: 'UDP'
  }
}));

// Mock AWS CDK ELB constructs
jest.mock('aws-cdk-lib/aws-elasticloadbalancingv2', () => ({
  ...jest.requireActual('aws-cdk-lib/aws-elasticloadbalancingv2'),
  ApplicationLoadBalancer: jest.fn().mockImplementation(() => ({
    loadBalancerName: 'mock-alb',
    loadBalancerArn: 'arn:aws:elasticloadbalancing:us-east-1:123456789012:loadbalancer/app/mock-alb',
    loadBalancerDnsName: 'mock-alb-1234567890.us-east-1.elb.amazonaws.com',
    addListener: jest.fn().mockReturnValue({
      addTargetGroups: jest.fn()
    })
  })),
  ApplicationTargetGroup: jest.fn().mockImplementation(() => ({
    targetGroupName: 'mock-target-group',
    targetGroupArn: 'arn:aws:elasticloadbalancing:us-east-1:123456789012:targetgroup/mock-target-group'
  })),
  TargetType: {
    IP: 'ip',
    INSTANCE: 'instance'
  },
  ApplicationProtocol: {
    HTTP: 'HTTP',
    HTTPS: 'HTTPS'
  },
  Protocol: {
    HTTP: 'HTTP',
    HTTPS: 'HTTPS'
  },
  ListenerCondition: {
    pathPatterns: jest.fn().mockReturnValue({})
  }
}));

// Mock AWS CDK ECR constructs
jest.mock('aws-cdk-lib/aws-ecr', () => ({
  ...jest.requireActual('aws-cdk-lib/aws-ecr'),
  Repository: jest.fn().mockImplementation(() => ({
    repositoryName: 'mock-repo',
    repositoryUri: '123456789012.dkr.ecr.us-east-1.amazonaws.com/mock-repo',
    repositoryArn: 'arn:aws:ecr:us-east-1:123456789012:repository/mock-repo'
  })),
  TagMutability: {
    MUTABLE: 'MUTABLE',
    IMMUTABLE: 'IMMUTABLE'
  },
  RepositoryEncryption: {
    KMS: 'KMS',
    AES_256: 'AES_256'
  }
}));

// Mock AWS CDK CloudWatch constructs
jest.mock('aws-cdk-lib/aws-cloudwatch', () => ({
  ...jest.requireActual('aws-cdk-lib/aws-cloudwatch'),
  Alarm: jest.fn().mockImplementation(() => ({
    alarmName: 'mock-alarm',
    alarmArn: 'arn:aws:cloudwatch:us-east-1:123456789012:alarm/mock-alarm'
  })),
  TreatMissingData: {
    NOT_BREACHING: 'notBreaching',
    BREACHING: 'breaching'
  },
  ComparisonOperator: {
    LESS_THAN_THRESHOLD: 'LessThanThreshold',
    GREATER_THAN_THRESHOLD: 'GreaterThanThreshold'
  }
}));

// Mock AWS CDK Logs constructs
jest.mock('aws-cdk-lib/aws-logs', () => ({
  ...jest.requireActual('aws-cdk-lib/aws-logs'),
  LogGroup: jest.fn().mockImplementation(() => ({
    logGroupName: 'mock-log-group',
    logGroupArn: 'arn:aws:logs:us-east-1:123456789012:log-group:mock-log-group'
  })),
  RetentionDays: {
    of: jest.fn().mockReturnValue(30)
  }
}));

// Mock AWS CDK IAM constructs
jest.mock('aws-cdk-lib/aws-iam', () => ({
  ...jest.requireActual('aws-cdk-lib/aws-iam'),
  Role: jest.fn().mockImplementation(() => ({
    roleName: 'mock-role',
    roleArn: 'arn:aws:iam::123456789012:role/mock-role'
  })),
  ServicePrincipal: jest.fn().mockImplementation((service: string) => service),
  AccountRootPrincipal: jest.fn().mockImplementation(() => 'root'),
  ManagedPolicy: {
    fromAwsManagedPolicyName: jest.fn().mockReturnValue({})
  },
  PolicyDocument: jest.fn().mockImplementation(() => ({})),
  PolicyStatement: jest.fn().mockImplementation(() => ({})),
  Effect: {
    ALLOW: 'Allow',
    DENY: 'Deny'
  }
}));

// Mock AWS CDK EC2 constructs
jest.mock('aws-cdk-lib/aws-ec2', () => ({
  ...jest.requireActual('aws-cdk-lib/aws-ec2'),
  Vpc: jest.fn().mockImplementation(() => ({
    vpcId: 'mock-vpc-id',
    vpcArn: 'arn:aws:ec2:us-east-1:123456789012:vpc/mock-vpc-id'
  })),
  SubnetType: {
    PUBLIC: 'public',
    PRIVATE: 'private',
    PRIVATE_WITH_EGRESS: 'private-with-egress'
  }
}));

// Mock AWS CDK Secrets Manager constructs
jest.mock('aws-cdk-lib/aws-secretsmanager', () => ({
  ...jest.requireActual('aws-cdk-lib/aws-secretsmanager'),
  Secret: {
    fromSecretNameV2: jest.fn().mockImplementation((scope: any, id: string, secretName: string) => ({
      secretName,
      secretArn: `arn:aws:secretsmanager:us-east-1:123456789012:secret:${secretName}`
    }))
  }
}));

// Mock AWS CDK KMS constructs
jest.mock('aws-cdk-lib/aws-kms', () => ({
  ...jest.requireActual('aws-cdk-lib/aws-kms'),
  Key: jest.fn().mockImplementation(() => ({
    keyId: 'mock-key-id',
    keyArn: 'arn:aws:kms:us-east-1:123456789012:key/mock-key-id'
  }))
}));
