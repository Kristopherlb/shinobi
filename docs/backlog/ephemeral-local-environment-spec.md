Platform Ephemeral Environment Standard
Version: 1.0
Status: Published
Last Updated: September 7, 2025

1. Overview & Vision
This document defines the specification for the platform's support for ephemeral, local, and cloud-based development environments. The core of a world-class developer experience is a fast and reliable inner development loop. A developer must be able to test their infrastructure and application changes in a high-fidelity, isolated environment without the cost, latency, or contention of deploying to a shared AWS account.

The vision is to make local and cloud-based development environments a turnkey, fully integrated feature of the platform. By integrating with tools like LocalStack and Gitpod, we can provide developers with a complete, disposable cloud environment on their laptop or in their browser in minutes. This dramatically accelerates iteration speed, improves testing quality, and reduces costs.

2. Guiding Principles
High Fidelity: The ephemeral environment, powered by LocalStack, MUST provide a realistic emulation of core AWS services, allowing developers to test the majority of their service's functionality locally.

Declarative & Repeatable: The configuration and startup of the ephemeral environment MUST be defined declaratively, ensuring that every developer on a team gets the exact same, consistent local stack.

Integrated & Seamless: The platform's CLI (svc) MUST be the single point of interaction. A developer should not need to learn the intricacies of Docker Compose or LocalStack commands; the platform abstracts this complexity.

Zero-Friction Onboarding: Integration with cloud development environments like Gitpod MUST be a first-class feature, allowing a new developer to get a fully running, cloud-in-a-box environment with a single click.

3. Architectural Implementation
This standard is implemented through a new component type, an enhancement to the CLI, and a standardized Gitpod configuration.

3.1. New Component: localstack-environment
This is a special, non-deployable component that is only used to configure the svc local up command.

Purpose: To define the set of AWS services that need to be emulated for a given service.

service.yml Definition:

# service.yml
components:
  - name: local-dev-env
    type: localstack-environment
    config:
      # The developer lists the AWS services their application needs.
      services:
        - "s3"
        - "dynamodb"
        - "sqs"
        - "lambda"
        - "rds" # LocalStack Pro feature

3.2. CLI Enhancement: The svc local up Command
The svc local up command is enhanced to be the primary orchestrator of the local cloud environment.

Workflow:

The developer runs svc local up.

The CLI parses the service.yml and finds the localstack-environment component.

It dynamically generates a docker-compose.yml file. This file will include:

The official localstack/localstack-pro Docker image.

The SERVICES environment variable, populated from the component's config.services list.

Port mappings for the emulated services.

It runs docker-compose up -d to start the LocalStack container in the background.

It then tails the container logs until all specified services are reported as "Ready."

Deployment to LocalStack: To deploy their infrastructure, the developer simply adds a --target flag to the standard deploy command:

svc up --target localstack --env dev

Behind the Scenes: When the --target localstack flag is present, the platform's ResolverEngine configures the underlying AWS CDK Toolkit to redirect all AWS API calls to the local LocalStack endpoint (http://localhost:4566) instead of the real AWS.

3.3. Gitpod Integration (.gitpod.yml)
The platform will provide a standard .gitpod.yml file that can be committed to any service repository. This file automates the entire setup process for cloud-based development.

# .gitpod.yml
tasks:
  - name: Start Local Cloud
    # This command runs automatically when a Gitpod workspace is created.
    # It starts the LocalStack container in the background.
    command: svc local up
  - name: Install Dependencies & Deploy
    # After the local cloud is ready, this command runs.
    command: |
      npm install
      # Deploy the service to the running LocalStack instance.
      svc up --target localstack --env dev

ports:
  # Expose the LocalStack edge port and the application's port.
  - port: 4566
  - port: 3000

4. The Developer Workflow (The Payoff)
New Developer Onboarding: A new team member clicks a single "Open in Gitpod" button in the service's repository.

Automated Setup: Gitpod provisions a new, containerized IDE in their browser. The .gitpod.yml script runs automatically.

Ready to Develop: Within 2-3 minutes, they have a complete, running instance of the service's infrastructure inside their private, isolated LocalStack instance. The application code is running and connected to it.

Iterate: The developer makes a change to their application code, and the live-reloading server in their Gitpod terminal reflects the change instantly. They can make an infrastructure change in their service.yml, run svc up --target localstack, and the change is deployed to their local cloud in seconds.