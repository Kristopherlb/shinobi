Platform ECS Service Connect Standard
Version: 1.0
Status: Published
Last Updated: September 7, 2025

1. Overview & Vision
This document defines the specification for integrating ECS Service Connect into the platform. Secure, resilient, and discoverable service-to-service communication is the foundation of any modern microservices architecture. This standard aims to make this complex capability a simple, declarative, and turnkey feature for developers.

The vision is to provide a unified experience for service discovery and networking, regardless of whether a service is running on serverless AWS Fargate or traditional EC2 instances. A developer should not need to be an expert in AWS Cloud Map, DNS, or security group management. They should simply declare that their service needs to be discoverable and which other services it needs to communicate with. The platform abstracts the rest.

2. Guiding Principles
Declarative: All Service Connect configuration MUST be defined in the service.yml manifest.

Secure by Default: The platform MUST automatically configure the necessary security group rules to allow traffic only between services that have an explicit binding, adhering to the principle of least privilege.

Compute Agnostic: The developer experience for defining, discovering, and binding to a service MUST be identical for both Fargate and EC2-based services.

Abstracted Complexity: The developer interacts with a simple service name (e.g., http://payments.internal); the platform handles the underlying Cloud Map namespace, DNS registration, and port mapping automatically.

3. Architectural Implementation
This standard is implemented through a new foundational component (ecs-cluster), two distinct service components (ecs-fargate-service, ecs-ec2-service), and a single, powerful binder strategy.

3.1. Foundational Component: ecs-cluster
The ecs-cluster component is the central pillar of this standard. It defines the logical boundary and shared resources for a group of microservices.

Purpose: To create an ECS Cluster and, critically, the shared AWS Cloud Map namespace that enables Service Connect. It can be configured to be a Fargate-only cluster or to provision its own EC2 compute capacity.

config Schema:

type: object
properties:
  serviceConnect:
    type: object
    properties:
      namespace:
        type: string # e.g., "internal", "my-app.internal"
  capacity: # This block is OPTIONAL. If present, an EC2-based cluster is created.
    type: object
    properties:
      instanceType:
        type: string # e.g., "t3.medium"
      minSize:
        type: number
      maxSize:
        type: number

Internal Logic:

The EcsClusterComponent's synth() method creates an ecs.Cluster construct.

If config.serviceConnect.namespace is defined, it configures the defaultCloudMapNamespace property on the cluster.

If config.capacity is defined, it internally instantiates our platform's auto-scaling-group component to create a managed fleet of EC2 instances and adds them to the cluster via an ecs.AsgCapacityProvider.

Provided Capability: ecs:cluster - { clusterName, vpcId, serviceConnectNamespace }

3.2. Service Components: Fargate & EC2
The platform provides two distinct components for deploying services, with nearly identical developer experiences.

Component type

Description

Key config Properties

ecs-fargate-service

A serverless containerized service.

cluster, image, cpu, memory, port, serviceConnect

ecs-ec2-service

A containerized service running on the cluster's shared EC2 instances.

cluster, image, taskCpu, taskMemory, port, serviceConnect

The serviceConnect Block: The configuration for enabling service discovery is identical for both components.

# In the config block for either fargate or ec2 service
serviceConnect:
  portMappingName: "api" # A friendly, logical name for the exposed container port

Internal Logic: Both components' synth() methods will instantiate their respective CDK L2 constructs (ecs.FargateService or ecs.Ec2Service). They will then configure the serviceConnectConfiguration property, registering the service with the cluster's Cloud Map namespace.

3.3. Binder Strategy: ComputeToServiceConnectBinder
A single, powerful binder handles all inbound connections to a discoverable service, demonstrating the power of our capability-based binding model.

StrategyKey: *:service:connect (Handles any source type binding to this capability).

Logic:

It retrieves the ec2.SecurityGroup handle from the target service component.

It retrieves the ec2.SecurityGroup handle from the source compute component (which could be another ECS service, a Lambda function, or an EC2 instance).

It then calls targetSecurityGroup.connections.allowFrom(sourceSecurityGroup, ec2.Port.allTcp()). The CDK automatically creates a precise security group rule allowing the client to talk to the server. The binder is completely agnostic to whether the underlying tasks are Fargate or EC2.

4. The End-to-End Developer Experience
The following examples demonstrate how a developer can declaratively define a client-server architecture using either Fargate or EC2, with minimal changes to their manifest.

Example A: Fargate-Based Deployment
# service.yml
service: my-fargate-app
components:
  - name: app-cluster
    type: ecs-cluster
    config:
      serviceConnect: { namespace: "internal" } # No 'capacity' block = Fargate

  - name: payments-api # The "server"
    type: ecs-fargate-service
    config:
      cluster: app-cluster
      image: "..."
      cpu: 512
      memory: 1024
      port: 8080
      serviceConnect:
        portMappingName: "api"

  - name: frontend-app # The "client"
    type: ecs-fargate-service
    config:
      cluster: app-cluster
      image: "..."
    binds:
      - to: payments-api
        capability: service:connect
        access: write

Example B: EC2-Based Deployment
# service.yml
service: my-ec2-app
components:
  - name: app-cluster
    type: ecs-cluster
    config:
      serviceConnect: { namespace: "internal" }
      capacity: # Adding this block provisions EC2 instances
        instanceType: "m5.large"
        minSize: 2
        maxSize: 10

  - name: payments-api # The "server"
    type: ecs-ec2-service # Changed from fargate to ec2
    config:
      cluster: app-cluster
      image: "..."
      taskCpu: 512 # CPU/Memory are defined at the task level
      taskMemory: 1024
      port: 8080
      serviceConnect:
        portMappingName: "api"

  - name: frontend-app # The "client"
    type: ecs-ec2-service # Changed from fargate to ec2
    config:
      cluster: app-cluster
      image: "..."
    binds:
      - to: payments-api
        capability: service:connect
        access: write
