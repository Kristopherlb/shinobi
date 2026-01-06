# Component Standards Audit

## api-gateway-http
Requirement ID: 0.1 Platform Component API Spec
Status: PASS
Finding: `ApiGatewayHttpComponent` extends BaseComponent at packages/components/api-gateway-http/src/api-gateway-http.component.ts:32 with getCapabilities/getType defined at packages/components/api-gateway-http/src/api-gateway-http.component.ts:79 / packages/components/api-gateway-http/src/api-gateway-http.component.ts:84.
Remediation: None

Requirement ID: 0.2 Platform Configuration Standard
Status: FAIL
Finding: getComplianceFrameworkDefaults() missing in packages/components/api-gateway-http/src/api-gateway-http.builder.ts
Remediation: Implement a ConfigBuilder subclass with getHardcodedFallbacks() and getComplianceFrameworkDefaults() to enforce the five-layer precedence chain.

Requirement ID: 0.3 Platform Tagging Standard
Status: PASS
Finding: applyStandardTags invoked (e.g., packages/components/api-gateway-http/src/api-gateway-http.component.ts:96).
Remediation: None

Requirement ID: 0.4 Platform Logging Standard
Status: FAIL
Finding: Synth defined at packages/components/api-gateway-http/src/api-gateway-http.component.ts:45 lacks lifecycle logging: no logComponentEvent("synthesis_start") call; no logComponentEvent("synthesis_complete") call
Remediation: Emit logComponentEvent() entries at the start and end of synth() to satisfy logging standard.

Requirement ID: 0.5 Platform Observability Standard
Status: PASS
Finding: Observability hooks detected around packages/components/api-gateway-http/src/api-gateway-http.component.ts:5.
Remediation: None

Requirement ID: 0.6 Platform Testing Standard
Status: FAIL
Finding: packages/components/api-gateway-http/package.json lacks a Vitest dependency; tests still rely on Jest.
Remediation: Switch component tests to Vitest and add the vitest dependency per the platform testing standard.

Requirement ID: 0.7 Platform Capability Naming Standard
Status: PASS
Finding: Capabilities are registered in code (packages/components/api-gateway-http/src/api-gateway-http.component.ts:360) and declared in package.json metadata.
Remediation: None

Requirement ID: 1.2 Constructor Signature
Status: PASS
Finding: Constructor matches required signature at packages/components/api-gateway-http/src/api-gateway-http.component.ts:41.
Remediation: None

Requirement ID: 1.5 Creator Pattern
Status: PASS
Finding: Creator implements IComponentCreator at packages/components/api-gateway-http/src/api-gateway-http.creator.ts:13 and exports configSchema (packages/components/api-gateway-http/src/api-gateway-http.creator.ts:19).
Remediation: None

Requirement ID: 1.6 Construct Registration
Status: PASS
Finding: Constructs registered (first occurrence packages/components/api-gateway-http/src/api-gateway-http.component.ts:69).
Remediation: None

Requirement ID: 1.7 Capability Registration
Status: PASS
Finding: Capabilities registered at packages/components/api-gateway-http/src/api-gateway-http.component.ts:360.
Remediation: None

Requirement ID: 2.5 Structured Logging Requirements
Status: FAIL
Finding: Synth at packages/components/api-gateway-http/src/api-gateway-http.component.ts:45 lacks structured logging: no try/catch around synth() logic; missing logComponentEvent("synthesis_start"); missing logComponentEvent("synthesis_complete")
Remediation: Wrap synth() in try/catch and log start/complete events using logComponentEvent().

Requirement ID: 2.6 Compliance Framework Defaults
Status: FAIL
Finding: Builder packages/components/api-gateway-http/src/api-gateway-http.builder.ts lacks getComplianceFrameworkDefaults(), so FedRAMP tiers do not receive hardened defaults.
Remediation: Add getComplianceFrameworkDefaults() to the builder to inject framework-specific defaults (encryption, log retention, etc.).

Requirement ID: 2.7 OpenTelemetry Observability Requirements
Status: PASS
Finding: Observability hooks present near packages/components/api-gateway-http/src/api-gateway-http.component.ts:5.
Remediation: None

Requirement ID: 2.8 Feature Flags Integration
Status: PASS
Finding: Feature flag integration declared via package metadata.
Remediation: None

Requirement ID: 2.10 Backstage Integration
Status: PASS
Finding: catalog-info.yaml present (packages/components/api-gateway-http/catalog-info.yaml).
Remediation: None

Requirement ID: 3.3 Config.schema.json Requirement
Status: PASS
Finding: Config.schema.json present in package root.
Remediation: None

Requirement ID: 3.5 Error Handling Patterns
Status: FAIL
Finding: Synth() body at packages/components/api-gateway-http/src/api-gateway-http.component.ts:45 lacks try/catch for structured error logging.
Remediation: Wrap synth() contents in try/catch and call logError() before rethrowing.

Requirement ID: 4.1 Test Framework
Status: FAIL
Finding: packages/components/api-gateway-http/package.json lacks a Vitest dependency; tests still rely on Jest.
Remediation: Switch component tests to Vitest and add the vitest dependency per the platform testing standard.

Requirement ID: 4.2 CDK-Nag Security Tests
Status: PASS
Finding: tests/security/cdk-nag.test.ts exists.
Remediation: None

Requirement ID: 4.7 Test File Organization
Status: PASS
Finding: tests/ directory present.
Remediation: None

Requirement ID: 4.8 Component Versioning & Metadata
Status: PASS
Finding: package.json uses semver and CHANGELOG.md exists.
Remediation: None

Requirement ID: 4.9 Audit Files Requirements
Status: PASS
Finding: Audit/ documentation present.
Remediation: None

Requirement ID: V.1 TODO/Placeholder Sweep
Status: FAIL
Finding: Found TODO/placeholder code at packages/components/api-gateway-http/src/api-gateway-http.component.ts:332 → // For now, we log the configuration for future implementation
Remediation: Resolve TODO/placeholder logic and replace vaporware sections with production-ready implementations/documentation.

## api-gateway-rest
Requirement ID: 0.1 Platform Component API Spec
Status: FAIL
Finding: getCapabilities() is absent in packages/components/api-gateway-rest/src/api-gateway-rest.component.ts; getType() is absent in packages/components/api-gateway-rest/src/api-gateway-rest.component.ts
Remediation: Define a component class that extends BaseComponent and implements synth(), getCapabilities(), and getType() using the canonical constructor signature.

Requirement ID: 0.2 Platform Configuration Standard
Status: FAIL
Finding: getComplianceFrameworkDefaults() missing in packages/components/api-gateway-rest/src/api-gateway-rest.builder.ts
Remediation: Implement a ConfigBuilder subclass with getHardcodedFallbacks() and getComplianceFrameworkDefaults() to enforce the five-layer precedence chain.

Requirement ID: 0.3 Platform Tagging Standard
Status: PASS
Finding: applyStandardTags invoked (e.g., packages/components/api-gateway-rest/src/api-gateway-rest.component.ts:127).
Remediation: None

Requirement ID: 0.4 Platform Logging Standard
Status: FAIL
Finding: Synth defined at packages/components/api-gateway-rest/src/api-gateway-rest.component.ts lacks lifecycle logging: no logComponentEvent("synthesis_start") call; no logComponentEvent("synthesis_complete") call
Remediation: Emit logComponentEvent() entries at the start and end of synth() to satisfy logging standard.

Requirement ID: 0.5 Platform Observability Standard
Status: PASS
Finding: Observability hooks detected around packages/components/api-gateway-rest/src/api-gateway-rest.component.ts:45.
Remediation: None

Requirement ID: 0.6 Platform Testing Standard
Status: FAIL
Finding: packages/components/api-gateway-rest/package.json lacks a Vitest dependency; tests still rely on Jest.
Remediation: Switch component tests to Vitest and add the vitest dependency per the platform testing standard.

Requirement ID: 0.7 Platform Capability Naming Standard
Status: FAIL
Finding: package.json is missing shinobi.capabilities metadata for api-gateway-rest
Remediation: Register at least one capability via registerCapability() and mirror it in package.json shinobi.capabilities to satisfy the binding vocabulary.

Requirement ID: 1.2 Constructor Signature
Status: PASS
Finding: Constructor matches required signature at packages/components/api-gateway-rest/src/api-gateway-rest.component.ts:47.
Remediation: None

Requirement ID: 1.5 Creator Pattern
Status: PASS
Finding: Creator implements IComponentCreator at packages/components/api-gateway-rest/src/api-gateway-rest.creator.ts:25 and exports configSchema (packages/components/api-gateway-rest/src/api-gateway-rest.creator.ts:65).
Remediation: None

Requirement ID: 1.6 Construct Registration
Status: PASS
Finding: Constructs registered (first occurrence packages/components/api-gateway-rest/src/api-gateway-rest.component.ts:79).
Remediation: None

Requirement ID: 1.7 Capability Registration
Status: PASS
Finding: Capabilities registered at packages/components/api-gateway-rest/src/api-gateway-rest.component.ts:91.
Remediation: None

Requirement ID: 2.5 Structured Logging Requirements
Status: FAIL
Finding: Synth at packages/components/api-gateway-rest/src/api-gateway-rest.component.ts lacks structured logging: no try/catch around synth() logic; missing logComponentEvent("synthesis_start"); missing logComponentEvent("synthesis_complete")
Remediation: Wrap synth() in try/catch and log start/complete events using logComponentEvent().

Requirement ID: 2.6 Compliance Framework Defaults
Status: FAIL
Finding: Builder packages/components/api-gateway-rest/src/api-gateway-rest.builder.ts lacks getComplianceFrameworkDefaults(), so FedRAMP tiers do not receive hardened defaults.
Remediation: Add getComplianceFrameworkDefaults() to the builder to inject framework-specific defaults (encryption, log retention, etc.).

Requirement ID: 2.7 OpenTelemetry Observability Requirements
Status: PASS
Finding: Observability hooks present near packages/components/api-gateway-rest/src/api-gateway-rest.component.ts:45.
Remediation: None

Requirement ID: 2.8 Feature Flags Integration
Status: FAIL
Finding: Neither the component code nor package metadata references platform feature flags for api-gateway-rest.
Remediation: Gate the component behind feature flags (OpenFeature integration + shinobi.featureFlags metadata).

Requirement ID: 2.10 Backstage Integration
Status: PASS
Finding: catalog-info.yaml present (packages/components/api-gateway-rest/catalog-info.yaml).
Remediation: None

Requirement ID: 3.3 Config.schema.json Requirement
Status: PASS
Finding: Config.schema.json present in package root.
Remediation: None

Requirement ID: 3.5 Error Handling Patterns
Status: FAIL
Finding: Synth() body at packages/components/api-gateway-rest/src/api-gateway-rest.component.ts lacks try/catch for structured error logging.
Remediation: Wrap synth() contents in try/catch and call logError() before rethrowing.

Requirement ID: 4.1 Test Framework
Status: FAIL
Finding: packages/components/api-gateway-rest/package.json lacks a Vitest dependency; tests still rely on Jest.
Remediation: Switch component tests to Vitest and add the vitest dependency per the platform testing standard.

Requirement ID: 4.2 CDK-Nag Security Tests
Status: PASS
Finding: tests/security/cdk-nag.test.ts exists.
Remediation: None

Requirement ID: 4.7 Test File Organization
Status: PASS
Finding: tests/ directory present.
Remediation: None

Requirement ID: 4.8 Component Versioning & Metadata
Status: PASS
Finding: package.json uses semver and CHANGELOG.md exists.
Remediation: None

Requirement ID: 4.9 Audit Files Requirements
Status: PASS
Finding: Audit/ documentation present.
Remediation: None

Requirement ID: V.1 TODO/Placeholder Sweep
Status: PASS
Finding: No TODO/TBD/placeholder markers detected in component sources.
Remediation: None

## application-load-balancer
Requirement ID: 0.1 Platform Component API Spec
Status: FAIL
Finding: class declaration at packages/components/application-load-balancer/src/application-load-balancer.component.ts does not extend BaseComponent
Remediation: Define a component class that extends BaseComponent and implements synth(), getCapabilities(), and getType() using the canonical constructor signature.

Requirement ID: 0.2 Platform Configuration Standard
Status: FAIL
Finding: getComplianceFrameworkDefaults() missing in packages/components/application-load-balancer/src/application-load-balancer.builder.ts
Remediation: Implement a ConfigBuilder subclass with getHardcodedFallbacks() and getComplianceFrameworkDefaults() to enforce the five-layer precedence chain.

Requirement ID: 0.3 Platform Tagging Standard
Status: PASS
Finding: applyStandardTags invoked (e.g., packages/components/application-load-balancer/src/application-load-balancer.component.ts:143).
Remediation: None

Requirement ID: 0.4 Platform Logging Standard
Status: PASS
Finding: Synth lifecycle logging present at packages/components/application-load-balancer/src/application-load-balancer.component.ts:38 and packages/components/application-load-balancer/src/application-load-balancer.component.ts:78.
Remediation: None

Requirement ID: 0.5 Platform Observability Standard
Status: PASS
Finding: Observability hooks detected around packages/components/application-load-balancer/src/application-load-balancer.component.ts:69.
Remediation: None

Requirement ID: 0.6 Platform Testing Standard
Status: FAIL
Finding: packages/components/application-load-balancer/package.json lacks a Vitest dependency; tests still rely on Jest.
Remediation: Switch component tests to Vitest and add the vitest dependency per the platform testing standard.

Requirement ID: 0.7 Platform Capability Naming Standard
Status: FAIL
Finding: package.json is missing shinobi.capabilities metadata for application-load-balancer
Remediation: Register at least one capability via registerCapability() and mirror it in package.json shinobi.capabilities to satisfy the binding vocabulary.

Requirement ID: 1.2 Constructor Signature
Status: PASS
Finding: Constructor matches required signature at packages/components/application-load-balancer/src/application-load-balancer.component.ts:33.
Remediation: None

Requirement ID: 1.5 Creator Pattern
Status: PASS
Finding: Creator implements IComponentCreator at packages/components/application-load-balancer/src/application-load-balancer.creator.ts:26 and exports configSchema (packages/components/application-load-balancer/src/application-load-balancer.creator.ts:66).
Remediation: None

Requirement ID: 1.6 Construct Registration
Status: PASS
Finding: Constructs registered (first occurrence packages/components/application-load-balancer/src/application-load-balancer.component.ts:53).
Remediation: None

Requirement ID: 1.7 Capability Registration
Status: PASS
Finding: Capabilities registered at packages/components/application-load-balancer/src/application-load-balancer.component.ts:67.
Remediation: None

Requirement ID: 2.5 Structured Logging Requirements
Status: PASS
Finding: Synth() uses try/catch with lifecycle logging (packages/components/application-load-balancer/src/application-load-balancer.component.ts:37).
Remediation: None

Requirement ID: 2.6 Compliance Framework Defaults
Status: FAIL
Finding: Builder packages/components/application-load-balancer/src/application-load-balancer.builder.ts lacks getComplianceFrameworkDefaults(), so FedRAMP tiers do not receive hardened defaults.
Remediation: Add getComplianceFrameworkDefaults() to the builder to inject framework-specific defaults (encryption, log retention, etc.).

Requirement ID: 2.7 OpenTelemetry Observability Requirements
Status: PASS
Finding: Observability hooks present near packages/components/application-load-balancer/src/application-load-balancer.component.ts:69.
Remediation: None

Requirement ID: 2.8 Feature Flags Integration
Status: FAIL
Finding: Neither the component code nor package metadata references platform feature flags for application-load-balancer.
Remediation: Gate the component behind feature flags (OpenFeature integration + shinobi.featureFlags metadata).

Requirement ID: 2.10 Backstage Integration
Status: PASS
Finding: catalog-info.yaml present (packages/components/application-load-balancer/catalog-info.yaml).
Remediation: None

Requirement ID: 3.3 Config.schema.json Requirement
Status: PASS
Finding: Config.schema.json present in package root.
Remediation: None

Requirement ID: 3.5 Error Handling Patterns
Status: PASS
Finding: Synth() wraps logic in try/catch at packages/components/application-load-balancer/src/application-load-balancer.component.ts:37.
Remediation: None

Requirement ID: 4.1 Test Framework
Status: FAIL
Finding: packages/components/application-load-balancer/package.json lacks a Vitest dependency; tests still rely on Jest.
Remediation: Switch component tests to Vitest and add the vitest dependency per the platform testing standard.

Requirement ID: 4.2 CDK-Nag Security Tests
Status: FAIL
Finding: Missing tests/security/cdk-nag.test.ts in packages/components/application-load-balancer.
Remediation: Add CDK-Nag AwsSolutions tests covering all frameworks.

Requirement ID: 4.7 Test File Organization
Status: PASS
Finding: tests/ directory present.
Remediation: None

Requirement ID: 4.8 Component Versioning & Metadata
Status: PASS
Finding: package.json uses semver and CHANGELOG.md exists.
Remediation: None

Requirement ID: 4.9 Audit Files Requirements
Status: PASS
Finding: Audit/ documentation present.
Remediation: None

Requirement ID: V.1 TODO/Placeholder Sweep
Status: FAIL
Finding: Found TODO/placeholder code at packages/components/application-load-balancer/audit/component.plan.json:283 → "description": "Some MCP endpoints return stub data",
Remediation: Resolve TODO/placeholder logic and replace vaporware sections with production-ready implementations/documentation.

## auto-scaling-group
Requirement ID: 0.1 Platform Component API Spec
Status: PASS
Finding: `AutoScalingGroupComponent` extends BaseComponent at packages/components/auto-scaling-group/src/auto-scaling-group.component.ts:29 with getCapabilities/getType defined at packages/components/auto-scaling-group/src/auto-scaling-group.component.ts:85 / packages/components/auto-scaling-group/src/auto-scaling-group.component.ts:90.
Remediation: None

Requirement ID: 0.2 Platform Configuration Standard
Status: FAIL
Finding: getComplianceFrameworkDefaults() missing in packages/components/auto-scaling-group/src/auto-scaling-group.builder.ts
Remediation: Implement a ConfigBuilder subclass with getHardcodedFallbacks() and getComplianceFrameworkDefaults() to enforce the five-layer precedence chain.

Requirement ID: 0.3 Platform Tagging Standard
Status: PASS
Finding: applyStandardTags invoked (e.g., packages/components/auto-scaling-group/src/auto-scaling-group.component.ts:113).
Remediation: None

Requirement ID: 0.4 Platform Logging Standard
Status: PASS
Finding: Synth lifecycle logging present at packages/components/auto-scaling-group/src/auto-scaling-group.component.ts:43 and packages/components/auto-scaling-group/src/auto-scaling-group.component.ts:78.
Remediation: None

Requirement ID: 0.5 Platform Observability Standard
Status: PASS
Finding: Observability hooks detected around packages/components/auto-scaling-group/src/auto-scaling-group.component.ts:73.
Remediation: None

Requirement ID: 0.6 Platform Testing Standard
Status: FAIL
Finding: packages/components/auto-scaling-group/package.json lacks a Vitest dependency; tests still rely on Jest.
Remediation: Switch component tests to Vitest and add the vitest dependency per the platform testing standard.

Requirement ID: 0.7 Platform Capability Naming Standard
Status: FAIL
Finding: package.json is missing shinobi.capabilities metadata for auto-scaling-group
Remediation: Register at least one capability via registerCapability() and mirror it in package.json shinobi.capabilities to satisfy the binding vocabulary.

Requirement ID: 1.2 Constructor Signature
Status: PASS
Finding: Constructor matches required signature at packages/components/auto-scaling-group/src/auto-scaling-group.component.ts:38.
Remediation: None

Requirement ID: 1.5 Creator Pattern
Status: PASS
Finding: Creator implements IComponentCreator at packages/components/auto-scaling-group/src/auto-scaling-group.creator.ts:29 and exports configSchema (packages/components/auto-scaling-group/src/auto-scaling-group.creator.ts:69).
Remediation: None

Requirement ID: 1.6 Construct Registration
Status: PASS
Finding: Constructs registered (first occurrence packages/components/auto-scaling-group/src/auto-scaling-group.component.ts:59).
Remediation: None

Requirement ID: 1.7 Capability Registration
Status: PASS
Finding: Capabilities registered at packages/components/auto-scaling-group/src/auto-scaling-group.component.ts:71.
Remediation: None

Requirement ID: 2.5 Structured Logging Requirements
Status: PASS
Finding: Synth() uses try/catch with lifecycle logging (packages/components/auto-scaling-group/src/auto-scaling-group.component.ts:42).
Remediation: None

Requirement ID: 2.6 Compliance Framework Defaults
Status: FAIL
Finding: Builder packages/components/auto-scaling-group/src/auto-scaling-group.builder.ts lacks getComplianceFrameworkDefaults(), so FedRAMP tiers do not receive hardened defaults.
Remediation: Add getComplianceFrameworkDefaults() to the builder to inject framework-specific defaults (encryption, log retention, etc.).

Requirement ID: 2.7 OpenTelemetry Observability Requirements
Status: PASS
Finding: Observability hooks present near packages/components/auto-scaling-group/src/auto-scaling-group.component.ts:73.
Remediation: None

Requirement ID: 2.8 Feature Flags Integration
Status: FAIL
Finding: Neither the component code nor package metadata references platform feature flags for auto-scaling-group.
Remediation: Gate the component behind feature flags (OpenFeature integration + shinobi.featureFlags metadata).

Requirement ID: 2.10 Backstage Integration
Status: PASS
Finding: catalog-info.yaml present (packages/components/auto-scaling-group/catalog-info.yaml).
Remediation: None

Requirement ID: 3.3 Config.schema.json Requirement
Status: PASS
Finding: Config.schema.json present in package root.
Remediation: None

Requirement ID: 3.5 Error Handling Patterns
Status: PASS
Finding: Synth() wraps logic in try/catch at packages/components/auto-scaling-group/src/auto-scaling-group.component.ts:42.
Remediation: None

Requirement ID: 4.1 Test Framework
Status: FAIL
Finding: packages/components/auto-scaling-group/package.json lacks a Vitest dependency; tests still rely on Jest.
Remediation: Switch component tests to Vitest and add the vitest dependency per the platform testing standard.

Requirement ID: 4.2 CDK-Nag Security Tests
Status: PASS
Finding: tests/security/cdk-nag.test.ts exists.
Remediation: None

Requirement ID: 4.7 Test File Organization
Status: PASS
Finding: tests/ directory present.
Remediation: None

Requirement ID: 4.8 Component Versioning & Metadata
Status: PASS
Finding: package.json uses semver and CHANGELOG.md exists.
Remediation: None

Requirement ID: 4.9 Audit Files Requirements
Status: PASS
Finding: Audit/ documentation present.
Remediation: None

Requirement ID: V.1 TODO/Placeholder Sweep
Status: FAIL
Finding: Found TODO/placeholder code at packages/components/auto-scaling-group/audit/auto-scaling-group.audit.md:42 → - No OTEL collector endpoint plumbing or dashboard assets beyond two alarms. `observability/README.md` is a placeholder, but the platform standard expects dashboards and trace wiring for ASGs.
Remediation: Resolve TODO/placeholder logic and replace vaporware sections with production-ready implementations/documentation.

## certificate-manager
Requirement ID: 0.1 Platform Component API Spec
Status: PASS
Finding: `CertificateManagerComponent` extends BaseComponent at packages/components/certificate-manager/src/certificate-manager.component.ts:27 with getCapabilities/getType defined at packages/components/certificate-manager/src/certificate-manager.component.ts:93 / packages/components/certificate-manager/src/certificate-manager.component.ts:98.
Remediation: None

Requirement ID: 0.2 Platform Configuration Standard
Status: FAIL
Finding: getComplianceFrameworkDefaults() missing in packages/components/certificate-manager/src/certificate-manager.builder.ts
Remediation: Implement a ConfigBuilder subclass with getHardcodedFallbacks() and getComplianceFrameworkDefaults() to enforce the five-layer precedence chain.

Requirement ID: 0.3 Platform Tagging Standard
Status: PASS
Finding: applyStandardTags invoked (e.g., packages/components/certificate-manager/src/certificate-manager.component.ts:136).
Remediation: None

Requirement ID: 0.4 Platform Logging Standard
Status: PASS
Finding: Synth lifecycle logging present at packages/components/certificate-manager/src/certificate-manager.component.ts:40 and packages/components/certificate-manager/src/certificate-manager.component.ts:79.
Remediation: None

Requirement ID: 0.5 Platform Observability Standard
Status: PASS
Finding: Observability hooks detected around packages/components/certificate-manager/src/certificate-manager.component.ts:76.
Remediation: None

Requirement ID: 0.6 Platform Testing Standard
Status: FAIL
Finding: packages/components/certificate-manager/package.json lacks a Vitest dependency; tests still rely on Jest.
Remediation: Switch component tests to Vitest and add the vitest dependency per the platform testing standard.

Requirement ID: 0.7 Platform Capability Naming Standard
Status: FAIL
Finding: package.json is missing shinobi.capabilities metadata for certificate-manager
Remediation: Register at least one capability via registerCapability() and mirror it in package.json shinobi.capabilities to satisfy the binding vocabulary.

Requirement ID: 1.2 Constructor Signature
Status: PASS
Finding: Constructor matches required signature at packages/components/certificate-manager/src/certificate-manager.component.ts:34.
Remediation: None

Requirement ID: 1.5 Creator Pattern
Status: PASS
Finding: Creator implements IComponentCreator at packages/components/certificate-manager/src/certificate-manager.creator.ts:15 and exports configSchema (packages/components/certificate-manager/src/certificate-manager.creator.ts:22).
Remediation: None

Requirement ID: 1.6 Construct Registration
Status: PASS
Finding: Constructs registered (first occurrence packages/components/certificate-manager/src/certificate-manager.component.ts:63).
Remediation: None

Requirement ID: 1.7 Capability Registration
Status: PASS
Finding: Capabilities registered at packages/components/certificate-manager/src/certificate-manager.component.ts:75.
Remediation: None

Requirement ID: 2.5 Structured Logging Requirements
Status: PASS
Finding: Synth() uses try/catch with lifecycle logging (packages/components/certificate-manager/src/certificate-manager.component.ts:38).
Remediation: None

Requirement ID: 2.6 Compliance Framework Defaults
Status: FAIL
Finding: Builder packages/components/certificate-manager/src/certificate-manager.builder.ts lacks getComplianceFrameworkDefaults(), so FedRAMP tiers do not receive hardened defaults.
Remediation: Add getComplianceFrameworkDefaults() to the builder to inject framework-specific defaults (encryption, log retention, etc.).

Requirement ID: 2.7 OpenTelemetry Observability Requirements
Status: PASS
Finding: Observability hooks present near packages/components/certificate-manager/src/certificate-manager.component.ts:76.
Remediation: None

Requirement ID: 2.8 Feature Flags Integration
Status: FAIL
Finding: Neither the component code nor package metadata references platform feature flags for certificate-manager.
Remediation: Gate the component behind feature flags (OpenFeature integration + shinobi.featureFlags metadata).

Requirement ID: 2.10 Backstage Integration
Status: PASS
Finding: catalog-info.yaml present (packages/components/certificate-manager/catalog-info.yaml).
Remediation: None

Requirement ID: 3.3 Config.schema.json Requirement
Status: PASS
Finding: Config.schema.json present in package root.
Remediation: None

Requirement ID: 3.5 Error Handling Patterns
Status: PASS
Finding: Synth() wraps logic in try/catch at packages/components/certificate-manager/src/certificate-manager.component.ts:38.
Remediation: None

Requirement ID: 4.1 Test Framework
Status: FAIL
Finding: packages/components/certificate-manager/package.json lacks a Vitest dependency; tests still rely on Jest.
Remediation: Switch component tests to Vitest and add the vitest dependency per the platform testing standard.

Requirement ID: 4.2 CDK-Nag Security Tests
Status: PASS
Finding: tests/security/cdk-nag.test.ts exists.
Remediation: None

Requirement ID: 4.7 Test File Organization
Status: PASS
Finding: tests/ directory present.
Remediation: None

Requirement ID: 4.8 Component Versioning & Metadata
Status: PASS
Finding: package.json uses semver and CHANGELOG.md exists.
Remediation: None

Requirement ID: 4.9 Audit Files Requirements
Status: PASS
Finding: Audit/ documentation present.
Remediation: None

Requirement ID: V.1 TODO/Placeholder Sweep
Status: FAIL
Finding: Found TODO/placeholder code at packages/components/certificate-manager/observability/README.md:8 → - `dashboard-template.json` – placeholder for a future CloudWatch dashboard template covering ACM metrics.
Remediation: Resolve TODO/placeholder logic and replace vaporware sections with production-ready implementations/documentation.

## cloudfront-distribution
Requirement ID: 0.1 Platform Component API Spec
Status: PASS
Finding: `CloudFrontDistributionComponent` extends BaseComponent at packages/components/cloudfront-distribution/src/cloudfront-distribution.component.ts:33 with getCapabilities/getType defined at packages/components/cloudfront-distribution/src/cloudfront-distribution.component.ts:88 / packages/components/cloudfront-distribution/src/cloudfront-distribution.component.ts:93.
Remediation: None

Requirement ID: 0.2 Platform Configuration Standard
Status: FAIL
Finding: getComplianceFrameworkDefaults() missing in packages/components/cloudfront-distribution/src/cloudfront-distribution.builder.ts
Remediation: Implement a ConfigBuilder subclass with getHardcodedFallbacks() and getComplianceFrameworkDefaults() to enforce the five-layer precedence chain.

Requirement ID: 0.3 Platform Tagging Standard
Status: PASS
Finding: applyStandardTags invoked (e.g., packages/components/cloudfront-distribution/src/cloudfront-distribution.component.ts:180).
Remediation: None

Requirement ID: 0.4 Platform Logging Standard
Status: PASS
Finding: Synth lifecycle logging present at packages/components/cloudfront-distribution/src/cloudfront-distribution.component.ts:52 and packages/components/cloudfront-distribution/src/cloudfront-distribution.component.ts:78.
Remediation: None

Requirement ID: 0.5 Platform Observability Standard
Status: PASS
Finding: Observability hooks detected around packages/components/cloudfront-distribution/src/cloudfront-distribution.component.ts:30.
Remediation: None

Requirement ID: 0.6 Platform Testing Standard
Status: FAIL
Finding: packages/components/cloudfront-distribution/package.json lacks a Vitest dependency; tests still rely on Jest.
Remediation: Switch component tests to Vitest and add the vitest dependency per the platform testing standard.

Requirement ID: 0.7 Platform Capability Naming Standard
Status: FAIL
Finding: package.json is missing shinobi.capabilities metadata for cloudfront-distribution
Remediation: Register at least one capability via registerCapability() and mirror it in package.json shinobi.capabilities to satisfy the binding vocabulary.

Requirement ID: 1.2 Constructor Signature
Status: PASS
Finding: Constructor matches required signature at packages/components/cloudfront-distribution/src/cloudfront-distribution.component.ts:39.
Remediation: None

Requirement ID: 1.5 Creator Pattern
Status: PASS
Finding: Creator implements IComponentCreator at packages/components/cloudfront-distribution/src/cloudfront-distribution.creator.ts:26 and exports configSchema (packages/components/cloudfront-distribution/src/cloudfront-distribution.creator.ts:66).
Remediation: None

Requirement ID: 1.6 Construct Registration
Status: PASS
Finding: Constructs registered (first occurrence packages/components/cloudfront-distribution/src/cloudfront-distribution.component.ts:68).
Remediation: None

Requirement ID: 1.7 Capability Registration
Status: PASS
Finding: Capabilities registered at packages/components/cloudfront-distribution/src/cloudfront-distribution.component.ts:71.
Remediation: None

Requirement ID: 2.5 Structured Logging Requirements
Status: PASS
Finding: Synth() uses try/catch with lifecycle logging (packages/components/cloudfront-distribution/src/cloudfront-distribution.component.ts:51).
Remediation: None

Requirement ID: 2.6 Compliance Framework Defaults
Status: FAIL
Finding: Builder packages/components/cloudfront-distribution/src/cloudfront-distribution.builder.ts lacks getComplianceFrameworkDefaults(), so FedRAMP tiers do not receive hardened defaults.
Remediation: Add getComplianceFrameworkDefaults() to the builder to inject framework-specific defaults (encryption, log retention, etc.).

Requirement ID: 2.7 OpenTelemetry Observability Requirements
Status: PASS
Finding: Observability hooks present near packages/components/cloudfront-distribution/src/cloudfront-distribution.component.ts:30.
Remediation: None

Requirement ID: 2.8 Feature Flags Integration
Status: FAIL
Finding: Neither the component code nor package metadata references platform feature flags for cloudfront-distribution.
Remediation: Gate the component behind feature flags (OpenFeature integration + shinobi.featureFlags metadata).

Requirement ID: 2.10 Backstage Integration
Status: PASS
Finding: catalog-info.yaml present (packages/components/cloudfront-distribution/catalog-info.yaml).
Remediation: None

Requirement ID: 3.3 Config.schema.json Requirement
Status: PASS
Finding: Config.schema.json present in package root.
Remediation: None

Requirement ID: 3.5 Error Handling Patterns
Status: PASS
Finding: Synth() wraps logic in try/catch at packages/components/cloudfront-distribution/src/cloudfront-distribution.component.ts:51.
Remediation: None

Requirement ID: 4.1 Test Framework
Status: FAIL
Finding: packages/components/cloudfront-distribution/package.json lacks a Vitest dependency; tests still rely on Jest.
Remediation: Switch component tests to Vitest and add the vitest dependency per the platform testing standard.

Requirement ID: 4.2 CDK-Nag Security Tests
Status: FAIL
Finding: Missing tests/security/cdk-nag.test.ts in packages/components/cloudfront-distribution.
Remediation: Add CDK-Nag AwsSolutions tests covering all frameworks.

Requirement ID: 4.7 Test File Organization
Status: PASS
Finding: tests/ directory present.
Remediation: None

Requirement ID: 4.8 Component Versioning & Metadata
Status: FAIL
Finding: CHANGELOG.md missing
Remediation: Set a semantic version in package.json and maintain CHANGELOG.md per governance policy.

Requirement ID: 4.9 Audit Files Requirements
Status: PASS
Finding: Audit/ documentation present.
Remediation: None

Requirement ID: V.1 TODO/Placeholder Sweep
Status: FAIL
Finding: Found TODO/placeholder code at packages/components/cloudfront-distribution/dist/cloudfront-distribution.creator.js:71 → // TODO: Add component-specific validations here
Remediation: Resolve TODO/placeholder logic and replace vaporware sections with production-ready implementations/documentation.

## cloudwatch-log-group
Requirement ID: 0.1 Platform Component API Spec
Status: FAIL
Finding: component file packages/components/cloudwatch-log-group/*component.ts is missing
Remediation: Define a component class that extends BaseComponent and implements synth(), getCapabilities(), and getType() using the canonical constructor signature.

Requirement ID: 0.2 Platform Configuration Standard
Status: FAIL
Finding: Config builder file missing under packages/components/cloudwatch-log-group
Remediation: Implement a ConfigBuilder subclass with getHardcodedFallbacks() and getComplianceFrameworkDefaults() to enforce the five-layer precedence chain.

Requirement ID: 0.3 Platform Tagging Standard
Status: FAIL
Finding: applyStandardTags() is never called in n/a, so platform/governance tags are skipped.
Remediation: Invoke applyStandardTags() on every construct that the component creates to propagate service/compliance/cost tags.

Requirement ID: 0.4 Platform Logging Standard
Status: FAIL
Finding: Synth defined at n/a lacks lifecycle logging: no logComponentEvent("synthesis_start") call; no logComponentEvent("synthesis_complete") call
Remediation: Emit logComponentEvent() entries at the start and end of synth() to satisfy logging standard.

Requirement ID: 0.5 Platform Observability Standard
Status: FAIL
Finding: No OpenTelemetry helpers or configureObservability() calls exist inside n/a.
Remediation: Wire the component into configureObservability()/OpenTelemetry so metrics/traces/logs conform to the observability standard.

Requirement ID: 0.6 Platform Testing Standard
Status: FAIL
Finding: packages/components/cloudwatch-log-group/package.json lacks a Vitest dependency; tests still rely on Jest.
Remediation: Switch component tests to Vitest and add the vitest dependency per the platform testing standard.

Requirement ID: 0.7 Platform Capability Naming Standard
Status: FAIL
Finding: code in n/a never calls registerCapability(); package.json is missing shinobi.capabilities metadata for cloudwatch-log-group
Remediation: Register at least one capability via registerCapability() and mirror it in package.json shinobi.capabilities to satisfy the binding vocabulary.

Requirement ID: 1.2 Constructor Signature
Status: FAIL
Finding: Constructor in n/a does not use the canonical (scope, id, context, spec) signature.
Remediation: Align the constructor with the canonical signature and call super().

Requirement ID: 1.5 Creator Pattern
Status: FAIL
Finding: creator file missing under packages/components/cloudwatch-log-group
Remediation: Implement an IComponentCreator with component metadata, configSchema reference, and create/process methods per the standard.

Requirement ID: 1.6 Construct Registration
Status: FAIL
Finding: Component n/a never calls registerConstruct(), so resources are not discoverable.
Remediation: Call registerConstruct() for each important construct created inside synth().

Requirement ID: 1.7 Capability Registration
Status: FAIL
Finding: registerCapability() is never invoked in n/a, so the component cannot advertise bindings.
Remediation: Emit at least one registerCapability() call that maps to the standard binder matrix.

Requirement ID: 2.5 Structured Logging Requirements
Status: FAIL
Finding: Synth at n/a lacks structured logging: no try/catch around synth() logic; missing logComponentEvent("synthesis_start"); missing logComponentEvent("synthesis_complete")
Remediation: Wrap synth() in try/catch and log start/complete events using logComponentEvent().

Requirement ID: 2.6 Compliance Framework Defaults
Status: FAIL
Finding: Builder n/a lacks getComplianceFrameworkDefaults(), so FedRAMP tiers do not receive hardened defaults.
Remediation: Add getComplianceFrameworkDefaults() to the builder to inject framework-specific defaults (encryption, log retention, etc.).

Requirement ID: 2.7 OpenTelemetry Observability Requirements
Status: FAIL
Finding: No OpenTelemetry or configureObservability calls found in n/a.
Remediation: Integrate configureObservability()/OpenTelemetry instrumentation and register observability capabilities.

Requirement ID: 2.8 Feature Flags Integration
Status: FAIL
Finding: Neither the component code nor package metadata references platform feature flags for cloudwatch-log-group.
Remediation: Gate the component behind feature flags (OpenFeature integration + shinobi.featureFlags metadata).

Requirement ID: 2.10 Backstage Integration
Status: FAIL
Finding: Missing catalog-info.yaml under packages/components/cloudwatch-log-group/, so Backstage cannot reflect component metadata.
Remediation: Add catalog-info.yaml mirroring the platform tags/metadata for Backstage scorecards.

Requirement ID: 3.3 Config.schema.json Requirement
Status: FAIL
Finding: Config.schema.json missing from packages/components/cloudwatch-log-group.
Remediation: Author Config.schema.json that matches the TypeScript config interface and export it from the builder.

Requirement ID: 3.5 Error Handling Patterns
Status: FAIL
Finding: Synth() body at n/a lacks try/catch for structured error logging.
Remediation: Wrap synth() contents in try/catch and call logError() before rethrowing.

Requirement ID: 4.1 Test Framework
Status: FAIL
Finding: packages/components/cloudwatch-log-group/package.json lacks a Vitest dependency; tests still rely on Jest.
Remediation: Switch component tests to Vitest and add the vitest dependency per the platform testing standard.

Requirement ID: 4.2 CDK-Nag Security Tests
Status: FAIL
Finding: Missing tests/security/cdk-nag.test.ts in packages/components/cloudwatch-log-group.
Remediation: Add CDK-Nag AwsSolutions tests covering all frameworks.

Requirement ID: 4.7 Test File Organization
Status: FAIL
Finding: tests/ directory missing from packages/components/cloudwatch-log-group.
Remediation: Add tests/ with builder/component/security specs per the testing standard.

Requirement ID: 4.8 Component Versioning & Metadata
Status: FAIL
Finding: package.json lacks MAJOR.MINOR.PATCH version; CHANGELOG.md missing
Remediation: Set a semantic version in package.json and maintain CHANGELOG.md per governance policy.

Requirement ID: 4.9 Audit Files Requirements
Status: FAIL
Finding: Audit/ directory missing from packages/components/cloudwatch-log-group.
Remediation: Add Audit/README and component audit report to satisfy evidence requirements.

Requirement ID: V.1 TODO/Placeholder Sweep
Status: PASS
Finding: No TODO/TBD/placeholder markers detected in component sources.
Remediation: None

## cognito-user-pool
Requirement ID: 0.1 Platform Component API Spec
Status: PASS
Finding: `CognitoUserPoolComponent` extends BaseComponent at packages/components/cognito-user-pool/src/cognito-user-pool.component.ts:23 with getCapabilities/getType defined at packages/components/cognito-user-pool/src/cognito-user-pool.component.ts:68 / packages/components/cognito-user-pool/src/cognito-user-pool.component.ts:73.
Remediation: None

Requirement ID: 0.2 Platform Configuration Standard
Status: FAIL
Finding: getComplianceFrameworkDefaults() missing in packages/components/cognito-user-pool/src/cognito-user-pool.builder.ts
Remediation: Implement a ConfigBuilder subclass with getHardcodedFallbacks() and getComplianceFrameworkDefaults() to enforce the five-layer precedence chain.

Requirement ID: 0.3 Platform Tagging Standard
Status: PASS
Finding: applyStandardTags invoked (e.g., packages/components/cognito-user-pool/src/cognito-user-pool.component.ts:108).
Remediation: None

Requirement ID: 0.4 Platform Logging Standard
Status: PASS
Finding: Synth lifecycle logging present at packages/components/cognito-user-pool/src/cognito-user-pool.component.ts:36 and packages/components/cognito-user-pool/src/cognito-user-pool.component.ts:62.
Remediation: None

Requirement ID: 0.5 Platform Observability Standard
Status: PASS
Finding: Observability hooks detected around packages/components/cognito-user-pool/src/cognito-user-pool.component.ts:29.
Remediation: None

Requirement ID: 0.6 Platform Testing Standard
Status: FAIL
Finding: packages/components/cognito-user-pool/package.json lacks a Vitest dependency; tests still rely on Jest.
Remediation: Switch component tests to Vitest and add the vitest dependency per the platform testing standard.

Requirement ID: 0.7 Platform Capability Naming Standard
Status: FAIL
Finding: package.json is missing shinobi.capabilities metadata for cognito-user-pool
Remediation: Register at least one capability via registerCapability() and mirror it in package.json shinobi.capabilities to satisfy the binding vocabulary.

Requirement ID: 1.2 Constructor Signature
Status: PASS
Finding: Constructor matches required signature at packages/components/cognito-user-pool/src/cognito-user-pool.component.ts:31.
Remediation: None

Requirement ID: 1.5 Creator Pattern
Status: PASS
Finding: Creator implements IComponentCreator at packages/components/cognito-user-pool/src/cognito-user-pool.creator.ts:26 and exports configSchema (packages/components/cognito-user-pool/src/cognito-user-pool.creator.ts:66).
Remediation: None

Requirement ID: 1.6 Construct Registration
Status: PASS
Finding: Constructs registered (first occurrence packages/components/cognito-user-pool/src/cognito-user-pool.component.ts:47).
Remediation: None

Requirement ID: 1.7 Capability Registration
Status: PASS
Finding: Capabilities registered at packages/components/cognito-user-pool/src/cognito-user-pool.component.ts:55.
Remediation: None

Requirement ID: 2.5 Structured Logging Requirements
Status: FAIL
Finding: Synth at packages/components/cognito-user-pool/src/cognito-user-pool.component.ts:35 lacks structured logging: no try/catch around synth() logic
Remediation: Wrap synth() in try/catch and log start/complete events using logComponentEvent().

Requirement ID: 2.6 Compliance Framework Defaults
Status: FAIL
Finding: Builder packages/components/cognito-user-pool/src/cognito-user-pool.builder.ts lacks getComplianceFrameworkDefaults(), so FedRAMP tiers do not receive hardened defaults.
Remediation: Add getComplianceFrameworkDefaults() to the builder to inject framework-specific defaults (encryption, log retention, etc.).

Requirement ID: 2.7 OpenTelemetry Observability Requirements
Status: PASS
Finding: Observability hooks present near packages/components/cognito-user-pool/src/cognito-user-pool.component.ts:29.
Remediation: None

Requirement ID: 2.8 Feature Flags Integration
Status: FAIL
Finding: Neither the component code nor package metadata references platform feature flags for cognito-user-pool.
Remediation: Gate the component behind feature flags (OpenFeature integration + shinobi.featureFlags metadata).

Requirement ID: 2.10 Backstage Integration
Status: PASS
Finding: catalog-info.yaml present (packages/components/cognito-user-pool/catalog-info.yaml).
Remediation: None

Requirement ID: 3.3 Config.schema.json Requirement
Status: PASS
Finding: Config.schema.json present in package root.
Remediation: None

Requirement ID: 3.5 Error Handling Patterns
Status: FAIL
Finding: Synth() body at packages/components/cognito-user-pool/src/cognito-user-pool.component.ts:35 lacks try/catch for structured error logging.
Remediation: Wrap synth() contents in try/catch and call logError() before rethrowing.

Requirement ID: 4.1 Test Framework
Status: FAIL
Finding: packages/components/cognito-user-pool/package.json lacks a Vitest dependency; tests still rely on Jest.
Remediation: Switch component tests to Vitest and add the vitest dependency per the platform testing standard.

Requirement ID: 4.2 CDK-Nag Security Tests
Status: PASS
Finding: tests/security/cdk-nag.test.ts exists.
Remediation: None

Requirement ID: 4.7 Test File Organization
Status: PASS
Finding: tests/ directory present.
Remediation: None

Requirement ID: 4.8 Component Versioning & Metadata
Status: PASS
Finding: package.json uses semver and CHANGELOG.md exists.
Remediation: None

Requirement ID: 4.9 Audit Files Requirements
Status: PASS
Finding: Audit/ documentation present.
Remediation: None

Requirement ID: V.1 TODO/Placeholder Sweep
Status: FAIL
Finding: Found TODO/placeholder code at packages/components/cognito-user-pool/dist/cognito-user-pool.component.js:131 → this.userPoolDomain = this.userPool.addDomain('CognitoDomain', {
Remediation: Resolve TODO/placeholder logic and replace vaporware sections with production-ready implementations/documentation.

## container-application
Requirement ID: 0.1 Platform Component API Spec
Status: PASS
Finding: `ContainerApplicationComponent` extends BaseComponent at packages/components/container-application/src/container-application.component.ts:27 with getCapabilities/getType defined at packages/components/container-application/src/container-application.component.ts:94 / packages/components/container-application/src/container-application.component.ts:99.
Remediation: None

Requirement ID: 0.2 Platform Configuration Standard
Status: FAIL
Finding: getComplianceFrameworkDefaults() missing in packages/components/container-application/src/container-application.builder.ts
Remediation: Implement a ConfigBuilder subclass with getHardcodedFallbacks() and getComplianceFrameworkDefaults() to enforce the five-layer precedence chain.

Requirement ID: 0.3 Platform Tagging Standard
Status: PASS
Finding: applyStandardTags invoked (e.g., packages/components/container-application/src/container-application.component.ts:177).
Remediation: None

Requirement ID: 0.4 Platform Logging Standard
Status: PASS
Finding: Synth lifecycle logging present at packages/components/container-application/src/container-application.component.ts:50 and packages/components/container-application/src/container-application.component.ts:85.
Remediation: None

Requirement ID: 0.5 Platform Observability Standard
Status: PASS
Finding: Observability hooks detected around packages/components/container-application/src/container-application.component.ts:42.
Remediation: None

Requirement ID: 0.6 Platform Testing Standard
Status: FAIL
Finding: packages/components/container-application/package.json lacks a Vitest dependency; tests still rely on Jest.
Remediation: Switch component tests to Vitest and add the vitest dependency per the platform testing standard.

Requirement ID: 0.7 Platform Capability Naming Standard
Status: FAIL
Finding: package.json is missing shinobi.capabilities metadata for container-application
Remediation: Register at least one capability via registerCapability() and mirror it in package.json shinobi.capabilities to satisfy the binding vocabulary.

Requirement ID: 1.2 Constructor Signature
Status: PASS
Finding: Constructor matches required signature at packages/components/container-application/src/container-application.component.ts:45.
Remediation: None

Requirement ID: 1.5 Creator Pattern
Status: PASS
Finding: Creator implements IComponentCreator at packages/components/container-application/src/container-application.creator.ts:13 and exports configSchema (packages/components/container-application/src/container-application.creator.ts:20).
Remediation: None

Requirement ID: 1.6 Construct Registration
Status: PASS
Finding: Constructs registered (first occurrence packages/components/container-application/src/container-application.component.ts:81).
Remediation: None

Requirement ID: 1.7 Capability Registration
Status: PASS
Finding: Capabilities registered at packages/components/container-application/src/container-application.component.ts:598.
Remediation: None

Requirement ID: 2.5 Structured Logging Requirements
Status: PASS
Finding: Synth() uses try/catch with lifecycle logging (packages/components/container-application/src/container-application.component.ts:49).
Remediation: None

Requirement ID: 2.6 Compliance Framework Defaults
Status: FAIL
Finding: Builder packages/components/container-application/src/container-application.builder.ts lacks getComplianceFrameworkDefaults(), so FedRAMP tiers do not receive hardened defaults.
Remediation: Add getComplianceFrameworkDefaults() to the builder to inject framework-specific defaults (encryption, log retention, etc.).

Requirement ID: 2.7 OpenTelemetry Observability Requirements
Status: PASS
Finding: Observability hooks present near packages/components/container-application/src/container-application.component.ts:42.
Remediation: None

Requirement ID: 2.8 Feature Flags Integration
Status: FAIL
Finding: Neither the component code nor package metadata references platform feature flags for container-application.
Remediation: Gate the component behind feature flags (OpenFeature integration + shinobi.featureFlags metadata).

Requirement ID: 2.10 Backstage Integration
Status: PASS
Finding: catalog-info.yaml present (packages/components/container-application/catalog-info.yaml).
Remediation: None

Requirement ID: 3.3 Config.schema.json Requirement
Status: PASS
Finding: Config.schema.json present in package root.
Remediation: None

Requirement ID: 3.5 Error Handling Patterns
Status: PASS
Finding: Synth() wraps logic in try/catch at packages/components/container-application/src/container-application.component.ts:49.
Remediation: None

Requirement ID: 4.1 Test Framework
Status: FAIL
Finding: packages/components/container-application/package.json lacks a Vitest dependency; tests still rely on Jest.
Remediation: Switch component tests to Vitest and add the vitest dependency per the platform testing standard.

Requirement ID: 4.2 CDK-Nag Security Tests
Status: PASS
Finding: tests/security/cdk-nag.test.ts exists.
Remediation: None

Requirement ID: 4.7 Test File Organization
Status: PASS
Finding: tests/ directory present.
Remediation: None

Requirement ID: 4.8 Component Versioning & Metadata
Status: PASS
Finding: package.json uses semver and CHANGELOG.md exists.
Remediation: None

Requirement ID: 4.9 Audit Files Requirements
Status: PASS
Finding: Audit/ documentation present.
Remediation: None

Requirement ID: V.1 TODO/Placeholder Sweep
Status: PASS
Finding: No TODO/TBD/placeholder markers detected in component sources.
Remediation: None

## dagger-engine-pool
Requirement ID: 0.1 Platform Component API Spec
Status: PASS
Finding: `DaggerEnginePool` extends BaseComponent at packages/components/dagger-engine-pool/src/dagger-engine-pool.component.ts:21 with getCapabilities/getType defined at packages/components/dagger-engine-pool/src/dagger-engine-pool.component.ts:162 / packages/components/dagger-engine-pool/src/dagger-engine-pool.component.ts:166.
Remediation: None

Requirement ID: 0.2 Platform Configuration Standard
Status: FAIL
Finding: builder class at packages/components/dagger-engine-pool/src/dagger-engine-pool.builder.ts does not extend ConfigBuilder; getHardcodedFallbacks() missing in packages/components/dagger-engine-pool/src/dagger-engine-pool.builder.ts; getComplianceFrameworkDefaults() missing in packages/components/dagger-engine-pool/src/dagger-engine-pool.builder.ts
Remediation: Implement a ConfigBuilder subclass with getHardcodedFallbacks() and getComplianceFrameworkDefaults() to enforce the five-layer precedence chain.

Requirement ID: 0.3 Platform Tagging Standard
Status: FAIL
Finding: applyStandardTags() is never called in packages/components/dagger-engine-pool/src/dagger-engine-pool.component.ts, so platform/governance tags are skipped.
Remediation: Invoke applyStandardTags() on every construct that the component creates to propagate service/compliance/cost tags.

Requirement ID: 0.4 Platform Logging Standard
Status: FAIL
Finding: Synth defined at packages/components/dagger-engine-pool/src/dagger-engine-pool.component.ts:47 lacks lifecycle logging: no logComponentEvent("synthesis_start") call; no logComponentEvent("synthesis_complete") call
Remediation: Emit logComponentEvent() entries at the start and end of synth() to satisfy logging standard.

Requirement ID: 0.5 Platform Observability Standard
Status: PASS
Finding: Observability hooks detected around packages/components/dagger-engine-pool/src/dagger-engine-pool.component.ts:23.
Remediation: None

Requirement ID: 0.6 Platform Testing Standard
Status: FAIL
Finding: packages/components/dagger-engine-pool/package.json lacks a Vitest dependency; tests still rely on Jest.
Remediation: Switch component tests to Vitest and add the vitest dependency per the platform testing standard.

Requirement ID: 0.7 Platform Capability Naming Standard
Status: FAIL
Finding: package.json is missing shinobi.capabilities metadata for dagger-engine-pool
Remediation: Register at least one capability via registerCapability() and mirror it in package.json shinobi.capabilities to satisfy the binding vocabulary.

Requirement ID: 1.2 Constructor Signature
Status: PASS
Finding: Constructor matches required signature at packages/components/dagger-engine-pool/src/dagger-engine-pool.component.ts:25.
Remediation: None

Requirement ID: 1.5 Creator Pattern
Status: FAIL
Finding: packages/components/dagger-engine-pool/src/dagger-engine-pool.creator.ts missing configSchema export
Remediation: Implement an IComponentCreator with component metadata, configSchema reference, and create/process methods per the standard.

Requirement ID: 1.6 Construct Registration
Status: PASS
Finding: Constructs registered (first occurrence packages/components/dagger-engine-pool/src/dagger-engine-pool.component.ts:132).
Remediation: None

Requirement ID: 1.7 Capability Registration
Status: PASS
Finding: Capabilities registered at packages/components/dagger-engine-pool/src/dagger-engine-pool.component.ts:139.
Remediation: None

Requirement ID: 2.5 Structured Logging Requirements
Status: FAIL
Finding: Synth at packages/components/dagger-engine-pool/src/dagger-engine-pool.component.ts:47 lacks structured logging: no try/catch around synth() logic; missing logComponentEvent("synthesis_start"); missing logComponentEvent("synthesis_complete")
Remediation: Wrap synth() in try/catch and log start/complete events using logComponentEvent().

Requirement ID: 2.6 Compliance Framework Defaults
Status: FAIL
Finding: Builder packages/components/dagger-engine-pool/src/dagger-engine-pool.builder.ts lacks getComplianceFrameworkDefaults(), so FedRAMP tiers do not receive hardened defaults.
Remediation: Add getComplianceFrameworkDefaults() to the builder to inject framework-specific defaults (encryption, log retention, etc.).

Requirement ID: 2.7 OpenTelemetry Observability Requirements
Status: PASS
Finding: Observability hooks present near packages/components/dagger-engine-pool/src/dagger-engine-pool.component.ts:23.
Remediation: None

Requirement ID: 2.8 Feature Flags Integration
Status: FAIL
Finding: Neither the component code nor package metadata references platform feature flags for dagger-engine-pool.
Remediation: Gate the component behind feature flags (OpenFeature integration + shinobi.featureFlags metadata).

Requirement ID: 2.10 Backstage Integration
Status: PASS
Finding: catalog-info.yaml present (packages/components/dagger-engine-pool/catalog-info.yaml).
Remediation: None

Requirement ID: 3.3 Config.schema.json Requirement
Status: PASS
Finding: Config.schema.json present in package root.
Remediation: None

Requirement ID: 3.5 Error Handling Patterns
Status: FAIL
Finding: Synth() body at packages/components/dagger-engine-pool/src/dagger-engine-pool.component.ts:47 lacks try/catch for structured error logging.
Remediation: Wrap synth() contents in try/catch and call logError() before rethrowing.

Requirement ID: 4.1 Test Framework
Status: FAIL
Finding: packages/components/dagger-engine-pool/package.json lacks a Vitest dependency; tests still rely on Jest.
Remediation: Switch component tests to Vitest and add the vitest dependency per the platform testing standard.

Requirement ID: 4.2 CDK-Nag Security Tests
Status: PASS
Finding: tests/security/cdk-nag.test.ts exists.
Remediation: None

Requirement ID: 4.7 Test File Organization
Status: PASS
Finding: tests/ directory present.
Remediation: None

Requirement ID: 4.8 Component Versioning & Metadata
Status: FAIL
Finding: CHANGELOG.md missing
Remediation: Set a semantic version in package.json and maintain CHANGELOG.md per governance policy.

Requirement ID: 4.9 Audit Files Requirements
Status: PASS
Finding: Audit/ documentation present.
Remediation: None

Requirement ID: V.1 TODO/Placeholder Sweep
Status: FAIL
Finding: Found TODO/placeholder code at packages/components/dagger-engine-pool/README.md:214 → ### OSCAL Stub (`audit/dagger-engine-pool.oscal.json`)
Remediation: Resolve TODO/placeholder logic and replace vaporware sections with production-ready implementations/documentation.

## deployment-bundle-pipeline
Requirement ID: 0.1 Platform Component API Spec
Status: FAIL
Finding: getType() is absent in packages/components/deployment-bundle-pipeline/src/deployment-bundle-pipeline.component.ts
Remediation: Define a component class that extends BaseComponent and implements synth(), getCapabilities(), and getType() using the canonical constructor signature.

Requirement ID: 0.2 Platform Configuration Standard
Status: PASS
Finding: Config builder at packages/components/deployment-bundle-pipeline/src/deployment-bundle-pipeline.builder.ts:16 derives from ConfigBuilder and implements both hardcoded fallbacks and compliance defaults.
Remediation: None

Requirement ID: 0.3 Platform Tagging Standard
Status: PASS
Finding: applyStandardTags invoked (e.g., packages/components/deployment-bundle-pipeline/src/deployment-bundle-pipeline.component.ts:63).
Remediation: None

Requirement ID: 0.4 Platform Logging Standard
Status: FAIL
Finding: Synth defined at packages/components/deployment-bundle-pipeline/src/deployment-bundle-pipeline.component.ts lacks lifecycle logging: no logComponentEvent("synthesis_start") call; no logComponentEvent("synthesis_complete") call
Remediation: Emit logComponentEvent() entries at the start and end of synth() to satisfy logging standard.

Requirement ID: 0.5 Platform Observability Standard
Status: PASS
Finding: Observability hooks detected around packages/components/deployment-bundle-pipeline/src/deployment-bundle-pipeline.component.ts:527.
Remediation: None

Requirement ID: 0.6 Platform Testing Standard
Status: FAIL
Finding: packages/components/deployment-bundle-pipeline/package.json lacks a Vitest dependency; tests still rely on Jest.
Remediation: Switch component tests to Vitest and add the vitest dependency per the platform testing standard.

Requirement ID: 0.7 Platform Capability Naming Standard
Status: FAIL
Finding: package.json is missing shinobi.capabilities metadata for deployment-bundle-pipeline
Remediation: Register at least one capability via registerCapability() and mirror it in package.json shinobi.capabilities to satisfy the binding vocabulary.

Requirement ID: 1.2 Constructor Signature
Status: FAIL
Finding: Constructor in packages/components/deployment-bundle-pipeline/src/deployment-bundle-pipeline.component.ts does not use the canonical (scope, id, context, spec) signature.
Remediation: Align the constructor with the canonical signature and call super().

Requirement ID: 1.5 Creator Pattern
Status: FAIL
Finding: packages/components/deployment-bundle-pipeline/src/deployment-bundle-pipeline.creator.ts missing configSchema export
Remediation: Implement an IComponentCreator with component metadata, configSchema reference, and create/process methods per the standard.

Requirement ID: 1.6 Construct Registration
Status: FAIL
Finding: Component packages/components/deployment-bundle-pipeline/src/deployment-bundle-pipeline.component.ts never calls registerConstruct(), so resources are not discoverable.
Remediation: Call registerConstruct() for each important construct created inside synth().

Requirement ID: 1.7 Capability Registration
Status: PASS
Finding: Capabilities registered at packages/components/deployment-bundle-pipeline/src/deployment-bundle-pipeline.component.ts:57.
Remediation: None

Requirement ID: 2.5 Structured Logging Requirements
Status: FAIL
Finding: Synth at packages/components/deployment-bundle-pipeline/src/deployment-bundle-pipeline.component.ts lacks structured logging: no try/catch around synth() logic; missing logComponentEvent("synthesis_start"); missing logComponentEvent("synthesis_complete")
Remediation: Wrap synth() in try/catch and log start/complete events using logComponentEvent().

Requirement ID: 2.6 Compliance Framework Defaults
Status: PASS
Finding: Compliance defaults implemented at packages/components/deployment-bundle-pipeline/src/deployment-bundle-pipeline.builder.ts:66.
Remediation: None

Requirement ID: 2.7 OpenTelemetry Observability Requirements
Status: PASS
Finding: Observability hooks present near packages/components/deployment-bundle-pipeline/src/deployment-bundle-pipeline.component.ts:527.
Remediation: None

Requirement ID: 2.8 Feature Flags Integration
Status: FAIL
Finding: Neither the component code nor package metadata references platform feature flags for deployment-bundle-pipeline.
Remediation: Gate the component behind feature flags (OpenFeature integration + shinobi.featureFlags metadata).

Requirement ID: 2.10 Backstage Integration
Status: PASS
Finding: catalog-info.yaml present (packages/components/deployment-bundle-pipeline/catalog-info.yaml).
Remediation: None

Requirement ID: 3.3 Config.schema.json Requirement
Status: PASS
Finding: Config.schema.json present in package root.
Remediation: None

Requirement ID: 3.5 Error Handling Patterns
Status: FAIL
Finding: Synth() body at packages/components/deployment-bundle-pipeline/src/deployment-bundle-pipeline.component.ts lacks try/catch for structured error logging.
Remediation: Wrap synth() contents in try/catch and call logError() before rethrowing.

Requirement ID: 4.1 Test Framework
Status: FAIL
Finding: packages/components/deployment-bundle-pipeline/package.json lacks a Vitest dependency; tests still rely on Jest.
Remediation: Switch component tests to Vitest and add the vitest dependency per the platform testing standard.

Requirement ID: 4.2 CDK-Nag Security Tests
Status: FAIL
Finding: Missing tests/security/cdk-nag.test.ts in packages/components/deployment-bundle-pipeline.
Remediation: Add CDK-Nag AwsSolutions tests covering all frameworks.

Requirement ID: 4.7 Test File Organization
Status: PASS
Finding: tests/ directory present.
Remediation: None

Requirement ID: 4.8 Component Versioning & Metadata
Status: FAIL
Finding: CHANGELOG.md missing
Remediation: Set a semantic version in package.json and maintain CHANGELOG.md per governance policy.

Requirement ID: 4.9 Audit Files Requirements
Status: PASS
Finding: Audit/ documentation present.
Remediation: None

Requirement ID: V.1 TODO/Placeholder Sweep
Status: FAIL
Finding: Found TODO/placeholder code at packages/components/deployment-bundle-pipeline/dagger.ts:75 → .withExec(["bash", "-lc", "mkdir -p out && echo '{}' > out/plan.json"]) // Stub: replace with actual svc plan
Remediation: Resolve TODO/placeholder logic and replace vaporware sections with production-ready implementations/documentation.

## dynamodb-table
Requirement ID: 0.1 Platform Component API Spec
Status: FAIL
Finding: class declaration at packages/components/dynamodb-table/src/dynamodb-table.component.ts does not extend BaseComponent
Remediation: Define a component class that extends BaseComponent and implements synth(), getCapabilities(), and getType() using the canonical constructor signature.

Requirement ID: 0.2 Platform Configuration Standard
Status: FAIL
Finding: getComplianceFrameworkDefaults() missing in packages/components/dynamodb-table/src/dynamodb-table.builder.ts
Remediation: Implement a ConfigBuilder subclass with getHardcodedFallbacks() and getComplianceFrameworkDefaults() to enforce the five-layer precedence chain.

Requirement ID: 0.3 Platform Tagging Standard
Status: PASS
Finding: applyStandardTags invoked (e.g., packages/components/dynamodb-table/src/dynamodb-table.component.ts:155).
Remediation: None

Requirement ID: 0.4 Platform Logging Standard
Status: FAIL
Finding: Synth defined at packages/components/dynamodb-table/src/dynamodb-table.component.ts:38 lacks lifecycle logging: no logComponentEvent("synthesis_start") call; no logComponentEvent("synthesis_complete") call
Remediation: Emit logComponentEvent() entries at the start and end of synth() to satisfy logging standard.

Requirement ID: 0.5 Platform Observability Standard
Status: PASS
Finding: Observability hooks detected around packages/components/dynamodb-table/src/dynamodb-table.component.ts:30.
Remediation: None

Requirement ID: 0.6 Platform Testing Standard
Status: FAIL
Finding: packages/components/dynamodb-table/package.json lacks a Vitest dependency; tests still rely on Jest.
Remediation: Switch component tests to Vitest and add the vitest dependency per the platform testing standard.

Requirement ID: 0.7 Platform Capability Naming Standard
Status: FAIL
Finding: package.json is missing shinobi.capabilities metadata for dynamodb-table
Remediation: Register at least one capability via registerCapability() and mirror it in package.json shinobi.capabilities to satisfy the binding vocabulary.

Requirement ID: 1.2 Constructor Signature
Status: PASS
Finding: Constructor matches required signature at packages/components/dynamodb-table/src/dynamodb-table.component.ts:33.
Remediation: None

Requirement ID: 1.5 Creator Pattern
Status: PASS
Finding: Creator implements IComponentCreator at packages/components/dynamodb-table/src/dynamodb-table.creator.ts:26 and exports configSchema (packages/components/dynamodb-table/src/dynamodb-table.creator.ts:66).
Remediation: None

Requirement ID: 1.6 Construct Registration
Status: PASS
Finding: Constructs registered (first occurrence packages/components/dynamodb-table/src/dynamodb-table.component.ts:72).
Remediation: None

Requirement ID: 1.7 Capability Registration
Status: PASS
Finding: Capabilities registered at packages/components/dynamodb-table/src/dynamodb-table.component.ts:79.
Remediation: None

Requirement ID: 2.5 Structured Logging Requirements
Status: FAIL
Finding: Synth at packages/components/dynamodb-table/src/dynamodb-table.component.ts:38 lacks structured logging: missing logComponentEvent("synthesis_start"); missing logComponentEvent("synthesis_complete")
Remediation: Wrap synth() in try/catch and log start/complete events using logComponentEvent().

Requirement ID: 2.6 Compliance Framework Defaults
Status: FAIL
Finding: Builder packages/components/dynamodb-table/src/dynamodb-table.builder.ts lacks getComplianceFrameworkDefaults(), so FedRAMP tiers do not receive hardened defaults.
Remediation: Add getComplianceFrameworkDefaults() to the builder to inject framework-specific defaults (encryption, log retention, etc.).

Requirement ID: 2.7 OpenTelemetry Observability Requirements
Status: PASS
Finding: Observability hooks present near packages/components/dynamodb-table/src/dynamodb-table.component.ts:30.
Remediation: None

Requirement ID: 2.8 Feature Flags Integration
Status: FAIL
Finding: Neither the component code nor package metadata references platform feature flags for dynamodb-table.
Remediation: Gate the component behind feature flags (OpenFeature integration + shinobi.featureFlags metadata).

Requirement ID: 2.10 Backstage Integration
Status: PASS
Finding: catalog-info.yaml present (packages/components/dynamodb-table/catalog-info.yaml).
Remediation: None

Requirement ID: 3.3 Config.schema.json Requirement
Status: PASS
Finding: Config.schema.json present in package root.
Remediation: None

Requirement ID: 3.5 Error Handling Patterns
Status: PASS
Finding: Synth() wraps logic in try/catch at packages/components/dynamodb-table/src/dynamodb-table.component.ts:38.
Remediation: None

Requirement ID: 4.1 Test Framework
Status: FAIL
Finding: packages/components/dynamodb-table/package.json lacks a Vitest dependency; tests still rely on Jest.
Remediation: Switch component tests to Vitest and add the vitest dependency per the platform testing standard.

Requirement ID: 4.2 CDK-Nag Security Tests
Status: FAIL
Finding: Missing tests/security/cdk-nag.test.ts in packages/components/dynamodb-table.
Remediation: Add CDK-Nag AwsSolutions tests covering all frameworks.

Requirement ID: 4.7 Test File Organization
Status: PASS
Finding: tests/ directory present.
Remediation: None

Requirement ID: 4.8 Component Versioning & Metadata
Status: PASS
Finding: package.json uses semver and CHANGELOG.md exists.
Remediation: None

Requirement ID: 4.9 Audit Files Requirements
Status: PASS
Finding: Audit/ documentation present.
Remediation: None

Requirement ID: V.1 TODO/Placeholder Sweep
Status: FAIL
Finding: Found TODO/placeholder code at packages/components/dynamodb-table/audit/README.md:5 → - `component.plan.json` – placeholder plan referencing the component type.
Remediation: Resolve TODO/placeholder logic and replace vaporware sections with production-ready implementations/documentation.

## ec2-instance
Requirement ID: 0.1 Platform Component API Spec
Status: PASS
Finding: `Ec2InstanceComponent` extends BaseComponent at packages/components/ec2-instance/ec2-instance.component.ts:31 with getCapabilities/getType defined at packages/components/ec2-instance/ec2-instance.component.ts:109 / packages/components/ec2-instance/ec2-instance.component.ts:117.
Remediation: None

Requirement ID: 0.2 Platform Configuration Standard
Status: PASS
Finding: Config builder at packages/components/ec2-instance/ec2-instance.builder.ts:279 derives from ConfigBuilder and implements both hardcoded fallbacks and compliance defaults.
Remediation: None

Requirement ID: 0.3 Platform Tagging Standard
Status: PASS
Finding: applyStandardTags invoked (e.g., packages/components/ec2-instance/ec2-instance.component.ts:78).
Remediation: None

Requirement ID: 0.4 Platform Logging Standard
Status: PASS
Finding: Synth lifecycle logging present at packages/components/ec2-instance/ec2-instance.component.ts:49 and packages/components/ec2-instance/ec2-instance.component.ts:99.
Remediation: None

Requirement ID: 0.5 Platform Observability Standard
Status: PASS
Finding: Observability hooks detected around packages/components/ec2-instance/ec2-instance.component.ts:74.
Remediation: None

Requirement ID: 0.6 Platform Testing Standard
Status: FAIL
Finding: packages/components/ec2-instance/package.json lacks a Vitest dependency; tests still rely on Jest.
Remediation: Switch component tests to Vitest and add the vitest dependency per the platform testing standard.

Requirement ID: 0.7 Platform Capability Naming Standard
Status: FAIL
Finding: package.json is missing shinobi.capabilities metadata for ec2-instance
Remediation: Register at least one capability via registerCapability() and mirror it in package.json shinobi.capabilities to satisfy the binding vocabulary.

Requirement ID: 1.2 Constructor Signature
Status: PASS
Finding: Constructor matches required signature at packages/components/ec2-instance/ec2-instance.component.ts:40.
Remediation: None

Requirement ID: 1.5 Creator Pattern
Status: PASS
Finding: Creator implements IComponentCreator at packages/components/ec2-instance/ec2-instance.creator.ts:27 and exports configSchema (packages/components/ec2-instance/ec2-instance.creator.ts:67).
Remediation: None

Requirement ID: 1.6 Construct Registration
Status: PASS
Finding: Constructs registered (first occurrence packages/components/ec2-instance/ec2-instance.component.ts:86).
Remediation: None

Requirement ID: 1.7 Capability Registration
Status: PASS
Finding: Capabilities registered at packages/components/ec2-instance/ec2-instance.component.ts:94.
Remediation: None

Requirement ID: 2.5 Structured Logging Requirements
Status: PASS
Finding: Synth() uses try/catch with lifecycle logging (packages/components/ec2-instance/ec2-instance.component.ts:48).
Remediation: None

Requirement ID: 2.6 Compliance Framework Defaults
Status: PASS
Finding: Compliance defaults implemented at packages/components/ec2-instance/ec2-instance.builder.ts:321.
Remediation: None

Requirement ID: 2.7 OpenTelemetry Observability Requirements
Status: PASS
Finding: Observability hooks present near packages/components/ec2-instance/ec2-instance.component.ts:74.
Remediation: None

Requirement ID: 2.8 Feature Flags Integration
Status: FAIL
Finding: Neither the component code nor package metadata references platform feature flags for ec2-instance.
Remediation: Gate the component behind feature flags (OpenFeature integration + shinobi.featureFlags metadata).

Requirement ID: 2.10 Backstage Integration
Status: PASS
Finding: catalog-info.yaml present (packages/components/ec2-instance/catalog-info.yaml).
Remediation: None

Requirement ID: 3.3 Config.schema.json Requirement
Status: PASS
Finding: Config.schema.json present in package root.
Remediation: None

Requirement ID: 3.5 Error Handling Patterns
Status: PASS
Finding: Synth() wraps logic in try/catch at packages/components/ec2-instance/ec2-instance.component.ts:48.
Remediation: None

Requirement ID: 4.1 Test Framework
Status: FAIL
Finding: packages/components/ec2-instance/package.json lacks a Vitest dependency; tests still rely on Jest.
Remediation: Switch component tests to Vitest and add the vitest dependency per the platform testing standard.

Requirement ID: 4.2 CDK-Nag Security Tests
Status: FAIL
Finding: Missing tests/security/cdk-nag.test.ts in packages/components/ec2-instance.
Remediation: Add CDK-Nag AwsSolutions tests covering all frameworks.

Requirement ID: 4.7 Test File Organization
Status: PASS
Finding: tests/ directory present.
Remediation: None

Requirement ID: 4.8 Component Versioning & Metadata
Status: PASS
Finding: package.json uses semver and CHANGELOG.md exists.
Remediation: None

Requirement ID: 4.9 Audit Files Requirements
Status: PASS
Finding: Audit/ documentation present.
Remediation: None

Requirement ID: V.1 TODO/Placeholder Sweep
Status: FAIL
Finding: Found TODO/placeholder code at packages/components/ec2-instance/ec2-instance.creator.ts:202 → // TODO: Define required capabilities
Remediation: Resolve TODO/placeholder logic and replace vaporware sections with production-ready implementations/documentation.

## ecr-repository
Requirement ID: 0.1 Platform Component API Spec
Status: PASS
Finding: `EcrRepositoryComponent` extends BaseComponent at packages/components/ecr-repository/ecr-repository.component.ts:27 with getCapabilities/getType defined at packages/components/ecr-repository/ecr-repository.component.ts:89 / packages/components/ecr-repository/ecr-repository.component.ts:94.
Remediation: None

Requirement ID: 0.2 Platform Configuration Standard
Status: PASS
Finding: Config builder at packages/components/ecr-repository/ecr-repository.builder.ts:86 derives from ConfigBuilder and implements both hardcoded fallbacks and compliance defaults.
Remediation: None

Requirement ID: 0.3 Platform Tagging Standard
Status: PASS
Finding: applyStandardTags invoked (e.g., packages/components/ecr-repository/ecr-repository.component.ts:113).
Remediation: None

Requirement ID: 0.4 Platform Logging Standard
Status: PASS
Finding: Synth lifecycle logging present at packages/components/ecr-repository/ecr-repository.component.ts:43 and packages/components/ecr-repository/ecr-repository.component.ts:74.
Remediation: None

Requirement ID: 0.5 Platform Observability Standard
Status: PASS
Finding: Observability hooks detected around packages/components/ecr-repository/ecr-repository.component.ts:52.
Remediation: None

Requirement ID: 0.6 Platform Testing Standard
Status: FAIL
Finding: packages/components/ecr-repository/package.json lacks a Vitest dependency; tests still rely on Jest.
Remediation: Switch component tests to Vitest and add the vitest dependency per the platform testing standard.

Requirement ID: 0.7 Platform Capability Naming Standard
Status: FAIL
Finding: package.json is missing shinobi.capabilities metadata for ecr-repository
Remediation: Register at least one capability via registerCapability() and mirror it in package.json shinobi.capabilities to satisfy the binding vocabulary.

Requirement ID: 1.2 Constructor Signature
Status: PASS
Finding: Constructor matches required signature at packages/components/ecr-repository/ecr-repository.component.ts:34.
Remediation: None

Requirement ID: 1.5 Creator Pattern
Status: PASS
Finding: Creator implements IComponentCreator at packages/components/ecr-repository/ecr-repository.creator.ts:34 and exports configSchema (packages/components/ecr-repository/ecr-repository.creator.ts:74).
Remediation: None

Requirement ID: 1.6 Construct Registration
Status: PASS
Finding: Constructs registered (first occurrence packages/components/ecr-repository/ecr-repository.component.ts:54).
Remediation: None

Requirement ID: 1.7 Capability Registration
Status: PASS
Finding: Capabilities registered at packages/components/ecr-repository/ecr-repository.component.ts:64.
Remediation: None

Requirement ID: 2.5 Structured Logging Requirements
Status: PASS
Finding: Synth() uses try/catch with lifecycle logging (packages/components/ecr-repository/ecr-repository.component.ts:42).
Remediation: None

Requirement ID: 2.6 Compliance Framework Defaults
Status: PASS
Finding: Compliance defaults implemented at packages/components/ecr-repository/ecr-repository.builder.ts:138.
Remediation: None

Requirement ID: 2.7 OpenTelemetry Observability Requirements
Status: PASS
Finding: Observability hooks present near packages/components/ecr-repository/ecr-repository.component.ts:52.
Remediation: None

Requirement ID: 2.8 Feature Flags Integration
Status: FAIL
Finding: Neither the component code nor package metadata references platform feature flags for ecr-repository.
Remediation: Gate the component behind feature flags (OpenFeature integration + shinobi.featureFlags metadata).

Requirement ID: 2.10 Backstage Integration
Status: PASS
Finding: catalog-info.yaml present (packages/components/ecr-repository/catalog-info.yaml).
Remediation: None

Requirement ID: 3.3 Config.schema.json Requirement
Status: PASS
Finding: Config.schema.json present in package root.
Remediation: None

Requirement ID: 3.5 Error Handling Patterns
Status: PASS
Finding: Synth() wraps logic in try/catch at packages/components/ecr-repository/ecr-repository.component.ts:42.
Remediation: None

Requirement ID: 4.1 Test Framework
Status: FAIL
Finding: packages/components/ecr-repository/package.json lacks a Vitest dependency; tests still rely on Jest.
Remediation: Switch component tests to Vitest and add the vitest dependency per the platform testing standard.

Requirement ID: 4.2 CDK-Nag Security Tests
Status: PASS
Finding: tests/security/cdk-nag.test.ts exists.
Remediation: None

Requirement ID: 4.7 Test File Organization
Status: PASS
Finding: tests/ directory present.
Remediation: None

Requirement ID: 4.8 Component Versioning & Metadata
Status: PASS
Finding: package.json uses semver and CHANGELOG.md exists.
Remediation: None

Requirement ID: 4.9 Audit Files Requirements
Status: PASS
Finding: Audit/ documentation present.
Remediation: None

Requirement ID: V.1 TODO/Placeholder Sweep
Status: FAIL
Finding: Found TODO/placeholder code at packages/components/ecr-repository/ecr-repository.creator.ts:110 → // TODO: Add component-specific validations here
Remediation: Resolve TODO/placeholder logic and replace vaporware sections with production-ready implementations/documentation.

## ecs-cluster
Requirement ID: 0.1 Platform Component API Spec
Status: PASS
Finding: `EcsClusterComponent` extends BaseComponent at packages/components/ecs-cluster/src/ecs-cluster.component.ts:38 with getCapabilities/getType defined at packages/components/ecs-cluster/src/ecs-cluster.component.ts:135 / packages/components/ecs-cluster/src/ecs-cluster.component.ts:143.
Remediation: None

Requirement ID: 0.2 Platform Configuration Standard
Status: PASS
Finding: Config builder at packages/components/ecs-cluster/src/ecs-cluster.builder.ts:98 derives from ConfigBuilder and implements both hardcoded fallbacks and compliance defaults.
Remediation: None

Requirement ID: 0.3 Platform Tagging Standard
Status: PASS
Finding: applyStandardTags invoked (e.g., packages/components/ecs-cluster/src/ecs-cluster.component.ts:268).
Remediation: None

Requirement ID: 0.4 Platform Logging Standard
Status: PASS
Finding: Synth lifecycle logging present at packages/components/ecs-cluster/src/ecs-cluster.component.ts:69 and packages/components/ecs-cluster/src/ecs-cluster.component.ts:117.
Remediation: None

Requirement ID: 0.5 Platform Observability Standard
Status: PASS
Finding: Observability hooks detected around packages/components/ecs-cluster/src/ecs-cluster.component.ts:29.
Remediation: None

Requirement ID: 0.6 Platform Testing Standard
Status: FAIL
Finding: packages/components/ecs-cluster/package.json lacks a Vitest dependency; tests still rely on Jest.
Remediation: Switch component tests to Vitest and add the vitest dependency per the platform testing standard.

Requirement ID: 0.7 Platform Capability Naming Standard
Status: FAIL
Finding: package.json is missing shinobi.capabilities metadata for ecs-cluster
Remediation: Register at least one capability via registerCapability() and mirror it in package.json shinobi.capabilities to satisfy the binding vocabulary.

Requirement ID: 1.2 Constructor Signature
Status: PASS
Finding: Constructor matches required signature at packages/components/ecs-cluster/src/ecs-cluster.component.ts:52.
Remediation: None

Requirement ID: 1.5 Creator Pattern
Status: PASS
Finding: Creator implements IComponentCreator at packages/components/ecs-cluster/src/ecs-cluster.creator.ts:26 and exports configSchema (packages/components/ecs-cluster/src/ecs-cluster.creator.ts:66).
Remediation: None

Requirement ID: 1.6 Construct Registration
Status: PASS
Finding: Constructs registered (first occurrence packages/components/ecs-cluster/src/ecs-cluster.component.ts:100).
Remediation: None

Requirement ID: 1.7 Capability Registration
Status: PASS
Finding: Capabilities registered at packages/components/ecs-cluster/src/ecs-cluster.component.ts:107.
Remediation: None

Requirement ID: 2.5 Structured Logging Requirements
Status: PASS
Finding: Synth() uses try/catch with lifecycle logging (packages/components/ecs-cluster/src/ecs-cluster.component.ts:63).
Remediation: None

Requirement ID: 2.6 Compliance Framework Defaults
Status: PASS
Finding: Compliance defaults implemented at packages/components/ecs-cluster/src/ecs-cluster.builder.ts:144.
Remediation: None

Requirement ID: 2.7 OpenTelemetry Observability Requirements
Status: PASS
Finding: Observability hooks present near packages/components/ecs-cluster/src/ecs-cluster.component.ts:29.
Remediation: None

Requirement ID: 2.8 Feature Flags Integration
Status: FAIL
Finding: Neither the component code nor package metadata references platform feature flags for ecs-cluster.
Remediation: Gate the component behind feature flags (OpenFeature integration + shinobi.featureFlags metadata).

Requirement ID: 2.10 Backstage Integration
Status: PASS
Finding: catalog-info.yaml present (packages/components/ecs-cluster/catalog-info.yaml).
Remediation: None

Requirement ID: 3.3 Config.schema.json Requirement
Status: PASS
Finding: Config.schema.json present in package root.
Remediation: None

Requirement ID: 3.5 Error Handling Patterns
Status: PASS
Finding: Synth() wraps logic in try/catch at packages/components/ecs-cluster/src/ecs-cluster.component.ts:63.
Remediation: None

Requirement ID: 4.1 Test Framework
Status: FAIL
Finding: packages/components/ecs-cluster/package.json lacks a Vitest dependency; tests still rely on Jest.
Remediation: Switch component tests to Vitest and add the vitest dependency per the platform testing standard.

Requirement ID: 4.2 CDK-Nag Security Tests
Status: PASS
Finding: tests/security/cdk-nag.test.ts exists.
Remediation: None

Requirement ID: 4.7 Test File Organization
Status: PASS
Finding: tests/ directory present.
Remediation: None

Requirement ID: 4.8 Component Versioning & Metadata
Status: PASS
Finding: package.json uses semver and CHANGELOG.md exists.
Remediation: None

Requirement ID: 4.9 Audit Files Requirements
Status: PASS
Finding: Audit/ documentation present.
Remediation: None

Requirement ID: V.1 TODO/Placeholder Sweep
Status: FAIL
Finding: Found TODO/placeholder code at packages/components/ecs-cluster/audit/ecs-cluster.oscal.json:13 → "implementationStatement": "TODO: Describe how ECS cluster implements access control for user accounts and authentication",
Remediation: Resolve TODO/placeholder logic and replace vaporware sections with production-ready implementations/documentation.

## ecs-ec2-service
Requirement ID: 0.1 Platform Component API Spec
Status: PASS
Finding: `EcsEc2ServiceComponent` extends BaseComponent at packages/components/ecs-ec2-service/src/ecs-ec2-service.component.ts:24 with getCapabilities/getType defined at packages/components/ecs-ec2-service/src/ecs-ec2-service.component.ts:68 / packages/components/ecs-ec2-service/src/ecs-ec2-service.component.ts:73.
Remediation: None

Requirement ID: 0.2 Platform Configuration Standard
Status: FAIL
Finding: getComplianceFrameworkDefaults() missing in packages/components/ecs-ec2-service/src/ecs-ec2-service.builder.ts
Remediation: Implement a ConfigBuilder subclass with getHardcodedFallbacks() and getComplianceFrameworkDefaults() to enforce the five-layer precedence chain.

Requirement ID: 0.3 Platform Tagging Standard
Status: PASS
Finding: applyStandardTags invoked (e.g., packages/components/ecs-ec2-service/src/ecs-ec2-service.component.ts:150).
Remediation: None

Requirement ID: 0.4 Platform Logging Standard
Status: PASS
Finding: Synth lifecycle logging present at packages/components/ecs-ec2-service/src/ecs-ec2-service.component.ts:39 and packages/components/ecs-ec2-service/src/ecs-ec2-service.component.ts:61.
Remediation: None

Requirement ID: 0.5 Platform Observability Standard
Status: PASS
Finding: Observability hooks detected around packages/components/ecs-ec2-service/src/ecs-ec2-service.component.ts:332.
Remediation: None

Requirement ID: 0.6 Platform Testing Standard
Status: FAIL
Finding: packages/components/ecs-ec2-service/package.json lacks a Vitest dependency; tests still rely on Jest.
Remediation: Switch component tests to Vitest and add the vitest dependency per the platform testing standard.

Requirement ID: 0.7 Platform Capability Naming Standard
Status: FAIL
Finding: package.json is missing shinobi.capabilities metadata for ecs-ec2-service
Remediation: Register at least one capability via registerCapability() and mirror it in package.json shinobi.capabilities to satisfy the binding vocabulary.

Requirement ID: 1.2 Constructor Signature
Status: PASS
Finding: Constructor matches required signature at packages/components/ecs-ec2-service/src/ecs-ec2-service.component.ts:34.
Remediation: None

Requirement ID: 1.5 Creator Pattern
Status: PASS
Finding: Creator implements IComponentCreator at packages/components/ecs-ec2-service/src/ecs-ec2-service.creator.ts:22 and exports configSchema (packages/components/ecs-ec2-service/src/ecs-ec2-service.creator.ts:62).
Remediation: None

Requirement ID: 1.6 Construct Registration
Status: PASS
Finding: Constructs registered (first occurrence packages/components/ecs-ec2-service/src/ecs-ec2-service.component.ts:52).
Remediation: None

Requirement ID: 1.7 Capability Registration
Status: PASS
Finding: Capabilities registered at packages/components/ecs-ec2-service/src/ecs-ec2-service.component.ts:59.
Remediation: None

Requirement ID: 2.5 Structured Logging Requirements
Status: PASS
Finding: Synth() uses try/catch with lifecycle logging (packages/components/ecs-ec2-service/src/ecs-ec2-service.component.ts:38).
Remediation: None

Requirement ID: 2.6 Compliance Framework Defaults
Status: FAIL
Finding: Builder packages/components/ecs-ec2-service/src/ecs-ec2-service.builder.ts lacks getComplianceFrameworkDefaults(), so FedRAMP tiers do not receive hardened defaults.
Remediation: Add getComplianceFrameworkDefaults() to the builder to inject framework-specific defaults (encryption, log retention, etc.).

Requirement ID: 2.7 OpenTelemetry Observability Requirements
Status: PASS
Finding: Observability hooks present near packages/components/ecs-ec2-service/src/ecs-ec2-service.component.ts:332.
Remediation: None

Requirement ID: 2.8 Feature Flags Integration
Status: FAIL
Finding: Neither the component code nor package metadata references platform feature flags for ecs-ec2-service.
Remediation: Gate the component behind feature flags (OpenFeature integration + shinobi.featureFlags metadata).

Requirement ID: 2.10 Backstage Integration
Status: PASS
Finding: catalog-info.yaml present (packages/components/ecs-ec2-service/catalog-info.yaml).
Remediation: None

Requirement ID: 3.3 Config.schema.json Requirement
Status: PASS
Finding: Config.schema.json present in package root.
Remediation: None

Requirement ID: 3.5 Error Handling Patterns
Status: PASS
Finding: Synth() wraps logic in try/catch at packages/components/ecs-ec2-service/src/ecs-ec2-service.component.ts:38.
Remediation: None

Requirement ID: 4.1 Test Framework
Status: FAIL
Finding: packages/components/ecs-ec2-service/package.json lacks a Vitest dependency; tests still rely on Jest.
Remediation: Switch component tests to Vitest and add the vitest dependency per the platform testing standard.

Requirement ID: 4.2 CDK-Nag Security Tests
Status: PASS
Finding: tests/security/cdk-nag.test.ts exists.
Remediation: None

Requirement ID: 4.7 Test File Organization
Status: PASS
Finding: tests/ directory present.
Remediation: None

Requirement ID: 4.8 Component Versioning & Metadata
Status: PASS
Finding: package.json uses semver and CHANGELOG.md exists.
Remediation: None

Requirement ID: 4.9 Audit Files Requirements
Status: PASS
Finding: Audit/ documentation present.
Remediation: None

Requirement ID: V.1 TODO/Placeholder Sweep
Status: FAIL
Finding: Found TODO/placeholder code at packages/components/ecs-ec2-service/Audit/README.md:131 → | TBD | Priority 2 remediation | 🔄 Planned |
Remediation: Resolve TODO/placeholder logic and replace vaporware sections with production-ready implementations/documentation.

## ecs-fargate-service
Requirement ID: 0.1 Platform Component API Spec
Status: PASS
Finding: `EcsFargateServiceComponent` extends BaseComponent at packages/components/ecs-fargate-service/src/ecs-fargate-service.component.ts:32 with getCapabilities/getType defined at packages/components/ecs-fargate-service/src/ecs-fargate-service.component.ts:112 / packages/components/ecs-fargate-service/src/ecs-fargate-service.component.ts:120.
Remediation: None

Requirement ID: 0.2 Platform Configuration Standard
Status: FAIL
Finding: getComplianceFrameworkDefaults() missing in packages/components/ecs-fargate-service/src/ecs-fargate-service.builder.ts
Remediation: Implement a ConfigBuilder subclass with getHardcodedFallbacks() and getComplianceFrameworkDefaults() to enforce the five-layer precedence chain.

Requirement ID: 0.3 Platform Tagging Standard
Status: PASS
Finding: applyStandardTags invoked (e.g., packages/components/ecs-fargate-service/src/ecs-fargate-service.component.ts:178).
Remediation: None

Requirement ID: 0.4 Platform Logging Standard
Status: PASS
Finding: Synth lifecycle logging present at packages/components/ecs-fargate-service/src/ecs-fargate-service.component.ts:60 and packages/components/ecs-fargate-service/src/ecs-fargate-service.component.ts:102.
Remediation: None

Requirement ID: 0.5 Platform Observability Standard
Status: PASS
Finding: Observability hooks detected around packages/components/ecs-fargate-service/src/ecs-fargate-service.component.ts:85.
Remediation: None

Requirement ID: 0.6 Platform Testing Standard
Status: FAIL
Finding: packages/components/ecs-fargate-service/package.json lacks a Vitest dependency; tests still rely on Jest.
Remediation: Switch component tests to Vitest and add the vitest dependency per the platform testing standard.

Requirement ID: 0.7 Platform Capability Naming Standard
Status: FAIL
Finding: package.json is missing shinobi.capabilities metadata for ecs-fargate-service
Remediation: Register at least one capability via registerCapability() and mirror it in package.json shinobi.capabilities to satisfy the binding vocabulary.

Requirement ID: 1.2 Constructor Signature
Status: PASS
Finding: Constructor matches required signature at packages/components/ecs-fargate-service/src/ecs-fargate-service.component.ts:52.
Remediation: None

Requirement ID: 1.5 Creator Pattern
Status: PASS
Finding: Creator implements IComponentCreator at packages/components/ecs-fargate-service/src/ecs-fargate-service.creator.ts:22 and exports configSchema (packages/components/ecs-fargate-service/src/ecs-fargate-service.creator.ts:86).
Remediation: None

Requirement ID: 1.6 Construct Registration
Status: PASS
Finding: Constructs registered (first occurrence packages/components/ecs-fargate-service/src/ecs-fargate-service.component.ts:89).
Remediation: None

Requirement ID: 1.7 Capability Registration
Status: PASS
Finding: Capabilities registered at packages/components/ecs-fargate-service/src/ecs-fargate-service.component.ts:100.
Remediation: None

Requirement ID: 2.5 Structured Logging Requirements
Status: PASS
Finding: Synth() uses try/catch with lifecycle logging (packages/components/ecs-fargate-service/src/ecs-fargate-service.component.ts:59).
Remediation: None

Requirement ID: 2.6 Compliance Framework Defaults
Status: FAIL
Finding: Builder packages/components/ecs-fargate-service/src/ecs-fargate-service.builder.ts lacks getComplianceFrameworkDefaults(), so FedRAMP tiers do not receive hardened defaults.
Remediation: Add getComplianceFrameworkDefaults() to the builder to inject framework-specific defaults (encryption, log retention, etc.).

Requirement ID: 2.7 OpenTelemetry Observability Requirements
Status: PASS
Finding: Observability hooks present near packages/components/ecs-fargate-service/src/ecs-fargate-service.component.ts:85.
Remediation: None

Requirement ID: 2.8 Feature Flags Integration
Status: FAIL
Finding: Neither the component code nor package metadata references platform feature flags for ecs-fargate-service.
Remediation: Gate the component behind feature flags (OpenFeature integration + shinobi.featureFlags metadata).

Requirement ID: 2.10 Backstage Integration
Status: PASS
Finding: catalog-info.yaml present (packages/components/ecs-fargate-service/catalog-info.yaml).
Remediation: None

Requirement ID: 3.3 Config.schema.json Requirement
Status: PASS
Finding: Config.schema.json present in package root.
Remediation: None

Requirement ID: 3.5 Error Handling Patterns
Status: PASS
Finding: Synth() wraps logic in try/catch at packages/components/ecs-fargate-service/src/ecs-fargate-service.component.ts:59.
Remediation: None

Requirement ID: 4.1 Test Framework
Status: FAIL
Finding: packages/components/ecs-fargate-service/package.json lacks a Vitest dependency; tests still rely on Jest.
Remediation: Switch component tests to Vitest and add the vitest dependency per the platform testing standard.

Requirement ID: 4.2 CDK-Nag Security Tests
Status: PASS
Finding: tests/security/cdk-nag.test.ts exists.
Remediation: None

Requirement ID: 4.7 Test File Organization
Status: PASS
Finding: tests/ directory present.
Remediation: None

Requirement ID: 4.8 Component Versioning & Metadata
Status: PASS
Finding: package.json uses semver and CHANGELOG.md exists.
Remediation: None

Requirement ID: 4.9 Audit Files Requirements
Status: PASS
Finding: Audit/ documentation present.
Remediation: None

Requirement ID: V.1 TODO/Placeholder Sweep
Status: FAIL
Finding: Found TODO/placeholder code at packages/components/ecs-fargate-service/AUDIT-SUMMARY.md:248 → ├── observability/  ✅ CREATED (placeholder)
Remediation: Resolve TODO/placeholder logic and replace vaporware sections with production-ready implementations/documentation.

## efs-filesystem
Requirement ID: 0.1 Platform Component API Spec
Status: PASS
Finding: `EfsFilesystemComponent` extends BaseComponent at packages/components/efs-filesystem/src/efs-filesystem.component.ts:28 with getCapabilities/getType defined at packages/components/efs-filesystem/src/efs-filesystem.component.ts:97 / packages/components/efs-filesystem/src/efs-filesystem.component.ts:102.
Remediation: None

Requirement ID: 0.2 Platform Configuration Standard
Status: FAIL
Finding: getComplianceFrameworkDefaults() missing in packages/components/efs-filesystem/src/efs-filesystem.builder.ts
Remediation: Implement a ConfigBuilder subclass with getHardcodedFallbacks() and getComplianceFrameworkDefaults() to enforce the five-layer precedence chain.

Requirement ID: 0.3 Platform Tagging Standard
Status: PASS
Finding: applyStandardTags invoked (e.g., packages/components/efs-filesystem/src/efs-filesystem.component.ts:151).
Remediation: None

Requirement ID: 0.4 Platform Logging Standard
Status: PASS
Finding: Synth lifecycle logging present at packages/components/efs-filesystem/src/efs-filesystem.component.ts:44 and packages/components/efs-filesystem/src/efs-filesystem.component.ts:90.
Remediation: None

Requirement ID: 0.5 Platform Observability Standard
Status: PASS
Finding: Observability hooks detected around packages/components/efs-filesystem/src/efs-filesystem.component.ts:431.
Remediation: None

Requirement ID: 0.6 Platform Testing Standard
Status: FAIL
Finding: packages/components/efs-filesystem/package.json lacks a Vitest dependency; tests still rely on Jest.
Remediation: Switch component tests to Vitest and add the vitest dependency per the platform testing standard.

Requirement ID: 0.7 Platform Capability Naming Standard
Status: FAIL
Finding: package.json is missing shinobi.capabilities metadata for efs-filesystem
Remediation: Register at least one capability via registerCapability() and mirror it in package.json shinobi.capabilities to satisfy the binding vocabulary.

Requirement ID: 1.2 Constructor Signature
Status: PASS
Finding: Constructor matches required signature at packages/components/efs-filesystem/src/efs-filesystem.component.ts:38.
Remediation: None

Requirement ID: 1.5 Creator Pattern
Status: PASS
Finding: Creator implements IComponentCreator at packages/components/efs-filesystem/src/efs-filesystem.creator.ts:26 and exports configSchema (packages/components/efs-filesystem/src/efs-filesystem.creator.ts:90).
Remediation: None

Requirement ID: 1.6 Construct Registration
Status: PASS
Finding: Constructs registered (first occurrence packages/components/efs-filesystem/src/efs-filesystem.component.ts:68).
Remediation: None

Requirement ID: 1.7 Capability Registration
Status: PASS
Finding: Capabilities registered at packages/components/efs-filesystem/src/efs-filesystem.component.ts:84.
Remediation: None

Requirement ID: 2.5 Structured Logging Requirements
Status: PASS
Finding: Synth() uses try/catch with lifecycle logging (packages/components/efs-filesystem/src/efs-filesystem.component.ts:42).
Remediation: None

Requirement ID: 2.6 Compliance Framework Defaults
Status: FAIL
Finding: Builder packages/components/efs-filesystem/src/efs-filesystem.builder.ts lacks getComplianceFrameworkDefaults(), so FedRAMP tiers do not receive hardened defaults.
Remediation: Add getComplianceFrameworkDefaults() to the builder to inject framework-specific defaults (encryption, log retention, etc.).

Requirement ID: 2.7 OpenTelemetry Observability Requirements
Status: PASS
Finding: Observability hooks present near packages/components/efs-filesystem/src/efs-filesystem.component.ts:431.
Remediation: None

Requirement ID: 2.8 Feature Flags Integration
Status: FAIL
Finding: Neither the component code nor package metadata references platform feature flags for efs-filesystem.
Remediation: Gate the component behind feature flags (OpenFeature integration + shinobi.featureFlags metadata).

Requirement ID: 2.10 Backstage Integration
Status: PASS
Finding: catalog-info.yaml present (packages/components/efs-filesystem/catalog-info.yaml).
Remediation: None

Requirement ID: 3.3 Config.schema.json Requirement
Status: PASS
Finding: Config.schema.json present in package root.
Remediation: None

Requirement ID: 3.5 Error Handling Patterns
Status: PASS
Finding: Synth() wraps logic in try/catch at packages/components/efs-filesystem/src/efs-filesystem.component.ts:42.
Remediation: None

Requirement ID: 4.1 Test Framework
Status: FAIL
Finding: packages/components/efs-filesystem/package.json lacks a Vitest dependency; tests still rely on Jest.
Remediation: Switch component tests to Vitest and add the vitest dependency per the platform testing standard.

Requirement ID: 4.2 CDK-Nag Security Tests
Status: PASS
Finding: tests/security/cdk-nag.test.ts exists.
Remediation: None

Requirement ID: 4.7 Test File Organization
Status: PASS
Finding: tests/ directory present.
Remediation: None

Requirement ID: 4.8 Component Versioning & Metadata
Status: PASS
Finding: package.json uses semver and CHANGELOG.md exists.
Remediation: None

Requirement ID: 4.9 Audit Files Requirements
Status: PASS
Finding: Audit/ documentation present.
Remediation: None

Requirement ID: V.1 TODO/Placeholder Sweep
Status: FAIL
Finding: Found TODO/placeholder code at packages/components/efs-filesystem/dist/efs-filesystem.creator.js:92 → // TODO: Add component-specific validations here
Remediation: Resolve TODO/placeholder logic and replace vaporware sections with production-ready implementations/documentation.

## elasticache-redis
Requirement ID: 0.1 Platform Component API Spec
Status: PASS
Finding: `ElastiCacheRedisComponent` extends BaseComponent at packages/components/elasticache-redis/src/elasticache-redis.component.ts:36 with getCapabilities/getType defined at packages/components/elasticache-redis/src/elasticache-redis.component.ts:125 / packages/components/elasticache-redis/src/elasticache-redis.component.ts:130.
Remediation: None

Requirement ID: 0.2 Platform Configuration Standard
Status: FAIL
Finding: getComplianceFrameworkDefaults() missing in packages/components/elasticache-redis/src/elasticache-redis.builder.ts
Remediation: Implement a ConfigBuilder subclass with getHardcodedFallbacks() and getComplianceFrameworkDefaults() to enforce the five-layer precedence chain.

Requirement ID: 0.3 Platform Tagging Standard
Status: PASS
Finding: applyStandardTags invoked (e.g., packages/components/elasticache-redis/src/elasticache-redis.component.ts:172).
Remediation: None

Requirement ID: 0.4 Platform Logging Standard
Status: PASS
Finding: Synth lifecycle logging present at packages/components/elasticache-redis/src/elasticache-redis.component.ts:53 and packages/components/elasticache-redis/src/elasticache-redis.component.ts:112.
Remediation: None

Requirement ID: 0.5 Platform Observability Standard
Status: PASS
Finding: Observability hooks detected around packages/components/elasticache-redis/src/elasticache-redis.component.ts:326.
Remediation: None

Requirement ID: 0.6 Platform Testing Standard
Status: FAIL
Finding: packages/components/elasticache-redis/package.json lacks a Vitest dependency; tests still rely on Jest.
Remediation: Switch component tests to Vitest and add the vitest dependency per the platform testing standard.

Requirement ID: 0.7 Platform Capability Naming Standard
Status: FAIL
Finding: package.json is missing shinobi.capabilities metadata for elasticache-redis
Remediation: Register at least one capability via registerCapability() and mirror it in package.json shinobi.capabilities to satisfy the binding vocabulary.

Requirement ID: 1.2 Constructor Signature
Status: PASS
Finding: Constructor matches required signature at packages/components/elasticache-redis/src/elasticache-redis.component.ts:48.
Remediation: None

Requirement ID: 1.5 Creator Pattern
Status: PASS
Finding: Creator implements IComponentCreator at packages/components/elasticache-redis/src/elasticache-redis.creator.ts:13 and exports configSchema (packages/components/elasticache-redis/src/elasticache-redis.creator.ts:20).
Remediation: None

Requirement ID: 1.6 Construct Registration
Status: PASS
Finding: Constructs registered (first occurrence packages/components/elasticache-redis/src/elasticache-redis.component.ts:87).
Remediation: None

Requirement ID: 1.7 Capability Registration
Status: PASS
Finding: Capabilities registered at packages/components/elasticache-redis/src/elasticache-redis.component.ts:110.
Remediation: None

Requirement ID: 2.5 Structured Logging Requirements
Status: PASS
Finding: Synth() uses try/catch with lifecycle logging (packages/components/elasticache-redis/src/elasticache-redis.component.ts:52).
Remediation: None

Requirement ID: 2.6 Compliance Framework Defaults
Status: FAIL
Finding: Builder packages/components/elasticache-redis/src/elasticache-redis.builder.ts lacks getComplianceFrameworkDefaults(), so FedRAMP tiers do not receive hardened defaults.
Remediation: Add getComplianceFrameworkDefaults() to the builder to inject framework-specific defaults (encryption, log retention, etc.).

Requirement ID: 2.7 OpenTelemetry Observability Requirements
Status: PASS
Finding: Observability hooks present near packages/components/elasticache-redis/src/elasticache-redis.component.ts:326.
Remediation: None

Requirement ID: 2.8 Feature Flags Integration
Status: FAIL
Finding: Neither the component code nor package metadata references platform feature flags for elasticache-redis.
Remediation: Gate the component behind feature flags (OpenFeature integration + shinobi.featureFlags metadata).

Requirement ID: 2.10 Backstage Integration
Status: PASS
Finding: catalog-info.yaml present (packages/components/elasticache-redis/catalog-info.yaml).
Remediation: None

Requirement ID: 3.3 Config.schema.json Requirement
Status: PASS
Finding: Config.schema.json present in package root.
Remediation: None

Requirement ID: 3.5 Error Handling Patterns
Status: PASS
Finding: Synth() wraps logic in try/catch at packages/components/elasticache-redis/src/elasticache-redis.component.ts:52.
Remediation: None

Requirement ID: 4.1 Test Framework
Status: FAIL
Finding: packages/components/elasticache-redis/package.json lacks a Vitest dependency; tests still rely on Jest.
Remediation: Switch component tests to Vitest and add the vitest dependency per the platform testing standard.

Requirement ID: 4.2 CDK-Nag Security Tests
Status: FAIL
Finding: Missing tests/security/cdk-nag.test.ts in packages/components/elasticache-redis.
Remediation: Add CDK-Nag AwsSolutions tests covering all frameworks.

Requirement ID: 4.7 Test File Organization
Status: PASS
Finding: tests/ directory present.
Remediation: None

Requirement ID: 4.8 Component Versioning & Metadata
Status: FAIL
Finding: CHANGELOG.md missing
Remediation: Set a semantic version in package.json and maintain CHANGELOG.md per governance policy.

Requirement ID: 4.9 Audit Files Requirements
Status: PASS
Finding: Audit/ documentation present.
Remediation: None

Requirement ID: V.1 TODO/Placeholder Sweep
Status: FAIL
Finding: Found TODO/placeholder code at packages/components/elasticache-redis/dist/.tsbuildinfo:1 → {"fileNames":["../../../../node_modules/.pnpm/typescript@5.9.3/node_modules/typescript/lib/lib.es5.d.ts","../../../../node_modules/.pnpm/typescript@5.9.3/node_modules/typescript/lib/lib.es2015.d.ts","../../../../node_modules/.pnpm/typescript@5.9.3/node_modules/typescript/lib/lib.es2016.d.ts","../../../../node_modules/.pnpm/typescript@5.9.3/node_modules/typescript/lib/lib.es2017.d.ts","../../../../node_modules/.pnpm/typescript@5.9.3/node_modules/typescript/lib/lib.es2018.d.ts","../../../../node_modules/.pnpm/typescript@5.9.3/node_modules/typescript/lib/lib.es2019.d.ts","../../../../node_modules/.pnpm/typescript@5.9.3/node_modules/typescript/lib/lib.es2020.d.ts","../../../../node_modules/.pnpm/typescript@5.9.3/node_modules/typescript/lib/lib.es2021.d.ts","../../../../node_modules/.pnpm/typescript@5.9.3/node_modules/typescript/lib/lib.es2022.d.ts","../../../../node_modules/.pnpm/typescript@5.9.3/node_modules/typescript/lib/lib.es2015.core.d.ts","../../../../node_modules/.pnpm/typescript@5.9.3/node_modules/typescript/lib/lib.es2015.collection.d.ts","../../../../node_modules/.pnpm/typescript@5.9.3/node_modules/typescript/lib/lib.es2015.generator.d.ts","../../../../node_modules/.pnpm/typescript@5.9.3/node_modules/typescript/lib/lib.es2015.iterable.d.ts","../../../../node_modules/.pnpm/typescript@5.9.3/node_modules/typescript/lib/lib.es2015.promise.d.ts","../../../../node_modules/.pnpm/typescript@5.9.3/node_modules/typescript/lib/lib.es2015.proxy.d.ts","../../../../node_modules/.pnpm/typescript@5.9.3/node_modules/typescript/lib/lib.es2015.reflect.d.ts","../../../../node_modules/.pnpm/typescript@5.9.3/node_modules/typescript/lib/lib.es2015.symbol.d.ts","../../../../node_modules/.pnpm/typescript@5.9.3/node_modules/typescript/lib/lib.es2015.symbol.wellknown.d.ts","../../../../node_modules/.pnpm/typescript@5.9.3/node_modules/typescript/lib/lib.es2016.array.include.d.ts","../../../../node_modules/.pnpm/typescript@5.9.3/node_modules/typescript/lib/lib.es2016.intl.d.ts","../../../../node_modules/.pnpm/typescript@5.9.3/node_modules/typescript/lib/lib.es2017.arraybuffer.d.ts","../../../../node_modules/.pnpm/typescript@5.9.3/node_modules/typescript/lib/lib.es2017.date.d.ts","../../../../node_modules/.pnpm/typescript@5.9.3/node_modules/typescript/lib/lib.es2017.object.d.ts","../../../../node_modules/.pnpm/typescript@5.9.3/node_modules/typescript/lib/lib.es2017.sharedmemory.d.ts","../../../../node_modules/.pnpm/typescript@5.9.3/node_modules/typescript/lib/lib.es2017.string.d.ts","../../../../node_modules/.pnpm/typescript@5.9.3/node_modules/typescript/lib/lib.es2017.intl.d.ts","../../../../node_modules/.pnpm/typescript@5.9.3/node_modules/typescript/lib/lib.es2017.typedarrays.d.ts","../../../../node_modules/.pnpm/typescript@5.9.3/node_modules/typescript/lib/lib.es2018.asyncgenerator.d.ts","../../../../node_modules/.pnpm/typescript@5.9.3/node_modules/typescript/lib/lib.es2018.asynciterable.d.ts","../../../../node_modules/.pnpm/typescript@5.9.3/node_modules/typescript/lib/lib.es2018.intl.d.ts","../../../../node_modules/.pnpm/typescript@5.9.3/node_modules/typescript/lib/lib.es2018.promise.d.ts","../../../../node_modules/.pnpm/typescript@5.9.3/node_modules/typescript/lib/lib.es2018.regexp.d.ts","../../../../node_modules/.pnpm/typescript@5.9.3/node_modules/typescript/lib/lib.es2019.array.d.ts","../../../../node_modules/.pnpm/typescript@5.9.3/node_modules/typescript/lib/lib.es2019.object.d.ts","../../../../node_modules/.pnpm/typescript@5.9.3/node_modules/typescript/lib/lib.es2019.string.d.ts","../../../../node_modules/.pnpm/typescript@5.9.3/node_modules/typescript/lib/lib.es2019.symbol.d.ts","../../../../node_modules/.pnpm/typescript@5.9.3/node_modules/typescript/lib/lib.es2019.intl.d.ts","../../../../node_modules/.pnpm/typescript@5.9.3/node_modules/typescript/lib/lib.es2020.bigint.d.ts","../../../../node_modules/.pnpm/typescript@5.9.3/node_modules/typescript/lib/lib.es2020.date.d.ts","../../../../node_modules/.pnpm/typescript@5.9.3/node_modules/typescript/lib/lib.es2020.promise.d.ts","../../../../node_modules/.pnpm/typescript@5.9.3/node_modules/typescript/lib/lib.es2020.sharedmemory.d.ts","../../../../node_modules/.pnpm/typescript@5.9.3/node_modules/typescript/lib/lib.es2020.string.d.ts","../../../../node_modules/.pnpm/typescript@5.9.3/node_modules/typescript/lib/lib.es2020.symbol.wellknown.d.ts","../../../../node_modules/.pnpm/typescript@5.9.3/node_modules/typescript/lib/lib.es2020.intl.d.ts","../../../../node_modules/.pnpm/typescript@5.9.3/node_modules/typescript/lib/lib.es2020.number.d.ts","../../../../node_modules/.pnpm/typescript@5.9.3/node_modules/typescript/lib/lib.es2021.promise.d.ts","../../../../node_modules/.pnpm/typescript@5.9.3/node_modules/typescript/lib/lib.es2021.string.d.ts","../../../../node_modules/.pnpm/typescript@5.9.3/node_modules/typescript/lib/lib.es2021.weakref.d.ts","../../../../node_modules/.pnpm/typescript@5.9.3/node_modules/typescript/lib/lib.es2021.intl.d.ts","../../../../node_modules/.pnpm/typescript@5.9.3/node_modules/typescript/lib/lib.es2022.array.d.ts","../../../../node_modules/.pnpm/typescript@5.9.3/node_modules/typescript/lib/lib.es2022.error.d.ts","../../../../node_modules/.pnpm/typescript@5.9.3/node_modules/typescript/lib/lib.es2022.intl.d.ts","../../../../node_modules/.pnpm/typescript@5.9.3/node_modules/typescript/lib/lib.es2022.object.d.ts","../../../../node_modules/.pnpm/typescript@5.9.3/node_modules/typescript/lib/lib.es2022.string.d.ts","../../../../node_modules/.pnpm/typescript@5.9.3/node_modules/typescript/lib/lib.es2022.regexp.d.ts","../../../../node_modules/.pnpm/typescript@5.9.3/node_modules/typescript/lib/lib.decorators.d.ts","../../../../node_modules/.pnpm/typescript@5.9.3/node_modules/typescript/lib/lib.decorators.legacy.d.ts","../node_modules/@shinobi/core/node_modules/constructs/lib/dependency.d.ts","../node_modules/@shinobi/core/node_modules/constructs/lib/metadata.d.ts","../node_modules/@shinobi/core/node_modules/constructs/lib/construct.d.ts","../node_modules/@shinobi/core/node_modules/constructs/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/core/lib/aspect.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/core/lib/arn.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/core/lib/bundling.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/core/lib/assets.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/environment-aware.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/core/lib/environment.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/core/lib/permissions-boundary.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/core/lib/prop-injectors.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/cloud-assembly-schema/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/cx-api/lib/cxapi.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/cx-api/lib/context/vpc.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/cx-api/lib/context/ami.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/cx-api/lib/context/load-balancer.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/cx-api/lib/context/availability-zones.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/cx-api/lib/context/endpoint-service-availability-zones.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/cx-api/lib/context/security-group.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/cx-api/lib/context/key.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/cx-api/lib/environment.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/cx-api/lib/artifacts/cloudformation-artifact.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/cx-api/lib/artifacts/nested-cloud-assembly-artifact.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/cx-api/lib/artifacts/tree-cloud-artifact.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/cx-api/lib/cloud-assembly.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/cx-api/lib/metadata.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/cx-api/lib/cloud-artifact.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/cx-api/lib/cloud-artifact-aug.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/cx-api/lib/artifacts/asset-manifest-artifact.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/cx-api/lib/artifacts/nested-cloud-assembly-artifact-aug.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/cx-api/lib/assets.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/cx-api/lib/private/flag-modeling.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/cx-api/lib/features.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/cx-api/lib/placeholders.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/cx-api/lib/app.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/cx-api/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/cx-api/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/core/lib/deps.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/core/lib/string-fragments.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/core/lib/type-hints.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/core/lib/resolvable.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/core/lib/private/intrinsic.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/core/lib/reference.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/core/lib/stack-synthesizers/types.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/core/lib/stack-synthesizers/stack-synthesizer.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/core/lib/stack-synthesizers/default-synthesizer.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/core/lib/stack-synthesizers/legacy.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/core/lib/stack-synthesizers/bootstrapless-synthesizer.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/core/lib/stack-synthesizers/nested.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/core/lib/stack-synthesizers/cli-credentials-synthesizer.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/core/lib/stack-synthesizers/asset-manifest-builder.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/core/lib/stack-synthesizers/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/core/lib/stack.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/core/lib/cfn-element.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/core/lib/cfn-condition.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/core/lib/cfn-resource-policy.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/core/lib/removal-policy.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/core/lib/cfn-resource.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/core/lib/tag-manager.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/core/lib/tag-aspect.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/core/lib/token.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/core/lib/lazy.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/core/lib/cfn-fn.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/core/lib/cfn-hook.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/core/lib/cfn-mapping.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/core/lib/cfn-tag.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/core/lib/runtime.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/core/lib/helpers-internal/cfn-parse.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/core/lib/private/md5.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/core/lib/helpers-internal/customize-roles.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/core/lib/helpers-internal/string-specializer.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/core/lib/helpers-internal/validate-all-props.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/core/lib/helpers-internal/strings.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/core/lib/private/runtime-info.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/core/lib/helpers-internal/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/core/lib/cfn-codedeploy-blue-green-hook.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/core/lib/cfn-include.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/core/lib/cfn-output.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/core/lib/cfn-parameter.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/core/lib/cfn-pseudo.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/core/lib/cfn-rule.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/core/lib/validation/report.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/core/lib/validation/validation.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/core/lib/validation/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/core/lib/stage.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/core/lib/cfn-dynamic-reference.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/core/lib/cfn-json.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/core/lib/removal-policies.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/core/lib/duration.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/core/lib/expiration.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/core/lib/size.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/core/lib/stack-trace.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/assertions/lib/private/error.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/cx-api/lib/private/error.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/core/lib/errors.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/core/lib/private/synthesis.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/core/lib/app.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/core/lib/context-provider.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/core/lib/annotations.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/core/lib/secret-value.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/core/lib/resource.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/core/lib/physical-name.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/core/lib/tree.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/core/lib/fs/options.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/core/lib/fs/ignore.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/core/lib/fs/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/core/lib/asset-staging.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/core/lib/custom-resource.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/core/lib/nested-stack.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/core/lib/custom-resource-provider/shared.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/core/lib/custom-resource-provider/custom-resource-provider-base.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/core/lib/custom-resource-provider/custom-resource-provider.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/core/lib/custom-resource-provider/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/core/lib/cfn-capabilities.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-cloudformation-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/alexa-ask-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-accessanalyzer-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-acmpca-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-aiops-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-amazonmq-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-amplify-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-amplifyuibuilder-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-apigateway-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-apigatewayv2-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-appconfig-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-appflow-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-appintegrations-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-applicationautoscaling-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-applicationinsights-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-applicationsignals-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-appmesh-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-apprunner-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-appstream-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-appsync-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-apptest-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-aps-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-arcregionswitch-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-arczonalshift-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-athena-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-auditmanager-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-autoscaling-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-autoscalingplans-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-b2bi-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-backup-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-backupgateway-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-batch-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-bcmdataexports-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-bedrock-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-bedrockagentcore-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-billing-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-billingconductor-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-budgets-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-cassandra-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-ce-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-certificatemanager-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-chatbot-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-cleanrooms-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-cleanroomsml-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-cloud9-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-cloudfront-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-cloudtrail-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-cloudwatch-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-codeartifact-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-codebuild-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-codecommit-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-codeconnections-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-codedeploy-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-codeguruprofiler-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-codegurureviewer-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-codepipeline-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-codestar-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-codestarconnections-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-codestarnotifications-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-cognito-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-comprehend-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-config-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-connect-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-connectcampaigns-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-connectcampaignsv2-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-controltower-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-cur-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-customerprofiles-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-databrew-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-datapipeline-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-datasync-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-datazone-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-dax-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-deadline-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-detective-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-devicefarm-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-devopsagent-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-devopsguru-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-directoryservice-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-dlm-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-dms-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-docdb-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-docdbelastic-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-dsql-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-dynamodb-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-ec2-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-ecr-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-ecs-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-efs-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-eks-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-elasticache-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-elasticbeanstalk-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-elasticloadbalancing-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-elasticloadbalancingv2-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-elasticsearch-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-emr-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-emrcontainers-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-emrserverless-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-entityresolution-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-events-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-eventschemas-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-evidently-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-evs-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-finspace-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-fis-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-fms-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-forecast-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-frauddetector-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-fsx-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-gamelift-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-gameliftstreams-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-globalaccelerator-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-glue-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-grafana-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-greengrass-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-greengrassv2-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-groundstation-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-guardduty-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-healthimaging-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-healthlake-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-iam-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-identitystore-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-imagebuilder-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-inspector-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-inspectorv2-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-internetmonitor-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-invoicing-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-iot-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-iotanalytics-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-iotcoredeviceadvisor-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-iotevents-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-iotfleethub-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-iotfleetwise-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-iotsitewise-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-iotthingsgraph-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-iottwinmaker-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-iotwireless-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-ivs-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-ivschat-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-kafkaconnect-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-kendra-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-kendraranking-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-kinesis-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-kinesisanalytics-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-kinesisanalyticsv2-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-kinesisfirehose-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-kinesisvideo-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-kms-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-lakeformation-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-lambda-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-launchwizard-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-lex-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-licensemanager-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-lightsail-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-location-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-logs-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-lookoutequipment-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-lookoutmetrics-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-lookoutvision-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-m2-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-macie-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-managedblockchain-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-mediaconnect-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-mediaconvert-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-medialive-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-mediapackage-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-mediapackagev2-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-mediastore-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-mediatailor-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-memorydb-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-mpa-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-msk-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-mwaa-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-neptune-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-neptunegraph-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-networkfirewall-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-networkmanager-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-nimblestudio-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-notifications-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-notificationscontacts-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-oam-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-observabilityadmin-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-odb-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-omics-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-opensearchserverless-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-opensearchservice-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-opsworks-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-opsworkscm-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-organizations-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-osis-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-panorama-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-paymentcryptography-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-pcaconnectorad-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-pcaconnectorscep-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-pcs-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-personalize-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-pinpoint-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-pinpointemail-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-pipes-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-proton-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-qbusiness-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-qldb-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-quicksight-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-ram-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-rbin-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-rds-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-redshift-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-redshiftserverless-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-refactorspaces-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-rekognition-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-resiliencehub-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-resourceexplorer2-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-resourcegroups-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-robomaker-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-rolesanywhere-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-route53-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-route53profiles-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-route53recoverycontrol-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-route53recoveryreadiness-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-route53resolver-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-rtbfabric-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-rum-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-s3-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-s3express-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-s3objectlambda-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-s3outposts-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-s3tables-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-s3vectors-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-sagemaker-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-sam-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-scheduler-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-sdb-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-secretsmanager-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-securityhub-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-securitylake-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-servicecatalog-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-servicecatalogappregistry-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-servicediscovery-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-ses-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-shield-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-signer-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-simspaceweaver-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-smsvoice-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-sns-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-sqs-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-ssm-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-ssmcontacts-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-ssmguiconnect-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-ssmincidents-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-ssmquicksetup-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-sso-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-stepfunctions-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-supportapp-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-synthetics-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-systemsmanagersap-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-timestream-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-transfer-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-verifiedpermissions-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-voiceid-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-vpclattice-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-waf-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-wafregional-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-wafv2-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-wisdom-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-workspaces-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-workspacesinstances-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-workspacesthinclient-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-workspacesweb-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/generated/aws-xray-interfaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/index.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/interfaces/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/core/lib/cloudformation.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/core/lib/feature-flags.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/core/lib/eventbridge.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/core/lib/names.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/core/lib/time-zone.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/core/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/alexa-ask/lib/ask.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/alexa-ask/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/alexa-ask/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/assertions/lib/matcher.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/assertions/lib/capture.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/core/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/assertions/lib/template.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/assertions/lib/match.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/assertions/lib/annotations.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/assertions/lib/tags.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/assertions/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/assertions/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/assets/lib/api.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/assets/lib/fs/follow-mode.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/assets/lib/fs/options.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/assets/lib/staging.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/assets/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/assets/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-accessanalyzer/lib/accessanalyzer.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-accessanalyzer/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-accessanalyzer/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-acmpca/lib/acmpca.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-acmpca/lib/certificate-authority.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-acmpca/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-acmpca/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-aiops/lib/aiops.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-aiops/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-aiops/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-amazonmq/lib/amazonmq.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-amazonmq/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-amazonmq/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-amplify/lib/amplify.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-amplify/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-amplify/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-amplifyuibuilder/lib/amplifyuibuilder.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-amplifyuibuilder/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-amplifyuibuilder/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-apigateway/lib/apigateway.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-apigateway/lib/cors.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-apigateway/lib/authorizer.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-apigateway/lib/json-schema.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-apigateway/lib/model.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-apigateway/lib/methodresponse.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-apigateway/lib/requestvalidator.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-cloudwatch/lib/alarm-base.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-cloudwatch/lib/alarm-action.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-cloudwatch/lib/metric-types.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-cloudwatch/lib/widget.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-cloudwatch/lib/graph.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-cloudwatch/lib/private/alarm-options.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-iam/lib/iam.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-iam/lib/saml-provider.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-iam/lib/principals.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-iam/lib/policy-statement.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-iam/lib/policy-document.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-iam/lib/grant.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-iam/lib/user.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-iam/lib/group.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-iam/lib/policy.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-iam/lib/identity-base.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-iam/lib/role-grants.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-iam/lib/role.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-iam/lib/managed-policy.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-iam/lib/lazy-role.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-iam/lib/unknown-principal.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-iam/lib/oidc-provider.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-iam/lib/oidc-provider-native.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-iam/lib/permissions-boundary.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-iam/lib/access-key.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-iam/lib/utils.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-iam/lib/instance-profile.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-iam/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-iam/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-cloudwatch/lib/metric.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-cloudwatch/lib/alarm.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-cloudwatch/lib/alarm-rule.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-cloudwatch/lib/composite-alarm.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-cloudwatch/lib/variable.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-cloudwatch/lib/dashboard.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-cloudwatch/lib/layout.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-cloudwatch/lib/log-query.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-cloudwatch/lib/text.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-cloudwatch/lib/alarm-status-widget.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-cloudwatch/lib/stats.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-cloudwatch/lib/cloudwatch.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-cloudwatch/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-cloudwatch/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-apigateway/lib/method.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-elasticloadbalancingv2/lib/elasticloadbalancingv2.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ec2/lib/aspects/require-imdsv2-aspect.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ec2/lib/aspects/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ec2/lib/private/cfn-init-internal.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-s3/lib/s3.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-s3/lib/bucket-grants.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-s3/lib/bucket-policy.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-s3/lib/destination.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-s3/lib/rule.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-events/lib/rule-ref.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-events/lib/input.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-events/lib/event-pattern.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-kms/lib/kms.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-kms/lib/alias.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-kms/lib/key-lookup.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-kms/lib/key.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-kms/lib/via-service-principal.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-kms/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-kms/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-events/lib/archive.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-events/lib/events.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-events/lib/events-grants.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-sqs/lib/sqs.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-sqs/lib/sqs-grants.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-sqs/lib/queue-base.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-sqs/lib/policy.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-sqs/lib/queue.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-sqs/lib/sqs-augmentations.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-sqs/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-sqs/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-events/lib/event-bus.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-events/lib/target.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-events/lib/on-event-options.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-events/lib/schedule.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-events/lib/rule.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-events/lib/connection.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-events/lib/api-destination.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-events/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-events/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-s3/lib/bucket.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-s3/lib/location.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-s3/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-s3/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-s3-assets/lib/asset.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-s3-assets/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-s3-assets/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ec2/lib/cfn-init-elements.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ec2/lib/user-data.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ec2/lib/machine-image/common.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ec2/lib/machine-image/amazon-linux2.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ec2/lib/machine-image/amazon-linux-2022.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ec2/lib/machine-image/amazon-linux-2023.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ec2/lib/windows-versions.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ec2/lib/machine-image/machine-image.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ec2/lib/machine-image/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ec2/lib/cfn-init.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ec2/lib/peer.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ec2/lib/port.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ec2/lib/ec2.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ec2/lib/client-vpn-authorization-rule.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ec2/lib/client-vpn-endpoint-types.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ec2/lib/client-vpn-route.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-logs/lib/data-protection-policy.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-logs/lib/field-index-policy.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-logs/lib/log-stream.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-logs/lib/logs.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-logs/lib/logs-grants.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-logs/lib/metric-filter.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-logs/lib/pattern.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-logs/lib/subscription-filter.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-logs/lib/transformer.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-logs/lib/log-group.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-logs/lib/cross-account-destination.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-logs/lib/log-retention.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-logs/lib/policy.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-logs/lib/query-definition.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-logs/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-logs/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ec2/lib/client-vpn-endpoint.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ec2/lib/cidr-splits.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ec2/lib/ip-addresses.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ec2/lib/instance-types.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ssm/lib/ssm.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ssm/lib/parameter.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ssm/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ssm/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ec2/lib/key-pair.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ec2/lib/volume.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ec2/lib/launch-template.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ec2/lib/instance.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ec2/lib/nat.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ec2/lib/network-acl-types.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ec2/lib/network-acl.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ec2/lib/subnet.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ec2/lib/vpc-endpoint.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ec2/lib/vpc-flow-logs.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ec2/lib/vpc-lookup.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ec2/lib/vpn.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ec2/lib/vpc.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ec2/lib/security-group.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ec2/lib/connections.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ec2/lib/bastion-host.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ec2/lib/prefix-list.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ec2/lib/vpc-endpoint-service.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ec2/lib/placement-group.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ec2/lib/instance-requirements.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ec2/lib/ec2-augmentations.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ec2/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ec2/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-elasticloadbalancingv2/lib/shared/base-load-balancer.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-elasticloadbalancingv2/lib/shared/enums.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-elasticloadbalancingv2/lib/alb/application-load-balancer.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-elasticloadbalancingv2/lib/shared/base-target-group.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-elasticloadbalancingv2/lib/alb/application-target-group.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-elasticloadbalancingv2/lib/shared/listener-action.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-elasticloadbalancingv2/lib/alb/application-listener-action.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-elasticloadbalancingv2/lib/alb/conditions.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-elasticloadbalancingv2/lib/alb/application-listener-rule.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-elasticloadbalancingv2/lib/alb/trust-store.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-elasticloadbalancingv2/lib/shared/base-listener.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-certificatemanager/lib/certificate-base.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-route53/lib/hosted-zone-ref.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-route53/lib/cidr-routing-config.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-route53/lib/geo-location.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-route53/lib/health-check.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-route53/lib/record-set.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-route53/lib/alias-record-target.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-route53/lib/hosted-zone-grants.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-route53/lib/hosted-zone-provider.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-route53/lib/key-signing-key.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-route53/lib/route53.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-route53/lib/hosted-zone.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-route53/lib/vpc-endpoint-service-domain-name.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-route53/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-route53/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-certificatemanager/lib/certificate.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-certificatemanager/lib/dns-validated-certificate.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-certificatemanager/lib/private-certificate.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-certificatemanager/lib/util.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-certificatemanager/lib/certificatemanager.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-certificatemanager/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-certificatemanager/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-elasticloadbalancingv2/lib/shared/listener-certificate.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-elasticloadbalancingv2/lib/alb/application-listener.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-elasticloadbalancingv2/lib/alb/application-listener-certificate.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-elasticloadbalancingv2/lib/alb/trust-store-revocation.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-elasticloadbalancingv2/lib/nlb/network-target-group.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-elasticloadbalancingv2/lib/nlb/network-listener-action.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-elasticloadbalancingv2/lib/nlb/network-load-balancer.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-elasticloadbalancingv2/lib/nlb/network-listener.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-elasticloadbalancingv2/lib/shared/load-balancer-targets.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-elasticloadbalancingv2/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-elasticloadbalancingv2/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-apigateway/lib/vpc-link.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-apigateway/lib/integration.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-apigateway/lib/resource.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-apigateway/lib/api-definition.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-apigateway/lib/apigateway-grants.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-kinesisfirehose/lib/kinesisfirehose.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-kinesisfirehose/lib/destination.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-kinesisfirehose/lib/encryption.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-kinesisfirehose/lib/kinesisfirehose-grants.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-kinesis/lib/stream.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-kinesis/lib/stream-consumer.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-kinesis/lib/resource-policy.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-kinesis/lib/kinesis.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-kinesis/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-kinesis/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-kinesisfirehose/lib/source.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-kinesisfirehose/lib/delivery-stream.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-kinesisfirehose/lib/processor.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-lambda/lib/architecture.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-lambda/lib/destination.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-lambda/lib/event-invoke-config.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-lambda/lib/event-source.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-lambda/lib/dlq.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-lambda/lib/lambda.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-lambda/lib/schema-registry.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-lambda/lib/event-source-mapping.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-lambda/lib/function-url.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-applicationautoscaling/lib/applicationautoscaling.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-applicationautoscaling/lib/schedule.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-applicationautoscaling/lib/step-scaling-action.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-applicationautoscaling/lib/step-scaling-policy.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-applicationautoscaling/lib/target-tracking-scaling-policy.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-applicationautoscaling/lib/scalable-target.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-applicationautoscaling/lib/base-scalable-attribute.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-applicationautoscaling/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-applicationautoscaling/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-lambda/lib/scalable-attribute-api.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-lambda/lib/alias.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-lambda/lib/lambda-version.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-lambda/lib/permission.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-lambda/lib/tenancy-config.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-lambda/lib/function-base.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-lambda/lib/adot-layers.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ecr/lib/ecr.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ecr/lib/lifecycle.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ecr/lib/repository.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ecr/lib/auth-token.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ecr/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ecr/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ecr-assets/lib/image-asset.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ecr-assets/lib/tarball-asset.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ecr-assets/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ecr-assets/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-lambda/lib/code.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-lambda/lib/durable-config.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-efs/lib/efs.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-efs/lib/efs-file-system.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-efs/lib/access-point.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-efs/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-efs/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-lambda/lib/filesystem.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-lambda/lib/lambda-insights.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-lambda/lib/runtime.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-lambda/lib/layers.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-lambda/lib/log-retention.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-lambda/lib/params-and-secrets-layers.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-lambda/lib/runtime-management.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-lambda/lib/snapstart-config.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-codeguruprofiler/lib/codeguruprofiler.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-codeguruprofiler/lib/codeguruprofiler-grants.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-codeguruprofiler/lib/profiling-group.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-codeguruprofiler/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-codeguruprofiler/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-sns/lib/sns.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-sns/lib/sns-grants.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-sns/lib/delivery-policy.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-sns/lib/subscription-filter.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-sns/lib/subscription.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-sns/lib/subscriber.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-codestarnotifications/lib/codestarnotifications.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-codestarnotifications/lib/notification-rule-source.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-codestarnotifications/lib/notification-rule-target.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-codestarnotifications/lib/notification-rule.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-codestarnotifications/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-codestarnotifications/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-sns/lib/topic-base.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-sns/lib/policy.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-sns/lib/topic.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-sns/lib/sns-augmentations.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-sns/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-sns/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-lambda/lib/function.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-lambda/lib/handler.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-lambda/lib/image-function.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-lambda/lib/singleton-lambda.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-lambda/lib/event-source-filter.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-signer/lib/signer.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-signer/lib/signing-profile.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-signer/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-signer/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-lambda/lib/code-signing-config.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-lambda/lib/capacity-provider.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-lambda/lib/lambda-augmentations.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-lambda/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-lambda/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-kinesisfirehose/lib/processors/lambda-function-processor.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-kinesisfirehose/lib/processors/decompression-processor.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-kinesisfirehose/lib/processors/cloudwatch-log-processor.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-kinesisfirehose/lib/processors/append-delimiter-to-record-processor.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-kinesisfirehose/lib/logging-config.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-kinesisfirehose/lib/common.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-kinesisfirehose/lib/record-format/input.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-kinesisfirehose/lib/record-format/output.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-glue/lib/glue.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-glue/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-glue/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-kinesisfirehose/lib/record-format/schema.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-kinesisfirehose/lib/record-format/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-kinesisfirehose/lib/s3-bucket.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-kinesisfirehose/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-kinesisfirehose/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-apigateway/lib/access-log.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-apigateway/lib/deployment.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-apigateway/lib/stage.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-apigateway/lib/usage-plan.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-apigateway/lib/api-key.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-apigateway/lib/base-path-mapping.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-apigateway/lib/domain-name.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-apigateway/lib/gateway-response.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-apigateway/lib/restapi.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-apigateway/lib/integrations/aws.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-apigateway/lib/integrations/lambda.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-apigateway/lib/integrations/http.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-apigateway/lib/integrations/mock.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-stepfunctions/lib/fields.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-stepfunctions/lib/encryption-configuration.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-stepfunctions/lib/activity.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-stepfunctions/lib/input.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-stepfunctions/lib/condition.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-stepfunctions/lib/stepfunctions.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-stepfunctions/lib/state-machine-grants.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-stepfunctions/lib/state-machine.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-stepfunctions/lib/state-graph.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-stepfunctions/lib/states/state.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-stepfunctions/lib/states/parallel.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-stepfunctions/lib/chain.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-stepfunctions/lib/types.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-stepfunctions/lib/state-machine-fragment.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-stepfunctions/lib/state-transition-metrics.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-stepfunctions/lib/states/task.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-stepfunctions/lib/step-functions-task.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-stepfunctions/lib/states/choice.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-stepfunctions/lib/states/fail.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-stepfunctions/lib/states/pass.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-stepfunctions/lib/states/succeed.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-stepfunctions/lib/states/wait.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-stepfunctions/lib/states/map-base.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-stepfunctions/lib/states/map.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-stepfunctions/lib/states/distributed-map/item-batcher.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-stepfunctions/lib/states/distributed-map/item-reader.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-stepfunctions/lib/states/distributed-map/result-writer.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-stepfunctions/lib/states/distributed-map.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-stepfunctions/lib/states/custom-state.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-stepfunctions/lib/task-credentials.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-stepfunctions/lib/states/task-base.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-stepfunctions/lib/customer-managed-key-encryption-configuration.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-stepfunctions/lib/aws-owned-key-encryption-configuration.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-stepfunctions/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-stepfunctions/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-apigateway/lib/integrations/stepfunctions.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-sagemaker/lib/sagemaker.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-sagemaker/lib/endpoint.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-sagemaker/lib/pipeline.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-sagemaker/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-sagemaker/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-apigateway/lib/integrations/sagemaker.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-apigateway/lib/integrations/request-context.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-apigateway/lib/integrations/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-apigateway/lib/lambda-api.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-apigateway/lib/authorizers/lambda.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-apigateway/lib/authorizers/identity-source.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-cognito/lib/cognito.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-cognito/lib/user-pool-attr.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-cognito/lib/user-pool-resource-server.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-pinpoint/lib/pinpoint.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-pinpoint/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-pinpoint/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-cognito/lib/user-pool-client.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-cognito/lib/user-pool-domain.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-cognito/lib/user-pool-email.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-cognito/lib/user-pool-group.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-cognito/lib/user-pool-idp.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-cognito/lib/user-pool.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-cognito/lib/user-pool-idps/base.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-cognito/lib/user-pool-idps/private/user-pool-idp-base.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-cognito/lib/user-pool-idps/apple.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-cognito/lib/user-pool-idps/amazon.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-cognito/lib/user-pool-idps/facebook.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-cognito/lib/user-pool-idps/google.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-cognito/lib/user-pool-idps/oidc.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-cognito/lib/user-pool-idps/saml.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-cognito/lib/user-pool-idps/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-cognito/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-cognito/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-apigateway/lib/authorizers/cognito.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-apigateway/lib/authorizers/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-apigateway/lib/stepfunctions-api.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-apigateway/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-apigateway/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-apigatewayv2/lib/common/api.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-apigatewayv2/lib/common/domain-name.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-apigatewayv2/lib/common/stage.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-apigatewayv2/lib/common/access-log.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-apigatewayv2/lib/common/integration.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-apigatewayv2/lib/common/route.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-apigatewayv2/lib/common/api-mapping.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-apigatewayv2/lib/common/authorizer.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-apigatewayv2/lib/common/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-apigatewayv2/lib/parameter-mapping.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-apigatewayv2/lib/http/integration.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-apigatewayv2/lib/http/route.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-apigatewayv2/lib/http/authorizer.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-apigatewayv2/lib/apigatewayv2.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-apigatewayv2/lib/common/base.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-apigatewayv2/lib/http/stage.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-apigatewayv2/lib/http/vpc-link.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-apigatewayv2/lib/http/api.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-apigatewayv2/lib/http/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-apigatewayv2/lib/websocket/authorizer.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-apigatewayv2/lib/websocket/integration.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-apigatewayv2/lib/websocket/route.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-apigatewayv2/lib/websocket/api.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-apigatewayv2/lib/websocket/stage.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-apigatewayv2/lib/websocket/api-key.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-apigatewayv2/lib/websocket/usage-plan.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-apigatewayv2/lib/websocket/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-apigatewayv2/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-apigatewayv2/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-apigatewayv2-authorizers/lib/http/user-pool.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-apigatewayv2-authorizers/lib/http/jwt.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-apigatewayv2-authorizers/lib/http/lambda.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-apigatewayv2-authorizers/lib/http/iam.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-apigatewayv2-authorizers/lib/http/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-apigatewayv2-authorizers/lib/websocket/lambda.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-apigatewayv2-authorizers/lib/websocket/iam.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-apigatewayv2-authorizers/lib/websocket/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-apigatewayv2-authorizers/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-apigatewayv2-authorizers/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-apigatewayv2-integrations/lib/http/base-types.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-apigatewayv2-integrations/lib/http/private/integration.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-apigatewayv2-integrations/lib/http/alb.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-apigatewayv2-integrations/lib/http/nlb.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-servicediscovery/lib/cname-instance.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-servicediscovery/lib/ip-instance.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-servicediscovery/lib/namespace.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-servicediscovery/lib/non-ip-instance.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-servicediscovery/lib/service.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-servicediscovery/lib/instance.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-servicediscovery/lib/alias-target-instance.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-servicediscovery/lib/http-namespace.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-servicediscovery/lib/private-dns-namespace.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-servicediscovery/lib/public-dns-namespace.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-servicediscovery/lib/servicediscovery.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-servicediscovery/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-servicediscovery/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-apigatewayv2-integrations/lib/http/service-discovery.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-apigatewayv2-integrations/lib/http/http-proxy.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-apigatewayv2-integrations/lib/http/lambda.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-apigatewayv2-integrations/lib/http/stepfunctions.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-apigatewayv2-integrations/lib/http/sqs.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-apigatewayv2-integrations/lib/http/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-apigatewayv2-integrations/lib/websocket/lambda.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-apigatewayv2-integrations/lib/websocket/mock.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-apigatewayv2-integrations/lib/websocket/aws.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-apigatewayv2-integrations/lib/websocket/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-apigatewayv2-integrations/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-apigatewayv2-integrations/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-appconfig/lib/appconfig.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-appconfig/lib/deployment-strategy.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-appconfig/lib/extension.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-codepipeline/lib/artifact.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-codepipeline/lib/action.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-codepipeline/lib/private/full-action-descriptor.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-codepipeline/lib/codepipeline.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-codepipeline/lib/private/stage.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-codepipeline/lib/rule.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-codepipeline/lib/trigger.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-codepipeline/lib/variable.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-codepipeline/lib/pipeline.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-codepipeline/lib/custom-action-registration.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-codepipeline/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-codepipeline/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-secretsmanager/lib/secretsmanager.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-secretsmanager/lib/rotation-schedule.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-secretsmanager/lib/secret.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-secretsmanager/lib/policy.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-secretsmanager/lib/secret-rotation.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-secretsmanager/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-secretsmanager/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-appconfig/lib/util.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-appconfig/lib/configuration.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ecs/lib/base/scalable-task-count.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ecs/lib/alternate-target-configuration.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ecs/lib/ecs.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ecs/lib/images/asset-image.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ecs/lib/images/ecr.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ecs/lib/images/repository.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ecs/lib/container-image.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ecs/lib/log-drivers/aws-log-driver.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ecs/lib/log-drivers/log-driver.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ecs/lib/firelens-log-router.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ecs/lib/placement.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ecs/lib/proxy-configuration/proxy-configuration.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ecs/lib/runtime-platform.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ecs/lib/base/task-definition.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ecs/lib/credential-spec.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ecs/lib/environment-file.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ecs/lib/linux-parameters.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ecs/lib/container-definition.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ecs/lib/base/service-managed-volume.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-elasticloadbalancing/lib/elasticloadbalancing.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-elasticloadbalancing/lib/load-balancer.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-elasticloadbalancing/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-elasticloadbalancing/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ecs/lib/cluster-grants.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-autoscaling/lib/aspects/require-imdsv2-aspect.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-autoscaling/lib/aspects/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-autoscaling/lib/autoscaling.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-autoscaling/lib/lifecycle-hook-target.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-autoscaling/lib/lifecycle-hook.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-autoscaling/lib/schedule.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-autoscaling/lib/scheduled-action.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-autoscaling/lib/step-scaling-action.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-autoscaling/lib/step-scaling-policy.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-autoscaling/lib/target-tracking-scaling-policy.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-autoscaling/lib/termination-policy.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-autoscaling/lib/volume.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-autoscaling/lib/warm-pool.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-autoscaling/lib/auto-scaling-group.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-autoscaling/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-autoscaling/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ecs/lib/cluster.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ecs/lib/deployment-lifecycle-hook-target.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ecs/lib/base/base-service.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ecs/lib/availability-zone-rebalancing.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ecs/lib/amis.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ecs/lib/ec2/ec2-service.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ecs/lib/ec2/ec2-task-definition.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ecs/lib/fargate/fargate-service.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ecs/lib/fargate/fargate-task-definition.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ecs/lib/external/external-service.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ecs/lib/external/external-task-definition.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ecs/lib/images/tag-parameter-container-image.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ecs/lib/log-drivers/base-log-driver.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ecs/lib/log-drivers/firelens-log-driver.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ecs/lib/log-drivers/fluentd-log-driver.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ecs/lib/log-drivers/gelf-log-driver.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ecs/lib/log-drivers/journald-log-driver.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ecs/lib/log-drivers/json-file-log-driver.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ecs/lib/log-drivers/splunk-log-driver.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ecs/lib/log-drivers/syslog-log-driver.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ecs/lib/log-drivers/generic-log-driver.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ecs/lib/log-drivers/log-drivers.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ecs/lib/proxy-configuration/app-mesh-proxy-configuration.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ecs/lib/proxy-configuration/proxy-configurations.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ecs/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ecs/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-appconfig/lib/application.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-appconfig/lib/environment.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-appconfig/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-appconfig/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-appflow/lib/appflow.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-appflow/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-appflow/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-appintegrations/lib/appintegrations.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-appintegrations/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-appintegrations/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-applicationinsights/lib/applicationinsights.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-applicationinsights/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-applicationinsights/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-applicationsignals/lib/applicationsignals.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-applicationsignals/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-applicationsignals/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-appmesh/lib/appmesh.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-appmesh/lib/appmesh-grants.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-appmesh/lib/service-discovery.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-appmesh/lib/header-match.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-appmesh/lib/http-route-method.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-appmesh/lib/http-route-path-match.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-appmesh/lib/query-parameter-match.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-appmesh/lib/tls-certificate.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-appmesh/lib/tls-validation.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-appmesh/lib/tls-client-policy.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-appmesh/lib/shared-interfaces.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-appmesh/lib/health-checks.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-appmesh/lib/listener-tls-options.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-appmesh/lib/virtual-node-listener.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-appmesh/lib/virtual-node.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-appmesh/lib/route-spec.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-appmesh/lib/route.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-appmesh/lib/virtual-router-listener.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-appmesh/lib/virtual-router.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-appmesh/lib/virtual-service.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-appmesh/lib/gateway-route-spec.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-appmesh/lib/gateway-route.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-appmesh/lib/virtual-gateway-listener.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-appmesh/lib/virtual-gateway.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-appmesh/lib/mesh.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-appmesh/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-appmesh/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-apprunner/lib/apprunner.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-apprunner/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-apprunner/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-appstream/lib/appstream.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-appstream/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-appstream/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-appsync/lib/api-base.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-appsync/lib/code.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-appsync/lib/appsync.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-appsync/lib/caching-config.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-appsync/lib/key.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-appsync/lib/mapping-template.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-appsync/lib/runtime.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-appsync/lib/resolver.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-dynamodb/lib/dynamodb.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-dynamodb/lib/scalable-attribute-api.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-dynamodb/lib/shared.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-dynamodb/lib/stream-grants.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-dynamodb/lib/table-grants.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-dynamodb/lib/table.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-dynamodb/lib/capacity.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-dynamodb/lib/billing.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-dynamodb/lib/encryption.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-dynamodb/lib/table-v2-base.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-dynamodb/lib/table-v2.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-dynamodb/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-dynamodb/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-elasticsearch/lib/elasticsearch.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-elasticsearch/lib/elasticsearch-grants.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-elasticsearch/lib/domain.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-elasticsearch/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-elasticsearch/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-opensearchservice/lib/opensearchservice.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-opensearchservice/lib/opensearchservice-grants.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-opensearchservice/lib/version.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-opensearchservice/lib/domain.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-opensearchservice/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-opensearchservice/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-rds/lib/engine-version.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-rds/lib/engine.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-rds/lib/ca-certificate.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-rds/lib/database-insights-mode.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-rds/lib/parameter-group.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-rds/lib/cluster-engine.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-rds/lib/endpoint.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-rds/lib/option-group.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-rds/lib/instance-engine.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-rds/lib/props.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-rds/lib/rds.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-rds/lib/subnet-group.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-rds/lib/instance.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-rds/lib/proxy-endpoint.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-rds/lib/proxy.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-rds/lib/cluster-ref.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-rds/lib/aurora-cluster-instance.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-rds/lib/cluster.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-rds/lib/database-secret.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-rds/lib/serverless-cluster.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-rds/lib/rds-augmentations.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-rds/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-rds/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-appsync/lib/graphqlapi-base.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-appsync/lib/data-source.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-appsync/lib/appsync-function.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-appsync/lib/caching-key.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-appsync/lib/data-source-common.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-appsync/lib/schema.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-appsync/lib/source-api-association.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-appsync/lib/graphqlapi.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-appsync/lib/auth-config.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-appsync/lib/channel-namespace.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-appsync/lib/eventapi.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-appsync/lib/appsync-common.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-appsync/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-appsync/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-apptest/lib/apptest.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-apptest/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-apptest/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-aps/lib/aps.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-aps/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-aps/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-arcregionswitch/lib/arcregionswitch.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-arcregionswitch/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-arcregionswitch/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-arczonalshift/lib/arczonalshift.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-arczonalshift/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-arczonalshift/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-athena/lib/athena.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-athena/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-athena/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-auditmanager/lib/auditmanager.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-auditmanager/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-auditmanager/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-autoscaling-common/lib/types.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-autoscaling-common/lib/interval-utils.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-autoscaling-common/lib/test-utils.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-autoscaling-common/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-autoscaling-common/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-autoscaling-hooktargets/lib/common.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-autoscaling-hooktargets/lib/queue-hook.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-autoscaling-hooktargets/lib/topic-hook.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-autoscaling-hooktargets/lib/lambda-hook.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-autoscaling-hooktargets/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-autoscaling-hooktargets/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-autoscalingplans/lib/autoscalingplans.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-autoscalingplans/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-autoscalingplans/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-b2bi/lib/b2bi.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-b2bi/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-b2bi/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-backup/lib/vault.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-backup/lib/rule.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-backup/lib/resource.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-backup/lib/selection.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-backup/lib/plan.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-backup/lib/backup.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-backup/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-backup/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-backupgateway/lib/backupgateway.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-backupgateway/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-backupgateway/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-batch/lib/batch.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-batch/lib/linux-parameters.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-batch/lib/ecs-container-definition.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-batch/lib/job-definition-base.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-batch/lib/compute-environment-base.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-batch/lib/scheduling-policy.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-batch/lib/job-queue.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-batch/lib/ecs-job-definition.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-batch/lib/eks-container-definition.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-batch/lib/eks-job-definition.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-eks/lib/aws-auth-mapping.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-eks/lib/access-entry.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-eks/lib/addon.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-eks/lib/alb-controller.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-eks/lib/fargate-profile.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-eks/lib/helm-chart.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-eks/lib/k8s-manifest.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-eks/lib/kubectl-provider.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-eks/lib/managed-nodegroup.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-eks/lib/service-account.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-eks/lib/cluster.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-eks/lib/aws-auth.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-eks/lib/eks.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-eks/lib/k8s-patch.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-eks/lib/k8s-object-value.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-eks/lib/fargate-cluster.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-eks/lib/oidc-provider.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-eks/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-eks/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-batch/lib/managed-compute-environment.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-batch/lib/multinode-job-definition.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-batch/lib/unmanaged-compute-environment.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-batch/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-batch/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-bcmdataexports/lib/bcmdataexports.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-bcmdataexports/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-bcmdataexports/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-bedrock/lib/bedrock.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-bedrock/lib/model-base.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-bedrock/lib/foundation-model.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-bedrock/lib/provisioned-model.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-bedrock/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-bedrock/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-bedrockagentcore/lib/bedrockagentcore.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-bedrockagentcore/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-bedrockagentcore/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-billingconductor/lib/billingconductor.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-billingconductor/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-billingconductor/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-budgets/lib/budgets.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-budgets/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-budgets/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-cassandra/lib/cassandra.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-cassandra/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-cassandra/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ce/lib/ce.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ce/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ce/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-chatbot/lib/chatbot.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-chatbot/lib/slack-channel-configuration.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-chatbot/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-chatbot/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-cleanrooms/lib/cleanrooms.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-cleanrooms/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-cleanrooms/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-cleanroomsml/lib/cleanroomsml.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-cleanroomsml/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-cleanroomsml/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-cloud9/lib/cloud9.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-cloud9/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-cloud9/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-cloudformation/lib/cloud-formation-capabilities.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-cloudformation/lib/custom-resource.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-cloudformation/lib/nested-stack.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-cloudformation/lib/cloudformation.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-cloudformation/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-cloudformation/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-cloudfront/lib/cloudfront.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-cloudfront/lib/cache-policy.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-cloudfront/lib/cloudfront-grants.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-cloudfront/lib/function.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-cloudfront/lib/geo-restriction.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-cloudfront/lib/origin.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-cloudfront/lib/distribution.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-cloudfront/lib/endpoint.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-cloudfront/lib/key-group.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-cloudfront/lib/key-value-store.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-cloudfront/lib/origin-access-identity.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-cloudfront/lib/origin-request-policy.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-cloudfront/lib/public-key.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-cloudfront/lib/realtime-log-config.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-cloudfront/lib/response-headers-policy.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-cloudfront/lib/web-distribution.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-cloudfront/lib/origin-access-control.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-cloudfront/lib/vpc-origin.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-cloudfront/lib/experimental/edge-function.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-cloudfront/lib/experimental/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-cloudfront/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-cloudfront/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-cloudfront-origins/lib/function-url-origin.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-cloudfront-origins/lib/http-origin.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-cloudfront-origins/lib/load-balancer-origin.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-cloudfront-origins/lib/s3-origin.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-cloudfront-origins/lib/origin-group.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-cloudfront-origins/lib/rest-api-origin.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-cloudfront-origins/lib/s3-static-website-origin.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-cloudfront-origins/lib/s3-bucket-origin.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-cloudfront-origins/lib/vpc-origin.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-cloudfront-origins/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-cloudfront-origins/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-cloudtrail/lib/cloudtrail.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-cloudtrail/lib/cloudtrail.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-cloudtrail/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-cloudtrail/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-cloudwatch-actions/lib/appscaling.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-cloudwatch-actions/lib/autoscaling.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-cloudwatch-actions/lib/sns.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-cloudwatch-actions/lib/ec2.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-cloudwatch-actions/lib/ssm.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-cloudwatch-actions/lib/lambda.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-cloudwatch-actions/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-cloudwatch-actions/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-codeartifact/lib/codeartifact.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-codeartifact/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-codeartifact/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-codebuild/lib/events.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-codebuild/lib/codebuild.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-codebuild/lib/artifacts.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-codebuild/lib/build-spec.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-codebuild/lib/cache.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-codebuild/lib/compute-type.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-codebuild/lib/file-location.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-codebuild/lib/environment-type.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-codebuild/lib/fleet.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-codebuild/lib/image-pull-principal-type.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-codebuild/lib/project-logs.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-codecommit/lib/events.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-codecommit/lib/codecommit.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-codecommit/lib/code.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-codecommit/lib/codecommit-grants.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-codecommit/lib/repository.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-codecommit/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-codecommit/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-codebuild/lib/source.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-codebuild/lib/project.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-codebuild/lib/pipeline-project.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-codebuild/lib/report-group.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-codebuild/lib/source-credentials.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-codebuild/lib/linux-gpu-build-image.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-codebuild/lib/untrusted-code-boundary-policy.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-codebuild/lib/linux-arm-build-image.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-codebuild/lib/linux-lambda-build-image.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-codebuild/lib/linux-arm-lambda-build-image.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-codebuild/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-codebuild/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-codeconnections/lib/codeconnections.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-codeconnections/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-codeconnections/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-codedeploy/lib/codedeploy.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-codedeploy/lib/host-health-config.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-codedeploy/lib/traffic-routing-config.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-codedeploy/lib/base-deployment-config.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-codedeploy/lib/rollback-config.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-codedeploy/lib/ecs/application.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-codedeploy/lib/ecs/deployment-config.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-codedeploy/lib/private/base-deployment-group.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-codedeploy/lib/ecs/deployment-group.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-codedeploy/lib/ecs/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-codedeploy/lib/lambda/application.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-codedeploy/lib/lambda/deployment-config.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-codedeploy/lib/lambda/custom-deployment-config.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-codedeploy/lib/lambda/deployment-group.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-codedeploy/lib/lambda/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-codedeploy/lib/server/application.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-codedeploy/lib/server/deployment-config.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-codedeploy/lib/server/load-balancer.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-codedeploy/lib/server/deployment-group.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-codedeploy/lib/server/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-codedeploy/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-codedeploy/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-codegurureviewer/lib/codegurureviewer.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-codegurureviewer/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-codegurureviewer/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-codepipeline-actions/lib/action.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-codepipeline-actions/lib/alexa-ask/deploy-action.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-codepipeline-actions/lib/codestar-connections/source-action.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-codepipeline-actions/lib/bitbucket/source-action.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-codepipeline-actions/lib/cloudformation/pipeline-actions.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-codepipeline-actions/lib/cloudformation/stackset-types.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-codepipeline-actions/lib/cloudformation/stackset-action.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-codepipeline-actions/lib/cloudformation/stackinstances-action.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-codepipeline-actions/lib/cloudformation/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-codepipeline-actions/lib/codebuild/build-action.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-codepipeline-actions/lib/codecommit/source-action.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-codepipeline-actions/lib/codedeploy/ecs-deploy-action.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-codepipeline-actions/lib/codedeploy/server-deploy-action.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-codepipeline-actions/lib/commands/commands-action.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-codepipeline-actions/lib/ec2/deploy-action.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-codepipeline-actions/lib/ecr/build-and-publish-action.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-codepipeline-actions/lib/ecr/source-action.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-codepipeline-actions/lib/ecr/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-codepipeline-actions/lib/ecs/deploy-action.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-codepipeline-actions/lib/elastic-beanstalk/deploy-action.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-codepipeline-actions/lib/github/source-action.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-codepipeline-actions/lib/inspector/scan-action-base.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-codepipeline-actions/lib/inspector/source-code-scan-action.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-codepipeline-actions/lib/inspector/ecr-image-scan-action.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-codepipeline-actions/lib/inspector/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-codepipeline-actions/lib/jenkins/jenkins-provider.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-codepipeline-actions/lib/jenkins/jenkins-action.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-codepipeline-actions/lib/lambda/invoke-action.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-codepipeline-actions/lib/manual-approval-action.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-codepipeline-actions/lib/s3/deploy-action.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-codepipeline-actions/lib/s3/source-action.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-codepipeline-actions/lib/stepfunctions/invoke-action.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-codepipeline-actions/lib/servicecatalog/deploy-action-beta1.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-codepipeline-actions/lib/codepipeline/invoke-action.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-codepipeline-actions/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-codepipeline-actions/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-codestar/lib/codestar.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-codestar/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-codestar/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-codestarconnections/lib/codestarconnections.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-codestarconnections/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-codestarconnections/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-cognito-identitypool/lib/identitypool-user-pool-authentication-provider.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-cognito-identitypool/lib/identitypool.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-cognito-identitypool/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-cognito-identitypool/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-comprehend/lib/comprehend.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-comprehend/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-comprehend/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-config/lib/rule.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-config/lib/managed-rules.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-config/lib/config.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-config/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-config/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-connect/lib/connect.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-connect/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-connect/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-connectcampaigns/lib/connectcampaigns.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-connectcampaigns/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-connectcampaigns/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-connectcampaignsv2/lib/connectcampaignsv2.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-connectcampaignsv2/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-connectcampaignsv2/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-controltower/lib/controltower.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-controltower/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-controltower/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-cur/lib/cur.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-cur/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-cur/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-customerprofiles/lib/customerprofiles.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-customerprofiles/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-customerprofiles/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-databrew/lib/databrew.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-databrew/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-databrew/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-datapipeline/lib/datapipeline.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-datapipeline/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-datapipeline/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-datasync/lib/datasync.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-datasync/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-datasync/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-datazone/lib/datazone.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-datazone/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-datazone/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-dax/lib/dax.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-dax/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-dax/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-deadline/lib/deadline.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-deadline/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-deadline/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-detective/lib/detective.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-detective/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-detective/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-devicefarm/lib/devicefarm.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-devicefarm/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-devicefarm/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-devopsagent/lib/devopsagent.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-devopsagent/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-devopsagent/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-devopsguru/lib/devopsguru.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-devopsguru/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-devopsguru/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-directoryservice/lib/directoryservice.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-directoryservice/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-directoryservice/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-dlm/lib/dlm.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-dlm/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-dlm/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-dms/lib/dms.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-dms/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-dms/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-docdb/lib/endpoint.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-docdb/lib/cluster-ref.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-docdb/lib/parameter-group.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-docdb/lib/props.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-docdb/lib/cluster.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-docdb/lib/database-secret.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-docdb/lib/instance.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-docdb/lib/docdb.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-docdb/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-docdb/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-docdbelastic/lib/docdbelastic.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-docdbelastic/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-docdbelastic/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-dsql/lib/dsql.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-dsql/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-dsql/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ecs-patterns/lib/base/queue-processing-service-base.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ecs-patterns/lib/ecs/queue-processing-ecs-service.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ecs-patterns/lib/base/fargate-service-base.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ecs-patterns/lib/fargate/queue-processing-fargate-service.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ecs-patterns/lib/base/network-load-balanced-service-base.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ecs-patterns/lib/ecs/network-load-balanced-ecs-service.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ecs-patterns/lib/fargate/network-load-balanced-fargate-service.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ecs-patterns/lib/base/application-load-balanced-service-base.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ecs-patterns/lib/ecs/application-load-balanced-ecs-service.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ecs-patterns/lib/fargate/application-load-balanced-fargate-service.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-events-targets/lib/util.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-events-targets/lib/batch.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-events-targets/lib/codepipeline.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-events-targets/lib/sns.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-events-targets/lib/sqs.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-events-targets/lib/codebuild.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-events-targets/lib/aws-api.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-events-targets/lib/lambda.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-events-targets/lib/ecs-task-properties.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-events-targets/lib/ecs-task.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-events-targets/lib/event-bus.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-events-targets/lib/state-machine.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-events-targets/lib/kinesis-stream.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-events-targets/lib/log-group.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-events-targets/lib/firehose.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-events-targets/lib/api-gateway.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-events-targets/lib/api-gatewayv2.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-events-targets/lib/api-destination.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-events-targets/lib/appsync.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-events-targets/lib/redshift-query.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-events-targets/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-events-targets/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ecs-patterns/lib/base/scheduled-task-base.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ecs-patterns/lib/ecs/scheduled-ecs-task.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ecs-patterns/lib/fargate/scheduled-fargate-task.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ecs-patterns/lib/base/application-multiple-target-groups-service-base.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ecs-patterns/lib/ecs/application-multiple-target-groups-ecs-service.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ecs-patterns/lib/fargate/application-multiple-target-groups-fargate-service.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ecs-patterns/lib/base/network-multiple-target-groups-service-base.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ecs-patterns/lib/ecs/network-multiple-target-groups-ecs-service.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ecs-patterns/lib/fargate/network-multiple-target-groups-fargate-service.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ecs-patterns/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ecs-patterns/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-elasticache/lib/elasticache.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-elasticache/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-elasticache/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-elasticbeanstalk/lib/elasticbeanstalk.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-elasticbeanstalk/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-elasticbeanstalk/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-elasticloadbalancingv2-actions/lib/cognito-action.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-elasticloadbalancingv2-actions/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-elasticloadbalancingv2-actions/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-elasticloadbalancingv2-targets/lib/alb-target.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-elasticloadbalancingv2-targets/lib/ip-target.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-elasticloadbalancingv2-targets/lib/instance-target.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-elasticloadbalancingv2-targets/lib/lambda-target.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-elasticloadbalancingv2-targets/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-elasticloadbalancingv2-targets/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-emr/lib/emr.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-emr/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-emr/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-emrcontainers/lib/emrcontainers.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-emrcontainers/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-emrcontainers/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-emrserverless/lib/emrserverless.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-emrserverless/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-emrserverless/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-entityresolution/lib/entityresolution.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-entityresolution/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-entityresolution/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-eventschemas/lib/eventschemas.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-eventschemas/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-eventschemas/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-evidently/lib/evidently.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-evidently/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-evidently/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-evs/lib/evs.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-evs/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-evs/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-finspace/lib/finspace.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-finspace/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-finspace/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-fis/lib/fis.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-fis/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-fis/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-fms/lib/fms.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-fms/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-fms/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-forecast/lib/forecast.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-forecast/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-forecast/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-frauddetector/lib/frauddetector.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-frauddetector/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-frauddetector/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-fsx/lib/daily-automatic-backup-start-time.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-fsx/lib/file-system.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-fsx/lib/fsx.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-fsx/lib/maintenance-time.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-fsx/lib/lustre-file-system.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-fsx/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-fsx/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-gamelift/lib/gamelift.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-gamelift/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-gamelift/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-gameliftstreams/lib/gameliftstreams.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-gameliftstreams/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-gameliftstreams/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-globalaccelerator/lib/globalaccelerator.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-globalaccelerator/lib/endpoint.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-globalaccelerator/lib/endpoint-group.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-globalaccelerator/lib/listener.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-globalaccelerator/lib/accelerator.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-globalaccelerator/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-globalaccelerator/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-globalaccelerator-endpoints/lib/alb.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-globalaccelerator-endpoints/lib/nlb.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-globalaccelerator-endpoints/lib/instance.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-globalaccelerator-endpoints/lib/eip.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-globalaccelerator-endpoints/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-globalaccelerator-endpoints/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-grafana/lib/grafana.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-grafana/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-grafana/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-greengrass/lib/greengrass.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-greengrass/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-greengrass/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-greengrassv2/lib/greengrassv2.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-greengrassv2/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-greengrassv2/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-groundstation/lib/groundstation.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-groundstation/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-groundstation/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-guardduty/lib/guardduty.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-guardduty/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-guardduty/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-healthimaging/lib/healthimaging.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-healthimaging/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-healthimaging/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-healthlake/lib/healthlake.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-healthlake/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-healthlake/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-identitystore/lib/identitystore.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-identitystore/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-identitystore/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-imagebuilder/lib/imagebuilder.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-imagebuilder/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-imagebuilder/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-inspector/lib/inspector.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-inspector/lib/assessment-template.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-inspector/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-inspector/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-inspectorv2/lib/inspectorv2.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-inspectorv2/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-inspectorv2/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-internetmonitor/lib/internetmonitor.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-internetmonitor/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-internetmonitor/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-invoicing/lib/invoicing.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-invoicing/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-invoicing/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-iot/lib/iot.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-iot/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-iot/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-iotanalytics/lib/iotanalytics.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-iotanalytics/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-iotanalytics/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-iotcoredeviceadvisor/lib/iotcoredeviceadvisor.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-iotcoredeviceadvisor/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-iotcoredeviceadvisor/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-iotevents/lib/iotevents.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-iotevents/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-iotevents/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-iotfleethub/lib/iotfleethub.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-iotfleethub/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-iotfleethub/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-iotfleetwise/lib/iotfleetwise.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-iotfleetwise/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-iotfleetwise/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-iotsitewise/lib/iotsitewise.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-iotsitewise/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-iotsitewise/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-iotthingsgraph/lib/iotthingsgraph.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-iotthingsgraph/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-iotthingsgraph/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-iottwinmaker/lib/iottwinmaker.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-iottwinmaker/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-iottwinmaker/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-iotwireless/lib/iotwireless.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-iotwireless/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-iotwireless/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ivs/lib/ivs.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ivs/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ivs/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ivschat/lib/ivschat.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ivschat/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ivschat/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-kafkaconnect/lib/kafkaconnect.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-kafkaconnect/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-kafkaconnect/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-kendra/lib/kendra.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-kendra/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-kendra/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-kendraranking/lib/kendraranking.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-kendraranking/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-kendraranking/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-kinesisanalytics/lib/kinesisanalytics.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-kinesisanalytics/lib/kinesisanalyticsv2.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-kinesisanalytics/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-kinesisanalytics/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-kinesisanalyticsv2/lib/kinesisanalyticsv2.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-kinesisanalyticsv2/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-kinesisanalyticsv2/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-kinesisvideo/lib/kinesisvideo.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-kinesisvideo/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-kinesisvideo/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-lakeformation/lib/lakeformation.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-lakeformation/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-lakeformation/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-lambda-destinations/lib/event-bridge.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-lambda-destinations/lib/lambda.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-lambda-destinations/lib/s3.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-lambda-destinations/lib/sns.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-lambda-destinations/lib/sqs.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-lambda-destinations/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-lambda-destinations/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-lambda-event-sources/lib/api.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-lambda-event-sources/lib/stream.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-lambda-event-sources/lib/dynamodb.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-lambda-event-sources/lib/kafka.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-lambda-event-sources/lib/kafka-dlq.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-lambda-event-sources/lib/kinesis.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-lambda-event-sources/lib/s3.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-sns-subscriptions/lib/subscription.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-sns-subscriptions/lib/email.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-sns-subscriptions/lib/lambda.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-sns-subscriptions/lib/sqs.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-sns-subscriptions/lib/url.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-sns-subscriptions/lib/sms.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-sns-subscriptions/lib/firehose.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-sns-subscriptions/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-sns-subscriptions/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-lambda-event-sources/lib/sns.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-lambda-event-sources/lib/sns-dlq.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-lambda-event-sources/lib/sqs.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-lambda-event-sources/lib/sqs-dlq.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-lambda-event-sources/lib/s3-onfailuire-destination.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-lambda-event-sources/lib/confluent-schema-registry.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-lambda-event-sources/lib/glue-schema-registry.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-lambda-event-sources/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-lambda-event-sources/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-lambda-nodejs/lib/types.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-lambda-nodejs/lib/function.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-lambda-nodejs/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-lambda-nodejs/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-launchwizard/lib/launchwizard.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-launchwizard/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-launchwizard/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-lex/lib/lex.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-lex/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-lex/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-licensemanager/lib/licensemanager.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-licensemanager/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-licensemanager/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-lightsail/lib/lightsail.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-lightsail/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-lightsail/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-location/lib/location.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-location/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-location/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-logs-destinations/lib/lambda.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-logs-destinations/lib/kinesis.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-logs-destinations/lib/firehose.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-logs-destinations/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-logs-destinations/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-lookoutequipment/lib/lookoutequipment.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-lookoutequipment/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-lookoutequipment/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-lookoutmetrics/lib/lookoutmetrics.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-lookoutmetrics/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-lookoutmetrics/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-lookoutvision/lib/lookoutvision.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-lookoutvision/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-lookoutvision/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-m2/lib/m2.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-m2/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-m2/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-macie/lib/macie.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-macie/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-macie/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-managedblockchain/lib/managedblockchain.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-managedblockchain/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-managedblockchain/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-mediaconnect/lib/mediaconnect.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-mediaconnect/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-mediaconnect/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-mediaconvert/lib/mediaconvert.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-mediaconvert/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-mediaconvert/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-medialive/lib/medialive.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-medialive/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-medialive/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-mediapackage/lib/mediapackage.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-mediapackage/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-mediapackage/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-mediapackagev2/lib/mediapackagev2.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-mediapackagev2/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-mediapackagev2/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-mediastore/lib/mediastore.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-mediastore/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-mediastore/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-mediatailor/lib/mediatailor.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-mediatailor/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-mediatailor/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-memorydb/lib/memorydb.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-memorydb/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-memorydb/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-mpa/lib/mpa.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-mpa/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-mpa/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-msk/lib/msk.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-msk/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-msk/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-mwaa/lib/mwaa.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-mwaa/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-mwaa/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-neptune/lib/neptune.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-neptune/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-neptune/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-neptunegraph/lib/neptunegraph.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-neptunegraph/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-neptunegraph/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-networkfirewall/lib/networkfirewall.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-networkfirewall/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-networkfirewall/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-networkmanager/lib/networkmanager.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-networkmanager/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-networkmanager/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-nimblestudio/lib/nimblestudio.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-nimblestudio/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-nimblestudio/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-notifications/lib/notifications.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-notifications/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-notifications/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-notificationscontacts/lib/notificationscontacts.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-notificationscontacts/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-notificationscontacts/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-oam/lib/oam.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-oam/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-oam/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-observabilityadmin/lib/observabilityadmin.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-observabilityadmin/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-observabilityadmin/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-odb/lib/odb.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-odb/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-odb/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-omics/lib/omics.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-omics/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-omics/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-opensearchserverless/lib/opensearchserverless.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-opensearchserverless/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-opensearchserverless/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-opsworks/lib/opsworks.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-opsworks/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-opsworks/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-opsworkscm/lib/opsworkscm.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-opsworkscm/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-opsworkscm/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-organizations/lib/organizations.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-organizations/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-organizations/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-osis/lib/osis.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-osis/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-osis/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-panorama/lib/panorama.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-panorama/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-panorama/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-paymentcryptography/lib/paymentcryptography.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-paymentcryptography/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-paymentcryptography/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-pcaconnectorad/lib/pcaconnectorad.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-pcaconnectorad/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-pcaconnectorad/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-pcaconnectorscep/lib/pcaconnectorscep.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-pcaconnectorscep/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-pcaconnectorscep/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-pcs/lib/pcs.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-pcs/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-pcs/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-personalize/lib/personalize.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-personalize/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-personalize/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-pinpointemail/lib/pinpointemail.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-pinpointemail/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-pinpointemail/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-pipes/lib/pipes.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-pipes/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-pipes/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-proton/lib/proton.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-proton/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-proton/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-qbusiness/lib/qbusiness.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-qbusiness/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-qbusiness/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-qldb/lib/qldb.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-qldb/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-qldb/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-quicksight/lib/quicksight.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-quicksight/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-quicksight/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ram/lib/ram.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ram/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ram/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-rbin/lib/rbin.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-rbin/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-rbin/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-redshift/lib/redshift.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-redshift/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-redshift/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-redshiftserverless/lib/redshiftserverless.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-redshiftserverless/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-redshiftserverless/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-refactorspaces/lib/refactorspaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-refactorspaces/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-refactorspaces/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-rekognition/lib/rekognition.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-rekognition/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-rekognition/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-resiliencehub/lib/resiliencehub.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-resiliencehub/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-resiliencehub/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-resourceexplorer2/lib/resourceexplorer2.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-resourceexplorer2/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-resourceexplorer2/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-resourcegroups/lib/resourcegroups.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-resourcegroups/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-resourcegroups/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-robomaker/lib/robomaker.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-robomaker/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-robomaker/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-rolesanywhere/lib/rolesanywhere.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-rolesanywhere/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-rolesanywhere/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-route53-patterns/lib/website-redirect.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-route53-patterns/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-route53-patterns/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-route53-targets/lib/shared.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-route53-targets/lib/api-gateway-domain-name.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-route53-targets/lib/api-gatewayv2-domain-name.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-route53-targets/lib/appsync-target.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-route53-targets/lib/bucket-website-target.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-route53-targets/lib/elastic-beanstalk-environment-target.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-route53-targets/lib/classic-load-balancer-target.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-route53-targets/lib/cloudfront-target.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-route53-targets/lib/load-balancer-target.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-route53-targets/lib/interface-vpc-endpoint-target.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-route53-targets/lib/userpool-domain.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-route53-targets/lib/global-accelerator-target.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-route53-targets/lib/route53-record.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-route53-targets/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-route53-targets/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-route53profiles/lib/route53profiles.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-route53profiles/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-route53profiles/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-route53recoverycontrol/lib/route53recoverycontrol.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-route53recoverycontrol/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-route53recoverycontrol/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-route53recoveryreadiness/lib/route53recoveryreadiness.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-route53recoveryreadiness/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-route53recoveryreadiness/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-route53resolver/lib/route53resolver.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-route53resolver/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-route53resolver/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-rtbfabric/lib/rtbfabric.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-rtbfabric/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-rtbfabric/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-rum/lib/rum.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-rum/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-rum/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-s3-deployment/lib/source.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-s3-deployment/lib/bucket-deployment.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-s3-deployment/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-s3-deployment/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-s3-notifications/lib/sqs.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-s3-notifications/lib/sns.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-s3-notifications/lib/lambda.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-s3-notifications/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-s3-notifications/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-s3express/lib/s3express.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-s3express/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-s3express/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-s3objectlambda/lib/s3objectlambda.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-s3objectlambda/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-s3objectlambda/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-s3outposts/lib/s3outposts.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-s3outposts/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-s3outposts/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-s3tables/lib/s3tables.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-s3tables/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-s3tables/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-s3vectors/lib/s3vectors.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-s3vectors/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-s3vectors/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-sam/lib/sam.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-sam/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-sam/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-scheduler/lib/scheduler.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-scheduler/lib/schedule-expression.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-scheduler/lib/schedule-group-grants.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-scheduler/lib/schedule-group.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-scheduler/lib/target.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-scheduler/lib/schedule.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-scheduler/lib/input.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-scheduler/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-scheduler/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-scheduler-targets/lib/target.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-scheduler-targets/lib/codebuild-start-build.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-scheduler-targets/lib/codepipeline-start-pipeline-execution.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-scheduler-targets/lib/event-bridge-put-events.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-scheduler-targets/lib/ecs-run-task.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-scheduler-targets/lib/inspector-start-assessment-run.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-scheduler-targets/lib/firehose-put-record.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-scheduler-targets/lib/kinesis-stream-put-record.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-scheduler-targets/lib/lambda-invoke.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-scheduler-targets/lib/sage-maker-start-pipeline-execution.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-scheduler-targets/lib/sns-publish.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-scheduler-targets/lib/sqs-send-message.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-scheduler-targets/lib/stepfunctions-start-execution.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-scheduler-targets/lib/universal.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-scheduler-targets/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-scheduler-targets/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-sdb/lib/sdb.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-sdb/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-sdb/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-securityhub/lib/securityhub.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-securityhub/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-securityhub/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-securitylake/lib/securitylake.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-securitylake/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-securitylake/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-servicecatalog/lib/common.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-servicecatalog/lib/constraints.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-servicecatalog/lib/servicecatalog.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-servicecatalog/lib/tag-options.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-servicecatalog/lib/product.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-servicecatalog/lib/product-stack-history.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-servicecatalog/lib/product-stack.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-servicecatalog/lib/cloudformation-template.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-servicecatalog/lib/portfolio.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-servicecatalog/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-servicecatalog/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-servicecatalogappregistry/lib/servicecatalogappregistry.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-servicecatalogappregistry/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-servicecatalogappregistry/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ses/lib/receipt-rule-action.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ses/lib/receipt-rule.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ses/lib/receipt-rule-set.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ses/lib/receipt-filter.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ses/lib/dedicated-ip-pool.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ses/lib/configuration-set-event-destination.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ses/lib/configuration-set.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ses/lib/email-identity.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ses/lib/vdm-attributes.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ses/lib/ses.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ses/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ses/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ses-actions/lib/add-header.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ses-actions/lib/bounce.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ses-actions/lib/lambda.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ses-actions/lib/s3.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ses-actions/lib/sns.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ses-actions/lib/stop.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ses-actions/lib/workmail.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ses-actions/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ses-actions/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-shield/lib/shield.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-shield/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-shield/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-simspaceweaver/lib/simspaceweaver.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-simspaceweaver/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-simspaceweaver/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-smsvoice/lib/smsvoice.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-smsvoice/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-smsvoice/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ssmcontacts/lib/ssmcontacts.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ssmcontacts/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ssmcontacts/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ssmguiconnect/lib/ssmguiconnect.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ssmguiconnect/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ssmguiconnect/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ssmincidents/lib/ssmincidents.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ssmincidents/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ssmincidents/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ssmquicksetup/lib/ssmquicksetup.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ssmquicksetup/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-ssmquicksetup/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-sso/lib/sso.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-sso/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-sso/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-stepfunctions-tasks/lib/lambda/invoke-function.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-stepfunctions-tasks/lib/lambda/run-lambda-task.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-stepfunctions-tasks/lib/lambda/invoke.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-stepfunctions-tasks/lib/lambda/call-aws-service-cross-region.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-stepfunctions-tasks/lib/invoke-activity.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-stepfunctions-tasks/lib/ecs/run-ecs-task-base-types.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-stepfunctions-tasks/lib/ecs/run-ecs-task-base.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-stepfunctions-tasks/lib/sns/publish-to-topic.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-stepfunctions-tasks/lib/sns/publish.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-stepfunctions-tasks/lib/sqs/send-to-queue.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-stepfunctions-tasks/lib/sqs/send-message.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-stepfunctions-tasks/lib/ecs/run-ecs-ec2-task.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-stepfunctions-tasks/lib/ecs/run-ecs-fargate-task.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-stepfunctions-tasks/lib/ecs/run-task.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-stepfunctions-tasks/lib/sagemaker/base-types.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-stepfunctions-tasks/lib/sagemaker/create-training-job.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-stepfunctions-tasks/lib/sagemaker/create-transform-job.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-stepfunctions-tasks/lib/sagemaker/create-endpoint.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-stepfunctions-tasks/lib/sagemaker/create-endpoint-config.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-stepfunctions-tasks/lib/sagemaker/create-model.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-stepfunctions-tasks/lib/sagemaker/update-endpoint.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-stepfunctions-tasks/lib/start-execution.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-stepfunctions-tasks/lib/stepfunctions/start-execution.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-stepfunctions-tasks/lib/stepfunctions/invoke-activity.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-stepfunctions-tasks/lib/evaluate-expression.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-stepfunctions-tasks/lib/emr/emr-create-cluster.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-stepfunctions-tasks/lib/emr/emr-set-cluster-termination-protection.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-stepfunctions-tasks/lib/emr/emr-terminate-cluster.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-stepfunctions-tasks/lib/emr/emr-add-step.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-stepfunctions-tasks/lib/emr/emr-cancel-step.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-stepfunctions-tasks/lib/emr/emr-modify-instance-fleet-by-name.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-stepfunctions-tasks/lib/emr/emr-modify-instance-group-by-name.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-stepfunctions-tasks/lib/emrcontainers/create-virtual-cluster.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-stepfunctions-tasks/lib/emrcontainers/delete-virtual-cluster.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-stepfunctions-tasks/lib/emrcontainers/start-job-run.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-stepfunctions-tasks/lib/glue/run-glue-job-task.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-stepfunctions-tasks/lib/glue/start-job-run.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-stepfunctions-tasks/lib/glue/start-crawler-run.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-stepfunctions-tasks/lib/batch/run-batch-job.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-stepfunctions-tasks/lib/batch/submit-job.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-stepfunctions-tasks/lib/dynamodb/shared-types.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-stepfunctions-tasks/lib/dynamodb/get-item.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-stepfunctions-tasks/lib/dynamodb/put-item.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-stepfunctions-tasks/lib/dynamodb/update-item.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-stepfunctions-tasks/lib/dynamodb/delete-item.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-stepfunctions-tasks/lib/codebuild/start-build.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-stepfunctions-tasks/lib/codebuild/start-build-batch.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-stepfunctions-tasks/lib/athena/start-query-execution.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-stepfunctions-tasks/lib/athena/stop-query-execution.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-stepfunctions-tasks/lib/athena/get-query-execution.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-stepfunctions-tasks/lib/athena/get-query-results.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-stepfunctions-tasks/lib/databrew/start-job-run.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-stepfunctions-tasks/lib/eks/call.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-stepfunctions-tasks/lib/apigateway/base-types.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-stepfunctions-tasks/lib/apigateway/base.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-stepfunctions-tasks/lib/apigateway/call-rest-api.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-stepfunctions-tasks/lib/apigateway/call-http-api.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-stepfunctions-tasks/lib/apigateway/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-stepfunctions-tasks/lib/eventbridge/put-events.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-stepfunctions-tasks/lib/schedule.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-stepfunctions-tasks/lib/eventbridge-scheduler/create-schedule.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-stepfunctions-tasks/lib/aws-sdk/call-aws-service.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-stepfunctions-tasks/lib/bedrock/guardrail.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-stepfunctions-tasks/lib/bedrock/invoke-model.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-stepfunctions-tasks/lib/bedrock/create-model-customization-job.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-stepfunctions-tasks/lib/http/invoke.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-stepfunctions-tasks/lib/mediaconvert/create-job.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-stepfunctions-tasks/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-stepfunctions-tasks/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-supportapp/lib/supportapp.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-supportapp/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-supportapp/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-synthetics/lib/runtime.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-synthetics/lib/code.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-synthetics/lib/schedule.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-synthetics/lib/canary.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-synthetics/lib/synthetics.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-synthetics/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-synthetics/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-systemsmanagersap/lib/systemsmanagersap.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-systemsmanagersap/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-systemsmanagersap/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-timestream/lib/timestream.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-timestream/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-timestream/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-transfer/lib/transfer.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-transfer/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-transfer/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-verifiedpermissions/lib/verifiedpermissions.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-verifiedpermissions/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-verifiedpermissions/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-voiceid/lib/voiceid.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-voiceid/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-voiceid/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-vpclattice/lib/vpclattice.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-vpclattice/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-vpclattice/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-waf/lib/waf.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-waf/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-waf/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-wafregional/lib/wafregional.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-wafregional/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-wafregional/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-wafv2/lib/wafv2.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-wafv2/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-wafv2/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-wisdom/lib/wisdom.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-wisdom/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-wisdom/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-workspaces/lib/workspaces.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-workspaces/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-workspaces/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-workspacesinstances/lib/workspacesinstances.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-workspacesinstances/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-workspacesinstances/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-workspacesthinclient/lib/workspacesthinclient.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-workspacesthinclient/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-workspacesthinclient/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-workspacesweb/lib/workspacesweb.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-workspacesweb/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-workspacesweb/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-xray/lib/xray.generated.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-xray/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/aws-xray/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/cloudformation-include/lib/cfn-include.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/cloudformation-include/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/cloudformation-include/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/custom-resources/lib/aws-custom-resource/logging.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/custom-resources/lib/aws-custom-resource/aws-custom-resource.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/custom-resources/lib/aws-custom-resource/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/custom-resources/lib/provider-framework/waiter-state-machine.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/custom-resources/lib/provider-framework/provider.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/custom-resources/lib/provider-framework/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/custom-resources/lib/custom-resource-config/custom-resource-config.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/custom-resources/lib/custom-resource-config/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/custom-resources/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/custom-resources/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/lambda-layer-awscli/lib/awscli-layer.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/lambda-layer-awscli/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/lambda-layer-awscli/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/lambda-layer-node-proxy-agent/lib/node-proxy-agent-layer.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/lambda-layer-node-proxy-agent/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/lambda-layer-node-proxy-agent/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/pipelines/lib/blueprint/asset-type.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/pipelines/lib/blueprint/stack-deployment.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/pipelines/lib/blueprint/shell-step.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/pipelines/lib/blueprint/step.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/pipelines/lib/blueprint/file-set.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/pipelines/lib/blueprint/stage-deployment.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/pipelines/lib/blueprint/wave.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/pipelines/lib/blueprint/manual-approval.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/pipelines/lib/blueprint/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/pipelines/lib/codepipeline/artifact-map.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/pipelines/lib/codepipeline/codebuild-step.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/pipelines/lib/docker-credentials.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/pipelines/lib/main/pipeline-base.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/pipelines/lib/main/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/pipelines/lib/codepipeline/codepipeline.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/pipelines/lib/codepipeline/stack-outputs-map.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/pipelines/lib/codepipeline/codepipeline-action-factory.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/pipelines/lib/codepipeline/confirm-permissions-broadening.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/pipelines/lib/codepipeline/codepipeline-source.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/pipelines/lib/codepipeline/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/pipelines/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/pipelines/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/region-info/lib/default.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/region-info/lib/fact.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/region-info/lib/region-info.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/region-info/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/region-info/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/triggers/lib/trigger.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/triggers/lib/trigger-function.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/triggers/lib/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/triggers/index.d.ts","../node_modules/@shinobi/core/node_modules/aws-cdk-lib/index.d.ts","../node_modules/@shinobi/core/src/platform/contracts/bindings.ts","../node_modules/@shinobi/core/src/platform/contracts/compliance/compliance-violation.ts","../node_modules/@shinobi/core/src/platform/contracts/platform-binding-trigger-spec.ts","../node_modules/@shinobi/core/src/platform/contracts/component-interfaces.ts","../node_modules/@shinobi/core/src/platform/services/governance/governance.service.ts","../node_modules/@shinobi/core/src/platform/services/governance/index.ts","../node_modules/@shinobi/core/src/platform/services/tagging-service/tagging.service.ts","../node_modules/@shinobi/core/src/platform/services/observability/observability.service.ts","../node_modules/@shinobi/core/src/platform/services/observability/index.ts","../node_modules/@shinobi/core/src/platform/logger/src/index.ts","../node_modules/@shinobi/core/src/platform/services/logging/logging.service.ts","../node_modules/@shinobi/core/src/platform/services/logging/index.ts","../node_modules/@shinobi/core/src/platform/services/compliance/compliance.service.ts","../node_modules/@shinobi/core/src/platform/services/compliance/index.ts","../node_modules/@shinobi/core/src/platform/services/security/security.service.ts","../node_modules/@shinobi/core/src/platform/services/security/index.ts","../node_modules/@shinobi/core/src/platform/services/security-operations/security-operations.service.ts","../node_modules/@shinobi/core/src/platform/services/security-operations/index.ts","../node_modules/@shinobi/core/src/platform/services/cost-management/cost-management.service.ts","../node_modules/@shinobi/core/src/platform/services/cost-management/index.ts","../node_modules/@shinobi/core/src/platform/services/backup-recovery/backup-recovery.service.ts","../node_modules/@shinobi/core/src/platform/services/backup-recovery/index.ts","../node_modules/@shinobi/core/src/platform/services/performance/performance.service.ts","../node_modules/@shinobi/core/src/platform/services/performance/index.ts","../node_modules/@shinobi/core/node_modules/@openfeature/js-sdk/dist/types.d.ts","../node_modules/@shinobi/core/src/platform/services/feature-flags/feature-flag.service.ts","../node_modules/@shinobi/core/src/platform/services/feature-flags/index.ts","../node_modules/@shinobi/core/src/platform/contracts/component.ts","../node_modules/@shinobi/core/node_modules/@types/js-yaml/index.d.ts","../node_modules/@shinobi/core/node_modules/@types/js-yaml/index.d.mts","../node_modules/@shinobi/core/src/platform/contracts/config-builder.ts","../node_modules/@shinobi/core/src/platform/contracts/compliance/rules.ts","../node_modules/@shinobi/core/src/platform/binders/resource-validator.ts","../node_modules/@shinobi/core/src/platform/contracts/unified-binder-strategy-base.ts","../node_modules/@shinobi/core/src/platform/binders/action-profiles.ts","../node_modules/@shinobi/core/src/platform/binders/action-allow-lists.ts","../node_modules/@shinobi/core/src/platform/binders/action-resolver.ts","../node_modules/@shinobi/core/src/platform/contracts/trigger-interfaces.ts","../node_modules/@shinobi/core/src/platform/contracts/openfeature-interfaces.ts","../node_modules/@shinobi/core/src/platform/contracts/platform-services.ts","../node_modules/@shinobi/core/src/platform/contracts/logging-interfaces.ts","../node_modules/@shinobi/core/src/platform/contracts/artifacts.ts","../node_modules/@shinobi/core/src/platform/networking/security-group-tagging.ts","../node_modules/@shinobi/core/src/platform/networking/cross-stack-rule-manager.ts","../node_modules/@shinobi/core/src/platform/contracts/index.ts","../node_modules/@shinobi/core/src/platform/services/lambda-powertools/lambda-powertools-extension.handler.ts","../node_modules/@shinobi/core/src/platform/services/lambda-powertools/lambda-observability.service.ts","../node_modules/@shinobi/core/src/platform/services/lambda-powertools/index.ts","../node_modules/@shinobi/core/src/platform/services/lambda-advanced-features/lambda-advanced-features.service.ts","../node_modules/@shinobi/core/src/platform/services/lambda-advanced-features/index.ts","../node_modules/@shinobi/core/src/platform/services/s3-advanced-features/s3-advanced-features.service.ts","../node_modules/@shinobi/core/src/platform/services/s3-advanced-features/s3-bucket.validator.ts","../node_modules/@shinobi/core/src/platform/services/s3-advanced-features/index.ts","../node_modules/@shinobi/core/src/platform/services/clamav-scanning/clamav-scanning.service.ts","../node_modules/@shinobi/core/src/platform/services/clamav-scanning/index.ts","../node_modules/@shinobi/core/src/platform/services/index.ts","../node_modules/@shinobi/core/node_modules/ajv/dist/compile/codegen/code.d.ts","../node_modules/@shinobi/core/node_modules/ajv/dist/compile/codegen/scope.d.ts","../node_modules/@shinobi/core/node_modules/ajv/dist/compile/codegen/index.d.ts","../node_modules/@shinobi/core/node_modules/ajv/dist/compile/rules.d.ts","../node_modules/@shinobi/core/node_modules/ajv/dist/compile/util.d.ts","../node_modules/@shinobi/core/node_modules/ajv/dist/compile/validate/subschema.d.ts","../node_modules/@shinobi/core/node_modules/ajv/dist/compile/errors.d.ts","../node_modules/@shinobi/core/node_modules/ajv/dist/compile/validate/index.d.ts","../node_modules/@shinobi/core/node_modules/ajv/dist/compile/validate/datatype.d.ts","../node_modules/@shinobi/core/node_modules/ajv/dist/vocabularies/applicator/additionalitems.d.ts","../node_modules/@shinobi/core/node_modules/ajv/dist/vocabularies/applicator/items2020.d.ts","../node_modules/@shinobi/core/node_modules/ajv/dist/vocabularies/applicator/contains.d.ts","../node_modules/@shinobi/core/node_modules/ajv/dist/vocabularies/applicator/dependencies.d.ts","../node_modules/@shinobi/core/node_modules/ajv/dist/vocabularies/applicator/propertynames.d.ts","../node_modules/@shinobi/core/node_modules/ajv/dist/vocabularies/applicator/additionalproperties.d.ts","../node_modules/@shinobi/core/node_modules/ajv/dist/vocabularies/applicator/not.d.ts","../node_modules/@shinobi/core/node_modules/ajv/dist/vocabularies/applicator/anyof.d.ts","../node_modules/@shinobi/core/node_modules/ajv/dist/vocabularies/applicator/oneof.d.ts","../node_modules/@shinobi/core/node_modules/ajv/dist/vocabularies/applicator/if.d.ts","../node_modules/@shinobi/core/node_modules/ajv/dist/vocabularies/applicator/index.d.ts","../node_modules/@shinobi/core/node_modules/ajv/dist/vocabularies/validation/limitnumber.d.ts","../node_modules/@shinobi/core/node_modules/ajv/dist/vocabularies/validation/multipleof.d.ts","../node_modules/@shinobi/core/node_modules/ajv/dist/vocabularies/validation/pattern.d.ts","../node_modules/@shinobi/core/node_modules/ajv/dist/vocabularies/validation/required.d.ts","../node_modules/@shinobi/core/node_modules/ajv/dist/vocabularies/validation/uniqueitems.d.ts","../node_modules/@shinobi/core/node_modules/ajv/dist/vocabularies/validation/const.d.ts","../node_modules/@shinobi/core/node_modules/ajv/dist/vocabularies/validation/enum.d.ts","../node_modules/@shinobi/core/node_modules/ajv/dist/vocabularies/validation/index.d.ts","../node_modules/@shinobi/core/node_modules/ajv/dist/vocabularies/format/format.d.ts","../node_modules/@shinobi/core/node_modules/ajv/dist/vocabularies/unevaluated/unevaluatedproperties.d.ts","../node_modules/@shinobi/core/node_modules/ajv/dist/vocabularies/unevaluated/unevaluateditems.d.ts","../node_modules/@shinobi/core/node_modules/ajv/dist/vocabularies/validation/dependentrequired.d.ts","../node_modules/@shinobi/core/node_modules/ajv/dist/vocabularies/discriminator/types.d.ts","../node_modules/@shinobi/core/node_modules/ajv/dist/vocabularies/discriminator/index.d.ts","../node_modules/@shinobi/core/node_modules/ajv/dist/vocabularies/errors.d.ts","../node_modules/@shinobi/core/node_modules/ajv/dist/types/json-schema.d.ts","../node_modules/@shinobi/core/node_modules/ajv/dist/types/jtd-schema.d.ts","../node_modules/@shinobi/core/node_modules/ajv/dist/runtime/validation_error.d.ts","../node_modules/@shinobi/core/node_modules/ajv/dist/compile/ref_error.d.ts","../node_modules/@shinobi/core/node_modules/ajv/dist/core.d.ts","../node_modules/@shinobi/core/node_modules/ajv/dist/compile/resolve.d.ts","../node_modules/@shinobi/core/node_modules/ajv/dist/compile/index.d.ts","../node_modules/@shinobi/core/node_modules/ajv/dist/types/index.d.ts","../node_modules/@shinobi/core/node_modules/ajv/dist/ajv.d.ts","../node_modules/@shinobi/core/node_modules/ajv-formats/dist/formats.d.ts","../node_modules/@shinobi/core/node_modules/ajv-formats/dist/limit.d.ts","../node_modules/@shinobi/core/node_modules/ajv-formats/dist/index.d.ts","../node_modules/@shinobi/core/src/services/schema-manager.ts","../node_modules/@shinobi/core/src/services/schema-error-formatter.ts","../node_modules/@shinobi/core/node_modules/glob/dist/esm/pattern.d.ts","../node_modules/@shinobi/core/node_modules/glob/dist/esm/processor.d.ts","../node_modules/@shinobi/core/node_modules/glob/dist/esm/walker.d.ts","../node_modules/@shinobi/core/node_modules/glob/dist/esm/ignore.d.ts","../node_modules/@shinobi/core/node_modules/glob/dist/esm/glob.d.ts","../node_modules/@shinobi/core/node_modules/glob/dist/esm/has-magic.d.ts","../node_modules/@shinobi/core/node_modules/glob/dist/esm/index.d.ts","../node_modules/@shinobi/core/src/services/manifest-schema-composer.ts","../node_modules/@shinobi/core/src/services/performance-metrics.ts","../node_modules/@shinobi/core/src/platform/binders/registry/unified-binder-registry.ts","../node_modules/@shinobi/core/src/platform/contracts/schemas/directive-schemas.ts","../node_modules/@shinobi/core/src/platform/contracts/directive-schema-validator.ts","../node_modules/@shinobi/core/src/services/binding-directive-validator.ts","../node_modules/@shinobi/core/src/services/enhanced-schema-validator.ts","../node_modules/@shinobi/core/src/services/schema-validator.ts","../node_modules/@shinobi/core/src/services/reference-validator.ts","../../../../node_modules/yaml/dist/parse/line-counter.d.ts","../../../../node_modules/yaml/dist/errors.d.ts","../../../../node_modules/yaml/dist/doc/applyreviver.d.ts","../../../../node_modules/yaml/dist/log.d.ts","../../../../node_modules/yaml/dist/nodes/tojs.d.ts","../../../../node_modules/yaml/dist/nodes/scalar.d.ts","../../../../node_modules/yaml/dist/stringify/stringify.d.ts","../../../../node_modules/yaml/dist/nodes/collection.d.ts","../../../../node_modules/yaml/dist/nodes/yamlseq.d.ts","../../../../node_modules/yaml/dist/schema/types.d.ts","../../../../node_modules/yaml/dist/schema/common/map.d.ts","../../../../node_modules/yaml/dist/schema/common/seq.d.ts","../../../../node_modules/yaml/dist/schema/common/string.d.ts","../../../../node_modules/yaml/dist/stringify/foldflowlines.d.ts","../../../../node_modules/yaml/dist/stringify/stringifynumber.d.ts","../../../../node_modules/yaml/dist/stringify/stringifystring.d.ts","../../../../node_modules/yaml/dist/util.d.ts","../../../../node_modules/yaml/dist/nodes/yamlmap.d.ts","../../../../node_modules/yaml/dist/nodes/identity.d.ts","../../../../node_modules/yaml/dist/schema/schema.d.ts","../../../../node_modules/yaml/dist/doc/createnode.d.ts","../../../../node_modules/yaml/dist/nodes/addpairtojsmap.d.ts","../../../../node_modules/yaml/dist/nodes/pair.d.ts","../../../../node_modules/yaml/dist/schema/tags.d.ts","../../../../node_modules/yaml/dist/options.d.ts","../../../../node_modules/yaml/dist/nodes/node.d.ts","../../../../node_modules/yaml/dist/parse/cst-scalar.d.ts","../../../../node_modules/yaml/dist/parse/cst-stringify.d.ts","../../../../node_modules/yaml/dist/parse/cst-visit.d.ts","../../../../node_modules/yaml/dist/parse/cst.d.ts","../../../../node_modules/yaml/dist/nodes/alias.d.ts","../../../../node_modules/yaml/dist/doc/document.d.ts","../../../../node_modules/yaml/dist/doc/directives.d.ts","../../../../node_modules/yaml/dist/compose/composer.d.ts","../../../../node_modules/yaml/dist/parse/lexer.d.ts","../../../../node_modules/yaml/dist/parse/parser.d.ts","../../../../node_modules/yaml/dist/public-api.d.ts","../../../../node_modules/yaml/dist/schema/yaml-1.1/omap.d.ts","../../../../node_modules/yaml/dist/schema/yaml-1.1/set.d.ts","../../../../node_modules/yaml/dist/visit.d.ts","../../../../node_modules/yaml/dist/index.d.ts","../node_modules/@shinobi/core/src/services/error-message-utils.ts","../node_modules/@shinobi/core/src/services/manifest-parser.ts","../node_modules/@shinobi/core/src/services/context-hydrator.ts","../node_modules/@shinobi/core/src/services/validation-orchestrator.ts","../node_modules/@shinobi/core/src/services/file-discovery.ts","../node_modules/@shinobi/core/src/services/plan-output-formatter.ts","../node_modules/@shinobi/core/src/platform/contracts/components/component-context.ts","../node_modules/@shinobi/core/src/platform/contracts/components/component-spec.ts","../node_modules/@shinobi/core/src/platform/contracts/components/component-config-builder.ts","../node_modules/@shinobi/core/src/platform/contracts/components/component-registry.ts","../node_modules/@shinobi/core/src/platform/contracts/components/component-factory.ts","../node_modules/@shinobi/core/src/resolver/security-group-rule-post-processor.ts","../node_modules/@shinobi/core/src/resolver/resolver-engine.ts","../node_modules/@shinobi/core/src/resolver/binders/concrete-binders.ts","../node_modules/@shinobi/core/src/resolver/index.ts","../node_modules/@shinobi/core/src/index.ts","../src/elasticache-redis.builder.ts","../node_modules/aws-cdk-lib/aws-elasticache/lib/elasticache.generated.d.ts","../node_modules/aws-cdk-lib/aws-elasticache/lib/index.d.ts","../node_modules/aws-cdk-lib/aws-elasticache/index.d.ts","../node_modules/aws-cdk-lib/aws-ec2/lib/aspects/require-imdsv2-aspect.d.ts","../node_modules/aws-cdk-lib/aws-ec2/lib/aspects/index.d.ts","../node_modules/aws-cdk-lib/aws-ec2/lib/bastion-host.d.ts","../node_modules/aws-cdk-lib/aws-ec2/lib/connections.d.ts","../node_modules/aws-cdk-lib/aws-ec2/lib/cfn-init.d.ts","../node_modules/aws-cdk-lib/aws-ec2/lib/cfn-init-elements.d.ts","../node_modules/aws-cdk-lib/aws-ec2/lib/instance-types.d.ts","../node_modules/aws-cdk-lib/aws-ec2/lib/instance.d.ts","../node_modules/aws-cdk-lib/aws-ec2/lib/launch-template.d.ts","../node_modules/aws-cdk-lib/aws-ec2/lib/machine-image/common.d.ts","../node_modules/aws-cdk-lib/aws-ec2/lib/machine-image/amazon-linux2.d.ts","../node_modules/aws-cdk-lib/aws-ec2/lib/machine-image/machine-image.d.ts","../node_modules/aws-cdk-lib/aws-ec2/lib/machine-image/amazon-linux-2022.d.ts","../node_modules/aws-cdk-lib/aws-ec2/lib/machine-image/amazon-linux-2023.d.ts","../node_modules/aws-cdk-lib/aws-ec2/lib/machine-image/index.d.ts","../node_modules/aws-cdk-lib/aws-ec2/lib/nat.d.ts","../node_modules/aws-cdk-lib/aws-ec2/lib/network-acl.d.ts","../node_modules/aws-cdk-lib/aws-ec2/lib/network-acl-types.d.ts","../node_modules/aws-cdk-lib/aws-ec2/lib/port.d.ts","../node_modules/aws-cdk-lib/aws-ec2/lib/prefix-list.d.ts","../node_modules/aws-cdk-lib/aws-ec2/lib/security-group.d.ts","../node_modules/aws-cdk-lib/aws-ec2/lib/subnet.d.ts","../node_modules/aws-cdk-lib/aws-ec2/lib/peer.d.ts","../node_modules/aws-cdk-lib/aws-ec2/lib/volume.d.ts","../node_modules/aws-cdk-lib/aws-ec2/lib/vpc.d.ts","../node_modules/aws-cdk-lib/aws-ec2/lib/vpc-lookup.d.ts","../node_modules/aws-cdk-lib/aws-ec2/lib/vpn.d.ts","../node_modules/aws-cdk-lib/aws-ec2/lib/vpc-endpoint.d.ts","../node_modules/aws-cdk-lib/aws-ec2/lib/vpc-endpoint-service.d.ts","../node_modules/aws-cdk-lib/aws-ec2/lib/user-data.d.ts","../node_modules/aws-cdk-lib/aws-ec2/lib/windows-versions.d.ts","../node_modules/aws-cdk-lib/aws-ec2/lib/vpc-flow-logs.d.ts","../node_modules/aws-cdk-lib/aws-ec2/lib/client-vpn-endpoint-types.d.ts","../node_modules/aws-cdk-lib/aws-ec2/lib/client-vpn-endpoint.d.ts","../node_modules/aws-cdk-lib/aws-ec2/lib/client-vpn-authorization-rule.d.ts","../node_modules/aws-cdk-lib/aws-ec2/lib/client-vpn-route.d.ts","../node_modules/aws-cdk-lib/aws-ec2/lib/ip-addresses.d.ts","../node_modules/aws-cdk-lib/aws-ec2/lib/placement-group.d.ts","../node_modules/aws-cdk-lib/aws-ec2/lib/key-pair.d.ts","../node_modules/aws-cdk-lib/aws-ec2/lib/instance-requirements.d.ts","../node_modules/aws-cdk-lib/aws-ec2/lib/ec2.generated.d.ts","../node_modules/aws-cdk-lib/aws-ec2/lib/ec2-augmentations.generated.d.ts","../node_modules/aws-cdk-lib/aws-ec2/lib/index.d.ts","../node_modules/aws-cdk-lib/aws-ec2/index.d.ts","../node_modules/aws-cdk-lib/aws-secretsmanager/lib/secret.d.ts","../node_modules/aws-cdk-lib/aws-secretsmanager/lib/rotation-schedule.d.ts","../node_modules/aws-cdk-lib/aws-secretsmanager/lib/policy.d.ts","../node_modules/aws-cdk-lib/aws-secretsmanager/lib/secret-rotation.d.ts","../node_modules/aws-cdk-lib/aws-secretsmanager/lib/secretsmanager.generated.d.ts","../node_modules/aws-cdk-lib/aws-secretsmanager/lib/index.d.ts","../node_modules/aws-cdk-lib/aws-secretsmanager/index.d.ts","../node_modules/aws-cdk-lib/aws-cloudwatch/lib/alarm.d.ts","../node_modules/aws-cdk-lib/aws-cloudwatch/lib/alarm-action.d.ts","../node_modules/aws-cdk-lib/aws-cloudwatch/lib/alarm-base.d.ts","../node_modules/aws-cdk-lib/aws-cloudwatch/lib/alarm-rule.d.ts","../node_modules/aws-cdk-lib/aws-cloudwatch/lib/composite-alarm.d.ts","../node_modules/aws-cdk-lib/aws-cloudwatch/lib/dashboard.d.ts","../node_modules/aws-cdk-lib/aws-cloudwatch/lib/graph.d.ts","../node_modules/aws-cdk-lib/aws-cloudwatch/lib/layout.d.ts","../node_modules/aws-cdk-lib/aws-cloudwatch/lib/metric.d.ts","../node_modules/aws-cdk-lib/aws-cloudwatch/lib/metric-types.d.ts","../node_modules/aws-cdk-lib/aws-cloudwatch/lib/log-query.d.ts","../node_modules/aws-cdk-lib/aws-cloudwatch/lib/text.d.ts","../node_modules/aws-cdk-lib/aws-cloudwatch/lib/widget.d.ts","../node_modules/aws-cdk-lib/aws-cloudwatch/lib/alarm-status-widget.d.ts","../node_modules/aws-cdk-lib/aws-cloudwatch/lib/stats.d.ts","../node_modules/aws-cdk-lib/aws-cloudwatch/lib/variable.d.ts","../node_modules/aws-cdk-lib/aws-cloudwatch/lib/cloudwatch.generated.d.ts","../node_modules/aws-cdk-lib/aws-cloudwatch/lib/index.d.ts","../node_modules/aws-cdk-lib/aws-cloudwatch/index.d.ts","../node_modules/aws-cdk-lib/aws-logs/lib/cross-account-destination.d.ts","../node_modules/aws-cdk-lib/aws-logs/lib/log-group.d.ts","../node_modules/aws-cdk-lib/aws-logs/lib/log-stream.d.ts","../node_modules/aws-cdk-lib/aws-logs/lib/metric-filter.d.ts","../node_modules/aws-cdk-lib/aws-logs/lib/pattern.d.ts","../node_modules/aws-cdk-lib/aws-logs/lib/subscription-filter.d.ts","../node_modules/aws-cdk-lib/aws-logs/lib/log-retention.d.ts","../node_modules/aws-cdk-lib/aws-logs/lib/policy.d.ts","../node_modules/aws-cdk-lib/aws-logs/lib/query-definition.d.ts","../node_modules/aws-cdk-lib/aws-logs/lib/data-protection-policy.d.ts","../node_modules/aws-cdk-lib/aws-logs/lib/field-index-policy.d.ts","../node_modules/aws-cdk-lib/aws-logs/lib/transformer.d.ts","../node_modules/aws-cdk-lib/aws-logs/lib/logs.generated.d.ts","../node_modules/aws-cdk-lib/aws-logs/lib/logs-grants.generated.d.ts","../node_modules/aws-cdk-lib/aws-logs/lib/index.d.ts","../node_modules/aws-cdk-lib/aws-logs/index.d.ts","../node_modules/aws-cdk-lib/aws-kms/lib/key.d.ts","../node_modules/aws-cdk-lib/aws-kms/lib/key-lookup.d.ts","../node_modules/aws-cdk-lib/aws-kms/lib/alias.d.ts","../node_modules/aws-cdk-lib/aws-kms/lib/via-service-principal.d.ts","../node_modules/aws-cdk-lib/aws-kms/lib/kms.generated.d.ts","../node_modules/aws-cdk-lib/aws-kms/lib/index.d.ts","../node_modules/aws-cdk-lib/aws-kms/index.d.ts","../node_modules/aws-cdk-lib/index.d.ts","../node_modules/constructs/lib/index.d.ts","../src/elasticache-redis.component.ts","../src/elasticache-redis.creator.ts","../src/index.ts","../config.schema.json","../node_modules/@types/jest/index.d.ts","../node_modules/@types/node/compatibility/disposable.d.ts","../node_modules/@types/node/compatibility/indexable.d.ts","../node_modules/@types/node/compatibility/iterators.d.ts","../node_modules/@types/node/compatibility/index.d.ts","../node_modules/@types/node/globals.typedarray.d.ts","../node_modules/@types/node/buffer.buffer.d.ts","../node_modules/@types/node/globals.d.ts","../node_modules/@types/node/web-globals/abortcontroller.d.ts","../node_modules/@types/node/web-globals/domexception.d.ts","../node_modules/@types/node/web-globals/events.d.ts","../node_modules/@types/node/web-globals/fetch.d.ts","../node_modules/@types/node/assert.d.ts","../node_modules/@types/node/assert/strict.d.ts","../node_modules/@types/node/async_hooks.d.ts","../node_modules/@types/node/buffer.d.ts","../node_modules/@types/node/child_process.d.ts","../node_modules/@types/node/cluster.d.ts","../node_modules/@types/node/console.d.ts","../node_modules/@types/node/constants.d.ts","../node_modules/@types/node/crypto.d.ts","../node_modules/@types/node/dgram.d.ts","../node_modules/@types/node/diagnostics_channel.d.ts","../node_modules/@types/node/dns.d.ts","../node_modules/@types/node/dns/promises.d.ts","../node_modules/@types/node/domain.d.ts","../node_modules/@types/node/events.d.ts","../node_modules/@types/node/fs.d.ts","../node_modules/@types/node/fs/promises.d.ts","../node_modules/@types/node/http.d.ts","../node_modules/@types/node/http2.d.ts","../node_modules/@types/node/https.d.ts","../node_modules/@types/node/inspector.generated.d.ts","../node_modules/@types/node/module.d.ts","../node_modules/@types/node/net.d.ts","../node_modules/@types/node/os.d.ts","../node_modules/@types/node/path.d.ts","../node_modules/@types/node/perf_hooks.d.ts","../node_modules/@types/node/process.d.ts","../node_modules/@types/node/punycode.d.ts","../node_modules/@types/node/querystring.d.ts","../node_modules/@types/node/readline.d.ts","../node_modules/@types/node/readline/promises.d.ts","../node_modules/@types/node/repl.d.ts","../node_modules/@types/node/sea.d.ts","../node_modules/@types/node/stream.d.ts","../node_modules/@types/node/stream/promises.d.ts","../node_modules/@types/node/stream/consumers.d.ts","../node_modules/@types/node/stream/web.d.ts","../node_modules/@types/node/string_decoder.d.ts","../node_modules/@types/node/test.d.ts","../node_modules/@types/node/timers.d.ts","../node_modules/@types/node/timers/promises.d.ts","../node_modules/@types/node/tls.d.ts","../node_modules/@types/node/trace_events.d.ts","../node_modules/@types/node/tty.d.ts","../node_modules/@types/node/url.d.ts","../node_modules/@types/node/util.d.ts","../node_modules/@types/node/v8.d.ts","../node_modules/@types/node/vm.d.ts","../node_modules/@types/node/wasi.d.ts","../node_modules/@types/node/worker_threads.d.ts","../node_modules/@types/node/zlib.d.ts","../node_modules/@types/node/index.d.ts","../../../../node_modules/@types/babel__generator/index.d.ts","../../../../node_modules/@types/babel__template/index.d.ts","../../../../node_modules/@types/babel__traverse/index.d.ts","../../../../node_modules/@types/babel__core/index.d.ts","../../../../node_modules/@types/deep-eql/index.d.ts","../../../../node_modules/@types/chai/index.d.ts","../../../../node_modules/@types/estree/index.d.ts","../../../../node_modules/@types/graceful-fs/index.d.ts","../../../../node_modules/@types/through/index.d.ts","../../../../node_modules/@types/inquirer/lib/objects/choice.d.ts","../../../../node_modules/@types/inquirer/lib/objects/separator.d.ts","../../../../node_modules/@types/inquirer/lib/objects/choices.d.ts","../../../../node_modules/@types/inquirer/lib/utils/screen-manager.d.ts","../../../../node_modules/@types/inquirer/lib/prompts/base.d.ts","../../../../node_modules/@types/inquirer/lib/utils/paginator.d.ts","../../../../node_modules/@types/inquirer/lib/prompts/checkbox.d.ts","../../../../node_modules/@types/inquirer/lib/prompts/confirm.d.ts","../../../../node_modules/@types/inquirer/lib/prompts/editor.d.ts","../../../../node_modules/@types/inquirer/lib/prompts/expand.d.ts","../../../../node_modules/@types/inquirer/lib/prompts/input.d.ts","../../../../node_modules/@types/inquirer/lib/prompts/list.d.ts","../../../../node_modules/@types/inquirer/lib/prompts/number.d.ts","../../../../node_modules/@types/inquirer/lib/prompts/password.d.ts","../../../../node_modules/@types/inquirer/lib/prompts/rawlist.d.ts","../../../../node_modules/@types/inquirer/lib/ui/baseui.d.ts","../../../../node_modules/@types/inquirer/lib/ui/bottom-bar.d.ts","../../../../node_modules/@types/inquirer/lib/ui/prompt.d.ts","../../../../node_modules/@types/inquirer/lib/utils/events.d.ts","../../../../node_modules/@types/inquirer/lib/utils/readline.d.ts","../../../../node_modules/@types/inquirer/index.d.ts","../../../../node_modules/@types/istanbul-lib-coverage/index.d.ts","../../../../node_modules/@types/istanbul-lib-report/index.d.ts","../../../../node_modules/@types/istanbul-reports/index.d.ts","../../../../node_modules/@types/js-yaml/index.d.ts","../../../../node_modules/@types/json-schema/index.d.ts","../../../../node_modules/@types/mustache/index.d.ts","../../../../node_modules/@types/parse-json/index.d.ts","../../../../node_modules/@types/semver/functions/inc.d.ts","../../../../node_modules/@types/semver/classes/semver.d.ts","../../../../node_modules/@types/semver/functions/parse.d.ts","../../../../node_modules/@types/semver/functions/valid.d.ts","../../../../node_modules/@types/semver/functions/clean.d.ts","../../../../node_modules/@types/semver/functions/diff.d.ts","../../../../node_modules/@types/semver/functions/major.d.ts","../../../../node_modules/@types/semver/functions/minor.d.ts","../../../../node_modules/@types/semver/functions/patch.d.ts","../../../../node_modules/@types/semver/functions/prerelease.d.ts","../../../../node_modules/@types/semver/functions/compare.d.ts","../../../../node_modules/@types/semver/functions/rcompare.d.ts","../../../../node_modules/@types/semver/functions/compare-loose.d.ts","../../../../node_modules/@types/semver/functions/compare-build.d.ts","../../../../node_modules/@types/semver/functions/sort.d.ts","../../../../node_modules/@types/semver/functions/rsort.d.ts","../../../../node_modules/@types/semver/functions/gt.d.ts","../../../../node_modules/@types/semver/functions/lt.d.ts","../../../../node_modules/@types/semver/functions/eq.d.ts","../../../../node_modules/@types/semver/functions/neq.d.ts","../../../../node_modules/@types/semver/functions/gte.d.ts","../../../../node_modules/@types/semver/functions/lte.d.ts","../../../../node_modules/@types/semver/functions/cmp.d.ts","../../../../node_modules/@types/semver/functions/coerce.d.ts","../../../../node_modules/@types/semver/classes/comparator.d.ts","../../../../node_modules/@types/semver/classes/range.d.ts","../../../../node_modules/@types/semver/functions/satisfies.d.ts","../../../../node_modules/@types/semver/ranges/max-satisfying.d.ts","../../../../node_modules/@types/semver/ranges/min-satisfying.d.ts","../../../../node_modules/@types/semver/ranges/to-comparators.d.ts","../../../../node_modules/@types/semver/ranges/min-version.d.ts","../../../../node_modules/@types/semver/ranges/valid.d.ts","../../../../node_modules/@types/semver/ranges/outside.d.ts","../../../../node_modules/@types/semver/ranges/gtr.d.ts","../../../../node_modules/@types/semver/ranges/ltr.d.ts","../../../../node_modules/@types/semver/ranges/intersects.d.ts","../../../../node_modules/@types/semver/ranges/simplify.d.ts","../../../../node_modules/@types/semver/ranges/subset.d.ts","../../../../node_modules/@types/semver/internals/identifiers.d.ts","../../../../node_modules/@types/semver/index.d.ts","../../../../node_modules/@types/stack-utils/index.d.ts","../../../../node_modules/@types/yargs-parser/index.d.ts","../../../../node_modules/@types/yargs/index.d.ts"],"fileIdsList":[[2592,2601],[2592,2601,2650,2651,2652],[2592,2601,2654],[2592,2601,2613,2649],[2592,2601,2627,2658,2659,2660,2661,2662,2663,2664,2665,2666,2667,2668,2669,2670,2671,2672,2673,2674,2675,2676,2677,2678],[2592,2601,2679],[2592,2601,2659,2660,2679],[2592,2601,2627,2662,2679],[2592,2601,2627,2663,2664,2679],[2592,2601,2627,2663,2679],[2592,2601,2627,2669,2679],[2592,2601,2627,2679],[2592,2601,2627],[2592,2601,2662],[2592,2601,2680],[2592,2601,2681],[2592,2601,2688,2726],[2592,2601,2688,2711,2726],[2592,2601,2687,2726],[2592,2601,2726],[2592,2601,2688],[2592,2601,2688,2712,2726],[2592,2601,2687,2688,2689,2690,2691,2692,2693,2694,2695,2696,2697,2698,2699,2700,2701,2702,2703,2704,2705,2706,2707,2708,2709,2710,2711,2712,2713,2714,2715,2716,2717,2718,2719,2720,2721,2722,2723,2724,2725],[2592,2601,2712,2726],[2592,2601,2631,2649],[2592,2601,2728],[2427,2450,2451,2455,2457,2458,2592,2601],[2435,2445,2451,2457,2592,2601],[2457,2592,2601],[2427,2431,2434,2443,2444,2445,2448,2450,2451,2456,2458,2592,2601],[2426,2592,2601],[2426,2427,2431,2434,2435,2443,2444,2445,2448,2449,2450,2451,2455,2456,2457,2459,2460,2461,2462,2463,2464,2465,2592,2601],[2430,2443,2448,2592,2601],[2430,2431,2432,2434,2443,2451,2455,2457,2592,2601],[2444,2445,2451,2592,2601],[2431,2434,2443,2448,2451,2456,2457,2592,2601],[2430,2431,2432,2434,2443,2444,2450,2455,2456,2457,2592,2601],[2430,2432,2444,2445,2446,2447,2451,2455,2592,2601],[2430,2451,2455,2592,2601],[2451,2457,2592,2601],[2430,2431,2432,2433,2442,2445,2448,2451,2455,2592,2601],[2430,2431,2432,2433,2445,2446,2448,2451,2455,2592,2601],[2426,2428,2429,2431,2435,2445,2448,2449,2451,2458,2592,2601],[2427,2431,2451,2455,2592,2601],[2455,2592,2601],[2452,2453,2454,2592,2601],[2428,2450,2451,2457,2459,2592,2601],[2435,2592,2601],[2435,2444,2448,2450,2592,2601],[2435,2450,2592,2601],[2431,2432,2434,2443,2445,2446,2450,2451,2592,2601],[2430,2434,2435,2442,2443,2445,2592,2601],[2430,2431,2432,2435,2442,2443,2445,2448,2592,2601],[2450,2456,2457,2592,2601],[2431,2592,2601],[2431,2432,2592,2601],[2429,2430,2432,2436,2437,2438,2439,2440,2441,2443,2446,2448,2592,2601],[2333,2592,2601],[2404,2592,2601],[2404,2405,2406,2592,2601],[2363,2364,2368,2395,2396,2398,2399,2400,2402,2403,2592,2601],[2361,2362,2592,2601],[2361,2592,2601],[2363,2403,2592,2601],[2363,2364,2400,2401,2403,2592,2601],[2403,2592,2601],[2403,2404,2592,2601],[2363,2364,2402,2403,2592,2601],[2363,2364,2366,2367,2402,2403,2592,2601],[2363,2364,2365,2402,2403,2592,2601],[2363,2364,2368,2395,2396,2397,2398,2399,2402,2403,2592,2601],[2363,2364,2368,2400,2402,2592,2601],[2368,2403,2592,2601],[2370,2371,2372,2373,2374,2375,2376,2377,2378,2379,2403,2592,2601],[2393,2403,2592,2601],[2369,2380,2388,2389,2390,2391,2392,2394,2592,2601],[2373,2403,2592,2601],[2381,2382,2383,2384,2385,2386,2387,2403,2592,2601],[451,2592,2601],[61,133,174,449,2592,2601],[450,2592,2601],[460,2592,2601],[95,455,2592,2601],[453,2592,2601],[453,454,456,457,458,459,2592,2601],[454,2592,2601],[455,2592,2601],[466,2592,2601],[464,465,2592,2601],[61,455,464,2592,2601],[469,2592,2601],[61,133,175,449,2592,2601],[468,2592,2601],[473,2592,2601],[61,133,176,443,449,2592,2601],[61,455,471,2592,2601],[471,472,2592,2601],[476,2592,2601],[61,133,177,449,2592,2601],[475,2592,2601],[479,2592,2601],[61,133,178,449,2592,2601],[478,2592,2601],[482,2592,2601],[61,133,179,443,449,2592,2601],[481,2592,2601],[485,2592,2601],[61,133,180,449,2592,2601],[484,2592,2601],[898,2592,2601],[487,615,811,2592,2601],[61,487,580,583,2592,2601],[61,455,487,522,693,695,814,815,820,2592,2601],[487,522,2592,2601],[61,133,181,443,449,2592,2601],[61,455,537,820,2592,2601],[61,455,489,537,820,894,2592,2601],[870,871,895,2592,2601],[61,455,487,489,522,795,820,2592,2601],[61,455,487,814,2592,2601],[61,455,487,580,679,817,820,2592,2601],[61,455,487,820,2592,2601],[487,488,489,490,491,492,493,537,691,692,693,694,695,812,813,814,815,816,817,818,819,820,868,869,896,897,2592,2601],[455,522,537,691,2592,2601],[537,692,2592,2601],[692,2592,2601],[821,822,823,824,860,866,867,2592,2601],[537,692,795,821,2592,2601],[537,692,821,865,2592,2601],[692,821,859,868,2592,2601],[61,795,820,868,2592,2601],[61,455,487,489,491,492,493,522,536,692,693,820,2592,2601],[491,2592,2601],[61,455,490,820,2592,2601],[61,455,487,488,537,692,820,2592,2601],[61,455,487,491,493,522,536,537,646,693,694,813,814,815,816,818,819,2592,2601],[61,455,487,536,812,813,816,820,2592,2601],[61,522,859,868,898,2592,2601],[61,455,487,537,814,816,820,2592,2601],[61,455,487,690,2592,2601],[937,2592,2601],[928,2592,2601],[929,930,931,932,2592,2601],[455,795,928,2592,2601],[894,928,2592,2601],[933,936,2592,2601],[934,935,2592,2601],[795,928,2592,2601],[966,2592,2601],[690,928,939,940,2592,2601],[455,928,2592,2601],[939,941,942,956,957,958,959,960,2592,2601],[646,928,2592,2601],[928,939,940,955,2592,2601],[567,928,2592,2601],[859,928,2592,2601],[961,965,2592,2601],[455,522,928,2592,2601],[962,963,964,2592,2601],[927,2592,2601],[61,133,182,443,449,2592,2601],[615,902,2592,2601],[61,455,900,901,902,2592,2601],[455,536,2592,2601],[455,536,898,900,902,906,913,2592,2601],[61,455,580,679,900,2592,2601],[900,901,902,903,904,905,906,907,2592,2601],[455,536,898,901,903,2592,2601],[61,455,536,900,902,910,911,912,914,915,916,2592,2601],[61,455,908,911,917,2592,2601],[910,911,912,915,916,917,2592,2601],[61,455,522,908,909,911,917,2592,2601],[61,455,522,908,910,912,917,2592,2601],[61,536,899,900,908,914,917,2592,2601],[61,455,646,2592,2601],[908,909,913,918,926,2592,2601],[61,455,522,908,925,2592,2601],[61,522,900,914,921,2592,2601],[61,455,908,921,922,2592,2601],[919,920,921,922,923,924,925,2592,2601],[61,455,522,908,921,922,2592,2601],[61,455,908,919,920,922,2592,2601],[61,522,899,908,914,922,2592,2601],[61,455,908,922,923,924,2592,2601],[1060,2592,2601],[61,133,183,443,449,2592,2601],[61,183,455,970,991,1057,1059,2592,2601],[61,183,522,556,580,623,795,969,970,982,989,990,1058,1059,2592,2601],[61,183,455,2592,2601],[61,183,455,522,536,968,970,990,991,1058,2592,2601],[61,183,455,522,567,576,781,795,2592,2601],[968,969,970,990,991,1058,1059,2592,2601],[1063,2592,2601],[61,133,184,443,449,2592,2601],[1062,2592,2601],[1066,2592,2601],[61,133,185,449,2592,2601],[1065,2592,2601],[725,2592,2601],[61,133,186,443,449,2592,2601],[61,522,721,722,723,2592,2601],[718,719,720,721,722,723,724,2592,2601],[61,455,522,719,721,722,2592,2601],[61,455,2592,2601],[61,455,723,2592,2601],[61,455,536,720,723,2592,2601],[61,455,536,723,2592,2601],[1069,2592,2601],[61,133,187,449,2592,2601],[1068,2592,2601],[1072,2592,2601],[61,133,188,449,2592,2601],[1071,2592,2601],[1099,2592,2601],[522,1074,2592,2601],[61,133,189,449,2592,2601],[61,1074,1077,1078,1079,1080,1093,2592,2601],[61,455,1094,1097,2592,2601],[61,1099,2592,2601],[61,455,1074,2592,2601],[61,1074,2592,2601],[1074,1075,1076,1077,1078,1079,1080,1081,1082,1083,1084,1085,1086,1087,1088,1089,1090,1091,1092,1093,1094,1095,1096,1097,1098,2592,2601],[1081,1082,2592,2601],[61,455,1076,1088,1092,1097,2592,2601],[61,455,1074,1077,1078,1079,1080,1084,1088,2592,2601],[61,455,1089,1092,1098,2592,2601],[61,955,1074,2592,2601],[61,455,1074,1083,1093,2592,2601],[61,679,1074,2592,2601],[61,474,1074,2592,2601],[61,1074,1084,1085,1086,2592,2601],[61,455,522,1074,1075,1084,1095,1096,1098,2592,2601],[61,455,522,1074,1075,1076,1084,1087,1098,2592,2601],[61,455,1090,1091,1098,2592,2601],[61,455,1074,1088,1092,1098,2592,2601],[1102,2592,2601],[61,133,190,443,449,2592,2601],[1101,2592,2601],[1105,2592,2601],[61,133,191,449,2592,2601],[1104,2592,2601],[1174,2592,2601],[522,615,679,1172,2592,2601],[61,455,1108,1112,1113,1162,1163,2592,2601],[61,133,192,443,449,2592,2601],[61,455,795,894,1109,2592,2601],[61,455,522,1108,1166,1170,1172,2592,2601],[61,583,2592,2601],[61,455,522,576,795,989,1107,1109,1127,1138,1161,2592,2601],[61,455,522,576,795,989,1109,1114,1127,1132,1138,1161,1162,1164,2592,2601],[61,522,576,615,795,989,1107,1109,1127,1138,1161,1166,1170,1171,1173,2592,2601],[455,522,576,795,989,1114,1127,1132,1138,1161,1163,2592,2601],[61,455,522,615,679,795,894,1162,1167,1168,2592,2601],[1107,1108,1109,1110,1111,1112,1113,1114,1162,1163,1164,1165,1166,1167,1168,1169,1170,1171,1172,1173,2592,2601],[1111,2592,2601],[61,1108,1110,1112,1113,1162,1163,1164,2592,2601],[1162,2592,2601],[61,455,522,1109,1162,2592,2601],[1177,2592,2601],[61,133,193,449,2592,2601],[1176,2592,2601],[1180,2592,2601],[61,133,194,449,2592,2601],[1179,2592,2601],[1183,2592,2601],[61,133,195,449,2592,2601],[1182,2592,2601],[1186,2592,2601],[61,133,196,449,2592,2601],[1185,2592,2601],[1189,2592,2601],[61,133,197,443,449,2592,2601],[1188,2592,2601],[1192,2592,2601],[61,133,198,449,2592,2601],[1191,2592,2601],[1197,2592,2601],[1194,1195,1196,2592,2601],[1194,2592,2601],[1203,2592,2601],[61,522,2592,2601],[1199,1200,1201,1202,2592,2601],[61,556,795,1031,2592,2601],[61,567,1031,2592,2601],[61,781,1031,2592,2601],[1030,2592,2601],[1016,2592,2601],[61,455,522,536,646,690,781,1014,1018,1020,1022,1024,1025,1026,1027,1028,2592,2601],[61,133,199,443,449,2592,2601],[1017,1018,1019,1020,1021,1022,1023,1024,1025,1026,1027,1028,1029,2592,2601],[61,522,1020,2592,2601],[61,455,522,1019,1029,2592,2601],[61,2592,2601],[61,455,1021,1029,2592,2601],[61,455,1029,2592,2601],[61,455,536,1023,1029,2592,2601],[61,455,536,1029,2592,2601],[1206,2592,2601],[61,133,200,449,2592,2601],[1205,2592,2601],[1209,2592,2601],[61,133,201,449,2592,2601],[1208,2592,2601],[1217,2592,2601],[61,133,202,443,449,2592,2601],[1211,1212,1213,1214,1215,1216,2592,2601],[61,455,1211,1212,1214,2592,2601],[61,646,750,1127,1161,2592,2601],[455,576,1211,2592,2601],[61,455,522,1213,1215,2592,2601],[61,455,522,556,781,2592,2601],[1220,2592,2601],[61,133,203,449,2592,2601],[1219,2592,2601],[1254,2592,2601],[61,133,204,443,449,2592,2601],[61,455,522,2592,2601],[61,455,522,623,750,989,1057,1222,1223,2592,2601],[61,522,1224,1225,1228,2592,2601],[61,455,1057,1222,2592,2601],[61,1225,1230,2592,2601],[1222,1223,1224,1225,1226,1227,1228,1229,1230,1231,1251,1252,1253,2592,2601],[61,455,1222,2592,2601],[61,455,1226,1227,2592,2601],[61,455,522,646,1226,1250,2592,2601],[61,646,1224,1225,2592,2601],[61,1226,2592,2601],[1257,2592,2601],[61,133,205,449,2592,2601],[1256,2592,2601],[1263,2592,2601],[61,133,206,449,2592,2601],[61,1260,2592,2601],[1259,1260,1261,1262,2592,2601],[1266,2592,2601],[61,133,207,449,2592,2601],[1265,2592,2601],[1269,2592,2601],[61,133,209,449,2592,2601],[1268,2592,2601],[1272,2592,2601],[61,133,210,449,2592,2601],[1271,2592,2601],[1275,2592,2601],[61,133,211,449,2592,2601],[1274,2592,2601],[1278,2592,2601],[61,133,212,443,449,2592,2601],[1277,2592,2601],[678,2592,2601],[455,536,673,2592,2601],[61,455,536,658,672,2592,2601],[61,133,213,449,2592,2601],[61,455,522,658,672,673,2592,2601],[673,674,675,676,677,2592,2601],[61,474,658,673,2592,2601],[673,674,2592,2601],[1282,2592,2601],[61,133,214,443,449,2592,2601],[1280,1281,2592,2601],[61,455,522,536,615,775,781,2592,2601],[1285,2592,2601],[61,133,215,449,2592,2601],[1284,2592,2601],[1288,2592,2601],[61,133,216,449,2592,2601],[1287,2592,2601],[1291,2592,2601],[61,133,217,449,2592,2601],[1290,2592,2601],[1297,2592,2601],[61,133,173,443,449,2592,2601],[61,455,781,795,2592,2601],[1294,1295,1296,2592,2601],[61,455,781,2592,2601],[1330,2592,2601],[455,795,1320,2592,2601],[455,1320,2592,2601],[1321,1322,1323,1324,1325,1326,1327,1328,1329,2592,2601],[690,1322,2592,2601],[61,1320,2592,2601],[455,899,1320,2592,2601],[61,580,1320,2592,2601],[580,1322,2592,2601],[455,646,690,1320,2592,2601],[1319,2592,2601],[61,455,1299,2592,2601],[522,1299,2592,2601],[61,133,218,443,449,2592,2601],[61,455,522,536,580,679,795,1299,1301,1302,1303,1304,2592,2601],[61,522,705,2592,2601],[61,455,522,536,646,795,2592,2601],[1317,2592,2601],[1299,1300,1301,1302,1303,1304,1305,1306,1307,1308,1309,1310,1311,1312,1313,1314,1315,1316,1318,2592,2601],[61,455,580,583,1299,2592,2601],[61,455,522,1299,2592,2601],[61,455,1299,1320,2592,2601],[61,455,646,690,1299,1320,2592,2601],[61,455,522,580,679,795,1299,1301,1302,1303,1305,1307,1309,2592,2601],[1334,2592,2601],[61,455,556,576,580,615,781,795,2592,2601],[61,133,219,443,449,2592,2601],[1332,1333,2592,2601],[1342,2592,2601],[61,536,726,2592,2601],[61,536,1031,2592,2601],[61,536,2592,2601],[1336,1337,1338,1339,1340,1341,2592,2601],[61,536,795,2592,2601],[61,536,781,2592,2601],[535,2592,2601],[61,494,2592,2601],[455,495,2592,2601],[494,2592,2601],[494,497,525,2592,2601],[61,494,495,496,498,499,523,2592,2601],[61,133,220,443,449,2592,2601],[61,455,494,2592,2601],[61,455,497,527,2592,2601],[455,494,496,497,2592,2601],[494,495,496,497,498,523,524,525,526,527,528,529,530,531,532,533,534,2592,2601],[497,2592,2601],[61,455,496,499,522,524,2592,2601],[455,524,2592,2601],[496,2592,2601],[1345,2592,2601],[61,133,221,449,2592,2601],[1344,2592,2601],[1375,2592,2601],[61,580,1348,1366,2592,2601],[580,1348,1366,2592,2601],[61,133,222,449,2592,2601],[61,1348,1366,2592,2601],[61,455,522,646,1354,2592,2601],[1347,1348,1349,1350,1351,1352,1353,1354,1355,1356,1357,1365,1366,1367,1368,1369,1370,1371,1372,1373,1374,2592,2601],[739,989,1350,1352,1356,1366,2592,2601],[1350,1352,1366,2592,2601],[61,739,1350,1352,1356,1366,2592,2601],[61,1366,2592,2601],[580,615,2592,2601],[61,455,522,536,556,576,580,646,739,743,775,989,1348,1349,1350,1351,1352,1353,1355,1356,1357,1365,2592,2601],[61,455,522,580,2592,2601],[61,580,1348,1364,1366,2592,2601],[1363,2592,2601],[61,583,1359,2592,2601],[522,1359,2592,2601],[61,133,223,449,2592,2601],[1358,1359,1360,1361,1362,2592,2601],[61,455,522,556,576,775,1359,1360,1361,2592,2601],[1378,2592,2601],[61,133,224,449,2592,2601],[1377,2592,2601],[1400,2592,2601],[61,455,1381,1382,2592,2601],[61,133,225,443,449,2592,2601],[61,1382,1383,2592,2601],[61,455,522,536,690,1057,1384,1385,1386,1387,2592,2601],[1385,1386,1388,2592,2601],[1380,2592,2601],[1380,1381,1382,1383,1384,1389,1394,1399,2592,2601],[61,455,1391,2592,2601],[61,455,522,536,795,1384,1387,1390,1391,2592,2601],[1390,1391,1392,1393,2592,2601],[61,455,522,1380,1383,2592,2601],[61,1381,1383,2592,2601],[61,455,522,536,1031,1384,1387,1395,1396,1397,2592,2601],[1395,1396,1397,1398,2592,2601],[690,1014,2592,2601],[762,2592,2601],[522,759,2592,2601],[61,133,226,443,449,2592,2601],[759,760,761,2592,2601],[61,455,522,759,760,2592,2601],[1403,2592,2601],[61,133,227,449,2592,2601],[1402,2592,2601],[1439,2592,2601],[982,2592,2601],[61,455,982,1405,2592,2601],[61,576,982,1407,2592,2601],[1409,1410,1411,1412,2592,2601],[61,455,522,982,1298,1405,2592,2601],[61,982,1405,1410,2592,2601],[61,455,982,1405,1410,2592,2601],[61,522,982,2592,2601],[61,982,1376,1405,2592,2601],[61,522,576,982,1364,1405,2592,2601],[61,982,1401,1405,2592,2601],[61,982,1405,2592,2601],[61,690,982,1405,2592,2601],[1420,1421,2592,2601],[61,739,982,1405,2592,2601],[61,455,982,1057,1405,2592,2601],[1405,1406,1407,1408,1413,1414,1415,1416,1417,1418,1419,1422,1423,1424,1425,1429,1430,1431,1432,1433,1434,1435,1436,1437,1438,2592,2601],[61,739,982,1426,2592,2601],[1426,1427,1428,2592,2601],[61,982,1426,2592,2601],[61,982,1405,1430,2592,2601],[61,982,2592,2601],[61,795,982,1405,2592,2601],[61,455,522,781,982,1405,2592,2601],[61,455,556,580,982,1405,2592,2601],[61,580,982,1405,2592,2601],[61,859,982,1405,2592,2601],[981,2592,2601],[61,455,522,576,580,775,971,2592,2601],[580,2592,2601],[61,133,228,443,449,2592,2601],[61,972,2592,2601],[971,972,974,976,977,978,979,980,2592,2601],[61,455,522,576,580,775,972,973,975,976,977,978,2592,2601],[455,522,971,972,2592,2601],[576,972,973,974,979,2592,2601],[522,974,2592,2601],[972,974,2592,2601],[974,2592,2601],[1442,2592,2601],[61,133,229,449,2592,2601],[1441,2592,2601],[1445,2592,2601],[61,133,230,449,2592,2601],[1444,2592,2601],[774,2592,2601],[61,133,231,449,2592,2601],[770,771,772,773,2592,2601],[61,455,771,772,2592,2601],[1449,2592,2601],[61,894,1448,2592,2601],[61,455,522,894,1447,2592,2601],[1447,1448,2592,2601],[893,2592,2601],[61,133,232,443,449,2592,2601],[872,873,874,878,879,880,881,882,883,892,2592,2601],[61,455,522,873,874,877,883,2592,2601],[61,455,679,878,883,2592,2601],[61,455,522,883,2592,2601],[61,884,885,2592,2601],[61,455,884,885,2592,2601],[883,2592,2601],[884,886,887,888,889,890,891,2592,2601],[61,455,882,884,2592,2601],[61,455,883,2592,2601],[61,455,522,556,795,873,874,878,879,880,881,882,2592,2601],[1452,2592,2601],[61,133,233,449,2592,2601],[1451,2592,2601],[1457,2592,2601],[61,133,234,443,449,2592,2601],[1454,1455,1456,2592,2601],[61,455,522,781,1454,2592,2601],[61,455,576,795,2592,2601],[1460,2592,2601],[61,133,235,443,449,2592,2601],[1459,2592,2601],[1463,2592,2601],[61,133,236,449,2592,2601],[1462,2592,2601],[1466,2592,2601],[61,133,237,449,2592,2601],[1465,2592,2601],[1469,2592,2601],[61,133,238,449,2592,2601],[1468,2592,2601],[1472,2592,2601],[61,133,239,443,449,2592,2601],[1471,2592,2601],[1475,2592,2601],[61,133,240,449,2592,2601],[1474,2592,2601],[1478,2592,2601],[61,133,241,449,2592,2601],[1477,2592,2601],[1481,2592,2601],[61,133,242,449,2592,2601],[1480,2592,2601],[1484,2592,2601],[61,133,243,443,449,2592,2601],[1483,2592,2601],[1487,2592,2601],[61,133,244,449,2592,2601],[1486,2592,2601],[1490,2592,2601],[61,133,245,449,2592,2601],[1489,2592,2601],[1493,2592,2601],[61,133,246,449,2592,2601],[1492,2592,2601],[1496,2592,2601],[61,133,247,449,2592,2601],[1495,2592,2601],[1499,2592,2601],[61,133,248,449,2592,2601],[1498,2592,2601],[1502,2592,2601],[61,133,249,449,2592,2601],[1501,2592,2601],[1505,2592,2601],[61,133,250,449,2592,2601],[1504,2592,2601],[1508,2592,2601],[61,133,251,449,2592,2601],[1507,2592,2601],[1511,2592,2601],[61,133,252,449,2592,2601],[1510,2592,2601],[1514,2592,2601],[61,133,253,449,2592,2601],[1513,2592,2601],[1524,2592,2601],[455,646,989,1516,2592,2601],[61,455,522,556,615,646,989,1161,1516,1517,1518,1519,2592,2601],[61,556,989,2592,2601],[61,133,254,449,2592,2601],[1161,1516,1517,1518,1519,1520,1521,1522,1523,2592,2601],[61,455,646,1161,1516,1517,2592,2601],[455,556,989,2592,2601],[1527,2592,2601],[61,133,255,443,449,2592,2601],[1526,2592,2601],[1530,2592,2601],[61,133,256,449,2592,2601],[1529,2592,2601],[1126,2592,2601],[1117,1121,2592,2601],[61,133,257,449,2592,2601],[61,556,1117,2592,2601],[1115,1116,1117,1118,1119,1120,1121,1122,1123,1124,1125,2592,2601],[726,2592,2601],[61,455,522,536,556,1120,2592,2601],[522,556,1115,2592,2601],[522,1115,2592,2601],[455,522,536,556,1117,2592,2601],[61,455,522,556,705,1117,1121,1122,1123,1124,2592,2601],[61,455,522,536,556,580,705,1115,1116,1117,1118,1119,2592,2601],[645,2592,2601],[539,2592,2601],[61,455,522,592,593,594,625,627,636,637,638,645,2592,2601],[455,541,580,583,2592,2601],[61,455,522,541,584,585,592,2592,2601],[61,455,596,2592,2601],[61,455,596,638,2592,2601],[61,455,522,596,597,598,599,615,636,637,638,2592,2601],[61,455,596,598,2592,2601],[594,595,637,2592,2601],[536,635,2592,2601],[61,133,258,443,449,2592,2601],[540,584,585,590,592,593,594,595,596,597,598,599,616,618,619,624,625,626,627,628,629,630,631,632,633,634,635,636,637,638,639,640,641,642,643,644,2592,2601],[61,455,522,585,592,593,596,619,624,625,626,636,637,638,2592,2601],[61,596,617,636,2592,2601],[61,455,592,596,623,2592,2601],[61,455,522,585,592,596,619,624,625,637,638,2592,2601],[586,2592,2601],[61,585,2592,2601],[586,587,588,589,591,2592,2601],[61,585,586,587,588,589,590,2592,2601],[585,592,619,624,626,627,636,637,638,2592,2601],[61,455,596,629,636,2592,2601],[638,2592,2601],[61,455,594,596,638,2592,2601],[61,455,594,595,596,636,638,2592,2601],[636,2592,2601],[455,580,592,2592,2601],[61,455,522,556,596,2592,2601],[61,455,522,596,2592,2601],[61,455,522,596,636,637,638,2592,2601],[61,455,522,580,596,615,636,2592,2601],[61,455,596,616,618,628,630,631,632,633,634,635,644,2592,2601],[61,455,536,596,636,2592,2601],[742,2592,2601],[61,455,467,739,2592,2601],[740,741,2592,2601],[61,467,739,2592,2601],[738,2592,2601],[522,2592,2601],[61,133,259,449,2592,2601],[734,735,736,737,2592,2601],[61,455,522,556,576,734,735,2592,2601],[1573,2592,2601],[61,455,522,646,672,679,690,1057,2592,2601],[1057,2592,2601],[61,455,522,646,672,690,1057,2592,2601],[61,455,567,646,726,1057,2592,2601],[61,576,646,726,1057,1563,2592,2601],[61,1057,1539,2592,2601],[61,690,1057,1567,2592,2601],[61,1057,1536,2592,2601],[61,690,1057,1570,2592,2601],[61,1057,1532,2592,2601],[61,1057,1563,1564,2592,2601],[61,646,1057,1534,1539,2592,2601],[61,690,1057,1534,1567,2592,2601],[61,646,1057,1534,1536,2592,2601],[61,690,1057,1534,1570,2592,2601],[61,455,646,1057,1532,1534,2592,2601],[61,1057,1534,1563,1564,2592,2601],[1532,1533,1534,1535,1536,1537,1538,1539,1540,1541,1564,1565,1566,1567,1568,1569,1570,1571,1572,2592,2601],[1056,2592,2601],[61,522,690,2592,2601],[61,646,2592,2601],[61,455,522,536,556,646,690,726,955,992,994,1000,1005,1009,1010,1014,1032,1033,2592,2601],[61,536,690,726,2592,2601],[61,455,522,556,646,1009,2592,2601],[61,455,522,646,993,1001,1002,1003,1004,1009,2592,2601],[522,994,2592,2601],[61,455,522,536,556,580,615,646,955,994,1015,1031,2592,2601],[61,455,522,623,989,994,998,1000,1005,1006,1007,1008,2592,2601],[61,739,743,994,995,996,997,1009,2592,2601],[580,623,2592,2601],[61,522,795,2592,2601],[61,646,1002,1005,1014,1032,1034,1035,2592,2601],[61,1002,1005,1009,2592,2601],[61,133,260,443,449,2592,2601],[61,580,583,2592,2601],[61,646,690,726,955,992,1005,1032,1034,2592,2601],[61,1005,2592,2601],[61,646,1005,1014,1032,1034,1035,2592,2601],[61,1004,1005,2592,2601],[61,994,998,1000,1005,1009,2592,2601],[61,743,998,1009,2592,2601],[61,739,998,1009,2592,2601],[61,989,998,1009,2592,2601],[992,993,994,995,996,997,998,999,1000,1001,1002,1003,1004,1005,1006,1007,1008,1009,1010,1015,1032,1033,1034,1035,1036,1037,1038,1039,1040,1041,1042,1043,1044,1045,1046,1047,1048,1049,1050,1051,1052,1053,1054,1055,2592,2601],[61,455,994,2592,2601],[61,455,615,1000,1009,2592,2601],[61,1000,1009,1044,2592,2601],[61,455,1000,1009,1044,2592,2601],[61,1000,1009,2592,2601],[61,994,999,1009,2592,2601],[999,1000,1045,1046,1047,1048,1049,1050,1051,2592,2601],[994,2592,2601],[61,994,1003,1005,2592,2601],[61,994,1005,2592,2601],[1003,1054,2592,2601],[749,2592,2601],[61,455,747,2592,2601],[61,455,522,556,646,746,748,2592,2601],[61,133,261,443,449,2592,2601],[746,747,748,2592,2601],[1249,2592,2601],[61,455,1242,2592,2601],[61,1242,2592,2601],[61,522,1232,1242,2592,2601],[61,455,522,556,646,795,1031,1233,1234,1235,1236,1237,1238,1239,1240,1241,1243,2592,2601],[61,133,262,443,449,2592,2601],[61,1236,1242,2592,2601],[61,455,522,646,1242,2592,2601],[61,455,583,1242,2592,2601],[1232,1233,1234,1235,1236,1237,1238,1239,1240,1241,1242,1243,1244,1245,1246,1247,1248,2592,2601],[61,1235,1242,2592,2601],[61,455,522,1242,2592,2601],[61,522,1242,2592,2601],[1576,2592,2601],[61,133,263,443,449,2592,2601],[1575,2592,2601],[1579,2592,2601],[61,133,264,443,449,2592,2601],[1578,2592,2601],[1013,2592,2601],[61,133,265,443,449,2592,2601],[1011,1012,2592,2601],[61,455,646,1011,2592,2601],[1582,2592,2601],[61,455,690,894,2592,2601],[1581,2592,2601],[1588,2592,2601],[690,2592,2601],[1584,1585,1586,1587,2592,2601],[646,690,2592,2601],[690,795,2592,2601],[689,2592,2601],[61,455,538,651,652,681,2592,2601],[61,680,681,2592,2601],[61,651,653,654,681,2592,2601],[61,455,646,648,649,650,651,653,654,655,656,657,680,2592,2601],[61,455,536,580,646,647,648,681,2592,2601],[61,455,536,646,648,649,650,681,2592,2601],[61,455,580,656,2592,2601],[61,455,580,2592,2601],[61,133,266,443,449,2592,2601],[538,647,648,649,650,651,652,653,654,655,656,657,680,681,682,683,684,685,686,687,688,2592,2601],[61,455,538,652,684,687,2592,2601],[61,455,648,650,657,680,684,685,686,2592,2601],[61,536,646,647,648,687,2592,2601],[61,536,648,650,687,2592,2601],[61,70,95,455,652,2592,2601],[61,70,95,455,522,580,646,2592,2601],[61,455,646,648,2592,2601],[538,2592,2601],[679,2592,2601],[650,651,684,2592,2601],[1131,2592,2601],[61,455,522,536,556,615,646,672,679,1128,1129,2592,2601],[522,1128,2592,2601],[61,133,267,449,2592,2601],[1128,1129,1130,2592,2601],[1591,2592,2601],[61,133,268,443,449,2592,2601],[1590,2592,2601],[1594,2592,2601],[61,133,269,449,2592,2601],[1593,2592,2601],[1597,2592,2601],[61,133,270,449,2592,2601],[1596,2592,2601],[1600,2592,2601],[61,133,271,449,2592,2601],[1599,2592,2601],[1562,2592,2601],[522,576,1542,2592,2601],[522,576,899,1542,2592,2601],[576,928,1557,2592,2601],[522,576,1175,1542,2592,2601],[522,576,2592,2601],[61,576,1542,2592,2601],[522,576,1376,1542,2592,2601],[522,576,982,1542,2592,2601],[522,576,646,1057,1542,1550,2592,2601],[522,567,576,2592,2601],[455,576,811,2592,2601],[1542,1543,1544,1545,1546,1547,1548,1549,1550,1551,1552,1553,1554,1555,1556,1557,1558,1559,1560,1561,2592,2601],[576,705,1542,2592,2601],[576,795,1542,2592,2601],[576,615,1542,2592,2601],[522,567,576,989,2592,2601],[522,576,781,1542,2592,2601],[567,576,1542,2592,2601],[522,576,859,1542,2592,2601],[61,455,522,567,576,795,2592,2601],[575,2592,2601],[61,455,573,2592,2601],[61,455,549,556,568,2592,2601],[61,455,522,556,557,558,559,567,2592,2601],[522,558,2592,2601],[61,133,272,443,449,2592,2601],[547,548,549,557,558,559,568,569,570,571,572,573,574,2592,2601],[455,547,2592,2601],[61,549,569,2592,2601],[61,455,522,547,549,568,569,570,571,2592,2601],[61,522,547,548,558,2592,2601],[1603,2592,2601],[61,133,273,443,449,2592,2601],[1602,2592,2601],[1606,2592,2601],[61,133,274,443,449,2592,2601],[1605,2592,2601],[1609,2592,2601],[61,133,275,449,2592,2601],[1608,2592,2601],[1612,2592,2601],[61,133,276,449,2592,2601],[1611,2592,2601],[1615,2592,2601],[61,133,277,443,449,2592,2601],[1614,2592,2601],[1618,2592,2601],[61,133,278,449,2592,2601],[1617,2592,2601],[1621,2592,2601],[61,133,279,449,2592,2601],[1620,2592,2601],[1624,2592,2601],[61,133,280,449,2592,2601],[1623,2592,2601],[1631,2592,2601],[455,556,646,2592,2601],[61,133,281,449,2592,2601],[1626,1627,1628,1629,1630,2592,2601],[61,455,646,1626,1627,1629,2592,2601],[1634,2592,2601],[61,133,282,449,2592,2601],[1633,2592,2601],[1637,2592,2601],[61,133,283,449,2592,2601],[1636,2592,2601],[1650,2592,2601],[690,1645,2592,2601],[646,1645,2592,2601],[1646,1647,1648,1649,2592,2601],[1644,2592,2601],[61,455,1642,2592,2601],[61,455,646,1640,1642,2592,2601],[61,133,284,443,449,2592,2601],[1639,1640,1641,1642,1643,2592,2601],[61,455,1641,1643,2592,2601],[805,2592,2601],[61,133,285,443,449,2592,2601],[804,2592,2601],[1653,2592,2601],[61,133,286,443,449,2592,2601],[1652,2592,2601],[1656,2592,2601],[61,133,287,449,2592,2601],[1655,2592,2601],[1659,2592,2601],[61,133,288,449,2592,2601],[1658,2592,2601],[1662,2592,2601],[61,133,289,443,449,2592,2601],[1661,2592,2601],[1665,2592,2601],[61,133,290,449,2592,2601],[1664,2592,2601],[1668,2592,2601],[61,133,291,449,2592,2601],[1667,2592,2601],[1671,2592,2601],[61,133,292,449,2592,2601],[1670,2592,2601],[521,2592,2601],[61,455,500,506,2592,2601],[61,455,502,503,522,2592,2601],[61,455,500,502,503,506,508,509,512,2592,2601],[61,133,293,443,449,2592,2601],[455,502,508,512,2592,2601],[500,501,502,503,504,505,506,507,508,509,510,511,512,513,514,515,516,517,518,519,520,2592,2601],[61,455,500,511,2592,2601],[61,455,500,502,503,505,508,511,512,2592,2601],[61,455,500,502,503,504,506,511,2592,2601],[61,455,500,2592,2601],[61,512,2592,2601],[61,455,503,2592,2601],[61,502,2592,2601],[61,455,500,502,503,504,506,507,511,2592,2601],[61,500,501,503,504,2592,2601],[500,502,505,2592,2601],[61,455,500,502,503,504,505,508,509,510,512,2592,2601],[61,502,503,2592,2601],[61,455,500,502,503,507,508,509,512,2592,2601],[1674,2592,2601],[61,133,294,449,2592,2601],[1673,2592,2601],[1677,2592,2601],[61,133,295,443,449,2592,2601],[1676,2592,2601],[1681,2592,2601],[61,455,1679,2592,2601],[1679,1680,2592,2601],[61,133,296,443,449,2592,2601],[1684,2592,2601],[1683,2592,2601],[61,133,297,449,2592,2601],[1687,2592,2601],[1686,2592,2601],[61,133,298,449,2592,2601],[1690,2592,2601],[1689,2592,2601],[61,133,299,449,2592,2601],[1693,2592,2601],[1692,2592,2601],[61,133,300,443,449,2592,2601],[1696,2592,2601],[1695,2592,2601],[61,133,301,449,2592,2601],[1699,2592,2601],[1698,2592,2601],[61,133,302,449,2592,2601],[1702,2592,2601],[1701,2592,2601],[61,133,303,443,449,2592,2601],[1705,2592,2601],[1704,2592,2601],[61,133,304,449,2592,2601],[1708,2592,2601],[1707,2592,2601],[61,133,305,449,2592,2601],[1711,2592,2601],[1710,2592,2601],[61,133,306,443,449,2592,2601],[1714,2592,2601],[1713,2592,2601],[61,133,307,449,2592,2601],[1717,2592,2601],[1716,2592,2601],[61,133,308,443,449,2592,2601],[1720,2592,2601],[1719,2592,2601],[61,133,309,449,2592,2601],[1723,2592,2601],[1722,2592,2601],[61,133,310,443,449,2592,2601],[1726,2592,2601],[1725,2592,2601],[61,133,311,443,449,2592,2601],[1729,2592,2601],[1728,2592,2601],[61,133,312,449,2592,2601],[1732,2592,2601],[1731,2592,2601],[61,133,313,443,449,2592,2601],[1735,2592,2601],[1734,2592,2601],[61,133,314,449,2592,2601],[704,2592,2601],[700,701,702,703,2592,2601],[61,133,315,443,449,2592,2601],[61,455,522,700,701,2592,2601],[61,455,522,700,2592,2601],[61,455,522,536,556,2592,2601],[1739,2592,2601],[1737,1738,2592,2601],[61,133,316,449,2592,2601],[61,133,317,443,449,2592,2601],[1742,2592,2601],[1741,2592,2601],[810,2592,2601],[455,522,556,580,708,800,2592,2601],[61,455,522,536,646,696,697,698,699,706,2592,2601],[61,696,2592,2601],[556,707,2592,2601],[696,697,698,699,706,707,708,796,797,798,799,800,801,808,809,2592,2601],[522,696,2592,2601],[61,133,318,443,449,2592,2601],[615,2592,2601],[61,455,522,696,2592,2601],[61,708,2592,2601],[61,708,795,2592,2601],[802,803,807,2592,2601],[696,2592,2601],[455,696,2592,2601],[61,522,696,806,2592,2601],[61,455,580,697,801,808,2592,2601],[61,522,696,705,2592,2601],[1745,2592,2601],[1744,2592,2601],[61,133,319,449,2592,2601],[555,2592,2601],[61,455,522,550,553,2592,2601],[550,551,552,553,554,2592,2601],[61,455,522,550,551,552,2592,2601],[61,133,320,443,449,2592,2601],[1748,2592,2601],[1747,2592,2601],[61,133,321,449,2592,2601],[1755,2592,2601],[61,576,795,2592,2601],[1750,1751,1752,1753,1754,2592,2601],[61,795,2592,2601],[61,580,795,2592,2601],[61,781,795,2592,2601],[61,567,795,2592,2601],[1780,2592,2601],[795,899,2592,2601],[715,794,989,2592,2601],[795,1127,1758,2592,2601],[715,794,806,2592,2601],[1757,1758,1759,1760,1761,1762,1763,1773,1774,1775,1776,1777,1778,1779,2592,2601],[795,2592,2601],[455,556,646,715,795,989,1758,2592,2601],[61,522,705,795,1758,2592,2601],[580,795,2592,2601],[781,795,2592,2601],[781,795,1772,2592,2601],[567,795,2592,2601],[455,556,567,795,2592,2601],[455,556,795,2592,2601],[1784,2592,2601],[61,795,1782,2592,2601],[1782,1783,2592,2601],[794,2592,2601],[61,709,732,793,2592,2601],[61,522,536,709,711,714,727,729,732,793,2592,2601],[61,455,522,556,646,709,732,793,2592,2601],[61,455,714,790,2592,2601],[61,455,556,580,583,739,743,2592,2601],[61,732,793,2592,2601],[716,732,793,2592,2601],[61,455,710,732,793,2592,2601],[61,455,556,713,714,715,732,793,2592,2601],[732,793,2592,2601],[61,522,646,750,2592,2601],[61,455,522,536,646,709,711,712,714,716,717,729,730,731,2592,2601],[61,455,522,732,793,2592,2601],[61,455,522,536,556,567,615,646,709,711,712,714,728,729,731,732,733,744,745,751,752,753,754,755,756,757,758,763,781,793,2592,2601],[61,709,739,744,782,2592,2601],[709,710,711,712,713,714,715,716,717,727,728,729,730,731,732,733,744,745,751,752,753,754,755,756,757,758,782,783,784,785,786,791,792,793,2592,2601],[536,732,2592,2601],[61,455,522,536,709,711,714,728,732,793,2592,2601],[61,133,322,443,449,2592,2601],[61,455,709,714,744,753,2592,2601],[61,615,2592,2601],[61,455,732,793,2592,2601],[61,522,717,2592,2601],[714,2592,2601],[61,726,2592,2601],[61,522,615,646,709,729,730,731,732,753,754,782,793,2592,2601],[1787,2592,2601],[1786,2592,2601],[61,133,323,449,2592,2601],[1790,2592,2601],[1789,2592,2601],[61,133,324,443,449,2592,2601],[1793,2592,2601],[1792,2592,2601],[61,133,325,449,2592,2601],[1796,2592,2601],[1795,2592,2601],[61,133,326,449,2592,2601],[1799,2592,2601],[1798,2592,2601],[61,133,327,449,2592,2601],[1804,2592,2601],[61,522,615,811,2592,2601],[1801,1802,1803,2592,2601],[61,522,615,705,2592,2601],[61,615,795,2592,2601],[614,2592,2601],[61,455,522,607,609,2592,2601],[61,580,609,2592,2601],[600,601,602,603,604,605,606,607,608,609,610,611,612,613,2592,2601],[61,455,522,536,556,600,601,602,603,604,605,606,607,608,2592,2601],[61,455,522,609,2592,2601],[61,455,609,2592,2601],[522,603,2592,2601],[61,133,328,443,449,2592,2601],[61,455,536,609,2592,2601],[1807,2592,2601],[1806,2592,2601],[61,133,329,449,2592,2601],[1810,2592,2601],[1809,2592,2601],[61,133,330,443,449,2592,2601],[1813,2592,2601],[1812,2592,2601],[61,133,331,449,2592,2601],[1816,2592,2601],[1815,2592,2601],[61,133,332,449,2592,2601],[1819,2592,2601],[1818,2592,2601],[61,133,333,449,2592,2601],[1822,2592,2601],[1821,2592,2601],[61,133,334,449,2592,2601],[1825,2592,2601],[1824,2592,2601],[61,133,335,449,2592,2601],[1828,2592,2601],[1827,2592,2601],[61,133,336,449,2592,2601],[1831,2592,2601],[1830,2592,2601],[61,133,337,449,2592,2601],[1834,2592,2601],[1833,2592,2601],[61,133,338,449,2592,2601],[1837,2592,2601],[1836,2592,2601],[61,133,339,449,2592,2601],[1840,2592,2601],[1839,2592,2601],[61,133,340,449,2592,2601],[1843,2592,2601],[1842,2592,2601],[61,133,341,449,2592,2601],[1846,2592,2601],[1845,2592,2601],[61,133,342,443,449,2592,2601],[1849,2592,2601],[1848,2592,2601],[61,133,343,449,2592,2601],[1852,2592,2601],[1851,2592,2601],[61,133,344,449,2592,2601],[1855,2592,2601],[1854,2592,2601],[61,133,345,443,449,2592,2601],[1858,2592,2601],[1857,2592,2601],[61,133,346,443,449,2592,2601],[1861,2592,2601],[1860,2592,2601],[61,133,347,449,2592,2601],[1864,2592,2601],[1863,2592,2601],[61,133,348,443,449,2592,2601],[1867,2592,2601],[1866,2592,2601],[61,133,349,443,449,2592,2601],[1870,2592,2601],[1869,2592,2601],[61,133,350,443,449,2592,2601],[1873,2592,2601],[1872,2592,2601],[61,133,351,449,2592,2601],[1876,2592,2601],[1875,2592,2601],[61,133,352,449,2592,2601],[1879,2592,2601],[1878,2592,2601],[61,133,353,449,2592,2601],[1882,2592,2601],[1881,2592,2601],[61,133,354,449,2592,2601],[1885,2592,2601],[1884,2592,2601],[61,133,355,449,2592,2601],[1888,2592,2601],[1887,2592,2601],[61,133,356,449,2592,2601],[1891,2592,2601],[1890,2592,2601],[61,133,357,443,449,2592,2601],[1137,2592,2601],[61,455,522,536,556,615,646,672,679,1133,1134,1135,2592,2601],[1133,1134,1135,1136,2592,2601],[522,1133,2592,2601],[61,133,358,449,2592,2601],[1894,2592,2601],[1893,2592,2601],[61,133,359,449,2592,2601],[1897,2592,2601],[1896,2592,2601],[61,133,360,449,2592,2601],[1900,2592,2601],[1899,2592,2601],[61,133,361,449,2592,2601],[1903,2592,2601],[1902,2592,2601],[61,133,362,449,2592,2601],[1906,2592,2601],[1905,2592,2601],[61,133,363,449,2592,2601],[1909,2592,2601],[1908,2592,2601],[61,133,364,449,2592,2601],[1912,2592,2601],[1911,2592,2601],[61,133,365,449,2592,2601],[1915,2592,2601],[1914,2592,2601],[61,133,366,449,2592,2601],[1918,2592,2601],[1917,2592,2601],[61,133,367,449,2592,2601],[1921,2592,2601],[1920,2592,2601],[61,133,368,449,2592,2601],[876,2592,2601],[875,2592,2601],[61,133,369,449,2592,2601],[1924,2592,2601],[1923,2592,2601],[61,133,370,449,2592,2601],[1927,2592,2601],[1926,2592,2601],[61,133,371,443,449,2592,2601],[1930,2592,2601],[1929,2592,2601],[61,133,372,449,2592,2601],[1933,2592,2601],[1932,2592,2601],[61,133,373,449,2592,2601],[1936,2592,2601],[1935,2592,2601],[61,133,374,443,449,2592,2601],[1939,2592,2601],[1938,2592,2601],[61,133,375,443,449,2592,2601],[1942,2592,2601],[1941,2592,2601],[61,133,376,449,2592,2601],[1945,2592,2601],[1944,2592,2601],[61,133,377,449,2592,2601],[1160,2592,2601],[61,455,522,556,646,1141,1143,1148,1150,1154,1159,2592,2601],[61,522,989,1140,1143,2592,2601],[455,522,646,989,1144,1145,1153,2592,2601],[61,455,522,536,556,580,615,646,989,1142,1143,1144,1145,1148,1149,1150,1151,1153,1154,1155,1159,2592,2601],[1139,2592,2601],[1139,1140,1141,1142,1143,1144,1145,1146,1147,1148,1149,1150,1151,1152,1153,1154,1155,1156,1157,1158,1159,2592,2601],[61,522,989,1140,1146,2592,2601],[61,455,522,556,576,580,615,646,989,1141,1142,1143,1145,1146,1147,1148,1149,1150,1153,2592,2601],[61,455,646,1147,2592,2601],[61,455,1140,2592,2601],[455,556,646,989,1143,2592,2601],[61,455,646,1153,2592,2601],[61,455,522,646,989,1151,1152,1154,1159,2592,2601],[536,1151,1154,1156,2592,2601],[61,133,378,443,449,2592,2601],[61,455,522,556,646,989,1143,1144,1145,1148,1149,1150,2592,2601],[1948,2592,2601],[1947,2592,2601],[61,133,379,443,449,2592,2601],[1951,2592,2601],[1950,2592,2601],[61,133,380,443,449,2592,2601],[1954,2592,2601],[1953,2592,2601],[61,133,381,443,449,2592,2601],[1957,2592,2601],[1956,2592,2601],[61,133,382,449,2592,2601],[1960,2592,2601],[1959,2592,2601],[61,133,383,449,2592,2601],[1963,2592,2601],[1962,2592,2601],[61,133,384,449,2592,2601],[1966,2592,2601],[1965,2592,2601],[61,133,385,449,2592,2601],[1969,2592,2601],[1968,2592,2601],[61,133,386,443,449,2592,2601],[1972,2592,2601],[1971,2592,2601],[61,133,387,443,449,2592,2601],[1975,2592,2601],[1974,2592,2601],[61,672,679,2592,2601],[1990,2592,2601],[672,899,2592,2601],[672,2592,2601],[672,1175,2592,2601],[580,672,1977,2592,2601],[672,1014,1977,2592,2601],[61,672,1320,2592,2601],[672,1977,2592,2601],[672,1645,1977,2592,2601],[1977,1978,1979,1980,1981,1982,1983,1984,1985,1986,1987,1988,1989,2592,2601],[646,672,2592,2601],[672,690,1977,2592,2601],[672,894,2592,2601],[671,2592,2601],[659,663,2592,2601],[505,522,659,2592,2601],[388,455,522,2592,2601],[61,455,522,556,646,659,665,666,667,668,2592,2601],[659,660,661,662,663,664,665,666,667,668,669,670,2592,2601],[61,455,556,659,2592,2601],[61,455,522,659,660,661,662,664,2592,2601],[61,133,388,449,2592,2601],[61,646,671,2592,2601],[1993,2592,2601],[1992,2592,2601],[61,133,389,449,2592,2601],[1996,2592,2601],[1995,2592,2601],[61,133,390,443,449,2592,2601],[1999,2592,2601],[1998,2592,2601],[61,133,391,449,2592,2601],[2002,2592,2601],[2001,2592,2601],[61,133,392,443,449,2592,2601],[2005,2592,2601],[2004,2592,2601],[61,133,393,443,449,2592,2601],[2008,2592,2601],[2007,2592,2601],[61,133,394,449,2592,2601],[582,2592,2601],[61,455,467,522,556,580,2592,2601],[581,2592,2601],[2012,2592,2601],[61,455,522,580,615,646,1320,2010,2592,2601],[2010,2011,2592,2601],[61,522,580,583,2592,2601],[2017,2592,2601],[2014,2015,2016,2592,2601],[61,580,781,2592,2601],[61,567,580,2592,2601],[579,2592,2601],[505,522,542,577,2592,2601],[61,455,522,542,577,2592,2601],[61,455,522,542,543,544,545,546,556,576,2592,2601],[61,542,2592,2601],[542,543,544,545,546,577,578,2592,2601],[61,133,395,443,449,2592,2601],[2020,2592,2601],[2019,2592,2601],[61,133,396,449,2592,2601],[2023,2592,2601],[2022,2592,2601],[61,133,397,449,2592,2601],[2026,2592,2601],[2025,2592,2601],[61,133,398,449,2592,2601],[2029,2592,2601],[2028,2592,2601],[61,133,399,449,2592,2601],[2032,2592,2601],[2031,2592,2601],[61,133,400,449,2592,2601],[864,2592,2601],[455,522,2592,2601],[861,862,863,2592,2601],[61,133,401,443,449,2592,2601],[2035,2592,2601],[2034,2592,2601],[61,133,402,449,2592,2601],[2060,2592,2601],[522,1376,2045,2046,2592,2601],[522,982,2045,2046,2592,2601],[522,646,1057,2045,2046,2592,2601],[522,576,2045,2046,2592,2601],[522,811,2045,2046,2592,2601],[2046,2047,2048,2049,2050,2051,2052,2053,2054,2055,2056,2057,2058,2059,2592,2601],[522,1682,2045,2046,2592,2601],[522,705,2045,2046,2592,2601],[522,795,2045,2046,2592,2601],[522,865,2045,2046,2592,2601],[522,781,2045,2046,2592,2601],[522,567,2045,2046,2592,2601],[522,859,2045,2046,2592,2601],[455,522,567,2045,2592,2601],[522,2045,2046,2592,2601],[2044,2592,2601],[2037,2038,2039,2040,2041,2042,2043,2592,2601],[2042,2592,2601],[455,576,2592,2601],[522,2037,2592,2601],[61,455,522,536,2037,2039,2592,2601],[61,455,536,556,2038,2040,2041,2592,2601],[61,133,403,443,449,2592,2601],[522,2037,2042,2043,2592,2601],[2063,2592,2601],[2062,2592,2601],[61,133,404,449,2592,2601],[988,2592,2601],[983,984,985,986,987,2592,2601],[61,455,522,985,2592,2601],[61,455,646,795,983,985,2592,2601],[61,455,646,985,2592,2601],[61,455,522,556,984,2592,2601],[61,133,405,443,449,2592,2601],[2066,2592,2601],[2065,2592,2601],[61,133,406,449,2592,2601],[2069,2592,2601],[2068,2592,2601],[61,133,407,449,2592,2601],[2080,2592,2601],[61,580,583,2077,2592,2601],[455,522,2071,2592,2601],[2071,2072,2073,2074,2075,2076,2077,2078,2079,2592,2601],[61,455,522,781,2071,2072,2074,2075,2592,2601],[61,2075,2077,2592,2601],[61,455,580,2013,2076,2592,2601],[61,455,580,2071,2074,2078,2592,2601],[61,133,408,443,449,2592,2601],[61,455,2073,2592,2601],[2083,2592,2601],[2082,2592,2601],[61,133,409,449,2592,2601],[954,2592,2601],[61,947,948,2592,2601],[61,455,945,947,2592,2601],[943,944,945,946,947,948,949,950,951,952,953,2592,2601],[455,947,2592,2601],[61,455,646,945,947,2592,2601],[61,455,690,943,944,945,946,948,2592,2601],[61,133,410,449,2592,2601],[2104,2592,2601],[2096,2592,2601],[781,2096,2592,2601],[2097,2098,2099,2100,2101,2102,2103,2592,2601],[781,795,2096,2592,2601],[556,580,781,2096,2592,2601],[2095,2592,2601],[61,455,522,576,781,811,2091,2592,2601],[61,455,2089,2090,2592,2601],[61,455,522,672,2091,2592,2601],[2085,2086,2087,2088,2089,2090,2091,2092,2093,2094,2592,2601],[2086,2592,2601],[61,455,2086,2592,2601],[61,455,2085,2087,2592,2601],[61,133,411,443,449,2592,2601],[2107,2592,2601],[2106,2592,2601],[61,133,412,449,2592,2601],[789,2592,2601],[787,788,2592,2601],[61,133,413,449,2592,2601],[2110,2592,2601],[2109,2592,2601],[61,133,414,449,2592,2601],[2113,2592,2601],[2112,2592,2601],[61,133,415,449,2592,2601],[1771,2592,2601],[781,1764,2592,2601],[522,781,811,1764,2592,2601],[1764,1765,1766,1767,1768,1769,1770,2592,2601],[781,795,1764,2592,2601],[567,781,1764,2592,2601],[567,781,2592,2601],[780,2592,2601],[764,765,766,767,768,769,776,777,778,779,2592,2601],[61,455,522,776,779,2592,2601],[536,776,2592,2601],[522,764,2592,2601],[61,133,416,443,449,2592,2601],[61,768,776,779,2592,2601],[61,455,567,766,767,776,779,2592,2601],[61,455,522,556,764,765,768,769,775,2592,2601],[61,522,556,776,779,2592,2601],[566,2592,2601],[560,561,562,563,564,565,2592,2601],[61,455,522,562,565,2592,2601],[61,455,522,556,560,561,2592,2601],[61,455,556,562,565,2592,2601],[536,562,2592,2601],[522,560,2592,2601],[61,133,417,443,449,2592,2601],[622,2592,2601],[620,621,2592,2601],[61,455,522,556,620,2592,2601],[61,133,418,443,449,2592,2601],[2116,2592,2601],[2115,2592,2601],[61,133,419,449,2592,2601],[2119,2592,2601],[2118,2592,2601],[61,133,420,449,2592,2601],[2122,2592,2601],[2121,2592,2601],[61,133,421,449,2592,2601],[2125,2592,2601],[2124,2592,2601],[61,133,422,449,2592,2601],[2128,2592,2601],[2127,2592,2601],[61,133,423,449,2592,2601],[2197,2592,2601],[859,2592,2601],[61,522,859,2183,2592,2601],[61,455,522,859,2183,2184,2592,2601],[61,522,859,899,2183,2184,2592,2601],[2183,2185,2186,2592,2601],[61,522,859,2592,2601],[61,455,522,556,580,859,2592,2601],[455,646,859,2592,2601],[61,455,522,646,859,2592,2601],[61,522,556,580,646,859,1264,2592,2601],[61,522,580,859,1264,2192,2592,2601],[61,522,859,1376,2592,2601],[61,522,859,1127,2170,2592,2601],[646,1057,2136,2592,2601],[646,859,1057,2135,2592,2601],[61,522,646,859,1057,2197,2592,2601],[61,522,859,1250,2592,2601],[61,455,522,859,2592,2601],[61,455,522,859,2155,2592,2601],[61,522,580,615,859,2592,2601],[61,522,795,859,2592,2601],[61,455,522,556,567,859,2189,2592,2601],[61,522,576,859,2592,2601],[455,859,2592,2601],[2130,2131,2132,2133,2134,2135,2136,2137,2138,2139,2140,2141,2142,2143,2144,2145,2146,2147,2148,2149,2150,2151,2152,2153,2154,2155,2156,2157,2158,2159,2160,2161,2162,2163,2164,2165,2166,2167,2168,2169,2170,2171,2172,2173,2174,2175,2176,2177,2178,2179,2180,2181,2182,2187,2188,2189,2190,2191,2192,2193,2194,2195,2196,2592,2601],[795,859,2592,2601],[61,455,522,556,580,646,739,743,859,2592,2601],[61,522,556,859,2144,2592,2601],[61,522,646,859,2144,2592,2601],[61,455,522,859,2144,2592,2601],[781,859,2592,2601],[61,522,781,859,2592,2601],[61,455,522,567,859,2592,2601],[455,567,859,2592,2601],[858,2592,2601],[61,455,522,536,826,2592,2601],[826,2592,2601],[834,835,837,2592,2601],[455,556,826,2592,2601],[825,826,827,828,829,830,831,832,833,834,835,836,837,838,839,840,841,842,843,844,845,846,847,848,849,850,851,852,853,854,855,856,857,2592,2601],[455,522,832,834,837,2592,2601],[61,834,835,836,837,2592,2601],[522,830,2592,2601],[61,455,522,536,583,615,826,830,831,833,837,2592,2601],[536,2592,2601],[61,829,834,836,837,2592,2601],[61,834,837,858,2592,2601],[61,832,833,834,837,847,849,850,851,2592,2601],[522,580,837,2592,2601],[61,834,837,2592,2601],[61,834,836,837,2592,2601],[61,834,837,847,2592,2601],[61,833,834,836,837,2592,2601],[61,829,833,837,2592,2601],[61,455,522,536,833,834,836,837,854,2592,2601],[61,455,536,833,834,836,837,841,2592,2601],[61,455,834,836,837,2592,2601],[455,522,536,840,2592,2601],[61,133,424,443,449,2592,2601],[455,834,836,2592,2601],[2200,2592,2601],[2199,2592,2601],[61,133,425,443,449,2592,2601],[2207,2592,2601],[61,455,522,536,556,580,646,2202,2203,2204,2592,2601],[61,580,583,2202,2592,2601],[2202,2203,2204,2205,2206,2592,2601],[61,133,426,443,449,2592,2601],[2210,2592,2601],[2209,2592,2601],[61,133,427,449,2592,2601],[2213,2592,2601],[2212,2592,2601],[61,133,428,443,449,2592,2601],[2216,2592,2601],[2215,2592,2601],[61,133,429,449,2592,2601],[2219,2592,2601],[2218,2592,2601],[61,133,430,449,2592,2601],[2222,2592,2601],[2221,2592,2601],[61,133,431,449,2592,2601],[2225,2592,2601],[2224,2592,2601],[61,133,432,443,449,2592,2601],[2228,2592,2601],[2227,2592,2601],[61,133,433,449,2592,2601],[2231,2592,2601],[2230,2592,2601],[61,133,434,449,2592,2601],[2234,2592,2601],[2233,2592,2601],[61,133,435,443,449,2592,2601],[2237,2592,2601],[2236,2592,2601],[61,133,436,449,2592,2601],[2240,2592,2601],[2239,2592,2601],[61,133,437,449,2592,2601],[2243,2592,2601],[2242,2592,2601],[61,133,438,449,2592,2601],[2246,2592,2601],[2245,2592,2601],[61,133,439,449,2592,2601],[2249,2592,2601],[2248,2592,2601],[61,133,440,449,2592,2601],[2252,2592,2601],[2251,2592,2601],[61,133,441,449,2592,2601],[2255,2592,2601],[2254,2592,2601],[449,2592,2601],[61,69,110,141,143,154,2592,2601],[111,2592,2601],[61,65,111,164,2592,2601],[64,2592,2601],[65,2592,2601],[61,122,133,2592,2601],[61,99,112,2592,2601],[100,2592,2601],[61,111,2592,2601],[99,100,113,2592,2601],[61,112,2592,2601],[61,99,101,2592,2601],[61,112,113,2592,2601],[61,67,96,98,101,112,113,114,115,2592,2601],[61,168,2592,2601],[61,168,169,2592,2601],[168,169,170,2592,2601],[147,149,2592,2601],[61,101,115,147,159,2592,2601],[111,116,2592,2601],[66,2592,2601],[61,151,152,2592,2601],[147,2592,2601],[162,2592,2601],[162,163,2592,2601],[99,112,113,116,123,124,125,2592,2601],[61,99,2592,2601],[126,127,128,129,130,131,132,2592,2601],[62,63,64,65,67,68,69,96,97,98,99,100,101,110,111,112,113,114,115,116,117,118,119,120,121,122,123,124,125,134,135,136,137,138,139,142,143,144,145,146,147,148,149,150,153,155,156,157,158,159,160,161,164,165,166,167,171,172,444,445,446,447,448,2592,2601],[99,2592,2601],[61,111,115,116,147,2592,2601],[98,99,2592,2601],[61,95,102,143,2592,2601],[61,98,100,2592,2601],[61,115,2592,2601],[61,97,98,2592,2601],[61,63,66,111,115,2592,2601],[99,100,137,144,2592,2601],[65,70,102,111,2592,2601],[65,102,104,2592,2601],[65,102,103,111,2592,2601],[102,103,104,105,106,107,108,109,2592,2601],[65,102,103,2592,2601],[65,95,111,2592,2601],[61,63,65,67,68,69,70,95,96,99,101,110,112,116,117,2592,2601],[61,67,68,69,95,142,2592,2601],[61,62,117,2592,2601],[99,116,2592,2601],[61,97,99,2592,2601],[140,141,2592,2601],[140,2592,2601],[2265,2592,2601],[61,455,522,615,646,2257,2592,2601],[2257,2258,2592,2601],[61,449,615,795,2592,2601],[2263,2592,2601],[2259,2262,2264,2592,2601],[2260,2261,2592,2601],[61,455,522,556,615,646,795,1298,2260,2592,2601],[61,455,522,615,795,859,2592,2601],[94,2592,2601],[70,83,85,2592,2601],[70,79,83,85,2592,2601],[70,83,84,2592,2601],[70,80,81,82,85,2592,2601],[90,2592,2601],[71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,91,92,93,2592,2601],[70,2592,2601],[70,95,443,452,455,461,467,470,474,477,480,483,486,522,536,556,567,576,580,583,615,623,646,672,679,690,705,726,739,743,750,763,775,781,790,795,806,811,859,865,877,894,899,928,938,955,967,982,989,1014,1031,1057,1061,1064,1067,1070,1073,1100,1103,1106,1127,1132,1138,1161,1175,1178,1181,1184,1187,1190,1193,1198,1204,1207,1210,1218,1221,1250,1255,1258,1264,1267,1270,1273,1276,1279,1283,1286,1289,1292,1298,1320,1331,1335,1343,1346,1364,1376,1379,1401,1404,1440,1443,1446,1450,1453,1458,1461,1464,1467,1470,1473,1476,1479,1482,1485,1488,1491,1494,1497,1500,1503,1506,1509,1512,1515,1525,1528,1531,1563,1574,1577,1580,1583,1589,1592,1595,1598,1601,1604,1607,1610,1613,1616,1619,1622,1625,1632,1635,1638,1645,1651,1654,1657,1660,1663,1666,1669,1672,1675,1678,1682,1685,1688,1691,1694,1697,1700,1703,1706,1709,1712,1715,1718,1721,1724,1727,1730,1733,1736,1740,1743,1746,1749,1756,1772,1781,1785,1788,1791,1794,1797,1800,1805,1808,1811,1814,1817,1820,1823,1826,1829,1832,1835,1838,1841,1844,1847,1850,1853,1856,1859,1862,1865,1868,1871,1874,1877,1880,1883,1886,1889,1892,1895,1898,1901,1904,1907,1910,1913,1916,1919,1922,1925,1928,1931,1934,1937,1940,1943,1946,1949,1952,1955,1958,1961,1964,1967,1970,1973,1976,1991,1994,1997,2000,2003,2006,2009,2013,2018,2021,2024,2027,2030,2033,2036,2045,2061,2064,2067,2070,2081,2084,2096,2105,2108,2111,2114,2117,2120,2123,2126,2129,2198,2201,2208,2211,2214,2217,2220,2223,2226,2229,2232,2235,2238,2241,2244,2247,2250,2253,2256,2266,2269,2272,2294,2299,2303,2592,2601],[61,66,2592,2601],[66,442,2592,2601],[173,174,175,176,177,178,179,180,181,182,183,184,185,186,187,188,189,190,191,192,193,194,195,196,197,198,199,200,201,202,203,204,205,206,207,208,209,210,211,212,213,214,215,216,217,218,219,220,221,222,223,224,225,226,227,228,229,230,231,232,233,234,235,236,237,238,239,240,241,242,243,244,245,246,247,248,249,250,251,252,253,254,255,256,257,258,259,260,261,262,263,264,265,266,267,268,269,270,271,272,273,274,275,276,277,278,279,280,281,282,283,284,285,286,287,288,289,290,291,292,293,294,295,296,297,298,299,300,301,302,303,304,305,306,307,308,309,310,311,312,313,314,315,316,317,318,319,320,321,322,323,324,325,326,327,328,329,330,331,332,333,334,335,336,337,338,339,340,341,342,343,344,345,346,347,348,349,350,351,352,353,354,355,356,357,358,359,360,361,362,363,364,365,366,367,368,369,370,371,372,373,374,375,376,377,378,379,380,381,382,383,384,385,386,387,388,389,390,391,392,393,394,395,396,397,398,399,400,401,402,403,404,405,406,407,408,409,410,411,412,413,414,415,416,417,418,419,420,421,422,423,424,425,426,427,428,429,430,431,432,433,434,435,436,437,438,439,440,441,2592,2601],[2268,2592,2601],[2267,2592,2601],[2271,2592,2601],[2270,2592,2601],[2293,2592,2601],[2276,2592,2601],[2273,2274,2275,2276,2277,2278,2279,2280,2592,2601],[781,2276,2592,2601],[455,2274,2276,2277,2592,2601],[95,2273,2276,2592,2601],[455,2274,2276,2592,2601],[455,2275,2277,2592,2601],[455,2276,2278,2592,2601],[982,2281,2592,2601],[455,522,646,1376,2281,2592,2601],[61,982,1376,2282,2287,2288,2592,2601],[455,522,580,739,982,1364,1440,2281,2289,2592,2601],[61,455,522,580,646,982,1376,2281,2284,2286,2592,2601],[455,781,982,2281,2289,2592,2601],[2282,2283,2287,2288,2289,2290,2291,2592,2601],[2281,2286,2592,2601],[522,646,739,989,2592,2601],[2281,2284,2286,2292,2592,2601],[2285,2592,2601],[61,455,2281,2592,2601],[2298,2592,2601],[2295,2296,2297,2592,2601],[2302,2592,2601],[2300,2301,2592,2601],[61,795,2302,2592,2601],[61,455,795,2592,2601],[58,59,2592,2601],[60,2592,2601],[58,59,60,2592,2601],[2410,2413,2592,2601],[2414,2592,2601],[2412,2592,2601],[2412,2413,2414,2415,2592,2601],[2410,2412,2592,2601],[2410,2411,2413,2592,2601],[2314,2349,2360,2408,2424,2425,2468,2469,2470,2471,2472,2481,2592,2601],[2305,2334,2592,2601,2613,2622],[2305,2307,2339,2340,2592,2601],[2307,2592,2601],[2305,2592,2601],[522,2307,2308,2592,2601],[61,646,2307,2332,2592,2601],[61,615,2304,2308,2310,2311,2313,2316,2318,2320,2322,2324,2326,2328,2331,2592,2601],[2305,2473,2474,2592,2601],[2305,2473,2474,2475,2476,2592,2601],[2305,2473,2592,2601],[2308,2334,2592,2601,2613,2622],[2307,2404,2407,2420,2592,2601],[2305,2307,2308,2332,2335,2338,2339,2341,2342,2343,2344,2345,2346,2347,2348,2592,2601],[2308,2344,2592,2601],[2305,2306,2308,2592,2601],[2332,2592,2601],[2307,2332,2592,2601],[2305,2306,2307,2336,2337,2592,2601],[522,623,646,795,2266,2304,2305,2592,2601],[61,646,2304,2592,2601],[2325,2592,2601],[61,522,576,580,795,1563,2018,2304,2308,2592,2601],[2358,2592,2601],[2317,2592,2601],[2323,2592,2601],[2308,2329,2592,2601],[2330,2592,2601],[2308,2592,2601],[2309,2592,2601],[2316,2318,2320,2352,2354,2357,2359,2592,2601],[2353,2592,2601],[61,522,536,567,576,795,1563,2304,2592,2601],[2350,2351,2592,2601],[2332,2344,2349,2350,2592,2601],[522,795,2332,2344,2349,2592,2601],[2315,2592,2601],[2308,2310,2314,2592,2601],[2312,2592,2601],[2308,2310,2332,2592,2601],[2327,2592,2601],[2355,2356,2592,2601],[61,522,536,576,580,795,1563,2018,2304,2308,2592,2601],[2321,2592,2601],[2319,2592,2601],[61,2304,2310,2592,2601],[522,567,580,646,795,1161,2307,2592,2601],[2419,2479,2480,2592,2601],[2304,2307,2314,2332,2349,2419,2421,2473,2477,2478,2592,2601,2613,2622],[646,2304,2305,2307,2348,2592,2601],[2305,2307,2339,2419,2421,2423,2592,2601],[2314,2418,2466,2467,2592,2601,2614,2622],[2305,2314,2404,2407,2409,2417,2418,2419,2422,2592,2601],[2314,2418,2467,2592,2601,2614,2622],[2314,2416,2592,2601,2614,2622,2642],[2314,2592,2601],[2314,2592,2601,2614,2622,2642],[2314,2404,2407,2408,2409,2417,2419,2423,2592,2601],[2314,2424,2425,2468,2469,2592,2601],[2592,2598,2601],[2592,2600,2601],[2601],[2592,2601,2606,2634],[2592,2601,2602,2607,2612,2620,2631,2642],[2592,2601,2602,2603,2612,2620],[2587,2588,2589,2592,2601],[2592,2601,2604,2643],[2592,2601,2605,2606,2613,2621],[2592,2601,2606,2631,2639],[2592,2601,2607,2609,2612,2620],[2592,2600,2601,2608],[2592,2601,2609,2610],[2592,2601,2611,2612],[2592,2600,2601,2612],[2592,2601,2612,2613,2614,2631,2642],[2592,2601,2612,2613,2614,2627,2631,2634],[2592,2601,2609,2612,2615,2620,2631,2642],[2592,2601,2612,2613,2615,2616,2620,2631,2639,2642],[2592,2601,2615,2617,2631,2639,2642],[2590,2591,2592,2593,2594,2595,2596,2597,2598,2599,2600,2601,2602,2603,2604,2605,2606,2607,2608,2609,2610,2611,2612,2613,2614,2615,2616,2617,2618,2619,2620,2621,2622,2623,2624,2625,2626,2627,2628,2629,2630,2631,2632,2633,2634,2635,2636,2637,2638,2639,2640,2641,2642,2643,2644,2645,2646,2647,2648],[2592,2601,2612,2618],[2592,2601,2619,2642,2647],[2592,2601,2609,2612,2620,2631],[2592,2601,2621],[2592,2601,2622],[2592,2600,2601,2623],[2592,2598,2599,2600,2601,2602,2603,2604,2605,2606,2607,2608,2609,2610,2611,2612,2613,2614,2615,2616,2617,2618,2619,2620,2621,2622,2623,2624,2625,2626,2627,2628,2629,2630,2631,2632,2633,2634,2635,2636,2637,2638,2639,2640,2641,2642,2643,2644,2645,2646,2647,2648],[2592,2601,2625],[2592,2601,2626],[2592,2601,2612,2627,2628],[2592,2601,2627,2629,2643,2645],[2592,2601,2612,2631,2632,2634],[2592,2601,2633,2634],[2592,2601,2631,2632],[2592,2601,2634],[2592,2601,2635],[2592,2598,2601,2631,2636],[2592,2601,2612,2637,2638],[2592,2601,2637,2638],[2592,2601,2606,2620,2631,2639],[2592,2601,2640],[2592,2601,2620,2641],[2592,2601,2615,2626,2642],[2592,2601,2606,2643],[2592,2601,2631,2644],[2592,2601,2619,2645],[2592,2601,2646],[2592,2601,2612,2614,2623,2631,2634,2642,2645,2647],[2592,2601,2631,2648],[2555,2592,2601],[2529,2592,2601],[536,635,644,2592,2601],[584,585,590,593,594,595,596,597,598,599,616,618,619,624,625,626,627,628,629,630,631,632,633,634,635,636,637,638,639,640,641,642,643,644,2488,2501,2592,2601],[2485,2592,2601],[2578,2592,2601],[2571,2592,2601],[2536,2592,2601],[2482,2592,2601],[61,2304,2482,2483,2486,2530,2537,2556,2572,2579,2592,2601],[61,2482,2483,2582,2592,2601],[2483,2582,2583,2592,2601]],"fileInfos":[{"version":"c430d44666289dae81f30fa7b2edebf186ecc91a2d4c71266ea6ae76388792e1","affectsGlobalScope":true,"impliedFormat":1},{"version":"45b7ab580deca34ae9729e97c13cfd999df04416a79116c3bfb483804f85ded4","impliedFormat":1},{"version":"3facaf05f0c5fc569c5649dd359892c98a85557e3e0c847964caeb67076f4d75","impliedFormat":1},{"version":"e44bb8bbac7f10ecc786703fe0a6a4b952189f908707980ba8f3c8975a760962","impliedFormat":1},{"version":"5e1c4c362065a6b95ff952c0eab010f04dcd2c3494e813b493ecfd4fcb9fc0d8","impliedFormat":1},{"version":"68d73b4a11549f9c0b7d352d10e91e5dca8faa3322bfb77b661839c42b1ddec7","impliedFormat":1},{"version":"5efce4fc3c29ea84e8928f97adec086e3dc876365e0982cc8479a07954a3efd4","impliedFormat":1},{"version":"feecb1be483ed332fad555aff858affd90a48ab19ba7272ee084704eb7167569","impliedFormat":1},{"version":"ee7bad0c15b58988daa84371e0b89d313b762ab83cb5b31b8a2d1162e8eb41c2","impliedFormat":1},{"version":"c57796738e7f83dbc4b8e65132f11a377649c00dd3eee333f672b8f0a6bea671","affectsGlobalScope":true,"impliedFormat":1},{"version":"dc2df20b1bcdc8c2d34af4926e2c3ab15ffe1160a63e58b7e09833f616efff44","affectsGlobalScope":true,"impliedFormat":1},{"version":"515d0b7b9bea2e31ea4ec968e9edd2c39d3eebf4a2d5cbd04e88639819ae3b71","affectsGlobalScope":true,"impliedFormat":1},{"version":"0559b1f683ac7505ae451f9a96ce4c3c92bdc71411651ca6ddb0e88baaaad6a3","affectsGlobalScope":true,"impliedFormat":1},{"version":"0dc1e7ceda9b8b9b455c3a2d67b0412feab00bd2f66656cd8850e8831b08b537","affectsGlobalScope":true,"impliedFormat":1},{"version":"ce691fb9e5c64efb9547083e4a34091bcbe5bdb41027e310ebba8f7d96a98671","affectsGlobalScope":true,"impliedFormat":1},{"version":"8d697a2a929a5fcb38b7a65594020fcef05ec1630804a33748829c5ff53640d0","affectsGlobalScope":true,"impliedFormat":1},{"version":"4ff2a353abf8a80ee399af572debb8faab2d33ad38c4b4474cff7f26e7653b8d","affectsGlobalScope":true,"impliedFormat":1},{"version":"fb0f136d372979348d59b3f5020b4cdb81b5504192b1cacff5d1fbba29378aa1","affectsGlobalScope":true,"impliedFormat":1},{"version":"d15bea3d62cbbdb9797079416b8ac375ae99162a7fba5de2c6c505446486ac0a","affectsGlobalScope":true,"impliedFormat":1},{"version":"68d18b664c9d32a7336a70235958b8997ebc1c3b8505f4f1ae2b7e7753b87618","affectsGlobalScope":true,"impliedFormat":1},{"version":"eb3d66c8327153d8fa7dd03f9c58d351107fe824c79e9b56b462935176cdf12a","affectsGlobalScope":true,"impliedFormat":1},{"version":"38f0219c9e23c915ef9790ab1d680440d95419ad264816fa15009a8851e79119","affectsGlobalScope":true,"impliedFormat":1},{"version":"69ab18c3b76cd9b1be3d188eaf8bba06112ebbe2f47f6c322b5105a6fbc45a2e","affectsGlobalScope":true,"impliedFormat":1},{"version":"a680117f487a4d2f30ea46f1b4b7f58bef1480456e18ba53ee85c2746eeca012","affectsGlobalScope":true,"impliedFormat":1},{"version":"2f11ff796926e0832f9ae148008138ad583bd181899ab7dd768a2666700b1893","affectsGlobalScope":true,"impliedFormat":1},{"version":"4de680d5bb41c17f7f68e0419412ca23c98d5749dcaaea1896172f06435891fc","affectsGlobalScope":true,"impliedFormat":1},{"version":"954296b30da6d508a104a3a0b5d96b76495c709785c1d11610908e63481ee667","affectsGlobalScope":true,"impliedFormat":1},{"version":"ac9538681b19688c8eae65811b329d3744af679e0bdfa5d842d0e32524c73e1c","affectsGlobalScope":true,"impliedFormat":1},{"version":"0a969edff4bd52585473d24995c5ef223f6652d6ef46193309b3921d65dd4376","affectsGlobalScope":true,"impliedFormat":1},{"version":"9e9fbd7030c440b33d021da145d3232984c8bb7916f277e8ffd3dc2e3eae2bdb","affectsGlobalScope":true,"impliedFormat":1},{"version":"811ec78f7fefcabbda4bfa93b3eb67d9ae166ef95f9bff989d964061cbf81a0c","affectsGlobalScope":true,"impliedFormat":1},{"version":"717937616a17072082152a2ef351cb51f98802fb4b2fdabd32399843875974ca","affectsGlobalScope":true,"impliedFormat":1},{"version":"d7e7d9b7b50e5f22c915b525acc5a49a7a6584cf8f62d0569e557c5cfc4b2ac2","affectsGlobalScope":true,"impliedFormat":1},{"version":"71c37f4c9543f31dfced6c7840e068c5a5aacb7b89111a4364b1d5276b852557","affectsGlobalScope":true,"impliedFormat":1},{"version":"576711e016cf4f1804676043e6a0a5414252560eb57de9faceee34d79798c850","affectsGlobalScope":true,"impliedFormat":1},{"version":"89c1b1281ba7b8a96efc676b11b264de7a8374c5ea1e6617f11880a13fc56dc6","affectsGlobalScope":true,"impliedFormat":1},{"version":"74f7fa2d027d5b33eb0471c8e82a6c87216223181ec31247c357a3e8e2fddc5b","affectsGlobalScope":true,"impliedFormat":1},{"version":"d6d7ae4d1f1f3772e2a3cde568ed08991a8ae34a080ff1151af28b7f798e22ca","affectsGlobalScope":true,"impliedFormat":1},{"version":"063600664504610fe3e99b717a1223f8b1900087fab0b4cad1496a114744f8df","affectsGlobalScope":true,"impliedFormat":1},{"version":"934019d7e3c81950f9a8426d093458b65d5aff2c7c1511233c0fd5b941e608ab","affectsGlobalScope":true,"impliedFormat":1},{"version":"52ada8e0b6e0482b728070b7639ee42e83a9b1c22d205992756fe020fd9f4a47","affectsGlobalScope":true,"impliedFormat":1},{"version":"3bdefe1bfd4d6dee0e26f928f93ccc128f1b64d5d501ff4a8cf3c6371200e5e6","affectsGlobalScope":true,"impliedFormat":1},{"version":"59fb2c069260b4ba00b5643b907ef5d5341b167e7d1dbf58dfd895658bda2867","affectsGlobalScope":true,"impliedFormat":1},{"version":"639e512c0dfc3fad96a84caad71b8834d66329a1f28dc95e3946c9b58176c73a","affectsGlobalScope":true,"impliedFormat":1},{"version":"368af93f74c9c932edd84c58883e736c9e3d53cec1fe24c0b0ff451f529ceab1","affectsGlobalScope":true,"impliedFormat":1},{"version":"af3dd424cf267428f30ccfc376f47a2c0114546b55c44d8c0f1d57d841e28d74","affectsGlobalScope":true,"impliedFormat":1},{"version":"995c005ab91a498455ea8dfb63aa9f83fa2ea793c3d8aa344be4a1678d06d399","affectsGlobalScope":true,"impliedFormat":1},{"version":"959d36cddf5e7d572a65045b876f2956c973a586da58e5d26cde519184fd9b8a","affectsGlobalScope":true,"impliedFormat":1},{"version":"965f36eae237dd74e6cca203a43e9ca801ce38824ead814728a2807b1910117d","affectsGlobalScope":true,"impliedFormat":1},{"version":"3925a6c820dcb1a06506c90b1577db1fdbf7705d65b62b99dce4be75c637e26b","affectsGlobalScope":true,"impliedFormat":1},{"version":"0a3d63ef2b853447ec4f749d3f368ce642264246e02911fcb1590d8c161b8005","affectsGlobalScope":true,"impliedFormat":1},{"version":"8cdf8847677ac7d20486e54dd3fcf09eda95812ac8ace44b4418da1bbbab6eb8","affectsGlobalScope":true,"impliedFormat":1},{"version":"8444af78980e3b20b49324f4a16ba35024fef3ee069a0eb67616ea6ca821c47a","affectsGlobalScope":true,"impliedFormat":1},{"version":"3287d9d085fbd618c3971944b65b4be57859f5415f495b33a6adc994edd2f004","affectsGlobalScope":true,"impliedFormat":1},{"version":"b4b67b1a91182421f5df999988c690f14d813b9850b40acd06ed44691f6727ad","affectsGlobalScope":true,"impliedFormat":1},{"version":"8e7f8264d0fb4c5339605a15daadb037bf238c10b654bb3eee14208f860a32ea","affectsGlobalScope":true,"impliedFormat":1},{"version":"782dec38049b92d4e85c1585fbea5474a219c6984a35b004963b00beb1aab538","affectsGlobalScope":true,"impliedFormat":1},{"version":"af54fea444a07250f525124a9e9bbb0311b8833234b92dc88207a267c9174c3a","impliedFormat":1},{"version":"672eb0c04f2d035831081c3eef7bc199aa1fce4cae15113debf12917aa8ebe2a","impliedFormat":1},{"version":"abefae9cb9cd950fe75baaf5954ce9dd3e6616a6d971e01f4f9a3c11e220eb1c","impliedFormat":1},{"version":"f15dc8cc0d4a4f64505b4f2cc43f1814453528d0a614ed80bbebc9b51a23b79b","impliedFormat":1},{"version":"c46f4784e8833977404cef1989aa937639fc549093e4db732b87a740b9998d4c","impliedFormat":1},{"version":"656c4278247750549d5fac1f8bebcfcf65f8a4904deda3824884efa530b0962b","impliedFormat":1},{"version":"086472494de4ea01294376341e08aa955d4b7973d0bdcad2c9cb77f5b1a8b15e","impliedFormat":1},{"version":"69f6f24feccd33e407ca5faffa1c65d6ee6d1d487d1766a4eaaa49a5e6064cd2","impliedFormat":1},{"version":"4c99011f7be36ebd2912f37b8598a321adfb4c35863f6844ab3295fd3da73324","impliedFormat":1},{"version":"679fc9b23de5fe7020d620d9b2b8499dce2bb2222eab2858b37c2c38e4ac8dbe","impliedFormat":1},{"version":"973654ae9b07cd897e3c1b966f12a9b2437c0f4de56813c64a766e4a56a1329d","impliedFormat":1},{"version":"809b4843e55a104d19820f0cc0d403788b5724d13b09007bc1a81cf3e6f33bdb","impliedFormat":1},{"version":"3359039bbfd33bf1db3f5721a7af03900d089c927e81313a54356a74e831de2e","impliedFormat":1},{"version":"cdb8f0b00897e29aca9ae47830d79b5bda1701177d064d37369fadfe1c253662","impliedFormat":1},{"version":"fe38c3e40d41b6fa09614cb65eb9812b13898f247ab9f6442216fa6a317dbb60","impliedFormat":1},{"version":"5a3d25dda2b4c293c0788c3ab771028539a30453bd084e4b1d4654451bedab01","impliedFormat":1},{"version":"d69ef45efbe9d1bd0e569cb1e8363fc16ed76d25d59fc3584f604c49e0cf1e3c","impliedFormat":1},{"version":"fe75a87dd0cc330e1b5de5195c8e56eb328123f7182c7068e705c0b0244d7d67","impliedFormat":1},{"version":"2515ac4e69d70f675144fac98a9d9667f7e67c0456c36ddb65719dd9c494f392","impliedFormat":1},{"version":"2b04c212449bf09dd14df0da4de95fa77c20432e65f6dec64974a7191914f470","impliedFormat":1},{"version":"4fc7773ce32bbc50cd29e9b14cc763df4004a6ec912313fd28a5f5575b57f346","impliedFormat":1},{"version":"1be493f36b8748a42e1fe81a04ec95525f640adcd6b4b33b2e1e7773a6b292d7","impliedFormat":1},{"version":"0ab5373149df757849dd89d59ebf5dae2dd9176f3ebbad2866456cd1a0ff47ae","impliedFormat":1},{"version":"64381622182e767a74c260c084e25b734e4d6cf3ebfaf17e2f33fe953f58abe3","impliedFormat":1},{"version":"66deb486a81927b8cb0f8940d2adbe67734ee98bd110088306c2b928abc0f654","impliedFormat":1},{"version":"72e0252c12ac16b6208a58b7df190bed33251f2383e030a66a0b6d9d4cc36676","impliedFormat":1},{"version":"16afe31febbf4b2d6c6b8a93c1642f7385c0f8f5627204ca6ea6027d83c80fd9","impliedFormat":1},{"version":"b8879611b2934f2f576a337e215a6418daced3e2fe7bb4bfbde9309ee55d0261","impliedFormat":1},{"version":"8e609bb71c20b858c77f0e9f90bb1319db8477b13f9f965f1a1e18524bf50881","impliedFormat":1},{"version":"52584fa1af443a8a66e96a996d2762c5009659c0c5df183ca68005424284b786","impliedFormat":1},{"version":"8e609bb71c20b858c77f0e9f90bb1319db8477b13f9f965f1a1e18524bf50881","impliedFormat":1},{"version":"209978bf556ea2d3c9cc44a15f4e8151ca92153d274e2028fe7fccebe6f96d01","impliedFormat":1},{"version":"bd5a6d45b7f7023db39fc80bfa98d257a9678c53a2d8cb15a0f56b52c5b74536","impliedFormat":1},{"version":"5d05dc0379f75bd2154b159bf190aeea9699cbf04d0caa45fe4b703dc547cb45","impliedFormat":1},{"version":"306de046d9261b72adf846d28f80cd93effb878fc39a585fce85ae80b6cb616d","impliedFormat":1},{"version":"e84cfa8d0ec9d0115836e89451c32e79b7172c4e4e5b55247d5a74e06a507df5","impliedFormat":1},{"version":"cc15e077da1996e5a082dce8d88335c69c7c08bd317539638e23939db508b0c9","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"a60330c289bfe0ae100a07b96f021c9a7ce3550968ac2b355313e9d0a526e128","impliedFormat":1},{"version":"4d1503b6f8d8c1f46505c0982062cd879f809f09d645d140c2e795d97aed60ee","impliedFormat":1},{"version":"492fef9ce53a329140122b0f756019c15bba5eea2eb9ace02caaa6b9c2485ee7","impliedFormat":1},{"version":"77637264a18e9f7d9a66282a42dd150ef00c4eb023a1d9865528a888c50e393b","impliedFormat":1},{"version":"60d769297873b291492477ee0cfb9dc3f189d98917c19b9d48e4e894e60a4c0d","impliedFormat":1},{"version":"0e3ece23d163ea0f65c772daf2876682217c1bf72047e0ec9cf95a968e5de3a9","impliedFormat":1},{"version":"cc1ee0a4e043bd01e43edc6f4a6b319c82facd2c4de71533a3ee65eea9707ae6","impliedFormat":1},{"version":"b6fe5205afcec70fe7aef5d3ebb84c55f6822d9de032a8204b27f6c987f80514","impliedFormat":1},{"version":"6f6a7501b525b4e2d896437d2b839c9648778dffd7a62ee2c601505ddb1ae3e9","impliedFormat":1},{"version":"8aaf2b801d994e25bc7054c76945dd8e409b0cebd69fb8cfa024a25c052502d4","impliedFormat":1},{"version":"4600d5e90e0576af7a3f19a2731d6eb9686d44bc715bd8000a1b5118c3ebb4fd","impliedFormat":1},{"version":"87e5a6a116276291552793888c56b7a208a7407e1357cd69cea46bcf57465783","impliedFormat":1},{"version":"cae13be142514b4b15609a54bc61a602de9a11cb8cf51307af701f40f824a095","impliedFormat":1},{"version":"ff3270277f475f3fd6f94c991d7ed42344b2e93a85ac4edb0001d446f1073bc8","impliedFormat":1},{"version":"23a6ce2b477ad2dc9811b0c492a302ca159b503b3cad6ab3c347ca7714bb56e2","impliedFormat":1},{"version":"269cc67a2b5f733dc94044f91339b70fad93c5be50d0c455f46d933b365b7b54","impliedFormat":1},{"version":"156f2ec427d2049ed1ecbe1fba3c6c138712c32bfdbf6069408e135c10535055","impliedFormat":1},{"version":"4d5497388e898faf21349af64678f47d4c65b0c0bf6231c49c72713ac89ac1a1","impliedFormat":1},{"version":"72eef4603262d90f59054305fe6ab572b6fda9d555fc0f60be30a1858bd31056","impliedFormat":1},{"version":"c39c06b2815e7a3ecfd7df2602acef6331c2175b904da0a7367dd42ac4356b9e","impliedFormat":1},{"version":"d54dec2d3b5bca116f3342e72c443be08e43e2b3c5d50689ccb2c54243c8e646","impliedFormat":1},{"version":"9f5cbf0bdbbeab5c1febc4cbe1cea9803084f98c6f9711bfe256d85a6a4a0ce1","impliedFormat":1},{"version":"bc16777949448b0192b019b2e69c5aa24a0a7fbbd4cb7dfb067f5c68f86e077d","impliedFormat":1},{"version":"836f5032beafd87461705abcf574980978efccd39ccc9718470b0fcf6bd41c81","impliedFormat":1},{"version":"485f7d80b7a1e5750ed036c16e50144e5c4dc937cf94efda00593af4cc36a607","impliedFormat":1},{"version":"f6f14a07b69d5b94bdcfc9cb9041a2403b13624e2c3edf46e8df8c0854f82632","impliedFormat":1},{"version":"7249a43f07d5b54ab70bd7d854f436b4549c5b38fb978f32fbcbfe224c09550e","impliedFormat":1},{"version":"bc3f95cd6034972ce67c9599007abd3519a991744ef3dd43d83fd1abd3278de3","impliedFormat":1},{"version":"6320cad64d7928490356386ec13e57171aa2f0f0452fa275f8d2f88f9644b427","impliedFormat":1},{"version":"383b39bbb99ec603bb72028335c52ef50acc51a3520ec61e92a7ec34e5354c0b","impliedFormat":1},{"version":"3ad8d03c7ffd193cce05052f3c8ddbe8606edbed0478887de216fd2648b82161","impliedFormat":1},{"version":"d847d2299ddb6d347a71ca5be9f2ad289a9f615bfec6f9adbc8cce034d56f023","impliedFormat":1},{"version":"0a52663a4f06079b2e59f487b79ea8a9682a1d863db1b736694aa66ad1745202","impliedFormat":1},{"version":"6c4126aef0cf24be22d1ec70578c9e46f6a4592342e0657be4b02f148deaa76a","impliedFormat":1},{"version":"63aee94ffc7b2951ba04665fba836a2cf7037fd117086df62812f2dee11fa203","impliedFormat":1},{"version":"be284405dd4aa1c4269adc98831ea913b16e5ed516c641f6f1107d62cf0d1bbf","impliedFormat":1},{"version":"788ab7c9d46e3182cf8dbf851b6284d42028204326e41857caeb24db0453ca78","impliedFormat":1},{"version":"7c0c753d56a3a4465592ac749924252bbb02bf7b8f93cbf457c8b6a8b0b25a39","impliedFormat":1},{"version":"2faf21bbe7b311b0d4a8cd363a0ea25c673db2c3fd1312993a234e3b22fe16b7","impliedFormat":1},{"version":"aa66d256a69db2102e4de6a099243e3a40b717e6fe1a7a6931009abab0b9649a","impliedFormat":1},{"version":"52be667a0e9dd9e14ebb181c6c056c7e15035b3a2624f9a1e23700d655a7c59e","impliedFormat":1},{"version":"1d4e504eaf2689a81d25070d365258a0b95fdcc0fdc48ba8b33db205a7a65fee","impliedFormat":1},{"version":"3b30994ea707bdf0202a8e6ba6ac1db24ce7b0a074b3ee3620502423610bd648","impliedFormat":1},{"version":"a1d0b1314d4cb7a00b4311655715c15cde42dd901cec99ca133547c32ad29383","impliedFormat":1},{"version":"1a59653d41ed811bdec5b95e120764102ab66a37681bfe91d9ec8afdccd4d58d","impliedFormat":1},{"version":"b2463b3bf743f65eddcf1223b43222850dc6bd19bae2d646515bc118a455547c","impliedFormat":1},{"version":"7510b4f992c1a8f818771b2700e9486bbe64b29985facffc9d5c547a651938cd","impliedFormat":1},{"version":"5cc4eb38d108a6e3e681d03554863e34b43d0d5d93500137da1cc04ea08371cc","impliedFormat":1},{"version":"8c4150fe3a83da5263bf6a133d5798a367c36c2862cbf4d3bd9fc9f017131322","impliedFormat":1},{"version":"4b21c279fbdb06a195ba969978a550e19ec7ade2d59b7adc8d5a0048ed2210de","impliedFormat":1},{"version":"773c927c92d4b0c1dca0ae01e953663d51b7becc2aa5601de1a2e3302fc7c33a","impliedFormat":1},{"version":"1cc8b43158e8328ced8a86d6d4bed4ed9324280b845c1604984e8df096b2c346","impliedFormat":1},{"version":"9632839474c0f3418cb24c3e351adbd6158f5b2faed8c29495c9b00be657625c","impliedFormat":1},{"version":"0438a4f574a7c23d05ec722c25843f7b35af46164d01b7f05e8353cb45ac3b34","impliedFormat":1},{"version":"c85a748fb864637a7cd16a6f8be9074f322f938482006573f4ca3ae904d9e810","impliedFormat":1},{"version":"1a33bde3171b6a34033749b461c624e8ad893a11ff252c33349a8a802d001613","impliedFormat":1},{"version":"6822969ab4d013996a5b698f862116149b9c9e5c0bc524d903bb800ba1d2a70a","impliedFormat":1},{"version":"c6b50b38da4abca0bc0e105eb3a93552bb38342da6a75d2376507af6b7f23323","impliedFormat":1},{"version":"2de0c2e3313efac1822dbb188d3bbc2d96469cf400e6950633650746e9fc425b","impliedFormat":1},{"version":"10e23b7c8e27721ae48d46a0137c6a963d82a065a0f531bfe5f0a0dea029e2ad","impliedFormat":1},{"version":"df035330c2909b5e5b764abd9521f5415b316533e38fc913089682e92a088df4","impliedFormat":1},{"version":"9512528353b92c0755f84fccf8393193dc13daca994d22c1fc2b47ae3e4683fc","impliedFormat":1},{"version":"b29d0c8deb283e1ebbc0d40bda462fa4cf5784b3da18527125112c77dd6eee24","impliedFormat":1},{"version":"b6917133d29b4024ca2278b4abb260379c2d0f9152ab6fa69b8cd6f8542cbf0f","impliedFormat":1},{"version":"96841521147712557e80d7a3fae3e0474582af902096eb588d6243531987780a","impliedFormat":1},{"version":"969fe328fee2af3f08b9c0ff4138a9554a21e3f471dfa2adefb05a5eb9e70e41","impliedFormat":1},{"version":"703b7e8088741e5372c186594f337fd6aecee1f4ad01c8f0700b60fb3d850916","impliedFormat":1},{"version":"d462d0402fed45970cc2836c9d595a0ffbeb8ab630893a2b95d526394675c7f0","impliedFormat":1},{"version":"0c0f144cb45d46817942df6b217e6acdc6a5665118df3927fbf2aee63967ccc1","impliedFormat":1},{"version":"4658834a8e07b936609d8e3f29d36de5f9b3e1fd4e6e6dcc2f0e76f7cdc40f25","impliedFormat":1},{"version":"0bdd5cc83ac96bc1d94267496e794132b749bde84cd831a5dc1d15f8f72aa995","impliedFormat":1},{"version":"9e6ce92fdcba703d91824d7cc2cde330551b58b947261cbb59cd6ddc852d0017","impliedFormat":1},{"version":"81e00b0e54e4c4e3759d9aa36c46f055391c3b3b3fa055aeae3cde86c6097789","impliedFormat":1},{"version":"db5ff8084fddc7a03a5c8c9501cff3af2e513e868866c87faa244b39f904892b","impliedFormat":1},{"version":"b84541d7b2bc0fa8c6641804322361f869062f6aea0717f6c21484c1b48515da","impliedFormat":1},{"version":"e2393c5d449b40f022104c38353827e1351c003e01dbc621c871a645f93d11d1","impliedFormat":1},{"version":"51c5683c250bb96e6ea9ad870f7756bb060fcb2795071ff05d5eaa81ce216156","impliedFormat":1},{"version":"dc5849164286f7eb2601e11a61120ee2698f468e3ab337f87848cc9a26760e59","impliedFormat":1},{"version":"9ae977ed97b636b5ba5cb1bfff9012ad01825a576d994a3b1816f495a0be44f1","impliedFormat":1},{"version":"7d28e132516e81bc5418a9c79d02c07f98ad5fe140ef89cd7d7c10776a6323f3","impliedFormat":1},{"version":"940f6676e242f7d576f1bcd11dc35819bd64c9b077f73cf182853eb1187dd421","impliedFormat":1},{"version":"37b3de8aa26daf71c738b2304c314d21e9c93c7ba597600bd0c5b3c0a8826ced","impliedFormat":1},{"version":"9def94660a557891e7fc828e03ee9a47eed2e2cedf8db0112a94e022561734b4","impliedFormat":1},{"version":"4f05ba97bdeff9e604d02e367f82c4b6cbf337fb878cca2a7992a195b8791117","impliedFormat":1},{"version":"cc130372500e5646cfd9f9dbf5f6bc71b7e7f97c31b7e4d5bb03c08f52626120","impliedFormat":1},{"version":"26ff8477e1d5ab967ab9f69f3ea4c9062735424435a1a8bb8a87bb3402cb74e8","impliedFormat":1},{"version":"be2185e9412d054a355390d0fe8ee569acb92f0e198cf10bf7abdc9c9897545a","impliedFormat":1},{"version":"1fe977b939cde0005b9018309c9075ce45bdbff188f76b64faeac243ebf74d2d","impliedFormat":1},{"version":"0cd09954d64ff80f38a4309b6a85445506a7df250608a6679814900b4845ca08","impliedFormat":1},{"version":"3f7236b5d7e677871b2d3395de43422f50a6c52169b61cb0ff21df748115631c","impliedFormat":1},{"version":"00f4a69c57c6e9cbea255fc10ab27b11d17fb134af6109d1f9598f8f780f4ea9","impliedFormat":1},{"version":"211554356aa6865cdd1d649266198bc4831613e22de216170596b08e79ffa32c","impliedFormat":1},{"version":"80a54056e6a6658e89f7f22e8f95e70a6345bedb502bea7ea03f2c7774ef68dc","impliedFormat":1},{"version":"31c626a7b05eca93bac6553cdd492b19acc483208cef8c5d47db1bbf7ecbbe41","impliedFormat":1},{"version":"656c8a7dcb62e30a29f3285060f3bc75f729967a2b9941de29717516bd736fa5","impliedFormat":1},{"version":"3dc6826e732b2dd19c627450f60d89e3a24d53303be595baf60f9b54ea9760d4","impliedFormat":1},{"version":"d30bf7244a13abe74b597a5bdf87cf84ac4caf342dcae58fd8277320043c36e1","impliedFormat":1},{"version":"2e42573c27b7db22b55ae6191252c4b1eb07268ea49c605910e39c5c98ba51b7","impliedFormat":1},{"version":"cb60f7780123a5ca283a153e7af53075521c2c0ba84a7240faddad6a548c26f7","impliedFormat":1},{"version":"1295ecbc9956f96b072b89a80779f7f629c55a9825d30b8259e740cdf718d870","impliedFormat":1},{"version":"ea7e0b20e8339cf0ffa60c6a626ad3e04933f6cf5a0418700aae54f683bb09eb","impliedFormat":1},{"version":"47d6bef35b26eee473b72e797f7565f9bd6596da891aed5cdfa9587f77e11ea6","impliedFormat":1},{"version":"f0cb9d8feb289d397583124327fc4f47034539640577cb29240ebe423d56c5f1","impliedFormat":1},{"version":"a27113fa540341f9eefd6af29e78bd9646d40a61033f0ef3bd5cf7533e1c7e4f","impliedFormat":1},{"version":"691d21efb7ee28a70226ac58fb536640286055c8ad5302957249bca514c70283","impliedFormat":1},{"version":"8e2b40e735430bf41cf4d501293a6ed727673a3714cdaf62dcbc73dc34f3a29d","impliedFormat":1},{"version":"f6084d803f87f9a2bfc4a363bb9abfeaff3e153395eb5daf0e571568eeec1f7e","impliedFormat":1},{"version":"def80c286d93139a3aaf2d9c3a32225dc69515025e7f8f8b289990feadc9afe0","impliedFormat":1},{"version":"068034118652838b59cd7f483462915955d8629fda78a3a590fefa27d95d517f","impliedFormat":1},{"version":"67fc0ce5821249cce0dcb9a8ae75aa3de35fde1d6403dba2420029b818aeae39","impliedFormat":1},{"version":"706683c50b28ee2105692ab8629c592aef9a31644ba6d9400c02ea0f8069d96f","impliedFormat":1},{"version":"47769b481ee930008723d5fdebd103765feeeb8fca55d722d4289893fffad1a6","impliedFormat":1},{"version":"ad366288858cb9de4c851f10bc1a10acce64874373f6ce5a152f3a580b735cd0","impliedFormat":1},{"version":"ab1643296b2ec6e2953b020a12d5f8ea4c14c0c98e899475cbcdb2877ebdc668","impliedFormat":1},{"version":"8b5f0c07b0058a67309476c0baacadf01056cd1fb2e42ed1f6895689cbe709ed","impliedFormat":1},{"version":"ca615941093f3a5070616cea7d79ed98521913a2c58eb537f60bd91683b42b64","impliedFormat":1},{"version":"e0fa7d36b5b044bbd48bcd3cf29f2149f6c03e092597d1c89ac99e95585e1297","impliedFormat":1},{"version":"3f7918a2265ab89ed4c52dbf600b2115944c6baafa1ecaa6ad0b66a633380933","impliedFormat":1},{"version":"486183db4c5fc2fa647fbc9bb3f3ba0dc34269df6054039e79fd87528adc05f5","impliedFormat":1},{"version":"bf169657bb35b0b61d6e9903460c603bde894351e1bb3adfc4acab09a1bb0d88","impliedFormat":1},{"version":"5338eecc44897f4d9ec69d6fef2aef2556f17e43a9aec17bfc906968121da934","impliedFormat":1},{"version":"17d7dc5be795bb804fba58b545a61474b3bf5090a6b7533d28b509cc99698e25","impliedFormat":1},{"version":"f9bda0c10f0848bdc296db6fe25ea2583a5db4aa87d6c21beaf0b70b8dddc037","impliedFormat":1},{"version":"11d144f360d84eaeb5f170aed3a6d651a13aa0b983296c948433a65ee1d5bcaf","impliedFormat":1},{"version":"d7233caebc49d18bdd95880ec38586ce9fd535496f544552743349310af3fea9","impliedFormat":1},{"version":"68bdafe0582c2589727722284bda4f9f1de397027d0da8463b395b7a742fe218","impliedFormat":1},{"version":"7a6199f3b9ee93ef07c0325b99b5eec410a35b831dbd31be7d2053d8669c7160","impliedFormat":1},{"version":"e911930faa557a8b526b4d76bb4e8612aa380e4b13b78df929b12e10b8108c8c","impliedFormat":1},{"version":"128dcd816a70f2199bee743ad83b60c4d8b6472e584901e0c96d3a4da64eb7dd","impliedFormat":1},{"version":"c4cf610ab0e35f69172d76cf2cd5a92b6704c40b506106f251fb63dca00657e0","impliedFormat":1},{"version":"2d6b3606a517a5d5ce7d05498cbc523219dc50153d9203117b1da39187c2f1b5","impliedFormat":1},{"version":"1cba61c1f07e5118f0bf710d1c35e4f08be9b13dc7afd417f0b2c5b1c9f5288a","impliedFormat":1},{"version":"0a59f6b03f038499fec016a809f571e1b6cfb5eb89435a35fcd5cc4aefb00d72","impliedFormat":1},{"version":"7fb51013e0e0c90f7b9e4e464d6d5b72eaec69eca48e7d3109af02928bcecf4d","impliedFormat":1},{"version":"2bd72406253296e2ef002d0f91cada25aee3fb936808ba4a77f5978a89fc45c6","impliedFormat":1},{"version":"d0729f91196d8cfd726523c7e791fb085a6766bfedfedba390679e67f6ef767b","impliedFormat":1},{"version":"e61998c3f8135bffb6fc4192874213715f4a38eca6c23c9c51e57dc5245fe26b","impliedFormat":1},{"version":"167791789bc63c2c4f620120664b472595ce9c1f02d2e38833608f1ede25617a","impliedFormat":1},{"version":"3042e22b23b49b93b78f6cff8d6f662783760136f897362c6db5e2410fa8844d","impliedFormat":1},{"version":"a3034fbda5d32a3ad2fc4ac5c7e89d3791c51a3f1929dc4a7b1169e779d8a916","impliedFormat":1},{"version":"6a8091091b67d151042dce29605fb942f26300e2a66cfef98d7780a5276af558","impliedFormat":1},{"version":"6a8091091b67d151042dce29605fb942f26300e2a66cfef98d7780a5276af558","impliedFormat":1},{"version":"8ec13a8b47cea30d46a5c7458f53f1a622c2f8b6fe878224eeed196ea85db6bf","impliedFormat":1},{"version":"0daebf5c64396cec8cb7bdefd08d29f33921d24a01ceace694bcd3bff2ae8e2f","impliedFormat":1},{"version":"0446d75f273f98c675fec48d8f16a3804b067f1413facbadcbc99641b61f274f","impliedFormat":1},{"version":"d6be1adf1b0c7870a650c1c2854fad59f6a50eb7d3142ba68e092d8eebe476b9","impliedFormat":1},{"version":"054edc23e08883b7b7132bfb2b802d5d882b19ff8197d1cc29e4a01a11a86e93","impliedFormat":1},{"version":"c226d4b7d87ccaf88563a833e84af7134b93b9ac5e515660316eb90f834c8e40","impliedFormat":1},{"version":"91e86ef30215239e5388b20167ada9a239ceea298c6daa85c892925f8fd82948","impliedFormat":1},{"version":"51b710760518406bae2265ca4dbdd2c395a7d3e5d9b096ebd1110c736a702696","impliedFormat":1},{"version":"85df835a4393e44e503b1cc3abc698926c6d076a93555f0bd36d1517b42fb3b4","impliedFormat":1},{"version":"3b85b00950feec82097f72038b49667a1a3ace6025234de36150b645bc568f11","impliedFormat":1},{"version":"4afd45a2a1a573ee1294cc8a0e2f4d68d17bbcc2231bb01e7608878595c6429e","impliedFormat":1},{"version":"aaf7fbf7203c9c6bcfbc01fb25f1565c28b0465a66a8061ddf93b4086029a3fb","impliedFormat":1},{"version":"1997b770a871642c245031ff2f0af3e1cd28944fbaf1aa8e72f82d0fa2651db0","impliedFormat":1},{"version":"2b85f6cd53d948505310027eaa9ffdf2af64d6ae1e99cdb90b0e88c21a9cfa0a","impliedFormat":1},{"version":"34c0486fa1e3ceda3576f3420083619a026aefecaaed72684a0934cf0cf5a05d","impliedFormat":1},{"version":"b595b2c1f76038376fc2f005da0e88814ef0a314011094432da5d037d6b6d4b8","impliedFormat":1},{"version":"8eee990b207ab53457ca60008bb2e897152a9884aa4f7958fdadc3648adfaf4e","impliedFormat":1},{"version":"0f7505d53e371e6068a31056b32b1a7c46bd15ec66f57f845d12afdd50432c5d","impliedFormat":1},{"version":"051a79c89189a9f3f6e730fe337d61f115c5842e5899ae719f7a24eea3a6944f","impliedFormat":1},{"version":"0d273fa9018537821015e7f77ed569211cca6909f2602932e42bab05032e07f8","impliedFormat":1},{"version":"15f4f6b14e2e6c97e42431541352247796dd58152ae5618465832f8546f43650","impliedFormat":1},{"version":"d3d5344503d303d0dbbfa0fac32fd92b9cbbb8e11c1562f8037415cd7f952449","impliedFormat":1},{"version":"ee7f099ec8a115d1b59a96e1a579c6a41bfa2cc8d7eae9ee006ba9bb0213e0ad","impliedFormat":1},{"version":"f49637d3fcd68dbd11ad31c9f87f4822d8eb1de37f31661b5fd5a2ecfd48076c","impliedFormat":1},{"version":"8ae48b6bddda413b56d7b0981c0dca980cb60e639e613c3d69e74be1d5f28451","impliedFormat":1},{"version":"d5b6dbabc1b45af73fc24b87e7728c382424cd5cee690338d1652fa820f9101a","impliedFormat":1},{"version":"a87fe20ddcf7d5461d443088979a05eb0dd4752b095dce2ec306fa23ebdf1fd1","impliedFormat":1},{"version":"0f561647cfc7d5bb3025831b740ab5afbc2d19a3e675f973d9286c4e3a2450f2","impliedFormat":1},{"version":"13a89e4c22b970181ee95e3853e9288675e7abc04a3aeca7d1a5fa03938b11fc","impliedFormat":1},{"version":"b1684051ffc5a2fd4af86062c2acb33aeb540c116a44b3fde1d3c4fbd4b7f10d","impliedFormat":1},{"version":"81b3b9d867067a670c718c6bd085d7d50a9807ec54dc09dc77310852cdaacb0d","impliedFormat":1},{"version":"682fd28f8d5351881c47aa6a6edfb7c0fc8aefaaa6091ecc2df1e839fe8e6155","impliedFormat":1},{"version":"b286631b43404a81c52dc253642b6cce6eed32f49ea4fb0300886adf2a0b220f","impliedFormat":1},{"version":"7e080c218834ab3989e619952f55c47bdb60566e1dc3f36628e3a4305bd2a079","impliedFormat":1},{"version":"882e5fe208e9bac7888a8067e1773d671a4f25498e5307767cc119a3a04d3bf6","impliedFormat":1},{"version":"cfb2b9491bff00a446620b0cc2f5664ce578c120b711346127ba9bf5bef7bc44","impliedFormat":1},{"version":"7e9a94c8ea47a266cbb1d930999ad63e2f24d1a11aa5ceaabbafba1fc64b6212","impliedFormat":1},{"version":"35aa8084d8686ebadfaa8676ca472678e595dcfbb831c03273fbb53347efb9d3","impliedFormat":1},{"version":"35aa8084d8686ebadfaa8676ca472678e595dcfbb831c03273fbb53347efb9d3","impliedFormat":1},{"version":"898129a26072b99b4c6da0d5e075c03bea5899c66010b515b857cb33e78d5358","impliedFormat":1},{"version":"c7e44b847475ce8ba831d1e6984d0a511f71f593926c558c8c537b9b57a11d3b","impliedFormat":1},{"version":"2e9ce97f085ea0c0d9a53e29011cbf3a4e469e61144bc5d67124e3464de3f510","impliedFormat":1},{"version":"ee8dbaceda347c31263cdd48a2b3707b0a336c29dd319158c8e1942076631e3d","impliedFormat":1},{"version":"e17e2c9a4b817018ddaf19f3c6eacf745dcfcb18d6f1219267dc6f922d5423fe","impliedFormat":1},{"version":"55d00ed5f38190a6d36f4ae89943b863a35fe5ee802a4c5e561de275b67c79f2","impliedFormat":1},{"version":"fb7478b24a731b80469edee0b62302477bdb9cc7eb6fdda9f9bf41da56f02ec2","impliedFormat":1},{"version":"fe356ac057d3948d929071e3978faf8e348815951db7b9e984452ef61809bfc0","impliedFormat":1},{"version":"eebd154a7ddd9ec41488b8a7572ec4c2f0ae7558eecfea8ac466ccb3d24a1f77","impliedFormat":1},{"version":"ff00e3c0cb4722205e60e3242abcb91497704c7a06affbda1a17c1c7474209c4","impliedFormat":1},{"version":"d68b2e602b9947f46652dcb2016ee54ade0dab50d6f1fc084e613c6d595eeb02","impliedFormat":1},{"version":"e4d6cadac3f042dfd342395a1296f2db56ba4b702a55fb4600139823bc87d7d8","impliedFormat":1},{"version":"01c61b77ad7c1f9132e8aa283fbae8826f72215d7e33dd74c8b9ae418a0245ec","impliedFormat":1},{"version":"58bc0fe7676fdee7143d271896b5817225c271277ed8645b19562ffcb1512dcf","impliedFormat":1},{"version":"7274cbca8cc7009b1423595089b99849a416afc6abbc75bbce6b5dad1f98cac6","impliedFormat":1},{"version":"ff21cfcd3f575f47cfa25887e90f05f866219ad0610ff6c68c5848c0b734fc9c","impliedFormat":1},{"version":"aedc542f12eb7b85b7389d3469681e7be779ce91d799dbf79c67eecf8606eb08","impliedFormat":1},{"version":"48eb7574a7801973395bdb870c0b73695129d90d680c41f23e601d12171d3642","impliedFormat":1},{"version":"fc01f3d2b56e9fa57a153946578e5dd50c42248ebc135fdb44266a4df5526b60","impliedFormat":1},{"version":"dd9f805ee61f75f863bf4e5209b1505b1f7aeae62598ad622e64040dbb3fe799","impliedFormat":1},{"version":"3c6ed33c92799143d2041eaa45365da1fc8c7361e8207e90e06bb893ba8ba7ec","impliedFormat":1},{"version":"858fc911f6656ad82345a9da2078889745738e340244a36b29f434e01a7f4461","impliedFormat":1},{"version":"1b5854c0ed725969561e9ccd34322bfde131d2218a8984341e2165bcc9c8ec0d","impliedFormat":1},{"version":"9d513f2596562c230c3edb62eadd1b4dacbb0e6222206148ab816c8b230490ba","impliedFormat":1},{"version":"4bae8762bea2c7daf042beb1f1d91d9c25ebd8df55a8d8e9edfd87a587d6f454","impliedFormat":1},{"version":"a66e6f39a50288fc504c7a52eade3f38d149d7bc6d2afad06d97a756fe5e0581","impliedFormat":1},{"version":"0ad73fd7caa9ae448a268a9337f4527643e97d2c7ce9c5c855b808aa51f260ad","impliedFormat":1},{"version":"5e51e71427e9a32a7628f3f1fdd6d3e640d213b80474d027e88b8086b8fbbd73","impliedFormat":1},{"version":"593a550d47510fdfeb1eab0b8a6c8868d3b237449d10d9b9869a573fb89c49b4","impliedFormat":1},{"version":"aabb4d3aed5009fcd160d742aa03368b1327c65f79dc746d45b8ae19ac942746","impliedFormat":1},{"version":"399fc22f077ca559625f5de67cf04301cbf935b21cba9e9e3fe384d1020c7b89","impliedFormat":1},{"version":"c57b22467e4337a67aa166295417ff0075b889f8e0844fe23f7f2ca53fae2502","impliedFormat":1},{"version":"58375cf482c9cbe7593020543fda6e324d14f82432f479bf0094b30de194e7fb","impliedFormat":1},{"version":"aaab0d2ec4efc96673cf9575df6db95773c5ad61a79317df7cdfbdc6cf63ade3","impliedFormat":1},{"version":"eaaf12b636e1bf2895f2f306913f98adada87c6360010c13ad92f0752f399af1","impliedFormat":1},{"version":"e7f2c5527f21089858ad7cdea919a99c077e24c3f357b0c95038581b9ac97ab2","impliedFormat":1},{"version":"ebd235e27855d43288000c5cec7d5957ea3f864fcd29d32a9b7738b2a3e56c25","impliedFormat":1},{"version":"9d68fa239d9f1635659007a3ac18ea592e9d8791a2336af01c6a5e62af22c59d","impliedFormat":1},{"version":"1fc6e8a5610edb8248217c2e09cc300308b08493f56f3156378e852a2da9132c","impliedFormat":1},{"version":"4656dd124794224820ee9680a659c426f752ca2d56927aa02bfb910c940306fd","impliedFormat":1},{"version":"84803248c7187e2b8783303fffbf3aae14b10aefdf39d33283f0aebb9193face","impliedFormat":1},{"version":"b0969d9c93bfc3f17daba4fba00ee9d6f7b6f47d9e27f76422d1fdd40dfd5216","impliedFormat":1},{"version":"08ea6d56c93bab8537766e8220bcf2b79791f135637e3ad28bc423628e544c56","impliedFormat":1},{"version":"51c3c244bcf318e8fb0a56f31313232bde2c0d92d005e46f510e37676253c59f","impliedFormat":1},{"version":"b4e133976ecfe0d8550b728ae2562c2b138a7a509986c288f485542445f32845","impliedFormat":1},{"version":"8fb07f8caab08fa364273bc9beaa54de3d2eea090c77bad672be1e38e086b666","impliedFormat":1},{"version":"4d0e042c1269d3d86ddc81a40429d82e11787093f876f3257b1132d1063c8f56","impliedFormat":1},{"version":"03856004d3b260c38db9470f9e1e885edfa4385d038236100e8bf5fa59c80ec4","impliedFormat":1},{"version":"67444cd8443e90c696c9da1145b14f785faaea45299b76cc8e16df18547c7b1e","impliedFormat":1},{"version":"bcb78c397e103dfe4830049485711fbc2c6828eaa3ec47d2134048cbf65fa634","impliedFormat":1},{"version":"0a4f26b123db90656f110f4f5115645e23a118ecd60e7d2fdb595da986b5b29f","impliedFormat":1},{"version":"639f23e0ecf8d1fee40d686f911b4a606e308d64401e715f8ee731790757b94d","impliedFormat":1},{"version":"25b52959e5d5a66de6e680941286148b68ee5c87929c1fa5c268e0efda1cba89","impliedFormat":1},{"version":"a8e53f3db1a1c7b287ba509ec309faea7ecb39a2fa2028b9f073b3685c6c2e19","impliedFormat":1},{"version":"58bfcf2a43bfce9b37de6b9316d5c81f39a6d1a61e93d45d3a4e5c5c3dae547e","impliedFormat":1},{"version":"5172723e406de628f395a6910aeeb899968202b821930453a33f3cfcfd8e7d0d","impliedFormat":1},{"version":"dc57384f48e531b8b623e5f00d98ff744b535cf8339d697302c58b9a1cba0ee6","impliedFormat":1},{"version":"08715d65a1bbec8c55e80721ca48f2e4f95abd16453da486d16e0f3d7eae9ae0","impliedFormat":1},{"version":"dbd787fe4386292c4e18cd1c3b79e23250ebc0d34400edba932cc53f5377df36","impliedFormat":1},{"version":"4106f15b28d8ffeec255ed8d0d4854f29cbc604b3088e38f8fa0ba487cf1cd59","impliedFormat":1},{"version":"b2d7b8af10562ba3704ce566285181ddd2497b677198e95cfae30a38020014c0","impliedFormat":1},{"version":"171378317eccec4804d1654945e95023e1b66897a09df4a5f21f98df5734f70a","impliedFormat":1},{"version":"ad9572e8bdc867e76508294153f233d4c18885813fb6b7c4407d039ac53efd4b","impliedFormat":1},{"version":"55422f043639f5b3853d89229e4867e6594bdcfcf91a8aac53fc4367ad3e49ea","impliedFormat":1},{"version":"bf79a004d59324ebeb88171e63c2e10055e13c3d12de8302487cdf055fe6772d","impliedFormat":1},{"version":"8500c209d68c490200e24f2c43f5de9528161908503ce76b4f8950aad60cd74f","impliedFormat":1},{"version":"2ea9fe2c6e9b28d3635b81d0017de03a7cfa00958a0ebfecd7eb8c43fcd6ab82","impliedFormat":1},{"version":"a3f41e72c336b6afb8036b8d0fdd195d2b7180abec1764da6b8b530bfa720aa2","impliedFormat":1},{"version":"4fbdcdab21f1d98e16e06cfc8b9f08421e6c35ced300735412604fb6ec58389b","impliedFormat":1},{"version":"852d4735be2b9926549163e0c67969eaf11105d680bda5f8d6a2563f69a09fc5","impliedFormat":1},{"version":"9d505c619286624b19cafa2c725daf543036ce76044a431534dbb0e3d8d2f3ac","impliedFormat":1},{"version":"74321a5e14e10f20cbc0d2d842ee309ef77ba89d6096578dd5ed110fc40b0755","impliedFormat":1},{"version":"4b76437f9514c3d6b7355f24529f9b1abda7f3e9f53287441b4ac5cc40edbd78","impliedFormat":1},{"version":"03b0e79693aa98f82e28658eda1b8a44bd603a3ccaf1dc3c0e29adc82c6b45d2","impliedFormat":1},{"version":"6fc7daa8e73c6016cd37306b9aace5a37a924318a4c7c96726c56801242db0cf","impliedFormat":1},{"version":"42be924f363db2ab53397792b81a411edd444a52fb7bd8887ac017ec44eed205","impliedFormat":1},{"version":"3a8b7d79f2b12b72ac7f6470725262c7aeb52a748fb9b39dbddb49c68c1de224","impliedFormat":1},{"version":"65771fbc4768e3bbcd98739838400117594419f16424a9961eb8c7d62eda959c","impliedFormat":1},{"version":"e520c8b1bcffea0f074290bff6b433e1d6012efc30d9fec11301cbd376443d37","impliedFormat":1},{"version":"66dd1eec653379927d500417a0e718a574d949d93b5ecb51bab8e3281732a421","impliedFormat":1},{"version":"aa20f2ef179f962b99e7c9b2146d35300556a6bd18ed09a0903de4d33d4cb73c","impliedFormat":1},{"version":"5a761227cb6575bd5248930c9ec89599b2ec47864ab50808305edff8f25390b4","impliedFormat":1},{"version":"3da6ac205edbf54455098fcb4a4c3384b1f03fa8f8af648050c6e37fc028d510","impliedFormat":1},{"version":"1be7025986d6a9e9a8af8d41e262affd343a983781c61924489fd6e326d2ade8","impliedFormat":1},{"version":"8299e610cad763160d0eb5bb46728ee0cdfc1bdee2ebb9ad6c1507ab93b8547c","impliedFormat":1},{"version":"221f89967aa937d985d66bd5cffd880a4ec97e90f21ee1ebf753480a70b204ef","impliedFormat":1},{"version":"848fdfaf92b3b89252a14dbd4b0d4e2b079c2e180685e67870b43769cecebc16","impliedFormat":1},{"version":"c4959ecc4ddedd0f1ccd8011c3e7a6b5dca03454cc227503fe51220358cccc86","impliedFormat":1},{"version":"5f735ebf023cdb760c5f1478b93750f76924257532da488f2df78c0d92a633c2","impliedFormat":1},{"version":"f24ba7f9321ab398e0f0a9c582a424efdd39aa0123872f1a48e80c2ab17921e1","impliedFormat":1},{"version":"35ec8e15f8d80a363c2122c374d09015bb9690b98165860003dc857952c0a380","impliedFormat":1},{"version":"9f5e60f5582a57f009c739b2277bd1179a04093631ba777a2e86dea00d7f2b24","impliedFormat":1},{"version":"f64d1121fbc9d483c0501ffa65dacfa7836c8e4ff36b7bc2561d148e32aaf87b","impliedFormat":1},{"version":"1f3210663091a7ff61b36ff085051777c3ee0a8d404691def5bd307675db961b","impliedFormat":1},{"version":"38020605f29165126051f811f92e0ca49260403d17524e7bff13eec98a50f62e","impliedFormat":1},{"version":"150d1050ce7d03e5ce5e66fdfa77f30d9e100e5d210fbd8b851489f71c285921","impliedFormat":1},{"version":"f9c57b55cd37c4dccd3dfdd26a3fdc60a5f6707802654222620d349c8199a97c","impliedFormat":1},{"version":"b0d2b2ed83661db886ff126f358055f6535f58bdada03138e1963c668cff8fe1","impliedFormat":1},{"version":"3614a15f606fc1a2be836bef4525880aa0a87d64f279eb1249049e7ba3d1d495","impliedFormat":1},{"version":"de2b8cff91602eb6c5f8b19a06d21269ec02eed536c16b629ab4e8cc6f22721c","impliedFormat":1},{"version":"4dc0a390df3a4e20276aef9815ff9fbeabf56014a10aeb666ce57b54a0741a67","impliedFormat":1},{"version":"5ce20cc6294f0a6a24034530594e9615eff1f52346c602226ba8d5f2721ebfb4","impliedFormat":1},{"version":"c8c7cf472baa8b7040ef6b82fe2e93f5f1f75b694605da33e9c84c9b7127287a","impliedFormat":1},{"version":"8632126f5cecb1f9dc00710b39f24fe72d8d21f7bdea01712156e51cb48c9822","impliedFormat":1},{"version":"223dab76ec19bcb7f69fdb8fccef150934d3b3b3e572ee9a2a4d0f74eef92837","impliedFormat":1},{"version":"5af9c0bde2ea9a630e61ee57295683ec784721f1182ea1ef6ebce1cd1f55669b","impliedFormat":1},{"version":"26f917ce8ef1eb927344bad79c8470b1ba8ba45ca70cc16fa14d1a3111dd40c0","impliedFormat":1},{"version":"49d5e9587b5b2a642d2a7299e8ec5ba1848c499482f0668e997146042f949f46","impliedFormat":1},{"version":"f1578eb0404f12631aa933754bedf272f802bdea2c1790c172e2ec20502d28ea","impliedFormat":1},{"version":"42c9895782a316629c355068475fd5b25d9bb88b943402887bca093c5658e791","impliedFormat":1},{"version":"9fbe0a4272f7a1fb8bf839fde5f986c293022ba04720ad5261533c53e91e9c5d","impliedFormat":1},{"version":"daa6108fb87c99cf7acd6fb558f712a69475aacd6bef528f2981bca9df40c204","impliedFormat":1},{"version":"64d1d7566c9cc30740956d889ce2bb1354205fbb4da9651803cca067f0fa615d","impliedFormat":1},{"version":"94dddc0716447c88b4c9eab13fd6435330f288b60d4807c53adc9a02cefe990b","impliedFormat":1},{"version":"6535ae48d515f9af659485bc8d20936fa7e19fd4cfdae609231304d2d7d66982","impliedFormat":1},{"version":"c85892d1992e42be2f66b9d6d9bd01db35cd39d4c9dfb9128ad382abcb2ed3ed","impliedFormat":1},{"version":"529219942fc351a99e8953b89e33de4473357e931d41a0f2b595c6851212ef6e","impliedFormat":1},{"version":"6144331b924aaf7a7c5fa5b2282370a5e8b2ea17c38858533a3662853d46c4d6","impliedFormat":1},{"version":"c4329a08f2a763ab873748d9d9b2502324a6a7ab93a2c77e0fbbc333bc0603ff","impliedFormat":1},{"version":"8f790cb38e052549c0741c153d382d6516801141cce76c6b5b32a4bb13220d5e","impliedFormat":1},{"version":"f71b6330b9f63482275971efed3980fa43e1a7d6ea97d4a10790c44b8c827ee6","impliedFormat":1},{"version":"134de8b57291b8176ce63a3a71ee46881be70b0403d800a87ad19d2b05fc80fe","impliedFormat":1},{"version":"5e1d6530b65bcbeeb82bad9c759b447795eb01f7b7209cc4e2707b0c7b18df96","impliedFormat":1},{"version":"778fe95ff7a2918ebb8052cecf3e4d676b0b37c379db5bb49051be1cd3abf55a","impliedFormat":1},{"version":"652737b555718998361ee9996eb8fd1260de99951a0ce3217f3e708c4482559b","impliedFormat":1},{"version":"293f4928beac620f2d2b7b62f623b3d97ed27bd9003d843e297ea27aa71219fe","impliedFormat":1},{"version":"9cdb719dce3dd4b9ab239ef59f2b4f8b6127d87d5c849ce21ae3340b03a282e2","impliedFormat":1},{"version":"e7a5a460f5daaf906b674217c08162911e186dc43079a44f2497f5542807ee0f","impliedFormat":1},{"version":"492cc1676919b82b0d540516a6e130e3706ab42184c1f61721041b7200d0535d","impliedFormat":1},{"version":"b5484253815e758bd967a2020e42023fc6c4238c0acfc910f08d9e227e4a0f49","impliedFormat":1},{"version":"59619c4aa059121e703f3c4cc0dbf2b17a917c1657171f76381afcf62d24a660","impliedFormat":1},{"version":"04462c2a410d3cb7450dfe0ae9e6d0c7372b0881423d870d6bf8392a0a8ac482","impliedFormat":1},{"version":"6185794fd7fd54b02db887e4c2af4c1d5582338200ba2dd20296ff08b9a9f75b","impliedFormat":1},{"version":"77291f2944ba49f01bd573610c8fa6c0d9ff72feb60c1b94a7c0797f0ae03ea8","impliedFormat":1},{"version":"3607b5130b3680d240418939e1720fbf8929f9d24b23c17d155783cf4868c04a","impliedFormat":1},{"version":"b78e09061b559e45f952187f58f980b9250155bc91c69d91c9a19eb28a4acf8b","impliedFormat":1},{"version":"fea32ed74dabfb7d3ee8bd577fa2ef7a77701f4cb3a105f877bdfbc4e825528a","impliedFormat":1},{"version":"b3de4f6da4b126595c5b8b28f1c265e0bfa1c3d61c433b696cad7245dcd30626","impliedFormat":1},{"version":"16b84926e013541c226312a21ebe2d3bc045c953160cdbafc099c2b59e7e53e7","impliedFormat":1},{"version":"9a4baee7f3ec2c0192f36415257f81e392173346ba097eca606a6c059c76124b","impliedFormat":1},{"version":"d2c539f57344e4f91ae883411863294076ef6080c44967cd2b18e732bdf62f5e","impliedFormat":1},{"version":"8d21ff86347c44308e364cc4b8c43d8ffc5d1303cf5c66a9606fe5faa2462789","impliedFormat":1},{"version":"240586dff2e429dcae24aa358d792baf3a49038c5989671f86fd25fb2c1730e7","impliedFormat":1},{"version":"22200ae0ec3cb850a7bb084234ae9216f027dd7457cc2fa76abcd47e1a587f07","impliedFormat":1},{"version":"ae75b971aade8834bde2c6962e9422ac4fd0fd0eed8060d9ab7f0a831c4b89e6","impliedFormat":1},{"version":"6c3361846dc786b4a38fe12f13c3ef616ac0df850df61f06d5882e6599d7e525","impliedFormat":1},{"version":"d6dedf3847e7f7c5cc1686be135973b01a9917e71c8f29ddeb40c3a8982e686a","impliedFormat":1},{"version":"a20a7990d7645cc7c9a7cb3e6680d3e891de1cb2ee08db4a75ed4cb31dfe8716","impliedFormat":1},{"version":"1bc7b58ea986c44bfcb1885dd2fb293a6d6c9daf3a8fc88cf3d93530f4435839","impliedFormat":1},{"version":"4858d0fee21411c10f2e8acf49879ebcf8a6151c3ef83b093872ab8771b1a166","impliedFormat":1},{"version":"a0699f3d0f736703c5694225bfab097fa7c2a5306040adfb0ac4b72153316c31","impliedFormat":1},{"version":"73f5e6fc50581b035dea87c214a158f1b4c467a877d5983c8dafa0b39dc1ed88","impliedFormat":1},{"version":"f3bb2501241da3f81299a8023270fe70d434317c93190ce58dedcd585011d7b6","impliedFormat":1},{"version":"d8f8f72817f6d14f321767b7c0cfd063908d033f5aba98accd81e39674b3d34e","impliedFormat":1},{"version":"dab09f26b9515ead1471ed8d48706c71f4b94a347ab0df094d7d6e114f080be1","impliedFormat":1},{"version":"d4970b99b196dacdbb6cf882ed4dc092a77a87d0bdeef2e94ce10c2f926f71e9","impliedFormat":1},{"version":"b5bd33c1402b8805745f6ddbf82f080164746f46bf2b3a7212e04988f27be0fd","impliedFormat":1},{"version":"911ff3e6717119e6b126c77fd8b183b05a72daa99dbc6862c8a802ee2d86a770","impliedFormat":1},{"version":"39e367275f354d25ade3faeb75bcdc2b633e40493aaf9932040bb58e4b146483","impliedFormat":1},{"version":"ed5e78f7b3d454ece166c3dd89abe7072c825b546dbc43212b8913cbba064fb6","impliedFormat":1},{"version":"5b32b7a24fdbbf9acde3cefeecd4fde84e5f7679970bce286236abe25b0bf1b2","impliedFormat":1},{"version":"7bc7cddd36d987ed8a85ca35f882b7d8146cb4f770becea6e44f00744b8d3996","impliedFormat":1},{"version":"c79ef459f1b2935b84fd54f898bda91128e0a9241620b5260b3d1c3adfdc1647","impliedFormat":1},{"version":"d3c457736bf498ce6dc31b49ff76e24f365e438bc3998ca238be07ce11d8b293","impliedFormat":1},{"version":"3f363251712df1c56805808602e9e6d9d1ca9bcfcf3be51061d542687b04ea3d","impliedFormat":1},{"version":"947e481bbe5924baa4ae077fa05a9cc58c14f6ba7d96326a8c5edf513c4281a0","impliedFormat":1},{"version":"a3700b24739fb0a536778c9f7081a8e229a10bb56da1c89d632152f1bc81a4b3","impliedFormat":1},{"version":"69259e94936c427d50882e8a2419954ff7ac9c6ef738cf25444af41aa15893c2","impliedFormat":1},{"version":"d3bd8bf134732b1fe798cad5af003c30a221e16e444ed5a25e48406f7a86e3e1","impliedFormat":1},{"version":"e1621ab582345e6514aeace3a47f99e0a1a2cbbd3775cd030dc199992c7c8ff8","impliedFormat":1},{"version":"0e9f7df381042f17e1c9810db45ca5e6d4719bbb8b333f61279120c6a2403db9","impliedFormat":1},{"version":"2c3afc79c0fab9e93a9f63fb71c13e55efe95159b370f4191d9aa909c5b16ddb","impliedFormat":1},{"version":"4eae0466634576b00aae6c48a094a949b313d8786d19a24b2e3b9d65d88bfc31","impliedFormat":1},{"version":"4f74d2ba252fe163b606e26777a84caf052b8a12048432544ee4b0f2933321c7","impliedFormat":1},{"version":"715af4b85aaa4a96e53ef0703bca45380aedee22b56dcc6bd1c70803851c6942","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"e6b02d019b971b5f6f2c4fa3200ea6b295f3d417070e308add0597e435563b22","impliedFormat":1},{"version":"7741c4654c59d3fa30ba5dcc3e03bc81e16c7e3945421084d1918823c0e3201d","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"45ade3ef3a2777dc2d33a8b4454041520eb1d6dd712a7f6af747734c1b4fad3d","impliedFormat":1},{"version":"67a3d54c7caf82be119c48f1a8f3d053e4a7331fcf6b2b2d28fa436ec5c14f04","impliedFormat":1},{"version":"749b02932a2744eb2c72f768fff17a9221dfaa264a37befca1e2d219ca64c019","impliedFormat":1},{"version":"86d4481746afcbde19e5cc1d8a909ab7b00e670955d26648bf04442e59531646","impliedFormat":1},{"version":"9653c56122845eaa470dca5537ba9c21743a1d5c126ceaf87b7b87cd80575021","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855","impliedFormat":1},{"version":"e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855","impliedFormat":1},{"version":"505a1d27852a529b708895bb28e60a1da533aceecbdd9b0e2562c213cbb95f05","impliedFormat":1},{"version":"f4857553b1c5b4a0a75ce8524f88420997dbc9545c9e8f73444732421d425251","impliedFormat":1},{"version":"3d6ef778cb2b2484a152f5f815834bd6a6b2f0ec633e7c2ec8b1e1693732563a","impliedFormat":1},{"version":"4a5e71e886ee2a2e0f3135aafbd51321a3039671747f8b06ee7e36c56e500449","impliedFormat":1},{"version":"43fb3be0ea94c6968789222f818303e7589cd31a47b8d087a7fd6cb9ab891620","impliedFormat":1},{"version":"e9dcde11aa468096e07ac1d8720f810f3aab31d42e86301435cdbdea6fbaef56","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"d2596bd7802956a442cf9ee0a86f04bb27a6c2bd967dbc38d65f5317c25e6db3","impliedFormat":1},{"version":"c2e2021342c1931871a179775967e2b21f0ed6ee80b149b6db3b31c02551e73c","impliedFormat":1},{"version":"e09d7ecee24d3e78d0f1f00b7d579e05802f453b2bb0dd6306fb6e548a62bb26","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"c29278ff3de6d528842e98e7ca753d777f77e431ec82ccab3796dacbb02c78ef","impliedFormat":1},{"version":"4253546edfbbf7266ed48f65125f32ea27637c75aa9d0ce9609c7b21330c0ca6","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"8cec6762e1c6afe79fda8d546127021b63fe2785a52fb71bd6735bf05836930c","impliedFormat":1},{"version":"80d994cca0d7b41685cf53b2e3e957b06df6a2bac99021ac0958f9524dac9285","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"c4cd0f5d6e2b466518dea952c186741f82f2d0405d810504b9e093a32ea3976c","impliedFormat":1},{"version":"d159d545db3bd448a631c4c01b3e58a5626e3661c6a1d80dd0102c662f015060","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"ec97d5cf6f937874802eab79dd6101c1b3859c8e93ef2ee3a6f85bec4e17a7a5","impliedFormat":1},{"version":"322f759a098f075c21533b14ef6466bf8c1fccb8e4d01306575284d3969359ad","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"0d234202c158899f9f29f549b876275fab357cca38aa64b9ca71e72b07b3c498","impliedFormat":1},{"version":"f0f62c45d87b705d343478691111c56b0ad3db0f1c518bd3f87115a9664b5e00","impliedFormat":1},{"version":"c9e67c6549e0ec0a2b2e0ea0953ede33033d96c3fba876162986b9d6715a2256","impliedFormat":1},{"version":"3ceab3125445207307b475c59b6da28df7fa1682ab7492df6627c08640701ccf","impliedFormat":1},{"version":"c13bfe8e45b53b262302217a4bed6f2d794cbbed340dd598a6bda39f4fb2c5f2","impliedFormat":1},{"version":"1904ce53f4f656d054b807862c16ec19d36d02087231f5d1e05163f6e8d92275","impliedFormat":1},{"version":"01dcbc4a53a8ada9b8c697e7f901b48f8a9b50303088901639d9f56ece286c28","impliedFormat":1},{"version":"1b975ca054727c79b40086198d3870e92336ef86e467e27815c42e35712b5226","impliedFormat":1},{"version":"7297748ee3c761a3be14c325ccd15d36d34154441d96e5a30b2a6b08f56e81ab","impliedFormat":1},{"version":"91401bca59947c0c36e315dd0ab3e101e989b4242f04ebb661b4d903ef46b6b1","impliedFormat":1},{"version":"ff2bde987913e9ed6b1f40db899b34442d1843920d44e1f9e0bb4887e9cfd719","impliedFormat":1},{"version":"5948c9a5fb1e760ea0990ca8a6cc9ab552fb8c11540d6acb94af4e7a4189fb72","impliedFormat":1},{"version":"c533c2af2fc535683ff07c086f7793a2190089a56db4ebe2e23a731c3940e637","impliedFormat":1},{"version":"607df8de755f2a5bfe09e28da0a6523a745a1b811e3d9314662562a95d60b493","impliedFormat":1},{"version":"0f119c8d721e1d233deb0c838cf69e9b3a486b3f6fb377d0b0762e8c325786cd","impliedFormat":1},{"version":"b7264cab82c03bbedae2bc919aba13b14d7fc001752933c323839e27d3d48ae5","impliedFormat":1},{"version":"8f73278ad6f3d26ff7c26587ec7f022f6b030dca216b15c3b7165ac46a800bcc","impliedFormat":1},{"version":"293bb871b6f3ae97edfc9bcd19afcfae199acdd425a4201c585d2b583d846c91","impliedFormat":1},{"version":"fd875c822e1fabcc24b09409ff791b71c7bab8cdeda81283eeefd0b2059560b8","impliedFormat":1},{"version":"266fff8f4d1c0c7991b5c07f0f3de00fd237ef0755680edbecb2a19479e43854","impliedFormat":1},{"version":"a3b3064ca9623706b9b61d48d07caa6f1fd174a99d81d3a6bced57b616336ad8","impliedFormat":1},{"version":"69e145ad0220568221d9b5919ca9a714c48adf6334f4897f90fdc067d6ae6366","impliedFormat":1},{"version":"7e5b16b71492f4c954bca1bcda18235ae45bf5e00e24baaf23321f2bef5c1f43","impliedFormat":1},{"version":"c52f5ba85b870e77603ec9b05d9ac4cabe2507c1d5cd56333eeea8da2ad4bbb9","impliedFormat":1},{"version":"a2c42e8a78560f1775cfd6243e235d174548bb765ff01c409ecf08935b8291ab","impliedFormat":1},{"version":"30eafc222cb1be20e2018a3ec9e9f7b86dd0582d479d10393066384f459105ba","impliedFormat":1},{"version":"562f233a8439152fea311608854bfdb12e2298618e142becb5943ff3c5a53e1f","impliedFormat":1},{"version":"b7a8a3fcd802743bf5fed77e2205ae9d90cdbeeaaca74572d6854c09ae9122d4","impliedFormat":1},{"version":"f57bf3952ff83c9504400c6d3fc489e8d1c901cffd748f38122aa7ea17e8bbcd","impliedFormat":1},{"version":"e11960252208bec04dfe5df44dec62fdbb26550b7e3dde30aa7d08b85ef1c09a","impliedFormat":1},{"version":"313bcb77427c62302b8c8d816a0f16711d2455e00847c7d4e15b50a46d5fdf25","impliedFormat":1},{"version":"b5082e4b7e4ba8694d6f0d14774a4ed2bbd84e28aea996c7252d53933226fb60","impliedFormat":1},{"version":"f58f26262c9c31ef1113587f5c309f2d333277ff5bb3b81c6d92c25f91060d96","impliedFormat":1},{"version":"6da8bfddd1265e06c85ffd9da04a5edceeda61f5fe7173e436ba65bbbda843b8","impliedFormat":1},{"version":"df242ac4f7ac1e2f045091df1e15d6d1a762911b230981089bd5f6faae9365ee","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"9c5207aceb3396583587cb366149ed6d2bfb79c02cd5677a802ae9e490582d4b","impliedFormat":1},{"version":"93945903af779f9abb29e47eb2c0715c4df76ff99ac6e94a88538b59cddf8bb8","impliedFormat":1},{"version":"4295e0b6f941389ad003b5230b2b890cf0a4395384fbdae0acba1bec1177d399","impliedFormat":1},{"version":"115e715b4402b4baf235ba49074ad2dfcfa84deaa0968ecea3d27f59273d72d0","impliedFormat":1},{"version":"fd40719172892892bd8e8ce85487a696d2f3e3e9950133cfed64b3fc4f4426ef","impliedFormat":1},{"version":"e42223c1bec4b38c12e430dcb1c2f2411156eb1ff9898ce247893cd6b669270e","impliedFormat":1},{"version":"b0e3a62f01da0bd14d3d2add62609415d75f93559bc361e16c53f0229a697c91","impliedFormat":1},{"version":"27b789b41d235218eff4d713302656bd0e4a7042f06a15d167214ca8a7b2cb71","impliedFormat":1},{"version":"01c6f485bd3284b77d83aedb512f9a6114d0733258871d5499831e4e3fdd1bc5","impliedFormat":1},{"version":"26f7da3264f3bce0dfaa7dab6b5ce61a9e6f1e61aa1722f0dbfcecd19e96f47e","impliedFormat":1},{"version":"8b094ecd037106df65ad2920c7dc32476abca48e8d9a84cbaeb00d4c6ba9e726","impliedFormat":1},{"version":"a039ce3ad8a44a82b269d498f7f38afbcc62b8bcada926f97674a96a0dd9acd8","impliedFormat":1},{"version":"8d74deb16be8d262622627038ac6ae0d16d923899bc882640fa672e2efbbc210","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"a291faa9523279b93096a6147323b50c3bedd8d6bdcfeac42b7e16666e412774","impliedFormat":1},{"version":"a39ed7d62f13b71055a802cda1d00623cd858dbda782be3d5134377ef2383fb0","impliedFormat":1},{"version":"4800238fe9028b946a021695e11975dc1beeab686d547346a380486c9c99c80d","impliedFormat":1},{"version":"6d23d54eece68bc6937367aa0411d97a106d6a532069c9253c6eee9d6af06ee2","impliedFormat":1},{"version":"7ea2fa9bbd66e6e3db5df31b00b5f1d4e862526d87d4301d76fdb621f9ac89ab","impliedFormat":1},{"version":"2cbf530ff26c8d64eb690699d9b0c3cd16bd6c8e4bc58bc4c3fec0e6675e4fbb","impliedFormat":1},{"version":"c9621f12275486b09cc26ce2a9eaefc83b5e723ec37294466e8b3e9e67abc5a9","impliedFormat":1},{"version":"9d8847907c8c26e0667d22a56f661bf522aef5f66e26651296e429cb52b6b04f","impliedFormat":1},{"version":"f92a65dad333782fcf914da859a75f5d58ee4aa0cd142fbf3cbccb8dc88f2510","impliedFormat":1},{"version":"8faae3547cac2e0846a3bb3e97b3a207088623fc6233dded827945ae3cc761e6","impliedFormat":1},{"version":"9e22ba105bd5e1b1ed90fdbc9e450f075213d27c1efbc86df2beb11ad86af46b","impliedFormat":1},{"version":"1ac39b156cf493acb0eb6f2bcbda9a81ee2dd2a294e603f2e0eaf9767234603a","impliedFormat":1},{"version":"42fcb082fe06aaaa6687123691aa797b59788a32970d0a9527f59bb48a52948e","impliedFormat":1},{"version":"290df2b5f6f7ba97fee0884d335322687c9fbe588f1f17e0d867a0e4588a0a57","impliedFormat":1},{"version":"2ca406495a701232d81d75c3ccdfe837513b6d7ced06178ddbf2edb392ca47dc","impliedFormat":1},{"version":"8acf73b6be57db3fe3c4b2eb69ca2f23364065df287053b88d94fc7ac9da07f1","impliedFormat":1},{"version":"18b4d9588b761e4ee87b3316cccf7b6e455dacce71958b7fccd03c1a227b0170","impliedFormat":1},{"version":"d4d69fd65d7186eb1dfab301cb8f792c417afeed891342294b194e92df2b8d50","impliedFormat":1},{"version":"466050e85fd8a8735d8fd5c9a6d2e4eced0236e105a1a6d9054325a41f5b23d9","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"7064cccfe1f79c0e1c5e1650ebceb42ef910f399db07f236f87d25b4e9925100","impliedFormat":1},{"version":"a187ae23121f341964a2a5f96dbffd9923a5aa93c7dc6a2b4f10fb7af2948a66","impliedFormat":1},{"version":"1bfcd69084f00053f645cc58963bd30e97cf918a53ad640accbb34fe1979e46b","impliedFormat":1},{"version":"a4136789d2a7f404763b583eb9faee059b3e875e4d0ba3b0d640e3bd98f7615c","impliedFormat":1},{"version":"daab517bb01ded9ca5bc93fd1acab0f306f6f00fda61d6072ad72c56fd47c07f","impliedFormat":1},{"version":"571817450bdcfea8095afa69f93de12e5829b553ab3b04ef8fe715e0cfbf7ba6","impliedFormat":1},{"version":"e98bcfa2c00d5aaace6f6bddc5af0e666fe160442ebcc11eec2c0697a67f6d55","impliedFormat":1},{"version":"579effe29c0731d845a692760b3c50f20cb3f97fed0859ff1882eac091cb4fd6","impliedFormat":1},{"version":"10686d57ca8c5ac17e14c1d626da0f81510c283d37ce100e9c1063f18108c7fa","impliedFormat":1},{"version":"8b024c5bf5d2280cc893ac4acfb9523f44f45fb3d7707608db93a0933c9858fe","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"54747520d76999f7bb49335a2eaf8ff09d898419ea5814a47752b4e0713631bd","impliedFormat":1},{"version":"431841f1f08a640cc0568f82c399913fbda3d884aa86c0a406ea9c71af6ca0f9","impliedFormat":1},{"version":"4b5c407da663061507ad3d0938a7eb873627a21be04605d9f10519f0e1d13e17","impliedFormat":1},{"version":"11a886e483e29575ba6121eb151a69ead4aa2a82bb8f2c78d04706f313549810","impliedFormat":1},{"version":"951f6e866787a254c4d6648b6f85fbd359d63fd50676466f2b9b62d592f7967a","impliedFormat":1},{"version":"f13c65d627ea698256d4dc86f5777c7a601b964678b129c0270ac9c41f7532c0","impliedFormat":1},{"version":"aef183e1697166b657a8323d1bf1969db8a3b8a85f70523c49f0b95d4b4d900d","impliedFormat":1},{"version":"490b92e7184697038a4e21a814744c5b76ab3530fe22de6ab67e381ffccf7396","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"d6385ee72dd691c7c512a69e0e7c2fb14330ebc0c3d720efd72aed86c8b0679b","impliedFormat":1},{"version":"57bf291cb5d2891255f248ef0705eb728c5ef6376cbc0837c2a8ae05fb043cdd","impliedFormat":1},{"version":"eec67f9ae1594cdad353deb02282fa43d61e5c85c76844934385ab8386b4e668","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"7ca6e8d47e3b5ebc7bc6c171c5d078d4e6c7760fe44eadc63001c6c3b1bfcfde","impliedFormat":1},{"version":"8b5f46aa0d289867b76064db0d47126f7a557e35ac99cc896e8269882da851d1","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"e607072ddf5dc478607a79f7a2642c41b49a49b6222325292473baa26a88337a","impliedFormat":1},{"version":"4033398f1d23e6527adbddf4f49337e639231541e26584dfa70ef294fed8e811","impliedFormat":1},{"version":"aa06aa751426c05bd42b6605f630b171280c166d3d575725b24acee5ee3a84dc","impliedFormat":1},{"version":"17eeed2539cedadc92dd3eb8f0972f421b06b748e1a850ef7d281aa279b130e8","impliedFormat":1},{"version":"2a0f82391acc44d414ffc02464c05ae0cb03f8485fe1e51e507190a26f83186a","impliedFormat":1},{"version":"7abcdd756241d799f93c122330a152e03904667aeb68885479099dbb75c2bc99","impliedFormat":1},{"version":"e0cc6032497579e47f8b408cb0d666b694a2058d2736b2e8e78eb86cfefa19b3","impliedFormat":1},{"version":"7d5228bcc11214d73fda068147a020fdf2d95b896c05f158a2febd9839e6d88f","impliedFormat":1},{"version":"996164c4cc6e9080cd8bfb0a64812284fb2c1e7233f33476383cd6935ef9cb92","impliedFormat":1},{"version":"874d1eca4b87921040ee65aca5af14d9254dc289fe1c2121395627c01fda9140","impliedFormat":1},{"version":"c5403dc6d9b5d512aa7c46e6684ee7adee1e0565544b043961fcb6737656c60a","impliedFormat":1},{"version":"96e3f36133ff534b473f878d24552438f674b193ed5af22d0eabc542a8b1e831","impliedFormat":1},{"version":"222c8f7fc03b4c25805ead5df02d60a99712e02f22d06b82fd98a72909c081ba","impliedFormat":1},{"version":"6d8b93bdcc1cf2cd78001008dcb2b606d2399bf6443cffd1e1c501daaf8783df","impliedFormat":1},{"version":"5ab74c8eb89258bc6a11482a189ef8cd7175c6670e86c4fb15880009843445c0","impliedFormat":1},{"version":"4f843f57a4641c1bc3fb78595a3089c3b0b6209a08246f56b91688d40472c8b9","impliedFormat":1},{"version":"cb2a667fae057b3e9ed52a4b91f84efa717b26fe9274efca882fe1deaeefdbd3","impliedFormat":1},{"version":"7756a498f74667af2759badb322aeff5c6764d3c41a8c3a5bb39db9af23ec50a","impliedFormat":1},{"version":"60b9e6c4199dfc9cee20640dfa8f7ea6e5caa872ab7798808b84213bc3678ef7","impliedFormat":1},{"version":"46329954cad21f759ded22ff3562f45de9c4f107a61598588c94bfeb588c90aa","impliedFormat":1},{"version":"9efb053d54360bdd6defb0829b31eb5891b57b8fce53ab8a27b4556fa8844983","impliedFormat":1},{"version":"6dbdca901d7883706729d287cf61f0f6de303c74de09b27f203f7b7b7197c246","impliedFormat":1},{"version":"c1aba2fd5388356a3196e02a6d01f294302f23d810227dfe145a886f13b5644b","impliedFormat":1},{"version":"774699a67c03827f65aaf777bde7e3137d3c3641ace32f3691fe07afc2bd8e36","impliedFormat":1},{"version":"c91b3ee2501181530ff99e7602281611ef17f4a431ca93f2d4a887ce602c8342","impliedFormat":1},{"version":"17f867026e4993bbba2f950511accf766409ab910ba9b1e672729b581dac71cd","impliedFormat":1},{"version":"5211241a693c2b5fe7b048fc023b54584e52df20630a2e031648d5f08043f903","impliedFormat":1},{"version":"287ec0d0e80881f1b6c300b0910e9424ed21c3f38d06627fe1b6e525eb2d5684","impliedFormat":1},{"version":"e6493924ea67c128a8de48449b19ef09608fa743ddd2fd5ac48ea35bf3e0385d","impliedFormat":1},{"version":"351ef901a141875d118927f74ccad336508432e4a485a34668d451f1d585d1c2","impliedFormat":1},{"version":"56365552581c698ed550c94e48da5acb5540d73f02899b55293891d75c6fd16b","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"7d334a8a215ddcddf831abad41d7605cd98d0a1d9f1c90642dca83743144c80f","impliedFormat":1},{"version":"77c24a035eea2c062f36dd841b3e34c3e04579fb16c8fb9b2e3423f4b1428899","impliedFormat":1},{"version":"ddf449e380a23fc0251067b7b6462e83dbe361f4e4acfc92db228b4ef536c235","impliedFormat":1},{"version":"af6d0ad161d5c07a33167b7617294fb394e31ad3565a05c0c31f471aba12bcb3","impliedFormat":1},{"version":"e8959b3707bddec1245cbfd1e410e7466a4c651fe657758dd638a8f989dbb892","impliedFormat":1},{"version":"c3a1cc26110f643b1b049826cc51f1334d271b0cbdff643cdb91f711bdd9a7db","impliedFormat":1},{"version":"5160525b9e9c1ad98725409c0f32928f6d8148643d99190d3599449f4bc15275","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"813b5e35473548f4a903a105c94d2d27d443491455b02c22ec1c260a7f93f41d","impliedFormat":1},{"version":"7782363189bca5d4b41c7419600f932a00fe9c09483734a3ec1a3d397bfe8cbc","impliedFormat":1},{"version":"a0472801d18117f19937c97a96a584f57faf1b4cdaeaa5c14a6bf68359783a0a","impliedFormat":1},{"version":"1d3e033a732a3fac5d7901f08d9c672efefe718b17c092a51a3f5379dc51f515","impliedFormat":1},{"version":"a64e7997fc919fcbc808bc4fd62fad43baf2cd0bed84c3f5c62bf4e92b0c01cf","impliedFormat":1},{"version":"8f44f477a7c214312755f69e77bee79099caf21c1ef438aa16eb0c929ecb95ef","impliedFormat":1},{"version":"b1c6ef0bf4d44408a5a7a38eb7f9c7c2cc2372c5badfe5363700bb049414d2c8","impliedFormat":1},{"version":"626f62a1b6217a7ef12173e6951e53dcd9ba367eec34ed358f986bf911a5f606","impliedFormat":1},{"version":"6ebadc50519a19088c3b5b0e61f69891b3cd90908af933d4071b789b6807a829","impliedFormat":1},{"version":"26f6f3947f496d857b90e1234bfc7989b463d598aba8439f9af03c239a86ee17","impliedFormat":1},{"version":"77cadfd6726a030b981fe1b0203d7edc6f2b3c9026e6d043fedcb3fb530a0a9d","impliedFormat":1},{"version":"86467bc5744aeab0ef34e8d41dec4f2a9fc6147c88d595d72b7610a62a890e75","impliedFormat":1},{"version":"7aa3e6344ee18a0793cb5f1491f553d18adb200fcf415f93e17e464887da7e36","impliedFormat":1},{"version":"b822f86a3a203daa04d6642b38cd0d0cf7b7b050cb427cdf24725f5f79e06fbd","impliedFormat":1},{"version":"0a4068d267d815e763f1fdb391e3990eb488328345c45b0b61b7d27f5205f58b","impliedFormat":1},{"version":"e8096d51345894e59f19f7136087b0960be7ee1af83cfbbdaabd17453c0d7ab1","impliedFormat":1},{"version":"84a8170462f9dd741a75db9e2948e0af3aa65827d981ecb05b672d4b7f1201ed","impliedFormat":1},{"version":"7fc3584c82cd8405a8a606009d575fa02073426b5bc1df9758f52254c167750c","impliedFormat":1},{"version":"f3a25e63826e4abfb5d62a913b6412716ff3e1514706fd88e474b8f042fc3607","impliedFormat":1},{"version":"f2311e52026e0c500a271a0df2b24f65096115514b580bdb80e7c146772c6ce9","impliedFormat":1},{"version":"71ae891565a52f8922ea4b3f4408c5b1bcd5f34992d39919d5adb536d8595ecb","impliedFormat":1},{"version":"8bf69dcd3d8f17424035f01df6128cbd8100fd2363990d47de53b57eb9fd02bc","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"6d1a67ac5c2c19cff4d2dba21aa2e901dd6ea825dec7e83bd7ee27cb755ccff8","impliedFormat":1},{"version":"7811aae5c04b7a1e6f3632545ebee7e1b63a007b6be8de3a9f58c7395d93b359","impliedFormat":1},{"version":"d3e1c12126c9a8d8a48a6d35c94005a7621b49b12a9c15449b65121112440215","impliedFormat":1},{"version":"72ccaa15fbb0276ca0cf6d9b626371fab150028234c93f93d1dcd5dfcb0dd586","impliedFormat":1},{"version":"a01d5d71abf6714ae21c3ad2caa8abaaaa5e2c12da69cbe1f4e50c7aaa6498a8","impliedFormat":1},{"version":"630a1c3505d601a85a955cb54f9e2d81efff6becba7be92e3c8ea394018c836a","impliedFormat":1},{"version":"c056a81be3992c0aa13e811717f1be18f33d3d2e92759638fa1c300003fb5382","impliedFormat":1},{"version":"c150bd0019326cf9c57e8c424bba1a1fac161d543a5d86296849b86be8735683","impliedFormat":1},{"version":"84e16e0da13ad7a7909179cfeae8e02ea2484c4647a69578c295573e53993201","impliedFormat":1},{"version":"48c1c0e3f38c2a86a30ec19dfba81cbd5116caa4fcc96408c53756b14532d88c","impliedFormat":1},{"version":"689863959caaf59f986598442294382ebaf5eb2afa474926d0d317e9a2c66291","impliedFormat":1},{"version":"d2b0ecf28be44f69cb8e1cc6351cfca5e88a03152d88413a88cc27c154691df9","impliedFormat":1},{"version":"3bbcc3989815c498db581e22d97f7ec80b3063f8a65e96f59bc29c03fd664b47","impliedFormat":1},{"version":"42edee829ff3a7178a12804ea425b57755674f2e2709a23a57d23f07c25bb1ab","impliedFormat":1},{"version":"ac1fe2a568c91057f7441a547519b53a99bd1952005e1bf674c6a4a14af2bb51","impliedFormat":1},{"version":"0afe1d2b1e60299646a42d7081cb16a183b71850f7c1e6effdee6763f5e4b11c","impliedFormat":1},{"version":"7f0f07252326cfb756b5276ab44dc8b3b7459a96ac1172269f6e26c9f29b6aec","impliedFormat":1},{"version":"492cc0df4426235257660e16ef004931f019c8c6db389a146965e5a879fc58c8","impliedFormat":1},{"version":"3cc6fe470e3979eceec8ba70ada5ae8963019fc550ccd8386ba3614937232672","impliedFormat":1},{"version":"1c7d14c624cc86aefce45e8019ddb70d82d45f076da323e80c3b38c1c0baecf7","impliedFormat":1},{"version":"96abb2271c58f26cf3f03b4ab6092b0b1e658e783b467b081c5b6b42f72cf515","impliedFormat":1},{"version":"2feee3d627a9c71e017297d07a58d5fed4c22c5a0b3e7ee624b3fe872ab75b8f","impliedFormat":1},{"version":"7d74b1894b1892658c39310621c26c8ac68a181aa54a4a15e7bbd168eafc8e06","impliedFormat":1},{"version":"32d4b16ab60e6c853d7f8c337c49f7c0008f06e4faf5281c72e4ab29926d83e6","impliedFormat":1},{"version":"234e265c0325244061394cd23a3380e63cc31e37dad54fd072b87cbb01dd5f0e","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"067503616bc5bd4bd046d26bbcebc97193833b93fbbd38a8c605dba9431642db","impliedFormat":1},{"version":"cfff5a773371693a6d8c5f2e7ac31d2eb87f9648422b5ea897a3f95a923043b0","impliedFormat":1},{"version":"24473b99a5596002e5bbd148cdd4dfd9390a1cb9be7878698240adde922a5779","impliedFormat":1},{"version":"2b12b2d8da470cbab53f003763be70026cd98ab7d0624490090da72cf5e87a0a","impliedFormat":1},{"version":"eb773cc70803d97cbeda3fa4d0d38e1cbdec7f3a78cb6c3fafbb7a497019cb0b","impliedFormat":1},{"version":"84733c683bf75c6dea361ebf8f52d25f698e0e9acc2e61d785b512838ad2d92d","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"766d5bb16031de11811c5fd0e0f125b4434105c6d232db06015a92927afad6cb","impliedFormat":1},{"version":"a617365b8e07bc6ac5b27f6fffdc8ea5ac60d0499f712c2c1fd0a8207e99596b","impliedFormat":1},{"version":"455bbbf2f8ead443587b6427c3665c50929bb46f0bae488b2505e51ab968344c","impliedFormat":1},{"version":"fcaf44fa97e3c0fbcf3ad2b8f1daa21c9c4ae984bbc49c32d0d52bd0c2ab87c1","impliedFormat":1},{"version":"430b1a8114a866d00adabf92126efcd1821d0f76a93d1770396ad58a43c37791","impliedFormat":1},{"version":"3948ac7ffd8f116ef8e176c44e7cc75cc2c91574a0f1d84a6271fc19c89388ac","impliedFormat":1},{"version":"4685b767fcd3e2ca1b64c69755ab14cb4b313acb2633c9e54dd563aa8d88245e","impliedFormat":1},{"version":"c4da07bfa2ce1d55d4b0550b081539106f3f0318f4352216fc65dc8b7a1189ee","impliedFormat":1},{"version":"a5283862cdfb088fa9b979e0f130d33ee076570926fc070702faa6cef3318353","impliedFormat":1},{"version":"30898585ff3e711df5139e545241715ca3beb7a0cb733b0db9d10d6e2c6b8f8a","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"d092641b7614f7d0602710352805e561e79d83addac6f33384af9f935bf66330","impliedFormat":1},{"version":"9369c1acc1a48cee7681e3b20fa9751b756b3944f80bac10fb1f117d0bec4988","impliedFormat":1},{"version":"845140fe5024117a2568350f0deff70153b09361f319a89a378d711d778942b8","impliedFormat":1},{"version":"2e1f407ff744b974be0d596ceee7a42820352054c60da4c6ed9326b4c13521c0","impliedFormat":1},{"version":"bdb94e9d318060cedd7765212d961b15eb641311cb0a7410d0938b068938f661","impliedFormat":1},{"version":"96ede84c172f776fcb2dae14831f2dfa1c07fce868123a9d28bce5205e0a847d","impliedFormat":1},{"version":"4d63bad37376b4d60b54e9d68a23ddbc5227628d21b7aec4aca3a428d092227c","impliedFormat":1},{"version":"0d92ff4d05c1f8174043dc013a93e412a024f919ce846adf1e724a2b611508cd","impliedFormat":1},{"version":"220bd394d53279e3ab30a2ddeb30eab9a3b298a67f884901706e8115f4ae4e40","impliedFormat":1},{"version":"3bb06e1649d31fe11f3f68cf526b99da84751edaf696896677b0eee99b46141b","impliedFormat":1},{"version":"96bedeb27dc07030111b7a2135020ecfde7f1ea7c08d5a86497f37a48d62bcb2","impliedFormat":1},{"version":"93b04eba719925461d512bdb0e9135a251a2f7b342ddb365331356e3132280f5","impliedFormat":1},{"version":"6a921ea033e5feda13e6892c49b2b5e8fdd25e994fcbc2e7b6d5cd68105ef8c0","impliedFormat":1},{"version":"dd36167c696feeabdcb65b38e2ac1ce0bebcdd2379bc406f3001511ecd2e53ad","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"1215dff8f03d4b03d243fcffb85be8065696eb649181f3215dc56a686582d909","impliedFormat":1},{"version":"ef6e037afdf2d0309e3e8e183228b3cc8b447441908502fdd972b94cea8b0b29","impliedFormat":1},{"version":"ec43abbd62713fd2facb4e046834ac84cbf97145dbc840d4c9e764cfc361e04e","impliedFormat":1},{"version":"55943858b3626db48fab06aedf19bcf1861633a4c9d5e6f41c8dee3069feacb6","impliedFormat":1},{"version":"2534fe7bbf31711cf2fe81022050564fadcd9be0ce7eedd0afcaecc9b843b020","impliedFormat":1},{"version":"99cf877d6d62a1589ce2bebd424c5ab28d1055ab2dea9703630fb86c460432ec","impliedFormat":1},{"version":"e921433127aa4afcaa91de379286ca2fc7be25751245709e853f02b8cb178760","impliedFormat":1},{"version":"181b9a48cd3242d025dc9c1ed9e1e8bd0d0161195ef2b3c6f04791cddaaa481d","impliedFormat":1},{"version":"306d08882dc5fd1a464b42c91e29944c1c790d6a0f31e5163f5e924a1006b930","impliedFormat":1},{"version":"bf698ae3186a4e3e9331f41b96b4d9265cc130e961dd618fd22a9065c7cf28c8","impliedFormat":1},{"version":"28eae2a09dab548d02995fbb62277617410be7342651e8747f08b283f489cfed","impliedFormat":1},{"version":"f872975614ec532f2b511f47a5e9f7e81c8b071552d6438cbffef6e7eab783e3","impliedFormat":1},{"version":"9308e110b989b87a935905861d06b2bc1cf1df9fb4f7b82dd90cd7c5ff4ab728","impliedFormat":1},{"version":"5a42fad5b65b59e919de7cd923ca3241819d0dcfefaf0d03ac4cbd31fd2137e3","impliedFormat":1},{"version":"f494bdcd7672b2dc1139fcc553360ab7cad70e5e5e65bcbeeac265b3004ff46c","impliedFormat":1},{"version":"3134558e76ff8854ad215982175940adec0869a952b19f332b21517b2fc335ea","impliedFormat":1},{"version":"7b63a66000707a690d5d1f3d6205c927de06674591b674b195f48bfb7c2888c1","impliedFormat":1},{"version":"6a351ead1cb6595fba10eb4431acec3b3db94daa97954c06500ba50f29c93bae","impliedFormat":1},{"version":"15a95a083f92211cd49251b9bc7cde9c77223e6a03d012bf7c1c566da5fc0a80","impliedFormat":1},{"version":"b29ef08f595c3af2bd38eab4365a7e3cff7008cce9e347ffe1f7ae20303804ef","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"a226c2bd85c61d51aaad4ba9fde2cf2fa4d45b4946a9a244365a63f5df1b54de","impliedFormat":1},{"version":"abdbaaf2f302ce784dc52aa5991b348a8ce81df087ad63c02b49b7fdd991d88f","impliedFormat":1},{"version":"6823258e366812e261ae43492cbe3cec44b1aabdacd8933eae94e5aa1af8ca1b","impliedFormat":1},{"version":"6c2e5ce478fdd8b17f5ed55d48c4f8c153ece3c4ce4ce42cee01c5800bdf8c65","impliedFormat":1},{"version":"adee4405663ce53e427371ccc9151a0663f772f1e3c2405f1d65829176684fc3","impliedFormat":1},{"version":"956341331dcff0fe39ec46ae3202506e7627dedabccba1db86595d3c28b5a9bd","impliedFormat":1},{"version":"972e257c903b8eca715207b2e90c627df3ebd9040797ece0a4223ee5f6362d62","impliedFormat":1},{"version":"6e2a0a7e377f82058e7d6d7f040322999e776963b712b0dc28033920722258fd","impliedFormat":1},{"version":"b883865133fec5afb9b3fdcfd52a5bda0a4d518e422ea81cc540983f56f73691","impliedFormat":1},{"version":"9aebeedc51113a79483264ef92bf9ecce2b63ac3c2492187a5da987797785734","impliedFormat":1},{"version":"4d01b4aaca59b8b548ab688a04804fa5fa8008104d0530bdff3811aaa1aefcdd","impliedFormat":1},{"version":"1b8ad5a1e2d7fc9e9f7b2f9201e887f941031eea30d8d55b32eb3297fcd95636","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"45673f8f30c4c306e0993317a844637e05c3772856e69301ba3d5bdb89656a91","impliedFormat":1},{"version":"ce33e38b9a293d4f653f15ae354964595df82c509558b430e390765fc65bc356","impliedFormat":1},{"version":"9bd90926661ddc2eedd37b868dc12f05982223ecd574ce85d2c6619e6db567e3","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"1567b765c6c0ab0541ad515b0df11b2d6ce4959ee9647f4abacb670807450fad","impliedFormat":1},{"version":"63845af899c152e661bd8e6065a10abee2c2a2a4c2cf79091da12fb194afd2be","impliedFormat":1},{"version":"9f09a14a6438807f707c826d5d6582646364f809f73a8a61196871026450adac","impliedFormat":1},{"version":"3e4b46216b0084ec543b865adcb6f33dc7c3c2a3a3f748fc4fe4fc15e1c79acf","impliedFormat":1},{"version":"da4c15466d7be59f8533a10e859bb052bc11087d2521ce4e16e76d77977b1a2f","impliedFormat":1},{"version":"8b9ac46b4d15cd632cf4138a750f8b8d6a130731b7c1c843f97bb96837e8b32c","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"a7832fc4ce4462f26925b74ec0125594aa5e806f5bc93fccbc7ec3933a69daa5","impliedFormat":1},{"version":"a3de0cedd386189df6c35b5486e921747bee290aec42db1717d17fbf1dc0b471","impliedFormat":1},{"version":"6ff8886562ae7b4dede4475c11470a00f5eb80c5550aa3336a223bae48bfb45b","impliedFormat":1},{"version":"4f758ad78e13a3dd05f1a93eadabfa22339fdcde5cc53edad21efab149b6b032","impliedFormat":1},{"version":"bc5cbc1cf569d9e7b756a9f4e7ae69888a78629499233b4648a6b199cd9c5a7b","impliedFormat":1},{"version":"b6dbd3957dcaaa77e1b0445fa83b882eb6d75a7335f1200625e0918784673343","impliedFormat":1},{"version":"bb70e693d6e73f716fc0e2accc811027826ef1fa2dc6620f4eb6d8f8851cbfdf","impliedFormat":1},{"version":"af56b7ae3d413629e5934276f2d035f8389d65dc29d3036725caeef0269abdf7","impliedFormat":1},{"version":"3389639c3c351cdad061507d81e4093b0c7bba523201a2b43c704ab2b18e6d90","impliedFormat":1},{"version":"eee36bddd0cc75f62fb0af7f732fd22b973813896996a7f8ef9421a3220b6d7c","impliedFormat":1},{"version":"36618c76ac44e8502db54cbf56412ec74f2a76abf82f80feb240c07b7bd88fe4","impliedFormat":1},{"version":"3fd64c98a336655ef824dc6e9c642f27eb6bccfb364a79bedbb1dc94d2f99ba3","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"7edf0b0078b1e395d4590d092582b2dc082829aee17f48ce7713775bb756af15","impliedFormat":1},{"version":"f63a02184e2e69498a196dd3a9c2eaa310bfd4558588702c3e95f55d27cc256c","impliedFormat":1},{"version":"c7878049bb0e16f61b6e5b5a6df4eba72503fba395fa5c41844d08edf1efbbca","impliedFormat":1},{"version":"8dc2a5036bbb672323ada77c1ba94957e0957ea18a25a6088c18445c80dc744c","impliedFormat":1},{"version":"dbfa8a4b06e44452e78c64ce6fb8e9110196db168b74197787f43cffd291cce5","impliedFormat":1},{"version":"06b2023abb4124d6bda327fafceef144e43daac0593de1e7ea514c39d047b53b","impliedFormat":1},{"version":"8b26f7ce9223fce0ef268579909b0e09b36542924b37f9465113dad24ee7c4a8","impliedFormat":1},{"version":"70d7b89b5f62453ca92b95512a79618e263c1768701bea6bc773bd563ca6b938","impliedFormat":1},{"version":"385588a03e7916d79246554daedace6dadadbaa960556cb7059d87102c2fe4e1","impliedFormat":1},{"version":"b683380bfe6233908ec6210c35f14f9c12e24cdff3d0e053a5ea7709fa34a08f","impliedFormat":1},{"version":"8e6d6ecbe464b23eca78f412a1ed2243379028909b3e81204a4f1d9a5e338abb","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"d1c1cd539f745dee3956ef9c7c3f49d0e0ccd67bdb78714c551b9b76f440fe04","impliedFormat":1},{"version":"a35b152ba2ada6a840a878adc99ddb1480bef5e47b98a42b2490e22bee3791b4","impliedFormat":1},{"version":"ace6d76e67a02393e6e0718fb5cf17fb72e00a02ccf95aa2a60d770013bf2347","impliedFormat":1},{"version":"4a1600e02c402f6859b9160e8acd576b515f92e6b8df9ca0177bd15b900cfc74","impliedFormat":1},{"version":"e599b5d8cded74c4a767aee03e72a4374d22617fd6567b21974c13ca72d4492f","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"cef14a14e3c003c7e057249d23c85c671771908877c7df78d388a529c2928712","impliedFormat":1},{"version":"a0d1ff63dadf652ac608ff9a6fca3dcb7078f92007425d3dde2d461a32dd48c4","impliedFormat":1},{"version":"4db0c573525568853b7db76828c85615c86dbbe31ea2e313c86856dc717ef45a","impliedFormat":1},{"version":"93c2bd3cf28be0c8c3a76543b643ef3c72645245c2802ebb812400b5f8559501","impliedFormat":1},{"version":"1e56b92b5c81ad88a19924534af493da8a508d9b5ba86b42c253a0358ba4c05c","impliedFormat":1},{"version":"3a72f0c51e26d43cba99430c2b9ff84d66af5b04a3a9f0b17d047932e775f8c9","impliedFormat":1},{"version":"d2858c1071ddd1e61ad8343716ef2496ffa7b8ed92990022588aa25200056603","impliedFormat":1},{"version":"b4bb1e63dec32e3a9238ca689a2fdabd99413d4e929542a099392937e5d03b52","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"5ef1624bb2b5d542400079c96206fa14211f85be57d90b2a097cbd4c48e548e6","impliedFormat":1},{"version":"31192d9cc70eada56b57c0767f788532adbae54e782e36ddcfe8c05b1caaf5df","impliedFormat":1},{"version":"911b2d6dad9d7a0c788204f9ca75a88c7e0f7672da764a2e64ae9da37c6505bd","impliedFormat":1},{"version":"076083964b0b4fe23cd5f169a58caf846f2fa606fff752e2c1f925ec1fedd06a","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"742f3a8c4220290430034883552957a0c6351c1510a123b2cc77a1de40a9201c","impliedFormat":1},{"version":"c65863a56f8c1eb434c9ce6767777191f9a20a5214368d17e982fdcb7db78c01","impliedFormat":1},{"version":"81906be9e274f40a593c17cf24fb080900dea7b965be2b3f7a06d77a706a3661","impliedFormat":1},{"version":"97589ed2f61a4523b465ca3967c8b62f8d889a561e2518c98cf01e58a1354470","impliedFormat":1},{"version":"b6d05a107dba9222e39a9bd0b037b3aac9b7bfff77b123fdb556a31dfeda784d","impliedFormat":1},{"version":"95dd88b55f13ef789507ebf67f71e7d57256ee2bb3bb606a09a0275eace83d85","impliedFormat":1},{"version":"3ecb2a3ee8d61d46587c23c7a911b68a6295923f8c30499e4779064e8db09219","impliedFormat":1},{"version":"4aaa58efb155ecf472e285872ec663ddb75966977a5cd8a9e957d6d93e9bf555","impliedFormat":1},{"version":"c1a57d440e76882d91ef392759ed01c260803ed978477e6619e5f6f5bb67a1a2","impliedFormat":1},{"version":"bf95e64bae1e9bf9c6350c2cc61bc0d82e99bdebb6d8da1e779e4b589ccd187d","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"e31baf7905b26e0424f0e3e84998262b383f4b0a32085a438c276c5cdc019505","impliedFormat":1},{"version":"ed3863b2fe2182310d83294c96171ffb543fa50364aa92c2157fbc6fc1c02cc0","impliedFormat":1},{"version":"9d2fcd645d8055e7829c77a0fd1e09cb3b3c97e2dd6bbfcb5bbc45cf4b853489","impliedFormat":1},{"version":"27920b2dd839ab62cfc661402bfca9e2a4664ca2d952ce32f0a73c21f43c21dc","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"949f1fe753ce0f842a4d1abc3cfebea9f8fe55e54f3122fb3cc0e8aad5167dc9","impliedFormat":1},{"version":"a58518d9cc5a16d1ab72da84d7bd0ea631a432262f952312630332e8dc4ead97","impliedFormat":1},{"version":"d90df83f6773e3638ee07b99fb9b48b88f70fd4c77303225a59bea2564b15a63","impliedFormat":1},{"version":"d2812172656d5ce59933793a2522aba33e28b2eec482fe84a21159eac005242c","impliedFormat":1},{"version":"90034294a56e1b59376c1d8e276f9502b8f58ad68041a51b998fc30de221d18f","impliedFormat":1},{"version":"f15988a93552ef5ba5b4f2b27f281aa73a976e92d6151c114d2f8f0d10c39777","impliedFormat":1},{"version":"d325e722c738bdd3e0ec479737369b7cf8f86c79698627a8ec67b3ad86516552","impliedFormat":1},{"version":"6c4eb51490bd0eb745528520d25528665d0be032707c72ef14527b36f3ea29f8","impliedFormat":1},{"version":"58d2cc49535cb301b461f4ced193ecfc39e3c688d0b03b309ea14d333bd1cc9b","impliedFormat":1},{"version":"0883d3327fc278d63db5cba4842bc83c9d9a2c64182adc3ef1894f6ba87025d5","impliedFormat":1},{"version":"391d6839298249bd81c82c2b419ba76e6a4bbe075d2865c4c6ddc94c604812bd","impliedFormat":1},{"version":"cebbbc4dee810b8b9897116186d3574c187817f82dc030b9a17b05ee7df9c031","impliedFormat":1},{"version":"10c95cf3bc0340a268088827e5f52aaf90909fd3881014c48263f403dff50371","impliedFormat":1},{"version":"02462a826d0779385fc142733cf7a534bcf10237f83fa6af660f93df8b37245b","impliedFormat":1},{"version":"ed3f34eed9c7dfde7fc20e1f8d948d1d597fae8630936d6dc8c898a6b00badf2","impliedFormat":1},{"version":"4068cfd1a221e7c21631ba618d2b2dbbbb500e3bb7d2e268f7ec8105a763c706","impliedFormat":1},{"version":"26603ac60c1612422809015609c01ed37bd8048451be2e3f335df5d5cf152943","impliedFormat":1},{"version":"6255e9de3fa7889016ba1c01b2742d0df00e5722990a4b6cc47753dbce212ff0","impliedFormat":1},{"version":"50b47cea34140594819c220104e0f5034aaff06cc34ee442b7f986d1d4dc867d","impliedFormat":1},{"version":"b37d5e6c4ac287fa54017fa8acd5eb6b184492fec8dbd594760dfc5aab6d62c1","impliedFormat":1},{"version":"becd4cca726cb636a1b464292092c5960ab6710d8824f52eebba10c5be8f6cce","impliedFormat":1},{"version":"d2919c32746c4e324a785d99243e3256c80e63d569bf947b0cc24dc4ef02b7a3","impliedFormat":1},{"version":"ac1773819d8e2ecd869a0a025d2c2b26231ec07acedf9d10b843014310bebaaf","impliedFormat":1},{"version":"dfb9d8bc3ef17ef80a5f8ba5a13bc4bf6eb37be1d044b25b5d8d9573fb7acd25","impliedFormat":1},{"version":"a1562632d8a97cee3469aec5f8c0594ce0299ed9475d0583df09201395a0a683","impliedFormat":1},{"version":"d362f46d1480e87f96e152ffdb452aba14f7aa4dc61085f03c7fa385cd1df7d8","impliedFormat":1},{"version":"935bd1ed88c83279722ecebfde0ab3678b9a2cf61b8a853059f2fe85a683838c","impliedFormat":1},{"version":"ea403e6f13c12e99d256215608ff3660ed20b6767bb12afb844dc2691890d785","impliedFormat":1},{"version":"7f78f104fcc956ae47a1371b01cffbd11e7a744447116e7b86742faf11899813","impliedFormat":1},{"version":"cbcd91560e6df569c7ee8036d2bc26a8ea332a0a7b53336d7e7206b96ee9b617","impliedFormat":1},{"version":"43d8fcc36c395cc24202cec380a93b7e0278e9b63930c49ab95d79456be9a84c","impliedFormat":1},{"version":"d561bcc69a66df79a1928147574d5fd46c60bbb5a61c951f063a82f69f174e37","impliedFormat":1},{"version":"2ccd7f477814e7c631cd53984e60bb2cb446b17ace4a15777a6209245e3076a7","impliedFormat":1},{"version":"a6f30307287d7800b728b886eb9a625146392b1285391215e215aacb71456d45","impliedFormat":1},{"version":"e622d1a26c8bbba5fa67a5b8f6819f6d994ff4416d532df029d554eb1fc69d02","impliedFormat":1},{"version":"61b2a8973984277ca37722de5142a56e7e0341a7b4badb492212b32d2c5fc1f7","impliedFormat":1},{"version":"57458fee312a5969a9dde4639c5c387f817813f819e716cb31d202188b3e3b10","impliedFormat":1},{"version":"c5e259f8499363ceef258d57cb35134d8db78e9d20ea612acf188743ca4d7252","impliedFormat":1},{"version":"b4313bdda796f80fe248a8ac8f313fc7fe67e80dd23091e31aa84eb4aa2b15fe","impliedFormat":1},{"version":"70be0abb1ae1ad5d213ce59001e8b24d86c7149e1f0269d34187b221b54effb7","impliedFormat":1},{"version":"86f19dc1763c69863bb34e06e7e1227de19b6d11bcb724688b8d49a6e5be8302","impliedFormat":1},{"version":"79483e2ce941c91f538bfce6534261bdd25fbfd93967e381ab52069ef0f07e84","impliedFormat":1},{"version":"ee7348bf07564ea7da140ebc67be629e67e706080448f1095d46cf9beae5b54e","impliedFormat":1},{"version":"9429af67c99960f0ca1a40888ef5f4a2f82f00d9471aac324e944d5180396028","impliedFormat":1},{"version":"40da45cfaaf45a01590626f49dcf1792ce968c3d4a29d265c0c8d1100e4d623f","impliedFormat":1},{"version":"3b007de6feb96c49f9b95a8cd528e1ee64eb6438de498bb381d44cc53f426fa0","impliedFormat":1},{"version":"c77e09c497628522dbaa47decd120da524a1aa1ef32eb5433038ec910a380362","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"e5701501ac1d1376dda1b52de7fe7f27c8f70688a5696e286f3e7d091a54a645","impliedFormat":1},{"version":"b4ad657061a5078f4409ad01b08ad71a7580d57fae3e9c02f4d6238b735d5c51","impliedFormat":1},{"version":"95e573dc974956918f1fdd4e315bf9053527dec604888b6f5c292197d291b6ed","impliedFormat":1},{"version":"b09c568690afd4e4a355f04a1693db97efa9eb5164917e2cf848bf30c8adbd35","impliedFormat":1},{"version":"3c2ef61a74ace363f6e01859193c72902c8bf3e1952a652b087d6133f77db657","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"b88c673cc18c570298f36451df08564359bb3577ab399b42093b2449e62a9252","impliedFormat":1},{"version":"263dccd59c1ac4522726556d31eac9a7fbabbfbeed83be01785fa7d33e79bf8d","impliedFormat":1},{"version":"aadf2a3b51d7fd5ea86afe3cf3b470de5ade7833cb03f51828d228e14c4b55d8","impliedFormat":1},{"version":"f2f161154aacbb30768d604d27fbef5b968079510001b9c452bc95f71f024ec6","impliedFormat":1},{"version":"59f1558ea66388496a21e0e1387f622d2f0a4e368d51a778848967cd1fe277b5","impliedFormat":1},{"version":"1186acc0c76a107a5f657a5b77f363ddac6b836c53cb48f1ea9d78c86f9c314f","impliedFormat":1},{"version":"7d6e8a993b99d340085ec064655240a95f0e6e1a0575889ad3f453b8b8ceb168","impliedFormat":1},{"version":"60a85fcc9f8ce066239f751347f0feb402467d896ea29bc026e22b8ddc5616f6","impliedFormat":1},{"version":"149147c026fd4e2f0f9e4d53b5e6bedf509af2bcd5257f3e13938a8ac95e1ad6","impliedFormat":1},{"version":"40e8d57739418c4145112bd2efa1afedf12f81015a9387ad351ed98e38efba88","impliedFormat":1},{"version":"dde01e7450d43c18511cfa3ac1de00d353cc21358d8ac17e4fb2f4063a035ca7","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"24c0bf76b95c4501688fbd5f816a52289bc1a308b8d999ea872f094666afb7e6","impliedFormat":1},{"version":"639612b4a25bda72d27322f371cf5ae66a10b85b6fb3dc777c83b1778e88e9dc","impliedFormat":1},{"version":"058fff12b92881730de842021a0cb2b09a0599db75d8b5b3ca1f785c080691b5","impliedFormat":1},{"version":"95cbaab41edb6a8e258688b7e4a5231b4e345b185cb827809f3e94edc20180bc","impliedFormat":1},{"version":"0ee9df87a4baa22e80701015f233e9bf809e578283e51fbb82a0d174df09f81f","impliedFormat":1},{"version":"290aa1f88f8ef6b18de7cb7c5311a2c583ed664b4bff3f62ffd7a6ebc5aaebf0","impliedFormat":1},{"version":"cdc5aa421d968eb5b1153713815a80f3bb9aacd5d93dc8ff68addd98f81257e8","impliedFormat":1},{"version":"aa45a7b588d06e92372d798129722e41f7ebbaedcc14bcd70cf0649842432dee","impliedFormat":1},{"version":"ef82a1819b9bf0407018e60426cdf6a5a21c1de75fb399acd9d68c417bcc027b","impliedFormat":1},{"version":"5e971b62294a1f116ca07f1ea51b6174e91b1819030de7363b8b01fd75f9d69c","impliedFormat":1},{"version":"b51e6971e7b20eaed1a63445bf9c6fec6d85da88c3d6b8d80cf98b7c1081f38d","impliedFormat":1},{"version":"580ec18a03a5a0671f3fb3fa93418189f4257dec99abc76c1b8127c94a93abb8","impliedFormat":1},{"version":"77cc98a4ccfb855fbd40dc9653943c5a62fad495e974eb1aad518c287e897c73","impliedFormat":1},{"version":"dc9700c58147dccf92580c6566a80d64277b0e17ca2022e2abde38e554395fac","impliedFormat":1},{"version":"b782fb99682678363412726b2bf0bc979582d3cdd4ee7b134ac7243a5b6aa5a9","impliedFormat":1},{"version":"32041bd4a97e053247ed352aaa74e98e1fe70368e49d7b2407526e849095342f","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"4b8c4d946f53f5bcf74dd6a04dc474ec9a5fc2a75832abb9447afb4092c4fa21","impliedFormat":1},{"version":"5a6c315457da2d0cdbb026248d43c7c41be01d14b411a4b702cc5d2a504c1173","impliedFormat":1},{"version":"db06ce063fc7a865a6d4b483bfba4bdfdc2156d2ee92cd8e309423796c3bae5a","impliedFormat":1},{"version":"a05299b2ae3f0baa5721f50999ff9c8c4befbb47214542fafa80720b8dc023be","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"da66cefc5c47973efc8626d3fb73723f5d46911f7bcde90d6f9864c8085a590f","impliedFormat":1},{"version":"0d106edf2cf0cd1ed16b9cc656aa92f4087f96e5dea9145649ff60f8bb72c64c","impliedFormat":1},{"version":"45ed0738fcc90428246f77dfcaf0afd7742514fe54164482b801fc860aca27c5","impliedFormat":1},{"version":"dbb207c094128a7664d8ee12a291fc7097729a916e300fe0c494660ed732a5a3","impliedFormat":1},{"version":"0aa2ee709bef44e0f01bcc9ddef17f1ba3cf6d009bb3f885995c44e0df4edce5","impliedFormat":1},{"version":"b62b73d957293b6b4b5789f78d5cad19a30baa538b9a9653b15fd0f75bd4b1b2","impliedFormat":1},{"version":"f41ca0ed40ddcd4c9805e639ae814adc33520480538e6b602987928155f3d64c","impliedFormat":1},{"version":"9ec9b5e77e54bb6439ea28d7170d31a83776b187d4b66747b6d32a95c666dbe5","impliedFormat":1},{"version":"35df6b9a43bd6e2738b89fa2f5b7e798c73c822180efebfe35872a0aff7f387c","impliedFormat":1},{"version":"9d33ad539bebea8d732d2a183425c208910c1c04e1fa0a6b456c93b52da7710c","impliedFormat":1},{"version":"d7bf8a4dc2c5fa85adb528c3051901bc609dba1ca2cf484657613ac049c01999","impliedFormat":1},{"version":"f2ee8d8d9eeaf51205e301de8c4f42311dc5660ff261589c4c25572b3a2f0cf7","impliedFormat":1},{"version":"6d9e41ea531b60d739289265a2064a0a9db2f96c81ccd1eb08805479ba99e985","impliedFormat":1},{"version":"f160ce14cd5d382deb97a5eec3bdb644a1f5839213a46f4aed2036f5cd3e68e0","impliedFormat":1},{"version":"f559f461cf051cc782652f04105af07ff95efb3730f270dd4afcf280332ed4d2","impliedFormat":1},{"version":"33980c51a8bb2707db655ba2d55996e9bdf588375e7b7957c43754162401d886","impliedFormat":1},{"version":"d4778be4e0299883f6f68994da1ed968feeda20d9eff1bcbbce1bc180bddf9cf","impliedFormat":1},{"version":"da712803179c6d7f22947bba1810854a5608342b535fa1c5da99d525681d2445","impliedFormat":1},{"version":"ce2a5da8d18b295fc916d2596bcb14728c175d442517fc9257023257eb286e42","impliedFormat":1},{"version":"2102e07231b889f070f33a2dee44d43972ea2e8d1eceb4588c58edbeca4af424","impliedFormat":1},{"version":"b0ce52c1aed41105ad00c61d3066a2151a14378b65e4f64387f374f8e71cdcce","impliedFormat":1},{"version":"183e1e314e008e6bfe6d4817bdf8310a5394544982aacd59d90b5398a94295ae","impliedFormat":1},{"version":"5ccd978d57b0e667617cc9a02d96876f8118cb8b687f0a9e35eb470efa5aad98","impliedFormat":1},{"version":"f0e87455c5819ef226250c0bd51dae95d5b822a33fe77b8af19c3f0959aeba11","impliedFormat":1},{"version":"0d757721847d4e7cdafe521bcab51bbb99600307455dae0cdc7650c15ed2bcb2","impliedFormat":1},{"version":"5eefc2e967111f07847311d12cd5d8b959d3a3d12f4cb1c7624dff026aa9bb39","impliedFormat":1},{"version":"72bfd0bf8a596b52d798ed74490ad72c5eaf6746e15f6881acfc3cb0af987d4e","impliedFormat":1},{"version":"e64d662443f898a8ffc1e4755c700663beb44e6df5f4457d03c8584af38a9d7b","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"c875fedbd23b01aa4507930df8c3505fde620f40291806fb82cc934f2a9f06ad","impliedFormat":1},{"version":"e77035b42aa2ae6a7571af89ca1b46b72ab43a4fb2947e9f01200c5b9ed8191b","impliedFormat":1},{"version":"f27c97f0af557aa69ab707f1e58c7b6ee57a0e844fa8b5346cb9c43fa52dd212","impliedFormat":1},{"version":"e3cb45012ebad87f93a33875772dbeb4f242f8716afb2ecde7d3705eb916fce7","impliedFormat":1},{"version":"c1ee9e5988fa8c8ba12947d099af3c10e55c90bfb303be0d9ee82e9d639dcb4c","impliedFormat":1},{"version":"4a41ef5c9c4bc3ee8dcb41653f7dc8f7b27eaa82ae72764cf77505756878341e","impliedFormat":1},{"version":"fe87197dc236b934996c65ddd7a32e422875ba172019e5579dc02721b97951d1","impliedFormat":1},{"version":"0c4294f0a5b2f49130aa147f32f747994facf974d3fae56b81fa594cd79a1139","impliedFormat":1},{"version":"b546b08d4fa6e8a686a96ef731dc163486a12a300ff91787eec29f880257ccd4","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"df67d5542e9a451de1c5d2d333bd830cf3dae716d6d983398c8814419dd8f0c2","impliedFormat":1},{"version":"8727292e5032085562a83da09ef8bb4f8b5bdaca6759346a3add89aa713868c0","impliedFormat":1},{"version":"159a9863d8433d3b47bf1d7780703dc7cac4940d1acced2962aaf5e5b1e21f65","impliedFormat":1},{"version":"bf668689025377a09cad4325a9f4192fc86954fd81522d7cf37a47b139540c39","impliedFormat":1},{"version":"41de1705a0abf9381652669aa07f9ac83128cf21c182e2efcbe69e0740fb817f","impliedFormat":1},{"version":"c8590cc01225d9a103c602d4ccd874c756ac8163a9e670a35f53d39243caa582","impliedFormat":1},{"version":"e31a4d31b83cdfb3412b2cb8db509cc445da67863fc9ff695c95585893d6f649","impliedFormat":1},{"version":"ec559ce9198ea46bcfbb10decdfa3e0c2345efe61625fced7885793194747c40","impliedFormat":1},{"version":"5ad3c7a1997fb466a467683cae91382c1cdd5c9def7fedd5c0136d543104a83f","impliedFormat":1},{"version":"b39744b0899273a8758962e8ab128bfc5f5483724335d4395b2774420c1b7bc4","impliedFormat":1},{"version":"c36b88b117214ff1f38a5ef0488a81c13c36e3ef526029413205e1d6565826c8","impliedFormat":1},{"version":"1c7923849c8f482ce151a855e3ff0eb5c60321e80da9f64196f67e17f08143b0","impliedFormat":1},{"version":"09af3607ba5694175def0585791e633f211540d5e052669a85df4b2271b0e633","impliedFormat":1},{"version":"f9e30d6ab3f97237f421db21be27576fe4b6bf334ced214dedb20367bb2b3b1e","impliedFormat":1},{"version":"5c0ea60bedba3e8a6e72474b754f14d90d90c9daa2d6128b924490495370d1fa","impliedFormat":1},{"version":"1316422eccfc8620f8178f6ccb8a8ab28a4b506833668c6da12d7ed4e2665f2d","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"3ad23b83043d02d3f540a78851eff4b0aa1555f2f4a9347d7d60c0e0231c07e3","impliedFormat":1},{"version":"509fb99335f0ebe567b9521dbb8145c2f1b238f1a2e4497d703be64d2bf60204","impliedFormat":1},{"version":"75b3785e2ff9d6a405f00e824333a7e733e97f8c8cb550d386bfa19a057a039d","impliedFormat":1},{"version":"7ca14e524eef77d09427f470ef33eab72535cc3a82af6a9d1ea2d163d9474d61","impliedFormat":1},{"version":"8bd38c92ba11a80074c24f82d54bbfabc9f241b6e21c0330950ad4202df4e789","impliedFormat":1},{"version":"8840a95460ea103a08dcd3cd612ca7e8fcd6e6d9722a5d4dd809d1fb1c8fbc83","impliedFormat":1},{"version":"eeb942723cec61b574a0a90edd2a920c82bdec8ae6a936fea4bc11c16085c231","impliedFormat":1},{"version":"8ffebc1095bcee3de645ef1a456963e7e9319bdc9d79dd100d039c54d8e67f98","impliedFormat":1},{"version":"0cc5bfd457dc42d27625a0de0de5c1b9bc5ef05242a9e98630629d1e9e291ccc","impliedFormat":1},{"version":"a2b43bd3b844ebbf06c63ce8563e9af5f5ae588bc7137263e14578fd00d7475d","impliedFormat":1},{"version":"b546b08d4fa6e8a686a96ef731dc163486a12a300ff91787eec29f880257ccd4","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"2b8c25b7da73095e61a3d2dde1091e0dff55518b88616d8ab185080140844758","impliedFormat":1},{"version":"2cc75d367f096c4c25b4a2ec5a88ced2506a2c0862994a7567b45bc8ac6563b3","impliedFormat":1},{"version":"01d37ed83235d6c0fc7715752547408a8a564fc9e5be2cf4f3f06ac3196b905f","impliedFormat":1},{"version":"1f66b11b39b91c9409df9814afcfd7aed5d95cef0470c23f1e74eb171ba56567","impliedFormat":1},{"version":"dd8179d658c56c9ab577db7bf4ed9ac66c91167ddf1cf0f9edec381adf2e1346","impliedFormat":1},{"version":"f93704962644e3f0a9ec3d92d58c6d7b83f9a1740c4251a55b82c94dbbd1958c","impliedFormat":1},{"version":"500c53f43401b90779c93d517a121d061cfb2736a7e22faba5e5c133dba1bc87","impliedFormat":1},{"version":"e355ab3691d09f4ac46fe639cb539fd467ac7dd22df9ec5afcda26bf00442884","impliedFormat":1},{"version":"b58b10ab54b6216cc9716c6c533a6efc320b6557c83d263bb35472a19faa2d50","impliedFormat":1},{"version":"b7c1995c6399067990a20de2be4ef63e6b88b2618543f84f9d1a556c9a8467c8","impliedFormat":1},{"version":"dba0d7a7267f48685ab54f7a7554bd65989db22490ec6dcf29f03a7fea75dc51","impliedFormat":1},{"version":"17731a107b76f7e63c3772cfd8f4072d394d44fffaa0ab521941df91a11f33ad","impliedFormat":1},{"version":"c71c33934eac381143ec66f41e32a0165103bb0a0a5ad96cc0b17404f8fa6e02","impliedFormat":1},{"version":"af5101b0f72a08ffeb316f2d0576797c66c94eb90b62fb7e45e0a2508fcfba62","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"445d3231f619088ad58bec5b19d040d91dedc149ad9095f85d1407796836fcea","impliedFormat":1},{"version":"c36ad4fca93d60c4662d7a4c4ee64bda47d522a4ebd24bf7a2a692d87858f5bc","impliedFormat":1},{"version":"f74f74282bb5a288260f71d05e0a92a35e9e32bd5b5028015338c9004c819c46","impliedFormat":1},{"version":"e3ded45bf1823ffb49838558aa9108ec73da7eae26bf599733d6ebac77c78707","impliedFormat":1},{"version":"6289edfa03c297e2a334b625d82cc16429da0aca5e532686609df5e07cded27c","impliedFormat":1},{"version":"4f751e2623025adc0f1486eb94b479736cf4949009990fd324753b881e3975c2","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"91f4ef83d8001cb5067e2c28ceb13fc2919b5ee3dd680ba18054957ea7003523","impliedFormat":1},{"version":"cd1d01f85519580585f090929b93b8e1ecd16d06e6980393f2bb4944009b0d32","impliedFormat":1},{"version":"4175275943ee857055d545117045dc71be5ac549aad9dfda5a92f8e7daec001f","impliedFormat":1},{"version":"6b0c6b7bcb2e3ee29dff49b68e44a235733405c4492773d96137990ce75ba80f","impliedFormat":1},{"version":"258cdb69a9d68e87cfd7ea940d341d8e4d8ae613f4cde6f5617fde7f6aab35a1","impliedFormat":1},{"version":"ba6c45428c04f603cc85ccb503d051eb42c7fd799f88d5fe9dbb16b26ef87f27","impliedFormat":1},{"version":"2e9be0977989b08f0f6ca96035a0b68c5d02968f397a38f5092d0ca62f1d8be4","impliedFormat":1},{"version":"ff4dad788be583958404068fb52c9bd4cd2964dfb135206679c3affb80d3118a","impliedFormat":1},{"version":"8cdb5bd694a0fee53399509603508bc4712ea365868327a6f066c5fbd8e0bc14","impliedFormat":1},{"version":"333c60b7775ba10bdfa03db49a040675cc909af6750f7e08ba6a2e27f4ab11c1","impliedFormat":1},{"version":"0ba84b9caaaac7a7a71362a692d1232901d26f1fb963d6a525e651aca1ab9292","impliedFormat":1},{"version":"e4e4840357790a803e25fe9cac1261ed69a0ffc3cc5e4cf2e4cf67c932bd8f4b","impliedFormat":1},{"version":"fba032379e7ea846f70d1c51a41613891d56aeafa7f4f73e8ed35110351e02df","impliedFormat":1},{"version":"8806df030b7d6905f18d2cf4a676f008506f9f39e7b6f3209b49c54bc3657259","impliedFormat":1},{"version":"c23535f945fe930b0a7459dba941ee5df2b3b1b098321bda2e9c43d101dac684","impliedFormat":1},{"version":"016b6b7ea134aa80800c7cebdf4c0bc0025ba3a111fab183fe1f886bf82b504d","impliedFormat":1},{"version":"bb699ced66532df8df23e2cb9d83d3d14a31873a706c3eb66927d5c9779b3ac6","impliedFormat":1},{"version":"a819d3291accb75e5996748c624e335d8acb967777cf1d9527495fd41205ed2b","impliedFormat":1},{"version":"9595193af5a549fa24127b32bbcdfe5cfe654f421532c6a60da86795f411a292","impliedFormat":1},{"version":"d9494725e947e3f6771e61d101c564025ed6b5b5308c08da7643763922d73730","impliedFormat":1},{"version":"40c95d0b50a0c59cfca0f88777a1490c343cb083c931fe19897b86a22fa3e5bb","impliedFormat":1},{"version":"d73fe37d3ce752aff925af39500a66b393a5494dd0b1993b927a3be128dbad33","impliedFormat":1},{"version":"299db1ce2af42d22c81963bd30b0a14c73de8a20632c90e4b687e0a58913d542","impliedFormat":1},{"version":"48866c22f3a8fa18802c21bb83e6f7e0f88295257cdf314a007689d877ab3bd9","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"239e868d83bb152321087024869c0b117e0042297371e4e95a470bbf8e7663df","impliedFormat":1},{"version":"fbd4b0e2cbac750e8cb7481d9aeaa786b4a4ad425f9e5856ee4e64e3fd171a32","impliedFormat":1},{"version":"6d23d54eece68bc6937367aa0411d97a106d6a532069c9253c6eee9d6af06ee2","impliedFormat":1},{"version":"1ce60541f581d807bfe1fcd022d981e383255cacc86bd7ed0ac7c8221ca28884","impliedFormat":1},{"version":"5e6bf8eb548c2823746dbca219fd985d50868098b2afbd2711ac8338ab43e7e2","impliedFormat":1},{"version":"e89835f9e90fc1bbc9b56d05d1de76ba184bf958db7d08b29afb33bd02903c2d","impliedFormat":1},{"version":"078901b565f57236653407a5598ca5f1de59ef92cccb4ae6c96a6bb2e77e50c7","impliedFormat":1},{"version":"b417d5b7b8ce59f0b61cebadefddd5a2438d9c048ad22689da3f247e8bc04468","impliedFormat":1},{"version":"405372e793f83ea54c4609deb188b9a466fad103e429f38eec4f29c029fc4e7d","impliedFormat":1},{"version":"997a60a893b9933e601f411fafbc40fe18ea310beae4276111a8f0ed7aafad5c","impliedFormat":1},{"version":"f883f973ec9d3b41310b577eba00f0ac1d8d1db5ce41fb115c1344045d0ae593","impliedFormat":1},{"version":"cd8b918a70e77f79e9cb1eaae82b68181585e075a94015950955b4e3b7f17a7f","impliedFormat":1},{"version":"ff62796abe285a5f8739d1ec3809803e13b8e9856fdd307d2760d99619c71727","impliedFormat":1},{"version":"87f29f65f8e681de4ad0a7544358a1a5735c535a63b692937c6fff2513c6fa99","impliedFormat":1},{"version":"be1fa9819b29416a51b0bec85d9f1c285e3d5141ad2781c1fd207ab4deee5f28","impliedFormat":1},{"version":"b7914fcbfefc9787bc24986534afd49148071d54e4e394fdb6850a9a28c29318","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"8422cc97eec93938a73d8dfc7d3c70489a20de205b099a61bbbebb65b656f693","impliedFormat":1},{"version":"499c02e6945836beef04d146d02cba8530779562b349420b3e7be06e1caf7f10","impliedFormat":1},{"version":"830ad5b942bbb72f12cd01984ae26f0503b9e2944225550ba4f164f5a09d792f","impliedFormat":1},{"version":"466e2216dc4028dfde7fc93228b4bcf73dd5d47d111cbb8e55d484bb97805a0d","impliedFormat":1},{"version":"2d00b88910a0c2f49ada791203cd9927aa44e76f9fdd7dd01e4935960bd14009","impliedFormat":1},{"version":"8e88945b80ba7fc47eb30aa421685f42089734da836f6ba335febc8f3865986a","impliedFormat":1},{"version":"436ed15ff0bf64b84859e1c39d8b37a153866a04ba19de1416dab3d45dc05d90","impliedFormat":1},{"version":"6b0580749f463402c11f6f2ecc94f81a1075b59e308f847ee9732027956046ac","impliedFormat":1},{"version":"ba159277aa05b96c8ce978fa0753a1ab238f11839510cf1f2a40f43fda22dd0c","impliedFormat":1},{"version":"584136801560d6714152832842523e7f6457f5ac684f1e7b635aac8096998479","impliedFormat":1},{"version":"3321fbb0087a14657fef6ec125980b467d5abad71dd704bd3f1c41e1b72191cc","impliedFormat":1},{"version":"53f000a9c39f717774841aaac150e3e9afe4fcc554ad5550694cc2313a933177","impliedFormat":1},{"version":"3d4a0cda1dcc18f0a868c9bd7cd136e22d237a4a54eaec24c90f6cabff997b8a","impliedFormat":1},{"version":"1b7b82e5af85d221b146452afe0e917dd4d9fddb6d88c490dafe5ef056869dd7","impliedFormat":1},{"version":"5f536f4d3af66d129ac1a1e8f8055bf3cd9a35cb4ba017ee07d71ca8b3f00dc2","impliedFormat":1},{"version":"cb357c9e97788ddd7f31752c60305e43febedcbf24de6cbaf474b22d46b81d3c","impliedFormat":1},{"version":"225655c9d09cad10c4cef58ee05ee3b6290c3857f9f7e431f1ac1df9a142b40d","impliedFormat":1},{"version":"6ee641ceb78d70596e39fa9deb30717bb6f9619d2afd7c1f9cf646e3ba2b8ee2","impliedFormat":1},{"version":"4353b6623a1701ab622ac678b64fd8bc7ed21b0003e3e78df608058744a7d94d","impliedFormat":1},{"version":"e8eeeab6d3e3dec6a7346e267eed3c3472556b695de3e686831cf84840c2869e","impliedFormat":1},{"version":"1197ab966d4607ec6e4de0ac1504b8b6632cbd26b010ea967935817d13e32857","impliedFormat":1},{"version":"03c96b751dd76d15e15287b74b35fc445d98d9dcb95bb9e08d0b22f05de90b87","impliedFormat":1},{"version":"67bd13c1ce84cfa58561d584b74d679a38af4aca2d7a7877621d50c704647325","impliedFormat":1},{"version":"e5b0d424eaf186d2db2977c352ba988c938bffbef68af5ba259051dc6a4f0ba1","impliedFormat":1},{"version":"f22286137e22522be2454bfbdceaed8725b2ffcbe8c8d46861b7b55400d58ffb","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"32e5ca56d7e4b11edae4bdbf2ed4ef533bdab3b0d0b871adc583d4bf0c3bfb0c","impliedFormat":1},{"version":"24cd58cd1bb9ad3f56a9ea8322c709bb34a7d5d92fefe8f7abe1e4f4be2bb7fe","impliedFormat":1},{"version":"25b7e0608cfc8cfbf0008928cf85ee0dc0fa00775197638a58aa536f877e732d","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"9d560c6d20a44c81e097eb8b3a972038822459edddbc1b3d9ec1a03592420bce","impliedFormat":1},{"version":"1b13bd6e55afd762898f412ed85d5428e5a041ede3d5052c9f36620fb3d2a922","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"fa2622458f4b4ec23e6283f38305ea1eea925032ff51e275b6abba0b55e2e6b9","impliedFormat":1},{"version":"580c2e9f22901acd35b1c51b26bc9b45e1dc7e442ba604108aa6afbd7ce51d77","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"64e1008afa1492284c2b15ec778783ab8d5d4f770e9ebf8c1b76f14adbba7412","impliedFormat":1},{"version":"36e39d5ef00371b2c42267938fdddc6095bc3e514ace229e3e2ba4a7c8cdf94e","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"40bc4296a7363926b06b55b7633eb2ef595d975794c6152710204fc14c85c73f","impliedFormat":1},{"version":"4a4721db4ac24d64b79ae029be2de539277c5b399139b5b808a6036cae5cc667","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"b8dcc0769d032b06a832001b940e997d89b8c33adb74482f24b6800aa011397e","impliedFormat":1},{"version":"87e0e968b015060378e22a179599f581fb6680573a12e34e0a5fe307c5adef1a","impliedFormat":1},{"version":"59996d3f952a2beb6840ba5e79e57b4ae4d3c56df335d0e50d15b82195adc429","impliedFormat":1},{"version":"dd7eff307a39f26dc5828c442da78658226e7c51cc549d89839cd01e3d435b88","impliedFormat":1},{"version":"3a9bdac45d26e9195c2381d4021e491b1e1cbbbd39b01f92e83dbb7676109bfc","impliedFormat":1},{"version":"cb842b358b4926d25f81628eef19e9ee405a77e5fd36b53768f679d8b90dab40","impliedFormat":1},{"version":"63585f1747acb87fc2362f4d467ac520013de62e52ba8d837c03db65419f0661","impliedFormat":1},{"version":"e616c2a5054748939573b6e16f8a6c1eaf0138180116e41bf030414ae83dc8d2","impliedFormat":1},{"version":"68ca6db8e5ffc0632a844022337f830c478fc359c43724ef500da9f43e92d5ed","impliedFormat":1},{"version":"8444bc0b7ba91ebde6fc72479836191098ffb18ee9abca0f64bad0d29626deb8","impliedFormat":1},{"version":"8c46e1ab192c3b155670aa169d4ff6e9379e45aab8338b1b2bd957c87c381959","impliedFormat":1},{"version":"0b9b98efa6f80cced0729518bb772b3bd855e976279aac80511cceeedc6f533c","impliedFormat":1},{"version":"22e3a59ea00ea1c5d5eb8834f329deb6ee4255c13fba587b604534bb554072fd","impliedFormat":1},{"version":"79928c1ae8099b4e513bf117c62e4fb609b77e0d091976e6bf28be3c31092eb5","impliedFormat":1},{"version":"f1dee010c184b4e376828254a20ac59746355e6d457eed53eb4993897b8913aa","impliedFormat":1},{"version":"36f3e47ea97555bad156b716d74678997fb75c2e58c7a07630a00c683341c774","impliedFormat":1},{"version":"2a5c669079ba6272122b302a1e4a3ff1333a6bee094c4cb3d4174c6d9adc5ae5","impliedFormat":1},{"version":"61e7522036393d83bca1dd4c92d42bf3cee40f8f49ba9737bc50b007aca5357e","impliedFormat":1},{"version":"c0fc8dc1aa62720365451502015dadad331b2c49395e1996d05ed645f1d09e6f","impliedFormat":1},{"version":"5b7343bbd8498c9190ebc3ff9fd06eae8284031084b43c8201a78fd99e4a3f57","impliedFormat":1},{"version":"57dfe786bb5503b373bad95f3637ce5990a4a12a8f6c382db26cae8d9fd738e4","impliedFormat":1},{"version":"49dfa2d857e47923e3e798b71f0a85d287cbf72bc34ef11c8ef19a5a092dc3e2","impliedFormat":1},{"version":"9b03803ee61b48e978e8fd56711b2e3e9acd6b4ed6051ae47eee0dd5c71dec50","impliedFormat":1},{"version":"6f9418222d92f5000b5064e61c662bf5387e1a63b2b00c3d39f1ecb3887c7470","impliedFormat":1},{"version":"ab5eaedad3c47ecbba38cba354f76fb9fb5936869fe4bb5dddedabad75529770","impliedFormat":1},{"version":"15fec178c82b61604129798afbd427478a26bb8de4ebbe2836fcfd982cbfb8fe","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"059491d61f104c81917b69b831165c9446e547f8a12fa9087b50b9f61ca9f420","impliedFormat":1},{"version":"22a16937d366ddd13e9a7ccf83158248525db12ffaeccf8cce68a9d7cad95f4c","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"42cdf2e9273043de44234b28ea28f80611112dd3c8331047bbea8d10d6a415d5","impliedFormat":1},{"version":"d4bd5f5b290d3da12e46a487d76c85eefd0288b365a779d49ea6bc6b5483c88c","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"576372de58777486f1661976d9f769458ea79e41e77ccf604137b0a59266088c","impliedFormat":1},{"version":"74bda6cf4c162bd5c54a9439eb3de0bd2be6bcad2a1f781039b869774ba456d4","impliedFormat":1},{"version":"c7183c1dd75691a3e0e6d590ed1fe056a3d490feb92024425692ccec56c25200","impliedFormat":1},{"version":"daa228835e8df1aac03483a2cab51a677d2d248481737ecf6a112ffd9c47171d","impliedFormat":1},{"version":"160a6727d09ff65d604e4840a8378c9e3645dc4857c2759fe95d72ed919b4e39","impliedFormat":1},{"version":"763458540a3fcf800e0104502aeb002528aa67fcdd752ace60fb91879d59e1da","impliedFormat":1},{"version":"03c58a08ee3e4502d75294cbc74f2883faab24a132d0f06ef8754252797a3c50","impliedFormat":1},{"version":"0f9c526fce0b02b9e589e329e93b42837e9242a4ff94b7ff157ae3cf8ee99cad","impliedFormat":1},{"version":"5dbb21b39ee4c8ee8b96e2b57c51d8ad62021949b192be67a7f82b058c171d84","impliedFormat":1},{"version":"fc48d8fe760b3d98a7955318a731cc31fa262919c8ebc3c285b96f0e58763c19","impliedFormat":1},{"version":"5b1e55af70d6216a2ba11730e8efaafeac4f2fa8825a68451f80df010f762e39","impliedFormat":1},{"version":"fcc45bb11f8f09e55fdaa019203f52f315f09b80e8b0bebfc15f78408fc9735d","impliedFormat":1},{"version":"7269638fe96729ccfaad174ee41d0685dc579d30f24042e94e7e6353833e80eb","impliedFormat":1},{"version":"475e8ae6ef588b36da21732e622f38e719ee6945952a256df2ef49954f572a8a","impliedFormat":1},{"version":"cac49dd910d87d06316304cc8d96bc65af918f70949d4a9842efde0490d6ab56","impliedFormat":1},{"version":"e5e3f5ffcda877c2a841349937ffbbb71ea8f5350cb0b21ceb36973e3dcadcb3","impliedFormat":1},{"version":"8b3233e99dbaf25884cac83811cda6c54a95430d10f68bbad63c7d5df210796c","impliedFormat":1},{"version":"e6f5d6a8e3e935314cf8eaafa3aa98abae0819d6ca08c1d3b8aa0f4d6d4337fc","impliedFormat":1},{"version":"da6ef40bb06656369b164be2aabd532fa05937456b69449dbe2f689fd7ebac29","impliedFormat":1},{"version":"396ec9de4b372e02e3d6e479d766220fe6d96b7f7711472700b153e6d7c9d9b5","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"964bf2e1e9a6d0adb201e1f0d6407dcb08144675e858fd55d67bc9bf3ce7cf7e","impliedFormat":1},{"version":"09975c1a24a5afd1e2a39464283255b6b6151e9b2fc9895c13a19286cfdc01f5","impliedFormat":1},{"version":"5198fa19160d48da517cd8ee04e7fa9fb36c0754c4fff823838b8f2b2a073974","impliedFormat":1},{"version":"722b10ca1ab77a1fbd9fc87552c940d27a13afc042a23832d727a2dbb5ef32ef","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"9f12b5193832bca6e845c28c2902f420acb6f50dd423dc3f74c685cacbcefc64","impliedFormat":1},{"version":"7e2729d64aac3377a70f8d5aec7f804e48e31c64a01e47261ec8b57fe6bcc2c2","impliedFormat":1},{"version":"063cbd4e41c072f1305e4dd4550d8a51a519611f206d183e97e4e62d251a98c7","impliedFormat":1},{"version":"cddb96c1fe050fa4d94bda1973edfa13e0161caaef61cbf8d83346508d5e147a","impliedFormat":1},{"version":"81075e3239ea5efc4dca89bc5dc61a6fb483b945631e2ea2aed29db96fce77ab","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"add168886f6794aabe0c9342fe5bc411a974833becfa908c5a5072cf74bd1520","impliedFormat":1},{"version":"9d2b44b79bb9ae0beb95db475a9c0caf8f860ef3f84bb0de597f21625038fce4","impliedFormat":1},{"version":"49cc75a48808633a16e2efc7dba2b1454ce4084f45f604716079facc97303699","impliedFormat":1},{"version":"98524b093d0bb81cfb52e740cf92c3c656e89a17ec6b88075c224943a5a02a36","impliedFormat":1},{"version":"ca9be278244a645a361cb1b6486116798b430ca5e519a1ddbefb64baacc7f980","impliedFormat":1},{"version":"5f58fc34a996920cf5efd6dbeef468e389c6dd76c58ba4f6c95681a9b7c3d305","impliedFormat":1},{"version":"5239dd51cee81f8af237cd4c0b4353584d958ef33c4f0cb910f4a2e8eaacd102","impliedFormat":1},{"version":"a2aef7d77cb6a802f529793495dca4be0447d6cdd0ecf057787a9f5b15ed1ddf","impliedFormat":1},{"version":"6ec7acc8ae0e192c2b4aca3a2291318fea93ea6fa24160eacd261a221e897fa5","impliedFormat":1},{"version":"1d569adac01df50704bb1c1ece1e79b389027d601bb2d6a19e12dc98cb7d7daf","impliedFormat":1},{"version":"57db2e9465c94da560fa979eea389bbfbaec39e8471e79825b7d7d0289392564","impliedFormat":1},{"version":"5f92a561b0d4b97eabd84d1cd6e93df87fadded93673555e8bca7f55b2d0260e","impliedFormat":1},{"version":"aa1528f368b50c47e5942f987650b84e0f8102e9819260401354b25bf5e3b30e","impliedFormat":1},{"version":"96c58789f69d4c2cc23d786825e127806ee0d6d9af42e000f391ae164ff222e7","impliedFormat":1},{"version":"87370b370e9af8e40bb9c2a34a542e0297ecce2eff065c1d7e4510facd5ff2f5","impliedFormat":1},{"version":"6c3095560270ebb5883d6650d52243c852fd85cfc5726ecd68904fb8ce37f6d4","impliedFormat":1},{"version":"80f804a6ce0428c680ceb090c64411275faeae230e444aceb4d3b281d23d2cb0","impliedFormat":1},{"version":"bb6133c91b4baf613487d2a27f798fdc1f0438599d618686850b983114483c65","impliedFormat":1},{"version":"badc4f984f98f38d011140bb767247381d0b02b027d13de3f6c05051f529f7d9","impliedFormat":1},{"version":"8d9212e3dc77f01b254e14339949b8965d6c93000b08dd33b4f19261230e3955","impliedFormat":1},{"version":"ff38e8b77aede56f0f78ae7b6b3b13e80f677a4812828e0c7a2a69801492bb78","impliedFormat":1},{"version":"02f549dbfd9fd6b8f3e10244c7020f696298dc29837d3a23774c79e5cf0a8c2c","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"7b9f84a4def53b1a5304e277b164ca5042e373e6962eb337e70f3d1f7b452121","impliedFormat":1},{"version":"2cc2d183f26cd1765e5fdce5f86a59e6e51138f4a9426d82735f08b7be7058ec","impliedFormat":1},{"version":"29f5616f12030947b740b1a1111f10d54d65475cea6dcadd7cf7b8c77cb91c56","impliedFormat":1},{"version":"e2b72e714c171f27c98e9883c71bef5771795fa3f3d5928d89f57d63abfc59b8","impliedFormat":1},{"version":"4b3817f7ecebb1587fab1dcc184a2a313e2ccf86bd6a242a7c2d20173ed36833","impliedFormat":1},{"version":"fccfb36dda7113e6a99ccc855179539616fc3e32181c4029a4167ce1de5c9b6b","impliedFormat":1},{"version":"e1503a2c11250ff5e9869e385e2444967a7382dff705d6a4755214af436d114f","impliedFormat":1},{"version":"bce3882ffa1cea17ca54d43b0ede5696a423318d57aa6933cc5c95634eeea6b4","impliedFormat":1},{"version":"1c860b434cf1685b68106e1d771552f6154ab8a46e3da442857f24b085e04ecf","impliedFormat":1},{"version":"669f677060caaf2776e93b7f37419f57fe95f207f794019e98b98ef0bd1fafd9","impliedFormat":1},{"version":"13eb0a6813bad3a94eb48555e38702f706a9df270bfc6ed7d9deeab38a39f25b","impliedFormat":1},{"version":"299d317945b6f3936fa3d2696fc4895d73fb652e46d78989a5e5f6341a211d94","impliedFormat":1},{"version":"6f85ac1b4bc96421950d29b89be0b5b3b85bd72874ef017c98e9728a82548419","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"878b38e4727d8295b8ab2064e8a2e6f548c371ebed2db96d5d0c5dae0462f7f9","impliedFormat":1},{"version":"dc11f73a2be8be7a2337df22e7a2199a11638767a4a6efda7509c778282c85d7","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"689cd031bf405b17cdfbdb9d90455197735da013d0959d28b2c9325c9980c475","impliedFormat":1},{"version":"cabed8726b9122dadb1bf35335df50cf7d4e06a5eec7190217b20b9d2a3dc5f2","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"36dae0685f9e23119af79d6e80ba85f1b9785f15729a2daab50f64eb3140e9fe","impliedFormat":1},{"version":"b5e5136a4a161a236765bddfb6f2b8b91b4165d5e9828c6aecf78c2ec48cd1ef","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"2aba2f8e7a5f828e3b480e550636f4c92b8ce78a1a09086ec07d138bd20cf2c4","impliedFormat":1},{"version":"13553f3f744ba8fa1b4dcc11dcd6b56b8fd6e85ce889b2871684530e32f8e55e","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"6f2168b62f40c476de6caaa8b1907f23242ccc9c090cff5e46ce0d7b3fdb62da","impliedFormat":1},{"version":"53203cc4c3ab9d4d04d35a2aad37640bf565cce468d1427524f31cdd15951293","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"7c1d32b37db30e23abc128ed6ea1a27b27924364f2fe40784182e2aeb108c64f","impliedFormat":1},{"version":"d79d9ac9a37fed1d94af34617daab8bf5913da87bbf7d5ab0af5e2a76770357c","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"de7fa85864f0847fe2848916f67893f351db1f616eba9acba7a009a193e13171","impliedFormat":1},{"version":"664c8b70c56295d737921a725fb2dcd6422e6df8a562cd1207c302efa7ad64dd","impliedFormat":1},{"version":"e9797c2d2dd4a32caff2afb84ed5806e2e33c48de9314cfb2fa7dec6bfffaa35","impliedFormat":1},{"version":"806fa993fdf84d1e067a6d15326949ae94f59d620538f75d824643abe3ee0aa9","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"2ccd7c6197990d6a71ce5f679bbb3859afe4d064deeba8fc55ddb8ac03843d5e","impliedFormat":1},{"version":"5cdf43a9ab3f5f62542cf584352334a6414fc4660a5c472b8d6c00de6d6a53fd","impliedFormat":1},{"version":"ee3da167974af0626fc6016ccb9af5b909b8876a2187556b8ee79ccccf610f6a","impliedFormat":1},{"version":"79fee136b180118b929216ccd7fbfb4d588e4d38493e8214f1c63d06f72d935f","impliedFormat":1},{"version":"2668326642e1adaf241492ef4c90342412a9bb29c2c0bab6c82fc3ffe2cf6072","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"10d7297469cc3df5db9a7bcc0662fd708e844ff4712847bfdb2f3ec3dcc6b056","impliedFormat":1},{"version":"1093fa71b1d0b599c7f296ef3264e48e557e32b9cce1974f97e458427e6b34d8","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"7d150a8c947571009690d126441938cf4b73b801bda245852c7790cccca39cda","impliedFormat":1},{"version":"d3684017fe3469d4197e48671f7a5577b80629f28ffe0fa3dd38bcb8bec0b935","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"c3c2552745e451a30e8cc244725aedc4d2a4c6cadd2e7939aed7756b27168901","impliedFormat":1},{"version":"5461f4a01f70d268aee6c5ab85112299a2d79584a8c556287285028a000000e3","impliedFormat":1},{"version":"458a2007c296306166b30cc421cec674792f4a3a8c105f1933fa98f11a76d800","impliedFormat":1},{"version":"568a8e82792fede7a9f6706cc2b5cdc514aaa4c8a511e0e12851338e05a57a89","impliedFormat":1},{"version":"0edfe920298972f62fc0e5ce409f07b603193f268eacdddff218f42def771c1a","impliedFormat":1},{"version":"67edb91cef4aade334ce0ffea9c0199595442d757934c0672590ae2516194116","impliedFormat":1},{"version":"7d30483e6ad36e13b034dc288cbdcfad15940509bd908c5664434f42b2fe2bc8","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"755e99c3c6a0461a5ae28e18b992b2aef2a7051020c432bf14a10f69bc991d9f","impliedFormat":1},{"version":"7c7104c5d14045e97abc6aa6ff17f9402bdf1d5cd08921f8686a3d7ad63a9e42","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"0a1600321eb75d7efdc51adfd27b16487fa346ddfeb844f2d7b0ff874610ce50","impliedFormat":1},{"version":"3e693197b8520e0691e810a48500b7f9cdab2c3bfa71870e2b46f5eda62170f2","impliedFormat":1},{"version":"a7ff1727e769d1808bcb0e441f3aca881d68bda5f844128682c483c840a9bb45","impliedFormat":1},{"version":"b7c553a8bb3e3211e86bd349e9fdcf689fbbe2d8b5e80997e21ea0d1da77c975","impliedFormat":1},{"version":"9a12d880f09aa570fd49ca88c52ce2e7d1b1c49a7b58390c08b82596874356d8","impliedFormat":1},{"version":"c95261a483e3d87b411794095c48cc729e0a43285b03f1cab286e9db9ac50a78","impliedFormat":1},{"version":"b10bcf701723a3875ff488f5858f5594a41206328d3f21da25d3407f7928b1af","impliedFormat":1},{"version":"8cd1347210ad084d237b81c0669a091e84637f709d22ea8336a9f737863cf98a","impliedFormat":1},{"version":"2fd6f4540510a733130abe5f244667c080d8bf791486cbcd6474f9fce4687cda","impliedFormat":1},{"version":"9958d7ac8cf75acc3662ac8a901a15062031112580acab00d60cfb92fc918692","impliedFormat":1},{"version":"ae19b61bc636cb91508a8383bb8142eb450538937ec54d97aa4fe57b3eb3a0fa","impliedFormat":1},{"version":"1246065fdef2ba3341d7f98f29c5952a8f2044237353495a313cd3df02b4bfb6","impliedFormat":1},{"version":"a8d078e735c00f07a3c7a74ae579adc83cab18695f77d459470bfc049ceeb60d","impliedFormat":1},{"version":"01c1ef73afa013a799c79175c979175b0e4ed6abd3d2ea3dc4e929305a009a87","impliedFormat":1},{"version":"6b914fd9e3f33932db4c75fa968a95bc29f7e59372209713c28992088e2ce27f","impliedFormat":1},{"version":"0ab442b458b57c9eef788d0d1f20642f1aff6615369006f840a2fa669b73693f","impliedFormat":1},{"version":"84b3e61ffe63cd9f6d383252a49001c6b6f363b749f4a6281ddc512a992cbe76","impliedFormat":1},{"version":"02227d44d9cabf7606b4dd3d688b85982036864ec37d16dc85a1d0639d3050ae","impliedFormat":1},{"version":"f514f09dff54770df1a30cdbfbcb95855d3277223e0d0657efef1014e95e1416","impliedFormat":1},{"version":"1e0fe8428a3093c36b633c721d257124636e022fd8bdf064290106c28fed1995","impliedFormat":1},{"version":"eb02e62a6d5b103f1517f002694d071d0106f055a2b18b5b472b05841a3f3de8","impliedFormat":1},{"version":"9b3a7e2b318f6c8f03726306c75a15c3d47f527df641d4e19b7de96471234614","impliedFormat":1},{"version":"fd4eae31320159d441f368120b47e77c6a712bfee22e78cfe27dae8ccd50949c","impliedFormat":1},{"version":"d0ff6b721824e1de388ffd77ebb2400794329b32c404b04d048273a7ec3c67ad","impliedFormat":1},{"version":"539f0ad04b64ca055e3e6771f2c2ae9d4b54bd71b52dd2b77c92fa26abbb48f8","impliedFormat":1},{"version":"663b59e558ea890520b2b64051dc7d3b890ffadc597ecbf27cd9dfa2567290bf","impliedFormat":1},{"version":"4c71b2259dbef43a4ed8062f723762827c7f724043776ffa50c01677da369fe0","impliedFormat":1},{"version":"10fe955019d130d5d2f900ad99722cfc9f78203f5b318a7d7a8e049088828d2d","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"d771c24f84767052a08bbc16806ee96aba374dd70a5d52fad54b5b69096ae944","impliedFormat":1},{"version":"ff4f65f1719ba052d447fce491b361a0fb319de59e0edbdf27a428a69175ef0a","impliedFormat":1},{"version":"2ee229beaa5b03519a0e079601277da108fa16f1c471934a8af0a8dbd76e3884","impliedFormat":1},{"version":"02275e41405511ad005ec70e86e77b8605e66a019b6cf35991f39e47009176ed","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"c0650586bf87b1c810d697c554cd382dbae0bed95a36676dc1df7eb6e2691193","impliedFormat":1},{"version":"abcc7560349a250f1f1a54517d877c766031dc1540ec8879d3b37c6e87c73d14","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"bb6009c842bde06e4fe72960148dd1fd2f95aa18cb431939d903c9c309bd129a","impliedFormat":1},{"version":"47cb08c7c94904f419b1fefed8696c94a9658768789e587c748d8fa1cbc7e51b","impliedFormat":1},{"version":"a8d4d79d3e7feb7ddb3bb02521fe6fd2dbada5a5ab8382f5e76276ca562e9ddf","impliedFormat":1},{"version":"6a736b8da701a6bc728d3d8ba9ae98ed23eff990978152b8c1c5b6f270178c86","impliedFormat":1},{"version":"5c376973f37ac51b3818887b907f719492b4a83b4b7630e21bd9ff35b6b9d3cc","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"3a562c6f6a79729a1395d8cd154c75ebdbb2e7df3cabc48cd824d4f40de8010b","impliedFormat":1},{"version":"df6a7f13928f0fce7afd3bb5dd0003832af23a6c4eaca4a06783d3c2ccd902d5","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"d2c9cc255c27cdee1335889e2df7697d69870231147d895510831f2b8ba0d925","impliedFormat":1},{"version":"eab55373ad1babd7400e2bedc39480ad1f9e0840b3eeebfe49aaf26ef5d1d343","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"2246566666ebf94824b187f73e680c711dbe586e5ef6b007ec8da7ed605d90eb","impliedFormat":1},{"version":"500776b3b2c6d05ce723ef56e45e812bd5c836b50642213109e2eb4bbff20260","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"d6461b9e6350a6f10b1f5906c48cff17e78d70275fbb62db6fe4e8edde5ea8a4","impliedFormat":1},{"version":"aa3fb3ab27d45ee81587d9709f0d1b2ea8be7a202d01207dd02508b65f843a94","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"3b264f90ea0dc42bafae2bd06c3e49bccca3cb2ac81ff692cba61dea0e7145d7","impliedFormat":1},{"version":"1053f33188b6262f832636705af3edb8ee7b5c01d69fceb1466afe4b37af4f83","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"9bb1fa5757fd7a39e5ac77cc638d08d07c0ff767ee7963ce2bd9a0c0ce7401e3","impliedFormat":1},{"version":"77cc8aca487c9ff4b76e38cf86dff0a3357b0fcbcaa1a11cd1878ddd642ec7b6","impliedFormat":1},{"version":"6bc7521fcdc854f77d92bd94b61cb4dcac7399e00de44c44000ba2d88c75c4d5","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"e8deade02f9fbe9d07240fc6bce458ac69cae52efdec4b6c51b2e5e8ceb72e2b","impliedFormat":1},{"version":"0893924d9b6f90768f0ed721db7e7a8e878baf04f60b6e6fa6b143a40a04f9e7","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"916fea28e1e1485e43994ed7fb35bcb15bd3c18c73aa795e23f5e1bcd90d1a0e","impliedFormat":1},{"version":"914cd36c1c97cc6746be224d78e9f63188d66d1a6dfa45b0546b71c3d1acc448","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"719e037d8ee2001d421bbb71265b455104d408e9c09846107131cc38049a9853","impliedFormat":1},{"version":"b4190fe76bc61029acbc8c20c21f0bc717d0a2801ffd5a54585fab20fd5e5b04","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855","impliedFormat":1},{"version":"a63d4cbd0241892610d630010bf9167205644d1f0c66ed8f66d88239c1bf5258","impliedFormat":1},{"version":"b105f677885cb5c3a90ab5688c7dcd34d2d4d68c79f9d99a3a9f9e54dae26c59","impliedFormat":1},{"version":"24059b8f927ebc965d9cc8571d0374db1dabbb319c81a9125e0501755602a4f4","impliedFormat":1},{"version":"bb9fd6f37f45c936500d018015c0dc3b4c63d9303b9dd22d845f4d6cce120fab","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"bdbead5b5b086cc6fc56ae72ffdf0a2d8389346bc4528611e2ac7b3aebbd4806","impliedFormat":1},{"version":"bf90db2c0b3d353d81738bffd74f0687a8b286317980b675876871ae672d0fff","impliedFormat":1},{"version":"93260f9aa311a87aaf49bef9d2d704020819692e6a84f9edf3e40a1bfb38706c","impliedFormat":1},{"version":"24a076c86d22d3a7d747c14ed710e2a24478facebd4f476140e775cda73d8e8e","impliedFormat":1},{"version":"11ef852f9c851207c5f2282d9ffd6d6459bd9f799c52dccc1ed54111724fdd3d","impliedFormat":1},{"version":"e9eaebfd6a4ecea171b1457af0f9170865ca14388c81dadb1f3298a4b7fb1422","impliedFormat":1},{"version":"2ddf0cc68d80af8b8a5d76f34d279e24305879fe3d9d84d6b03089f6339f6f7f","impliedFormat":1},{"version":"7a924089be6984ace0d0481ed451dafca7d4d5e03a2e14899b44fb0030ae70ef","impliedFormat":1},{"version":"130838602ba4801861753d7808a727894dde20e21eb2003b727482d8f697e8c5","impliedFormat":1},{"version":"c4043b41a99644da57be4d822082b9af076d076e7809060e72ed3cb2c10e20ed","impliedFormat":1},{"version":"9f73b9bb9a490f35de7ab709b0c8126c132fdc300d490dbe2f9761e356f60889","impliedFormat":1},{"version":"5a264f181594b1960177574ea3857fdfc831fbdb3a7db75640523e67be300a3d","impliedFormat":1},{"version":"ffa6b8999f9318b9570c9f759a8e02a2b21334010f150c9e54577b90eae26147","impliedFormat":1},{"version":"54a4d88a5f4b35cda328616ba5db153293999fa1db931a44d75f8f572876b4d4","impliedFormat":1},{"version":"93704d4961ec92199275f017d70293d76e5f35dc08bb792c60b5c70a0d52a8ce","impliedFormat":1},{"version":"750b7ac7fee7a5f297bd2aa620d88a29af213a6b36aebdfc0076c7c25640ec86","impliedFormat":1},{"version":"38e5ea5c4b813e2695a49442bed00016d0066f477d1cead4384a3b0e4869022e","impliedFormat":1},{"version":"6e1bc725efc6b57b7ba42a633208d440f329c2c611df72cb886ec840bf055033","impliedFormat":1},{"version":"83b529cf4ef1d74becf6fa7757643c2f2cc22577ebe27fc86422eefca37d5c13","impliedFormat":1},{"version":"283b8e921f1f8313db19a0414bcc57bacfb383dd09ba35130b27aad360c3c403","impliedFormat":1},{"version":"b7602d8b646cf91860e9bd19fdedaccc8627b31356d88db7ce8df59d8092c23d","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"d006da9a06bae170c793ce081cca000f53b3722e74f3df50d5d78239deb12573","impliedFormat":1},{"version":"6f787d5db379d894dad71d0318fe636ccba65b164d3fba182b0c9073cbd69354","impliedFormat":1},{"version":"b3a8d763e1815611a881acc4d9a8c643448d4c1bee97dfc119be03b1e22090dd","impliedFormat":1},{"version":"b7e6c57d0d8f395296c846c7a81de59aa512ba542ff4beb654c530dce49dda10","impliedFormat":1},{"version":"dc86e10981d9d1b385fb271b186c41eec4faa0aaec0d2d97f2e5c49a04740cce","impliedFormat":1},{"version":"191586c03d8402db1b0d4c161b7774f4e2a72adafbddd81805fb429ad7891896","impliedFormat":1},{"version":"b47af10289ba68ec83808ec8cea351bb2fed1c7653d004b19f29bdab469ec244","impliedFormat":1},{"version":"f0efa928746430331afd1f1738e4afc965866224d25e9fe271ea6f1fe7303499","impliedFormat":1},{"version":"36fcef9ce2417db66270e18c0aa6aa2628af7d68612f79b54c294fb76adb93f3","impliedFormat":1},{"version":"84ac93e8a7793d1c2a6f0ef7c30d2cf3167f3e5540bd41f1567f49eed56fc0c7","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"08f4fff9bba3a768303022b89d251d62d875904dd429df84962625661c87a2b2","impliedFormat":1},{"version":"4eb89fbbed3fa05ce81d6837f112e431626be0fb7b268f90251acc7d1ece176d","impliedFormat":1},{"version":"0e063ba5d2ab5f9183cb198e6eb557ceffd03b78bfb61bb77cf63c49c5ceb58d","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"32942a02cf29bd00721cd1745c121cdd38466c0714b2a2a229456aafb86c2651","impliedFormat":1},{"version":"038014afaafdb97357d92aa299c991e47c1b6865892c6fd17323ccd013ebfb88","impliedFormat":1},{"version":"96a94dd274080ebde26ecf3d4e85f34f4927ebb3cae6a629549e8e96d061512d","impliedFormat":1},{"version":"92b3296f9a18e55db056de04a51f52d2c618c9fd2c38ec0550b8c9b122fac428","impliedFormat":1},{"version":"9c9fa7ba8e0cabad70dcdd9da47d318f5cc74c4c82af6b558dcc4720ae5c6ebe","impliedFormat":1},{"version":"ea006af0ed6b4e6f23830dcf429f59fef3868f30063ef09a4c28d591adb726a1","impliedFormat":1},{"version":"500a0927864a36e3695787f3c09875d209fffc5a4d31f01f31b6e22132483a2e","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"298f955683ae69fdb1e33304c5fa4bc9374767a6d7ff27028029c2cd78cdbef1","impliedFormat":1},{"version":"278a02799d647567e65f1e28434eebadf9c904f388558225fed3d00898b046cc","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"3aeaf8cd3dd9d0ed411977f0cb2778bced7cb6b85999306a9783f9d71bb13c64","impliedFormat":1},{"version":"cd19de0195840145edb5c9175ed65574e0429cce8510a00c2c67a7123c414621","impliedFormat":1},{"version":"75d7a59b5d492e8bbf404914c3f2c0e18c86458905a7c94d624a880a582b0da0","impliedFormat":1},{"version":"a35911d89f1086577cdd02edff34c629b10c2ecb54c240239ba93c80dd89ad37","impliedFormat":1},{"version":"cac442315e59474e9736fdde864cc2a1bc54c4a28d2f9bad74fdd2d0c839ac61","impliedFormat":1},{"version":"d73e2f67e3238cdb16850846da303c37365289e29d2a942a08b4f3e70511791c","impliedFormat":1},{"version":"f93a6665f89b5640d1d9f9890093a9436814399188947ceec34d2c15e925e594","impliedFormat":1},{"version":"634d83530de684d38cfb8360f2c472e24c478c08a9f168c67549baf66bd46801","impliedFormat":1},{"version":"75218cda653c3bbdba3e8eb30394ea422c7d1c1afc0459362524099f5aa658cd","impliedFormat":1},{"version":"c80eb446486fdcd2fa47ee4906efdabb144565e0e7a22d32bbd8614e645fc671","impliedFormat":1},{"version":"11bf73db2ce0a054ef9d249ec761638e57acd20ebf24c4b08e230e7bd5700dc3","impliedFormat":1},{"version":"93c62ef6d9c85379f2e15331bca1569d4ba609ef6def5af5a12f975042c15c4e","impliedFormat":1},{"version":"06bc36d93abc6df4f75deae8a481401a1d4ad1ea42c9f4316a5044ba494b0424","impliedFormat":1},{"version":"82d61c61e7a6a1c1dd83acbcc2e5afe05dc4277f5062276def8b9c60705db24c","impliedFormat":1},{"version":"97d6c64f3a4ac01d1ef56c3e9d140d25149a465cc5ca175f09dd7504bf606dcd","impliedFormat":1},{"version":"2cce3029f3c670f4c2b6aae0fc3a5308f9d082ae71b22ea22d2a49a20e8fe7b7","impliedFormat":1},{"version":"ae4f3b5053e8e5c708d2c2e6e21ff6204339c7d4d9683a3a0a636c873b477f91","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"91fee4978e3ed817954418de15e15d4ffe5c927538d5a73ac2a54e433b0682d9","impliedFormat":1},{"version":"ad3b2e057fd76dcd677d2ab67cce2b811f19bf6c2df091a7fcc6ab92cead6644","impliedFormat":1},{"version":"055942a8068f213d8baeb655284558a33e16d9da987884ef7c2082da2ec1cf1e","impliedFormat":1},{"version":"1b407fe5e4d8ad946fa10778b9386b9d07b0f4f4be8c60d06f063d139ca1fda9","impliedFormat":1},{"version":"a14d488285f06d6eaa47f4cf08f2864d60733d5960fcec405fdb8a78b6c7f052","impliedFormat":1},{"version":"badbff5a233a42de0d9aa09ce71f66f72e63c5e1223fe251487c5511fbafb1d6","impliedFormat":1},{"version":"589db2e9265df90edd0773adc9278515fd1a22abff78a3f213a75cff3d304ef1","impliedFormat":1},{"version":"807230a6f35c67e2ed80ef89dcb0bfd9259ddf419fb818221843f4af43f98ef3","impliedFormat":1},{"version":"68b828d9f9ed6dae00cd74e5b8c93fb7b616f691a1003ad64e93b534f8da426c","impliedFormat":1},{"version":"8314376aa135adee6aca19403ad468b94971fef0edf65b3d7f76f1803b7a188d","impliedFormat":1},{"version":"bb0f608dea0b3d667676b5affb72dfbf8e117985f11aa4193302675e4fc319d9","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"aad8df21cc60c68332d06419d794c02d27242188591eb4b553407ffa1a3c4440","impliedFormat":1},{"version":"11f7e8120aaa932de37f7f7545ad240d40e2c6c57f48d8d390b6445fb8d7e1c7","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"972cb55b496f8e0a12485fcea2b0b233b9c89bb14d364859e412221cda347d51","impliedFormat":1},{"version":"e1f512cfe9cf4f7f3067009e59cd13f6c34001310f07a4ff2824212aa9a4dd6f","impliedFormat":1},{"version":"e2254e40b2f09551c3db346100b1f0b018584c548ee3b4f6a712ed2b3015ede3","impliedFormat":1},{"version":"d2e3a5b624a8a4a3e9f413bf9563b6b78976b855ccf6c662ebc1e72690860a0f","impliedFormat":1},{"version":"cdad4ce43361a9a95e1948e4533aded4c40e649e107c238a57610651dffe8f3a","impliedFormat":1},{"version":"0383f2574bee2e7932b1c4a4da69778eb6cdb4d0f10a87d43445f47d6e416406","impliedFormat":1},{"version":"7c581462e8be022f0f8b7da5a341ef765b8a216c499e3241280214adc5f85e10","impliedFormat":1},{"version":"eab0c50da8735e02772dda68861b119468b7c2dd0d93c124e8fb74da851f1048","impliedFormat":1},{"version":"93f2ea8407bbdab1fbd7922b6a42873abfdfc3f797e6753db8fa3c76d4805830","impliedFormat":1},{"version":"a869b044b5b773a27470ef054a20f5a5c17c0ef6e76c1f5c595540f7e2d5d1ea","impliedFormat":1},{"version":"edcde6b1cc12381d1aa45a893d3364b9b2c499446e2e047876bd5b5cf3cd0379","impliedFormat":1},{"version":"1bc29cff0b3b57c8af5a0656fc36848d6e2d6684c43e05d808ff49d9df42d587","impliedFormat":1},{"version":"4a471d7005ab3dfc42f1b04a2fb100525e085a8c2fdf01c6d096acacb48f22ad","impliedFormat":1},{"version":"5704a3982859c236be807436689dabf1f14bad5ae2cea7f8a6583c048352e8a4","impliedFormat":1},{"version":"112ed8b7745968088b5fb4d7206019aa65e8ec1366585afc556a864d87a03749","impliedFormat":1},{"version":"5074c83958929062722b2de48ddaeb791689ece1724acde75a1a174cc7dc6869","impliedFormat":1},{"version":"fff61d7ef6cb11f9185a35debafc0b15da0c2b1ba7d0bca420c24cebbaffcbc3","impliedFormat":1},{"version":"851a02bfb6305c951c77c7e56a52c2524dcf2d5582636ee087bc426eac99222f","impliedFormat":1},{"version":"c2315fb23221ac888766cb150b42687ba671b8c8ae909d0ef55e715ca81addb0","impliedFormat":1},{"version":"fe888aa9db9963094251c992f3fa4d3e76a946a22e942656af9578121de3d3bf","impliedFormat":1},{"version":"4129206c9b51df3e40c24145800bb91058336e3bfb6e35bbcbb65ece289ba480","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"dc58dde78c6e928a693c2da31ce1c9a555930cf727d1f9bc4fa714a95def933d","impliedFormat":1},{"version":"18f263ae33dda679abd151ac4adf9d17728099c35bd9d8c293e8ca24abda14bf","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"52f539feb83daa17b404a018d585e444eab1bb68653d705a5e20f75467ae8495","impliedFormat":1},{"version":"48b8b70db0ea7e28dbae7e1ff75208fc50431e5794e9cc2e5c9ed70e766d4630","impliedFormat":1},{"version":"2349c23b4953a10f3c9328011a1499eaf76f7c259fa6b5e3125ab7d16be8a243","impliedFormat":1},{"version":"cef820348620b8a21f2cdcd62dfcff47d9fe9d1461a1d1270c8b96be3a32c5e0","impliedFormat":1},{"version":"af0cf401747cf9107f4fa81079f4b56fd4120d5ecc7b0617c233682c5ddfe8a8","impliedFormat":1},{"version":"06c1e4bdcda3dddbedfc5fd7318050102cc7dd2abcd8875aadd4cec1f49468f7","impliedFormat":1},{"version":"b73625cc6df770a150e24d7b5e6e5a117672e64b1bcd5d2691ec87f1bd7f209f","impliedFormat":1},{"version":"be047423fab63f8818024b32e03de1eb79119b937abbac2fd0b6ef3b4c61ba95","impliedFormat":1},{"version":"ece4448176588d00489ce63ed9ff0af5870abdda1a883bb3f40b288ea4e97f12","impliedFormat":1},{"version":"3654009b27d3c67f97097e960deae8fce8b6c13087f18403394d869a0228b318","impliedFormat":1},{"version":"b76bf07828134c4c9b0f89ec7a03329687c843d01a8f2efba0b20bae6366f4fd","impliedFormat":1},{"version":"6175d4f37c367822914692a94e9693f93c58d0ac097281e977b78fa0086d1985","impliedFormat":1},{"version":"df0bed589c95712cf872a502fc5149cf2d5718dcf0db26183c521389312abac0","impliedFormat":1},{"version":"0ee845d7302d36afdb68c8d816c37b179dec495877bcd8a9715cf8aebd1ae170","impliedFormat":1},{"version":"63a9e7ac7e3f29ad9ca794ce3d2193308e2f0fc5e7aed2f26297015577161c4a","impliedFormat":1},{"version":"5c58a506e1b64f0f69185e68ae572329ee7b099ff7c4128d1b6799072eb4e138","impliedFormat":1},{"version":"69287cf5b3531045620c749be02ca69360e5e1ea99a24bd99e97fb0f55ac1fcc","impliedFormat":1},{"version":"80389559881479703f9f7d38a18beb30191a282171b338a0dc795e23904872ef","impliedFormat":1},{"version":"932de3d4cc030453cb4a40086c61d110fd1b8c52113d09c26f97697975f52942","impliedFormat":1},{"version":"e05476e21d6bce587edef3dd0f13e763e0b6a7173acb39d8033e48c641dc0dcb","impliedFormat":1},{"version":"d869d728930b051e9186c7c83e6389cb9c41ba9ee5b7449c6b2e9b2fbffac507","impliedFormat":1},{"version":"72a4912fddf6858644cfc4fd93180f9c16b17a6bb1dd0275d2683633a08d9598","impliedFormat":1},{"version":"b73240303ed8fcfc4aff181cc6ad90997f1b7cd55457bb6cccfdd43feeea8483","impliedFormat":1},{"version":"d56820eb2e967bb6d9057761f2d2d86144a8b30de34a4b52a1f950b76373ef08","impliedFormat":1},{"version":"11a86cbf9a8b84a38ebd63070844848059f2db276bf6c9b8bd51f243f2116daf","impliedFormat":1},{"version":"577da98f4693d3c6bba5568b350e6582761e66d6bd41e823f3b95c1683bde857","impliedFormat":1},{"version":"73c18059bfc62b3df0687370dccac6f27cd3a5982896c731e250606cbc6f33f1","impliedFormat":1},{"version":"06c0cd7164d587ec97e9601b8cda653d8c9b3f0fbe4669ce213aff0854196ddf","impliedFormat":1},{"version":"eb94f60267e59732e751b230ee4c3363bec0d8a692dfff03aa4597c2620feb7b","impliedFormat":1},{"version":"4c0f9e1d2e90ec267116419bfdb6033e8de0ee8ddc1ab4fe4a8bf0a24d163c3d","impliedFormat":1},{"version":"06f6dba2c98631ed22096224ad9f816ec2d25c3030fd482d2fc4d8fa20f62c18","impliedFormat":1},{"version":"179015e6836c55dd52538cc41131828250faf2e37b1113bf1fd65fd8c8ae45af","impliedFormat":1},{"version":"f1446a837108e8a48c704636248bbbde5bd579a5a8e2896c0015667fa261eaa3","impliedFormat":1},{"version":"6fc048d78b60b2fcdd53f5fb7033dcd727b527da39b28edb94d31f5f2f716197","impliedFormat":1},{"version":"0c047d937c674e4e138a5fcab6836ce3f99591e34e0c25c5b85bc49e91289ecf","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"a1214e1edb7346c95d3a6a34e33ea922383b4f99b39a0df5330c8c7cd5233c18","impliedFormat":1},{"version":"d568be272b35402fb2c2602fdad30956ee00975072c7dd7cc88cb9e1376a4419","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"8c46ff6c61424cc2fcf540ba5b2f0bbaa21b42e41ac0315aa5ada272e4f88a44","impliedFormat":1},{"version":"86460683d23227c7778a53f5ba66ac73f0d3b21a1ae79a305fb9497d5d84344d","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"6629a3664a25af8df6788cd23ac5e7599b1bee9e7372bc32318804e1f0e40cb6","impliedFormat":1},{"version":"9910389e92320be55fa5200be888da84034cefee78f0995e444822c05d35eecf","impliedFormat":1},{"version":"36d48f151d3ffbce81379c56a5c88821d88c276e64a85dcd250b7f9c03da4a7f","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"309c50831d39265ee5e38991ad95e14c73c4f1194523e341196ea992412ca818","impliedFormat":1},{"version":"d0fd34800bf75746851c1346784651235db469d14d1360501ff5883a15f30143","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"26374ee92dedb0e5320f807dff09aa8a75a40de11ea43c94c63f2346e65a0ee4","impliedFormat":1},{"version":"4d01f5a1b4cea7e2331a09424b8bc5f8c5d895f89973368fc35f406466ce7407","impliedFormat":1},{"version":"9cd9ae59aa87639e38bdfe4a499f4a63b86933a54041c8ced4ab0cc2210401e1","impliedFormat":1},{"version":"e6a50068fdc418e539faa099b1021f2b70fb10259998fd1ace2fa3e2f6e73bcb","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"1b239d25ebeac05094ec30fae864d596353ea6b80d20caa2c4367c3e0cf0d151","impliedFormat":1},{"version":"a3144badc15e3b916a30e023ca6429bc14050c913cf39bf8acd938ec0bfab945","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"85ba921717e8cd4a2b0dafddbc6c51407d7bf3c1692c01b69adcbebe2d72ac45","impliedFormat":1},{"version":"2efbb7b44a7dc75511697bb2d53f36a62f070df1b9b0e87f028923efff7405e3","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"6e0217b917ac53c3fd3e84fc8cec52a00efe088ec17118e68e4e15866401fe05","impliedFormat":1},{"version":"531bd0e946917820a4fac7b8e246be35f433bfaca476d6ff65e3140cbea1306a","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"b484aa298a2264496d5ee9c46d06dc5c326771cccb9176d8753907600a431ed0","impliedFormat":1},{"version":"bc0720f322430907050feab0749a1abcfeedd889fad28678d976900bd526b681","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"7616d0b2e9f7103a2ebcf23c40eb72630d3a47518c28c855a2db4d382c7c8693","impliedFormat":1},{"version":"647054bc2dc3aa71183989f1dcf82fb53b336d3e4e42e8050d146bbe20ece4b7","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"6781308d378d55f90ab828b03231720da47db24d933f1130804459d09c07d827","impliedFormat":1},{"version":"d950e51eb5983e7383361bda2ca2dc2a2e75517415bf357d140e45339ddf6f30","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"2776f2669b30b6b263c9b4daefe768511d945590c77160b28da80efec8350bc7","impliedFormat":1},{"version":"60cbb7a833d4bd04a6cc0edafc9224f4fac7c8049440f96405096de988e16336","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"e8e7e0da9ee673d846d19576979872098f1d374952460d668daa6cecb1ca5e0d","impliedFormat":1},{"version":"ad73252af90bf50c8064cfa6a00c4a63f0a3f8f27cc1145df3b5cde9cc383898","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"91b40ad01c8883a5cc5e6db204221232da0a936a043cada96b54159e7244a10d","impliedFormat":1},{"version":"44e4206d3794acf9ad8d323acaf9442a31a8cda67228611e6b33fe987b8050ba","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"3b34593d324bb56e7120cb6e884770eb214ae38af8af05bacd320f456837f3a4","impliedFormat":1},{"version":"351c5e17ff4307dda3205d79712df7ed7f75479a6f5f151855002cbdfc480c50","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"6c659fe5affca1d103672279d3de7ccb9c75a1bc1118f517352162d1b036c108","impliedFormat":1},{"version":"b943c4a73168c060998f73a8d04ff60f051d721dc8189d3370e84df9dee25de1","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"7c8658867bd37e0a04b510235903b6aef53ba47221ae409d1ad2d521c3348841","impliedFormat":1},{"version":"6297e376acfbcae78119e8b5dc3d74af66e76af38f9b7a9b912b17e54abefa40","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"0e4bcae7b57317965a575c920bac85050bffad05dae9fc522a8d32a5ec4aaa04","impliedFormat":1},{"version":"285481f04c97b78f924c08d080201956035290d33a55f43d9dbc6492db7f9c9b","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"9d2e50bf250c60f165b58a6b6057651bf142b039f3fb9c39d8b648fc3fb23b79","impliedFormat":1},{"version":"b8b50412b76472ff323dd9759e787d93dba9b871322a78ae87347109fc45b29c","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"b942a9afb107760d6aa1d66521d54f73c8ee1e0f99ce975156378d3a120083b1","impliedFormat":1},{"version":"b668622fd12d25914e6b485023cca7a73db6572228c4cfaa2a7bd08576da40e6","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"7e81b1a23657a2e849932d11cc79123cb74da74d360ccd634125effde558542c","impliedFormat":1},{"version":"8a23b06430f4c8a2531d6552de5179e79a2ecb8b670940ec578545ab0071b9c9","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"5196c5211a50e49a75268ceed3f1b941d36f9a5cda8ac8eab16e29ee9b6ccdad","impliedFormat":1},{"version":"0cde9117004b8fe97b4bb55687603af21617ea9326cb9534f31eec8f3de48fac","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"01534d7205ea15655e3961e6e0988647bfe314d0bc0df7e4d289a31c75c5a360","impliedFormat":1},{"version":"b0108b8a81f48e03fa76f81d531e8fc608dbf368585829f034aa46d2c61d5252","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"189abdf8bad22d83d313e7795d218a18336c98a167b1c707be8a8058a91307e5","impliedFormat":1},{"version":"2b0ac296abe4b46cf5c104a992f1820482f2926f556ea6ac0f5c20f2f33b3adf","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"dc1fc9b62b8153d68657072e57c60f34ad8f65502f2c3dcad4abf4bef399a3bf","impliedFormat":1},{"version":"662b2c7b0921c8cd339c9af71faa87544077f90415e9787e9f9c4a357d06e082","impliedFormat":1},{"version":"78a76054706951dce0a2f6676f13b379c97572df0e09912b4cd918ed4d90b0bf","impliedFormat":1},{"version":"78f849e18859835708da1772caf603678387f7810895af4fc184f9c312a3fc2b","impliedFormat":1},{"version":"7fbb3e6e07c169b084f0771b15f0ca27f4176081a84547430cfb3a2387bb0ada","impliedFormat":1},{"version":"4ea8774e5d321fc34b16ce29bfe91524d1d8402f7c94eff26c8695630e089745","impliedFormat":1},{"version":"5e608a710a260b2e114f0be0e86191a4fc76e3be6b34c2aac120442376005c94","impliedFormat":1},{"version":"6e031d653d8830160846375f48465a42cdc85ef0a78a17a8116c785d74b355e5","impliedFormat":1},{"version":"8c83d6733fea618c3813e06826843c2711b76bdb814993b93686154fdd94a238","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"ccfa7a4a10202347a2f123e048b4cf73c79f571b11565d67b9d3c59573fae138","impliedFormat":1},{"version":"7ebd5c54725b1f88a9b30e8c5b179b5a7c094233826e3d5953abde44b9943ab9","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"c478f37dd835768c60cedf7e40c3baf4448f0026bc9aeb0b005643d366bc7cf2","impliedFormat":1},{"version":"c2095e4c44f95ee9a189b4917887cc7dbf968213b4ab494e6403dee6824a7022","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"cd6637bc198f4212e8a50994074d5bd3125bb1e601c0bec3516bdded6984d100","impliedFormat":1},{"version":"0d1e9ecdd4522eadf5f9c50be83901f77bb6d9ea8d7ac0912b146a990debc26d","impliedFormat":1},{"version":"290dff566b307f4f849764ef446a65fcd2f8f362508689cb88237810216af459","impliedFormat":1},{"version":"88cdaf72f49a9f13cfc823fd37d6f8ff0ac9291b736004c60523594bfdb0926c","impliedFormat":1},{"version":"edcf1b6db28d503ecf681e5e0aca760b6323a066bd62590a72a30c77a3f48386","impliedFormat":1},{"version":"9dbca53bcdbc764ba7794ce291dcf5b0336e9ae17be92c6a96a8907fafbbf855","impliedFormat":1},{"version":"1190077c51fc5093c65ee3898f0f022d2b5562cdafb2332c5d065d64c9e5a815","impliedFormat":1},{"version":"c56930175b3b30ac5b52e207ce410554b8e22b098a9c591c585f9eda227a1ae4","impliedFormat":1},{"version":"56e5e0eaa4d06900007c70e4104ca7a96db0ec835bab558e3a924d5624bfaf51","impliedFormat":1},{"version":"bc62f9ffc5fa1455ff94942891f483b4c8ddb095aa7db9c1d91a34beb8b2b190","impliedFormat":1},{"version":"c29f2ced2a9925274a27e5807c424d62076521fe2a6ae4ff5b171036390e958c","impliedFormat":1},{"version":"9d168cbc1b4791adf878315af99e01f8b4df3d50dbb42a4eed366ffc7ef475f4","impliedFormat":1},{"version":"c5b46423dc2f68a1f120c35dd71c6fbfc48e5b1be42769068f38be22fa06ae0b","impliedFormat":1},{"version":"528ba6a8939aba0ccc4dcf98d285aff65ae73b31e44bdced88c2bf7a20b4ba90","impliedFormat":1},{"version":"ef941f3b89ac35a3c3460514da180899dff8b5c4d755a9a257d38ba693bcb021","impliedFormat":1},{"version":"205456603052329c88da636d17d5bec3b2bd89b76e3cbda471420e00f5c3e7cf","impliedFormat":1},{"version":"05192d792b3ad95064f0baa2d99ccb483fda5fbac6f349843a202b33c87eb075","impliedFormat":1},{"version":"ce7ccaee4fa53db6c75d244794d84526de413949a0d4055194167d4e593a9e4c","impliedFormat":1},{"version":"9542f9273f42d741d6f234bd470aee4e7558791e8c66c39ffbba48c5a4d69876","impliedFormat":1},{"version":"deb808c2a3d05536c2c99fb6688cca845e87557262757d8fe136d8b6346c58da","impliedFormat":1},{"version":"0abb9d3abc66c3d56652bd8e203d32425177ed204a825074ab37ccf9568efa40","impliedFormat":1},{"version":"4e97fcd109d7327e5ce5608edbd3c9c25cff7bc5d18855540b019111aeb7adb0","impliedFormat":1},{"version":"cac14fc4b648f8032ca11185d4e2aa99a4dd5b0e6d08530618cd38d6c07c41c3","impliedFormat":1},{"version":"650fb2fa8d4dd98b91e8401f3c659b8f9149030cc9245a05656f8340d4a8f81c","impliedFormat":1},{"version":"812f6082436f32b33e37cc65b383d9fac8819e24340229e10558544a63203106","impliedFormat":1},{"version":"361122d751552585af611cd619c01c1e565c34ce5159584688fd228e5fcf21e9","impliedFormat":1},{"version":"f3b23baf6689833e355546addc1ec5ad6dce6ca3f54ac91b826114eb5e591b26","impliedFormat":1},{"version":"24ed6f5f4d8bc4cf04cf3281c585317cbbde5b60f3c183829f7a9e2fae2f7d60","impliedFormat":1},{"version":"2a07dcd39dbd427027e2de8b8ff4042736ab7743f77b9cddbe7b37fe32c60957","impliedFormat":1},{"version":"fa2a1b9d7d07e0dd9a18444c2f917ff160ed2952d4b61e124b68c07493e9b579","impliedFormat":1},{"version":"ad05085290535fd650fefd3a8f3743755e2bd395167c38b4e0aa913e2612d75c","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"927dc5c799644d9c898e9beb56de332780bcfc3f4d0565638a2492af812e13cd","impliedFormat":1},{"version":"683c1981f9aaa7d50c64e659335b653b7b67be4a941792f0f4c7da831dcb7891","impliedFormat":1},{"version":"135a2bc7054f36ed05f8584c6791faff54de3f1ee1f2616986c7ec036db1214f","impliedFormat":1},{"version":"ee3705ae42d597601c0d09006a597c1421a22942cabec5a16300c7c03ccb9d5a","impliedFormat":1},{"version":"13a14f072b840810c42668fab5def7246cc16e12b932c33daad298767f808314","impliedFormat":1},{"version":"1bb1a011b6f17c7915cc125d855187793085554a58401d01afc76bcdedf7df6a","impliedFormat":1},{"version":"f72152f7847429978201120d0ed0f0f5d8b9252e056f2e84d5f912a32dacc04a","impliedFormat":1},{"version":"d1e6611a962c8b02e278c464fb461ee4d6cc1784131eee365f2f1f09e227fd1c","impliedFormat":1},{"version":"48a2b4c085e8bd9ca875086d1af4af983076f499e65bd03eb0fff1c1891256cf","impliedFormat":1},{"version":"f38a890e434b0a3fa1d52ac37de4f3a20dd4a6dd9085e96e89833a467c64286a","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"7d86129d547a6872153a9ca4f75ea1032c0a50560afd4e2e72915de0bd7762c8","impliedFormat":1},{"version":"837a70aeaefa02e99b6a6450d169b6702907eab42ac1ad04e6a685c1c4b1d456","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"83a9501ab9a351386d2a57be6a5798b25b3cf830b819a88ac97be810bafda43c","impliedFormat":1},{"version":"148103b52accf06426ca096431dec13b01d1391e1b74e31e9bf9f346357a1347","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"83492a3add2813b74d557102319f7d8e33b8707fc12c9ce83f570ed639716888","impliedFormat":1},{"version":"3c6c68ffb93e10cbafa05d1d692c456fdf06d3cf27c5d9476909d47ebdae3d3a","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"9e8facf0e67b86481ae0e214b23548fd061a77679e2e105b2d3d25a6cece02ff","impliedFormat":1},{"version":"bfc3592142fdb22c977bbfd689461947a1d8b07c79393bcc329944b2d1df8fb9","impliedFormat":1},{"version":"8822402aeb4a063233855f4f76cd4396b10729401e2e7cc1f9df4067efa2da6b","impliedFormat":1},{"version":"b24a019eb041ef3280b543555ff8e62685dcd072b6fb08a84a4d3b7c16851367","impliedFormat":1},{"version":"dca539ee0ba0cf5d08c6f1fa31eaa758443af53e271130aa36407e919af4bd4e","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"63ec63ef7e15a04536893a6cfb8529c27f9305144d3a4a78f84175414ba0c0d8","impliedFormat":1},{"version":"0b3e368a2c903a9a01e55dedbf3b3b001cfcc87c6814f95b471a22b664f93e0b","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"b1a6f452533bddb1422a2549004be286d47b67e2a7cb3e29c07b5d4081b39b6c","impliedFormat":1},{"version":"da9ba3b3c1e7930a5887cb763ee644a1b53d54c64e2de0e856e29df317b446d7","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"9c6a5b2456c0fd182bac00bed5ec79e6183d833e39e09d575ef02b79cd9fc587","impliedFormat":1},{"version":"2c3fdd77720002d05230e703e43e1843b829624eec62d98acba221441d218de7","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"13546fca010c719f645552ec65fe8796887ef81ff9c164b87e2f945c2dfa4f5f","impliedFormat":1},{"version":"75324d65789405ecec84a6669c494bb1d83b6f2f60b765204efa6fe8a30f0c3a","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"83d8d84476df2f11b7b8fa0592ce59e24f8e622005cbe5b8b47a8a4eb8708391","impliedFormat":1},{"version":"a8d67ec6e9bc559867002ec038bbc5242bdb8a3a6edd2d7c8c9e515cbfd022b0","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"8005227bf69976dac9abe09ab1609d8dfbcf294a952561a8578b36d2b1015e2b","impliedFormat":1},{"version":"c298d66c6cef865b13b07c981768c92540dd743c6777ea3bbcfb01fdc471ab5b","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"4b516a3d1b6e1d51348b427f01cdbad067242359796538158c2666df81f010f7","impliedFormat":1},{"version":"348441b87abf5eec6e978e7190f986fa1b537b187f8cf964d991197bf299d855","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"797eb334b9cc3bb91707b8d685c51171d91d7cf4a1a71812ac511e72480b604e","impliedFormat":1},{"version":"6187991221e2904b665ef1570ce9d733b71daacb9c61b5d4a2d017ac56abe091","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"5f59e91bf113c9bc29b15133935a0817690c74590841b4b790ed966ade5aee8d","impliedFormat":1},{"version":"ee996997d740c03f5ef412f6729f62d2636aa8d37b3918a37d50eced377fb444","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"109ba2d1d1d1062e66c2901209aa42dd285c12b132f69b425943d61a3a7c7f3d","impliedFormat":1},{"version":"a3b16ea5ffc6d926ab8718ff76ad38129983a15fae048b5f88cf49672cca0908","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"eacbc1c0481c0ff4ae7f5775317a3b30bc742c36a47ff102789b04d62719a9ce","impliedFormat":1},{"version":"bb1fd5725dcd44820513abc805b41ad55f199c64da6c8ed0fbdc83a4cd9fff98","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"3dc1774b660c1488a35718028d8b7950a1243fc8f9e73ea675d1cbb106a6de7c","impliedFormat":1},{"version":"df98365d82978fbab34be4e9846ac17f50cfa8163027cb15246ddaad5bd8b323","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"cd261822b576bd2951b6e0c7d95a5a775e39bd8ebbcf1cc66f9c9bb59984b4a1","impliedFormat":1},{"version":"0f7fae244c9d7ff60aa08ec74a08b600f3b1049435b8f9578f7df807072eb8bd","impliedFormat":1},{"version":"02fa359fc3ce884993f77cd7a42d9b9e0a477ea9a616a61b1b324473a98cc65f","impliedFormat":1},{"version":"739c2a6e6d4cd8233ec28e0405dd5285b3fd1ecd52cc4ec14d6a904debb5079d","impliedFormat":1},{"version":"28b1ee66eb57e3d2fdc70cafc5403ace12d140be5ea815161d1ea9a864a59704","impliedFormat":1},{"version":"e9493ae532fb7d73a7a2bd3c89a2037d9250d00042246edf8c01d7a4c417605f","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"e3aa232d34a313bc3d9f10105d97ed87f6cb1a5aaa0184bc0b58d59bf080c8d1","impliedFormat":1},{"version":"f9e9ff64415030255273f471a444a25b8ee52aa32120f956ab3131e674e91bc2","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"775a1cca1dbba7eef3ccc498e49167fd0485a026f749ab1dc16de5dcf062d06b","impliedFormat":1},{"version":"7820a10c711e7f8c128b570e29eb928aaf7291b0bb05076ccef9c466472f8f41","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"94b79bbd4612c8a3882575b0027290657025075b376f4c1b0451a80c3147f63c","impliedFormat":1},{"version":"84a564cb1ce4524a2c06b1dc2a00dfd8406c82226f55add90fbd632357e18ee0","impliedFormat":1},{"version":"08a47f302ec05ff8f0b362ad25080683d7f4d4badbc6b3a765703964a16a7458","impliedFormat":1},{"version":"c34021b33b0f22fde1dfadc4fd83bebad05cba3423280dbf63e4e04c5629aab1","impliedFormat":1},{"version":"a953e6c494893ec56441143e92b4e12614e7bae3f23c1a35f67907d804ac5585","impliedFormat":1},{"version":"3eacac718c33823ad431c3aeacbbacfb2f5461b7b76c3c3e7768041010c83d34","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"186cce1642a9bbdb95910c24b353f79c8ff38510f4c353614617f5bf8b5930e1","impliedFormat":1},{"version":"95f0f3e62870fd1e33d0f1fecc43bf293749b0ccbccd7fa593b790d3491e1ff3","impliedFormat":1},{"version":"3c13c8dbd320c4c017c6b9411c7a58182605a9ea16c410c66f8f6231907605af","impliedFormat":1},{"version":"a25039234a15cec0d831d2e8e6c68fbf34fe5213b054652aae8c1f63a7921a86","impliedFormat":1},{"version":"ce88407a8b27883dbb14ede9c8c87ed29fe7c5e77f2bbbb2eb21f6f0dbcefb77","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"9356660e76102d303cb5258cd5ec6de65d6742b5d8fef3f282c1db7b71143555","impliedFormat":1},{"version":"7cd40f186ceaa0ec57d2f09639c8dca6c1d522ddaeb47b9966915883ffd84a69","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"893204da5072145ddb6ec829f2174941558c4734f9c347d1ced3475789df6988","impliedFormat":1},{"version":"65b10fa18c57d331e75acb7c8dd6327841f31abb2bc622bae6169ad91bb07220","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"a2a59a50f1317bacd426337c3a67b88966caa1dc220b1a892dab27a4caeb9461","impliedFormat":1},{"version":"616d63a8ad1c05ec7dd78da9caec74a773cd423033304e031e72f21467ee3572","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"725bbe020db783cd5a224cdcfc0453e0d15a6773f15d260e15c0ee6a632b44fe","impliedFormat":1},{"version":"6564ef22f1b860914644498bd773d34f4708af2909c137f1d02cdc568805698f","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"f722acc6bd217bd3e458bd70b381549d957b4802919760ddcb88251cfe3d67c9","impliedFormat":1},{"version":"867a048abd55f06e6129d94dc027657c45bf6a1ce9a41dc245a82d1a50a7bf99","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"59f8683559a8d8fb38c5112d1c89594227de508a1da921253c45b27c8569a079","impliedFormat":1},{"version":"ec945ff8d61391a94407b9f32efe4b44248fb03dab78cc3c7c4f5e9aef864f89","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"f7a0f4a9dc9b211aaaf8cea1dde0efab679d81a2d72147aebd0e0ea0f50ff0e4","impliedFormat":1},{"version":"2cbc7ee1e86ff830d0fddb81af522d6d844cf3ea39a6a19689bee405ac896421","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"d11bdccefe6514dd968a679977f9dc725d72980a141e938515a57776879ced0f","impliedFormat":1},{"version":"709a2f645fd6f932e4b060082dd0fc72f10bdc09bbe31950d336672cae73b6cd","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"72713a7085369409be82036f2bee0ab9b8500c2b203c4a98c0d239bf43661cce","impliedFormat":1},{"version":"0cef3af75c9bdfa7e41d09f2d173a6436f7893e62c1729d3c536c918981d64ca","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"12bb50b0fbc6c6578d7d94aa1161ea8c5871596fc7b31dbec8db384e4465d0cd","impliedFormat":1},{"version":"1e9a97e30f74d37d163b7ac5cc9e18854243e73a1addff28573c3cbed5f78f98","impliedFormat":1},{"version":"0f83ec0bab112b7664214e0d2b28392e54cd56d2f7f241977c609ec5822a80e6","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"3f92b0f3addb7588f6eec7694b05c73615d485b11357c910202bf333b202a9c7","impliedFormat":1},{"version":"17b94a5451fd724da5c084f371dbd24f607b5a9037b7d460809050b0b4a432cf","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"f15d55b0b99523c776a792fd36b981d4197c4d49111a380a6ab6407222017381","impliedFormat":1},{"version":"4f1de5451298b2a277802bd7d4483fc4e069f687ff492e83a57779c9a94b7119","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"d51dccc8f34cf9033cc6ca6b30040c2a0364744cc1934cbd06cb8431ed405f94","impliedFormat":1},{"version":"1aca7e5394efcdd0e90d81b2bd0fee0610ccd980821f10d19a10055f68d871e1","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"142d43090764625a7fe159bf1086f2d2a6d6eb65d6388bccaac951108d51e9fd","impliedFormat":1},{"version":"c136f0117b2f3640e25a45182f7fb58c5e3583377055f3faae79c4c25dd2dcf3","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"00241c14c7de0bb1e6f7621b3d4ec74ec9e759c905c684f92f99adec87f881bd","impliedFormat":1},{"version":"d5f463bd10e433ad4bb09ad13b0d8f7bda2acab90e07eb44ebd85052a141d936","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"84f105f5ff7addfd537df60917c56161ca0d5646d5aa17444d64cd634f75397a","impliedFormat":1},{"version":"34b77edeac06aec90aad1de01babf561d2be98dcef200713d9b1dd7a387e92b7","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"dc2576dc39c37cf56dc57c5c6ea1af532c85b80f12cce0058f581d42d95c7cb9","impliedFormat":1},{"version":"0fc4c479838048f5d689d1c4298ad754c63cb6c0853864299a025c8b571bf2bb","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"39750ad81ae2eb98024a093c1d27c34143b62f4a5e591eaed68b7b0f9a495957","impliedFormat":1},{"version":"6a6a55363c3026297f10f703f0c1c12a7c4da612a88c36b2b7bfe7b679826ac2","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"a838c2a11b1aec891328a79d3f990097b9f94ee8e6ddb077152c88bdbc5160e6","impliedFormat":1},{"version":"373b43b42219b5fe14f2fc6478bca619d00e30c0636ed55fcf4557582d4abe60","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"ad7a2fc503d1b0c75167859f5ef28cf34878fd13e7bf92451ab640157bdb1c25","impliedFormat":1},{"version":"4f6ab7707dfd90f99b6d59ade8baed266283d8820fcc6115a3733c4b3fe4c5b5","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"2ccca0381dcfa347be288de903d9b8ab84526ecd57d230d1a8be7e1e94f33e27","impliedFormat":1},{"version":"80812f7111170dd2078dc1cde44b9307ce38418daa5b1b7534190cef3e3ab427","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"b52aedae4d6e3ad3c90b9da833f7804f758ddde4e487b9ac07c605483fa96212","impliedFormat":1},{"version":"6dcfa03db4aea28c592b5fac5fe15816f21b829bd198d73143bfdc642406ad02","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"437a6221974aa38935405db1e97f7871e029cd5275eae29bfc78a94e05bf2e3a","impliedFormat":1},{"version":"c3a3ac4ee1581f7d91f5a781a17d80aeba2d8c6cad4893caba47fdca7b8d424e","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"16adeca7b21152d0a8f80f808db385254f6a28aeb789710d1f3d457e43683352","impliedFormat":1},{"version":"ff93d8d885b53b76d9b2106e47461a1e1d8d52a5c42d27f6c01f4f75dce7434c","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"94f49cb7d89e22bb9176031af9b4a36df8de3c272b75176422638f02ebf6ca0c","impliedFormat":1},{"version":"0a8b30836a4b73adfb037a5b35658ecebcdcce25e0071c5a8743b75a8a9a20c6","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"9002195fb22243160aa6ca62198c16b4ce4f98cfd84464e1370176e49a8e0215","impliedFormat":1},{"version":"0353ab4aaa74b75afe218aba60c831275f71bf43b4ccfc9ac3dc679cbfc7d037","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"15183453c5286faa5531f251a07842ed32d2b05d2a1a464ae44662ce0e4774c4","impliedFormat":1},{"version":"c35ff8baad7726c935f47dd990b459d9d98bc809d544d9c3dbb285501601a799","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"9ca3d207cfd329df643d2b7ff0b29f8f591d32466b96e3383d10230aad1e0cb3","impliedFormat":1},{"version":"76cbcda19831b717be50ce5bb4a98b34f72e60de4d127f8cac2e79641f6ba5b8","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"b09ed4f28fbbb4eae337ca3ab9e4e7c979fd9cac3bc5973272e6b0eb44310f36","impliedFormat":1},{"version":"f057a4433054107fe713403a0da3db685acdb8f4b613875aa46bb020461ae6a7","impliedFormat":1},{"version":"2ed8d9dd8ca3f9e44c94a72ebe68640c8887c89277e20623f22dcc18f7130921","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"8d9460973fddd9916f84a1272591e15d8c57f8a9dc3b130114de4197c663c133","impliedFormat":1},{"version":"61389aabf6b5e726a734078048a51c5f87d255fe3e598e275508f3b83b140cf6","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"bf0977b5e12bb5123cd44da6ca400a65a945e1e2d905987b2b38170bc6acde59","impliedFormat":1},{"version":"d5a4a4fdc5e375d1574629d764e382bbfa8a38a26776238d4bd1788a578f509a","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"5af861f61fffe5a29f51560a2fe1e1c654a152196f7f05712fdbc38370ebd695","impliedFormat":1},{"version":"9b9fecabf5cd82d886b65baae2a849df908932d0ae80d7ebd8426c7f4f20e615","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"df991de1eda08ea3207aa7e69fe6ca471db3d620ca020b168934aaa02ce53e8d","impliedFormat":1},{"version":"c1c74ac071ffbde794efc058cd5190278a3040f82c7c4303625af0fe74a87bee","impliedFormat":1},{"version":"4a654904af29beb52b0c4b0a41737b93712c20fded7ed6e14ac5fa3d7f6d1ca9","impliedFormat":1},{"version":"da7b80ae6603d4fc0b4f9feb5bf8b182e0a14c520cf3bbd58b2dea9753488978","impliedFormat":1},{"version":"d29bfe66ac54c3be84e1cced168e51bef417dd2354f4ae6c53bb054e5c826ce6","impliedFormat":1},{"version":"13de4f27dd40703cdd35b5110d6245b0263b4c4bcb91e37fd4da953d6adcf372","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"96f7a89d5d43dbc13b6c00adbe008c2cb3ba892909d3d1f761f4fbaaf12c526d","impliedFormat":1},{"version":"1f0abcb53b2e0815346e4f952ff8ddbec1308b353439a379f59c52e241312069","impliedFormat":1},{"version":"d3054d1be0faa642ba6aced0607e0a993dc53c84e4520a6c7c27246a656a300a","impliedFormat":1},{"version":"f7a808cf3e7e6afdf0b240c14e237c5b1a375c41f5299baa5dd735192e68dc56","impliedFormat":1},{"version":"089fd8b390aef2171d30557e14542a925c4d9872e015b5acef10c606c06b0771","impliedFormat":1},{"version":"4864bdf7f6a18dd9f4cc84831de953f61b0bf509b1f12fb1c32e91318d3e7b75","impliedFormat":1},{"version":"365361f53d3b02b393e0c7992719315f68ab33fe9e7524b65764c3221d5d8971","impliedFormat":1},{"version":"9db0c9cd4b804bc9306d8bc1835c30a617d918710ce1e97bd20bc9a1819d2e94","impliedFormat":1},{"version":"0e864a2d8e6ea9be76227074533ec1da46422b1a0e859bdccb8bdebd667a17a7","impliedFormat":1},{"version":"c5f3b1070d94a492c210c2c52959eb0547754acfadd00eb661f03accadf58b41","impliedFormat":1},{"version":"735c01f16a3903af4fe8535e490c1df58708f25323a79ea51673cdc8275c9e83","impliedFormat":1},{"version":"529025d77b6a2d901fb3c2d00ece62d9c6c00d1915675b073daab64565922917","impliedFormat":1},{"version":"f25d64856a345515068f8cd20d7edb38f48d5bc57343554e9a1ac8ec038c7d32","impliedFormat":1},{"version":"67b758fcc628b31737ba2268439af88ea7ade79c4a621e8abce14de2cc435bd5","impliedFormat":1},{"version":"9a4aad454d2ccfaabfccb44bd19cc2f3f717cbd98c2feba5a279f8747b8e0725","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"8ac03ab09f97211ae085a968dea6bb9aa0d1442dbd2e3e241900c788af81e117","impliedFormat":1},{"version":"2a1529caf0265923d4650fe39501bbc502764dc55520feddbd492740b157ea94","impliedFormat":1},{"version":"c249cdbb520e30348433fb7cf36e56d9e395d7a620dc3ef4ef2989c8a3852738","impliedFormat":1},{"version":"07829c9fd30467fe94e48eb4247746b9be1c5df1eeacc8e7a21c090655274544","impliedFormat":1},{"version":"0151245ceae3ac8f5d32521be3e8e2ce4c87368fa74d7738ab6bfc8bc5df4b12","impliedFormat":1},{"version":"f30dd9a374c680f3ad70dba4c9bfc0709ac7b5b89676d86ed7a4aefb47952e56","impliedFormat":1},{"version":"a6e3ad092c0eb4d6f6859313759bda85da1f94b7d5972160357f515a9396f736","impliedFormat":1},{"version":"669001877ffd8a956fe335883560a4ec67a3bdd456a07174ad88fd5ca4eda733","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"37735d9a5e3e8e6d2f5f9492529ed5db74d1a81a9d197e8aa810e3f3ca0e91de","impliedFormat":1},{"version":"d82f5b60476f1a878cbd7dcc82bc956e6b7630d3cd7eaec6aeaca51627eb9ac3","impliedFormat":1},{"version":"7a0c358d533807c6328dde3bf98c3c4de18848ae75b80b78f51ea7daea355226","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"570320bd9eee7ec9ee519770441f1e3876fe64a7509de6a0b168dc0ff2c551e9","impliedFormat":1},{"version":"dd269e82a2e33f7d141cb31248263056bc5e69fa6c10db587a4e7fed83807407","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"5ed038884d77415d1f68b79a91a9cc0b40eb4dd79b47c804e525fde30ad2f447","impliedFormat":1},{"version":"f4cae5ad7b13b0b01c533857a3717a03f12201bd7014d149fe59de93725530c4","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"da98ce93df61216339b726ac4574389de47b6f331767f1fabb94c6955b8785b0","impliedFormat":1},{"version":"09ba412bdc60cbc138020d2b49adacd0110b6ae9b3045896a0d9b3d64371cf74","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"d242588c646c2b99d460ed3a5ca962138a675c45f8c0eeea7a868daad92fcafa","impliedFormat":1},{"version":"7f01c449e42effe90439058647e29e7e6cd22eeb11366afbed2f0d684fff15da","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"90e0cd793c23d0228cbd0e743850ece21655279c4119e5478aee8968a8ff2f2b","impliedFormat":1},{"version":"745b9904338b4fcad6f38c37a0455f9f638407d336c8f1f9efef2ba366d7614d","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"56d0753b62b2645b4e3c6ae39669390dbbc70878f4d86f34f225fb6920887ea6","impliedFormat":1},{"version":"381ac70b7c5b906f692aa7847396f2ed31734cccbe72b640853aa02e677fc3ea","impliedFormat":1},{"version":"be13a81b165178aab79d3afc1e0b84f53f3545d250d4bb896762f33d103b9096","impliedFormat":1},{"version":"2be2a70273d5612aebedffa0a2cffe60f29129c6170dadba0a9bc08033e3a507","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"c6eb2ec5a6b285f889df463e582e55fe2a6b311f0cdf94af031c09831bcf5916","impliedFormat":1},{"version":"4c4ca22b3fa6ab8573d3ea0fa0c4b83d9f73f308b8ca05c541627334a41ce535","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"614d165b484a7d067dbe286812de9d7e6397eac707424e4399960428de7a22ee","impliedFormat":1},{"version":"d893bde9bd324222b901791978d1d38d3303c467176ec119c104bf8917a05aaa","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"d2b641441dbc7be1b9dd99e74ac025bdaa8a6350466b8f5e08783fa4e262bcee","impliedFormat":1},{"version":"ec80d72da05254283fb295829480251a4511abc79f8912ad9aec209e25329d46","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"5cae006bb3978146d4059fc9889f6e030a9f651cacb37fef8ac8c4db94f1a73a","impliedFormat":1},{"version":"576fb5dafddfe7c7afb2ca5a687e78e22e8d50c3181a747a4bd65c5a17050104","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"882ad77f2c4fca8c3f4f0b56af0e6fffa6c1632bd00dca167fc3e680319f5622","impliedFormat":1},{"version":"bcecd67f060fffeafe8e4343a4b2fc427155ebde7d5adfbdc4d40f4990f98fa5","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"c8e70ab6a762b2514e805c8659d7aec32f064dfa9a887dbb4d3a46e2d0ba72fe","impliedFormat":1},{"version":"068b05dbed7b6eebf8eae4ddc35a7f1b4834ebce04a76f26ae757f89bb10a5f1","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"9181b0aa91d55f3faecbf2ffd7297991021d73d3c6167c164f3dbfdc8133997d","impliedFormat":1},{"version":"33283ff795da287736ce9e32bffe96f2750ea182d5baeeaf331a5b07d7191d26","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"504e0c3a835143c9241a16ed97094e0f1dcbcebc22b8dddc44c9049785b4ec52","impliedFormat":1},{"version":"8fdef526dbb6af6a6bd4c845f98f30f2368c0292488089a9df37895b30160761","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"dbcf976ccbdf16bba2de5fb396a445bfae5975a98ca25f96e8d2bc36b73132cc","impliedFormat":1},{"version":"2a057cf8dbc240dee8e4c645078a27614c89215bdf61075ccea687d9b4268b1a","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"f81c95362496ae247fce3ab030751c766daa8ab2f979f13ff5b35ad7b67c2e97","impliedFormat":1},{"version":"298b3c2a8855badf43bf90f8e892050534d918cf85f54d59f566bb6c21bdcfce","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"44d743ea3690b6dad34852685dfd71d3a8815a4af8c5206d0a79f9e2f2a3fb5e","impliedFormat":1},{"version":"e90381f4b29835866ac3f4e6f023a3865580219a6111ed74a927149e1131c045","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"ef78143656734b2a94f7be3e2d577d0dd458fd01b8829963318b824da884d11c","impliedFormat":1},{"version":"65ca65db50502c292fe9ce7e57f77ca4a7b4e7f57183e0b22de949e744378fcc","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"38d624eaefdc4d39d2868cbb8fa0f317c422b37cb62f101786b9e07c735e06a2","impliedFormat":1},{"version":"76a5368dcbeccfcc2d1e9fd7a109a8108bf8e752bd9d51644011d4a3ead3a13f","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"f3603a8016586ebbf0c6ca701a91a9d34e3d0d5510abb18fe85e14db64a29278","impliedFormat":1},{"version":"3590851029e6db643d1f8f7ef279ecd25634d5c74bf67ad0af7667d43ec6b447","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"cc02f84818cb0535a500d94d072ebfa90fe5260ffcd4b16cef3e223738632f7c","impliedFormat":1},{"version":"f13b9a7667bde84d2581492ed7c0055128dffb108a594f9cbb8518f89a77012d","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"320de0b2fdc2f22dc30dd1c6b879615ea5e464753effdfdd33ae3f3b923112e7","impliedFormat":1},{"version":"34d97a92c32a06ef61ed3faaa19db85ac3359e0afa319638e8dca71f00e6080e","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"1e469453a7bd23fe283a5b7049c04c618e36df78f5ecf6712eab58543d19a616","impliedFormat":1},{"version":"250990a6eb9aa88fbaf9a0b220deb9fa5f21930183a275f7c5835c5a7c294460","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"095617a9b0cf44bbd27360ef32cdd681ec92c2d08db36ae443bd4f1b97a2f674","impliedFormat":1},{"version":"6d3b03d852978fcc31250ab65a30edde21cd66c4b89b0188b4ae7cb638a0192b","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"6eaa62372e925f81478bb8818111b54edbd9d0f4ecb69856182f1c34b3dc0bd9","impliedFormat":1},{"version":"fcc11fccb2bcf5f21d7c8625aff91f73a78dddd11bf620dd1d791d6f24211e6d","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"00f8cfbf91a13faa2e9135e78cf806698ebce069f0d39611ae9787dfc53caa25","impliedFormat":1},{"version":"58cabdbc53f502a5bf67d44db1c7efd8e8b018f2770fcb066425c10fdb2a34e0","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"eee0659144ac0258cc72150fab67c131433f00e6909d64515108eb64dd306a2d","impliedFormat":1},{"version":"4d0a092e21ee06cfdf63a03c4720c01517e325d7b8fb0c6f4a7aa7bd60c87712","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"c33ef29488c5a0e0d795d341db056f9e3c3b5ee3df3cd053e95fe2147c58fcbd","impliedFormat":1},{"version":"0b0e80196eaf477550817a1fa54e162b2407673fd9cb75e97c488621a00ab052","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"bff9ff50860b4b3a2a66444a571d6ed65a873479184b10b1abe19af5164812e1","impliedFormat":1},{"version":"def92fda1d03acebed9f8070d853be4c7df42839b7f11cd30d033d6f6b406fc1","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"c87600db422d8eab8ed5f0e798e78fc2f19da5fc2c7fcf6da4421f4f64dc12df","impliedFormat":1},{"version":"817d70ef5a61989044da088f581d1374e8f7108280540b21207935d22c8f4bd6","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"6f0e97e86913896351d2717120f14d425703e111bdcb2b2ef57a9c22d2505bfd","impliedFormat":1},{"version":"0693f0feb218cabc0b36ad6c8be793db94df35ec6360b1b71bf12a7c6f483835","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"b919cd35c607aa297f25cfe0d4aa4591b81393c1345cbb9a9bb88be7a6a8a013","impliedFormat":1},{"version":"08281cf98aaaf92bd8acb78eb36eead8b5f7943fd9bacf3b85613b523ce16d24","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"f07a895b5db6660c5e1828b5a35116963ab6034d08823d72e1682bb818de27c2","impliedFormat":1},{"version":"1dee96e6eb1ed7de6e9f6d8196b657fdfb36ad3f85cb7e3d5b70f84a2395a747","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"630faccdf8f1f24a45250ea0f19f2d31824da1780cf809fb3214b3e2462bc8ea","impliedFormat":1},{"version":"ada828cd364697393f057f4bc9188fcdfc532e50c7237a9eb5d01aeef267c25b","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"4dddb18ab11b604ba3f5deda876527dd03a48e9e3362cbc8df6b1e7678f0e494","impliedFormat":1},{"version":"734018b9908213c55c2f63ea439395e1ac8fd9c16da1763814d41242bc145444","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"840a8940d895ed976af95acfa3ebefcbe90ad91b06b281e083cc84839c531420","impliedFormat":1},{"version":"ea31b6159f237ff23fd3a5881f44367054649eb814880940f44fdfe936d1999e","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"9bc435fdcf9e036c4af62eed256b0666cdbc35a0d5ead4c733aaff1d30dffa88","impliedFormat":1},{"version":"5ce42bb60ca788b1fbaaead67ca59179daa508342034e70ce400a6a32b56d3f5","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"b5669ceac0b69fc73dbb0a38802f7bf398c86deeb2c09cface8199b7ffd80ad8","impliedFormat":1},{"version":"91f3e1235219381e04906da47ed516a797081576c45619b8860144c0dfcf692f","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"f0df26c47dc15715df580c8169b8509ca82032ffe11f0ea0d971ae66e11a958d","impliedFormat":1},{"version":"dff10b8d8049ade0719fd9a692f5d45ff35f29b8adefead892a251e72c53662c","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"f68a633ef859a67f3ad7197711c5e303b3aab6f1ef82bd909b6523d40263422a","impliedFormat":1},{"version":"2d0b894427d0c0c6892375e0c830de267573103e7b24b59fa03cd7bd060383f7","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"80f3f800c2ed49dd4e6cc8ac89f8cd2e0e68c94f24a5b2c85f7b93d7fc983bf8","impliedFormat":1},{"version":"0ee31e69b613b768f4970eeae8245a02de88887a3a9c4db1aaed23d2dd3a6830","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"c6ebfa5b30f8a274ec4f6790e75613ca80a243e5d7afeb20825f1f9bf2385f94","impliedFormat":1},{"version":"84876b3da6df5ee2206eddcc76ec7f0503493ac3d8ff71196823cea8884dec0c","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"7227b347d2596551727ac1635bec6801473213f78be0b494425c471a6988d42d","impliedFormat":1},{"version":"8667e43932dd4214e53b26106e4dd0c8f2543301966bd9269c76c3665cf5c497","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"72014357363f632195e5df6935b4cd051c7817986b9f58cec48b5d9fa0c7a08e","impliedFormat":1},{"version":"0de084d4c527e789f76894cbf764aae9783f862392b98d3756041744c8aa7156","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"17197643f1cba29d6e29deb0cc77d460df6a14ea0ddb69155f9d93aa70d7a43a","impliedFormat":1},{"version":"03c0462a4395ac4bf3cc61b1c4b45bb9d69e8f1ad5b9f8f621dd1a318dbc6623","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"3a10f4a1ae37399e99e0e8be1a18bacf9903cc81c141975a1f68f758253c3274","impliedFormat":1},{"version":"a5a4abe674d16589b82885b2d52b7c5b272cd5194358147f538c68e941389653","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"e31d955f0fe10367fc35f74d93e879c2c3744b7898904416729cb2ae6a6f0acc","impliedFormat":1},{"version":"b9e198a4c326422c3df2ee79a79ec9b24fef125f66b82e1e77b84f09d8d88569","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"87ed8cbeee6af25c599ddf851b5f5b2744765608aaf75c4846b777e9026852ef","impliedFormat":1},{"version":"4298bfcbf77b0dd19c6859defaa64389afbfaf2ec4160f4a16600da3426d1931","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"1e9a553a29b3633a96847edeb69411144f177a3a5d6e2c432db235823b6a04d3","impliedFormat":1},{"version":"4a5bb6836acace4743ddab61d5bc4bd92f6a69a1572b82c6f83019462b8a58ad","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"1169bcf0bf762ae15d7c8060b5213c13b2711075e53369c0af55fcf4c6778e33","impliedFormat":1},{"version":"b2a8fba98f2d70f6f594186f91b4b9547cff62f3c34a90fdeb74058ab4dec5db","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"5c6995d85801524a0730847fe5cf4dba4bdd06571048d5e8a376840ff1c8a8f1","impliedFormat":1},{"version":"4c9544766b453e344c997a47bd979683cefa2faa358c09154fdaca020ea0deb9","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"b28d52b00beb991aad5ac920ce26a7744d14ab0e52fc3b82fff6ebc7df815693","impliedFormat":1},{"version":"1409f60f1d19e948cf40e1574400e4571817324838c993d1bbedd47e4a3a551b","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"862f47b8949f4330349deb9643483da8bee87a72bfd3bd548bedb4c68727a555","impliedFormat":1},{"version":"c016beca4f8d5b2ec3be2205523ab838d4d098d12b8b2367eff2e35811b18e8a","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"21c50a56b8aa3aa0af09b934e60322cf7018a493ea3587da77b19c64d23f762a","impliedFormat":1},{"version":"f99fae27892693b33acf34877e8d4dd5b2c675a792ec3628b487c8cc9c44e341","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"9a21886a9d185290ba5c73c3816c9f3139101a936be10389bd1e0c709e01a577","impliedFormat":1},{"version":"cb566583c0561acf66ca0cf52a3981e27ef4fe9d3524c3e44e7ac77e90beb708","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"e89cdfccb4c0ca278b7eee6d63ef3de0995f2a0ad5b15a44095c40f0e0fdb94f","impliedFormat":1},{"version":"4249dd418f2e684b085a7dd112631a485491640fb41075110b0a7f049a6a8093","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"396127549a965bb020b21cd121f77fb87837d45e553c87a79654a9368e6d3788","impliedFormat":1},{"version":"71bbb12808bd13b7f665fe3deb8d2bcf4df3896a8615cef6d76addd4aaa617fd","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"e879dec591d89ce5b88bb0a45078e931b9dd30e790078b81500443a1fb3692b0","impliedFormat":1},{"version":"de7ff3e06b934cc8d436450790f11d103993de26f5d171293e87cb4f080e38f5","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"1ea0c733cfc95116d04d54e7d4a0f3a096cea78b919e26a31ed32eb61f2cbe11","impliedFormat":1},{"version":"71b8f23001a1cd9f7a9a25fa62fe7647978f0e3a5ce8624457914a7179cfeeac","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"a6aaaecec3ed34571eb5e266d2dd96c7f4b314688152a052f338a37161c7a352","impliedFormat":1},{"version":"68fbc34a20b735bc39438cd8a6d07b2ec6524e650f199106b54a9d825b0e12b7","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"e822867b00818b8cff32632f2b0c51bc6c1307dc0b8d18842c20ede6fdbaea1a","impliedFormat":1},{"version":"35bdfe5e4554c48d97b06e72bf734cd9357b96177a6a4d7df14e104575ccb7af","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"02c42183c6b9bcb299245ba3511633c51d6b92ecd247911d1a70c4eccc548b51","impliedFormat":1},{"version":"22d425b508d45ec864ba23f3217ca812b6258f3c922eefdc4c5014a1c154b9ab","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"1f8f7ab93bd1a31e49d89410be1730fa7a7eb4ed36b02d2a97be918474d06a99","impliedFormat":1},{"version":"481bb4f159631580c41bf756acdd5a5be5b2514e10284dca5f9e1e189e3cd484","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"ebe94533ebf621303b030c97110cf402495ba1163022de98472a6a8e09840db8","impliedFormat":1},{"version":"0e4f51acd002599acdd8e984d0b4fbc430f2c45e31ccbf9d82e5f330048afe38","impliedFormat":1},{"version":"3fb6739c61f005be361344d4b3265ab7cfd07acc2f8cd2380f2f3e5cf555e167","impliedFormat":1},{"version":"1cd23e136280502391eaa0bc271d62be3cf396fe1ce75d7bee256567bf92e6af","impliedFormat":1},{"version":"3325cc5f88a83ed0462dc93b47dd3979935c1408ebd63ced03014677237e06b6","impliedFormat":1},{"version":"3272575d9a61de6ff61f8565d24ad19abf63e71c9e3791841f7c08916afa300b","impliedFormat":1},{"version":"46861a3e8d9dec9d6bc1a2378fe51c84a39d2392341aad5da912c19b396a7cb6","impliedFormat":1},{"version":"5ddc73131154a2690c68654a97d3ba0c8541079b7b769653618b44f2e1461691","impliedFormat":1},{"version":"b88f07699607608cf655362ac47a286c6f1789eda961b946d59b23d42a2267da","impliedFormat":1},{"version":"e6b3d94dd89c4ddb78d4d621574210c3181fe637afcbc86e00779d04288dc3ee","impliedFormat":1},{"version":"ae229e4da11c6793f932437c50013771980f345b7b7100c4822649c68df6e9e1","impliedFormat":1},{"version":"7cf67fd3809f890e6dfda7c6e2d2677d18ac5c1039df14824ddbdd6276d47ee3","impliedFormat":1},{"version":"1266397fe837d98aec579192c840270bda2de1e2202506768864382857ec48b0","impliedFormat":1},{"version":"ce2c820804efd76afd55776167bd60fdbd6efedce6fb7973170e7f0db635ee58","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"c84d4369112fd6f8b031f259feaea1c652213e9acac64f1c8c5b7acd99ba17a2","impliedFormat":1},{"version":"5029b93398f89fc2e290877bc2de0b682d83d6ee4c78cdc0e4b202f28163ea2d","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"7b7d08c45f8e4d03db0e502272c96e9e0e46c392ed88b3b00b369c750f0db3fa","impliedFormat":1},{"version":"33acc934a28a9a3172e54f0205616a3b6d77b2edaa6c3d6b6f4cf67fde3dc290","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"bc97882000ce988d0ca54fc5161e94e33bfee73f7a4821b0154f744e6a856d6c","impliedFormat":1},{"version":"3858cc7c42f9cc6c3ce9257e116ebfcff3bb53820ab587e75d925af5e41c9893","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"33c04e655e7c2ad916b4a990bc7d01caba497c1a17d1cc9568f90d749ecd95bc","impliedFormat":1},{"version":"cdd450e7ccde080d6070661d740516802f79e14ec223ddfa0718d580227ad2b4","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"052bc95663bbe485b0038a48c9f1d5c3a681989d283db49d2c7af6c02f1b56a0","impliedFormat":1},{"version":"7d3c4cf97ccbed885a3920b29b838008741bc1b7a20e2706a760baf08970c8b4","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"130e6910b0f50e171724f201424d6fe218cd16dfe2a542678a70b2dd7c5b7f9d","impliedFormat":1},{"version":"dbebf996cc94b0e30c9ae0fdd346b0e3449713c6bac25c3e06975594b931aa90","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"8dbba209b3d4023ebb2cda5727632758606fccc674fe4b1acd5d5921fe65f3e5","impliedFormat":1},{"version":"6e143ffddc93a254718d111d496bf8349999725c95ca4c7fe48c5829c7d7b9e9","impliedFormat":1},{"version":"9549d3897a245fb6fecc3b242315192c1bec3aa60114ddcd87dc9a5b9810a8d2","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"0b598c1b19dae68093f1546a978162974c7e966c8ebac2ce51ec02a5581e3121","impliedFormat":1},{"version":"ad637d7c4f7a7a28175eed252848f2a4375e18de56060ffb7ba23d2fa1e43058","impliedFormat":1},{"version":"e92b6e584878d09330e56f01e232595dd7860d46af2c33cd085ab03ff62b3f2c","impliedFormat":1},{"version":"9a6920f1268f860d22f87f7553ef159d41a15c138856e2eee5a937693d2c7c1b","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"99ac148fda35e8c451189081e71070327c7eaebb86bc5be63c8f26c5183f2d9e","impliedFormat":1},{"version":"1e248ce1c5dad9c156be789fe92ee9ff50c8958e1a3947b192d2802a8aba1923","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"9bec9180dea9d26d27db4bb49deeb65730a5e1c4a3ab45a2ddf376ea137b1dc1","impliedFormat":1},{"version":"852291bf1379a4492792cead416711bf74b8687e775a4eb09ea82a4d81d05dd3","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"c387a53d06e06825a3ffda9c0dfc1b75e64f381008fa14436eb47eba56262b2b","impliedFormat":1},{"version":"35426816491bac6d605000fb1494ec291622d2a1266c7d47a8fd7bbfa735c5fa","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"47737f70061061bc7f3d824ad2efe0765751953c7a251a14f576101cce987b04","impliedFormat":1},{"version":"40f62bed3d189141b2453fa6ad18758d0d5b5bebaf03b8bd7a73ccdb342c2d24","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"e06cf2089ae9544989cb447364630ed1f953b6c8c03863491427fb15a065927c","impliedFormat":1},{"version":"905e525edbd2a01be0ee8047221d8690d962849f970ea25eee9d971e7632aa57","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"d851859eb10ef0887fe881c204878816fc661a91c5a2acc4dbda88b1bb798e35","impliedFormat":1},{"version":"a49d0ec0a109fb7c16fb9acf8ae66d6b760f89cfb631e1f5fad52084c8e2ef3e","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"76e3a6c785faba89f3548ccfc6031380c41d648732c9900ace2283f9f524e79d","impliedFormat":1},{"version":"65e3643b28b225d7591169edae1245ea8512bc5e7bd5803ba800eb0c5faddab5","impliedFormat":1},{"version":"e90f384d5c80644fc25b12b593493fb285463cbac9c594d3e0052d0ceabff87b","impliedFormat":1},{"version":"01d6f76cc5925ef8eb3f566d22c09e9e6a6510d4539e2daca95939dab437e458","impliedFormat":1},{"version":"674ef200e848d29f3374dd5ffb4842747d0549c0348809d9cf1778865c5539b8","impliedFormat":1},{"version":"cb014223ceced624845bd39513ab9038654fc1808917a69a4eb4c5f243482f9a","impliedFormat":1},{"version":"d2a8f492f939fc3571ab6d2aa321e924ed78851acbb86b41b1ad75a3f38847be","impliedFormat":1},{"version":"270c50563b6cd84b1f624071ad5f84b0be9fd46793005e547c14dee87180c6a2","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"0750bea6cf4510e0c5ba099fe06e5846497ef7a286e79210623ef9e869f430a2","impliedFormat":1},{"version":"8f8a28179a0e154b804af6ce2b91a1bd95f01a104cc764ffdddb2ef9f1b8aee8","impliedFormat":1},{"version":"dd0c323fd01c50ae039e91e4eefb57a612b1361af9d7d3d849ee69ddece65912","impliedFormat":1},{"version":"66bb15920fe305a72a27b15fcb6057ab0c768b9bfb0c2cacbe641960ffc7d73c","impliedFormat":1},{"version":"3a7fc81492780b9d457bcfc1c03e65f1b6ada1e4f5d1ea53981dd4278bcf7550","impliedFormat":1},{"version":"7782f85723415b1cef101c9411d40286dc688cb79f19da2698031cc42f3712cc","impliedFormat":1},{"version":"3811df4785446c9472e78c87da2130bd518ab43c0854e2392c3b302d85fbdd2e","impliedFormat":1},{"version":"7c53d23e14b7611852e67125cc15041e20f7fc07041f428b6c73e827ba92f70b","impliedFormat":1},{"version":"a35a8d3e0bc37e3ad8b1ae62034e16998166219c541acfd61dcf7f9bed83ecea","impliedFormat":1},{"version":"17617756b24f165e2918ee4d8478e2826bf9a48e7e9099cd2e0ebd38cc8eb678","impliedFormat":1},{"version":"92406174c53a32419b9d2ffcdf48f631de23c688f94bb4a60033f686da35477d","impliedFormat":1},{"version":"6eb8b2a515d86c3902983bf103e49deb313a6fc19e81b83b189b0ba9851f00bb","impliedFormat":1},{"version":"b87d4eeb5dba89f23432ca5885d9dd19ef82548cace249ad255ff168d7d40ba3","impliedFormat":1},{"version":"0c4111e38d2fbef60f6feb73345e9e078a4cc15a90f81ff2242cc73734de0cdc","impliedFormat":1},{"version":"12ea7fc55466aec6d4c989b8a1decb21ffaa1f8f788469ba10483c2e730d77e5","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"011cc0d4a3a7eb3b20d2b7c7b831a0b44d32a3d0b9fe7a78589ef3cfbd03610a","impliedFormat":1},{"version":"10b398b89a4b2d02f3ca03325bd7dc99d9765b48c928b36aff9f1f5bd9e31612","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"683845f0264a85836d55179775d481152754592010d688bf7512077ab36e2ed9","impliedFormat":1},{"version":"86505ce6409a8b9b17f151dd65287af80833d57893b236f23443de3c5130b935","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"d2df25b68c013411418bf449ad3bb32edb71f67f676db7c5c36de522a45ba8c7","impliedFormat":1},{"version":"ffd2eb27a5fe81913a503eee069119d0c31c8acf0e07fcf5d43a543f9c9b3bed","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"cbcc0e75accffa985e4fa5fab6df945aec7dff3ee8d4d332f81528fd8aa29f8e","impliedFormat":1},{"version":"c94d79a4561a26d851b6ef38074c4c24a21f260fa79277a3ac6b66dae513eaf7","impliedFormat":1},{"version":"4fdd838b49be5f1e00858ccc3b1b1fa51a9abebfc1500054e59ba1359fd98b50","impliedFormat":1},{"version":"c7b8d7b11842cb0d0fc3e5b70d53e1be01547df877453e15043e2e074d685993","impliedFormat":1},{"version":"daba287e9cfb66081b97c9567ca7ea5c70bfac6ae846bff0dd42f3bef1dd3c16","impliedFormat":1},{"version":"e22f1717172230682d61245fca4f5895bf26a36fe73cfcfd5c3e5774e19b3785","impliedFormat":1},{"version":"b76fea03733623302ad4487fd91242612bd9ed29fed3c7aa33018d5be750b7f2","impliedFormat":1},{"version":"444b211dc94876b6e149365f956ae5705c756b0592a80fc28a50ce57d7eca4fd","impliedFormat":1},{"version":"129e8f82e8a4b0a8b7f7df7b24d1add25b575162550f8734cf879a7af6583b82","impliedFormat":1},{"version":"4b1dce0592a214c2d486f2afdc3e8ba7705dd5b7491c8a07f27798dfb4897bb6","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"0e0aedfc4c10d650b1f16190bf9a1ecc728a1e4cf80ef2f6be63c8c560f887f4","impliedFormat":1},{"version":"06499977dd4d95bbeb82b40532f0fcc76021c4f9f73a6d62a9b0227a52cdd2f5","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"8c7108d28c3fe38023affa2f1e378ccf8f6c5d5c0c9916e9f9bcf9f14f07eba8","impliedFormat":1},{"version":"52387f2d29eef706187a0ab12ee06c9e8491e8902bd06db865fd353f2c55e2b3","impliedFormat":1},{"version":"ae1b97e05249e7b592fc7a91f51c2d8b72365b90cd67bc066531d7a18ccae414","impliedFormat":1},{"version":"86445c66434f17afa9610da08e9ac91c56dc18567de72151f7dbeab1baf8dfdd","impliedFormat":1},{"version":"1187d5f9e0736164ab5e085a0fbbe140b7ddfb0fe6ea9d6571e299160149e014","impliedFormat":1},{"version":"d31ff9e2e3e71187aeff4f646e02cda124bb0acbfbe34d17c351e86d003de290","impliedFormat":1},{"version":"147a69deb83a767e74b5bc3019b4db95361c25831f360a01a10a587fc87f9056","impliedFormat":1},{"version":"d0fcaf111d243b1f96e99f96121812a82dc0ae4da20990e8e24bc285bfb49869","impliedFormat":1},{"version":"c1078a1606e5e46b6dce02ff3202bc464074ceba86d5179669cce474e1a0c321","impliedFormat":1},{"version":"b4cb0d452db230724d5a5960fac207587ddfb0a627cf40151762088c435bd641","impliedFormat":1},{"version":"c53c7af8cda7320e0630de68dda015e023ee49147efd6f674189ff80a076fd9f","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"88a71b354a4032a0c5ee9aaf4557f8bdda2edb977faad29c0db74db51632f041","impliedFormat":1},{"version":"49d2c7bae7b3eac505f43b44d278f8be2f8bf557f2cab317ff9b2cc8edc4edda","impliedFormat":1},{"version":"df842ca04638acf2eadde00c1ef6a927ce2ef9cb11d27e98dae1e5f7ba3b04cb","impliedFormat":1},{"version":"37e12d36308483c01c2430bcf067070eb6ee20f1b8c121101022a9f9f89522f8","impliedFormat":1},{"version":"51502b7968fd66098b533984e8ca4cfb3d9d88750868f0cddcd4aec64b865a5b","impliedFormat":1},{"version":"90d01de656784730a744842dd6e606d55237b7749c6c740b9d95aec9c240b250","impliedFormat":1},{"version":"0c12fe60cab20949d4da5b0f4718ab1ef16cb6601dfa8406d7bb8f2ba801b002","impliedFormat":1},{"version":"74556c9c970f263cbde0d0c2fbc69c9cf41e757b384f609969027b8de6eea961","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"d5e815faf6f14ff4c712efb61a3e612a82dcbbfe5fc9c0404a9f6ea5cf1bc275","impliedFormat":1},{"version":"8b5b76c4f6f828c1ff5f68275d28cfec36856de78aa7b2ef07437bc0e0299e1a","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"f3fb72fcfb83dda9c1c6b2b3a4d89bf64eabf0cc429eb7fa9338c1251fd75782","impliedFormat":1},{"version":"15d8f3ae6c0e485c7e077407344fc850c2026a1fcf60c06a4b1766f6f91124bf","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"d76ede30dbc272b9b29d00ba21e4b6bc32e32253240e816d875bfcdea3eb287c","impliedFormat":1},{"version":"6f8685467088d61c9993394bfee32f24fc3095a6a77ca72edcf1586d0deedfa2","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"ccb34bc77cfb9491d375447276d6a4aac3a05ccccaeb9884ff5ce622ea713b71","impliedFormat":1},{"version":"10dce9c8f91197fe049045716c411ac6f2a6c5ffa5176b90bfc7eb46ee29f751","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"e7f1997d28a0925c51ed754673b676800e52868205f293cd79d3a69f12532047","impliedFormat":1},{"version":"15f34d10fd6599d048a04c22b9db67ca7eead0ccb79fde9f76cc2a0ea6b3af93","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"af1ca8bceb950acb4ed0ebf3a90a716bc851730c812f176099f5d7373f22f622","impliedFormat":1},{"version":"d68db94fe8599554dfccbba60b25fad3d86d2889061c6b2a17c001e6fecc543f","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"1c792f2d0413139e69e302c2426fe20b51181e00a694fea7f2ec8ec6ab881145","impliedFormat":1},{"version":"71cbf7aea2af0bfe988856538f6210fce166533dbbaf99771ad0171f68c18a9a","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"229037ce6c089d932e0ed2dca11f68005650e415bd238a452a8cc68c2527b6b5","impliedFormat":1},{"version":"00f71d5bb5feb2bfb3ad1adde5ea660d5ddd9ab2f0f8cf75852b3db68abbdc60","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"ee978108539072b2f60be568298f129eea9e5a0cb92dbe8936480fcb97a9dd62","impliedFormat":1},{"version":"ee978108539072b2f60be568298f129eea9e5a0cb92dbe8936480fcb97a9dd62","impliedFormat":1},{"version":"d585f6ecb22b18a1475e5e5718e191d8b84ae1d9d1629a81dceeb60cabc9a751","impliedFormat":1},{"version":"aad23f1e06e8f28b13e6cec854005b73148b1a6e700957fb188ba1cfcfedb96e","impliedFormat":1},{"version":"af89bc5638270fd3b2e4d21208e69d9dbdbbc21d643c980bd3f2f7830531b2fb","impliedFormat":1},{"version":"c05cee74a73c958b78021e848b1cd6c98549e8cecfb777dca0323dc156754e6f","impliedFormat":1},{"version":"a5841c2c1deefc62718c79ca1d8977a6a34ada5d3d65b4428af8f95d4fe6a190","impliedFormat":1},{"version":"1b5ea2eabf4941e745af61c0cd96f99b46f9c6642cbaac43bb457d209820428c","impliedFormat":1},{"version":"f5e99014eaa4078fd785c9e6b07b894d2fad85e051daa5112c38162e144b5c1b","impliedFormat":1},{"version":"b1ae51b7a8477ae97817844145f9db1cd9e74ad909c79c2a290c9e6abf59792f","impliedFormat":1},{"version":"eee11552836a2ddaf990f232266fee43c9378b3816a09ea504e6eeb1ebd1936d","impliedFormat":1},{"version":"607135f5566b393ea98d377b91ac4e0b39dba087ff89209320e9784873f553cf","impliedFormat":1},{"version":"607135f5566b393ea98d377b91ac4e0b39dba087ff89209320e9784873f553cf","impliedFormat":1},{"version":"2f2d1bc7f8ec225993f08b3280ffd3e5491e00116db93f4c383a8f4c21ff970a","impliedFormat":1},{"version":"7e14760ee53caa1d70879d4d631203aed085f16a3eb825dcac911638d32cbd46","impliedFormat":1},{"version":"0da718c425ff0f81f5d241e9162246f3df2ec448ac50aa7230f67d74369a30dc","impliedFormat":1},{"version":"a22a4cdea318a34cce0e7e6156c6ae9a6557d83a73265f724276a47cc0950d52","impliedFormat":1},{"version":"e9d3e63b3fe90b3ce28f85eb6239639dd414ef4ae7e7d1f3a566a40b020926c3","impliedFormat":1},{"version":"a8b3f3d7591f0e60867513e9bf0b8ce9868e3a4b54af77f5584c0c80518f3927","impliedFormat":1},{"version":"492f1249b49a5198cac245e65a30efb9b3dcc2a4faad5e3b0b59450dd65bac40","impliedFormat":1},{"version":"ca1a0f59d580becb633bfc123da31fd6e1be82a1cece3991dff49096273fbbbb","impliedFormat":1},{"version":"1ce7677acfab272e7528c9cca3bcd0020ef7a20b9312d41f7bbc58bf41fc1340","impliedFormat":1},{"version":"f5f3f7ac2883b5d01a5bb651170f6491648a41a0d3581c7cdd8d3e7e2bee5d8f","impliedFormat":1},{"version":"4830c8db7ba2d3b5eb4dce848db1d1b6df61c10a77edde62cf6f7234b73bfb33","impliedFormat":1},{"version":"aeaba650efd1db6dbab5dcf7689e10913b0894b3bd669cd33915a358e1b593aa","impliedFormat":1},{"version":"6d16de501ca946e4c74f4d8cd99980b2a4e6f6dee11567d54a6efc559ae7a658","impliedFormat":1},{"version":"3ea96fbd2f10df6905120b5cd88e6e0f757e1a40f1eaea73e9d37a050228136e","impliedFormat":1},{"version":"cf397777cd807e79c5fb0890550aec91e9d9c911c118fef8ff60d99b5b1c7a5a","impliedFormat":1},{"version":"08de8b8369ff265a8895e24444a930c4730396ea4fea8d580e4c94e83888a04e","impliedFormat":1},{"version":"0e97c3e32b2f16e102ca76e81d24d3d65e34d4bd8d90c8708ef3e039e01ecb16","impliedFormat":1},{"version":"3fcd92c930360cb817cfca7269196dbcb8fd3011d5ea9001fce0f6c62132e833","impliedFormat":1},{"version":"be4f0f7d5d0f4109078055f63163eb7149f7a447ce60a513bf44c09b06deef74","impliedFormat":1},{"version":"2d82dd5cc6d794c4b7fcddb821a906c96d6943ef422e6689adef6080288a97e1","impliedFormat":1},{"version":"55de7e760ff0317208d2143b6ee65924152eaccb5f614afbb65e10b601e65084","impliedFormat":1},{"version":"e71157a8081ac84bd930aedcb056cc97bb22b1ce5374d68f1b57328e2562a4da","impliedFormat":1},{"version":"332c8294d0435c6e65a395a068593f2b2a7846157edc8d5ede75c9fac586f460","impliedFormat":1},{"version":"a8a5730cd4dc65891b6a4d73609eb1ac654ca1b512549d411c406a89a3327e12","impliedFormat":1},{"version":"102b3d9e8a5f781e92c49be4e13c35ca29592ce0d3b4d2bb0f0b1c25322ca26f","impliedFormat":1},{"version":"51c7a59af5581c962ae57e04b316540a4b6d7503c835e607d4f3965bb7cb36bd","impliedFormat":1},{"version":"ec0dcee0059d01f991ed0a75a1b258dc0a739469707e4281ec5992a30b607755","impliedFormat":1},{"version":"94e50e922eef1c709e2417650212e4f2af0af6fe13475c504bb803b85300fc2e","impliedFormat":1},{"version":"5812f37fd7f389a0e1578b550629009a02cf32cec88b9b8e4e0bda65fd362226","impliedFormat":1},{"version":"498aedd6cdcada06a1d45897858f1ead4839d7fb1e7fdac51e01315c306f4018","impliedFormat":1},{"version":"10a5965bddb072931a4eb3b3b569705836da452cdb46399391ad8db55ce6dcc5","impliedFormat":1},{"version":"8ac711764c1aa70d9a7926681fddd5403b7694fadd0b90f78004bf484b04803b","impliedFormat":1},{"version":"c70c66cef7a7dea8ea9b08751413f8c68c36aa58e99ce61b4d79114d07433d1a","impliedFormat":1},{"version":"a5062541ceac14e29e8aa376d13ad955a213efc0371a6ee2474f2353d023bb7b","impliedFormat":1},{"version":"769084556d3fadef559babad9e567aa1a83e928ccb013ee5c6cb6570671ba222","impliedFormat":1},{"version":"5595afee92160bf35579735e36a15af26c2f5d4df7c81453354ad21b49f29e0f","impliedFormat":1},{"version":"3c60caff842abde93c608aecdae33afa9edecb8a3e511e1333b6d65d0932bd2b","impliedFormat":1},{"version":"6d285e25c9d3356260e7a8088d80e1b339be4ff2e8b4336c2ee8d0638d15ac4c","impliedFormat":1},{"version":"d3385572703222212288d9d87d64ac8906e7b86aa9ba24da9ad58d7f9bab7254","impliedFormat":1},{"version":"d25446dd30d7172d3bafbb4ab1b3254233b18b37e8ae55b366fa58493392260c","impliedFormat":1},{"version":"a5858328a0673886a2122507f68634d2ce559246d96d503e8c6ab31e91b2c2f7","impliedFormat":1},{"version":"c0d89d614413987fd4e552b3205f4fc9ec26f5380e652ee5f432a236ecd3fda2","impliedFormat":1},{"version":"12d51198219fdfe43a430dcb17737e094b67cad9499ab0a61fa48f5c6f346e62","impliedFormat":1},{"version":"7421dd94e4bc03ecd4f59e28068b2c5bd467853409126438a3ef513ca411e78d","impliedFormat":1},{"version":"699223789d20ab61a8a746131157de907c0ed16486d182584f2802f20e0c0948","impliedFormat":1},{"version":"a1dfac79cad70d4485513176f7fb907221d0b96ebfdf44b9549e67e822ff90ed","impliedFormat":1},{"version":"a2ce1e015f767cb0330321e2b51e13eb11bdde07c6e0f5334a8d89aeafeb33ac","impliedFormat":1},{"version":"81e63b718bf15b96293aac111697d1b7b249df152def5b79e09809a3560113a1","impliedFormat":1},{"version":"b2aa377c4eb5e76f9c10c15813a13dd1f205f357d565bd4bd8ef80f50fb78918","impliedFormat":1},{"version":"1a73d0e991ad7c710e0fd75dbfb2d56d1791ed27fbec36c739b1811409cdded6","impliedFormat":1},{"version":"8691c135d00b35c308197932febc065191271a9ff7078ac95933b53f5e11cc1f","impliedFormat":1},{"version":"4e6785c2ff0370e668ee4e260e2ee1087f8d3104de37c24e9ed6451f958383df","impliedFormat":1},{"version":"bb4a652c2986bc18742557b4d39c2182a3bb7e81f067031879cfaaba7cd619d2","impliedFormat":1},{"version":"9adc0db973d69326b115ebf3bd0c845b85105c05934f6b7a90188c74c8056bed","impliedFormat":1},{"version":"241c0b31b2d6aef6cf91de372811788ea78efee6e3dc8522cbb027513744fb32","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"2b5de6f644ffca2e7b66fd38971b1e4cfa606aadb6d73aafb85f436fcf74a041","impliedFormat":1},{"version":"648bbe9b502d4ded5ce4155dd0ea96ea131b0c8fcd867c378c767f3b271069b5","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"8d883cd6fc4886b4e50186ade3ec87c4722cc689e286d9cdfb611b0c216eb27f","impliedFormat":1},{"version":"9e80e8ae42cb52058bf2c03505e0bb8aecf3e92952e2f31ffe38065aab4c244e","impliedFormat":1},{"version":"1d1b42d07fb257a5d3fd26f3ad3e75af898d8ceb3ce6e4d6e374d3230dc40304","impliedFormat":1},{"version":"fbbf7cc89b3d19809650d20ca64d8bb021d138815d3a057ec9f3df26f8540e9f","impliedFormat":1},{"version":"57c1bc1cfd65a0798d47f8fb238a764afa0f533b5f576de176a6d859ffeba187","impliedFormat":1},{"version":"04a86e8f2dbcd79ecf27ab58cbf82741d3f397a0c5c39dc3e1e2e46b3a6e11cc","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"2ce9adfdbe88b173531953a62703061ff25604a86028c93f61b703184aa47fb4","impliedFormat":1},{"version":"d3238842a580f1c88b4ce1509e041990f8f96fd16df77f13bbb020e0914fb4fa","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"3f43b73370d407a0ede1f473c9d4442b40d7f755c2baba08df7700e798a9cb3e","impliedFormat":1},{"version":"fcf084a283a16db6af64ee4359d3510267478f49446683c2ca265590112ef6c8","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"d6011c7d2109565ea8ff71e0898a5d98dd43af35165868afae9dcb05700441c2","impliedFormat":1},{"version":"625c4721c2f9590a89351f09781a1b84d9ec541d6fe854d3901dba2b748473a6","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"fce2f2a7adc8355280b930efdc78e02c85fac6189a666024cd2776339ebea1b2","impliedFormat":1},{"version":"656b2029fa44624242a1b1f77d5d08832b81e6a9c14fae9cfdf996907d49c24a","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"c231b5eacd353d8913f65002ccc76f16fa00a2190b83dce5667c9bedb296f5b5","impliedFormat":1},{"version":"bd655aa20c850d683421c6ea88e0944f39a82fc33f0ec441af78823e71352d82","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"4e3ec5b844e118cb785787bd55c8fac1ccb39cc2685523f8b43e9728f89c90d8","impliedFormat":1},{"version":"e3371e1ec71a698882dbb529a82db22803e577dd01364f296405e6a3e2643fa1","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"83216ad1443b5a285c19af0d2fb41611135871bc6d5ffc24b1be6dce86076ed8","impliedFormat":1},{"version":"4453032aee92a06efc42df421625dfb9fb7978890a98a39dfbdc1cb17ad4b4c4","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"82bd494c0958b3beb2275415832a320fe34a404b05bacc9170aa5aad9f739c85","impliedFormat":1},{"version":"c87b289087a1dd612dac1205028476380dfc27ca01a4e3939a3815cf80aef4e2","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"f050c87fc465e2ef27a7bc9fed887e44237a274afc3c33ca026779985259662f","impliedFormat":1},{"version":"f00756052a2ca19cb8cddfb91e6f162d75f137462220b1c60d0ce1451548d5b5","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"c9ad5adaea1d97b657cf8cec8f3ad0b5d46d6392be54494bc33ff2eae4b9e136","impliedFormat":1},{"version":"bc28504d29cec27aa153e003de30cde5cdf58b199c16a58e6b92f3dd9db7f540","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"e8e008f011c4d8b575f79cfd0d1fee6c52e37e8ce1701766803a5673f7f13a75","impliedFormat":1},{"version":"b33577aae3ea9bb1d41aa6feb2c9551cce37ec4e1fca898d225e2fb9e56e9eaf","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"5fa69c3e437efebdb62f9912aed4168d63187abd80707dbf3d051c7677be01f7","impliedFormat":1},{"version":"ae712e2509bbef52a80d000c355a5b7ade2d22fd3ff608241047d6aa03ec21ad","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"32e62f8b56b8f26f41ef72765a60ebabc04b59e2df9a3c167c14e56508f273c0","impliedFormat":1},{"version":"452307be00b2e9f48a6921302965091f5a879fda925158deb4dfc70942e9e92d","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"7c23d763924d392cea002f93ba8a79b3d1fae97b78e67bdb9a1edd8334ae4c65","impliedFormat":1},{"version":"bab2352090abb86c454006582ad41d1af47b4602a51d03a532dc7f102b34558a","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"ba7c3793cd2d96c39aa41d782e2f7228e4ee2bbf9c9e9fd7c48900ca70d1839d","impliedFormat":1},{"version":"7072b891668ec5f9150f4bb625e2d9900c006906d7d148aa7beabeb667189321","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"3be27dd127d24b4e1fa8188eac64e6147ad60168943a2e99e7ecd10f4feb78c1","impliedFormat":1},{"version":"d89650e3481eab7de59fd64009525ce6f532d3b74fb7dd509da55d8b0870f3c6","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"5ed137dfe7d3f02c00692fe5bca4e9b4c491ce59a608668d0a79809a134cbe93","impliedFormat":1},{"version":"8fa6b2ecc40bdcf2accf42aceffb39dde9895981890eb42028f034d79111d83b","impliedFormat":1},{"version":"883cc34efd07efa048b7f13d93231cce4f09e89a81195df1d637a28bf281e686","impliedFormat":1},{"version":"76a1cce110d3ea0d8efc16c22c00b9a6d27961c3ee54029ab207ada8d23c52e7","impliedFormat":1},{"version":"53cef56e36ec1ca765be7d148ebc931db7da7adbecd130c6d290bd7ff4aaccff","impliedFormat":1},{"version":"1d3ae3ff723d3fbd62571d0150f3e1f02c76c215e74bf7ad2c7a6c1a78d3ccbb","impliedFormat":1},{"version":"a8bc36f11a8c10956f62e59c178e79ad33a93bd01c5b988afc2668c6e61b39ab","impliedFormat":1},{"version":"c9ea8b6f0ee8f46e1e1baf302c844467452715b2ae18034de4663bbe099a1146","impliedFormat":1},{"version":"83797b0b185bef26c0186fbc43f4ea324aa0408819934a7ec49afdf8499faa92","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"333c4c89348f7529a469539298ef0c9199ba66e77f74921593e09be39ce1336b","impliedFormat":1},{"version":"183919d2b5abf89c2eabe54e98b1e18ad8e8c7be50a823dba757bb8f47affa2a","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"d3620faea2146bec7f8ca0b86bba586c2c80712979e4496027d949cd54f5d39a","impliedFormat":1},{"version":"8c4ad3e48608674d91e73d3b541fa696bd5a2a0048cd6c1cccce17243240f424","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"cf3ff55e36638a77aca4c3ce57fa03e0c39df08bd4220820894f84f0a4bf9f9c","impliedFormat":1},{"version":"e4ac6e18e68ffe402ba6e1cc68840b4e208cb1a196bc5022159b826d1b1db452","impliedFormat":1},{"version":"d669058639c0c992c86d45867ae29077c2542ce74cab0973276b12b65ee3171b","impliedFormat":1},{"version":"9571d4e4114fe8642cbd28759e0d51d6e000469cf7bf55071ce60e112871cb11","impliedFormat":1},{"version":"ec71ad5cb2e4af6db51f3363f4ccd42b79eb3461586ac0b174a313e89a1025cd","impliedFormat":1},{"version":"e96bfa15e49a154244d41e130a477384bc24ca0032e005a48ec8e5b440bd685f","impliedFormat":1},{"version":"ed934b0c1f6b386a7304c9a70c9ed5fe40fe3e48f0611389248e9a74f5e61467","impliedFormat":1},{"version":"bc105a63ad8cd045abde3e537f7057edb300969725431522826aee53c7d3b1b9","impliedFormat":1},{"version":"545fa478ada8d92c11c2dcb65e1a5d29875c68f2616438020936276f9ed011b1","impliedFormat":1},{"version":"18f363a102989c9c6e20bbcbd4a557846a7f5cc6b965c5bfd41dea0161805e61","impliedFormat":1},{"version":"6d0d01742f30861d47ac7dd33b49a473eeaa0ccce06a31f4b18ddc3a47739f19","impliedFormat":1},{"version":"833350b360ebac929de4fafc50b4a17c3f5140180aaa43bba5b7abf86808179c","impliedFormat":1},{"version":"35d566bb6fc8f4808063d40ab73ee4b0921c039fac3e30986b63d8b6ca95fdb4","impliedFormat":1},{"version":"d1a275f6447cb1a6e9f0d941caa1b250b6781da0e70ac7d8163b3bb3669092bb","impliedFormat":1},{"version":"998d6df8c72f835095e643b7da8448f944bf96fb138d5ecb5cf3e6c250853fcc","impliedFormat":1},{"version":"dfd93e4f7d3e004c68061c4a60666d85d223e6d3a7e5a2b570c29918f55f610a","impliedFormat":1},{"version":"94e1e7a5219962c069b8d3d05da3d2e12a37738a2b95370839ccc356c236281a","impliedFormat":1},{"version":"1d3d7c89a05969f894cae0dde0a5d9ea4e0d67695d77af60e72a067b912a4d3b","impliedFormat":1},{"version":"3261d73f1c00ac9f18152eed71f32d610bcbaaca72ce5893da87c1d2723a13d1","impliedFormat":1},{"version":"798072ed6f8cdaee55912da2905c33abd05b217b545ca8b0676d5b0d9779637e","impliedFormat":1},{"version":"28f15483e6721ff8c9f51dd5a1bc02c9ce164e80d57cb958ea7b31b43371ca4f","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"429727996eb3f1c06d34dbf99dccfe3ce1ee3e2ae5e5036e5e1227b8bece3050","impliedFormat":1},{"version":"405409e8606e029e21c2910368a434c629472383a0484bcab9c274646b58aa76","impliedFormat":1},{"version":"8540721bd452dabd63de3db281cb8f427bca7b173f809a3cdde77205c655002a","impliedFormat":1},{"version":"105e06d9f69e2f01b900c77b8a9ac15f3ab65440a28a6c276beb600c1327248a","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"1ce7fb6858f927fb8dc8c5a829fdd83b4a6ee426bee5d7ad9dd2fc8561a26665","impliedFormat":1},{"version":"b50b914995a88f2e31b669d7197771d42e64f336707c3bef2670061f9405631d","impliedFormat":1},{"version":"536e97c3189d0e0fb464fe3511eaa27947229d2804404bd656457175c71cdee2","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"ef36a8627b82d6395669c2132d52f3c1316058c3d08676588ac420014ca26833","impliedFormat":1},{"version":"a6caccf2cd3289ae982e05e0b083f238eca1a0ac7ef6a4c0f40107719197fb48","impliedFormat":99},{"version":"96d6aed5d89e829677a762a6bf2fabf5bcd3a9705a9299adf0cd6ed8878d1e0d","impliedFormat":99},{"version":"6c01ffeedf4768e98050680867cfb9b88f3b487a96d6ae56d728f300462e6e31","impliedFormat":99},{"version":"1e8e46271772b8bc064173c7cf17e7aaa10190d331a1c590e044da048074f7c2","impliedFormat":99},{"version":"accead7a45d0a50c71b5a8cd5a4967c644144ac61e86be82e1092286573fbf20","impliedFormat":99},{"version":"88bddda26ef628652bbafb3269f301f1420c223322ee9e0b67a167edc634469a","impliedFormat":99},{"version":"481ba88cd78ad7671508ca36482bcb7bc00132586196a14e047285f43d4c42be","impliedFormat":99},{"version":"239853c712f1bd9d3a16c39b346a0fc0cbbb0f64774ebc557f24760cae47462d","impliedFormat":99},{"version":"865139878f8aa45007e36432ccb7e0b83653a04073ad3f55f865cd7d5ff55473","impliedFormat":99},{"version":"796a6d5741de7fc9ba0af9627f9aa95f3508cd7b4bf75b97a86ba555f598159b","impliedFormat":99},{"version":"b275c60db8a6ceb3d07501a7d6f000b97b37e327e3418ad11e8872b8f6a300f6","impliedFormat":99},{"version":"9649fbc7db51ab68f753ce601a78b8287977d9849bc2fcd62ae7b6bcfd53ccbe","impliedFormat":99},{"version":"efdc6ff87c325e9746f4b1d90671eb71af851c03c7123ccae40c658a968450f2","impliedFormat":99},{"version":"4882d08bb0669e04914f420b23fe5f692fa419435fb007a2f95b135960df4647","impliedFormat":99},{"version":"4a1d607577696680edf7cbd48aeaaa2c4f83c472b819319b9159a50559fc0c34","impliedFormat":99},{"version":"db7e96d4b497c69fe74c23c94244ec14bb97768c922adaa1fc60f2f1c3144af8","impliedFormat":99},{"version":"86ec8dbdbd575bcaea0e1972f45dbf4e75686508ba28a5c3802509633ed7f314","impliedFormat":99},{"version":"243f0a982f6ece7a438192c69ea04f9b710b3af399bfab87578c7326b8e761bf","impliedFormat":99},{"version":"7761635508c3bd0f384d4a6b215855ded406ffd76ae5c97e5b15c3ec38ecc89f","impliedFormat":99},{"version":"ecb7bf0238bad4eb1e351a93f6db4c9bbf1e3e9a8955b475cbb0f55bae8608b7","impliedFormat":99},{"version":"89402f3300b78d70b05a16c16dffd2af87314c4cb415434707d27740d8f8189a","impliedFormat":99},{"version":"b5de97e5f7e48e5fea2e36f24b4778be60df4188ed94313ee09e06aeb9f55f6d","impliedFormat":99},{"version":"f3b85ae2d34efcee8de73b6acaa84f5a558104dc14acaec8f15a82051288cba6","impliedFormat":99},{"version":"dd34f9b06bdfc8b2063efa205a81c6f40920283874d9b254f8e6a23a1c223c89","impliedFormat":99},{"version":"044dc3bd41334b18338d3e616d708aa9045da8b27907051ea43289a01584936e","impliedFormat":1},{"version":"92b8cf3e2c33a31ff838f8bd616df1c2b02bdf7828294e2e7e993faf575da24c","impliedFormat":99},{"version":"ffdf83a98cee371bba71a9b0aeac76d8e51c96c4de22242b91306dc886efe510","impliedFormat":99},{"version":"f8113cec1fe5ce12ea54334cdd55dbd3f6fe53eed82169fdcc92f75c244f0f20","impliedFormat":99},{"version":"7a1dd1e9c8bf5e23129495b10718b280340c7500570e0cfe5cffcdee51e13e48","impliedFormat":1},{"version":"95bf7c19205d7a4c92f1699dae58e217bb18f324276dfe06b1c2e312c7c75cf2","impliedFormat":99},{"version":"8a8513590c2058c87eef30a2fac725f861a5177c817dd1eda957dbb55895e406","impliedFormat":99},{"version":"910f191eae260837ae794874e88a20e4744995b33559961b6c98831113c14225","impliedFormat":99},{"version":"765a473930d09e61c6a772db74c203ea6c33160b404e23045738c02213aa8962","impliedFormat":99},{"version":"c4e3c78f3a9fbbe32b526279019499c8e4152422733f73c270ed6ee6fdf9306b","impliedFormat":99},{"version":"7c890ba29d41e85d307373094108846c5f6a6efba0dbec6e9bd1383aeea7c7d0","impliedFormat":99},{"version":"7f49575b19c2bb98bb01ab7c162c621375fd7030bc0dbec940b5aee23a42b00e","impliedFormat":99},{"version":"dc6440cab53606fd219d07207d2d04368e440ed902db5a440ac9f31a6c004aa8","impliedFormat":99},{"version":"589980a90b4a204b4db86736069fc1a3921d8593e805005ade316ba18b66ef30","impliedFormat":99},{"version":"015eab32d7218f77a7be7101b2ef83654deb69853e9f09f306151aaf4beed531","impliedFormat":99},{"version":"f210bc0e1971eff0e2bfece776cd1c886f71366842b00bc2824ec9504565b56e","impliedFormat":99},{"version":"d46857a5286b2aaf1303c7d370a9bd37d2639e9b6aaa28d920833f7c85b2d0eb","impliedFormat":99},{"version":"651b2b98a4a897cb9214b8bee2c9a4a6e17da7fe5073d843fa7f340fa6a07ee3","impliedFormat":99},{"version":"a5f531c6c4141d80a5de265fe8320490899931d33d257ce1bf31c10e1327191b","impliedFormat":99},{"version":"9285c5b5d0f4cef779c1b9fb3640e61d666267e69779231010b465d6dcdc30a1","impliedFormat":99},{"version":"60de419346a02cc2446102ca95b0233fe622dccfb3b49ad1ff4bab52a35cbe2f","impliedFormat":99},{"version":"dce34ba4fe01e7529f3e222ac15f272772fb8f48158716bf809051856945c6cd","impliedFormat":99},{"version":"b459c195f20fcdefbdd23ec43aba87ce2461c932c9cb105d3e9835213b5fafdb","impliedFormat":99},{"version":"ce5f0edadf454d62f27eaf327103dcdbc0e274b873038ce3932af6b10448c866","impliedFormat":99},{"version":"7fdf46293e1ca4970cff9a5e273d197366f66cda19f31f92f623e77d0d14514c","impliedFormat":99},{"version":"0579220ba53eade7bb57928efc002844dc1fb05a627d6204c1313a90bb0b276a","impliedFormat":99},{"version":"b52a7863a82ed9af454dcbe06b63d07951afe9f27f21b28c9edaebe0aaf7defa","impliedFormat":99},{"version":"008cb221e6c894fb9122ce947f13cb4c92812c962576899bb591833d7ddb2955","impliedFormat":99},{"version":"40185e4a32ec68984f51fb5e6ee1ee8cf259d6611c07f05596d3164b3ae439f1","impliedFormat":99},{"version":"0f709701cb543a376e16ff665d2416385e63ccb80e08cc95bd697dd121840d0a","impliedFormat":99},{"version":"c614308cda6693aec8b496fbc56a9efa4f1a03c7b7cf6ca1f5840f31714385f8","impliedFormat":99},{"version":"1269a02f69fc3571fa9740a8b1ea2a9eeb16b09e435829755abbc82a69cc606f","impliedFormat":99},{"version":"2d225e7bda2871c066a7079c88174340950fb604f624f2586d3ea27bb9e5f4ff","impliedFormat":1},{"version":"6a785f84e63234035e511817dd48ada756d984dd8f9344e56eb8b2bdcd8fd001","impliedFormat":1},{"version":"c1422d016f7df2ccd3594c06f2923199acd09898f2c42f50ea8159f1f856f618","impliedFormat":1},{"version":"2973b1b7857ca144251375b97f98474e9847a890331e27132d5a8b3aea9350a8","impliedFormat":1},{"version":"0eb6152d37c84d6119295493dfcc20c331c6fda1304a513d159cdaa599dcb78b","impliedFormat":1},{"version":"237df26f8c326ca00cd9d2deb40214a079749062156386b6d75bdcecc6988a6b","impliedFormat":1},{"version":"cd44995ee13d5d23df17a10213fed7b483fabfd5ea08f267ab52c07ce0b6b4da","impliedFormat":1},{"version":"58ce1486f851942bd2d3056b399079bc9cb978ec933fe9833ea417e33eab676e","impliedFormat":1},{"version":"7557d4d7f19f94341f4413575a3453ba7f6039c9591015bcf4282a8e75414043","impliedFormat":1},{"version":"a3b2cc16f3ce2d882eca44e1066f57a24751545f2a5e4a153d4de31b4cac9bb5","impliedFormat":1},{"version":"ac2b3b377d3068bfb6e1cb8889c99098f2c875955e2325315991882a74d92cc8","impliedFormat":1},{"version":"8deb39d89095469957f73bd194d11f01d9894b8c1f1e27fbf3f6e8122576b336","impliedFormat":1},{"version":"a38a9c41f433b608a0d37e645a31eecf7233ef3d3fffeb626988d3219f80e32f","impliedFormat":1},{"version":"8e1428dcba6a984489863935049893631170a37f9584c0479f06e1a5b1f04332","impliedFormat":1},{"version":"1fce9ecb87a2d3898941c60df617e52e50fb0c03c9b7b2ba8381972448327285","impliedFormat":1},{"version":"5ef0597b8238443908b2c4bf69149ed3894ac0ddd0515ac583d38c7595b151f1","impliedFormat":1},{"version":"ac52b775a80badff5f4ac329c5725a26bd5aaadd57afa7ad9e98b4844767312a","impliedFormat":1},{"version":"6ae5b4a63010c82bf2522b4ecfc29ffe6a8b0c5eea6b2b35120077e9ac54d7a1","impliedFormat":1},{"version":"dd7109c49f416f218915921d44f0f28975df78e04e437c62e1e1eb3be5e18a35","impliedFormat":1},{"version":"eee181112e420b345fc78422a6cc32385ede3d27e2eaf8b8c4ad8b2c29e3e52e","impliedFormat":1},{"version":"25fbe57c8ee3079e2201fe580578fab4f3a78881c98865b7c96233af00bf9624","impliedFormat":1},{"version":"62cc8477858487b4c4de7d7ae5e745a8ce0015c1592f398b63ee05d6e64ca295","impliedFormat":1},{"version":"cc2a9ec3cb10e4c0b8738b02c31798fad312d21ef20b6a2f5be1d077e9f5409d","impliedFormat":1},{"version":"4b4fadcda7d34034737598c07e2dca5d7e1e633cb3ba8dd4d2e6a7782b30b296","impliedFormat":1},{"version":"360fdc8829a51c5428636f1f83e7db36fef6c5a15ed4411b582d00a1c2bd6e97","impliedFormat":1},{"version":"1cf0d15e6ab1ecabbf329b906ae8543e6b8955133b7f6655f04d433e3a0597ab","impliedFormat":1},{"version":"7c9f98fe812643141502b30fb2b5ec56d16aaf94f98580276ae37b7924dd44a4","impliedFormat":1},{"version":"b3547893f24f59d0a644c52f55901b15a3fa1a115bc5ea9a582911469b9348b7","impliedFormat":1},{"version":"596e5b88b6ca8399076afcc22af6e6e0c4700c7cd1f420a78d637c3fb44a885e","impliedFormat":1},{"version":"adddf736e08132c7059ee572b128fdacb1c2650ace80d0f582e93d097ed4fbaf","impliedFormat":1},{"version":"d4cad9dc13e9c5348637170ddd5d95f7ed5fdfc856ddca40234fa55518bc99a6","impliedFormat":1},{"version":"d70675ba7ba7d02e52b7070a369957a70827e4b2bca2c1680c38a832e87b61fd","impliedFormat":1},{"version":"3be71f4ce8988a01e2f5368bdd58e1d60236baf511e4510ee9291c7b3729a27e","impliedFormat":1},{"version":"423d2ccc38e369a7527988d682fafc40267bcd6688a7473e59c5eea20a29b64f","impliedFormat":1},{"version":"2f9fde0868ed030277c678b435f63fcf03d27c04301299580a4017963cc04ce6","impliedFormat":1},{"version":"feeb73d48cc41c6dd23d17473521b0af877751504c30c18dc84267c8eeea429a","impliedFormat":1},{"version":"25f1159094dc0bf3a71313a74e0885426af21c5d6564a254004f2cadf9c5b052","impliedFormat":1},{"version":"cde493e09daad4bb29922fe633f760be9f0e8e2f39cdca999cce3b8690b5e13a","impliedFormat":1},{"version":"3d7f9eb12aface876f7b535cc89dcd416daf77f0b3573333f16ec0a70bcf902a","impliedFormat":1},{"version":"b83139ae818dd20f365118f9999335ca4cd84ae518348619adc5728e7e0372d5","impliedFormat":1},{"version":"e0205f04611bea8b5b82168065b8ef1476a8e96236201494eb8c785331c43118","impliedFormat":1},{"version":"62d26d8ba4fa15ab425c1b57a050ed76c5b0ecbffaa53f182110aa3a02405a07","impliedFormat":1},{"version":"9941cbf7ca695e95d588f5f1692ab040b078d44a95d231fa9a8f828186b7b77d","impliedFormat":1},{"version":"41b8775befd7ded7245a627e9f4de6110236688ce4c124d2d40c37bc1a3bfe05","impliedFormat":1},{"version":"f050afc4e2e063baf534e8bfa7aa6489e360f1016eba8603c19b45ba9fcd5887","impliedFormat":1},{"version":"9d6d5aec23fce486ccc52123d440d056519572f529d1f03dca71270d34efeec8","impliedFormat":1},{"version":"092657fbee8f216761a98d6d1242bfe819a5ba06d8f312eafb03fe8b9ba059ce","impliedFormat":1},{"version":"4c6d047085f98e816ca0c0ba6bad7ba248ef3026c8a834f462a9b91bceaf473b","impliedFormat":99},{"version":"23d42de5aebd2999f6194478d1d0007f3c17191e3782e54c9cef9676dd7c26c4","impliedFormat":99},{"version":"dd9faff42b456b5f03b85d8fbd64838eb92f6f7b03b36322cbc59c005b7033d3","impliedFormat":99},{"version":"6ff702721d87c0ba8e7f8950e7b0a3b009dfd912fab3997e0b63fab8d83919c3","impliedFormat":99},{"version":"9dce9fc12e9a79d1135699d525aa6b44b71a45e32e3fa0cf331060b980b16317","impliedFormat":99},{"version":"586b2fd8a7d582329658aaceec22f8a5399e05013deb49bcfde28f95f093c8ee","impliedFormat":99},{"version":"59c44b081724d4ab8039988aba34ee6b3bd41c30fc2d8686f4ed06588397b2f7","impliedFormat":99},{"version":"ef1f3eadd7bed282de45bafd7c2c00105cf1db93e22f6cd763bec8a9c2cf6df1","impliedFormat":99},{"version":"2b90463c902dbe4f5bbb9eae084c05de37477c17a5de1e342eb7cbc9410dc6a1","impliedFormat":99},{"version":"5e667d94db97aadf32cdb89a12afe38674a138d90d2e94726743043f96f2b437","impliedFormat":99},{"version":"8b10615f8535271fbec17fc339b6bdfe878ace2eb3c642e68796edf5bff8ebac","impliedFormat":99},{"version":"f690075dc5f57a71a59ca5e4c5fec7f3ac9e0be75c19ab16eb4c5fc7cc95e9e5","impliedFormat":99},{"version":"b28e0a9c00db21688c4457bd78f7068a498af7aeacc5399e88ba6e61747a9d41","impliedFormat":99},{"version":"d83b6e71138cf2b07172540a60ccb750b6076c6877a22b4fd8557d28b5dc3654","impliedFormat":99},{"version":"c49553d7683cd6b72c29df4e108fd597ed44ee8fb52d24b864e5a805f1160cca","impliedFormat":99},{"version":"f1fa27e5a16fe0b4ac1131fcbe89cd55c73eeefc6266515098b865a236b9383c","impliedFormat":99},{"version":"f55ed1dcf596a95c5546cea1f8a534e6b9d2aac50c5671599edcd2a1ac9b8675","impliedFormat":99},{"version":"c5ed0e1ae6cea75646ef91c9ea04d51fa2a05f78630957215a554fba8e0c9dad","impliedFormat":99},{"version":"3dfcd0a3bfa70b53135db3cf2e4ddcb7eccc3e4418ce833ae24eecd06928328f","impliedFormat":1},{"version":"33e12c9940a7f23d50742e5925a193bb4af9b23ee159251e6bc50bb9070618a1","impliedFormat":1},{"version":"bc41a8e33caf4d193b0c49ec70d1e8db5ce3312eafe5447c6c1d5a2084fece12","impliedFormat":1},{"version":"7c33f11a56ba4e79efc4ddae85f8a4a888e216d2bf66c863f344d403437ffc74","impliedFormat":1},{"version":"cbef1abd1f8987dee5c9ed8c768a880fbfbff7f7053e063403090f48335c8e4e","impliedFormat":1},{"version":"9249603c91a859973e8f481b67f50d8d0b3fa43e37878f9dfc4c70313ad63065","impliedFormat":1},{"version":"0132f67b7f128d4a47324f48d0918ec73cf4220a5e9ea8bd92b115397911254f","impliedFormat":1},{"version":"06b37153d512000a91cad6fcbae75ca795ecec00469effaa8916101a00d5b9e2","impliedFormat":1},{"version":"8a641e3402f2988bf993007bd814faba348b813fc4058fce5b06de3e81ed511a","impliedFormat":1},{"version":"281744305ba2dcb2d80e2021fae211b1b07e5d85cfc8e36f4520325fcf698dbb","impliedFormat":1},{"version":"e1b042779d17b69719d34f31822ddba8aa6f5eb15f221b02105785f4447e7f5b","impliedFormat":1},{"version":"6858337936b90bd31f1674c43bedda2edbab2a488d04adc02512aef47c792fd0","impliedFormat":1},{"version":"15cb3deecc635efb26133990f521f7f1cc95665d5db8d87e5056beaea564b0ce","impliedFormat":1},{"version":"e27605c8932e75b14e742558a4c3101d9f4fdd32e7e9a056b2ca83f37f973945","impliedFormat":1},{"version":"f0443725119ecde74b0d75c82555b1f95ee1c3cd371558e5528a83d1de8109de","impliedFormat":1},{"version":"7794810c4b3f03d2faa81189504b953a73eb80e5662a90e9030ea9a9a359a66f","impliedFormat":1},{"version":"b074516a691a30279f0fe6dff33cd76359c1daacf4ae024659e44a68756de602","impliedFormat":1},{"version":"57cbeb55ec95326d068a2ce33403e1b795f2113487f07c1f53b1eaf9c21ff2ce","impliedFormat":1},{"version":"a00362ee43d422bcd8239110b8b5da39f1122651a1809be83a518b1298fa6af8","impliedFormat":1},{"version":"a820499a28a5fcdbf4baec05cc069362041d735520ab5a94c38cc44db7df614c","impliedFormat":1},{"version":"33a6d7b07c85ac0cef9a021b78b52e2d901d2ebfd5458db68f229ca482c1910c","impliedFormat":1},{"version":"8f648847b52020c1c0cdfcc40d7bcab72ea470201a631004fde4d85ccbc0c4c7","impliedFormat":1},{"version":"7821d3b702e0c672329c4d036c7037ecf2e5e758eceb5e740dde1355606dc9f2","impliedFormat":1},{"version":"213e4f26ee5853e8ba314ecad3a73cd06ab244a0809749bb777cbc1619aa07d8","impliedFormat":1},{"version":"cafd6ef91d96228a618436c03d60fe5078f43d32df4c39ebd9f3f7d013dbe337","impliedFormat":1},{"version":"961fa18e1658f3f8e38c23e1a9bc3f4d7be75b056a94700291d5f82f57524ff0","impliedFormat":1},{"version":"079c02dc397960da2786db71d7c9e716475377bcedd81dede034f8a9f94c71b8","impliedFormat":1},{"version":"a7595cbb1b354b54dff14a6bb87d471e6d53b63de101a1b4d9d82d3d3f6eddec","impliedFormat":1},{"version":"1f49a85a97e01a26245fd74232b3b301ebe408fb4e969e72e537aa6ffbd3fe14","impliedFormat":1},{"version":"9c38563e4eabfffa597c4d6b9aa16e11e7f9a636f0dd80dd0a8bce1f6f0b2108","impliedFormat":1},{"version":"a971cba9f67e1c87014a2a544c24bc58bad1983970dfa66051b42ae441da1f46","impliedFormat":1},{"version":"df9b266bceb94167c2e8ae25db37d31a28de02ae89ff58e8174708afdec26738","impliedFormat":1},{"version":"9e5b8137b7ee679d31b35221503282561e764116d8b007c5419b6f9d60765683","impliedFormat":1},{"version":"3e7ae921a43416e155d7bbe5b4229b7686cfa6a20af0a3ae5a79dfe127355c21","impliedFormat":1},{"version":"c7200ae85e414d5ed1d3c9507ae38c097050161f57eb1a70bef021d796af87a7","impliedFormat":1},{"version":"4edb4ff36b17b2cf19014b2c901a6bdcdd0d8f732bcf3a11aa6fd0a111198e27","impliedFormat":1},{"version":"810f0d14ce416a343dcdd0d3074c38c094505e664c90636b113d048471c292e2","impliedFormat":1},{"version":"9c37dc73c97cd17686edc94cc534486509e479a1b8809ef783067b7dde5c6713","impliedFormat":1},{"version":"5fe2ef29b33889d3279d5bc92f8e554ffd32145a02f48d272d30fc1eea8b4c89","impliedFormat":1},{"version":"e39090ffe9c45c59082c3746e2aa2546dc53e3c5eeb4ad83f8210be7e2e58022","impliedFormat":1},{"version":"9f85a1810d42f75e1abb4fc94be585aae1fdac8ae752c76b912d95aef61bf5de","impliedFormat":1},{"version":"47b5548cb3cbb97d3a4bb0b57ea0d9b5250a00f39e362193c264c999e931f3b0","impliedFormat":99},{"version":"63bee1b05172fba58f24a9d295c1d9a4b1a4c8c3c2f22b5a61a57f79bae509e6","impliedFormat":99},{"version":"0db1b78030e71781aad3f1728f01af2077dee32fcdbbc2043a42001e98a92c12","impliedFormat":99},{"version":"1fe0a8b03c8a59e37912463b1c146890f779cdfb8fe068042e56025848b58ebc","impliedFormat":99},{"version":"5682e064b73b87d9e9df66f8fb227c20856e6e6f2185a6fbcb62e10cb424cd48","impliedFormat":99},{"version":"39d7b9560b133cd5fccfd30b6b6c1c50854166dab9563edaa3bdad331d4a9a64","impliedFormat":99},{"version":"a2c18e67dc30ee033b9607ece7e74c00885f05b1e699bcc620ab7f4db04e1230","impliedFormat":99},{"version":"960c552c262b319443cd67830c8dc9b42ec9fdee37fd4dc07ac11d236f826d1e","impliedFormat":99},{"version":"98530fc201cb603f79b29916cee4196085cf60ece5b0098cd99bb4b5019a408f","impliedFormat":99},{"version":"e39bff1ec281cbd466a66ec5e81e4a1ba33ebcb9bcce22bec04a3c0f2db1eb68","impliedFormat":99},{"version":"8c59740f6b9ad8cc7c49512df00a68a16595ca57f8ca2adeacbacb46f2f8014c","impliedFormat":99},{"version":"47cc02c7f286cd43a4bfa1c8d6270837bf7c14769773a7b18f75c27a2251e1dd","impliedFormat":99},{"version":"cfee2e1b3ea99262c92280b28752c5e178be42767de4bbca791d5615f7dad57c","impliedFormat":99},{"version":"66389417c16ad6d9e7093c2c6671b7276a15455637ef3b270c9ba09bab0d5d86","impliedFormat":99},{"version":"bd1b8af3d1d8989d4d56fe1278c6ca9a46ac2fca90a3761769531e7752a5e9bd","impliedFormat":99},{"version":"ae70708692c046ef6df970680f79cf0bf0e01d6db0b0916cbbadbb61f3f94b58","impliedFormat":99},{"version":"6037e20535bb3239c234169a935b93ad25529bc2f0fa3ec5ebb152b5dca7040a","signature":"cf9a41325b841434755eade2e0ba8ea7adfb05ccbb32d98d4a32506470edeac9","impliedFormat":99},{"version":"7d86129d547a6872153a9ca4f75ea1032c0a50560afd4e2e72915de0bd7762c8","impliedFormat":1},{"version":"837a70aeaefa02e99b6a6450d169b6702907eab42ac1ad04e6a685c1c4b1d456","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"4800238fe9028b946a021695e11975dc1beeab686d547346a380486c9c99c80d","impliedFormat":1},{"version":"6d23d54eece68bc6937367aa0411d97a106d6a532069c9253c6eee9d6af06ee2","impliedFormat":1},{"version":"e8096d51345894e59f19f7136087b0960be7ee1af83cfbbdaabd17453c0d7ab1","impliedFormat":1},{"version":"0a4068d267d815e763f1fdb391e3990eb488328345c45b0b61b7d27f5205f58b","impliedFormat":1},{"version":"874d1eca4b87921040ee65aca5af14d9254dc289fe1c2121395627c01fda9140","impliedFormat":1},{"version":"e607072ddf5dc478607a79f7a2642c41b49a49b6222325292473baa26a88337a","impliedFormat":1},{"version":"af6d0ad161d5c07a33167b7617294fb394e31ad3565a05c0c31f471aba12bcb3","impliedFormat":1},{"version":"1d3e033a732a3fac5d7901f08d9c672efefe718b17c092a51a3f5379dc51f515","impliedFormat":1},{"version":"a0472801d18117f19937c97a96a584f57faf1b4cdaeaa5c14a6bf68359783a0a","impliedFormat":1},{"version":"aa06aa751426c05bd42b6605f630b171280c166d3d575725b24acee5ee3a84dc","impliedFormat":1},{"version":"17eeed2539cedadc92dd3eb8f0972f421b06b748e1a850ef7d281aa279b130e8","impliedFormat":1},{"version":"7d5228bcc11214d73fda068147a020fdf2d95b896c05f158a2febd9839e6d88f","impliedFormat":1},{"version":"2a0f82391acc44d414ffc02464c05ae0cb03f8485fe1e51e507190a26f83186a","impliedFormat":1},{"version":"7abcdd756241d799f93c122330a152e03904667aeb68885479099dbb75c2bc99","impliedFormat":1},{"version":"996164c4cc6e9080cd8bfb0a64812284fb2c1e7233f33476383cd6935ef9cb92","impliedFormat":1},{"version":"a64e7997fc919fcbc808bc4fd62fad43baf2cd0bed84c3f5c62bf4e92b0c01cf","impliedFormat":1},{"version":"b1c6ef0bf4d44408a5a7a38eb7f9c7c2cc2372c5badfe5363700bb049414d2c8","impliedFormat":1},{"version":"8f44f477a7c214312755f69e77bee79099caf21c1ef438aa16eb0c929ecb95ef","impliedFormat":1},{"version":"96e3f36133ff534b473f878d24552438f674b193ed5af22d0eabc542a8b1e831","impliedFormat":1},{"version":"84a8170462f9dd741a75db9e2948e0af3aa65827d981ecb05b672d4b7f1201ed","impliedFormat":1},{"version":"b822f86a3a203daa04d6642b38cd0d0cf7b7b050cb427cdf24725f5f79e06fbd","impliedFormat":1},{"version":"626f62a1b6217a7ef12173e6951e53dcd9ba367eec34ed358f986bf911a5f606","impliedFormat":1},{"version":"c5403dc6d9b5d512aa7c46e6684ee7adee1e0565544b043961fcb6737656c60a","impliedFormat":1},{"version":"7782363189bca5d4b41c7419600f932a00fe9c09483734a3ec1a3d397bfe8cbc","impliedFormat":1},{"version":"7aa3e6344ee18a0793cb5f1491f553d18adb200fcf415f93e17e464887da7e36","impliedFormat":1},{"version":"77cadfd6726a030b981fe1b0203d7edc6f2b3c9026e6d043fedcb3fb530a0a9d","impliedFormat":1},{"version":"86467bc5744aeab0ef34e8d41dec4f2a9fc6147c88d595d72b7610a62a890e75","impliedFormat":1},{"version":"6ebadc50519a19088c3b5b0e61f69891b3cd90908af933d4071b789b6807a829","impliedFormat":1},{"version":"7fc3584c82cd8405a8a606009d575fa02073426b5bc1df9758f52254c167750c","impliedFormat":1},{"version":"4033398f1d23e6527adbddf4f49337e639231541e26584dfa70ef294fed8e811","impliedFormat":1},{"version":"e0cc6032497579e47f8b408cb0d666b694a2058d2736b2e8e78eb86cfefa19b3","impliedFormat":1},{"version":"26f6f3947f496d857b90e1234bfc7989b463d598aba8439f9af03c239a86ee17","impliedFormat":1},{"version":"5ab74c8eb89258bc6a11482a189ef8cd7175c6670e86c4fb15880009843445c0","impliedFormat":1},{"version":"7d334a8a215ddcddf831abad41d7605cd98d0a1d9f1c90642dca83743144c80f","impliedFormat":1},{"version":"6d8b93bdcc1cf2cd78001008dcb2b606d2399bf6443cffd1e1c501daaf8783df","impliedFormat":1},{"version":"4f843f57a4641c1bc3fb78595a3089c3b0b6209a08246f56b91688d40472c8b9","impliedFormat":1},{"version":"ddf449e380a23fc0251067b7b6462e83dbe361f4e4acfc92db228b4ef536c235","impliedFormat":1},{"version":"f3a25e63826e4abfb5d62a913b6412716ff3e1514706fd88e474b8f042fc3607","impliedFormat":1},{"version":"813b5e35473548f4a903a105c94d2d27d443491455b02c22ec1c260a7f93f41d","impliedFormat":1},{"version":"f2311e52026e0c500a271a0df2b24f65096115514b580bdb80e7c146772c6ce9","impliedFormat":1},{"version":"222c8f7fc03b4c25805ead5df02d60a99712e02f22d06b82fd98a72909c081ba","impliedFormat":1},{"version":"71ae891565a52f8922ea4b3f4408c5b1bcd5f34992d39919d5adb536d8595ecb","impliedFormat":1},{"version":"8bf69dcd3d8f17424035f01df6128cbd8100fd2363990d47de53b57eb9fd02bc","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"f74f74282bb5a288260f71d05e0a92a35e9e32bd5b5028015338c9004c819c46","impliedFormat":1},{"version":"c36ad4fca93d60c4662d7a4c4ee64bda47d522a4ebd24bf7a2a692d87858f5bc","impliedFormat":1},{"version":"e3ded45bf1823ffb49838558aa9108ec73da7eae26bf599733d6ebac77c78707","impliedFormat":1},{"version":"6289edfa03c297e2a334b625d82cc16429da0aca5e532686609df5e07cded27c","impliedFormat":1},{"version":"445d3231f619088ad58bec5b19d040d91dedc149ad9095f85d1407796836fcea","impliedFormat":1},{"version":"4f751e2623025adc0f1486eb94b479736cf4949009990fd324753b881e3975c2","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"93945903af779f9abb29e47eb2c0715c4df76ff99ac6e94a88538b59cddf8bb8","impliedFormat":1},{"version":"7297748ee3c761a3be14c325ccd15d36d34154441d96e5a30b2a6b08f56e81ab","impliedFormat":1},{"version":"1b975ca054727c79b40086198d3870e92336ef86e467e27815c42e35712b5226","impliedFormat":1},{"version":"4295e0b6f941389ad003b5230b2b890cf0a4395384fbdae0acba1bec1177d399","impliedFormat":1},{"version":"115e715b4402b4baf235ba49074ad2dfcfa84deaa0968ecea3d27f59273d72d0","impliedFormat":1},{"version":"e42223c1bec4b38c12e430dcb1c2f2411156eb1ff9898ce247893cd6b669270e","impliedFormat":1},{"version":"5948c9a5fb1e760ea0990ca8a6cc9ab552fb8c11540d6acb94af4e7a4189fb72","impliedFormat":1},{"version":"b0e3a62f01da0bd14d3d2add62609415d75f93559bc361e16c53f0229a697c91","impliedFormat":1},{"version":"9c5207aceb3396583587cb366149ed6d2bfb79c02cd5677a802ae9e490582d4b","impliedFormat":1},{"version":"91401bca59947c0c36e315dd0ab3e101e989b4242f04ebb661b4d903ef46b6b1","impliedFormat":1},{"version":"27b789b41d235218eff4d713302656bd0e4a7042f06a15d167214ca8a7b2cb71","impliedFormat":1},{"version":"01c6f485bd3284b77d83aedb512f9a6114d0733258871d5499831e4e3fdd1bc5","impliedFormat":1},{"version":"ff2bde987913e9ed6b1f40db899b34442d1843920d44e1f9e0bb4887e9cfd719","impliedFormat":1},{"version":"26f7da3264f3bce0dfaa7dab6b5ce61a9e6f1e61aa1722f0dbfcecd19e96f47e","impliedFormat":1},{"version":"8b094ecd037106df65ad2920c7dc32476abca48e8d9a84cbaeb00d4c6ba9e726","impliedFormat":1},{"version":"fd40719172892892bd8e8ce85487a696d2f3e3e9950133cfed64b3fc4f4426ef","impliedFormat":1},{"version":"a039ce3ad8a44a82b269d498f7f38afbcc62b8bcada926f97674a96a0dd9acd8","impliedFormat":1},{"version":"8d74deb16be8d262622627038ac6ae0d16d923899bc882640fa672e2efbbc210","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"5211241a693c2b5fe7b048fc023b54584e52df20630a2e031648d5f08043f903","impliedFormat":1},{"version":"17f867026e4993bbba2f950511accf766409ab910ba9b1e672729b581dac71cd","impliedFormat":1},{"version":"60b9e6c4199dfc9cee20640dfa8f7ea6e5caa872ab7798808b84213bc3678ef7","impliedFormat":1},{"version":"6dbdca901d7883706729d287cf61f0f6de303c74de09b27f203f7b7b7197c246","impliedFormat":1},{"version":"c1aba2fd5388356a3196e02a6d01f294302f23d810227dfe145a886f13b5644b","impliedFormat":1},{"version":"774699a67c03827f65aaf777bde7e3137d3c3641ace32f3691fe07afc2bd8e36","impliedFormat":1},{"version":"287ec0d0e80881f1b6c300b0910e9424ed21c3f38d06627fe1b6e525eb2d5684","impliedFormat":1},{"version":"e6493924ea67c128a8de48449b19ef09608fa743ddd2fd5ac48ea35bf3e0385d","impliedFormat":1},{"version":"351ef901a141875d118927f74ccad336508432e4a485a34668d451f1d585d1c2","impliedFormat":1},{"version":"cb2a667fae057b3e9ed52a4b91f84efa717b26fe9274efca882fe1deaeefdbd3","impliedFormat":1},{"version":"7756a498f74667af2759badb322aeff5c6764d3c41a8c3a5bb39db9af23ec50a","impliedFormat":1},{"version":"c91b3ee2501181530ff99e7602281611ef17f4a431ca93f2d4a887ce602c8342","impliedFormat":1},{"version":"46329954cad21f759ded22ff3562f45de9c4f107a61598588c94bfeb588c90aa","impliedFormat":1},{"version":"9efb053d54360bdd6defb0829b31eb5891b57b8fce53ab8a27b4556fa8844983","impliedFormat":1},{"version":"56365552581c698ed550c94e48da5acb5540d73f02899b55293891d75c6fd16b","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"18b4d9588b761e4ee87b3316cccf7b6e455dacce71958b7fccd03c1a227b0170","impliedFormat":1},{"version":"8acf73b6be57db3fe3c4b2eb69ca2f23364065df287053b88d94fc7ac9da07f1","impliedFormat":1},{"version":"2ca406495a701232d81d75c3ccdfe837513b6d7ced06178ddbf2edb392ca47dc","impliedFormat":1},{"version":"d4d69fd65d7186eb1dfab301cb8f792c417afeed891342294b194e92df2b8d50","impliedFormat":1},{"version":"290df2b5f6f7ba97fee0884d335322687c9fbe588f1f17e0d867a0e4588a0a57","impliedFormat":1},{"version":"466050e85fd8a8735d8fd5c9a6d2e4eced0236e105a1a6d9054325a41f5b23d9","impliedFormat":1},{"version":"6f308b141358ac799edc3e83e887441852205dc1348310d30b62c69438b93ca0","impliedFormat":1},{"version":"ef36a8627b82d6395669c2132d52f3c1316058c3d08676588ac420014ca26833","impliedFormat":1},{"version":"f15dc8cc0d4a4f64505b4f2cc43f1814453528d0a614ed80bbebc9b51a23b79b","impliedFormat":1},{"version":"24e44de66250708da592f7673a0cc95d7ce865d4fbc8cbc78ad4752d6e0f41cc","signature":"15dcb6085e7656ce108e3afc7db511d29046a38e8d82355845918370ca6ed8c3","impliedFormat":99},{"version":"ad5c6527b39edbbe6943839af2a93a4013c771daf5af281f9cea9da6ee730e16","signature":"4c0dedb4721f13ef58fa05356bfc53fd889ac9ac2cdf9194e545868f279028b7","impliedFormat":99},{"version":"c2449f694433f578e4f71a13df925f1e5f6680d08579acbe7e57378b30e020b7","signature":"c4701e5902e3c0a98f19e20656db61a562d9f1498dee43ac646275beba17120e","impliedFormat":99},"11b961f436a9b403e6e72cb7d704deb6800762a25ec37a6771c2b523698ec92a",{"version":"f8db4fea512ab759b2223b90ecbbe7dae919c02f8ce95ec03f7fb1cf757cfbeb","affectsGlobalScope":true,"impliedFormat":1},{"version":"70521b6ab0dcba37539e5303104f29b721bfb2940b2776da4cc818c07e1fefc1","affectsGlobalScope":true,"impliedFormat":1},{"version":"ab41ef1f2cdafb8df48be20cd969d875602483859dc194e9c97c8a576892c052","affectsGlobalScope":true,"impliedFormat":1},{"version":"d153a11543fd884b596587ccd97aebbeed950b26933ee000f94009f1ab142848","affectsGlobalScope":true,"impliedFormat":1},{"version":"21d819c173c0cf7cc3ce57c3276e77fd9a8a01d35a06ad87158781515c9a438a","impliedFormat":1},{"version":"98cffbf06d6bab333473c70a893770dbe990783904002c4f1a960447b4b53dca","affectsGlobalScope":true,"impliedFormat":1},{"version":"ba481bca06f37d3f2c137ce343c7d5937029b2468f8e26111f3c9d9963d6568d","affectsGlobalScope":true,"impliedFormat":1},{"version":"6d9ef24f9a22a88e3e9b3b3d8c40ab1ddb0853f1bfbd5c843c37800138437b61","affectsGlobalScope":true,"impliedFormat":1},{"version":"1db0b7dca579049ca4193d034d835f6bfe73096c73663e5ef9a0b5779939f3d0","affectsGlobalScope":true,"impliedFormat":1},{"version":"9798340ffb0d067d69b1ae5b32faa17ab31b82466a3fc00d8f2f2df0c8554aaa","affectsGlobalScope":true,"impliedFormat":1},{"version":"f26b11d8d8e4b8028f1c7d618b22274c892e4b0ef5b3678a8ccbad85419aef43","affectsGlobalScope":true,"impliedFormat":1},{"version":"2cbe0621042e2a68c7cbce5dfed3906a1862a16a7d496010636cdbdb91341c0f","affectsGlobalScope":true,"impliedFormat":1},{"version":"e2677634fe27e87348825bb041651e22d50a613e2fdf6a4a3ade971d71bac37e","impliedFormat":1},{"version":"7394959e5a741b185456e1ef5d64599c36c60a323207450991e7a42e08911419","impliedFormat":1},{"version":"8c0bcd6c6b67b4b503c11e91a1fb91522ed585900eab2ab1f61bba7d7caa9d6f","impliedFormat":1},{"version":"8cd19276b6590b3ebbeeb030ac271871b9ed0afc3074ac88a94ed2449174b776","affectsGlobalScope":true,"impliedFormat":1},{"version":"696eb8d28f5949b87d894b26dc97318ef944c794a9a4e4f62360cd1d1958014b","impliedFormat":1},{"version":"3f8fa3061bd7402970b399300880d55257953ee6d3cd408722cb9ac20126460c","impliedFormat":1},{"version":"35ec8b6760fd7138bbf5809b84551e31028fb2ba7b6dc91d95d098bf212ca8b4","affectsGlobalScope":true,"impliedFormat":1},{"version":"5524481e56c48ff486f42926778c0a3cce1cc85dc46683b92b1271865bcf015a","impliedFormat":1},{"version":"68bd56c92c2bd7d2339457eb84d63e7de3bd56a69b25f3576e1568d21a162398","affectsGlobalScope":true,"impliedFormat":1},{"version":"3e93b123f7c2944969d291b35fed2af79a6e9e27fdd5faa99748a51c07c02d28","impliedFormat":1},{"version":"9d19808c8c291a9010a6c788e8532a2da70f811adb431c97520803e0ec649991","impliedFormat":1},{"version":"87aad3dd9752067dc875cfaa466fc44246451c0c560b820796bdd528e29bef40","impliedFormat":1},{"version":"4aacb0dd020eeaef65426153686cc639a78ec2885dc72ad220be1d25f1a439df","impliedFormat":1},{"version":"f0bd7e6d931657b59605c44112eaf8b980ba7f957a5051ed21cb93d978cf2f45","impliedFormat":1},{"version":"8db0ae9cb14d9955b14c214f34dae1b9ef2baee2fe4ce794a4cd3ac2531e3255","affectsGlobalScope":true,"impliedFormat":1},{"version":"15fc6f7512c86810273af28f224251a5a879e4261b4d4c7e532abfbfc3983134","impliedFormat":1},{"version":"58adba1a8ab2d10b54dc1dced4e41f4e7c9772cbbac40939c0dc8ce2cdb1d442","impliedFormat":1},{"version":"2fd4c143eff88dabb57701e6a40e02a4dbc36d5eb1362e7964d32028056a782b","impliedFormat":1},{"version":"714435130b9015fae551788df2a88038471a5a11eb471f27c4ede86552842bc9","impliedFormat":1},{"version":"855cd5f7eb396f5f1ab1bc0f8580339bff77b68a770f84c6b254e319bbfd1ac7","impliedFormat":1},{"version":"5650cf3dace09e7c25d384e3e6b818b938f68f4e8de96f52d9c5a1b3db068e86","impliedFormat":1},{"version":"1354ca5c38bd3fd3836a68e0f7c9f91f172582ba30ab15bb8c075891b91502b7","affectsGlobalScope":true,"impliedFormat":1},{"version":"27fdb0da0daf3b337c5530c5f266efe046a6ceb606e395b346974e4360c36419","impliedFormat":1},{"version":"2d2fcaab481b31a5882065c7951255703ddbe1c0e507af56ea42d79ac3911201","impliedFormat":1},{"version":"a192fe8ec33f75edbc8d8f3ed79f768dfae11ff5735e7fe52bfa69956e46d78d","impliedFormat":1},{"version":"ca867399f7db82df981d6915bcbb2d81131d7d1ef683bc782b59f71dda59bc85","affectsGlobalScope":true,"impliedFormat":1},{"version":"d9e971bba9cf977c7774abbd4d2e3413a231af8a06a2e8b16af2a606bc91ddd0","affectsGlobalScope":true,"impliedFormat":1},{"version":"9e043a1bc8fbf2a255bccf9bf27e0f1caf916c3b0518ea34aa72357c0afd42ec","impliedFormat":1},{"version":"b4f70ec656a11d570e1a9edce07d118cd58d9760239e2ece99306ee9dfe61d02","impliedFormat":1},{"version":"3bc2f1e2c95c04048212c569ed38e338873f6a8593930cf5a7ef24ffb38fc3b6","impliedFormat":1},{"version":"6e70e9570e98aae2b825b533aa6292b6abd542e8d9f6e9475e88e1d7ba17c866","impliedFormat":1},{"version":"f9d9d753d430ed050dc1bf2667a1bab711ccbb1c1507183d794cc195a5b085cc","impliedFormat":1},{"version":"9eece5e586312581ccd106d4853e861aaaa1a39f8e3ea672b8c3847eedd12f6e","impliedFormat":1},{"version":"47ab634529c5955b6ad793474ae188fce3e6163e3a3fb5edd7e0e48f14435333","impliedFormat":1},{"version":"37ba7b45141a45ce6e80e66f2a96c8a5ab1bcef0fc2d0f56bb58df96ec67e972","impliedFormat":1},{"version":"45650f47bfb376c8a8ed39d4bcda5902ab899a3150029684ee4c10676d9fbaee","impliedFormat":1},{"version":"0225ecb9ed86bdb7a2c7fd01f1556906902929377b44483dc4b83e03b3ef227d","affectsGlobalScope":true,"impliedFormat":1},{"version":"74cf591a0f63db318651e0e04cb55f8791385f86e987a67fd4d2eaab8191f730","impliedFormat":1},{"version":"5eab9b3dc9b34f185417342436ec3f106898da5f4801992d8ff38ab3aff346b5","impliedFormat":1},{"version":"12ed4559eba17cd977aa0db658d25c4047067444b51acfdcbf38470630642b23","affectsGlobalScope":true,"impliedFormat":1},{"version":"f3ffabc95802521e1e4bcba4c88d8615176dc6e09111d920c7a213bdda6e1d65","impliedFormat":1},{"version":"f9ab232778f2842ffd6955f88b1049982fa2ecb764d129ee4893cbc290f41977","impliedFormat":1},{"version":"ae56f65caf3be91108707bd8dfbccc2a57a91feb5daabf7165a06a945545ed26","impliedFormat":1},{"version":"a136d5de521da20f31631a0a96bf712370779d1c05b7015d7019a9b2a0446ca9","impliedFormat":1},{"version":"c3b41e74b9a84b88b1dca61ec39eee25c0dbc8e7d519ba11bb070918cfacf656","affectsGlobalScope":true,"impliedFormat":1},{"version":"4737a9dc24d0e68b734e6cfbcea0c15a2cfafeb493485e27905f7856988c6b29","affectsGlobalScope":true,"impliedFormat":1},{"version":"36d8d3e7506b631c9582c251a2c0b8a28855af3f76719b12b534c6edf952748d","impliedFormat":1},{"version":"1ca69210cc42729e7ca97d3a9ad48f2e9cb0042bada4075b588ae5387debd318","impliedFormat":1},{"version":"f5ebe66baaf7c552cfa59d75f2bfba679f329204847db3cec385acda245e574e","impliedFormat":1},{"version":"ed59add13139f84da271cafd32e2171876b0a0af2f798d0c663e8eeb867732cf","affectsGlobalScope":true,"impliedFormat":1},{"version":"05db535df8bdc30d9116fe754a3473d1b6479afbc14ae8eb18b605c62677d518","impliedFormat":1},{"version":"b1810689b76fd473bd12cc9ee219f8e62f54a7d08019a235d07424afbf074d25","impliedFormat":1},{"version":"b6d03c9cfe2cf0ba4c673c209fcd7c46c815b2619fd2aad59fc4229aaef2ed43","impliedFormat":1},{"version":"670a76db379b27c8ff42f1ba927828a22862e2ab0b0908e38b671f0e912cc5ed","impliedFormat":1},{"version":"13b77ab19ef7aadd86a1e54f2f08ea23a6d74e102909e3c00d31f231ed040f62","impliedFormat":1},{"version":"069bebfee29864e3955378107e243508b163e77ab10de6a5ee03ae06939f0bb9","impliedFormat":1},{"version":"427fe2004642504828c1476d0af4270e6ad4db6de78c0b5da3e4c5ca95052a99","impliedFormat":1},{"version":"9afb4cb864d297e4092a79ee2871b5d3143ea14153f62ef0bb04ede25f432030","affectsGlobalScope":true,"impliedFormat":99},{"version":"151ff381ef9ff8da2da9b9663ebf657eac35c4c9a19183420c05728f31a6761d","impliedFormat":1},{"version":"afe73051ff6a03a9565cbd8ebb0e956ee3df5e913ad5c1ded64218aabfa3dcb5","impliedFormat":1},{"version":"08323a8971cb5b2632b532cba1636ad4ca0d76f9f7d0b8d1a0c706fdf5c77b45","impliedFormat":1},{"version":"06fc6fbc8eb2135401cf5adce87655790891ca22ad4f97dfccd73c8cf8d8e6b5","impliedFormat":99},{"version":"1cce0c01dd7e255961851cdb9aa3d5164ec5f0e7f0fefc61e28f29afedda374f","impliedFormat":99},{"version":"7778598dfac1b1f51b383105034e14a0e95bc7b2538e0c562d5d315e7d576b76","impliedFormat":99},{"version":"b14409570c33921eb797282bb7f9c614ccc6008bf3800ba184e950cdfc54ab5c","impliedFormat":99},{"version":"2f0357257a651cc1b14e77b57a63c7b9e4e10ec2bb57e5fdccf83be0efb35280","impliedFormat":99},{"version":"866e63a72a9e85ed1ec74eaebf977be1483f44aa941bcae2ba9b9e3b39ca4395","impliedFormat":99},{"version":"6865d0d503a5ad6775339f6b5dcfa021d72d2567027943b52679222411ad2501","impliedFormat":99},{"version":"dc2be4768bcf96e5d5540ed06fdfbddb2ee210227556ea7b8114ad09d06d35a5","impliedFormat":99},{"version":"e86813f0b7a1ada681045a56323df84077c577ef6351461d4fff4c4afdf79302","impliedFormat":99},{"version":"b3ace759b8242cc742efb6e54460ed9b8ceb9e56ce6a9f9d5f7debe73ed4e416","impliedFormat":99},{"version":"1c4d715c5b7545acecd99744477faa8265ca3772b82c3fa5d77bfc8a27549c7e","impliedFormat":99},{"version":"8f92dbdd3bbc8620e798d221cb7c954f8e24e2eed31749dfdb5654379b031c26","impliedFormat":99},{"version":"f30bfef33d69e4d0837e9e0bbf5ea14ca148d73086dc95a207337894fde45c6b","impliedFormat":99},{"version":"82230238479c48046653e40a6916e3c820b947cb9e28b58384bc4e4cea6a9e92","impliedFormat":99},{"version":"3a6941ff3ea7b78017f9a593d0fd416feb45defa577825751c01004620b507d3","impliedFormat":99},{"version":"481c38439b932ef9e87e68139f6d03b0712bc6fc2880e909886374452a4169b5","impliedFormat":99},{"version":"64054d6374f7b8734304272e837aa0edcf4cfa2949fa5810971f747a0f0d9e9e","impliedFormat":99},{"version":"267498893325497596ff0d99bfdb5030ab4217c43801221d2f2b5eb5734e8244","impliedFormat":99},{"version":"d2ec89fb0934a47f277d5c836b47c1f692767511e3f2c38d00213c8ec4723437","impliedFormat":99},{"version":"475e411f48f74c14b1f6e50cc244387a5cc8ce52340dddfae897c96e03f86527","impliedFormat":99},{"version":"c1022a2b86fadc3f994589c09331bdb3461966fb87ebb3e28c778159a300044e","impliedFormat":99},{"version":"035a5df183489c2e22f3cf59fc1ed2b043d27f357eecc0eb8d8e840059d44245","impliedFormat":1},{"version":"a4809f4d92317535e6b22b01019437030077a76fec1d93b9881c9ed4738fcc54","impliedFormat":1},{"version":"5f53fa0bd22096d2a78533f94e02c899143b8f0f9891a46965294ee8b91a9434","impliedFormat":1},{"version":"7a1dd1e9c8bf5e23129495b10718b280340c7500570e0cfe5cffcdee51e13e48","impliedFormat":1},{"version":"f3d8c757e148ad968f0d98697987db363070abada5f503da3c06aefd9d4248c1","impliedFormat":1},{"version":"b58c81d4cc365d3986aee6c2a86592edc50f141b796899079196ffb103047390","impliedFormat":1},{"version":"916be7d770b0ae0406be9486ac12eb9825f21514961dd050594c4b250617d5a8","impliedFormat":1},{"version":"ce6a3f09b8db73a7e9701aca91a04b4fabaf77436dd35b24482f9ee816016b17","impliedFormat":1},{"version":"20e086e5b64fdd52396de67761cc0e94693494deadb731264aac122adf08de3f","impliedFormat":1},{"version":"6e78f75403b3ec65efb41c70d392aeda94360f11cedc9fb2c039c9ea23b30962","impliedFormat":1},{"version":"c863198dae89420f3c552b5a03da6ed6d0acfa3807a64772b895db624b0de707","impliedFormat":1},{"version":"8b03a5e327d7db67112ebbc93b4f744133eda2c1743dbb0a990c61a8007823ef","impliedFormat":1},{"version":"42fad1f540271e35ca37cecda12c4ce2eef27f0f5cf0f8dd761d723c744d3159","impliedFormat":1},{"version":"ff3743a5de32bee10906aff63d1de726f6a7fd6ee2da4b8229054dfa69de2c34","impliedFormat":1},{"version":"83acd370f7f84f203e71ebba33ba61b7f1291ca027d7f9a662c6307d74e4ac22","impliedFormat":1},{"version":"1445cec898f90bdd18b2949b9590b3c012f5b7e1804e6e329fb0fe053946d5ec","impliedFormat":1},{"version":"0e5318ec2275d8da858b541920d9306650ae6ac8012f0e872fe66eb50321a669","impliedFormat":1},{"version":"cf530297c3fb3a92ec9591dd4fa229d58b5981e45fe6702a0bd2bea53a5e59be","impliedFormat":1},{"version":"c1f6f7d08d42148ddfe164d36d7aba91f467dbcb3caa715966ff95f55048b3a4","impliedFormat":1},{"version":"eefd2bbc8edb14c3bd1246794e5c070a80f9b8f3730bd42efb80df3cc50b9039","impliedFormat":1},{"version":"0c1ee27b8f6a00097c2d6d91a21ee4d096ab52c1e28350f6362542b55380059a","impliedFormat":1},{"version":"7677d5b0db9e020d3017720f853ba18f415219fb3a9597343b1b1012cfd699f7","impliedFormat":1},{"version":"bc1c6bc119c1784b1a2be6d9c47addec0d83ef0d52c8fbe1f14a51b4dfffc675","impliedFormat":1},{"version":"52cf2ce99c2a23de70225e252e9822a22b4e0adb82643ab0b710858810e00bf1","impliedFormat":1},{"version":"770625067bb27a20b9826255a8d47b6b5b0a2d3dfcbd21f89904c731f671ba77","impliedFormat":1},{"version":"d1ed6765f4d7906a05968fb5cd6d1db8afa14dbe512a4884e8ea5c0f5e142c80","impliedFormat":1},{"version":"799c0f1b07c092626cf1efd71d459997635911bb5f7fc1196efe449bba87e965","impliedFormat":1},{"version":"2a184e4462b9914a30b1b5c41cf80c6d3428f17b20d3afb711fff3f0644001fd","impliedFormat":1},{"version":"9eabde32a3aa5d80de34af2c2206cdc3ee094c6504a8d0c2d6d20c7c179503cc","impliedFormat":1},{"version":"397c8051b6cfcb48aa22656f0faca2553c5f56187262135162ee79d2b2f6c966","impliedFormat":1},{"version":"a8ead142e0c87dcd5dc130eba1f8eeed506b08952d905c47621dc2f583b1bff9","impliedFormat":1},{"version":"a02f10ea5f73130efca046429254a4e3c06b5475baecc8f7b99a0014731be8b3","impliedFormat":1},{"version":"c2576a4083232b0e2d9bd06875dd43d371dee2e090325a9eac0133fd5650c1cb","impliedFormat":1},{"version":"4c9a0564bb317349de6a24eb4efea8bb79898fa72ad63a1809165f5bd42970dd","impliedFormat":1},{"version":"f40ac11d8859092d20f953aae14ba967282c3bb056431a37fced1866ec7a2681","impliedFormat":1},{"version":"cc11e9e79d4746cc59e0e17473a59d6f104692fd0eeea1bdb2e206eabed83b03","impliedFormat":1},{"version":"b444a410d34fb5e98aa5ee2b381362044f4884652e8bc8a11c8fe14bbd85518e","impliedFormat":1},{"version":"c35808c1f5e16d2c571aa65067e3cb95afeff843b259ecfa2fc107a9519b5392","impliedFormat":1},{"version":"14d5dc055143e941c8743c6a21fa459f961cbc3deedf1bfe47b11587ca4b3ef5","impliedFormat":1},{"version":"a3ad4e1fc542751005267d50a6298e6765928c0c3a8dce1572f2ba6ca518661c","impliedFormat":1},{"version":"f237e7c97a3a89f4591afd49ecb3bd8d14f51a1c4adc8fcae3430febedff5eb6","impliedFormat":1},{"version":"3ffdfbec93b7aed71082af62b8c3e0cc71261cc68d796665faa1e91604fbae8f","impliedFormat":1},{"version":"662201f943ed45b1ad600d03a90dffe20841e725203ced8b708c91fcd7f9379a","impliedFormat":1},{"version":"c9ef74c64ed051ea5b958621e7fb853fe3b56e8787c1587aefc6ea988b3c7e79","impliedFormat":1},{"version":"2462ccfac5f3375794b861abaa81da380f1bbd9401de59ffa43119a0b644253d","impliedFormat":1},{"version":"34baf65cfee92f110d6653322e2120c2d368ee64b3c7981dff08ed105c4f19b0","impliedFormat":1},{"version":"a56fe175741cc8841835eb72e61fa5a34adcbc249ede0e3494c229f0750f6b85","impliedFormat":1},{"version":"ab82804a14454734010dcdcd43f564ff7b0389bee4c5692eec76ff5b30d4cf66","impliedFormat":1},{"version":"bae8d023ef6b23df7da26f51cea44321f95817c190342a36882e93b80d07a960","impliedFormat":1},{"version":"26a770cec4bd2e7dbba95c6e536390fffe83c6268b78974a93727903b515c4e7","impliedFormat":1}],"root":[2483,[2582,2585]],"options":{"composite":true,"declaration":true,"declarationMap":true,"downlevelIteration":true,"esModuleInterop":true,"module":199,"outDir":"./","rootDir":"../src","skipLibCheck":true,"sourceMap":true,"strict":true,"target":9,"tsBuildInfoFile":"./.tsbuildinfo"},"referencedMap":[[56,1],[57,1],[11,1],[10,1],[2,1],[12,1],[13,1],[14,1],[15,1],[16,1],[17,1],[18,1],[19,1],[3,1],[20,1],[21,1],[4,1],[22,1],[26,1],[23,1],[24,1],[25,1],[27,1],[28,1],[29,1],[5,1],[30,1],[31,1],[32,1],[33,1],[6,1],[37,1],[34,1],[35,1],[36,1],[38,1],[7,1],[39,1],[44,1],[45,1],[40,1],[41,1],[42,1],[43,1],[8,1],[49,1],[46,1],[47,1],[48,1],[50,1],[9,1],[51,1],[52,1],[53,1],[55,1],[54,1],[1,1],[2653,2],[2650,1],[2651,1],[2652,1],[2655,3],[2654,1],[2656,1],[2657,4],[2679,5],[2659,6],[2661,7],[2660,6],[2663,8],[2665,9],[2666,10],[2667,10],[2668,9],[2669,10],[2670,9],[2671,11],[2672,10],[2673,9],[2674,12],[2675,6],[2676,6],[2677,13],[2664,14],[2678,13],[2662,13],[2680,1],[2681,15],[2682,16],[2683,1],[2684,1],[2685,1],[2686,1],[2711,17],[2712,18],[2688,19],[2691,20],[2709,17],[2710,17],[2700,17],[2699,21],[2697,17],[2692,17],[2705,17],[2703,17],[2707,17],[2687,17],[2704,17],[2708,17],[2693,17],[2694,17],[2706,17],[2689,17],[2695,17],[2696,17],[2698,17],[2702,17],[2713,22],[2701,17],[2690,17],[2726,23],[2725,1],[2720,22],[2722,24],[2721,22],[2714,22],[2715,22],[2717,22],[2719,22],[2723,24],[2724,24],[2716,24],[2718,24],[2727,1],[2658,25],[2728,1],[2729,26],[2459,27],[2428,1],[2446,28],[2458,29],[2457,30],[2427,31],[2466,32],[2429,1],[2447,33],[2456,34],[2433,35],[2444,36],[2451,37],[2448,38],[2431,39],[2430,40],[2443,41],[2434,42],[2450,43],[2452,44],[2453,45],[2454,45],[2455,46],[2460,1],[2426,1],[2461,45],[2462,47],[2436,48],[2437,48],[2438,48],[2445,49],[2449,50],[2435,51],[2463,52],[2464,53],[2439,1],[2432,54],[2440,55],[2441,56],[2442,57],[2465,36],[2585,1],[2329,1],[2334,58],[2333,1],[2405,59],[2407,60],[2406,59],[2404,61],[2361,1],[2363,62],[2362,63],[2367,64],[2402,65],[2399,66],[2401,67],[2364,66],[2365,68],[2369,68],[2368,69],[2366,70],[2400,71],[2398,66],[2403,72],[2396,1],[2397,1],[2370,73],[2375,66],[2377,66],[2372,66],[2373,73],[2379,66],[2380,74],[2371,66],[2376,66],[2378,66],[2374,66],[2394,75],[2393,66],[2395,76],[2389,66],[2391,66],[2390,66],[2386,66],[2392,77],[2387,66],[2388,78],[2381,66],[2382,66],[2383,66],[2384,66],[2385,66],[452,79],[450,80],[451,81],[461,82],[458,83],[454,84],[460,85],[457,84],[453,86],[151,1],[459,87],[456,87],[467,88],[462,1],[463,1],[464,87],[466,89],[465,90],[470,91],[468,92],[469,93],[474,94],[471,95],[472,96],[473,97],[477,98],[475,99],[476,100],[480,101],[478,102],[479,103],[483,104],[481,105],[482,106],[486,107],[484,108],[485,109],[899,110],[812,111],[694,112],[816,113],[695,114],[487,115],[489,116],[895,117],[871,1],[896,118],[870,119],[817,120],[488,87],[813,116],[818,121],[819,122],[898,123],[692,124],[821,125],[823,126],[868,127],[822,128],[824,126],[867,1],[866,129],[860,130],[490,1],[869,131],[537,132],[492,133],[491,134],[493,122],[693,135],[820,136],[814,137],[897,138],[815,139],[691,140],[938,141],[932,142],[933,143],[930,142],[931,144],[929,145],[937,146],[935,142],[936,147],[934,148],[967,149],[941,150],[939,151],[957,151],[961,152],[958,144],[942,150],[940,153],[956,154],[960,155],[959,156],[966,157],[964,158],[965,159],[962,144],[963,142],[928,160],[913,161],[903,162],[906,163],[900,164],[907,87],[914,165],[901,166],[908,167],[904,87],[905,87],[902,168],[917,169],[912,170],[918,171],[910,172],[911,173],[915,174],[916,175],[927,176],[909,1],[924,177],[922,178],[919,179],[926,180],[920,181],[921,182],[923,183],[925,184],[1061,185],[968,186],[1058,187],[991,188],[969,189],[1059,190],[970,191],[1060,192],[990,1],[1064,193],[1062,194],[1063,195],[1067,196],[1065,197],[1066,198],[726,199],[718,200],[724,201],[725,202],[723,203],[719,204],[720,205],[721,206],[722,207],[1070,208],[1068,209],[1069,210],[1073,211],[1071,212],[1072,213],[1100,214],[1075,215],[1074,216],[1094,217],[1095,218],[1077,219],[1085,220],[1078,1],[1079,221],[1099,222],[1086,223],[1098,224],[1080,221],[1089,225],[1090,226],[1076,227],[1084,228],[1081,229],[1083,223],[1082,230],[1096,231],[1097,232],[1087,231],[1088,233],[1091,221],[1092,234],[1093,235],[1103,236],[1101,237],[1102,238],[1106,239],[1104,240],[1105,241],[1175,242],[1107,87],[1173,243],[1164,244],[1109,245],[1170,246],[1110,87],[1165,1],[1171,247],[1108,248],[1166,249],[1163,250],[1172,251],[1162,252],[1169,253],[1174,254],[1111,1],[1112,255],[1114,256],[1113,1],[1167,257],[1168,258],[1178,259],[1176,260],[1177,261],[1181,262],[1179,263],[1180,264],[1184,265],[1182,266],[1183,267],[1187,268],[1185,269],[1186,270],[1190,271],[1188,272],[1189,273],[1193,274],[1191,275],[1192,276],[1198,277],[1197,278],[1195,279],[1196,277],[1194,1],[1204,280],[1199,281],[1203,282],[1202,283],[1200,284],[1201,285],[1031,286],[1017,287],[1016,204],[1029,288],[1018,289],[1030,290],[1019,291],[1020,292],[1021,293],[1022,294],[1023,295],[1024,296],[1025,297],[1026,1],[1027,1],[1028,295],[1207,298],[1205,299],[1206,300],[1210,301],[1208,302],[1209,303],[1218,304],[1216,305],[1217,306],[1215,307],[1213,308],[1212,309],[1214,310],[1211,311],[1221,312],[1219,313],[1220,314],[1255,315],[1222,316],[1226,317],[1224,318],[1229,319],[1230,320],[1231,321],[1254,322],[1225,323],[1228,324],[1223,323],[1251,325],[1252,326],[1227,204],[1253,327],[1258,328],[1256,329],[1257,330],[1264,331],[1259,332],[1261,333],[1263,334],[1260,1],[1262,333],[1267,335],[1265,336],[1266,337],[1270,338],[1268,339],[1269,340],[1273,341],[1271,342],[1272,343],[1276,344],[1274,345],[1275,346],[1279,347],[1277,348],[1278,349],[679,350],[658,351],[673,352],[677,353],[674,354],[678,355],[675,356],[676,357],[1283,358],[1280,359],[1282,360],[1281,361],[1286,362],[1284,363],[1285,364],[1289,365],[1287,366],[1288,367],[1292,368],[1290,369],[1291,370],[1298,371],[1293,1],[1296,372],[1294,373],[1297,374],[1295,375],[1331,376],[1321,377],[1322,378],[1330,379],[1323,380],[1325,381],[1326,382],[1328,383],[1324,383],[1327,384],[1329,385],[1320,386],[1300,387],[1301,388],[1299,389],[1305,390],[1306,391],[1317,392],[1318,393],[1302,387],[1303,1],[1319,394],[1307,387],[1308,395],[1315,204],[1309,396],[1310,387],[1304,387],[1311,387],[1312,397],[1313,387],[1316,398],[1314,399],[1335,400],[1332,401],[1333,402],[1334,403],[1343,404],[1336,405],[1337,406],[1339,407],[1342,408],[1341,409],[1338,410],[1340,407],[536,411],[495,412],[494,413],[525,414],[532,415],[524,416],[534,417],[526,418],[528,419],[498,420],[535,421],[529,422],[530,422],[496,87],[523,423],[499,424],[533,1],[531,422],[527,1],[497,425],[1346,426],[1344,427],[1345,428],[1376,429],[1349,430],[1350,293],[1351,431],[1348,432],[1352,1],[1354,1],[1347,1],[1353,433],[1355,434],[1356,1],[1375,435],[1372,436],[1374,437],[1370,438],[1373,437],[1367,439],[1357,440],[1366,441],[1368,442],[1369,204],[1365,443],[1371,281],[1364,444],[1360,445],[1361,446],[1359,447],[1358,1],[1363,448],[1362,449],[1379,450],[1377,451],[1378,452],[1401,453],[1383,454],[1380,455],[1385,204],[1386,456],[1388,457],[1389,458],[1381,459],[1400,460],[1390,204],[1392,461],[1391,456],[1393,462],[1394,463],[1387,464],[1384,1],[1395,204],[1396,465],[1398,466],[1399,467],[1397,468],[1382,204],[763,469],[760,470],[759,471],[762,472],[761,473],[1404,474],[1402,475],[1403,476],[1440,477],[1405,478],[1406,479],[1408,480],[1413,481],[1409,482],[1412,483],[1411,484],[1410,485],[1414,486],[1415,487],[1416,488],[1417,488],[1438,489],[1407,489],[1418,489],[1419,490],[1420,489],[1422,491],[1421,492],[1423,493],[1424,489],[1425,479],[1439,494],[1428,495],[1429,496],[1426,489],[1427,497],[1431,498],[1430,499],[1432,500],[1433,501],[1434,502],[1435,503],[1437,489],[1436,504],[982,505],[972,506],[971,507],[974,508],[980,509],[981,510],[979,511],[973,512],[975,513],[976,514],[977,515],[978,516],[1443,517],[1441,518],[1442,519],[1446,520],[1444,521],[1445,522],[775,523],[770,524],[774,525],[771,293],[772,293],[773,526],[1450,527],[1447,528],[1448,529],[1449,530],[894,531],[872,532],[893,533],[873,1],[878,534],[879,535],[880,293],[881,536],[882,204],[887,537],[886,538],[884,539],[888,537],[889,538],[892,540],[890,537],[885,541],[891,537],[874,542],[883,543],[1453,544],[1451,545],[1452,546],[1458,547],[1456,548],[1457,549],[1455,550],[1454,551],[1461,552],[1459,553],[1460,554],[1464,555],[1462,556],[1463,557],[1467,558],[1465,559],[1466,560],[1470,561],[1468,562],[1469,563],[1473,564],[1471,565],[1472,566],[1476,567],[1474,568],[1475,569],[1479,570],[1477,571],[1478,572],[1482,573],[1480,574],[1481,575],[1485,576],[1483,577],[1484,578],[1488,579],[1486,580],[1487,581],[1491,582],[1489,583],[1490,584],[1494,585],[1492,586],[1493,587],[1497,588],[1495,589],[1496,590],[1500,591],[1498,592],[1499,593],[1503,594],[1501,595],[1502,596],[1506,597],[1504,598],[1505,599],[1509,600],[1507,601],[1508,602],[1512,603],[1510,604],[1511,605],[1515,606],[1513,607],[1514,608],[1525,609],[1517,610],[1520,611],[1521,612],[1523,613],[1516,1],[1524,614],[1522,615],[1518,204],[1519,616],[1528,617],[1526,618],[1527,619],[1531,620],[1529,621],[1530,622],[1127,623],[1122,624],[1121,1],[1115,625],[1123,626],[1126,627],[1116,628],[1117,629],[1118,630],[1119,631],[1124,632],[1125,633],[1120,634],[646,635],[540,636],[539,204],[639,637],[584,638],[593,639],[617,1],[597,640],[598,641],[616,642],[599,643],[638,644],[644,645],[596,646],[645,647],[643,87],[619,1],[627,648],[618,649],[624,650],[626,651],[588,652],[589,652],[587,652],[586,653],[592,654],[591,655],[628,656],[629,1],[630,657],[594,658],[642,640],[595,1],[640,659],[541,281],[637,660],[631,661],[585,662],[625,663],[641,664],[632,665],[633,666],[634,1],[636,667],[635,668],[590,1],[743,669],[740,670],[742,671],[741,672],[739,673],[737,674],[734,675],[738,676],[735,87],[736,677],[1574,678],[1539,679],[1567,679],[1534,680],[1536,681],[1570,681],[1532,682],[1564,683],[1540,684],[1568,685],[1537,686],[1571,687],[1533,688],[1565,689],[1541,690],[1569,691],[1538,692],[1572,693],[1535,694],[1566,695],[1573,696],[1057,697],[993,698],[1036,699],[1035,1],[1034,700],[992,701],[1010,702],[1005,703],[1015,704],[1032,705],[1009,706],[998,707],[1006,708],[1033,709],[1037,710],[1038,711],[994,712],[1007,713],[1041,714],[1042,715],[1039,716],[1040,717],[1001,718],[995,719],[996,720],[997,721],[1043,720],[1056,722],[1008,723],[999,724],[1044,1],[1045,725],[1046,726],[1047,726],[1052,727],[1048,725],[1049,725],[1000,728],[1053,729],[1050,726],[1051,725],[1002,730],[1054,731],[1003,732],[1055,733],[1004,1],[750,734],[748,735],[747,736],[746,737],[749,738],[1250,739],[1233,740],[1234,740],[1235,741],[1232,1],[1243,742],[1242,743],[1244,744],[1247,745],[1236,746],[1237,747],[1249,748],[1238,749],[1246,740],[1245,741],[1239,750],[1240,746],[1248,281],[1241,751],[1577,752],[1575,753],[1576,754],[1580,755],[1578,756],[1579,757],[1014,758],[1011,759],[1013,760],[1012,761],[1583,762],[1581,763],[1582,764],[1589,765],[1584,766],[1588,767],[1586,768],[1585,766],[1587,769],[690,770],[653,771],[682,772],[655,773],[681,774],[649,775],[651,776],[654,1],[683,777],[656,778],[538,779],[689,780],[685,781],[687,782],[686,783],[684,784],[657,785],[647,786],[650,787],[648,1],[652,788],[680,789],[688,790],[1132,791],[1130,792],[1129,793],[1128,794],[1131,795],[1592,796],[1590,797],[1591,798],[1595,799],[1593,800],[1594,801],[1598,802],[1596,803],[1597,804],[1601,805],[1599,806],[1600,807],[1563,808],[1559,809],[1557,810],[1558,811],[1560,812],[1548,813],[1543,814],[1547,815],[1544,816],[1550,1],[1551,817],[1552,818],[1556,819],[1562,820],[1554,821],[1549,822],[1555,823],[1561,824],[1545,825],[1546,826],[1553,827],[1542,828],[576,829],[574,830],[557,831],[573,204],[568,832],[549,87],[559,833],[558,834],[575,835],[548,836],[570,837],[547,87],[572,838],[571,204],[569,839],[1604,840],[1602,841],[1603,842],[1607,843],[1605,844],[1606,845],[1610,846],[1608,847],[1609,848],[1613,849],[1611,850],[1612,851],[1616,852],[1614,853],[1615,854],[1619,855],[1617,856],[1618,857],[1622,858],[1620,859],[1621,860],[1625,861],[1623,862],[1624,863],[1632,864],[1626,1],[1627,865],[1628,866],[1631,867],[1630,868],[1629,1],[1635,869],[1633,870],[1634,871],[1638,872],[1636,873],[1637,874],[1651,875],[1646,876],[1649,877],[1650,878],[1648,877],[1647,876],[1645,879],[1643,880],[1641,881],[1640,1],[1639,882],[1644,883],[1642,884],[806,885],[804,886],[805,887],[1654,888],[1652,889],[1653,890],[1657,891],[1655,892],[1656,893],[1660,894],[1658,895],[1659,896],[1663,897],[1661,898],[1662,899],[1666,900],[1664,901],[1665,902],[1669,903],[1667,904],[1668,905],[1672,906],[1670,907],[1671,908],[522,909],[518,910],[505,911],[507,912],[500,913],[509,914],[521,915],[520,916],[513,917],[512,918],[516,919],[515,919],[517,920],[504,921],[503,922],[508,923],[502,924],[510,925],[511,926],[501,919],[514,927],[506,928],[519,922],[1675,929],[1673,930],[1674,931],[1678,932],[1676,933],[1677,934],[1682,935],[1680,936],[1681,937],[1679,938],[1685,939],[1684,940],[1683,941],[1688,942],[1687,943],[1686,944],[1691,945],[1690,946],[1689,947],[1694,948],[1693,949],[1692,950],[1697,951],[1696,952],[1695,953],[1700,954],[1699,955],[1698,956],[1703,957],[1702,958],[1701,959],[1706,960],[1705,961],[1704,962],[1709,963],[1708,964],[1707,965],[1712,966],[1711,967],[1710,968],[1715,969],[1714,970],[1713,971],[1718,972],[1717,973],[1716,974],[1721,975],[1720,976],[1719,977],[1724,978],[1723,979],[1722,980],[1727,981],[1726,982],[1725,983],[1730,984],[1729,985],[1728,986],[1733,987],[1732,988],[1731,989],[1736,990],[1735,991],[1734,992],[705,993],[704,994],[703,995],[702,996],[701,997],[700,998],[1740,999],[1739,1000],[1737,1001],[1738,1002],[1743,1003],[1742,1004],[1741,1002],[811,1005],[801,1006],[707,1007],[697,1008],[698,1009],[810,1010],[699,1011],[696,1012],[800,1013],[708,1014],[799,1015],[798,1015],[797,1015],[796,1016],[808,1017],[802,1018],[803,1019],[807,1020],[809,1021],[706,1022],[1746,1023],[1745,1024],[1744,1025],[556,1026],[551,1027],[555,1028],[552,1],[553,1029],[550,1030],[554,674],[1749,1031],[1748,1032],[1747,1033],[1756,1034],[1750,1035],[1755,1036],[1751,1037],[1752,1038],[1753,1039],[1754,1040],[1781,1041],[1757,1042],[1778,1043],[1759,1044],[1779,1045],[1780,1046],[1761,1047],[1760,1048],[1762,1049],[1777,1050],[1763,1050],[1774,1051],[1773,1052],[1776,1053],[1775,1054],[1758,1055],[1785,1056],[1783,1057],[1784,1058],[1782,87],[795,1059],[733,1060],[728,1061],[709,1],[792,1062],[791,1063],[744,1064],[710,1065],[713,1066],[745,87],[711,1067],[786,1],[716,1068],[712,1069],[751,1070],[732,1071],[717,1072],[782,1073],[783,1],[784,1074],[794,1075],[793,1076],[752,1065],[729,1077],[714,1078],[754,1079],[755,1080],[756,1081],[730,1082],[757,1083],[753,204],[727,1084],[715,1066],[785,1085],[758,1],[731,1083],[1788,1086],[1787,1087],[1786,1088],[1791,1089],[1790,1090],[1789,1091],[1794,1092],[1793,1093],[1792,1094],[1797,1095],[1796,1096],[1795,1097],[1800,1098],[1799,1099],[1798,1100],[1805,1101],[1803,1102],[1804,1103],[1802,1104],[1801,1105],[615,1106],[610,1107],[600,1108],[601,293],[614,1109],[609,1110],[611,1111],[602,1112],[604,1113],[603,1114],[605,1115],[606,1],[612,317],[613,1112],[607,1111],[608,1112],[1808,1116],[1807,1117],[1806,1118],[1811,1119],[1810,1120],[1809,1121],[1814,1122],[1813,1123],[1812,1124],[1817,1125],[1816,1126],[1815,1127],[1820,1128],[1819,1129],[1818,1130],[1823,1131],[1822,1132],[1821,1133],[1826,1134],[1825,1135],[1824,1136],[1829,1137],[1828,1138],[1827,1139],[1832,1140],[1831,1141],[1830,1142],[1835,1143],[1834,1144],[1833,1145],[1838,1146],[1837,1147],[1836,1148],[1841,1149],[1840,1150],[1839,1151],[1844,1152],[1843,1153],[1842,1154],[1847,1155],[1846,1156],[1845,1157],[1850,1158],[1849,1159],[1848,1160],[1853,1161],[1852,1162],[1851,1163],[1856,1164],[1855,1165],[1854,1166],[1859,1167],[1858,1168],[1857,1169],[1862,1170],[1861,1171],[1860,1172],[1865,1173],[1864,1174],[1863,1175],[1868,1176],[1867,1177],[1866,1178],[1871,1179],[1870,1180],[1869,1181],[1874,1182],[1873,1183],[1872,1184],[1877,1185],[1876,1186],[1875,1187],[1880,1188],[1879,1189],[1878,1190],[1883,1191],[1882,1192],[1881,1193],[1886,1194],[1885,1195],[1884,1196],[1889,1197],[1888,1198],[1887,1199],[1892,1200],[1891,1201],[1890,1202],[1138,1203],[1136,1204],[1137,1205],[1134,1206],[1133,1207],[1135,1],[1895,1208],[1894,1209],[1893,1210],[1898,1211],[1897,1212],[1896,1213],[1901,1214],[1900,1215],[1899,1216],[1904,1217],[1903,1218],[1902,1219],[1907,1220],[1906,1221],[1905,1222],[1910,1223],[1909,1224],[1908,1225],[1913,1226],[1912,1227],[1911,1228],[1916,1229],[1915,1230],[1914,1231],[1919,1232],[1918,1233],[1917,1234],[1922,1235],[1921,1236],[1920,1237],[877,1238],[876,1239],[875,1240],[1925,1241],[1924,1242],[1923,1243],[1928,1244],[1927,1245],[1926,1246],[1931,1247],[1930,1248],[1929,1249],[1934,1250],[1933,1251],[1932,1252],[1937,1253],[1936,1254],[1935,1255],[1940,1256],[1939,1257],[1938,1258],[1943,1259],[1942,1260],[1941,1261],[1946,1262],[1945,1263],[1944,1264],[1161,1265],[1155,1266],[1141,1],[1144,1267],[1154,1268],[1156,1269],[1142,1],[1157,612],[1145,1],[1139,1],[1140,1270],[1160,1271],[1147,1272],[1151,1273],[1146,1274],[1143,1275],[1148,1276],[1152,1277],[1153,1278],[1159,1279],[1149,1280],[1158,1281],[1150,175],[1949,1282],[1948,1283],[1947,1284],[1952,1285],[1951,1286],[1950,1287],[1955,1288],[1954,1289],[1953,1290],[1958,1291],[1957,1292],[1956,1293],[1961,1294],[1960,1295],[1959,1296],[1964,1297],[1963,1298],[1962,1299],[1967,1300],[1966,1301],[1965,1302],[1970,1303],[1969,1304],[1968,1305],[1973,1306],[1972,1307],[1971,1308],[1976,1309],[1975,1310],[1974,1311],[1991,1312],[1978,1313],[1979,1314],[1980,1315],[1981,1316],[1983,1317],[1984,1318],[1982,1319],[1988,1320],[1990,1321],[1986,1322],[1985,1323],[1989,1314],[1977,1],[1987,1324],[672,1325],[664,1326],[660,1],[661,1],[662,204],[665,1327],[666,1],[659,1328],[669,1329],[671,1330],[667,1331],[663,1332],[668,1333],[670,1334],[1994,1335],[1993,1336],[1992,1337],[1997,1338],[1996,1339],[1995,1340],[2000,1341],[1999,1342],[1998,1343],[2003,1344],[2002,1345],[2001,1346],[2006,1347],[2005,1348],[2004,1349],[2009,1350],[2008,1351],[2007,1352],[583,1353],[581,1354],[582,1355],[2013,1356],[2011,1357],[2012,1358],[2010,1359],[2018,1360],[2017,1361],[2016,1038],[2015,1362],[2014,1363],[580,1364],[543,1365],[544,1366],[577,1367],[545,1368],[579,1369],[578,1],[546,87],[542,1370],[2021,1371],[2020,1372],[2019,1373],[2024,1374],[2023,1375],[2022,1376],[2027,1377],[2026,1378],[2025,1379],[2030,1380],[2029,1381],[2028,1382],[2033,1383],[2032,1384],[2031,1385],[865,1386],[862,1387],[864,1388],[863,1387],[861,1389],[2036,1390],[2035,1391],[2034,1392],[2061,1393],[2047,1394],[2048,1395],[2050,1396],[2049,1397],[2052,1398],[2060,1399],[2051,1400],[2053,1401],[2054,1402],[2055,1403],[2056,1404],[2057,1405],[2058,1406],[2046,1407],[2059,1408],[2045,1409],[2044,1410],[2043,1411],[2038,1412],[2039,1413],[2040,1414],[2042,1415],[2037,1416],[2041,1417],[2064,1418],[2063,1419],[2062,1420],[989,1421],[988,1422],[986,1423],[984,1424],[987,1425],[985,1426],[983,1427],[2067,1428],[2066,1429],[2065,1430],[2070,1431],[2069,1432],[2068,1433],[2081,1434],[2078,1435],[2071,1],[2072,1436],[2080,1437],[2079,1438],[2076,1439],[2077,1440],[2075,1441],[2073,1442],[2074,1443],[2084,1444],[2083,1445],[2082,1446],[955,1447],[949,1448],[943,1448],[950,1449],[954,1450],[948,1451],[944,1448],[945,87],[946,1448],[951,1452],[952,1449],[947,1453],[953,1454],[2105,1455],[2097,1456],[2098,1457],[2104,1458],[2099,1459],[2100,1460],[2101,1457],[2102,1457],[2103,1457],[2096,1461],[2090,1462],[2091,1463],[2089,204],[2092,1464],[2095,1465],[2088,204],[2085,1466],[2087,1467],[2086,1468],[2094,1469],[2093,204],[2108,1470],[2107,1471],[2106,1472],[790,1473],[789,1474],[787,1475],[788,204],[2111,1476],[2110,1477],[2109,1478],[2114,1479],[2113,1480],[2112,1481],[1772,1482],[1765,1483],[1770,1484],[1771,1485],[1766,1486],[1769,1483],[1767,1487],[1764,1488],[1768,1483],[781,1489],[766,87],[780,1490],[777,1491],[779,1492],[765,1493],[764,1494],[769,1495],[767,1],[768,1496],[776,1497],[778,1498],[567,1499],[566,1500],[563,1501],[562,1502],[564,1503],[565,1504],[561,1505],[560,1506],[623,1507],[622,1508],[621,1509],[620,1510],[2117,1511],[2116,1512],[2115,1513],[2120,1514],[2119,1515],[2118,1516],[2123,1517],[2122,1518],[2121,1519],[2126,1520],[2125,1521],[2124,1522],[2129,1523],[2128,1524],[2127,1525],[2198,1526],[2183,1527],[2184,1528],[2186,1529],[2185,1530],[2187,1531],[2179,1532],[2180,1532],[2177,1533],[2178,1532],[2191,1532],[2168,1534],[2169,1535],[2194,1536],[2192,1],[2193,1537],[2176,1538],[2175,1538],[2181,1532],[2174,1539],[2171,1539],[2172,1539],[2170,1],[2173,1539],[2141,1540],[2142,1540],[2135,680],[2136,1541],[2143,1542],[2182,1543],[2158,1532],[2159,1532],[2155,1544],[2160,1532],[2161,1545],[2156,1532],[2157,1532],[2162,1543],[2163,1532],[2164,1546],[2154,1547],[2190,1548],[2188,1549],[2165,1550],[2167,1532],[2166,1544],[2195,1549],[2197,1551],[2134,1550],[2133,1547],[2130,1552],[2132,1547],[2131,1552],[2196,1532],[2144,1553],[2148,1554],[2147,1532],[2149,1555],[2145,1555],[2146,1556],[2150,1532],[2189,87],[2137,1557],[2138,1558],[2140,1559],[2139,1560],[2151,1527],[2153,1532],[2152,1532],[859,1561],[827,1562],[857,1563],[836,1564],[829,1],[856,1565],[826,1],[825,87],[858,1566],[828,1],[833,1567],[838,1568],[831,1569],[832,1570],[839,1571],[842,1572],[853,1573],[852,1574],[849,1],[850,1575],[851,1575],[843,1576],[847,1577],[848,1578],[835,1579],[844,1577],[834,1580],[845,1576],[855,1581],[840,1582],[846,1583],[841,1584],[830,1585],[854,674],[837,1586],[2201,1587],[2200,1588],[2199,1589],[2208,1590],[2205,1591],[2203,1592],[2207,1593],[2202,1],[2204,87],[2206,1594],[2211,1595],[2210,1596],[2209,1597],[2214,1598],[2213,1599],[2212,1600],[2217,1601],[2216,1602],[2215,1603],[2220,1604],[2219,1605],[2218,1606],[2223,1607],[2222,1608],[2221,1609],[2226,1610],[2225,1611],[2224,1612],[2229,1613],[2228,1614],[2227,1615],[2232,1616],[2231,1617],[2230,1618],[2235,1619],[2234,1620],[2233,1621],[2238,1622],[2237,1623],[2236,1624],[2241,1625],[2240,1626],[2239,1627],[2244,1628],[2243,1629],[2242,1630],[2247,1631],[2246,1632],[2245,1633],[2250,1634],[2249,1635],[2248,1636],[2253,1637],[2252,1638],[2251,1639],[70,1],[2256,1640],[2254,204],[2255,1641],[455,1642],[157,293],[155,1643],[63,1644],[62,293],[165,1645],[65,1646],[64,1647],[172,1],[134,1648],[113,1649],[144,1650],[112,1651],[121,1652],[122,1653],[135,1653],[145,1654],[123,1653],[136,1655],[137,1649],[138,293],[114,1],[116,1656],[139,1655],[124,1],[444,372],[156,293],[169,1657],[170,1658],[171,1659],[168,1660],[166,1661],[96,1662],[147,1],[67,1663],[153,1664],[446,1],[148,1665],[445,293],[163,1666],[164,1667],[162,1],[126,1668],[128,1669],[133,1670],[129,1644],[131,1],[130,293],[449,1671],[120,1672],[447,293],[167,1673],[68,293],[160,1],[100,1674],[127,1],[132,1651],[154,1675],[69,293],[101,1676],[146,1677],[115,1],[99,1678],[159,1679],[125,293],[158,1680],[149,1],[109,1681],[106,1682],[108,1683],[104,1683],[110,1684],[105,1683],[107,1685],[103,1681],[102,1686],[150,1],[111,1687],[143,1688],[97,1672],[118,1689],[117,1690],[448,1],[119,1691],[161,1],[98,1],[142,1692],[140,1],[141,1693],[2266,1694],[2258,1695],[2259,1696],[2257,293],[2263,1697],[2264,1698],[2265,1699],[2262,1700],[2261,1701],[2260,1702],[95,1703],[93,1],[87,1704],[80,1705],[88,1],[81,1704],[82,1704],[89,1],[86,1],[85,1706],[83,1707],[73,1],[75,1],[76,1],[78,1],[74,1],[77,1],[72,1],[71,1],[79,1],[91,1708],[94,1709],[84,1710],[92,1],[152,1],[90,1],[2304,1711],[66,1],[174,1712],[175,1712],[176,1712],[177,1712],[178,1712],[179,1712],[180,1712],[181,1712],[182,1712],[183,1712],[184,1712],[185,1712],[186,1712],[187,1712],[188,1712],[189,1712],[190,1712],[191,1712],[192,1712],[193,1712],[194,1712],[195,1712],[196,1712],[197,1712],[198,1712],[199,1712],[200,1712],[201,1712],[202,1712],[203,1712],[204,1712],[205,1712],[206,1712],[207,1712],[208,1712],[209,1712],[210,1712],[211,1712],[212,1712],[213,1712],[214,1712],[215,1712],[216,1712],[217,1712],[173,1712],[218,1712],[219,1712],[220,1712],[221,1712],[222,1712],[223,1712],[224,1712],[225,1712],[226,1712],[227,1712],[228,1712],[229,1712],[230,1712],[231,1712],[232,1712],[233,1712],[234,1712],[235,1712],[236,1712],[237,1712],[238,1712],[239,1712],[240,1712],[241,1712],[242,1712],[243,1712],[244,1712],[245,1712],[246,1712],[247,1712],[248,1712],[249,1712],[250,1712],[251,1712],[252,1712],[253,1712],[254,1712],[255,1712],[256,1712],[257,1712],[258,1712],[259,1712],[260,1712],[261,1712],[262,1712],[263,1712],[264,1712],[265,1712],[266,1712],[267,1712],[268,1712],[269,1712],[270,1712],[271,1712],[272,1712],[273,1712],[274,1712],[275,1712],[276,1712],[277,1712],[278,1712],[279,1712],[280,1712],[281,1712],[282,1712],[283,1712],[284,1712],[285,1712],[286,1712],[287,1712],[288,1712],[289,1712],[290,1712],[291,1712],[292,1712],[293,1712],[294,1712],[295,1712],[296,1712],[297,1712],[298,1712],[299,1712],[300,1712],[301,1712],[302,1712],[303,1712],[304,1712],[305,1712],[306,1712],[307,1712],[308,1712],[309,1712],[310,1712],[311,1712],[312,1712],[313,1712],[314,1712],[315,1712],[316,1712],[317,1712],[318,1712],[319,1712],[320,1712],[321,1712],[322,1712],[323,1712],[324,1712],[325,1712],[326,1712],[327,1712],[328,1712],[329,1712],[330,1712],[331,1712],[332,1712],[333,1712],[334,1712],[335,1712],[336,1712],[337,1712],[338,1712],[339,1712],[340,1712],[341,1712],[342,1712],[343,1712],[344,1712],[345,1712],[346,1712],[347,1712],[348,1712],[349,1712],[350,1712],[351,1712],[352,1712],[353,1712],[354,1712],[355,1712],[356,1712],[357,1712],[358,1712],[359,1712],[360,1712],[361,1712],[362,1712],[363,1712],[364,1712],[365,1712],[366,1712],[367,1712],[368,1712],[369,1712],[370,1712],[371,1712],[372,1712],[373,1712],[374,1712],[375,1712],[376,1712],[377,1712],[378,1712],[379,1712],[380,1712],[381,1712],[382,1712],[383,1712],[384,1712],[385,1712],[386,1712],[387,1712],[388,1712],[389,1712],[390,1712],[391,1712],[392,1712],[393,1712],[394,1712],[395,1712],[396,1712],[397,1712],[398,1712],[399,1712],[400,1712],[401,1712],[402,1712],[403,1712],[404,1712],[405,1712],[406,1712],[407,1712],[408,1712],[409,1712],[410,1712],[411,1712],[412,1712],[413,1712],[414,1712],[415,1712],[416,1712],[417,1712],[418,1712],[419,1712],[420,1712],[421,1712],[422,1712],[423,1712],[424,1712],[425,1712],[426,1712],[427,1712],[428,1712],[429,1712],[430,1712],[431,1712],[432,1712],[433,1712],[434,1712],[435,1712],[436,1712],[437,1712],[438,1712],[439,1712],[440,1712],[441,1712],[443,1713],[442,1714],[2269,1715],[2267,1037],[2268,1716],[2272,1717],[2271,1718],[2270,1037],[2294,1719],[2273,1],[2277,1720],[2281,1721],[2280,1722],[2275,1723],[2274,1724],[2278,1725],[2276,1726],[2279,1727],[2282,1728],[2283,1729],[2289,1730],[2291,1731],[2287,1732],[2290,1733],[2292,1734],[2288,1735],[2284,1736],[2293,1737],[2286,1738],[2285,1739],[2299,1740],[2295,1],[2296,1],[2298,1741],[2297,1],[2303,1742],[2302,1743],[2301,1744],[2300,1745],[60,1746],[58,1747],[61,1748],[59,1],[2414,1749],[2415,1750],[2413,1751],[2416,1752],[2410,1],[2411,1753],[2412,1754],[2482,1755],[2340,1756],[2339,1756],[2341,1757],[2419,1758],[2337,674],[2346,1759],[2305,1760],[2306,1],[2336,1756],[2308,1761],[2332,1762],[2475,1763],[2473,1759],[2477,1764],[2476,1765],[2474,1],[2335,1766],[2421,1767],[2349,1768],[2345,1769],[2343,1],[2307,1770],[2344,1771],[2420,1],[2342,1772],[2338,1773],[2314,1],[2348,1774],[2347,1775],[2325,1],[2326,1776],[2358,1777],[2359,1778],[2317,1],[2318,1779],[2323,1],[2324,1780],[2330,1781],[2331,1782],[2309,1783],[2310,1784],[2360,1785],[2354,1786],[2353,1787],[2352,1788],[2351,1789],[2350,1790],[2316,1791],[2315,1792],[2313,1793],[2312,1794],[2328,1795],[2327,1],[2357,1796],[2355,1797],[2356,1783],[2322,1798],[2321,1],[2320,1799],[2319,293],[2311,1800],[2480,1801],[2481,1802],[2479,1803],[2478,1804],[2422,1805],[2469,1806],[2423,1807],[2467,1],[2471,1808],[2468,1806],[2417,1809],[2418,1],[2472,1810],[2425,1810],[2409,59],[2408,1811],[2424,1812],[2470,1813],[2586,1],[2598,1814],[2599,1814],[2600,1815],[2592,1816],[2601,1817],[2602,1818],[2603,1819],[2587,1],[2590,1820],[2588,1],[2589,1],[2604,1821],[2605,1822],[2606,1823],[2607,1824],[2608,1825],[2609,1826],[2610,1826],[2611,1827],[2612,1828],[2613,1829],[2614,1830],[2593,1],[2591,1],[2615,1831],[2616,1832],[2617,1833],[2649,1834],[2618,1835],[2619,1836],[2620,1837],[2621,1838],[2622,1839],[2623,1840],[2624,1841],[2625,1842],[2626,1843],[2627,1844],[2628,1844],[2629,1845],[2630,1],[2631,1846],[2633,1847],[2632,1848],[2634,1849],[2635,1850],[2636,1851],[2637,1852],[2638,1853],[2639,1854],[2640,1855],[2641,1856],[2642,1857],[2643,1858],[2644,1859],[2645,1860],[2646,1861],[2594,1],[2595,1],[2596,1],[2597,1],[2647,1862],[2648,1863],[2556,1864],[2539,412],[2540,413],[2541,414],[2551,415],[2538,416],[2554,417],[2542,418],[2543,419],[2544,420],[2555,421],[2545,422],[2548,422],[2547,87],[2546,423],[2552,1],[2549,422],[2553,1],[2550,425],[2530,1865],[2488,636],[2487,204],[2489,637],[2492,638],[2491,639],[2521,640],[2519,641],[2520,642],[2522,643],[2490,644],[2528,1866],[2527,646],[2529,1867],[2526,87],[2493,1],[2494,648],[2523,649],[2525,650],[2495,651],[2499,652],[2500,652],[2497,652],[2496,653],[2501,654],[2498,655],[2502,656],[2504,1],[2503,657],[2509,658],[2524,640],[2505,1],[2506,659],[2507,660],[2508,661],[2516,662],[2510,663],[2515,664],[2514,665],[2518,666],[2512,1],[2511,667],[2513,668],[2517,1],[2486,1868],[2484,753],[2485,754],[2579,1869],[2575,1027],[2578,1028],[2574,1],[2573,1029],[2577,1030],[2576,674],[2572,1870],[2557,1107],[2566,1108],[2567,293],[2571,1109],[2558,1110],[2563,1111],[2559,1112],[2570,1113],[2569,1114],[2560,1115],[2561,1],[2564,317],[2565,1112],[2562,1111],[2568,1112],[2537,1871],[2536,1422],[2533,1423],[2532,1424],[2534,1425],[2531,1426],[2535,1427],[2580,1711],[2581,1748],[2483,1872],[2582,1873],[2583,1874],[2584,1875]],"latestChangedDtsFile":"./elasticache-redis.creator.d.ts","version":"5.9.3"}
Remediation: Resolve TODO/placeholder logic and replace vaporware sections with production-ready implementations/documentation.

## eventbridge-rule-cron
Requirement ID: 0.1 Platform Component API Spec
Status: PASS
Finding: `EventBridgeRuleCronComponent` extends BaseComponent at packages/components/eventbridge-rule-cron/eventbridge-rule-cron.component.ts:25 with getCapabilities/getType defined at packages/components/eventbridge-rule-cron/eventbridge-rule-cron.component.ts:73 / packages/components/eventbridge-rule-cron/eventbridge-rule-cron.component.ts:78.
Remediation: None

Requirement ID: 0.2 Platform Configuration Standard
Status: FAIL
Finding: getComplianceFrameworkDefaults() missing in packages/components/eventbridge-rule-cron/eventbridge-rule-cron.builder.ts
Remediation: Implement a ConfigBuilder subclass with getHardcodedFallbacks() and getComplianceFrameworkDefaults() to enforce the five-layer precedence chain.

Requirement ID: 0.3 Platform Tagging Standard
Status: PASS
Finding: applyStandardTags invoked (e.g., packages/components/eventbridge-rule-cron/eventbridge-rule-cron.component.ts:90).
Remediation: None

Requirement ID: 0.4 Platform Logging Standard
Status: PASS
Finding: Synth lifecycle logging present at packages/components/eventbridge-rule-cron/eventbridge-rule-cron.component.ts:35 and packages/components/eventbridge-rule-cron/eventbridge-rule-cron.component.ts:61.
Remediation: None

Requirement ID: 0.5 Platform Observability Standard
Status: PASS
Finding: Observability hooks detected around packages/components/eventbridge-rule-cron/eventbridge-rule-cron.component.ts:151.
Remediation: None

Requirement ID: 0.6 Platform Testing Standard
Status: FAIL
Finding: packages/components/eventbridge-rule-cron/package.json lacks a Vitest dependency; tests still rely on Jest.
Remediation: Switch component tests to Vitest and add the vitest dependency per the platform testing standard.

Requirement ID: 0.7 Platform Capability Naming Standard
Status: FAIL
Finding: package.json is missing shinobi.capabilities metadata for eventbridge-rule-cron
Remediation: Register at least one capability via registerCapability() and mirror it in package.json shinobi.capabilities to satisfy the binding vocabulary.

Requirement ID: 1.2 Constructor Signature
Status: PASS
Finding: Constructor matches required signature at packages/components/eventbridge-rule-cron/eventbridge-rule-cron.component.ts:30.
Remediation: None

Requirement ID: 1.5 Creator Pattern
Status: PASS
Finding: Creator implements IComponentCreator at packages/components/eventbridge-rule-cron/eventbridge-rule-cron.creator.ts:13 and exports configSchema (packages/components/eventbridge-rule-cron/eventbridge-rule-cron.creator.ts:20).
Remediation: None

Requirement ID: 1.6 Construct Registration
Status: PASS
Finding: Constructs registered (first occurrence packages/components/eventbridge-rule-cron/eventbridge-rule-cron.component.ts:52).
Remediation: None

Requirement ID: 1.7 Capability Registration
Status: PASS
Finding: Capabilities registered at packages/components/eventbridge-rule-cron/eventbridge-rule-cron.component.ts:59.
Remediation: None

Requirement ID: 2.5 Structured Logging Requirements
Status: PASS
Finding: Synth() uses try/catch with lifecycle logging (packages/components/eventbridge-rule-cron/eventbridge-rule-cron.component.ts:34).
Remediation: None

Requirement ID: 2.6 Compliance Framework Defaults
Status: FAIL
Finding: Builder packages/components/eventbridge-rule-cron/eventbridge-rule-cron.builder.ts lacks getComplianceFrameworkDefaults(), so FedRAMP tiers do not receive hardened defaults.
Remediation: Add getComplianceFrameworkDefaults() to the builder to inject framework-specific defaults (encryption, log retention, etc.).

Requirement ID: 2.7 OpenTelemetry Observability Requirements
Status: PASS
Finding: Observability hooks present near packages/components/eventbridge-rule-cron/eventbridge-rule-cron.component.ts:151.
Remediation: None

Requirement ID: 2.8 Feature Flags Integration
Status: FAIL
Finding: Neither the component code nor package metadata references platform feature flags for eventbridge-rule-cron.
Remediation: Gate the component behind feature flags (OpenFeature integration + shinobi.featureFlags metadata).

Requirement ID: 2.10 Backstage Integration
Status: PASS
Finding: catalog-info.yaml present (packages/components/eventbridge-rule-cron/catalog-info.yaml).
Remediation: None

Requirement ID: 3.3 Config.schema.json Requirement
Status: PASS
Finding: Config.schema.json present in package root.
Remediation: None

Requirement ID: 3.5 Error Handling Patterns
Status: PASS
Finding: Synth() wraps logic in try/catch at packages/components/eventbridge-rule-cron/eventbridge-rule-cron.component.ts:34.
Remediation: None

Requirement ID: 4.1 Test Framework
Status: FAIL
Finding: packages/components/eventbridge-rule-cron/package.json lacks a Vitest dependency; tests still rely on Jest.
Remediation: Switch component tests to Vitest and add the vitest dependency per the platform testing standard.

Requirement ID: 4.2 CDK-Nag Security Tests
Status: FAIL
Finding: Missing tests/security/cdk-nag.test.ts in packages/components/eventbridge-rule-cron.
Remediation: Add CDK-Nag AwsSolutions tests covering all frameworks.

Requirement ID: 4.7 Test File Organization
Status: PASS
Finding: tests/ directory present.
Remediation: None

Requirement ID: 4.8 Component Versioning & Metadata
Status: FAIL
Finding: CHANGELOG.md missing
Remediation: Set a semantic version in package.json and maintain CHANGELOG.md per governance policy.

Requirement ID: 4.9 Audit Files Requirements
Status: PASS
Finding: Audit/ documentation present.
Remediation: None

Requirement ID: V.1 TODO/Placeholder Sweep
Status: FAIL
Finding: Found TODO/placeholder code at packages/components/eventbridge-rule-cron/observability/README.md:241 → **Template:** [dashboards/eventbridge-rule-cron.json](./dashboards/eventbridge-rule-cron.json) (TBD)
Remediation: Resolve TODO/placeholder logic and replace vaporware sections with production-ready implementations/documentation.

## eventbridge-rule-pattern
Requirement ID: 0.1 Platform Component API Spec
Status: PASS
Finding: `EventBridgeRulePatternComponent` extends BaseComponent at packages/components/eventbridge-rule-pattern/src/eventbridge-rule-pattern.component.ts:36 with getCapabilities/getType defined at packages/components/eventbridge-rule-pattern/src/eventbridge-rule-pattern.component.ts:114 / packages/components/eventbridge-rule-pattern/src/eventbridge-rule-pattern.component.ts:119.
Remediation: None

Requirement ID: 0.2 Platform Configuration Standard
Status: FAIL
Finding: getComplianceFrameworkDefaults() missing in packages/components/eventbridge-rule-pattern/src/eventbridge-rule-pattern.builder.ts
Remediation: Implement a ConfigBuilder subclass with getHardcodedFallbacks() and getComplianceFrameworkDefaults() to enforce the five-layer precedence chain.

Requirement ID: 0.3 Platform Tagging Standard
Status: PASS
Finding: applyStandardTags invoked (e.g., packages/components/eventbridge-rule-pattern/src/eventbridge-rule-pattern.component.ts:141).
Remediation: None

Requirement ID: 0.4 Platform Logging Standard
Status: PASS
Finding: Synth lifecycle logging present at packages/components/eventbridge-rule-pattern/src/eventbridge-rule-pattern.component.ts:50 and packages/components/eventbridge-rule-pattern/src/eventbridge-rule-pattern.component.ts:100.
Remediation: None

Requirement ID: 0.5 Platform Observability Standard
Status: PASS
Finding: Observability hooks detected around packages/components/eventbridge-rule-pattern/src/eventbridge-rule-pattern.component.ts:66.
Remediation: None

Requirement ID: 0.6 Platform Testing Standard
Status: FAIL
Finding: packages/components/eventbridge-rule-pattern/package.json lacks a Vitest dependency; tests still rely on Jest.
Remediation: Switch component tests to Vitest and add the vitest dependency per the platform testing standard.

Requirement ID: 0.7 Platform Capability Naming Standard
Status: FAIL
Finding: package.json is missing shinobi.capabilities metadata for eventbridge-rule-pattern
Remediation: Register at least one capability via registerCapability() and mirror it in package.json shinobi.capabilities to satisfy the binding vocabulary.

Requirement ID: 1.2 Constructor Signature
Status: PASS
Finding: Constructor matches required signature at packages/components/eventbridge-rule-pattern/src/eventbridge-rule-pattern.component.ts:45.
Remediation: None

Requirement ID: 1.5 Creator Pattern
Status: PASS
Finding: Creator implements IComponentCreator at packages/components/eventbridge-rule-pattern/src/eventbridge-rule-pattern.creator.ts:15 and exports configSchema (packages/components/eventbridge-rule-pattern/src/eventbridge-rule-pattern.creator.ts:23).
Remediation: None

Requirement ID: 1.6 Construct Registration
Status: PASS
Finding: Constructs registered (first occurrence packages/components/eventbridge-rule-pattern/src/eventbridge-rule-pattern.component.ts:81).
Remediation: None

Requirement ID: 1.7 Capability Registration
Status: PASS
Finding: Capabilities registered at packages/components/eventbridge-rule-pattern/src/eventbridge-rule-pattern.component.ts:98.
Remediation: None

Requirement ID: 2.5 Structured Logging Requirements
Status: PASS
Finding: Synth() uses try/catch with lifecycle logging (packages/components/eventbridge-rule-pattern/src/eventbridge-rule-pattern.component.ts:49).
Remediation: None

Requirement ID: 2.6 Compliance Framework Defaults
Status: FAIL
Finding: Builder packages/components/eventbridge-rule-pattern/src/eventbridge-rule-pattern.builder.ts lacks getComplianceFrameworkDefaults(), so FedRAMP tiers do not receive hardened defaults.
Remediation: Add getComplianceFrameworkDefaults() to the builder to inject framework-specific defaults (encryption, log retention, etc.).

Requirement ID: 2.7 OpenTelemetry Observability Requirements
Status: PASS
Finding: Observability hooks present near packages/components/eventbridge-rule-pattern/src/eventbridge-rule-pattern.component.ts:66.
Remediation: None

Requirement ID: 2.8 Feature Flags Integration
Status: FAIL
Finding: Neither the component code nor package metadata references platform feature flags for eventbridge-rule-pattern.
Remediation: Gate the component behind feature flags (OpenFeature integration + shinobi.featureFlags metadata).

Requirement ID: 2.10 Backstage Integration
Status: PASS
Finding: catalog-info.yaml present (packages/components/eventbridge-rule-pattern/catalog-info.yaml).
Remediation: None

Requirement ID: 3.3 Config.schema.json Requirement
Status: PASS
Finding: Config.schema.json present in package root.
Remediation: None

Requirement ID: 3.5 Error Handling Patterns
Status: PASS
Finding: Synth() wraps logic in try/catch at packages/components/eventbridge-rule-pattern/src/eventbridge-rule-pattern.component.ts:49.
Remediation: None

Requirement ID: 4.1 Test Framework
Status: FAIL
Finding: packages/components/eventbridge-rule-pattern/package.json lacks a Vitest dependency; tests still rely on Jest.
Remediation: Switch component tests to Vitest and add the vitest dependency per the platform testing standard.

Requirement ID: 4.2 CDK-Nag Security Tests
Status: FAIL
Finding: Missing tests/security/cdk-nag.test.ts in packages/components/eventbridge-rule-pattern.
Remediation: Add CDK-Nag AwsSolutions tests covering all frameworks.

Requirement ID: 4.7 Test File Organization
Status: PASS
Finding: tests/ directory present.
Remediation: None

Requirement ID: 4.8 Component Versioning & Metadata
Status: PASS
Finding: package.json uses semver and CHANGELOG.md exists.
Remediation: None

Requirement ID: 4.9 Audit Files Requirements
Status: PASS
Finding: Audit/ documentation present.
Remediation: None

Requirement ID: V.1 TODO/Placeholder Sweep
Status: FAIL
Finding: Found TODO/placeholder code at packages/components/eventbridge-rule-pattern/CHANGELOG.md:119 → - Breaking changes TBD based on platform evolution
Remediation: Resolve TODO/placeholder logic and replace vaporware sections with production-ready implementations/documentation.

## feature-flag
Requirement ID: 0.1 Platform Component API Spec
Status: PASS
Finding: `FeatureFlagComponent` extends BaseComponent at packages/components/feature-flag/src/feature-flag.component.ts:24 with getCapabilities/getType defined at packages/components/feature-flag/src/feature-flag.component.ts:64 / packages/components/feature-flag/src/feature-flag.component.ts:69.
Remediation: None

Requirement ID: 0.2 Platform Configuration Standard
Status: FAIL
Finding: getComplianceFrameworkDefaults() missing in packages/components/feature-flag/src/feature-flag.builder.ts
Remediation: Implement a ConfigBuilder subclass with getHardcodedFallbacks() and getComplianceFrameworkDefaults() to enforce the five-layer precedence chain.

Requirement ID: 0.3 Platform Tagging Standard
Status: PASS
Finding: applyStandardTags invoked (e.g., packages/components/feature-flag/src/feature-flag.component.ts:84).
Remediation: None

Requirement ID: 0.4 Platform Logging Standard
Status: PASS
Finding: Synth lifecycle logging present at packages/components/feature-flag/src/feature-flag.component.ts:33 and packages/components/feature-flag/src/feature-flag.component.ts:53.
Remediation: None

Requirement ID: 0.5 Platform Observability Standard
Status: FAIL
Finding: No OpenTelemetry helpers or configureObservability() calls exist inside packages/components/feature-flag/src/feature-flag.component.ts.
Remediation: Wire the component into configureObservability()/OpenTelemetry so metrics/traces/logs conform to the observability standard.

Requirement ID: 0.6 Platform Testing Standard
Status: FAIL
Finding: packages/components/feature-flag/package.json lacks a Vitest dependency; tests still rely on Jest.
Remediation: Switch component tests to Vitest and add the vitest dependency per the platform testing standard.

Requirement ID: 0.7 Platform Capability Naming Standard
Status: FAIL
Finding: package.json is missing shinobi.capabilities metadata for feature-flag
Remediation: Register at least one capability via registerCapability() and mirror it in package.json shinobi.capabilities to satisfy the binding vocabulary.

Requirement ID: 1.2 Constructor Signature
Status: PASS
Finding: Constructor matches required signature at packages/components/feature-flag/src/feature-flag.component.ts:28.
Remediation: None

Requirement ID: 1.5 Creator Pattern
Status: PASS
Finding: Creator implements IComponentCreator at packages/components/feature-flag/src/feature-flag.creator.ts:9 and exports configSchema (packages/components/feature-flag/src/feature-flag.creator.ts:16).
Remediation: None

Requirement ID: 1.6 Construct Registration
Status: PASS
Finding: Constructs registered (first occurrence packages/components/feature-flag/src/feature-flag.component.ts:49).
Remediation: None

Requirement ID: 1.7 Capability Registration
Status: PASS
Finding: Capabilities registered at packages/components/feature-flag/src/feature-flag.component.ts:51.
Remediation: None

Requirement ID: 2.5 Structured Logging Requirements
Status: PASS
Finding: Synth() uses try/catch with lifecycle logging (packages/components/feature-flag/src/feature-flag.component.ts:32).
Remediation: None

Requirement ID: 2.6 Compliance Framework Defaults
Status: FAIL
Finding: Builder packages/components/feature-flag/src/feature-flag.builder.ts lacks getComplianceFrameworkDefaults(), so FedRAMP tiers do not receive hardened defaults.
Remediation: Add getComplianceFrameworkDefaults() to the builder to inject framework-specific defaults (encryption, log retention, etc.).

Requirement ID: 2.7 OpenTelemetry Observability Requirements
Status: FAIL
Finding: No OpenTelemetry or configureObservability calls found in packages/components/feature-flag/src/feature-flag.component.ts.
Remediation: Integrate configureObservability()/OpenTelemetry instrumentation and register observability capabilities.

Requirement ID: 2.8 Feature Flags Integration
Status: PASS
Finding: Feature flag integration declared via code.
Remediation: None

Requirement ID: 2.10 Backstage Integration
Status: PASS
Finding: catalog-info.yaml present (packages/components/feature-flag/catalog-info.yaml).
Remediation: None

Requirement ID: 3.3 Config.schema.json Requirement
Status: PASS
Finding: Config.schema.json present in package root.
Remediation: None

Requirement ID: 3.5 Error Handling Patterns
Status: PASS
Finding: Synth() wraps logic in try/catch at packages/components/feature-flag/src/feature-flag.component.ts:32.
Remediation: None

Requirement ID: 4.1 Test Framework
Status: FAIL
Finding: packages/components/feature-flag/package.json lacks a Vitest dependency; tests still rely on Jest.
Remediation: Switch component tests to Vitest and add the vitest dependency per the platform testing standard.

Requirement ID: 4.2 CDK-Nag Security Tests
Status: FAIL
Finding: Missing tests/security/cdk-nag.test.ts in packages/components/feature-flag.
Remediation: Add CDK-Nag AwsSolutions tests covering all frameworks.

Requirement ID: 4.7 Test File Organization
Status: PASS
Finding: tests/ directory present.
Remediation: None

Requirement ID: 4.8 Component Versioning & Metadata
Status: FAIL
Finding: CHANGELOG.md missing
Remediation: Set a semantic version in package.json and maintain CHANGELOG.md per governance policy.

Requirement ID: 4.9 Audit Files Requirements
Status: PASS
Finding: Audit/ documentation present.
Remediation: None

Requirement ID: V.1 TODO/Placeholder Sweep
Status: FAIL
Finding: Found TODO/placeholder code at packages/components/feature-flag/Audit/feature-flag.audit.md:76 → - Synthesis tests have TODOs instead of template assertions; no coverage validates tagging, capabilities, or generated JSON (`packages/components/feature-flag/tests/feature-flag.component.synthesis.test.ts:60`).
Remediation: Resolve TODO/placeholder logic and replace vaporware sections with production-ready implementations/documentation.

## glue-job
Requirement ID: 0.1 Platform Component API Spec
Status: PASS
Finding: `GlueJobComponent` extends BaseComponent at packages/components/glue-job/src/glue-job.component.ts:30 with getCapabilities/getType defined at packages/components/glue-job/src/glue-job.component.ts:107 / packages/components/glue-job/src/glue-job.component.ts:112.
Remediation: None

Requirement ID: 0.2 Platform Configuration Standard
Status: FAIL
Finding: getComplianceFrameworkDefaults() missing in packages/components/glue-job/src/glue-job.builder.ts
Remediation: Implement a ConfigBuilder subclass with getHardcodedFallbacks() and getComplianceFrameworkDefaults() to enforce the five-layer precedence chain.

Requirement ID: 0.3 Platform Tagging Standard
Status: PASS
Finding: applyStandardTags invoked (e.g., packages/components/glue-job/src/glue-job.component.ts:143).
Remediation: None

Requirement ID: 0.4 Platform Logging Standard
Status: PASS
Finding: Synth lifecycle logging present at packages/components/glue-job/src/glue-job.component.ts:46 and packages/components/glue-job/src/glue-job.component.ts:94.
Remediation: None

Requirement ID: 0.5 Platform Observability Standard
Status: PASS
Finding: Observability hooks detected around packages/components/glue-job/src/glue-job.component.ts:357.
Remediation: None

Requirement ID: 0.6 Platform Testing Standard
Status: FAIL
Finding: packages/components/glue-job/package.json lacks a Vitest dependency; tests still rely on Jest.
Remediation: Switch component tests to Vitest and add the vitest dependency per the platform testing standard.

Requirement ID: 0.7 Platform Capability Naming Standard
Status: FAIL
Finding: package.json is missing shinobi.capabilities metadata for glue-job
Remediation: Register at least one capability via registerCapability() and mirror it in package.json shinobi.capabilities to satisfy the binding vocabulary.

Requirement ID: 1.2 Constructor Signature
Status: PASS
Finding: Constructor matches required signature at packages/components/glue-job/src/glue-job.component.ts:41.
Remediation: None

Requirement ID: 1.5 Creator Pattern
Status: PASS
Finding: Creator implements IComponentCreator at packages/components/glue-job/src/glue-job.creator.ts:10 and exports configSchema (packages/components/glue-job/src/glue-job.creator.ts:17).
Remediation: None

Requirement ID: 1.6 Construct Registration
Status: PASS
Finding: Constructs registered (first occurrence packages/components/glue-job/src/glue-job.component.ts:70).
Remediation: None

Requirement ID: 1.7 Capability Registration
Status: PASS
Finding: Capabilities registered at packages/components/glue-job/src/glue-job.component.ts:85.
Remediation: None

Requirement ID: 2.5 Structured Logging Requirements
Status: PASS
Finding: Synth() uses try/catch with lifecycle logging (packages/components/glue-job/src/glue-job.component.ts:45).
Remediation: None

Requirement ID: 2.6 Compliance Framework Defaults
Status: FAIL
Finding: Builder packages/components/glue-job/src/glue-job.builder.ts lacks getComplianceFrameworkDefaults(), so FedRAMP tiers do not receive hardened defaults.
Remediation: Add getComplianceFrameworkDefaults() to the builder to inject framework-specific defaults (encryption, log retention, etc.).

Requirement ID: 2.7 OpenTelemetry Observability Requirements
Status: PASS
Finding: Observability hooks present near packages/components/glue-job/src/glue-job.component.ts:357.
Remediation: None

Requirement ID: 2.8 Feature Flags Integration
Status: FAIL
Finding: Neither the component code nor package metadata references platform feature flags for glue-job.
Remediation: Gate the component behind feature flags (OpenFeature integration + shinobi.featureFlags metadata).

Requirement ID: 2.10 Backstage Integration
Status: PASS
Finding: catalog-info.yaml present (packages/components/glue-job/catalog-info.yaml).
Remediation: None

Requirement ID: 3.3 Config.schema.json Requirement
Status: PASS
Finding: Config.schema.json present in package root.
Remediation: None

Requirement ID: 3.5 Error Handling Patterns
Status: PASS
Finding: Synth() wraps logic in try/catch at packages/components/glue-job/src/glue-job.component.ts:45.
Remediation: None

Requirement ID: 4.1 Test Framework
Status: FAIL
Finding: packages/components/glue-job/package.json lacks a Vitest dependency; tests still rely on Jest.
Remediation: Switch component tests to Vitest and add the vitest dependency per the platform testing standard.

Requirement ID: 4.2 CDK-Nag Security Tests
Status: FAIL
Finding: Missing tests/security/cdk-nag.test.ts in packages/components/glue-job.
Remediation: Add CDK-Nag AwsSolutions tests covering all frameworks.

Requirement ID: 4.7 Test File Organization
Status: PASS
Finding: tests/ directory present.
Remediation: None

Requirement ID: 4.8 Component Versioning & Metadata
Status: FAIL
Finding: CHANGELOG.md missing
Remediation: Set a semantic version in package.json and maintain CHANGELOG.md per governance policy.

Requirement ID: 4.9 Audit Files Requirements
Status: PASS
Finding: Audit/ documentation present.
Remediation: None

Requirement ID: V.1 TODO/Placeholder Sweep
Status: FAIL
Finding: Found TODO/placeholder code at packages/components/glue-job/observability/README.md:38 → ## TODOs
Remediation: Resolve TODO/placeholder logic and replace vaporware sections with production-ready implementations/documentation.

## iam-policy
Requirement ID: 0.1 Platform Component API Spec
Status: PASS
Finding: `IamPolicyComponent` extends BaseComponent at packages/components/iam-policy/iam-policy.component.ts:29 with getCapabilities/getType defined at packages/components/iam-policy/iam-policy.component.ts:103 / packages/components/iam-policy/iam-policy.component.ts:108.
Remediation: None

Requirement ID: 0.2 Platform Configuration Standard
Status: FAIL
Finding: getComplianceFrameworkDefaults() missing in packages/components/iam-policy/iam-policy.builder.ts
Remediation: Implement a ConfigBuilder subclass with getHardcodedFallbacks() and getComplianceFrameworkDefaults() to enforce the five-layer precedence chain.

Requirement ID: 0.3 Platform Tagging Standard
Status: PASS
Finding: applyStandardTags invoked (e.g., packages/components/iam-policy/iam-policy.component.ts:125).
Remediation: None

Requirement ID: 0.4 Platform Logging Standard
Status: PASS
Finding: Synth lifecycle logging present at packages/components/iam-policy/iam-policy.component.ts:42 and packages/components/iam-policy/iam-policy.component.ts:88.
Remediation: None

Requirement ID: 0.5 Platform Observability Standard
Status: PASS
Finding: Observability hooks detected around packages/components/iam-policy/iam-policy.component.ts:552.
Remediation: None

Requirement ID: 0.6 Platform Testing Standard
Status: FAIL
Finding: packages/components/iam-policy/package.json lacks a Vitest dependency; tests still rely on Jest.
Remediation: Switch component tests to Vitest and add the vitest dependency per the platform testing standard.

Requirement ID: 0.7 Platform Capability Naming Standard
Status: FAIL
Finding: package.json is missing shinobi.capabilities metadata for iam-policy
Remediation: Register at least one capability via registerCapability() and mirror it in package.json shinobi.capabilities to satisfy the binding vocabulary.

Requirement ID: 1.2 Constructor Signature
Status: PASS
Finding: Constructor matches required signature at packages/components/iam-policy/iam-policy.component.ts:37.
Remediation: None

Requirement ID: 1.5 Creator Pattern
Status: PASS
Finding: Creator implements IComponentCreator at packages/components/iam-policy/iam-policy.creator.ts:26 and exports configSchema (packages/components/iam-policy/iam-policy.creator.ts:66).
Remediation: None

Requirement ID: 1.6 Construct Registration
Status: PASS
Finding: Constructs registered (first occurrence packages/components/iam-policy/iam-policy.component.ts:65).
Remediation: None

Requirement ID: 1.7 Capability Registration
Status: PASS
Finding: Capabilities registered at packages/components/iam-policy/iam-policy.component.ts:81.
Remediation: None

Requirement ID: 2.5 Structured Logging Requirements
Status: PASS
Finding: Synth() uses try/catch with lifecycle logging (packages/components/iam-policy/iam-policy.component.ts:41).
Remediation: None

Requirement ID: 2.6 Compliance Framework Defaults
Status: FAIL
Finding: Builder packages/components/iam-policy/iam-policy.builder.ts lacks getComplianceFrameworkDefaults(), so FedRAMP tiers do not receive hardened defaults.
Remediation: Add getComplianceFrameworkDefaults() to the builder to inject framework-specific defaults (encryption, log retention, etc.).

Requirement ID: 2.7 OpenTelemetry Observability Requirements
Status: PASS
Finding: Observability hooks present near packages/components/iam-policy/iam-policy.component.ts:552.
Remediation: None

Requirement ID: 2.8 Feature Flags Integration
Status: FAIL
Finding: Neither the component code nor package metadata references platform feature flags for iam-policy.
Remediation: Gate the component behind feature flags (OpenFeature integration + shinobi.featureFlags metadata).

Requirement ID: 2.10 Backstage Integration
Status: PASS
Finding: catalog-info.yaml present (packages/components/iam-policy/catalog-info.yaml).
Remediation: None

Requirement ID: 3.3 Config.schema.json Requirement
Status: PASS
Finding: Config.schema.json present in package root.
Remediation: None

Requirement ID: 3.5 Error Handling Patterns
Status: PASS
Finding: Synth() wraps logic in try/catch at packages/components/iam-policy/iam-policy.component.ts:41.
Remediation: None

Requirement ID: 4.1 Test Framework
Status: FAIL
Finding: packages/components/iam-policy/package.json lacks a Vitest dependency; tests still rely on Jest.
Remediation: Switch component tests to Vitest and add the vitest dependency per the platform testing standard.

Requirement ID: 4.2 CDK-Nag Security Tests
Status: FAIL
Finding: Missing tests/security/cdk-nag.test.ts in packages/components/iam-policy.
Remediation: Add CDK-Nag AwsSolutions tests covering all frameworks.

Requirement ID: 4.7 Test File Organization
Status: PASS
Finding: tests/ directory present.
Remediation: None

Requirement ID: 4.8 Component Versioning & Metadata
Status: FAIL
Finding: CHANGELOG.md missing
Remediation: Set a semantic version in package.json and maintain CHANGELOG.md per governance policy.

Requirement ID: 4.9 Audit Files Requirements
Status: FAIL
Finding: Audit/ directory missing from packages/components/iam-policy.
Remediation: Add Audit/README and component audit report to satisfy evidence requirements.

Requirement ID: V.1 TODO/Placeholder Sweep
Status: FAIL
Finding: Found TODO/placeholder code at packages/components/iam-policy/iam-policy.component.ts:557 → // TODO: Implement CloudTrail-based metric filter alarm when CloudTrail integration is available
Remediation: Resolve TODO/placeholder logic and replace vaporware sections with production-ready implementations/documentation.

## iam-role
Requirement ID: 0.1 Platform Component API Spec
Status: PASS
Finding: `IamRoleComponent` extends BaseComponent at packages/components/iam-role/src/iam-role.component.ts:29 with getCapabilities/getType defined at packages/components/iam-role/src/iam-role.component.ts:111 / packages/components/iam-role/src/iam-role.component.ts:119.
Remediation: None

Requirement ID: 0.2 Platform Configuration Standard
Status: FAIL
Finding: getComplianceFrameworkDefaults() missing in packages/components/iam-role/src/iam-role.builder.ts
Remediation: Implement a ConfigBuilder subclass with getHardcodedFallbacks() and getComplianceFrameworkDefaults() to enforce the five-layer precedence chain.

Requirement ID: 0.3 Platform Tagging Standard
Status: PASS
Finding: applyStandardTags invoked (e.g., packages/components/iam-role/src/iam-role.component.ts:362).
Remediation: None

Requirement ID: 0.4 Platform Logging Standard
Status: PASS
Finding: Synth lifecycle logging present at packages/components/iam-role/src/iam-role.component.ts:46 and packages/components/iam-role/src/iam-role.component.ts:94.
Remediation: None

Requirement ID: 0.5 Platform Observability Standard
Status: FAIL
Finding: No OpenTelemetry helpers or configureObservability() calls exist inside packages/components/iam-role/src/iam-role.component.ts.
Remediation: Wire the component into configureObservability()/OpenTelemetry so metrics/traces/logs conform to the observability standard.

Requirement ID: 0.6 Platform Testing Standard
Status: FAIL
Finding: packages/components/iam-role/package.json lacks a Vitest dependency; tests still rely on Jest.
Remediation: Switch component tests to Vitest and add the vitest dependency per the platform testing standard.

Requirement ID: 0.7 Platform Capability Naming Standard
Status: FAIL
Finding: package.json is missing shinobi.capabilities metadata for iam-role
Remediation: Register at least one capability via registerCapability() and mirror it in package.json shinobi.capabilities to satisfy the binding vocabulary.

Requirement ID: 1.2 Constructor Signature
Status: PASS
Finding: Constructor matches required signature at packages/components/iam-role/src/iam-role.component.ts:37.
Remediation: None

Requirement ID: 1.5 Creator Pattern
Status: PASS
Finding: Creator implements IComponentCreator at packages/components/iam-role/src/iam-role.creator.ts:16 and exports configSchema (packages/components/iam-role/src/iam-role.creator.ts:23).
Remediation: None

Requirement ID: 1.6 Construct Registration
Status: PASS
Finding: Constructs registered (first occurrence packages/components/iam-role/src/iam-role.component.ts:69).
Remediation: None

Requirement ID: 1.7 Capability Registration
Status: PASS
Finding: Capabilities registered at packages/components/iam-role/src/iam-role.component.ts:72.
Remediation: None

Requirement ID: 2.5 Structured Logging Requirements
Status: PASS
Finding: Synth() uses try/catch with lifecycle logging (packages/components/iam-role/src/iam-role.component.ts:44).
Remediation: None

Requirement ID: 2.6 Compliance Framework Defaults
Status: FAIL
Finding: Builder packages/components/iam-role/src/iam-role.builder.ts lacks getComplianceFrameworkDefaults(), so FedRAMP tiers do not receive hardened defaults.
Remediation: Add getComplianceFrameworkDefaults() to the builder to inject framework-specific defaults (encryption, log retention, etc.).

Requirement ID: 2.7 OpenTelemetry Observability Requirements
Status: FAIL
Finding: No OpenTelemetry or configureObservability calls found in packages/components/iam-role/src/iam-role.component.ts.
Remediation: Integrate configureObservability()/OpenTelemetry instrumentation and register observability capabilities.

Requirement ID: 2.8 Feature Flags Integration
Status: FAIL
Finding: Neither the component code nor package metadata references platform feature flags for iam-role.
Remediation: Gate the component behind feature flags (OpenFeature integration + shinobi.featureFlags metadata).

Requirement ID: 2.10 Backstage Integration
Status: PASS
Finding: catalog-info.yaml present (packages/components/iam-role/catalog-info.yaml).
Remediation: None

Requirement ID: 3.3 Config.schema.json Requirement
Status: PASS
Finding: Config.schema.json present in package root.
Remediation: None

Requirement ID: 3.5 Error Handling Patterns
Status: PASS
Finding: Synth() wraps logic in try/catch at packages/components/iam-role/src/iam-role.component.ts:44.
Remediation: None

Requirement ID: 4.1 Test Framework
Status: FAIL
Finding: packages/components/iam-role/package.json lacks a Vitest dependency; tests still rely on Jest.
Remediation: Switch component tests to Vitest and add the vitest dependency per the platform testing standard.

Requirement ID: 4.2 CDK-Nag Security Tests
Status: FAIL
Finding: Missing tests/security/cdk-nag.test.ts in packages/components/iam-role.
Remediation: Add CDK-Nag AwsSolutions tests covering all frameworks.

Requirement ID: 4.7 Test File Organization
Status: PASS
Finding: tests/ directory present.
Remediation: None

Requirement ID: 4.8 Component Versioning & Metadata
Status: FAIL
Finding: CHANGELOG.md missing
Remediation: Set a semantic version in package.json and maintain CHANGELOG.md per governance policy.

Requirement ID: 4.9 Audit Files Requirements
Status: FAIL
Finding: Audit/ directory missing from packages/components/iam-role.
Remediation: Add Audit/README and component audit report to satisfy evidence requirements.

Requirement ID: V.1 TODO/Placeholder Sweep
Status: PASS
Finding: No TODO/TBD/placeholder markers detected in component sources.
Remediation: None

## kinesis-stream
Requirement ID: 0.1 Platform Component API Spec
Status: FAIL
Finding: class declaration at packages/components/kinesis-stream/kinesis-stream.component.ts does not extend BaseComponent
Remediation: Define a component class that extends BaseComponent and implements synth(), getCapabilities(), and getType() using the canonical constructor signature.

Requirement ID: 0.2 Platform Configuration Standard
Status: FAIL
Finding: getComplianceFrameworkDefaults() missing in packages/components/kinesis-stream/kinesis-stream.builder.ts
Remediation: Implement a ConfigBuilder subclass with getHardcodedFallbacks() and getComplianceFrameworkDefaults() to enforce the five-layer precedence chain.

Requirement ID: 0.3 Platform Tagging Standard
Status: PASS
Finding: applyStandardTags invoked (e.g., packages/components/kinesis-stream/kinesis-stream.component.ts:100).
Remediation: None

Requirement ID: 0.4 Platform Logging Standard
Status: PASS
Finding: Synth lifecycle logging present at packages/components/kinesis-stream/kinesis-stream.component.ts:30 and packages/components/kinesis-stream/kinesis-stream.component.ts:57.
Remediation: None

Requirement ID: 0.5 Platform Observability Standard
Status: FAIL
Finding: No OpenTelemetry helpers or configureObservability() calls exist inside packages/components/kinesis-stream/kinesis-stream.component.ts.
Remediation: Wire the component into configureObservability()/OpenTelemetry so metrics/traces/logs conform to the observability standard.

Requirement ID: 0.6 Platform Testing Standard
Status: FAIL
Finding: packages/components/kinesis-stream/package.json lacks a Vitest dependency; tests still rely on Jest.
Remediation: Switch component tests to Vitest and add the vitest dependency per the platform testing standard.

Requirement ID: 0.7 Platform Capability Naming Standard
Status: FAIL
Finding: package.json is missing shinobi.capabilities metadata for kinesis-stream
Remediation: Register at least one capability via registerCapability() and mirror it in package.json shinobi.capabilities to satisfy the binding vocabulary.

Requirement ID: 1.2 Constructor Signature
Status: PASS
Finding: Constructor matches required signature at packages/components/kinesis-stream/kinesis-stream.component.ts:25.
Remediation: None

Requirement ID: 1.5 Creator Pattern
Status: PASS
Finding: Creator implements IComponentCreator at packages/components/kinesis-stream/kinesis-stream.creator.ts:26 and exports configSchema (packages/components/kinesis-stream/kinesis-stream.creator.ts:66).
Remediation: None

Requirement ID: 1.6 Construct Registration
Status: PASS
Finding: Constructs registered (first occurrence packages/components/kinesis-stream/kinesis-stream.component.ts:49).
Remediation: None

Requirement ID: 1.7 Capability Registration
Status: PASS
Finding: Capabilities registered at packages/components/kinesis-stream/kinesis-stream.component.ts:55.
Remediation: None

Requirement ID: 2.5 Structured Logging Requirements
Status: PASS
Finding: Synth() uses try/catch with lifecycle logging (packages/components/kinesis-stream/kinesis-stream.component.ts:29).
Remediation: None

Requirement ID: 2.6 Compliance Framework Defaults
Status: FAIL
Finding: Builder packages/components/kinesis-stream/kinesis-stream.builder.ts lacks getComplianceFrameworkDefaults(), so FedRAMP tiers do not receive hardened defaults.
Remediation: Add getComplianceFrameworkDefaults() to the builder to inject framework-specific defaults (encryption, log retention, etc.).

Requirement ID: 2.7 OpenTelemetry Observability Requirements
Status: FAIL
Finding: No OpenTelemetry or configureObservability calls found in packages/components/kinesis-stream/kinesis-stream.component.ts.
Remediation: Integrate configureObservability()/OpenTelemetry instrumentation and register observability capabilities.

Requirement ID: 2.8 Feature Flags Integration
Status: FAIL
Finding: Neither the component code nor package metadata references platform feature flags for kinesis-stream.
Remediation: Gate the component behind feature flags (OpenFeature integration + shinobi.featureFlags metadata).

Requirement ID: 2.10 Backstage Integration
Status: PASS
Finding: catalog-info.yaml present (packages/components/kinesis-stream/catalog-info.yaml).
Remediation: None

Requirement ID: 3.3 Config.schema.json Requirement
Status: FAIL
Finding: Config.schema.json missing from packages/components/kinesis-stream.
Remediation: Author Config.schema.json that matches the TypeScript config interface and export it from the builder.

Requirement ID: 3.5 Error Handling Patterns
Status: PASS
Finding: Synth() wraps logic in try/catch at packages/components/kinesis-stream/kinesis-stream.component.ts:29.
Remediation: None

Requirement ID: 4.1 Test Framework
Status: FAIL
Finding: packages/components/kinesis-stream/package.json lacks a Vitest dependency; tests still rely on Jest.
Remediation: Switch component tests to Vitest and add the vitest dependency per the platform testing standard.

Requirement ID: 4.2 CDK-Nag Security Tests
Status: FAIL
Finding: Missing tests/security/cdk-nag.test.ts in packages/components/kinesis-stream.
Remediation: Add CDK-Nag AwsSolutions tests covering all frameworks.

Requirement ID: 4.7 Test File Organization
Status: PASS
Finding: tests/ directory present.
Remediation: None

Requirement ID: 4.8 Component Versioning & Metadata
Status: FAIL
Finding: package.json lacks MAJOR.MINOR.PATCH version; CHANGELOG.md missing
Remediation: Set a semantic version in package.json and maintain CHANGELOG.md per governance policy.

Requirement ID: 4.9 Audit Files Requirements
Status: FAIL
Finding: Audit/ directory missing from packages/components/kinesis-stream.
Remediation: Add Audit/README and component audit report to satisfy evidence requirements.

Requirement ID: V.1 TODO/Placeholder Sweep
Status: FAIL
Finding: Found TODO/placeholder code at packages/components/kinesis-stream/kinesis-stream.creator.ts:96 → // TODO: Add component-specific validations here
Remediation: Resolve TODO/placeholder logic and replace vaporware sections with production-ready implementations/documentation.

## lambda-api
Requirement ID: 0.1 Platform Component API Spec
Status: PASS
Finding: `LambdaApiComponent` extends BaseComponent at packages/components/lambda-api/src/lambda-api.component.ts:43 with getCapabilities/getType defined at packages/components/lambda-api/src/lambda-api.component.ts:149 / packages/components/lambda-api/src/lambda-api.component.ts:159.
Remediation: None

Requirement ID: 0.2 Platform Configuration Standard
Status: FAIL
Finding: getComplianceFrameworkDefaults() missing in packages/components/lambda-api/src/lambda-api.builder.ts
Remediation: Implement a ConfigBuilder subclass with getHardcodedFallbacks() and getComplianceFrameworkDefaults() to enforce the five-layer precedence chain.

Requirement ID: 0.3 Platform Tagging Standard
Status: PASS
Finding: applyStandardTags invoked (e.g., packages/components/lambda-api/src/lambda-api.component.ts:206).
Remediation: None

Requirement ID: 0.4 Platform Logging Standard
Status: FAIL
Finding: Synth defined at packages/components/lambda-api/src/lambda-api.component.ts:74 lacks lifecycle logging: no logComponentEvent("synthesis_start") call
Remediation: Emit logComponentEvent() entries at the start and end of synth() to satisfy logging standard.

Requirement ID: 0.5 Platform Observability Standard
Status: PASS
Finding: Observability hooks detected around packages/components/lambda-api/src/lambda-api.component.ts:596.
Remediation: None

Requirement ID: 0.6 Platform Testing Standard
Status: FAIL
Finding: packages/components/lambda-api/package.json lacks a Vitest dependency; tests still rely on Jest.
Remediation: Switch component tests to Vitest and add the vitest dependency per the platform testing standard.

Requirement ID: 0.7 Platform Capability Naming Standard
Status: FAIL
Finding: package.json is missing shinobi.capabilities metadata for lambda-api
Remediation: Register at least one capability via registerCapability() and mirror it in package.json shinobi.capabilities to satisfy the binding vocabulary.

Requirement ID: 1.2 Constructor Signature
Status: PASS
Finding: Constructor matches required signature at packages/components/lambda-api/src/lambda-api.component.ts:61.
Remediation: None

Requirement ID: 1.5 Creator Pattern
Status: PASS
Finding: Creator implements IComponentCreator at packages/components/lambda-api/src/lambda-api.creator.ts:14 and exports configSchema (packages/components/lambda-api/src/lambda-api.creator.ts:21).
Remediation: None

Requirement ID: 1.6 Construct Registration
Status: PASS
Finding: Constructs registered (first occurrence packages/components/lambda-api/src/lambda-api.component.ts:104).
Remediation: None

Requirement ID: 1.7 Capability Registration
Status: PASS
Finding: Capabilities registered at packages/components/lambda-api/src/lambda-api.component.ts:124.
Remediation: None

Requirement ID: 2.5 Structured Logging Requirements
Status: FAIL
Finding: Synth at packages/components/lambda-api/src/lambda-api.component.ts:74 lacks structured logging: missing logComponentEvent("synthesis_start")
Remediation: Wrap synth() in try/catch and log start/complete events using logComponentEvent().

Requirement ID: 2.6 Compliance Framework Defaults
Status: FAIL
Finding: Builder packages/components/lambda-api/src/lambda-api.builder.ts lacks getComplianceFrameworkDefaults(), so FedRAMP tiers do not receive hardened defaults.
Remediation: Add getComplianceFrameworkDefaults() to the builder to inject framework-specific defaults (encryption, log retention, etc.).

Requirement ID: 2.7 OpenTelemetry Observability Requirements
Status: PASS
Finding: Observability hooks present near packages/components/lambda-api/src/lambda-api.component.ts:596.
Remediation: None

Requirement ID: 2.8 Feature Flags Integration
Status: FAIL
Finding: Neither the component code nor package metadata references platform feature flags for lambda-api.
Remediation: Gate the component behind feature flags (OpenFeature integration + shinobi.featureFlags metadata).

Requirement ID: 2.10 Backstage Integration
Status: PASS
Finding: catalog-info.yaml present (packages/components/lambda-api/catalog-info.yaml).
Remediation: None

Requirement ID: 3.3 Config.schema.json Requirement
Status: PASS
Finding: Config.schema.json present in package root.
Remediation: None

Requirement ID: 3.5 Error Handling Patterns
Status: PASS
Finding: Synth() wraps logic in try/catch at packages/components/lambda-api/src/lambda-api.component.ts:74.
Remediation: None

Requirement ID: 4.1 Test Framework
Status: FAIL
Finding: packages/components/lambda-api/package.json lacks a Vitest dependency; tests still rely on Jest.
Remediation: Switch component tests to Vitest and add the vitest dependency per the platform testing standard.

Requirement ID: 4.2 CDK-Nag Security Tests
Status: PASS
Finding: tests/security/cdk-nag.test.ts exists.
Remediation: None

Requirement ID: 4.7 Test File Organization
Status: PASS
Finding: tests/ directory present.
Remediation: None

Requirement ID: 4.8 Component Versioning & Metadata
Status: FAIL
Finding: CHANGELOG.md missing
Remediation: Set a semantic version in package.json and maintain CHANGELOG.md per governance policy.

Requirement ID: 4.9 Audit Files Requirements
Status: PASS
Finding: Audit/ documentation present.
Remediation: None

Requirement ID: V.1 TODO/Placeholder Sweep
Status: FAIL
Finding: Found TODO/placeholder code at packages/components/lambda-api/audit/lambda-api.oscal.json:14 → "implementationStatement": "TODO: Describe how the component implements account management controls through IAM roles and policies",
Remediation: Resolve TODO/placeholder logic and replace vaporware sections with production-ready implementations/documentation.

## lambda-worker
Requirement ID: 0.1 Platform Component API Spec
Status: PASS
Finding: `LambdaWorkerComponent` extends BaseComponent at packages/components/lambda-worker/lambda-worker.component.ts:40 with getCapabilities/getType defined at packages/components/lambda-worker/lambda-worker.component.ts:111 / packages/components/lambda-worker/lambda-worker.component.ts:121.
Remediation: None

Requirement ID: 0.2 Platform Configuration Standard
Status: FAIL
Finding: getComplianceFrameworkDefaults() missing in packages/components/lambda-worker/lambda-worker.builder.ts
Remediation: Implement a ConfigBuilder subclass with getHardcodedFallbacks() and getComplianceFrameworkDefaults() to enforce the five-layer precedence chain.

Requirement ID: 0.3 Platform Tagging Standard
Status: PASS
Finding: applyStandardTags invoked (e.g., packages/components/lambda-worker/lambda-worker.component.ts:188).
Remediation: None

Requirement ID: 0.4 Platform Logging Standard
Status: FAIL
Finding: Synth defined at packages/components/lambda-worker/lambda-worker.component.ts:67 lacks lifecycle logging: no logComponentEvent("synthesis_start") call
Remediation: Emit logComponentEvent() entries at the start and end of synth() to satisfy logging standard.

Requirement ID: 0.5 Platform Observability Standard
Status: PASS
Finding: Observability hooks detected around packages/components/lambda-worker/lambda-worker.component.ts:407.
Remediation: None

Requirement ID: 0.6 Platform Testing Standard
Status: FAIL
Finding: packages/components/lambda-worker/package.json lacks a Vitest dependency; tests still rely on Jest.
Remediation: Switch component tests to Vitest and add the vitest dependency per the platform testing standard.

Requirement ID: 0.7 Platform Capability Naming Standard
Status: FAIL
Finding: package.json is missing shinobi.capabilities metadata for lambda-worker
Remediation: Register at least one capability via registerCapability() and mirror it in package.json shinobi.capabilities to satisfy the binding vocabulary.

Requirement ID: 1.2 Constructor Signature
Status: PASS
Finding: Constructor matches required signature at packages/components/lambda-worker/lambda-worker.component.ts:54.
Remediation: None

Requirement ID: 1.5 Creator Pattern
Status: PASS
Finding: Creator implements IComponentCreator at packages/components/lambda-worker/lambda-worker.creator.ts:26 and exports configSchema (packages/components/lambda-worker/lambda-worker.creator.ts:66).
Remediation: None

Requirement ID: 1.6 Construct Registration
Status: PASS
Finding: Constructs registered (first occurrence packages/components/lambda-worker/lambda-worker.component.ts:90).
Remediation: None

Requirement ID: 1.7 Capability Registration
Status: PASS
Finding: Capabilities registered at packages/components/lambda-worker/lambda-worker.component.ts:96.
Remediation: None

Requirement ID: 2.5 Structured Logging Requirements
Status: FAIL
Finding: Synth at packages/components/lambda-worker/lambda-worker.component.ts:67 lacks structured logging: no try/catch around synth() logic; missing logComponentEvent("synthesis_start")
Remediation: Wrap synth() in try/catch and log start/complete events using logComponentEvent().

Requirement ID: 2.6 Compliance Framework Defaults
Status: FAIL
Finding: Builder packages/components/lambda-worker/lambda-worker.builder.ts lacks getComplianceFrameworkDefaults(), so FedRAMP tiers do not receive hardened defaults.
Remediation: Add getComplianceFrameworkDefaults() to the builder to inject framework-specific defaults (encryption, log retention, etc.).

Requirement ID: 2.7 OpenTelemetry Observability Requirements
Status: PASS
Finding: Observability hooks present near packages/components/lambda-worker/lambda-worker.component.ts:407.
Remediation: None

Requirement ID: 2.8 Feature Flags Integration
Status: FAIL
Finding: Neither the component code nor package metadata references platform feature flags for lambda-worker.
Remediation: Gate the component behind feature flags (OpenFeature integration + shinobi.featureFlags metadata).

Requirement ID: 2.10 Backstage Integration
Status: PASS
Finding: catalog-info.yaml present (packages/components/lambda-worker/catalog-info.yaml).
Remediation: None

Requirement ID: 3.3 Config.schema.json Requirement
Status: FAIL
Finding: Config.schema.json missing from packages/components/lambda-worker.
Remediation: Author Config.schema.json that matches the TypeScript config interface and export it from the builder.

Requirement ID: 3.5 Error Handling Patterns
Status: FAIL
Finding: Synth() body at packages/components/lambda-worker/lambda-worker.component.ts:67 lacks try/catch for structured error logging.
Remediation: Wrap synth() contents in try/catch and call logError() before rethrowing.

Requirement ID: 4.1 Test Framework
Status: FAIL
Finding: packages/components/lambda-worker/package.json lacks a Vitest dependency; tests still rely on Jest.
Remediation: Switch component tests to Vitest and add the vitest dependency per the platform testing standard.

Requirement ID: 4.2 CDK-Nag Security Tests
Status: PASS
Finding: tests/security/cdk-nag.test.ts exists.
Remediation: None

Requirement ID: 4.7 Test File Organization
Status: PASS
Finding: tests/ directory present.
Remediation: None

Requirement ID: 4.8 Component Versioning & Metadata
Status: FAIL
Finding: package.json lacks MAJOR.MINOR.PATCH version; CHANGELOG.md missing
Remediation: Set a semantic version in package.json and maintain CHANGELOG.md per governance policy.

Requirement ID: 4.9 Audit Files Requirements
Status: FAIL
Finding: Audit/ directory missing from packages/components/lambda-worker.
Remediation: Add Audit/README and component audit report to satisfy evidence requirements.

Requirement ID: V.1 TODO/Placeholder Sweep
Status: FAIL
Finding: Found TODO/placeholder code at packages/components/lambda-worker/lambda-worker.creator.ts:106 → // TODO: Add production-specific validations
Remediation: Resolve TODO/placeholder logic and replace vaporware sections with production-ready implementations/documentation.

## network-rules-stack
Requirement ID: 0.1 Platform Component API Spec
Status: PASS
Finding: `NetworkRulesStackComponent` extends BaseComponent at packages/components/network-rules-stack/src/network-rules-stack.component.ts:33 with getCapabilities/getType defined at packages/components/network-rules-stack/src/network-rules-stack.component.ts:94 / packages/components/network-rules-stack/src/network-rules-stack.component.ts:102.
Remediation: None

Requirement ID: 0.2 Platform Configuration Standard
Status: FAIL
Finding: getComplianceFrameworkDefaults() missing in packages/components/network-rules-stack/src/network-rules-stack.builder.ts
Remediation: Implement a ConfigBuilder subclass with getHardcodedFallbacks() and getComplianceFrameworkDefaults() to enforce the five-layer precedence chain.

Requirement ID: 0.3 Platform Tagging Standard
Status: PASS
Finding: applyStandardTags invoked (e.g., packages/components/network-rules-stack/src/network-rules-stack.component.ts:181).
Remediation: None

Requirement ID: 0.4 Platform Logging Standard
Status: PASS
Finding: Synth lifecycle logging present at packages/components/network-rules-stack/src/network-rules-stack.component.ts:57 and packages/components/network-rules-stack/src/network-rules-stack.component.ts:77.
Remediation: None

Requirement ID: 0.5 Platform Observability Standard
Status: FAIL
Finding: No OpenTelemetry helpers or configureObservability() calls exist inside packages/components/network-rules-stack/src/network-rules-stack.component.ts.
Remediation: Wire the component into configureObservability()/OpenTelemetry so metrics/traces/logs conform to the observability standard.

Requirement ID: 0.6 Platform Testing Standard
Status: FAIL
Finding: packages/components/network-rules-stack/package.json lacks a Vitest dependency; tests still rely on Jest.
Remediation: Switch component tests to Vitest and add the vitest dependency per the platform testing standard.

Requirement ID: 0.7 Platform Capability Naming Standard
Status: FAIL
Finding: code in packages/components/network-rules-stack/src/network-rules-stack.component.ts never calls registerCapability(); package.json is missing shinobi.capabilities metadata for network-rules-stack
Remediation: Register at least one capability via registerCapability() and mirror it in package.json shinobi.capabilities to satisfy the binding vocabulary.

Requirement ID: 1.2 Constructor Signature
Status: PASS
Finding: Constructor matches required signature at packages/components/network-rules-stack/src/network-rules-stack.component.ts:40.
Remediation: None

Requirement ID: 1.5 Creator Pattern
Status: PASS
Finding: Creator implements IComponentCreator at packages/components/network-rules-stack/src/network-rules-stack.creator.ts:26 and exports configSchema (packages/components/network-rules-stack/src/network-rules-stack.creator.ts:68).
Remediation: None

Requirement ID: 1.6 Construct Registration
Status: PASS
Finding: Constructs registered (first occurrence packages/components/network-rules-stack/src/network-rules-stack.component.ts:186).
Remediation: None

Requirement ID: 1.7 Capability Registration
Status: FAIL
Finding: registerCapability() is never invoked in packages/components/network-rules-stack/src/network-rules-stack.component.ts, so the component cannot advertise bindings.
Remediation: Emit at least one registerCapability() call that maps to the standard binder matrix.

Requirement ID: 2.5 Structured Logging Requirements
Status: PASS
Finding: Synth() uses try/catch with lifecycle logging (packages/components/network-rules-stack/src/network-rules-stack.component.ts:51).
Remediation: None

Requirement ID: 2.6 Compliance Framework Defaults
Status: FAIL
Finding: Builder packages/components/network-rules-stack/src/network-rules-stack.builder.ts lacks getComplianceFrameworkDefaults(), so FedRAMP tiers do not receive hardened defaults.
Remediation: Add getComplianceFrameworkDefaults() to the builder to inject framework-specific defaults (encryption, log retention, etc.).

Requirement ID: 2.7 OpenTelemetry Observability Requirements
Status: FAIL
Finding: No OpenTelemetry or configureObservability calls found in packages/components/network-rules-stack/src/network-rules-stack.component.ts.
Remediation: Integrate configureObservability()/OpenTelemetry instrumentation and register observability capabilities.

Requirement ID: 2.8 Feature Flags Integration
Status: FAIL
Finding: Neither the component code nor package metadata references platform feature flags for network-rules-stack.
Remediation: Gate the component behind feature flags (OpenFeature integration + shinobi.featureFlags metadata).

Requirement ID: 2.10 Backstage Integration
Status: PASS
Finding: catalog-info.yaml present (packages/components/network-rules-stack/catalog-info.yaml).
Remediation: None

Requirement ID: 3.3 Config.schema.json Requirement
Status: PASS
Finding: Config.schema.json present in package root.
Remediation: None

Requirement ID: 3.5 Error Handling Patterns
Status: PASS
Finding: Synth() wraps logic in try/catch at packages/components/network-rules-stack/src/network-rules-stack.component.ts:51.
Remediation: None

Requirement ID: 4.1 Test Framework
Status: FAIL
Finding: packages/components/network-rules-stack/package.json lacks a Vitest dependency; tests still rely on Jest.
Remediation: Switch component tests to Vitest and add the vitest dependency per the platform testing standard.

Requirement ID: 4.2 CDK-Nag Security Tests
Status: FAIL
Finding: Missing tests/security/cdk-nag.test.ts in packages/components/network-rules-stack.
Remediation: Add CDK-Nag AwsSolutions tests covering all frameworks.

Requirement ID: 4.7 Test File Organization
Status: PASS
Finding: tests/ directory present.
Remediation: None

Requirement ID: 4.8 Component Versioning & Metadata
Status: PASS
Finding: package.json uses semver and CHANGELOG.md exists.
Remediation: None

Requirement ID: 4.9 Audit Files Requirements
Status: PASS
Finding: Audit/ documentation present.
Remediation: None

Requirement ID: V.1 TODO/Placeholder Sweep
Status: PASS
Finding: No TODO/TBD/placeholder markers detected in component sources.
Remediation: None

## openfeature-provider
Requirement ID: 0.1 Platform Component API Spec
Status: PASS
Finding: `OpenFeatureProviderComponent` extends BaseComponent at packages/components/openfeature-provider/openfeature-provider.component.ts:30 with getCapabilities/getType defined at packages/components/openfeature-provider/openfeature-provider.component.ts:71 / packages/components/openfeature-provider/openfeature-provider.component.ts:76.
Remediation: None

Requirement ID: 0.2 Platform Configuration Standard
Status: FAIL
Finding: getComplianceFrameworkDefaults() missing in packages/components/openfeature-provider/openfeature-provider.builder.ts
Remediation: Implement a ConfigBuilder subclass with getHardcodedFallbacks() and getComplianceFrameworkDefaults() to enforce the five-layer precedence chain.

Requirement ID: 0.3 Platform Tagging Standard
Status: PASS
Finding: applyStandardTags invoked (e.g., packages/components/openfeature-provider/openfeature-provider.component.ts:89).
Remediation: None

Requirement ID: 0.4 Platform Logging Standard
Status: PASS
Finding: Synth lifecycle logging present at packages/components/openfeature-provider/openfeature-provider.component.ts:43 and packages/components/openfeature-provider/openfeature-provider.component.ts:64.
Remediation: None

Requirement ID: 0.5 Platform Observability Standard
Status: FAIL
Finding: No OpenTelemetry helpers or configureObservability() calls exist inside packages/components/openfeature-provider/openfeature-provider.component.ts.
Remediation: Wire the component into configureObservability()/OpenTelemetry so metrics/traces/logs conform to the observability standard.

Requirement ID: 0.6 Platform Testing Standard
Status: FAIL
Finding: packages/components/openfeature-provider/package.json lacks a Vitest dependency; tests still rely on Jest.
Remediation: Switch component tests to Vitest and add the vitest dependency per the platform testing standard.

Requirement ID: 0.7 Platform Capability Naming Standard
Status: FAIL
Finding: package.json is missing shinobi.capabilities metadata for openfeature-provider
Remediation: Register at least one capability via registerCapability() and mirror it in package.json shinobi.capabilities to satisfy the binding vocabulary.

Requirement ID: 1.2 Constructor Signature
Status: PASS
Finding: Constructor matches required signature at packages/components/openfeature-provider/openfeature-provider.component.ts:38.
Remediation: None

Requirement ID: 1.5 Creator Pattern
Status: PASS
Finding: Creator implements IComponentCreator at packages/components/openfeature-provider/openfeature-provider.creator.ts:19 and exports configSchema (packages/components/openfeature-provider/openfeature-provider.creator.ts:26).
Remediation: None

Requirement ID: 1.6 Construct Registration
Status: PASS
Finding: Constructs registered (first occurrence packages/components/openfeature-provider/openfeature-provider.component.ts:154).
Remediation: None

Requirement ID: 1.7 Capability Registration
Status: PASS
Finding: Capabilities registered at packages/components/openfeature-provider/openfeature-provider.component.ts:63.
Remediation: None

Requirement ID: 2.5 Structured Logging Requirements
Status: PASS
Finding: Synth() uses try/catch with lifecycle logging (packages/components/openfeature-provider/openfeature-provider.component.ts:42).
Remediation: None

Requirement ID: 2.6 Compliance Framework Defaults
Status: FAIL
Finding: Builder packages/components/openfeature-provider/openfeature-provider.builder.ts lacks getComplianceFrameworkDefaults(), so FedRAMP tiers do not receive hardened defaults.
Remediation: Add getComplianceFrameworkDefaults() to the builder to inject framework-specific defaults (encryption, log retention, etc.).

Requirement ID: 2.7 OpenTelemetry Observability Requirements
Status: FAIL
Finding: No OpenTelemetry or configureObservability calls found in packages/components/openfeature-provider/openfeature-provider.component.ts.
Remediation: Integrate configureObservability()/OpenTelemetry instrumentation and register observability capabilities.

Requirement ID: 2.8 Feature Flags Integration
Status: PASS
Finding: Feature flag integration declared via code.
Remediation: None

Requirement ID: 2.10 Backstage Integration
Status: PASS
Finding: catalog-info.yaml present (packages/components/openfeature-provider/catalog-info.yaml).
Remediation: None

Requirement ID: 3.3 Config.schema.json Requirement
Status: FAIL
Finding: Config.schema.json missing from packages/components/openfeature-provider.
Remediation: Author Config.schema.json that matches the TypeScript config interface and export it from the builder.

Requirement ID: 3.5 Error Handling Patterns
Status: PASS
Finding: Synth() wraps logic in try/catch at packages/components/openfeature-provider/openfeature-provider.component.ts:42.
Remediation: None

Requirement ID: 4.1 Test Framework
Status: FAIL
Finding: packages/components/openfeature-provider/package.json lacks a Vitest dependency; tests still rely on Jest.
Remediation: Switch component tests to Vitest and add the vitest dependency per the platform testing standard.

Requirement ID: 4.2 CDK-Nag Security Tests
Status: FAIL
Finding: Missing tests/security/cdk-nag.test.ts in packages/components/openfeature-provider.
Remediation: Add CDK-Nag AwsSolutions tests covering all frameworks.

Requirement ID: 4.7 Test File Organization
Status: PASS
Finding: tests/ directory present.
Remediation: None

Requirement ID: 4.8 Component Versioning & Metadata
Status: FAIL
Finding: package.json lacks MAJOR.MINOR.PATCH version; CHANGELOG.md missing
Remediation: Set a semantic version in package.json and maintain CHANGELOG.md per governance policy.

Requirement ID: 4.9 Audit Files Requirements
Status: FAIL
Finding: Audit/ directory missing from packages/components/openfeature-provider.
Remediation: Add Audit/README and component audit report to satisfy evidence requirements.

Requirement ID: V.1 TODO/Placeholder Sweep
Status: FAIL
Finding: Found TODO/placeholder code at packages/components/openfeature-provider/openfeature-provider.component.ts:56 → this.createLaunchDarklyPlaceholder(this.config.launchDarkly);
Remediation: Resolve TODO/placeholder logic and replace vaporware sections with production-ready implementations/documentation.

## opensearch-domain
Requirement ID: 0.1 Platform Component API Spec
Status: FAIL
Finding: class declaration at packages/components/opensearch-domain/opensearch-domain.component.ts does not extend BaseComponent
Remediation: Define a component class that extends BaseComponent and implements synth(), getCapabilities(), and getType() using the canonical constructor signature.

Requirement ID: 0.2 Platform Configuration Standard
Status: FAIL
Finding: getComplianceFrameworkDefaults() missing in packages/components/opensearch-domain/opensearch-domain.builder.ts
Remediation: Implement a ConfigBuilder subclass with getHardcodedFallbacks() and getComplianceFrameworkDefaults() to enforce the five-layer precedence chain.

Requirement ID: 0.3 Platform Tagging Standard
Status: PASS
Finding: applyStandardTags invoked (e.g., packages/components/opensearch-domain/opensearch-domain.component.ts:60).
Remediation: None

Requirement ID: 0.4 Platform Logging Standard
Status: PASS
Finding: Synth lifecycle logging present at packages/components/opensearch-domain/opensearch-domain.component.ts:43 and packages/components/opensearch-domain/opensearch-domain.component.ts:84.
Remediation: None

Requirement ID: 0.5 Platform Observability Standard
Status: PASS
Finding: Observability hooks detected around packages/components/opensearch-domain/opensearch-domain.component.ts:432.
Remediation: None

Requirement ID: 0.6 Platform Testing Standard
Status: FAIL
Finding: packages/components/opensearch-domain/package.json lacks a Vitest dependency; tests still rely on Jest.
Remediation: Switch component tests to Vitest and add the vitest dependency per the platform testing standard.

Requirement ID: 0.7 Platform Capability Naming Standard
Status: FAIL
Finding: package.json is missing shinobi.capabilities metadata for opensearch-domain
Remediation: Register at least one capability via registerCapability() and mirror it in package.json shinobi.capabilities to satisfy the binding vocabulary.

Requirement ID: 1.2 Constructor Signature
Status: PASS
Finding: Constructor matches required signature at packages/components/opensearch-domain/opensearch-domain.component.ts:37.
Remediation: None

Requirement ID: 1.5 Creator Pattern
Status: PASS
Finding: Creator implements IComponentCreator at packages/components/opensearch-domain/opensearch-domain.creator.ts:26 and exports configSchema (packages/components/opensearch-domain/opensearch-domain.creator.ts:66).
Remediation: None

Requirement ID: 1.6 Construct Registration
Status: PASS
Finding: Constructs registered (first occurrence packages/components/opensearch-domain/opensearch-domain.component.ts:69).
Remediation: None

Requirement ID: 1.7 Capability Registration
Status: PASS
Finding: Capabilities registered at packages/components/opensearch-domain/opensearch-domain.component.ts:78.
Remediation: None

Requirement ID: 2.5 Structured Logging Requirements
Status: PASS
Finding: Synth() uses try/catch with lifecycle logging (packages/components/opensearch-domain/opensearch-domain.component.ts:41).
Remediation: None

Requirement ID: 2.6 Compliance Framework Defaults
Status: FAIL
Finding: Builder packages/components/opensearch-domain/opensearch-domain.builder.ts lacks getComplianceFrameworkDefaults(), so FedRAMP tiers do not receive hardened defaults.
Remediation: Add getComplianceFrameworkDefaults() to the builder to inject framework-specific defaults (encryption, log retention, etc.).

Requirement ID: 2.7 OpenTelemetry Observability Requirements
Status: PASS
Finding: Observability hooks present near packages/components/opensearch-domain/opensearch-domain.component.ts:432.
Remediation: None

Requirement ID: 2.8 Feature Flags Integration
Status: FAIL
Finding: Neither the component code nor package metadata references platform feature flags for opensearch-domain.
Remediation: Gate the component behind feature flags (OpenFeature integration + shinobi.featureFlags metadata).

Requirement ID: 2.10 Backstage Integration
Status: PASS
Finding: catalog-info.yaml present (packages/components/opensearch-domain/catalog-info.yaml).
Remediation: None

Requirement ID: 3.3 Config.schema.json Requirement
Status: FAIL
Finding: Config.schema.json missing from packages/components/opensearch-domain.
Remediation: Author Config.schema.json that matches the TypeScript config interface and export it from the builder.

Requirement ID: 3.5 Error Handling Patterns
Status: PASS
Finding: Synth() wraps logic in try/catch at packages/components/opensearch-domain/opensearch-domain.component.ts:41.
Remediation: None

Requirement ID: 4.1 Test Framework
Status: FAIL
Finding: packages/components/opensearch-domain/package.json lacks a Vitest dependency; tests still rely on Jest.
Remediation: Switch component tests to Vitest and add the vitest dependency per the platform testing standard.

Requirement ID: 4.2 CDK-Nag Security Tests
Status: FAIL
Finding: Missing tests/security/cdk-nag.test.ts in packages/components/opensearch-domain.
Remediation: Add CDK-Nag AwsSolutions tests covering all frameworks.

Requirement ID: 4.7 Test File Organization
Status: PASS
Finding: tests/ directory present.
Remediation: None

Requirement ID: 4.8 Component Versioning & Metadata
Status: FAIL
Finding: package.json lacks MAJOR.MINOR.PATCH version; CHANGELOG.md missing
Remediation: Set a semantic version in package.json and maintain CHANGELOG.md per governance policy.

Requirement ID: 4.9 Audit Files Requirements
Status: FAIL
Finding: Audit/ directory missing from packages/components/opensearch-domain.
Remediation: Add Audit/README and component audit report to satisfy evidence requirements.

Requirement ID: V.1 TODO/Placeholder Sweep
Status: FAIL
Finding: Found TODO/placeholder code at packages/components/opensearch-domain/opensearch-domain.creator.ts:96 → // TODO: Add component-specific validations here
Remediation: Resolve TODO/placeholder logic and replace vaporware sections with production-ready implementations/documentation.

## rds-postgres
Requirement ID: 0.1 Platform Component API Spec
Status: PASS
Finding: `RdsPostgresComponent` extends BaseComponent at packages/components/rds-postgres/src/rds-postgres.component.ts:38 with getCapabilities/getType defined at packages/components/rds-postgres/src/rds-postgres.component.ts:173 / packages/components/rds-postgres/src/rds-postgres.component.ts:181.
Remediation: None

Requirement ID: 0.2 Platform Configuration Standard
Status: FAIL
Finding: getComplianceFrameworkDefaults() missing in packages/components/rds-postgres/src/rds-postgres.builder.ts
Remediation: Implement a ConfigBuilder subclass with getHardcodedFallbacks() and getComplianceFrameworkDefaults() to enforce the five-layer precedence chain.

Requirement ID: 0.3 Platform Tagging Standard
Status: PASS
Finding: applyStandardTags invoked (e.g., packages/components/rds-postgres/src/rds-postgres.component.ts:214).
Remediation: None

Requirement ID: 0.4 Platform Logging Standard
Status: PASS
Finding: Synth lifecycle logging present at packages/components/rds-postgres/src/rds-postgres.component.ts:112 and packages/components/rds-postgres/src/rds-postgres.component.ts:155.
Remediation: None

Requirement ID: 0.5 Platform Observability Standard
Status: PASS
Finding: Observability hooks detected around packages/components/rds-postgres/src/rds-postgres.component.ts:386.
Remediation: None

Requirement ID: 0.6 Platform Testing Standard
Status: FAIL
Finding: packages/components/rds-postgres/package.json lacks a Vitest dependency; tests still rely on Jest.
Remediation: Switch component tests to Vitest and add the vitest dependency per the platform testing standard.

Requirement ID: 0.7 Platform Capability Naming Standard
Status: FAIL
Finding: package.json is missing shinobi.capabilities metadata for rds-postgres
Remediation: Register at least one capability via registerCapability() and mirror it in package.json shinobi.capabilities to satisfy the binding vocabulary.

Requirement ID: 1.2 Constructor Signature
Status: PASS
Finding: Constructor matches required signature at packages/components/rds-postgres/src/rds-postgres.component.ts:47.
Remediation: None

Requirement ID: 1.5 Creator Pattern
Status: FAIL
Finding: packages/components/rds-postgres/src/rds-postgres.creator.ts missing configSchema export
Remediation: Implement an IComponentCreator with component metadata, configSchema reference, and create/process methods per the standard.

Requirement ID: 1.6 Construct Registration
Status: PASS
Finding: Constructs registered (first occurrence packages/components/rds-postgres/src/rds-postgres.component.ts:138).
Remediation: None

Requirement ID: 1.7 Capability Registration
Status: PASS
Finding: Capabilities registered at packages/components/rds-postgres/src/rds-postgres.component.ts:148.
Remediation: None

Requirement ID: 2.5 Structured Logging Requirements
Status: PASS
Finding: Synth() uses try/catch with lifecycle logging (packages/components/rds-postgres/src/rds-postgres.component.ts:111).
Remediation: None

Requirement ID: 2.6 Compliance Framework Defaults
Status: FAIL
Finding: Builder packages/components/rds-postgres/src/rds-postgres.builder.ts lacks getComplianceFrameworkDefaults(), so FedRAMP tiers do not receive hardened defaults.
Remediation: Add getComplianceFrameworkDefaults() to the builder to inject framework-specific defaults (encryption, log retention, etc.).

Requirement ID: 2.7 OpenTelemetry Observability Requirements
Status: PASS
Finding: Observability hooks present near packages/components/rds-postgres/src/rds-postgres.component.ts:386.
Remediation: None

Requirement ID: 2.8 Feature Flags Integration
Status: FAIL
Finding: Neither the component code nor package metadata references platform feature flags for rds-postgres.
Remediation: Gate the component behind feature flags (OpenFeature integration + shinobi.featureFlags metadata).

Requirement ID: 2.10 Backstage Integration
Status: PASS
Finding: catalog-info.yaml present (packages/components/rds-postgres/catalog-info.yaml).
Remediation: None

Requirement ID: 3.3 Config.schema.json Requirement
Status: PASS
Finding: Config.schema.json present in package root.
Remediation: None

Requirement ID: 3.5 Error Handling Patterns
Status: PASS
Finding: Synth() wraps logic in try/catch at packages/components/rds-postgres/src/rds-postgres.component.ts:111.
Remediation: None

Requirement ID: 4.1 Test Framework
Status: FAIL
Finding: packages/components/rds-postgres/package.json lacks a Vitest dependency; tests still rely on Jest.
Remediation: Switch component tests to Vitest and add the vitest dependency per the platform testing standard.

Requirement ID: 4.2 CDK-Nag Security Tests
Status: FAIL
Finding: Missing tests/security/cdk-nag.test.ts in packages/components/rds-postgres.
Remediation: Add CDK-Nag AwsSolutions tests covering all frameworks.

Requirement ID: 4.7 Test File Organization
Status: PASS
Finding: tests/ directory present.
Remediation: None

Requirement ID: 4.8 Component Versioning & Metadata
Status: FAIL
Finding: CHANGELOG.md missing
Remediation: Set a semantic version in package.json and maintain CHANGELOG.md per governance policy.

Requirement ID: 4.9 Audit Files Requirements
Status: FAIL
Finding: Audit/ directory missing from packages/components/rds-postgres.
Remediation: Add Audit/README and component audit report to satisfy evidence requirements.

Requirement ID: V.1 TODO/Placeholder Sweep
Status: PASS
Finding: No TODO/TBD/placeholder markers detected in component sources.
Remediation: None

## route53-hosted-zone
Requirement ID: 0.1 Platform Component API Spec
Status: FAIL
Finding: class declaration at packages/components/route53-hosted-zone/route53-hosted-zone.component.ts does not extend BaseComponent
Remediation: Define a component class that extends BaseComponent and implements synth(), getCapabilities(), and getType() using the canonical constructor signature.

Requirement ID: 0.2 Platform Configuration Standard
Status: FAIL
Finding: getComplianceFrameworkDefaults() missing in packages/components/route53-hosted-zone/route53-hosted-zone.builder.ts
Remediation: Implement a ConfigBuilder subclass with getHardcodedFallbacks() and getComplianceFrameworkDefaults() to enforce the five-layer precedence chain.

Requirement ID: 0.3 Platform Tagging Standard
Status: PASS
Finding: applyStandardTags invoked (e.g., packages/components/route53-hosted-zone/route53-hosted-zone.component.ts:50).
Remediation: None

Requirement ID: 0.4 Platform Logging Standard
Status: FAIL
Finding: Synth defined at packages/components/route53-hosted-zone/route53-hosted-zone.component.ts:29 lacks lifecycle logging: no logComponentEvent("synthesis_start") call
Remediation: Emit logComponentEvent() entries at the start and end of synth() to satisfy logging standard.

Requirement ID: 0.5 Platform Observability Standard
Status: FAIL
Finding: No OpenTelemetry helpers or configureObservability() calls exist inside packages/components/route53-hosted-zone/route53-hosted-zone.component.ts.
Remediation: Wire the component into configureObservability()/OpenTelemetry so metrics/traces/logs conform to the observability standard.

Requirement ID: 0.6 Platform Testing Standard
Status: FAIL
Finding: packages/components/route53-hosted-zone/package.json lacks a Vitest dependency; tests still rely on Jest.
Remediation: Switch component tests to Vitest and add the vitest dependency per the platform testing standard.

Requirement ID: 0.7 Platform Capability Naming Standard
Status: FAIL
Finding: package.json is missing shinobi.capabilities metadata for route53-hosted-zone
Remediation: Register at least one capability via registerCapability() and mirror it in package.json shinobi.capabilities to satisfy the binding vocabulary.

Requirement ID: 1.2 Constructor Signature
Status: PASS
Finding: Constructor matches required signature at packages/components/route53-hosted-zone/route53-hosted-zone.component.ts:25.
Remediation: None

Requirement ID: 1.5 Creator Pattern
Status: PASS
Finding: Creator implements IComponentCreator at packages/components/route53-hosted-zone/route53-hosted-zone.creator.ts:26 and exports configSchema (packages/components/route53-hosted-zone/route53-hosted-zone.creator.ts:66).
Remediation: None

Requirement ID: 1.6 Construct Registration
Status: PASS
Finding: Constructs registered (first occurrence packages/components/route53-hosted-zone/route53-hosted-zone.component.ts:58).
Remediation: None

Requirement ID: 1.7 Capability Registration
Status: PASS
Finding: Capabilities registered at packages/components/route53-hosted-zone/route53-hosted-zone.component.ts:64.
Remediation: None

Requirement ID: 2.5 Structured Logging Requirements
Status: FAIL
Finding: Synth at packages/components/route53-hosted-zone/route53-hosted-zone.component.ts:29 lacks structured logging: no try/catch around synth() logic; missing logComponentEvent("synthesis_start")
Remediation: Wrap synth() in try/catch and log start/complete events using logComponentEvent().

Requirement ID: 2.6 Compliance Framework Defaults
Status: FAIL
Finding: Builder packages/components/route53-hosted-zone/route53-hosted-zone.builder.ts lacks getComplianceFrameworkDefaults(), so FedRAMP tiers do not receive hardened defaults.
Remediation: Add getComplianceFrameworkDefaults() to the builder to inject framework-specific defaults (encryption, log retention, etc.).

Requirement ID: 2.7 OpenTelemetry Observability Requirements
Status: FAIL
Finding: No OpenTelemetry or configureObservability calls found in packages/components/route53-hosted-zone/route53-hosted-zone.component.ts.
Remediation: Integrate configureObservability()/OpenTelemetry instrumentation and register observability capabilities.

Requirement ID: 2.8 Feature Flags Integration
Status: FAIL
Finding: Neither the component code nor package metadata references platform feature flags for route53-hosted-zone.
Remediation: Gate the component behind feature flags (OpenFeature integration + shinobi.featureFlags metadata).

Requirement ID: 2.10 Backstage Integration
Status: PASS
Finding: catalog-info.yaml present (packages/components/route53-hosted-zone/catalog-info.yaml).
Remediation: None

Requirement ID: 3.3 Config.schema.json Requirement
Status: FAIL
Finding: Config.schema.json missing from packages/components/route53-hosted-zone.
Remediation: Author Config.schema.json that matches the TypeScript config interface and export it from the builder.

Requirement ID: 3.5 Error Handling Patterns
Status: FAIL
Finding: Synth() body at packages/components/route53-hosted-zone/route53-hosted-zone.component.ts:29 lacks try/catch for structured error logging.
Remediation: Wrap synth() contents in try/catch and call logError() before rethrowing.

Requirement ID: 4.1 Test Framework
Status: FAIL
Finding: packages/components/route53-hosted-zone/package.json lacks a Vitest dependency; tests still rely on Jest.
Remediation: Switch component tests to Vitest and add the vitest dependency per the platform testing standard.

Requirement ID: 4.2 CDK-Nag Security Tests
Status: FAIL
Finding: Missing tests/security/cdk-nag.test.ts in packages/components/route53-hosted-zone.
Remediation: Add CDK-Nag AwsSolutions tests covering all frameworks.

Requirement ID: 4.7 Test File Organization
Status: PASS
Finding: tests/ directory present.
Remediation: None

Requirement ID: 4.8 Component Versioning & Metadata
Status: FAIL
Finding: package.json lacks MAJOR.MINOR.PATCH version; CHANGELOG.md missing
Remediation: Set a semantic version in package.json and maintain CHANGELOG.md per governance policy.

Requirement ID: 4.9 Audit Files Requirements
Status: FAIL
Finding: Audit/ directory missing from packages/components/route53-hosted-zone.
Remediation: Add Audit/README and component audit report to satisfy evidence requirements.

Requirement ID: V.1 TODO/Placeholder Sweep
Status: FAIL
Finding: Found TODO/placeholder code at packages/components/route53-hosted-zone/route53-hosted-zone.creator.ts:110 → // TODO: Add production-specific validations
Remediation: Resolve TODO/placeholder logic and replace vaporware sections with production-ready implementations/documentation.

## route53-record
Requirement ID: 0.1 Platform Component API Spec
Status: PASS
Finding: `Route53RecordComponent` extends BaseComponent at packages/components/route53-record/src/route53-record.component.ts:24 with getCapabilities/getType defined at packages/components/route53-record/src/route53-record.component.ts:260 / packages/components/route53-record/src/route53-record.component.ts:333.
Remediation: None

Requirement ID: 0.2 Platform Configuration Standard
Status: FAIL
Finding: getComplianceFrameworkDefaults() missing in packages/components/route53-record/src/route53-record.builder.ts
Remediation: Implement a ConfigBuilder subclass with getHardcodedFallbacks() and getComplianceFrameworkDefaults() to enforce the five-layer precedence chain.

Requirement ID: 0.3 Platform Tagging Standard
Status: FAIL
Finding: applyStandardTags() is never called in packages/components/route53-record/src/route53-record.component.ts, so platform/governance tags are skipped.
Remediation: Invoke applyStandardTags() on every construct that the component creates to propagate service/compliance/cost tags.

Requirement ID: 0.4 Platform Logging Standard
Status: FAIL
Finding: Synth defined at packages/components/route53-record/src/route53-record.component.ts:288 lacks lifecycle logging: no logComponentEvent("synthesis_start") call; no logComponentEvent("synthesis_complete") call
Remediation: Emit logComponentEvent() entries at the start and end of synth() to satisfy logging standard.

Requirement ID: 0.5 Platform Observability Standard
Status: PASS
Finding: Observability hooks detected around packages/components/route53-record/src/route53-record.component.ts:15.
Remediation: None

Requirement ID: 0.6 Platform Testing Standard
Status: FAIL
Finding: packages/components/route53-record/package.json lacks a Vitest dependency; tests still rely on Jest.
Remediation: Switch component tests to Vitest and add the vitest dependency per the platform testing standard.

Requirement ID: 0.7 Platform Capability Naming Standard
Status: FAIL
Finding: package.json is missing shinobi.capabilities metadata for route53-record
Remediation: Register at least one capability via registerCapability() and mirror it in package.json shinobi.capabilities to satisfy the binding vocabulary.

Requirement ID: 1.2 Constructor Signature
Status: PASS
Finding: Constructor matches required signature at packages/components/route53-record/src/route53-record.component.ts:28.
Remediation: None

Requirement ID: 1.5 Creator Pattern
Status: FAIL
Finding: packages/components/route53-record/src/route53-record.creator.ts missing configSchema export
Remediation: Implement an IComponentCreator with component metadata, configSchema reference, and create/process methods per the standard.

Requirement ID: 1.6 Construct Registration
Status: PASS
Finding: Constructs registered (first occurrence packages/components/route53-record/src/route53-record.component.ts:300).
Remediation: None

Requirement ID: 1.7 Capability Registration
Status: PASS
Finding: Capabilities registered at packages/components/route53-record/src/route53-record.component.ts:304.
Remediation: None

Requirement ID: 2.5 Structured Logging Requirements
Status: FAIL
Finding: Synth at packages/components/route53-record/src/route53-record.component.ts:288 lacks structured logging: missing logComponentEvent("synthesis_start"); missing logComponentEvent("synthesis_complete")
Remediation: Wrap synth() in try/catch and log start/complete events using logComponentEvent().

Requirement ID: 2.6 Compliance Framework Defaults
Status: FAIL
Finding: Builder packages/components/route53-record/src/route53-record.builder.ts lacks getComplianceFrameworkDefaults(), so FedRAMP tiers do not receive hardened defaults.
Remediation: Add getComplianceFrameworkDefaults() to the builder to inject framework-specific defaults (encryption, log retention, etc.).

Requirement ID: 2.7 OpenTelemetry Observability Requirements
Status: PASS
Finding: Observability hooks present near packages/components/route53-record/src/route53-record.component.ts:15.
Remediation: None

Requirement ID: 2.8 Feature Flags Integration
Status: FAIL
Finding: Neither the component code nor package metadata references platform feature flags for route53-record.
Remediation: Gate the component behind feature flags (OpenFeature integration + shinobi.featureFlags metadata).

Requirement ID: 2.10 Backstage Integration
Status: PASS
Finding: catalog-info.yaml present (packages/components/route53-record/catalog-info.yaml).
Remediation: None

Requirement ID: 3.3 Config.schema.json Requirement
Status: FAIL
Finding: Config.schema.json missing from packages/components/route53-record.
Remediation: Author Config.schema.json that matches the TypeScript config interface and export it from the builder.

Requirement ID: 3.5 Error Handling Patterns
Status: PASS
Finding: Synth() wraps logic in try/catch at packages/components/route53-record/src/route53-record.component.ts:288.
Remediation: None

Requirement ID: 4.1 Test Framework
Status: FAIL
Finding: packages/components/route53-record/package.json lacks a Vitest dependency; tests still rely on Jest.
Remediation: Switch component tests to Vitest and add the vitest dependency per the platform testing standard.

Requirement ID: 4.2 CDK-Nag Security Tests
Status: FAIL
Finding: Missing tests/security/cdk-nag.test.ts in packages/components/route53-record.
Remediation: Add CDK-Nag AwsSolutions tests covering all frameworks.

Requirement ID: 4.7 Test File Organization
Status: PASS
Finding: tests/ directory present.
Remediation: None

Requirement ID: 4.8 Component Versioning & Metadata
Status: FAIL
Finding: CHANGELOG.md missing
Remediation: Set a semantic version in package.json and maintain CHANGELOG.md per governance policy.

Requirement ID: 4.9 Audit Files Requirements
Status: FAIL
Finding: Audit/ directory missing from packages/components/route53-record.
Remediation: Add Audit/README and component audit report to satisfy evidence requirements.

Requirement ID: V.1 TODO/Placeholder Sweep
Status: FAIL
Finding: Found TODO/placeholder code at packages/components/route53-record/src/route53-record.component.ts:44 → // This method is a placeholder for future platform service integration
Remediation: Resolve TODO/placeholder logic and replace vaporware sections with production-ready implementations/documentation.

## s3-bucket
Requirement ID: 0.1 Platform Component API Spec
Status: PASS
Finding: `S3BucketComponent` extends BaseComponent at packages/components/s3-bucket/s3-bucket.component.ts:29 with getCapabilities/getType defined at packages/components/s3-bucket/s3-bucket.component.ts:75 / packages/components/s3-bucket/s3-bucket.component.ts:80.
Remediation: None

Requirement ID: 0.2 Platform Configuration Standard
Status: PASS
Finding: Config builder at packages/components/s3-bucket/s3-bucket.builder.ts:422 derives from ConfigBuilder and implements both hardcoded fallbacks and compliance defaults.
Remediation: None

Requirement ID: 0.3 Platform Tagging Standard
Status: PASS
Finding: applyStandardTags invoked (e.g., packages/components/s3-bucket/s3-bucket.component.ts:104).
Remediation: None

Requirement ID: 0.4 Platform Logging Standard
Status: FAIL
Finding: Synth defined at packages/components/s3-bucket/s3-bucket.component.ts:42 lacks lifecycle logging: no logComponentEvent("synthesis_start") call; no logComponentEvent("synthesis_complete") call
Remediation: Emit logComponentEvent() entries at the start and end of synth() to satisfy logging standard.

Requirement ID: 0.5 Platform Observability Standard
Status: PASS
Finding: Observability hooks detected around packages/components/s3-bucket/s3-bucket.component.ts:395.
Remediation: None

Requirement ID: 0.6 Platform Testing Standard
Status: FAIL
Finding: packages/components/s3-bucket/package.json lacks a Vitest dependency; tests still rely on Jest.
Remediation: Switch component tests to Vitest and add the vitest dependency per the platform testing standard.

Requirement ID: 0.7 Platform Capability Naming Standard
Status: FAIL
Finding: package.json is missing shinobi.capabilities metadata for s3-bucket
Remediation: Register at least one capability via registerCapability() and mirror it in package.json shinobi.capabilities to satisfy the binding vocabulary.

Requirement ID: 1.2 Constructor Signature
Status: PASS
Finding: Constructor matches required signature at packages/components/s3-bucket/s3-bucket.component.ts:38.
Remediation: None

Requirement ID: 1.5 Creator Pattern
Status: PASS
Finding: Creator implements IComponentCreator at packages/components/s3-bucket/s3-bucket.creator.ts:10 and exports configSchema (packages/components/s3-bucket/s3-bucket.creator.ts:16).
Remediation: None

Requirement ID: 1.6 Construct Registration
Status: PASS
Finding: Constructs registered (first occurrence packages/components/s3-bucket/s3-bucket.component.ts:63).
Remediation: None

Requirement ID: 1.7 Capability Registration
Status: PASS
Finding: Capabilities registered at packages/components/s3-bucket/s3-bucket.component.ts:72.
Remediation: None

Requirement ID: 2.5 Structured Logging Requirements
Status: FAIL
Finding: Synth at packages/components/s3-bucket/s3-bucket.component.ts:42 lacks structured logging: no try/catch around synth() logic; missing logComponentEvent("synthesis_start"); missing logComponentEvent("synthesis_complete")
Remediation: Wrap synth() in try/catch and log start/complete events using logComponentEvent().

Requirement ID: 2.6 Compliance Framework Defaults
Status: PASS
Finding: Compliance defaults implemented at packages/components/s3-bucket/s3-bucket.builder.ts:483.
Remediation: None

Requirement ID: 2.7 OpenTelemetry Observability Requirements
Status: PASS
Finding: Observability hooks present near packages/components/s3-bucket/s3-bucket.component.ts:395.
Remediation: None

Requirement ID: 2.8 Feature Flags Integration
Status: FAIL
Finding: Neither the component code nor package metadata references platform feature flags for s3-bucket.
Remediation: Gate the component behind feature flags (OpenFeature integration + shinobi.featureFlags metadata).

Requirement ID: 2.10 Backstage Integration
Status: PASS
Finding: catalog-info.yaml present (packages/components/s3-bucket/catalog-info.yaml).
Remediation: None

Requirement ID: 3.3 Config.schema.json Requirement
Status: PASS
Finding: Config.schema.json present in package root.
Remediation: None

Requirement ID: 3.5 Error Handling Patterns
Status: FAIL
Finding: Synth() body at packages/components/s3-bucket/s3-bucket.component.ts:42 lacks try/catch for structured error logging.
Remediation: Wrap synth() contents in try/catch and call logError() before rethrowing.

Requirement ID: 4.1 Test Framework
Status: FAIL
Finding: packages/components/s3-bucket/package.json lacks a Vitest dependency; tests still rely on Jest.
Remediation: Switch component tests to Vitest and add the vitest dependency per the platform testing standard.

Requirement ID: 4.2 CDK-Nag Security Tests
Status: FAIL
Finding: Missing tests/security/cdk-nag.test.ts in packages/components/s3-bucket.
Remediation: Add CDK-Nag AwsSolutions tests covering all frameworks.

Requirement ID: 4.7 Test File Organization
Status: PASS
Finding: tests/ directory present.
Remediation: None

Requirement ID: 4.8 Component Versioning & Metadata
Status: FAIL
Finding: CHANGELOG.md missing
Remediation: Set a semantic version in package.json and maintain CHANGELOG.md per governance policy.

Requirement ID: 4.9 Audit Files Requirements
Status: FAIL
Finding: Audit/ directory missing from packages/components/s3-bucket.
Remediation: Add Audit/README and component audit report to satisfy evidence requirements.

Requirement ID: V.1 TODO/Placeholder Sweep
Status: FAIL
Finding: Found TODO/placeholder code at packages/components/s3-bucket/S3_BUCKET_AWS_LABS_AUDIT.md:30 → - Add security scanning integration (ClamAV placeholder exists)
Remediation: Resolve TODO/placeholder logic and replace vaporware sections with production-ready implementations/documentation.

## sagemaker-notebook-instance
Requirement ID: 0.1 Platform Component API Spec
Status: PASS
Finding: `SageMakerNotebookInstanceComponent` extends BaseComponent at packages/components/sagemaker-notebook-instance/sagemaker-notebook-instance.component.ts:26 with getCapabilities/getType defined at packages/components/sagemaker-notebook-instance/sagemaker-notebook-instance.component.ts:98 / packages/components/sagemaker-notebook-instance/sagemaker-notebook-instance.component.ts:37.
Remediation: None

Requirement ID: 0.2 Platform Configuration Standard
Status: PASS
Finding: Config builder at packages/components/sagemaker-notebook-instance/sagemaker-notebook-instance.builder.ts:272 derives from ConfigBuilder and implements both hardcoded fallbacks and compliance defaults.
Remediation: None

Requirement ID: 0.3 Platform Tagging Standard
Status: PASS
Finding: applyStandardTags invoked (e.g., packages/components/sagemaker-notebook-instance/sagemaker-notebook-instance.component.ts:111).
Remediation: None

Requirement ID: 0.4 Platform Logging Standard
Status: PASS
Finding: Synth lifecycle logging present at packages/components/sagemaker-notebook-instance/sagemaker-notebook-instance.component.ts:42 and packages/components/sagemaker-notebook-instance/sagemaker-notebook-instance.component.ts:83.
Remediation: None

Requirement ID: 0.5 Platform Observability Standard
Status: PASS
Finding: Observability hooks detected around packages/components/sagemaker-notebook-instance/sagemaker-notebook-instance.component.ts:24.
Remediation: None

Requirement ID: 0.6 Platform Testing Standard
Status: FAIL
Finding: packages/components/sagemaker-notebook-instance/package.json lacks a Vitest dependency; tests still rely on Jest.
Remediation: Switch component tests to Vitest and add the vitest dependency per the platform testing standard.

Requirement ID: 0.7 Platform Capability Naming Standard
Status: FAIL
Finding: package.json is missing shinobi.capabilities metadata for sagemaker-notebook-instance
Remediation: Register at least one capability via registerCapability() and mirror it in package.json shinobi.capabilities to satisfy the binding vocabulary.

Requirement ID: 1.2 Constructor Signature
Status: PASS
Finding: Constructor matches required signature at packages/components/sagemaker-notebook-instance/sagemaker-notebook-instance.component.ts:33.
Remediation: None

Requirement ID: 1.5 Creator Pattern
Status: PASS
Finding: Creator implements IComponentCreator at packages/components/sagemaker-notebook-instance/sagemaker-notebook-instance.creator.ts:26 and exports configSchema (packages/components/sagemaker-notebook-instance/sagemaker-notebook-instance.creator.ts:68).
Remediation: None

Requirement ID: 1.6 Construct Registration
Status: PASS
Finding: Constructs registered (first occurrence packages/components/sagemaker-notebook-instance/sagemaker-notebook-instance.component.ts:65).
Remediation: None

Requirement ID: 1.7 Capability Registration
Status: PASS
Finding: Capabilities registered at packages/components/sagemaker-notebook-instance/sagemaker-notebook-instance.component.ts:76.
Remediation: None

Requirement ID: 2.5 Structured Logging Requirements
Status: PASS
Finding: Synth() uses try/catch with lifecycle logging (packages/components/sagemaker-notebook-instance/sagemaker-notebook-instance.component.ts:41).
Remediation: None

Requirement ID: 2.6 Compliance Framework Defaults
Status: PASS
Finding: Compliance defaults implemented at packages/components/sagemaker-notebook-instance/sagemaker-notebook-instance.builder.ts:319.
Remediation: None

Requirement ID: 2.7 OpenTelemetry Observability Requirements
Status: PASS
Finding: Observability hooks present near packages/components/sagemaker-notebook-instance/sagemaker-notebook-instance.component.ts:24.
Remediation: None

Requirement ID: 2.8 Feature Flags Integration
Status: FAIL
Finding: Neither the component code nor package metadata references platform feature flags for sagemaker-notebook-instance.
Remediation: Gate the component behind feature flags (OpenFeature integration + shinobi.featureFlags metadata).

Requirement ID: 2.10 Backstage Integration
Status: PASS
Finding: catalog-info.yaml present (packages/components/sagemaker-notebook-instance/catalog-info.yaml).
Remediation: None

Requirement ID: 3.3 Config.schema.json Requirement
Status: FAIL
Finding: Config.schema.json missing from packages/components/sagemaker-notebook-instance.
Remediation: Author Config.schema.json that matches the TypeScript config interface and export it from the builder.

Requirement ID: 3.5 Error Handling Patterns
Status: PASS
Finding: Synth() wraps logic in try/catch at packages/components/sagemaker-notebook-instance/sagemaker-notebook-instance.component.ts:41.
Remediation: None

Requirement ID: 4.1 Test Framework
Status: FAIL
Finding: packages/components/sagemaker-notebook-instance/package.json lacks a Vitest dependency; tests still rely on Jest.
Remediation: Switch component tests to Vitest and add the vitest dependency per the platform testing standard.

Requirement ID: 4.2 CDK-Nag Security Tests
Status: FAIL
Finding: Missing tests/security/cdk-nag.test.ts in packages/components/sagemaker-notebook-instance.
Remediation: Add CDK-Nag AwsSolutions tests covering all frameworks.

Requirement ID: 4.7 Test File Organization
Status: PASS
Finding: tests/ directory present.
Remediation: None

Requirement ID: 4.8 Component Versioning & Metadata
Status: FAIL
Finding: package.json lacks MAJOR.MINOR.PATCH version; CHANGELOG.md missing
Remediation: Set a semantic version in package.json and maintain CHANGELOG.md per governance policy.

Requirement ID: 4.9 Audit Files Requirements
Status: FAIL
Finding: Audit/ directory missing from packages/components/sagemaker-notebook-instance.
Remediation: Add Audit/README and component audit report to satisfy evidence requirements.

Requirement ID: V.1 TODO/Placeholder Sweep
Status: FAIL
Finding: Found TODO/placeholder code at packages/components/sagemaker-notebook-instance/sagemaker-notebook-instance.component.ts:138 → // For now, skip security group creation if VPC ID is not provided
Remediation: Resolve TODO/placeholder logic and replace vaporware sections with production-ready implementations/documentation.

## secrets-manager
Requirement ID: 0.1 Platform Component API Spec
Status: FAIL
Finding: class declaration at packages/components/secrets-manager/secrets-manager.component.ts does not extend BaseComponent
Remediation: Define a component class that extends BaseComponent and implements synth(), getCapabilities(), and getType() using the canonical constructor signature.

Requirement ID: 0.2 Platform Configuration Standard
Status: FAIL
Finding: getComplianceFrameworkDefaults() missing in packages/components/secrets-manager/secrets-manager.builder.ts
Remediation: Implement a ConfigBuilder subclass with getHardcodedFallbacks() and getComplianceFrameworkDefaults() to enforce the five-layer precedence chain.

Requirement ID: 0.3 Platform Tagging Standard
Status: PASS
Finding: applyStandardTags invoked (e.g., packages/components/secrets-manager/secrets-manager.component.ts:127).
Remediation: None

Requirement ID: 0.4 Platform Logging Standard
Status: PASS
Finding: Synth lifecycle logging present at packages/components/secrets-manager/secrets-manager.component.ts:39 and packages/components/secrets-manager/secrets-manager.component.ts:81.
Remediation: None

Requirement ID: 0.5 Platform Observability Standard
Status: PASS
Finding: Observability hooks detected around packages/components/secrets-manager/secrets-manager.component.ts:399.
Remediation: None

Requirement ID: 0.6 Platform Testing Standard
Status: FAIL
Finding: packages/components/secrets-manager/package.json lacks a Vitest dependency; tests still rely on Jest.
Remediation: Switch component tests to Vitest and add the vitest dependency per the platform testing standard.

Requirement ID: 0.7 Platform Capability Naming Standard
Status: FAIL
Finding: package.json is missing shinobi.capabilities metadata for secrets-manager
Remediation: Register at least one capability via registerCapability() and mirror it in package.json shinobi.capabilities to satisfy the binding vocabulary.

Requirement ID: 1.2 Constructor Signature
Status: PASS
Finding: Constructor matches required signature at packages/components/secrets-manager/secrets-manager.component.ts:34.
Remediation: None

Requirement ID: 1.5 Creator Pattern
Status: PASS
Finding: Creator implements IComponentCreator at packages/components/secrets-manager/secrets-manager.creator.ts:26 and exports configSchema (packages/components/secrets-manager/secrets-manager.creator.ts:66).
Remediation: None

Requirement ID: 1.6 Construct Registration
Status: PASS
Finding: Constructs registered (first occurrence packages/components/secrets-manager/secrets-manager.component.ts:65).
Remediation: None

Requirement ID: 1.7 Capability Registration
Status: PASS
Finding: Capabilities registered at packages/components/secrets-manager/secrets-manager.component.ts:74.
Remediation: None

Requirement ID: 2.5 Structured Logging Requirements
Status: PASS
Finding: Synth() uses try/catch with lifecycle logging (packages/components/secrets-manager/secrets-manager.component.ts:38).
Remediation: None

Requirement ID: 2.6 Compliance Framework Defaults
Status: FAIL
Finding: Builder packages/components/secrets-manager/secrets-manager.builder.ts lacks getComplianceFrameworkDefaults(), so FedRAMP tiers do not receive hardened defaults.
Remediation: Add getComplianceFrameworkDefaults() to the builder to inject framework-specific defaults (encryption, log retention, etc.).

Requirement ID: 2.7 OpenTelemetry Observability Requirements
Status: PASS
Finding: Observability hooks present near packages/components/secrets-manager/secrets-manager.component.ts:399.
Remediation: None

Requirement ID: 2.8 Feature Flags Integration
Status: FAIL
Finding: Neither the component code nor package metadata references platform feature flags for secrets-manager.
Remediation: Gate the component behind feature flags (OpenFeature integration + shinobi.featureFlags metadata).

Requirement ID: 2.10 Backstage Integration
Status: PASS
Finding: catalog-info.yaml present (packages/components/secrets-manager/catalog-info.yaml).
Remediation: None

Requirement ID: 3.3 Config.schema.json Requirement
Status: FAIL
Finding: Config.schema.json missing from packages/components/secrets-manager.
Remediation: Author Config.schema.json that matches the TypeScript config interface and export it from the builder.

Requirement ID: 3.5 Error Handling Patterns
Status: PASS
Finding: Synth() wraps logic in try/catch at packages/components/secrets-manager/secrets-manager.component.ts:38.
Remediation: None

Requirement ID: 4.1 Test Framework
Status: FAIL
Finding: packages/components/secrets-manager/package.json lacks a Vitest dependency; tests still rely on Jest.
Remediation: Switch component tests to Vitest and add the vitest dependency per the platform testing standard.

Requirement ID: 4.2 CDK-Nag Security Tests
Status: FAIL
Finding: Missing tests/security/cdk-nag.test.ts in packages/components/secrets-manager.
Remediation: Add CDK-Nag AwsSolutions tests covering all frameworks.

Requirement ID: 4.7 Test File Organization
Status: PASS
Finding: tests/ directory present.
Remediation: None

Requirement ID: 4.8 Component Versioning & Metadata
Status: FAIL
Finding: package.json lacks MAJOR.MINOR.PATCH version; CHANGELOG.md missing
Remediation: Set a semantic version in package.json and maintain CHANGELOG.md per governance policy.

Requirement ID: 4.9 Audit Files Requirements
Status: FAIL
Finding: Audit/ directory missing from packages/components/secrets-manager.
Remediation: Add Audit/README and component audit report to satisfy evidence requirements.

Requirement ID: V.1 TODO/Placeholder Sweep
Status: FAIL
Finding: Found TODO/placeholder code at packages/components/secrets-manager/secrets-manager.creator.ts:96 → // TODO: Add component-specific validations here
Remediation: Resolve TODO/placeholder logic and replace vaporware sections with production-ready implementations/documentation.

## security-group-import
Requirement ID: 0.1 Platform Component API Spec
Status: PASS
Finding: `SecurityGroupImportComponent` extends BaseComponent at packages/components/security-group-import/src/security-group-import.component.ts:21 with getCapabilities/getType defined at packages/components/security-group-import/src/security-group-import.component.ts:133 / packages/components/security-group-import/src/security-group-import.component.ts:168.
Remediation: None

Requirement ID: 0.2 Platform Configuration Standard
Status: FAIL
Finding: getComplianceFrameworkDefaults() missing in packages/components/security-group-import/src/security-group-import.builder.ts
Remediation: Implement a ConfigBuilder subclass with getHardcodedFallbacks() and getComplianceFrameworkDefaults() to enforce the five-layer precedence chain.

Requirement ID: 0.3 Platform Tagging Standard
Status: PASS
Finding: applyStandardTags invoked (e.g., packages/components/security-group-import/src/security-group-import.component.ts:40).
Remediation: None

Requirement ID: 0.4 Platform Logging Standard
Status: FAIL
Finding: Synth defined at packages/components/security-group-import/src/security-group-import.component.ts:160 lacks lifecycle logging: no logComponentEvent("synthesis_start") call; no logComponentEvent("synthesis_complete") call
Remediation: Emit logComponentEvent() entries at the start and end of synth() to satisfy logging standard.

Requirement ID: 0.5 Platform Observability Standard
Status: FAIL
Finding: No OpenTelemetry helpers or configureObservability() calls exist inside packages/components/security-group-import/src/security-group-import.component.ts.
Remediation: Wire the component into configureObservability()/OpenTelemetry so metrics/traces/logs conform to the observability standard.

Requirement ID: 0.6 Platform Testing Standard
Status: FAIL
Finding: packages/components/security-group-import/package.json lacks a Vitest dependency; tests still rely on Jest.
Remediation: Switch component tests to Vitest and add the vitest dependency per the platform testing standard.

Requirement ID: 0.7 Platform Capability Naming Standard
Status: FAIL
Finding: code in packages/components/security-group-import/src/security-group-import.component.ts never calls registerCapability(); package.json is missing shinobi.capabilities metadata for security-group-import
Remediation: Register at least one capability via registerCapability() and mirror it in package.json shinobi.capabilities to satisfy the binding vocabulary.

Requirement ID: 1.2 Constructor Signature
Status: PASS
Finding: Constructor matches required signature at packages/components/security-group-import/src/security-group-import.component.ts:26.
Remediation: None

Requirement ID: 1.5 Creator Pattern
Status: FAIL
Finding: packages/components/security-group-import/src/security-group-import.creator.ts missing configSchema export
Remediation: Implement an IComponentCreator with component metadata, configSchema reference, and create/process methods per the standard.

Requirement ID: 1.6 Construct Registration
Status: FAIL
Finding: Component packages/components/security-group-import/src/security-group-import.component.ts never calls registerConstruct(), so resources are not discoverable.
Remediation: Call registerConstruct() for each important construct created inside synth().

Requirement ID: 1.7 Capability Registration
Status: FAIL
Finding: registerCapability() is never invoked in packages/components/security-group-import/src/security-group-import.component.ts, so the component cannot advertise bindings.
Remediation: Emit at least one registerCapability() call that maps to the standard binder matrix.

Requirement ID: 2.5 Structured Logging Requirements
Status: FAIL
Finding: Synth at packages/components/security-group-import/src/security-group-import.component.ts:160 lacks structured logging: no try/catch around synth() logic; missing logComponentEvent("synthesis_start"); missing logComponentEvent("synthesis_complete")
Remediation: Wrap synth() in try/catch and log start/complete events using logComponentEvent().

Requirement ID: 2.6 Compliance Framework Defaults
Status: FAIL
Finding: Builder packages/components/security-group-import/src/security-group-import.builder.ts lacks getComplianceFrameworkDefaults(), so FedRAMP tiers do not receive hardened defaults.
Remediation: Add getComplianceFrameworkDefaults() to the builder to inject framework-specific defaults (encryption, log retention, etc.).

Requirement ID: 2.7 OpenTelemetry Observability Requirements
Status: FAIL
Finding: No OpenTelemetry or configureObservability calls found in packages/components/security-group-import/src/security-group-import.component.ts.
Remediation: Integrate configureObservability()/OpenTelemetry instrumentation and register observability capabilities.

Requirement ID: 2.8 Feature Flags Integration
Status: FAIL
Finding: Neither the component code nor package metadata references platform feature flags for security-group-import.
Remediation: Gate the component behind feature flags (OpenFeature integration + shinobi.featureFlags metadata).

Requirement ID: 2.10 Backstage Integration
Status: PASS
Finding: catalog-info.yaml present (packages/components/security-group-import/catalog-info.yaml).
Remediation: None

Requirement ID: 3.3 Config.schema.json Requirement
Status: FAIL
Finding: Config.schema.json missing from packages/components/security-group-import.
Remediation: Author Config.schema.json that matches the TypeScript config interface and export it from the builder.

Requirement ID: 3.5 Error Handling Patterns
Status: FAIL
Finding: Synth() body at packages/components/security-group-import/src/security-group-import.component.ts:160 lacks try/catch for structured error logging.
Remediation: Wrap synth() contents in try/catch and call logError() before rethrowing.

Requirement ID: 4.1 Test Framework
Status: FAIL
Finding: packages/components/security-group-import/package.json lacks a Vitest dependency; tests still rely on Jest.
Remediation: Switch component tests to Vitest and add the vitest dependency per the platform testing standard.

Requirement ID: 4.2 CDK-Nag Security Tests
Status: FAIL
Finding: Missing tests/security/cdk-nag.test.ts in packages/components/security-group-import.
Remediation: Add CDK-Nag AwsSolutions tests covering all frameworks.

Requirement ID: 4.7 Test File Organization
Status: PASS
Finding: tests/ directory present.
Remediation: None

Requirement ID: 4.8 Component Versioning & Metadata
Status: FAIL
Finding: CHANGELOG.md missing
Remediation: Set a semantic version in package.json and maintain CHANGELOG.md per governance policy.

Requirement ID: 4.9 Audit Files Requirements
Status: FAIL
Finding: Audit/ directory missing from packages/components/security-group-import.
Remediation: Add Audit/README and component audit report to satisfy evidence requirements.

Requirement ID: V.1 TODO/Placeholder Sweep
Status: FAIL
Finding: Found TODO/placeholder code at packages/components/security-group-import/src/security-group-import.component.ts:112 → // For now, we'll use a placeholder that would be provided by the platform
Remediation: Resolve TODO/placeholder logic and replace vaporware sections with production-ready implementations/documentation.

## sns-topic
Requirement ID: 0.1 Platform Component API Spec
Status: PASS
Finding: `SnsTopicComponent` extends BaseComponent at packages/components/sns-topic/sns-topic.component.ts:28 with getCapabilities/getType defined at packages/components/sns-topic/sns-topic.component.ts:83 / packages/components/sns-topic/sns-topic.component.ts:88.
Remediation: None

Requirement ID: 0.2 Platform Configuration Standard
Status: FAIL
Finding: getComplianceFrameworkDefaults() missing in packages/components/sns-topic/sns-topic.builder.ts
Remediation: Implement a ConfigBuilder subclass with getHardcodedFallbacks() and getComplianceFrameworkDefaults() to enforce the five-layer precedence chain.

Requirement ID: 0.3 Platform Tagging Standard
Status: PASS
Finding: applyStandardTags invoked (e.g., packages/components/sns-topic/sns-topic.component.ts:108).
Remediation: None

Requirement ID: 0.4 Platform Logging Standard
Status: PASS
Finding: Synth lifecycle logging present at packages/components/sns-topic/sns-topic.component.ts:40 and packages/components/sns-topic/sns-topic.component.ts:71.
Remediation: None

Requirement ID: 0.5 Platform Observability Standard
Status: PASS
Finding: Observability hooks detected around packages/components/sns-topic/sns-topic.component.ts:237.
Remediation: None

Requirement ID: 0.6 Platform Testing Standard
Status: FAIL
Finding: packages/components/sns-topic/package.json lacks a Vitest dependency; tests still rely on Jest.
Remediation: Switch component tests to Vitest and add the vitest dependency per the platform testing standard.

Requirement ID: 0.7 Platform Capability Naming Standard
Status: FAIL
Finding: package.json is missing shinobi.capabilities metadata for sns-topic
Remediation: Register at least one capability via registerCapability() and mirror it in package.json shinobi.capabilities to satisfy the binding vocabulary.

Requirement ID: 1.2 Constructor Signature
Status: PASS
Finding: Constructor matches required signature at packages/components/sns-topic/sns-topic.component.ts:35.
Remediation: None

Requirement ID: 1.5 Creator Pattern
Status: PASS
Finding: Creator implements IComponentCreator at packages/components/sns-topic/sns-topic.creator.ts:14 and exports configSchema (packages/components/sns-topic/sns-topic.creator.ts:21).
Remediation: None

Requirement ID: 1.6 Construct Registration
Status: PASS
Finding: Constructs registered (first occurrence packages/components/sns-topic/sns-topic.component.ts:58).
Remediation: None

Requirement ID: 1.7 Capability Registration
Status: PASS
Finding: Capabilities registered at packages/components/sns-topic/sns-topic.component.ts:69.
Remediation: None

Requirement ID: 2.5 Structured Logging Requirements
Status: PASS
Finding: Synth() uses try/catch with lifecycle logging (packages/components/sns-topic/sns-topic.component.ts:39).
Remediation: None

Requirement ID: 2.6 Compliance Framework Defaults
Status: FAIL
Finding: Builder packages/components/sns-topic/sns-topic.builder.ts lacks getComplianceFrameworkDefaults(), so FedRAMP tiers do not receive hardened defaults.
Remediation: Add getComplianceFrameworkDefaults() to the builder to inject framework-specific defaults (encryption, log retention, etc.).

Requirement ID: 2.7 OpenTelemetry Observability Requirements
Status: PASS
Finding: Observability hooks present near packages/components/sns-topic/sns-topic.component.ts:237.
Remediation: None

Requirement ID: 2.8 Feature Flags Integration
Status: FAIL
Finding: Neither the component code nor package metadata references platform feature flags for sns-topic.
Remediation: Gate the component behind feature flags (OpenFeature integration + shinobi.featureFlags metadata).

Requirement ID: 2.10 Backstage Integration
Status: PASS
Finding: catalog-info.yaml present (packages/components/sns-topic/catalog-info.yaml).
Remediation: None

Requirement ID: 3.3 Config.schema.json Requirement
Status: FAIL
Finding: Config.schema.json missing from packages/components/sns-topic.
Remediation: Author Config.schema.json that matches the TypeScript config interface and export it from the builder.

Requirement ID: 3.5 Error Handling Patterns
Status: PASS
Finding: Synth() wraps logic in try/catch at packages/components/sns-topic/sns-topic.component.ts:39.
Remediation: None

Requirement ID: 4.1 Test Framework
Status: FAIL
Finding: packages/components/sns-topic/package.json lacks a Vitest dependency; tests still rely on Jest.
Remediation: Switch component tests to Vitest and add the vitest dependency per the platform testing standard.

Requirement ID: 4.2 CDK-Nag Security Tests
Status: FAIL
Finding: Missing tests/security/cdk-nag.test.ts in packages/components/sns-topic.
Remediation: Add CDK-Nag AwsSolutions tests covering all frameworks.

Requirement ID: 4.7 Test File Organization
Status: PASS
Finding: tests/ directory present.
Remediation: None

Requirement ID: 4.8 Component Versioning & Metadata
Status: FAIL
Finding: CHANGELOG.md missing
Remediation: Set a semantic version in package.json and maintain CHANGELOG.md per governance policy.

Requirement ID: 4.9 Audit Files Requirements
Status: FAIL
Finding: Audit/ directory missing from packages/components/sns-topic.
Remediation: Add Audit/README and component audit report to satisfy evidence requirements.

Requirement ID: V.1 TODO/Placeholder Sweep
Status: PASS
Finding: No TODO/TBD/placeholder markers detected in component sources.
Remediation: None

## sqs-queue
Requirement ID: 0.1 Platform Component API Spec
Status: PASS
Finding: `SqsQueueNewComponent` extends BaseComponent at packages/components/sqs-queue/sqs-queue.component.ts:38 with getCapabilities/getType defined at packages/components/sqs-queue/sqs-queue.component.ts:210 / packages/components/sqs-queue/sqs-queue.component.ts:61.
Remediation: None

Requirement ID: 0.2 Platform Configuration Standard
Status: FAIL
Finding: builder class at packages/components/sqs-queue/src/sqs-queue.builder.ts does not extend ConfigBuilder; getHardcodedFallbacks() missing in packages/components/sqs-queue/src/sqs-queue.builder.ts; getComplianceFrameworkDefaults() missing in packages/components/sqs-queue/src/sqs-queue.builder.ts
Remediation: Implement a ConfigBuilder subclass with getHardcodedFallbacks() and getComplianceFrameworkDefaults() to enforce the five-layer precedence chain.

Requirement ID: 0.3 Platform Tagging Standard
Status: PASS
Finding: applyStandardTags invoked (e.g., packages/components/sqs-queue/sqs-queue.component.ts:96).
Remediation: None

Requirement ID: 0.4 Platform Logging Standard
Status: FAIL
Finding: Synth defined at packages/components/sqs-queue/sqs-queue.component.ts:76 lacks lifecycle logging: no logComponentEvent("synthesis_start") call; no logComponentEvent("synthesis_complete") call
Remediation: Emit logComponentEvent() entries at the start and end of synth() to satisfy logging standard.

Requirement ID: 0.5 Platform Observability Standard
Status: PASS
Finding: Observability hooks detected around packages/components/sqs-queue/sqs-queue.component.ts:35.
Remediation: None

Requirement ID: 0.6 Platform Testing Standard
Status: FAIL
Finding: packages/components/sqs-queue/package.json lacks a Vitest dependency; tests still rely on Jest.
Remediation: Switch component tests to Vitest and add the vitest dependency per the platform testing standard.

Requirement ID: 0.7 Platform Capability Naming Standard
Status: FAIL
Finding: package.json is missing shinobi.capabilities metadata for sqs-queue
Remediation: Register at least one capability via registerCapability() and mirror it in package.json shinobi.capabilities to satisfy the binding vocabulary.

Requirement ID: 1.2 Constructor Signature
Status: FAIL
Finding: Constructor in packages/components/sqs-queue/sqs-queue.component.ts does not use the canonical (scope, id, context, spec) signature.
Remediation: Align the constructor with the canonical signature and call super().

Requirement ID: 1.5 Creator Pattern
Status: PASS
Finding: Creator implements IComponentCreator at packages/components/sqs-queue/sqs-queue.creator.ts:30 and exports configSchema (packages/components/sqs-queue/sqs-queue.creator.ts:70).
Remediation: None

Requirement ID: 1.6 Construct Registration
Status: PASS
Finding: Constructs registered (first occurrence packages/components/sqs-queue/sqs-queue.component.ts:99).
Remediation: None

Requirement ID: 1.7 Capability Registration
Status: PASS
Finding: Capabilities registered at packages/components/sqs-queue/sqs-queue.component.ts:203.
Remediation: None

Requirement ID: 2.5 Structured Logging Requirements
Status: FAIL
Finding: Synth at packages/components/sqs-queue/sqs-queue.component.ts:76 lacks structured logging: no try/catch around synth() logic; missing logComponentEvent("synthesis_start"); missing logComponentEvent("synthesis_complete")
Remediation: Wrap synth() in try/catch and log start/complete events using logComponentEvent().

Requirement ID: 2.6 Compliance Framework Defaults
Status: FAIL
Finding: Builder packages/components/sqs-queue/src/sqs-queue.builder.ts lacks getComplianceFrameworkDefaults(), so FedRAMP tiers do not receive hardened defaults.
Remediation: Add getComplianceFrameworkDefaults() to the builder to inject framework-specific defaults (encryption, log retention, etc.).

Requirement ID: 2.7 OpenTelemetry Observability Requirements
Status: PASS
Finding: Observability hooks present near packages/components/sqs-queue/sqs-queue.component.ts:35.
Remediation: None

Requirement ID: 2.8 Feature Flags Integration
Status: FAIL
Finding: Neither the component code nor package metadata references platform feature flags for sqs-queue.
Remediation: Gate the component behind feature flags (OpenFeature integration + shinobi.featureFlags metadata).

Requirement ID: 2.10 Backstage Integration
Status: PASS
Finding: catalog-info.yaml present (packages/components/sqs-queue/catalog-info.yaml).
Remediation: None

Requirement ID: 3.3 Config.schema.json Requirement
Status: FAIL
Finding: Config.schema.json missing from packages/components/sqs-queue.
Remediation: Author Config.schema.json that matches the TypeScript config interface and export it from the builder.

Requirement ID: 3.5 Error Handling Patterns
Status: FAIL
Finding: Synth() body at packages/components/sqs-queue/sqs-queue.component.ts:76 lacks try/catch for structured error logging.
Remediation: Wrap synth() contents in try/catch and call logError() before rethrowing.

Requirement ID: 4.1 Test Framework
Status: FAIL
Finding: packages/components/sqs-queue/package.json lacks a Vitest dependency; tests still rely on Jest.
Remediation: Switch component tests to Vitest and add the vitest dependency per the platform testing standard.

Requirement ID: 4.2 CDK-Nag Security Tests
Status: FAIL
Finding: Missing tests/security/cdk-nag.test.ts in packages/components/sqs-queue.
Remediation: Add CDK-Nag AwsSolutions tests covering all frameworks.

Requirement ID: 4.7 Test File Organization
Status: PASS
Finding: tests/ directory present.
Remediation: None

Requirement ID: 4.8 Component Versioning & Metadata
Status: FAIL
Finding: CHANGELOG.md missing
Remediation: Set a semantic version in package.json and maintain CHANGELOG.md per governance policy.

Requirement ID: 4.9 Audit Files Requirements
Status: FAIL
Finding: Audit/ directory missing from packages/components/sqs-queue.
Remediation: Add Audit/README and component audit report to satisfy evidence requirements.

Requirement ID: V.1 TODO/Placeholder Sweep
Status: FAIL
Finding: Found TODO/placeholder code at packages/components/sqs-queue/sqs-queue.creator.ts:100 → // TODO: Add component-specific validations here
Remediation: Resolve TODO/placeholder logic and replace vaporware sections with production-ready implementations/documentation.

## ssm-parameter
Requirement ID: 0.1 Platform Component API Spec
Status: PASS
Finding: `SsmParameterComponent` extends BaseComponent at packages/components/ssm-parameter/ssm-parameter.component.ts:22 with getCapabilities/getType defined at packages/components/ssm-parameter/ssm-parameter.component.ts:57 / packages/components/ssm-parameter/ssm-parameter.component.ts:62.
Remediation: None

Requirement ID: 0.2 Platform Configuration Standard
Status: FAIL
Finding: getComplianceFrameworkDefaults() missing in packages/components/ssm-parameter/ssm-parameter.builder.ts
Remediation: Implement a ConfigBuilder subclass with getHardcodedFallbacks() and getComplianceFrameworkDefaults() to enforce the five-layer precedence chain.

Requirement ID: 0.3 Platform Tagging Standard
Status: PASS
Finding: applyStandardTags invoked (e.g., packages/components/ssm-parameter/ssm-parameter.component.ts:93).
Remediation: None

Requirement ID: 0.4 Platform Logging Standard
Status: FAIL
Finding: Synth defined at packages/components/ssm-parameter/ssm-parameter.component.ts:31 lacks lifecycle logging: no logComponentEvent("synthesis_start") call
Remediation: Emit logComponentEvent() entries at the start and end of synth() to satisfy logging standard.

Requirement ID: 0.5 Platform Observability Standard
Status: FAIL
Finding: No OpenTelemetry helpers or configureObservability() calls exist inside packages/components/ssm-parameter/ssm-parameter.component.ts.
Remediation: Wire the component into configureObservability()/OpenTelemetry so metrics/traces/logs conform to the observability standard.

Requirement ID: 0.6 Platform Testing Standard
Status: FAIL
Finding: packages/components/ssm-parameter/package.json lacks a Vitest dependency; tests still rely on Jest.
Remediation: Switch component tests to Vitest and add the vitest dependency per the platform testing standard.

Requirement ID: 0.7 Platform Capability Naming Standard
Status: FAIL
Finding: package.json is missing shinobi.capabilities metadata for ssm-parameter
Remediation: Register at least one capability via registerCapability() and mirror it in package.json shinobi.capabilities to satisfy the binding vocabulary.

Requirement ID: 1.2 Constructor Signature
Status: PASS
Finding: Constructor matches required signature at packages/components/ssm-parameter/ssm-parameter.component.ts:27.
Remediation: None

Requirement ID: 1.5 Creator Pattern
Status: PASS
Finding: Creator implements IComponentCreator at packages/components/ssm-parameter/ssm-parameter.creator.ts:15 and exports configSchema (packages/components/ssm-parameter/ssm-parameter.creator.ts:22).
Remediation: None

Requirement ID: 1.6 Construct Registration
Status: PASS
Finding: Constructs registered (first occurrence packages/components/ssm-parameter/ssm-parameter.component.ts:161).
Remediation: None

Requirement ID: 1.7 Capability Registration
Status: PASS
Finding: Capabilities registered at packages/components/ssm-parameter/ssm-parameter.component.ts:174.
Remediation: None

Requirement ID: 2.5 Structured Logging Requirements
Status: FAIL
Finding: Synth at packages/components/ssm-parameter/ssm-parameter.component.ts:31 lacks structured logging: no try/catch around synth() logic; missing logComponentEvent("synthesis_start")
Remediation: Wrap synth() in try/catch and log start/complete events using logComponentEvent().

Requirement ID: 2.6 Compliance Framework Defaults
Status: FAIL
Finding: Builder packages/components/ssm-parameter/ssm-parameter.builder.ts lacks getComplianceFrameworkDefaults(), so FedRAMP tiers do not receive hardened defaults.
Remediation: Add getComplianceFrameworkDefaults() to the builder to inject framework-specific defaults (encryption, log retention, etc.).

Requirement ID: 2.7 OpenTelemetry Observability Requirements
Status: FAIL
Finding: No OpenTelemetry or configureObservability calls found in packages/components/ssm-parameter/ssm-parameter.component.ts.
Remediation: Integrate configureObservability()/OpenTelemetry instrumentation and register observability capabilities.

Requirement ID: 2.8 Feature Flags Integration
Status: FAIL
Finding: Neither the component code nor package metadata references platform feature flags for ssm-parameter.
Remediation: Gate the component behind feature flags (OpenFeature integration + shinobi.featureFlags metadata).

Requirement ID: 2.10 Backstage Integration
Status: PASS
Finding: catalog-info.yaml present (packages/components/ssm-parameter/catalog-info.yaml).
Remediation: None

Requirement ID: 3.3 Config.schema.json Requirement
Status: FAIL
Finding: Config.schema.json missing from packages/components/ssm-parameter.
Remediation: Author Config.schema.json that matches the TypeScript config interface and export it from the builder.

Requirement ID: 3.5 Error Handling Patterns
Status: FAIL
Finding: Synth() body at packages/components/ssm-parameter/ssm-parameter.component.ts:31 lacks try/catch for structured error logging.
Remediation: Wrap synth() contents in try/catch and call logError() before rethrowing.

Requirement ID: 4.1 Test Framework
Status: FAIL
Finding: packages/components/ssm-parameter/package.json lacks a Vitest dependency; tests still rely on Jest.
Remediation: Switch component tests to Vitest and add the vitest dependency per the platform testing standard.

Requirement ID: 4.2 CDK-Nag Security Tests
Status: FAIL
Finding: Missing tests/security/cdk-nag.test.ts in packages/components/ssm-parameter.
Remediation: Add CDK-Nag AwsSolutions tests covering all frameworks.

Requirement ID: 4.7 Test File Organization
Status: PASS
Finding: tests/ directory present.
Remediation: None

Requirement ID: 4.8 Component Versioning & Metadata
Status: FAIL
Finding: CHANGELOG.md missing
Remediation: Set a semantic version in package.json and maintain CHANGELOG.md per governance policy.

Requirement ID: 4.9 Audit Files Requirements
Status: FAIL
Finding: Audit/ directory missing from packages/components/ssm-parameter.
Remediation: Add Audit/README and component audit report to satisfy evidence requirements.

Requirement ID: V.1 TODO/Placeholder Sweep
Status: PASS
Finding: No TODO/TBD/placeholder markers detected in component sources.
Remediation: None

## static-website
Requirement ID: 0.1 Platform Component API Spec
Status: PASS
Finding: `StaticWebsiteComponent` extends BaseComponent at packages/components/static-website/static-website.component.ts:34 with getCapabilities/getType defined at packages/components/static-website/static-website.component.ts:115 / packages/components/static-website/static-website.component.ts:51.
Remediation: None

Requirement ID: 0.2 Platform Configuration Standard
Status: FAIL
Finding: getComplianceFrameworkDefaults() missing in packages/components/static-website/static-website.builder.ts
Remediation: Implement a ConfigBuilder subclass with getHardcodedFallbacks() and getComplianceFrameworkDefaults() to enforce the five-layer precedence chain.

Requirement ID: 0.3 Platform Tagging Standard
Status: PASS
Finding: applyStandardTags invoked (e.g., packages/components/static-website/static-website.component.ts:70).
Remediation: None

Requirement ID: 0.4 Platform Logging Standard
Status: FAIL
Finding: Synth defined at packages/components/static-website/static-website.component.ts:48 lacks lifecycle logging: no logComponentEvent("synthesis_start") call; no logComponentEvent("synthesis_complete") call
Remediation: Emit logComponentEvent() entries at the start and end of synth() to satisfy logging standard.

Requirement ID: 0.5 Platform Observability Standard
Status: FAIL
Finding: No OpenTelemetry helpers or configureObservability() calls exist inside packages/components/static-website/static-website.component.ts.
Remediation: Wire the component into configureObservability()/OpenTelemetry so metrics/traces/logs conform to the observability standard.

Requirement ID: 0.6 Platform Testing Standard
Status: FAIL
Finding: packages/components/static-website/package.json lacks a Vitest dependency; tests still rely on Jest.
Remediation: Switch component tests to Vitest and add the vitest dependency per the platform testing standard.

Requirement ID: 0.7 Platform Capability Naming Standard
Status: FAIL
Finding: package.json is missing shinobi.capabilities metadata for static-website
Remediation: Register at least one capability via registerCapability() and mirror it in package.json shinobi.capabilities to satisfy the binding vocabulary.

Requirement ID: 1.2 Constructor Signature
Status: PASS
Finding: Constructor matches required signature at packages/components/static-website/static-website.component.ts:44.
Remediation: None

Requirement ID: 1.5 Creator Pattern
Status: PASS
Finding: Creator implements IComponentCreator at packages/components/static-website/static-website.creator.ts:26 and exports configSchema (packages/components/static-website/static-website.creator.ts:67).
Remediation: None

Requirement ID: 1.6 Construct Registration
Status: PASS
Finding: Constructs registered (first occurrence packages/components/static-website/static-website.component.ts:88).
Remediation: None

Requirement ID: 1.7 Capability Registration
Status: PASS
Finding: Capabilities registered at packages/components/static-website/static-website.component.ts:98.
Remediation: None

Requirement ID: 2.5 Structured Logging Requirements
Status: FAIL
Finding: Synth at packages/components/static-website/static-website.component.ts:48 lacks structured logging: missing logComponentEvent("synthesis_start"); missing logComponentEvent("synthesis_complete")
Remediation: Wrap synth() in try/catch and log start/complete events using logComponentEvent().

Requirement ID: 2.6 Compliance Framework Defaults
Status: FAIL
Finding: Builder packages/components/static-website/static-website.builder.ts lacks getComplianceFrameworkDefaults(), so FedRAMP tiers do not receive hardened defaults.
Remediation: Add getComplianceFrameworkDefaults() to the builder to inject framework-specific defaults (encryption, log retention, etc.).

Requirement ID: 2.7 OpenTelemetry Observability Requirements
Status: FAIL
Finding: No OpenTelemetry or configureObservability calls found in packages/components/static-website/static-website.component.ts.
Remediation: Integrate configureObservability()/OpenTelemetry instrumentation and register observability capabilities.

Requirement ID: 2.8 Feature Flags Integration
Status: FAIL
Finding: Neither the component code nor package metadata references platform feature flags for static-website.
Remediation: Gate the component behind feature flags (OpenFeature integration + shinobi.featureFlags metadata).

Requirement ID: 2.10 Backstage Integration
Status: PASS
Finding: catalog-info.yaml present (packages/components/static-website/catalog-info.yaml).
Remediation: None

Requirement ID: 3.3 Config.schema.json Requirement
Status: FAIL
Finding: Config.schema.json missing from packages/components/static-website.
Remediation: Author Config.schema.json that matches the TypeScript config interface and export it from the builder.

Requirement ID: 3.5 Error Handling Patterns
Status: PASS
Finding: Synth() wraps logic in try/catch at packages/components/static-website/static-website.component.ts:48.
Remediation: None

Requirement ID: 4.1 Test Framework
Status: FAIL
Finding: packages/components/static-website/package.json lacks a Vitest dependency; tests still rely on Jest.
Remediation: Switch component tests to Vitest and add the vitest dependency per the platform testing standard.

Requirement ID: 4.2 CDK-Nag Security Tests
Status: FAIL
Finding: Missing tests/security/cdk-nag.test.ts in packages/components/static-website.
Remediation: Add CDK-Nag AwsSolutions tests covering all frameworks.

Requirement ID: 4.7 Test File Organization
Status: PASS
Finding: tests/ directory present.
Remediation: None

Requirement ID: 4.8 Component Versioning & Metadata
Status: FAIL
Finding: package.json lacks MAJOR.MINOR.PATCH version; CHANGELOG.md missing
Remediation: Set a semantic version in package.json and maintain CHANGELOG.md per governance policy.

Requirement ID: 4.9 Audit Files Requirements
Status: FAIL
Finding: Audit/ directory missing from packages/components/static-website.
Remediation: Add Audit/README and component audit report to satisfy evidence requirements.

Requirement ID: V.1 TODO/Placeholder Sweep
Status: PASS
Finding: No TODO/TBD/placeholder markers detected in component sources.
Remediation: None

## step-functions-statemachine
Requirement ID: 0.1 Platform Component API Spec
Status: PASS
Finding: `StepFunctionsStateMachineComponent` extends BaseComponent at packages/components/step-functions-statemachine/step-functions-statemachine.component.ts:27 with getCapabilities/getType defined at packages/components/step-functions-statemachine/step-functions-statemachine.component.ts:86 / packages/components/step-functions-statemachine/step-functions-statemachine.component.ts:39.
Remediation: None

Requirement ID: 0.2 Platform Configuration Standard
Status: PASS
Finding: Config builder at packages/components/step-functions-statemachine/step-functions-statemachine.builder.ts:180 derives from ConfigBuilder and implements both hardcoded fallbacks and compliance defaults.
Remediation: None

Requirement ID: 0.3 Platform Tagging Standard
Status: PASS
Finding: applyStandardTags invoked (e.g., packages/components/step-functions-statemachine/step-functions-statemachine.component.ts:57).
Remediation: None

Requirement ID: 0.4 Platform Logging Standard
Status: FAIL
Finding: Synth defined at packages/components/step-functions-statemachine/step-functions-statemachine.component.ts:36 lacks lifecycle logging: no logComponentEvent("synthesis_start") call; no logComponentEvent("synthesis_complete") call
Remediation: Emit logComponentEvent() entries at the start and end of synth() to satisfy logging standard.

Requirement ID: 0.5 Platform Observability Standard
Status: FAIL
Finding: No OpenTelemetry helpers or configureObservability() calls exist inside packages/components/step-functions-statemachine/step-functions-statemachine.component.ts.
Remediation: Wire the component into configureObservability()/OpenTelemetry so metrics/traces/logs conform to the observability standard.

Requirement ID: 0.6 Platform Testing Standard
Status: FAIL
Finding: packages/components/step-functions-statemachine/package.json lacks a Vitest dependency; tests still rely on Jest.
Remediation: Switch component tests to Vitest and add the vitest dependency per the platform testing standard.

Requirement ID: 0.7 Platform Capability Naming Standard
Status: FAIL
Finding: package.json is missing shinobi.capabilities metadata for step-functions-statemachine
Remediation: Register at least one capability via registerCapability() and mirror it in package.json shinobi.capabilities to satisfy the binding vocabulary.

Requirement ID: 1.2 Constructor Signature
Status: PASS
Finding: Constructor matches required signature at packages/components/step-functions-statemachine/step-functions-statemachine.component.ts:32.
Remediation: None

Requirement ID: 1.5 Creator Pattern
Status: PASS
Finding: Creator implements IComponentCreator at packages/components/step-functions-statemachine/step-functions-statemachine.creator.ts:26 and exports configSchema (packages/components/step-functions-statemachine/step-functions-statemachine.creator.ts:66).
Remediation: None

Requirement ID: 1.6 Construct Registration
Status: PASS
Finding: Constructs registered (first occurrence packages/components/step-functions-statemachine/step-functions-statemachine.component.ts:63).
Remediation: None

Requirement ID: 1.7 Capability Registration
Status: PASS
Finding: Capabilities registered at packages/components/step-functions-statemachine/step-functions-statemachine.component.ts:67.
Remediation: None

Requirement ID: 2.5 Structured Logging Requirements
Status: FAIL
Finding: Synth at packages/components/step-functions-statemachine/step-functions-statemachine.component.ts:36 lacks structured logging: missing logComponentEvent("synthesis_start"); missing logComponentEvent("synthesis_complete")
Remediation: Wrap synth() in try/catch and log start/complete events using logComponentEvent().

Requirement ID: 2.6 Compliance Framework Defaults
Status: PASS
Finding: Compliance defaults implemented at packages/components/step-functions-statemachine/step-functions-statemachine.builder.ts:212.
Remediation: None

Requirement ID: 2.7 OpenTelemetry Observability Requirements
Status: FAIL
Finding: No OpenTelemetry or configureObservability calls found in packages/components/step-functions-statemachine/step-functions-statemachine.component.ts.
Remediation: Integrate configureObservability()/OpenTelemetry instrumentation and register observability capabilities.

Requirement ID: 2.8 Feature Flags Integration
Status: FAIL
Finding: Neither the component code nor package metadata references platform feature flags for step-functions-statemachine.
Remediation: Gate the component behind feature flags (OpenFeature integration + shinobi.featureFlags metadata).

Requirement ID: 2.10 Backstage Integration
Status: PASS
Finding: catalog-info.yaml present (packages/components/step-functions-statemachine/catalog-info.yaml).
Remediation: None

Requirement ID: 3.3 Config.schema.json Requirement
Status: FAIL
Finding: Config.schema.json missing from packages/components/step-functions-statemachine.
Remediation: Author Config.schema.json that matches the TypeScript config interface and export it from the builder.

Requirement ID: 3.5 Error Handling Patterns
Status: PASS
Finding: Synth() wraps logic in try/catch at packages/components/step-functions-statemachine/step-functions-statemachine.component.ts:36.
Remediation: None

Requirement ID: 4.1 Test Framework
Status: FAIL
Finding: packages/components/step-functions-statemachine/package.json lacks a Vitest dependency; tests still rely on Jest.
Remediation: Switch component tests to Vitest and add the vitest dependency per the platform testing standard.

Requirement ID: 4.2 CDK-Nag Security Tests
Status: FAIL
Finding: Missing tests/security/cdk-nag.test.ts in packages/components/step-functions-statemachine.
Remediation: Add CDK-Nag AwsSolutions tests covering all frameworks.

Requirement ID: 4.7 Test File Organization
Status: PASS
Finding: tests/ directory present.
Remediation: None

Requirement ID: 4.8 Component Versioning & Metadata
Status: FAIL
Finding: package.json lacks MAJOR.MINOR.PATCH version; CHANGELOG.md missing
Remediation: Set a semantic version in package.json and maintain CHANGELOG.md per governance policy.

Requirement ID: 4.9 Audit Files Requirements
Status: FAIL
Finding: Audit/ directory missing from packages/components/step-functions-statemachine.
Remediation: Add Audit/README and component audit report to satisfy evidence requirements.

Requirement ID: V.1 TODO/Placeholder Sweep
Status: PASS
Finding: No TODO/TBD/placeholder markers detected in component sources.
Remediation: None

## vpc
Requirement ID: 0.1 Platform Component API Spec
Status: PASS
Finding: `VpcComponent` extends BaseComponent at packages/components/vpc/vpc.component.ts:21 with getCapabilities/getType defined at packages/components/vpc/vpc.component.ts:75 / packages/components/vpc/vpc.component.ts:83.
Remediation: None

Requirement ID: 0.2 Platform Configuration Standard
Status: FAIL
Finding: getComplianceFrameworkDefaults() missing in packages/components/vpc/vpc.builder.ts
Remediation: Implement a ConfigBuilder subclass with getHardcodedFallbacks() and getComplianceFrameworkDefaults() to enforce the five-layer precedence chain.

Requirement ID: 0.3 Platform Tagging Standard
Status: PASS
Finding: applyStandardTags invoked (e.g., packages/components/vpc/vpc.component.ts:57).
Remediation: None

Requirement ID: 0.4 Platform Logging Standard
Status: FAIL
Finding: Synth defined at packages/components/vpc/vpc.component.ts:37 lacks lifecycle logging: no logComponentEvent("synthesis_start") call; no logComponentEvent("synthesis_complete") call
Remediation: Emit logComponentEvent() entries at the start and end of synth() to satisfy logging standard.

Requirement ID: 0.5 Platform Observability Standard
Status: FAIL
Finding: No OpenTelemetry helpers or configureObservability() calls exist inside packages/components/vpc/vpc.component.ts.
Remediation: Wire the component into configureObservability()/OpenTelemetry so metrics/traces/logs conform to the observability standard.

Requirement ID: 0.6 Platform Testing Standard
Status: FAIL
Finding: packages/components/vpc/package.json lacks a Vitest dependency; tests still rely on Jest.
Remediation: Switch component tests to Vitest and add the vitest dependency per the platform testing standard.

Requirement ID: 0.7 Platform Capability Naming Standard
Status: FAIL
Finding: package.json is missing shinobi.capabilities metadata for vpc
Remediation: Register at least one capability via registerCapability() and mirror it in package.json shinobi.capabilities to satisfy the binding vocabulary.

Requirement ID: 1.2 Constructor Signature
Status: PASS
Finding: Constructor matches required signature at packages/components/vpc/vpc.component.ts:28.
Remediation: None

Requirement ID: 1.5 Creator Pattern
Status: PASS
Finding: Creator implements IComponentCreator at packages/components/vpc/vpc.creator.ts:26 and exports configSchema (packages/components/vpc/vpc.creator.ts:70).
Remediation: None

Requirement ID: 1.6 Construct Registration
Status: PASS
Finding: Constructs registered (first occurrence packages/components/vpc/vpc.component.ts:60).
Remediation: None

Requirement ID: 1.7 Capability Registration
Status: PASS
Finding: Capabilities registered at packages/components/vpc/vpc.component.ts:485.
Remediation: None

Requirement ID: 2.5 Structured Logging Requirements
Status: FAIL
Finding: Synth at packages/components/vpc/vpc.component.ts:37 lacks structured logging: missing logComponentEvent("synthesis_start"); missing logComponentEvent("synthesis_complete")
Remediation: Wrap synth() in try/catch and log start/complete events using logComponentEvent().

Requirement ID: 2.6 Compliance Framework Defaults
Status: FAIL
Finding: Builder packages/components/vpc/vpc.builder.ts lacks getComplianceFrameworkDefaults(), so FedRAMP tiers do not receive hardened defaults.
Remediation: Add getComplianceFrameworkDefaults() to the builder to inject framework-specific defaults (encryption, log retention, etc.).

Requirement ID: 2.7 OpenTelemetry Observability Requirements
Status: FAIL
Finding: No OpenTelemetry or configureObservability calls found in packages/components/vpc/vpc.component.ts.
Remediation: Integrate configureObservability()/OpenTelemetry instrumentation and register observability capabilities.

Requirement ID: 2.8 Feature Flags Integration
Status: FAIL
Finding: Neither the component code nor package metadata references platform feature flags for vpc.
Remediation: Gate the component behind feature flags (OpenFeature integration + shinobi.featureFlags metadata).

Requirement ID: 2.10 Backstage Integration
Status: PASS
Finding: catalog-info.yaml present (packages/components/vpc/catalog-info.yaml).
Remediation: None

Requirement ID: 3.3 Config.schema.json Requirement
Status: FAIL
Finding: Config.schema.json missing from packages/components/vpc.
Remediation: Author Config.schema.json that matches the TypeScript config interface and export it from the builder.

Requirement ID: 3.5 Error Handling Patterns
Status: PASS
Finding: Synth() wraps logic in try/catch at packages/components/vpc/vpc.component.ts:37.
Remediation: None

Requirement ID: 4.1 Test Framework
Status: FAIL
Finding: packages/components/vpc/package.json lacks a Vitest dependency; tests still rely on Jest.
Remediation: Switch component tests to Vitest and add the vitest dependency per the platform testing standard.

Requirement ID: 4.2 CDK-Nag Security Tests
Status: FAIL
Finding: Missing tests/security/cdk-nag.test.ts in packages/components/vpc.
Remediation: Add CDK-Nag AwsSolutions tests covering all frameworks.

Requirement ID: 4.7 Test File Organization
Status: PASS
Finding: tests/ directory present.
Remediation: None

Requirement ID: 4.8 Component Versioning & Metadata
Status: FAIL
Finding: CHANGELOG.md missing
Remediation: Set a semantic version in package.json and maintain CHANGELOG.md per governance policy.

Requirement ID: 4.9 Audit Files Requirements
Status: PASS
Finding: Audit/ documentation present.
Remediation: None

Requirement ID: V.1 TODO/Placeholder Sweep
Status: FAIL
Finding: Found TODO/placeholder code at packages/components/vpc/vpc.creator.ts:123 → // TODO: Add production-specific validations
Remediation: Resolve TODO/placeholder logic and replace vaporware sections with production-ready implementations/documentation.

## waf-web-acl
Requirement ID: 0.1 Platform Component API Spec
Status: PASS
Finding: `WafWebAclComponent` extends BaseComponent at packages/components/waf-web-acl/waf-web-acl.component.ts:25 with getCapabilities/getType defined at packages/components/waf-web-acl/waf-web-acl.component.ts:68 / packages/components/waf-web-acl/waf-web-acl.component.ts:36.
Remediation: None

Requirement ID: 0.2 Platform Configuration Standard
Status: FAIL
Finding: getComplianceFrameworkDefaults() missing in packages/components/waf-web-acl/waf-web-acl.builder.ts
Remediation: Implement a ConfigBuilder subclass with getHardcodedFallbacks() and getComplianceFrameworkDefaults() to enforce the five-layer precedence chain.

Requirement ID: 0.3 Platform Tagging Standard
Status: PASS
Finding: applyStandardTags invoked (e.g., packages/components/waf-web-acl/waf-web-acl.component.ts:87).
Remediation: None

Requirement ID: 0.4 Platform Logging Standard
Status: FAIL
Finding: Synth defined at packages/components/waf-web-acl/waf-web-acl.component.ts:40 lacks lifecycle logging: no logComponentEvent("synthesis_start") call
Remediation: Emit logComponentEvent() entries at the start and end of synth() to satisfy logging standard.

Requirement ID: 0.5 Platform Observability Standard
Status: FAIL
Finding: No OpenTelemetry helpers or configureObservability() calls exist inside packages/components/waf-web-acl/waf-web-acl.component.ts.
Remediation: Wire the component into configureObservability()/OpenTelemetry so metrics/traces/logs conform to the observability standard.

Requirement ID: 0.6 Platform Testing Standard
Status: FAIL
Finding: packages/components/waf-web-acl/package.json lacks a Vitest dependency; tests still rely on Jest.
Remediation: Switch component tests to Vitest and add the vitest dependency per the platform testing standard.

Requirement ID: 0.7 Platform Capability Naming Standard
Status: FAIL
Finding: package.json is missing shinobi.capabilities metadata for waf-web-acl
Remediation: Register at least one capability via registerCapability() and mirror it in package.json shinobi.capabilities to satisfy the binding vocabulary.

Requirement ID: 1.2 Constructor Signature
Status: PASS
Finding: Constructor matches required signature at packages/components/waf-web-acl/waf-web-acl.component.ts:32.
Remediation: None

Requirement ID: 1.5 Creator Pattern
Status: PASS
Finding: Creator implements IComponentCreator at packages/components/waf-web-acl/waf-web-acl.creator.ts:15 and exports configSchema (packages/components/waf-web-acl/waf-web-acl.creator.ts:22).
Remediation: None

Requirement ID: 1.6 Construct Registration
Status: PASS
Finding: Constructs registered (first occurrence packages/components/waf-web-acl/waf-web-acl.component.ts:216).
Remediation: None

Requirement ID: 1.7 Capability Registration
Status: PASS
Finding: Capabilities registered at packages/components/waf-web-acl/waf-web-acl.component.ts:233.
Remediation: None

Requirement ID: 2.5 Structured Logging Requirements
Status: FAIL
Finding: Synth at packages/components/waf-web-acl/waf-web-acl.component.ts:40 lacks structured logging: no try/catch around synth() logic; missing logComponentEvent("synthesis_start")
Remediation: Wrap synth() in try/catch and log start/complete events using logComponentEvent().

Requirement ID: 2.6 Compliance Framework Defaults
Status: FAIL
Finding: Builder packages/components/waf-web-acl/waf-web-acl.builder.ts lacks getComplianceFrameworkDefaults(), so FedRAMP tiers do not receive hardened defaults.
Remediation: Add getComplianceFrameworkDefaults() to the builder to inject framework-specific defaults (encryption, log retention, etc.).

Requirement ID: 2.7 OpenTelemetry Observability Requirements
Status: FAIL
Finding: No OpenTelemetry or configureObservability calls found in packages/components/waf-web-acl/waf-web-acl.component.ts.
Remediation: Integrate configureObservability()/OpenTelemetry instrumentation and register observability capabilities.

Requirement ID: 2.8 Feature Flags Integration
Status: FAIL
Finding: Neither the component code nor package metadata references platform feature flags for waf-web-acl.
Remediation: Gate the component behind feature flags (OpenFeature integration + shinobi.featureFlags metadata).

Requirement ID: 2.10 Backstage Integration
Status: PASS
Finding: catalog-info.yaml present (packages/components/waf-web-acl/catalog-info.yaml).
Remediation: None

Requirement ID: 3.3 Config.schema.json Requirement
Status: FAIL
Finding: Config.schema.json missing from packages/components/waf-web-acl.
Remediation: Author Config.schema.json that matches the TypeScript config interface and export it from the builder.

Requirement ID: 3.5 Error Handling Patterns
Status: FAIL
Finding: Synth() body at packages/components/waf-web-acl/waf-web-acl.component.ts:40 lacks try/catch for structured error logging.
Remediation: Wrap synth() contents in try/catch and call logError() before rethrowing.

Requirement ID: 4.1 Test Framework
Status: FAIL
Finding: packages/components/waf-web-acl/package.json lacks a Vitest dependency; tests still rely on Jest.
Remediation: Switch component tests to Vitest and add the vitest dependency per the platform testing standard.

Requirement ID: 4.2 CDK-Nag Security Tests
Status: FAIL
Finding: Missing tests/security/cdk-nag.test.ts in packages/components/waf-web-acl.
Remediation: Add CDK-Nag AwsSolutions tests covering all frameworks.

Requirement ID: 4.7 Test File Organization
Status: PASS
Finding: tests/ directory present.
Remediation: None

Requirement ID: 4.8 Component Versioning & Metadata
Status: FAIL
Finding: CHANGELOG.md missing
Remediation: Set a semantic version in package.json and maintain CHANGELOG.md per governance policy.

Requirement ID: 4.9 Audit Files Requirements
Status: PASS
Finding: Audit/ documentation present.
Remediation: None

Requirement ID: V.1 TODO/Placeholder Sweep
Status: PASS
Finding: No TODO/TBD/placeholder markers detected in component sources.
Remediation: None
