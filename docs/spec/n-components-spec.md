High-Priority Component Implementation Specification
Version: 1.0
Status: Published
Last Updated: September 8, 2025

1. Overview & Vision
This document provides the definitive engineering specification for the implementation of the top three high-priority components identified in the "CDK Component Library Analysis Report." The vision is to take the common, repetitive patterns discovered in our existing codebase and transform them into hardened, reusable, and easy-to-use L3 components within our platform.

This specification translates the traditional CDK-style proposals from the report into our platform's declarative, compliance-aware architectural model. Each component specified herein MUST adhere to all established platform standards, including:

Extending the BaseComponent.

Using a dedicated, layered ConfigBuilder.

Providing a complete JSON Schema.

Integrating our Tagging, Logging, and Observability standards.

2. Component: ecs-fargate-service (from StandardizedFargateService)
Priority: High

Analysis: This is the highest-value component, addressing a pattern observed over 25 times. The report correctly identifies that the core developer concerns are the container image, resource allocation, and scaling. Our platform will abstract away the underlying complexity of task definitions, logging, and security groups.

2.1. Developer Experience (service.yml Manifest)
The developer declares their intent with a simple, application-focused config block.

# A developer declares this in their service.yml
- name: my-app-service
  type: ecs-fargate-service
  config:
    # Core developer inputs
    image:
      repository: "[123456789012.dkr.ecr.us-east-1.amazonaws.com/my-app](https://123456789012.dkr.ecr.us-east-1.amazonaws.com/my-app)"
      tag: "1.2.3"
    port: 8080
    cpu: 1024    # 1 vCPU
    memory: 2048 # 2 GB
    
    # Simple, declarative auto-scaling
    autoScaling:
      minCapacity: 2
      maxCapacity: 10
      targetCpuUtilization: 75

    # Simple key-value for environment variables and secrets
    environment:
      LOG_LEVEL: "info"
      FEATURE_FLAG_ENDPOINT: "${ref:feature-flags.capability.endpoint}"
    secrets:
      DATABASE_CREDENTIALS: "${ref:customer-db.capability.secretArn}"

2.2. Internal Component Logic (EcsFargateServiceComponent)
The component's synth() method will be responsible for composing the necessary native CDK constructs.

ConfigBuilder Logic: The EcsFargateServiceConfigBuilder will apply compliance-aware defaults. For any fedramp-high environment, it will automatically:

Set desiredCount and autoScaling.minCapacity to a minimum of 2 for high availability.

Enable enableExecuteCommand for auditable access.

Synthesis Logic:

It creates a dedicated logs.LogGroup for the service.

It creates a dedicated iam.Role for the task.

It instantiates an ecs.FargateTaskDefinition, adding a container with the specified image, port mappings, and logging configuration (using the awslogs log driver).

It instantiates a dedicated ec2.SecurityGroup for the service.

Finally, it creates the ecs.FargateService, associating it with the cluster (retrieved from context), the task definition, and the security group.

Observability Service Integration: The ObservabilityService (our service injector) will automatically apply alarms for CPUUtilization, MemoryUtilization, and RunningTaskCount to every ecs-fargate-service.

3. Component: rds-postgres (from SecureRdsDatabaseInstance)
Priority: High

Analysis: The report correctly identifies that database configuration is complex and must be standardized. Our platform component will abstract away the need for developers to manage credentials, encryption keys, or VPC placement.

3.1. Developer Experience (service.yml Manifest)
The developer provides only the essential, business-logic parameters.

- name: customer-database
  type: rds-postgres
  config:
    dbName: "customerdb"
    # These are the simple, business-logic knobs.
    instanceClass: "db.r5.large"
    allocatedStorage: 100

3.2. Internal Component Logic (RdsPostgresComponent)
The component's synth() method handles all the complexity under the hood.

ConfigBuilder Logic: The RdsPostgresConfigBuilder is the primary engine for compliance. For any fedramp-moderate or fedramp-high environment, it will automatically override the configuration to:

Enable multiAz.

Enable deletionProtection.

Increase backupRetentionDays to a minimum of 30.

Enable performanceInsights.

Synthesis Logic:

It calls the _createKmsKeyIfNeeded helper from the BaseComponent to provision a CMK for all FedRAMP environments.

It creates a secretsmanager.Secret to automatically generate and store the master user credentials.

For fedramp-high environments, it creates a STIG-compliant rds.ParameterGroup.

It creates a dedicated ec2.SecurityGroup for the instance.

It instantiates the rds.DatabaseInstance, placing it in the Database subnets of the VPC provided by the ComponentContext and configuring it with the secret, KMS key, and security group.

Observability Service Integration: The ObservabilityService will automatically apply alarms for CPUUtilization, FreeStorageSpace, and DatabaseConnections.

4. Component: application-load-balancer
Priority: High

Analysis: The report correctly identifies that ALB configuration is highly repetitive. Our component will provide a simple listener configuration while the platform handles security and logging.

4.1. Developer Experience (service.yml Manifest)
A developer simply defines how the ALB should listen for traffic and what it connects to.

- name: web-entrypoint
  type: application-load-balancer
  config:
    listeners:
      - port: 443
        protocol: "HTTPS"
        # The certificate ARN can be a static value or a reference
        certificateArn: "${ref:shared-cert.capability.arn}"
    
    # This component can be a target for a WAF
    triggers:
      - from: my-waf
        eventType: waf-association

    # This component can be a target for a CloudFront distribution
    triggers:
      - from: my-cdn
        eventType: cdn-origin

4.2. Internal Component Logic (ApplicationLoadBalancerComponent)
The component's synth() method handles the composition of all necessary ALB resources.

ConfigBuilder Logic: The ApplicationLoadBalancerConfigBuilder is the primary engine for compliance and best practices. For any fedramp-moderate or fedramp-high environment, it will automatically:

Enable accessLogs.

Apply a stricter, modern SSL/TLS security policy (e.g., ELBSecurityPolicy-TLS-1-2-Ext-2018-06) for all HTTPS listeners.

Synthesis Logic:

It creates an s3.Bucket to serve as the destination for access logs if logging is enabled and a bucket is not provided.

It creates a dedicated ec2.SecurityGroup for the ALB, configured to allow inbound traffic on the listener ports.

It instantiates the elbv2.ApplicationLoadBalancer, placing it in the Public subnets of the VPC provided by the ComponentContext.

It then iterates through the listeners config and creates the necessary elbv2.ApplicationListener resources, associating them with the load balancer.

It creates a default elbv2.ApplicationTargetGroup that can be used by other components.

Feature Flagging Standard Integration: The component MUST be enhanced to support the deploymentStrategy: blue-green configuration. When this is specified, it will provision the necessary multiple elbv2.ApplicationTargetGroup constructs required by AWS CodeDeploy to perform traffic shifting.

Observability Service Integration: The ObservabilityService will automatically apply alarms for HTTPCode_Target_5XX_Count and UnHealthyHostCount to every application-load-balancer.