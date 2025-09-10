Platform Contribution and Governance Guide
1. Guiding Principles
This platform is an ecosystem, not a monolith. Its success depends on contributions being consistent, secure, and reusable. Every piece of code added to this repository must adhere to these core principles:
Components are Contracts: A component's inputs (schema.ts) and outputs (component-interfaces.ts) are a firm contract with its consumers. Changes to this contract must be deliberate and backward-compatible whenever possible.
Configuration over Code: Developers using the platform should declare what they need in a service.yml manifest, not write imperative code. Components should be designed to be configured, not programmed, by their users.
Compliance by Construction: Security and compliance are not optional add-ons. They are baked into the core of every component and cannot be disabled by consumers.
Isolate and Insulate: Components must be self-contained and must never contain logic specific to a single application or environment.
2. Component Content Guidelines (/packages/components/*)
This section defines the "Rules of the Road" for what can and cannot go into a component.
DO:
Encapsulate one logical AWS service/resource. A component should manage an S3 Bucket or an RDS Database, not both.
Define a clear, versioned schema for all configurable inputs (schema.ts).
Expose outputs via a clear interface (component-interfaces.ts), providing only the information consumers need (e.g., ARNs, endpoints, names).
Embed platform-wide standards. Automatically include standard tags, logging configurations, and security hardening (e.g., block public access on buckets, enable encryption at rest).
Write comprehensive tests within the component's own directory (/tests).
DO NOT:
NO Application-Specific Logic: A component must never contain code that is only relevant to one consumer. If a specific application needs to "spin up a new construct when X happens," that logic belongs in the application's repository, which consumes the platform components.
NO Environment-Specific Logic: A component should not contain if (environment === 'prod') statements. Environment-specific parameters (like instance sizes, VPCs, etc.) must be injected from the segregated platform configurations (/config/*.yml), not hardcoded in the component.
DO NOT create "pass-through" properties. Avoid simply exposing every underlying CDK L1 property in your component's schema. Your component is an opinionated abstraction; only expose configuration that is safe, compliant, and necessary.
3. The Role of the Base Component (/packages/contracts/base-component.ts)
The BaseComponent is the abstract foundation upon which all other components are built. It is sacred and should be modified rarely and with extreme care.
The Base Component's Responsibilities:
Define the absolute core lifecycle and interface (IComponent).
Provide universal boilerplate. This is the place for logic that applies to every single component without exception, such as:
Applying universal system tags.
Providing a common logging interface.
Integrating with the core Binder Matrix.
Rules for the Base Component:
NEVER add logic specific to a subset of components (e.g., network-related logic that doesn't apply to an S3 bucket).
Favor composition over inheritance. Instead of bloating the base class, provide common functionality through injectable Platform Services (see below).
To add functionality to a type of component (e.g., all database components), create an intermediate abstract class that extends BaseComponent (e.g., BaseDatabaseComponent).
4. The Role of the Core Engine and Platform Services (/packages/core-engine)
The core-engine is the "chassis" of the platform. It is not a component; it is the orchestrator.
Responsibilities:
The CLI (svc): The user-facing entry point.
The Resolver Engine: The brain that reads the service.yml manifest, instantiates the required component classes, and wires them together.
Platform Services: Cross-cutting concerns that can be injected into components. This is the primary mechanism for extending platform-wide functionality without polluting the BaseComponent.
Good Example: An ObservabilityService that provides a standard way to create alarms and dashboards. A component's builder can call this.platform.observability.createAlarm(...).
Bad Example: Putting specific CloudWatch alarm logic directly into the BaseComponent.
This governance document provides the clear boundaries you were looking for. It ensures your platform remains clean, scalable, and easy to contribute to.
