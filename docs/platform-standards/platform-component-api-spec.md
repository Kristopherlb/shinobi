Platform Component API Contract
Version: 1.1 (Revised with AI Agent Instructions)
Status: Published
Last Updated: September 9, 2025
1. Overview & Vision
This document defines the definitive technical contract for all components within the platform ecosystem. It is composed of two primary artifacts:
The IComponent Interface: A lean, public contract that defines what it means to be a component.
The BaseComponent Abstract Class: A rich, feature-packed implementation helper that all concrete components MUST extend.
The vision is to provide a consistent, secure, and predictable foundation that allows human developers and AI Coding Agents to contribute high-quality, compliant components to the platform's library.
2. Intended Audience
Audience
Information Needs
Platform Engineers
A clear contract and a set of reusable helpers for building new components.
AI Coding Agent (Platform Contributor)
[LABELED] A detailed, machine-readable prompt with explicit instructions and guardrails for generating a new, fully compliant platform component from scratch.

3. The IComponent Public Interface
This is the lean, minimal contract that high-level orchestrators like the ResolverEngine and Platform Services depend on.
// Located in: @platform/contracts
import { Construct, IConstruct } from 'constructs';
import { ComponentSpec, ComponentContext, ComponentCapabilities } from './';

export interface IComponent extends IConstruct {
  /** The component's specification from the service manifest. */
  readonly spec: ComponentSpec;
  
  /** The context of the service this component belongs to. */
  readonly context: ComponentContext;

  /** The core synthesis method. */
  synth(): void;

  /** Returns the machine-readable capabilities of the component. */
  getCapabilities(): ComponentCapabilities;

  /** Returns the component's unique type identifier. */
  getType(): string;

  /** Retrieves a handle to a synthesized CDK construct. */
  getConstruct(handle: string): IConstruct | undefined;
}


4. The BaseComponent Abstract Class
This is the mandatory parent class for all concrete components. It provides a rich set of concrete helper methods that automatically enforce our platform-wide standards for tagging, logging, observability, and compliance.
// Located in: @platform/core
import { Construct, IConstruct } from 'constructs';
import { IComponent, /* ... */ } from '@platform/contracts';

export abstract class BaseComponent extends Construct implements IComponent {
  // --- Abstract methods to be implemented by concrete components ---
  public abstract synth(): void;
  public abstract getType(): string;
  
  // --- Concrete methods and helpers provided by the base class ---
  protected _applyStandardTags(construct: IConstruct, customTags?: {}): void;
  protected _createKmsKeyIfNeeded(purpose: string): kms.Key | undefined;
  protected _registerConstruct(handle: string, construct: IConstruct): void;
  protected _registerCapability(key: string, data: any): void;
  // ... and many more
}

5. [LABELED] AI Agent Instructions: Generating a New Component
System Prompt: "You are an expert Platform Engineer for an Internal Developer Platform built on the AWS CDK. Your task is to generate a new, production-grade, and fully compliant L3 component for the platform's library. You MUST adhere to all of the following instructions, contracts, and standards precisely."
User Prompt Example: "Generate a new platform component for AWS ElastiCache Redis."
AI Agent Generation Workflow:
Step 1: Scaffold Files
You MUST generate a complete, self-contained component package within the monorepo at packages/components/<package-name>/. This includes the following key files:
src/index.ts
src/<component-name>.component.ts (The main component class)
src/<component-name>.builder.ts (The ConfigBuilder, its interface, and its schema)
src/<component-name>.creator.ts (The ComponentCreator factory)
tests/unit/component.test.ts (Unit tests for the component's synthesis logic)
tests/unit/builder.test.ts (Unit tests for the ConfigBuilder's precedence logic)
README.md
package.json
Step 2: Implement the Component Class (...component.ts)
The component class is the core of the implementation. It MUST adhere to the following structure:
It MUST extend BaseComponent.
The synth() method MUST be the central orchestrator and follow this exact sequence:
Instantiate and use the component's dedicated ConfigBuilder to produce the final, merged config object.
Call any necessary protected helper methods from the BaseComponent (e.g., _createKmsKeyIfNeeded).
Instantiate the necessary native AWS CDK L2 constructs (e.g., new s3.Bucket(...)).
Call the inherited _applyStandardTags() helper method on every taggable resource you create.
Call the inherited _registerConstruct() method to store handles to the key L2 constructs (a handle named main is mandatory).
Call the inherited _registerCapability() method to expose the component's outputs according to the "Platform Capability Naming Standard."
Step 3: Implement the Config Builder & Schema (...builder.ts)
This file defines the component's developer-facing API.
You MUST define a comprehensive TypeScript interface for the component's configuration (e.g., ElastiCacheRedisConfig).
You MUST create a comprehensive JSON Schema that provides a 100% complete representation of this interface, including all properties, nested objects, types, descriptions, and sane defaults.
The ConfigBuilder class MUST extends ConfigBuilder<MyComponentConfigInterface>.
Its only required methods are getHardcodedFallbacks() and getComplianceFrameworkDefaults(), where you MUST provide the ultra-safe baseline and the compliance-specific default values. You MUST NOT implement the buildSync() or merging logic; this is inherited.
Step 4: Implement the Creator Class (...creator.ts)
This class makes the component discoverable by the platform.
You MUST create a ...Creator class that implements the IComponentCreator interface.
It MUST implement the createComponent factory method.
It SHOULD implement the validateSpec method to provide early, fail-fast validation of the developer's manifest config that cannot be expressed in the JSON Schema alone.
Step 5: Implement the Unit Tests (...test.ts)
You MUST generate a comprehensive suite of unit tests that provides at least 90% code coverage. The test suite is the "Definition of Done" for the component and MUST include specific test cases for the following:
Builder Tests (builder.test.ts):
A test for each compliance framework (commercial, fedramp-moderate, fedramp-high) that asserts the correct defaults are applied.
A test that validates the full 5-layer precedence chain, proving that a component override wins over an environment default, which wins over a platform default.
Component Synthesis Tests (component.test.ts):
A test for the default "happy path" synthesis in a commercial environment.
A specific test for each compliance framework that asserts the correct hardening logic is applied (e.g., asserts that a CMK is created, that log retention is correctly configured, or that specific IAM policies are attached).
All tests MUST use the aws-cdk-lib/assertions library (Template.fromStack) to validate the properties of the synthesized CloudFormation resources.
Step 6: Implement the README.md
You MUST generate a README.md file for the component package. It MUST include:
A clear description of what the component does.
A complete service.yml manifest example showing how to use the component with its most common configuration.
A detailed Markdown reference table for all properties in the component's config schema, generated from the JSON Schema's description fields.
A list of the capabilities the component provides for binding.
A list of the construct handles the component registers for the patches.ts escape hatch.

