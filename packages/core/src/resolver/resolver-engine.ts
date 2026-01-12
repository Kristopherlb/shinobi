/**
 * The Resolver & Synthesis Engine
 * Core orchestrator for translating validated configuration into CDK constructs
 */

import { Logger as PlatformLogger } from '../platform/logger/src/index.js';
import { ComponentFactoryBuilder, type IComponentFactory } from '../platform/contracts/components/component-factory.js';
import { IComponent } from '../platform/contracts/index.js';
import { ComponentContext as FactoryComponentContext } from '../platform/contracts/components/component-context.js';
import { Component } from '../platform/contracts/component.js';
import { UnifiedBinderRegistry } from '../platform/binders/registry/unified-binder-registry.js';
import type { BindingContext, EnhancedBindingResult, BindingDirective } from '../platform/contracts/platform-binding-trigger-spec.js';
import { DirectiveSchemaValidator } from '../platform/contracts/directive-schema-validator.js';
import { SecurityGroupRulePostProcessor } from './security-group-rule-post-processor.js';
import { EventSourceScanner } from './event-source-scanner.js';
import { IamPolicyPostProcessor } from './iam-policy-post-processor.js';
import * as cdk from 'aws-cdk-lib';
import * as fs from 'node:fs';
import * as path from 'node:path';

export interface ResolverEngineDependencies {
  logger: PlatformLogger;
  binderRegistry: UnifiedBinderRegistry;
  /**
   * Optional component factory override.
   *
   * This is primarily used by tests to avoid the default "empty registry" factory builder,
   * and by future platform wiring to provide a fully-registered factory.
   */
  componentFactory?: IComponentFactory;
}

export interface SynthesisResult {
  app: cdk.App;
  stacks: cdk.Stack[];
  components: IComponent[];
  bindings: Array<{
    source: string;
    target: string;
    capability: string;
    result: EnhancedBindingResult;
  }>;
  patchesApplied: boolean;
  synthesisTime: number;
}

/**
 * The heart of the platform's infrastructure generation logic
 * Orchestrates the complete two-phase process of synthesizing and binding components
 */
export class ResolverEngine {
  constructor(private dependencies: ResolverEngineDependencies) {
  }

  /**
   * Safe binder registry lookup.
   *
   * Some callers may inject partial or older registry implementations.
   * We prefer findStrategyForBinding(sourceType, capability) but fall back to findStrategy(capability).
   */
  private findStrategyForBindingSafe(
    sourceType: string,
    capability: string
  ): IUnifiedBinderStrategy | null {
    const registry = this.dependencies.binderRegistry as unknown as {
      findStrategyForBinding?: (s: string, c: string) => IUnifiedBinderStrategy | null;
      findStrategy?: (c: string) => IUnifiedBinderStrategy | null;
    };

    if (typeof registry.findStrategyForBinding === 'function') {
      return registry.findStrategyForBinding(sourceType, capability);
    }

    if (typeof registry.findStrategy === 'function') {
      return registry.findStrategy(capability);
    }

    return null;
  }

  /**
   * Main orchestration method - transforms validated config to CDK App
   * Executes all 5 phases in strict sequential order
   */
  async synthesize(validatedConfig: any): Promise<SynthesisResult> {
    const startTime = Date.now();
    this.dependencies.logger.debug('Starting Resolver & Synthesis Engine');

    try {
      // Create CDK App and Stack
      const app = new cdk.App();
      const stack = new cdk.Stack(app, `${validatedConfig.service}-stack`, {
        env: {
          account: process.env.CDK_DEFAULT_ACCOUNT,
          region: process.env.CDK_DEFAULT_REGION || 'us-east-1'
        },
        tags: {
          Service: validatedConfig.service,
          Owner: validatedConfig.owner,
          Environment: process.env.NODE_ENV || 'dev'
        }
      });

      // Phase 1: Component Instantiation (AC-RS1.1, AC-RS1.2, AC-RS1.3)
      const components = await this.instantiateComponents(validatedConfig, stack);

      // Phase 1.5: Identify components with event sources and their targets
      // This helps us synthesize in the correct order
      const eventSourceInfo = this.analyzeEventSourceDependencies(components);

      // Phase 2: Synthesis in two passes
      // Pass 1: Synthesize target components (components that are referenced but don't have event sources)
      // Pass 2: Process event source bindings and apply IAM policies
      // Pass 3: Synthesize source components (components with event sources)
      const outputsMap = await this.synthesizeComponentsWithEventSources(
        components,
        eventSourceInfo,
        validatedConfig,
        stack
      );

      // Phase 3: Binding (AC-RS3.1, AC-RS3.2)
      // Note: Event source bindings are already processed in Phase 1.5, so they're excluded here
      const bindings = await this.bindComponents(components, outputsMap, validatedConfig, eventSourceInfo);

      // Phase 3.5: Security Group Rule Post-Processing (SG-006)
      // Apply securityGroupRules from binding results to target security groups
      const sgRuleResult = SecurityGroupRulePostProcessor.process(
        bindings, 
        stack, 
        components,
        validatedConfig.service
      );
      this.dependencies.logger.info(
        `Security Group Rules: ${sgRuleResult.rulesApplied} applied, ` +
        `${sgRuleResult.securityGroupsAffected} SGs affected, ` +
        `${sgRuleResult.crossStackRules} cross-stack rules deferred, ` +
        `${sgRuleResult.rulesRemoved} rules removed`
      );

      // Phase 3.6: IAM Policy Post-Processing
      // Apply IAM policies from binding results to Lambda execution roles
      const iamPolicyResult = IamPolicyPostProcessor.process(
        bindings,
        stack,
        components,
        this.dependencies.logger
      );
      this.dependencies.logger.info(
        `IAM Policies: ${iamPolicyResult.policiesApplied} applied, ` +
        `${iamPolicyResult.lambdaFunctionsAffected} Lambda functions affected`
      );

      // Phase 4: Patching (AC-RS4.1, AC-RS4.2)
      const patchesApplied = await this.applyPatches(stack, components, validatedConfig);

      // Phase 5: Final Assembly (AC-RS5.1)
      const synthesisTime = Date.now() - startTime;

      this.dependencies.logger.info(`Synthesis completed in ${synthesisTime}ms`);
      this.dependencies.logger.info(`  Components: ${components.length}`);
      this.dependencies.logger.info(`  Bindings: ${bindings.length}`);
      this.dependencies.logger.info(`  Patches Applied: ${patchesApplied}`);

      return {
        app,
        stacks: [stack],
        components,
        bindings,
        patchesApplied,
        synthesisTime
      };

    } catch (error) {
      this.dependencies.logger.error('Synthesis failed:', error);
      throw error;
    }
  }

  /**
   * Phase 1: Component Instantiation
   * Uses Factory Method pattern to create all required components
   */
  private async instantiateComponents(validatedConfig: any, stack: cdk.Stack): Promise<IComponent[]> {
    this.dependencies.logger.debug('Phase 1: Component Instantiation');

    // AC-RS1.2: Use canonical ComponentFactoryBuilder unless a factory is injected
    const factory = this.dependencies.componentFactory ?? new ComponentFactoryBuilder().build();
    this.dependencies.logger.info(
      this.dependencies.componentFactory
        ? 'Using injected component factory'
        : 'Using canonical component factory'
    );

    const components: IComponent[] = [];

    // AC-RS1.3: Iterate through components array and instantiate via Factory Method
    if (validatedConfig.components && Array.isArray(validatedConfig.components)) {
      for (const componentSpec of validatedConfig.components) {
        const context: FactoryComponentContext = {
          serviceName: validatedConfig.service,
          environment: process.env.NODE_ENV || 'dev',
          complianceFramework: (validatedConfig.complianceFramework || 'commercial') as any,
          region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
          accountId: process.env.CDK_DEFAULT_ACCOUNT || '123456789012',
          metadata: { scope: stack }
        };

        try {
          const component = factory.create(componentSpec.type, context, componentSpec);
          components.push(component);

          this.dependencies.logger.debug(`Instantiated component: ${componentSpec.name} (${componentSpec.type})`);
        } catch (error) {
          throw new Error(`Failed to instantiate component '${componentSpec.name}': ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    }

    this.dependencies.logger.info(`Instantiated ${components.length} components`);
    return components;
  }

  /**
   * Phase 1.5: Analyze Event Source Dependencies
   * Identifies which components have event sources and which are targets
   * Returns info needed to synthesize in the correct order
   */
  private analyzeEventSourceDependencies(components: IComponent[]): {
    hasEventSources: Set<string>;
    targets: Set<string>;
    dependencies: Map<string, string[]>;
  } {
    const hasEventSources = new Set<string>();
    const targets = new Set<string>();
    const dependencies = new Map<string, string[]>();

    for (const component of components) {
      const eventSources = component.spec.config?.eventSources;
      if (eventSources) {
        let autoBind = true;
        let eventSourcesArray: any[] = [];

        if (Array.isArray(eventSources)) {
          eventSourcesArray = eventSources;
        } else if (typeof eventSources === 'object' && eventSources.sources) {
          autoBind = eventSources.autoBind !== false;
          eventSourcesArray = eventSources.sources || [];
        }

        if (autoBind && eventSourcesArray.length > 0) {
          hasEventSources.add(component.spec.name);
          const deps: string[] = [];

          for (const eventSource of eventSourcesArray) {
            if (eventSource.type === 'sqs' && eventSource.queueArn?.startsWith('@component:')) {
              const targetName = eventSource.queueArn.replace('@component:', '');
              targets.add(targetName);
              deps.push(targetName);
            }
          }

          if (deps.length > 0) {
            dependencies.set(component.spec.name, deps);
          }
        }
      }
    }

    return { hasEventSources, targets, dependencies };
  }

  /**
   * Phase 2: Synthesis with Event Source Handling
   * Synthesizes components in the correct order to ensure IAM permissions exist before EventSourceMapping is created
   * 
   * Order:
   * 1. Synthesize target components (components that are targets but don't have event sources)
   * 2. Process event source bindings and apply IAM policies
   * 3. Synthesize source components (components with event sources)
   */
  private async synthesizeComponentsWithEventSources(
    components: IComponent[],
    eventSourceInfo: { hasEventSources: Set<string>; targets: Set<string>; dependencies: Map<string, string[]> },
    validatedConfig: any,
    stack: cdk.Stack
  ): Promise<Map<string, any>> {
    this.dependencies.logger.debug('Phase 2: Component Synthesis (with event source handling)');

    const outputsMap = new Map<string, any>();

    // Step 1: Synthesize target components first (components that are targets but don't have event sources)
    const targetComponents = components.filter(c => 
      eventSourceInfo.targets.has(c.spec.name) && !eventSourceInfo.hasEventSources.has(c.spec.name)
    );
    const sourceComponents = components.filter(c => eventSourceInfo.hasEventSources.has(c.spec.name));
    const otherComponents = components.filter(c => 
      !eventSourceInfo.targets.has(c.spec.name) && !eventSourceInfo.hasEventSources.has(c.spec.name)
    );

    // Synthesize target components
    for (const component of targetComponents) {
      await this.synthesizeComponent(component, outputsMap);
    }

    // Synthesize other components (no event sources, not targets)
    for (const component of otherComponents) {
      await this.synthesizeComponent(component, outputsMap);
    }

    // Step 2: Process event source bindings and apply IAM policies BEFORE synthesizing source components
    if (sourceComponents.length > 0) {
      await this.processEventSourceBindingsAndApplyPolicies(
        sourceComponents,
        components,
        outputsMap,
        validatedConfig,
        stack
      );
    }

    // Step 3: Synthesize source components (components with event sources) - permissions now exist
    for (const component of sourceComponents) {
      await this.synthesizeComponent(component, outputsMap);
    }

    this.dependencies.logger.info(`Synthesized ${components.length} components with capabilities`);
    return outputsMap;
  }

  /**
   * Helper: Synthesize a single component
   */
  private async synthesizeComponent(component: IComponent, outputsMap: Map<string, any>): Promise<void> {
    try {
      // AC-RS2.2: Call synth() method - triggers Builder pattern within component
      const synthesizedConstruct = component.synth();

      // AC-RS2.3: Collect capability outputs for binding phase
      const capabilities = component.getCapabilities();
      outputsMap.set(component.spec.name, {
        construct: synthesizedConstruct,
        capabilities: capabilities,
        component: component
      });

      this.dependencies.logger.debug(`Synthesized component: ${component.spec.name}`);

      // Log capability details for debugging
      Object.keys(capabilities).forEach(capabilityKey => {
        this.dependencies.logger.debug(`  Capability: ${capabilityKey}`, { data: capabilities[capabilityKey] });
      });

    } catch (error) {
      throw new Error(`Failed to synthesize component '${component.spec.name}': ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Legacy helper used by unit tests:
   * Synthesize a list of components in-order and return an outputs map.
   *
   * NOTE: The full engine path uses `synthesizeComponentsWithEventSources()` to handle
   * event-source ordering. This helper is intentionally simple for deterministic tests.
   */
  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  private async synthesizeComponents(components: IComponent[]): Promise<Map<string, any>> {
    const outputsMap = new Map<string, any>();
    for (const component of components) {
      await this.synthesizeComponent(component, outputsMap);
    }
    return outputsMap;
  }

  /**
   * Process event source bindings and apply IAM policies to Lambda functions
   * This MUST happen AFTER target components are synthesized (so we have capabilities)
   * but BEFORE source components are synthesized (so permissions exist when EventSourceMapping is created)
   */
  private async processEventSourceBindingsAndApplyPolicies(
    sourceComponents: IComponent[],
    allComponents: IComponent[],
    outputsMap: Map<string, any>,
    validatedConfig: any,
    stack: cdk.Stack
  ): Promise<void> {
    this.dependencies.logger.debug('Processing event source bindings and applying IAM policies');

    // Step 1: Scan event sources and generate implicit bindings
    const implicitBindings = EventSourceScanner.scanEventSourcesForBindings(sourceComponents, this.dependencies.logger);
    this.dependencies.logger.debug(`Auto-generated ${implicitBindings.length} event source bindings`);

    if (implicitBindings.length === 0) {
      return;
    }

    // Step 2: Process bindings through binder system (we now have target capabilities)
    const bindings: Array<{ source: string; target: string; capability: string; result: EnhancedBindingResult }> = [];
    const implicitBindingMap = new Map<string, BindingDirective[]>();

    for (const implicitBinding of implicitBindings) {
      const sourceComponentName = EventSourceScanner.getSourceComponentName(implicitBinding);
      if (!sourceComponentName) {
        continue;
      }

      if (!implicitBindingMap.has(sourceComponentName)) {
        implicitBindingMap.set(sourceComponentName, []);
      }

      const cleanBinding = EventSourceScanner.stripInternalFields(implicitBinding);
      implicitBindingMap.get(sourceComponentName)!.push(cleanBinding);
    }

    // Process bindings for components with event sources
    for (const component of sourceComponents) {
      const autoGeneratedBinds = implicitBindingMap.get(component.spec.name) || [];
      if (autoGeneratedBinds.length === 0) {
        continue;
      }

      for (const bindDirective of autoGeneratedBinds) {
        try {
          // Resolve target component (should be in outputsMap since we synthesized targets first)
          const target = this.resolveTarget(bindDirective, outputsMap);
          if (!target) {
            this.dependencies.logger.warn(`Cannot resolve binding target for event source: ${JSON.stringify(bindDirective)}`);
            continue;
          }

          // Validate directive
          let validatedDirective: typeof bindDirective;
          try {
            validatedDirective = DirectiveSchemaValidator.validate(bindDirective, bindDirective.capability);
          } catch (error) {
            this.dependencies.logger.warn(`Directive validation failed for event source binding: ${error instanceof Error ? error.message : 'Unknown error'}`);
            continue;
          }

          // Find strategy
          const strategy = this.findStrategyForBindingSafe(
            component.getType(),
            validatedDirective.capability
          );

          if (!strategy) {
            this.dependencies.logger.warn(
              `No strategy found for event source binding: ${validatedDirective.capability} from ${component.getType()}`
            );
            continue;
          }

          // Create binding context
          const bindingContext: BindingContext = {
            source: component,
            target: target.component,
            directive: validatedDirective,
            environment: process.env.NODE_ENV || 'dev',
            complianceFramework: validatedConfig.complianceFramework || 'commercial'
          };

          // Execute binding
          const result = await strategy.bind(bindingContext);

          bindings.push({
            source: component.spec.name,
            target: target.component.spec.name,
            capability: validatedDirective.capability,
            result: result
          });
        } catch (error) {
          this.dependencies.logger.warn(`Failed to process event source binding: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    }

    // Step 3: Store IAM policies for application during source component synthesis
    // Store policies by component name so components can access them during synthesis
    // Components will apply these policies when creating Lambda functions, BEFORE creating EventSourceMapping
    const eventSourceIamPolicies = new Map<string, any[]>();
    for (const binding of bindings) {
      if (!binding.result.iamPolicies || binding.result.iamPolicies.length === 0) {
        continue;
      }

      const existing = eventSourceIamPolicies.get(binding.source) || [];
      eventSourceIamPolicies.set(binding.source, [...existing, ...binding.result.iamPolicies]);
    }

    // Store policies on stack for components to access during synthesis
    // This is a temporary mechanism - in the future, we should pass policies through a cleaner interface
    (stack as any)._eventSourceIamPolicies = eventSourceIamPolicies;

    this.dependencies.logger.info(
      `Processed ${bindings.length} event source bindings, generated IAM policies for ${eventSourceIamPolicies.size} components`
    );
  }

  /**
   * Phase 3: Binding
   * Resolves component bindings using unified binder strategies
   * Note: Event source bindings are processed in Phase 1.5, so they're excluded here
   * @param eventSourceInfo - Event source dependency info (used to exclude event source bindings)
   */
  private async bindComponents(
    components: IComponent[],
    outputsMap: Map<string, any>,
    validatedConfig: any,
    eventSourceInfo?: { hasEventSources: Set<string>; targets: Set<string>; dependencies: Map<string, string[]> }
  ): Promise<Array<{ source: string; target: string; capability: string; result: EnhancedBindingResult }>> {
    this.dependencies.logger.debug('Phase 3: Component Binding');

    const bindings: Array<{ source: string; target: string; capability: string; result: EnhancedBindingResult }> = [];
    const envVarRegistry = new Map<string, { value: string; source: string; target: string }>();
    const iamPolicyRegistry = new Map<string, { actions: Set<string>; effects: Set<string> }>();

    this.validateBindingGraph(components, outputsMap);

    // Skip auto-generating bindings from event sources if they were already processed in Phase 1.5
    // Event source bindings are processed earlier to ensure IAM policies exist before EventSourceMapping is created
    let implicitBindings: ReturnType<typeof EventSourceScanner.scanEventSourcesForBindings> = [];
    if (!eventSourceInfo || eventSourceInfo.hasEventSources.size === 0) {
      // No event sources, scan normally (for backwards compatibility)
      implicitBindings = EventSourceScanner.scanEventSourcesForBindings(components, this.dependencies.logger);
      this.dependencies.logger.debug(`Auto-generated ${implicitBindings.length} bindings from event sources`);
    } else {
      // Event sources exist - they were already processed in Phase 1.5, skip here
      this.dependencies.logger.debug(`Skipping event source binding scan (already processed in Phase 1.5 for ${eventSourceInfo.hasEventSources.size} components)`);
    }

    // Process auto-generated bindings from event sources
    // These are synthetic bindings created by the scanner
    // The scanner uses Symbol for internal source component name tracking
    const implicitBindingMap = new Map<string, BindingDirective[]>();
    for (const implicitBinding of implicitBindings) {
      // Extract source component name from the binding (using internal Symbol)
      const sourceComponentName = EventSourceScanner.getSourceComponentName(implicitBinding);
      if (!sourceComponentName) {
        continue;
      }

      if (!implicitBindingMap.has(sourceComponentName)) {
        implicitBindingMap.set(sourceComponentName, []);
      }

      // Remove internal Symbol fields before adding to map
      const cleanBinding = EventSourceScanner.stripInternalFields(implicitBinding);
      implicitBindingMap.get(sourceComponentName)!.push(cleanBinding);
    }

    // AC-RS3.1: Iterate through components that have binds directive
    // Process both explicit binds and auto-generated bindings
    // Note: Event source bindings are excluded if they were already processed in Phase 1.5
    for (const component of components) {
      const explicitBinds = component.spec.binds || [];
      
      // Only include auto-generated bindings if event sources weren't already processed
      // Event source bindings are processed in Phase 1.5 to ensure IAM policies exist before EventSourceMapping
      const autoGeneratedBinds = (eventSourceInfo && eventSourceInfo.hasEventSources.has(component.spec.name))
        ? [] // Skip event source bindings - already processed in Phase 1.5
        : (implicitBindingMap.get(component.spec.name) || []); // Include other auto-generated bindings
      
      const allBinds = [...explicitBinds, ...autoGeneratedBinds];

      if (allBinds.length === 0) {
        continue;
      }

      for (const bindDirective of allBinds) {
        try {
          // AC-RS3.2: Resolve target component and execute binding
          const target = this.resolveTarget(bindDirective, outputsMap);

          if (!target) {
            throw new Error(`Cannot resolve binding target for directive: ${JSON.stringify(bindDirective)}`);
          }

          // SECURITY: Validate directive before binding execution
          // This prevents injection attacks through directive.options and directive.env
          let validatedDirective: typeof bindDirective;
          try {
            validatedDirective = DirectiveSchemaValidator.validate(bindDirective, bindDirective.capability);
          } catch (error) {
            if (error instanceof Error && error.name === 'DirectiveValidationError') {
              const targetLabel = bindDirective.to
                ? bindDirective.to
                : (bindDirective.select ? 'selector' : 'unknown');
              throw new Error(
                `Directive validation failed for binding ${component.spec.name} -> ${targetLabel}: ${error.message}`
              );
            }
            throw error;
          }

          // Find strategy that can handle this binding
          const strategy = this.findStrategyForBindingSafe(
            component.getType(),
            validatedDirective.capability
          );

          if (!strategy) {
            throw new Error(
              `No unified strategy found for capability '${validatedDirective.capability}' ` +
              `from source type '${component.getType()}'`
            );
          }

          // Create binding context for unified strategy
          const bindingContext: BindingContext = {
            source: component,
            target: target.component,
            directive: validatedDirective,
            environment: process.env.NODE_ENV || 'dev',
            complianceFramework: validatedConfig.complianceFramework || 'commercial'
          };

          // Execute binding with mandatory compliance enforcement
          const result = await strategy.bind(bindingContext);

          bindings.push({
            source: component.spec.name,
            target: target.component.spec.name,
            capability: validatedDirective.capability,
            result: result
          });

          this.trackEnvironmentVariables(
            result.environmentVariables,
            {
              source: component.spec.name,
              target: target.component.spec.name,
              capability: validatedDirective.capability
            },
            envVarRegistry
          );

          this.trackIamPolicies(
            result.iamPolicies,
            {
              source: component.spec.name,
              target: target.component.spec.name,
              capability: validatedDirective.capability
            },
            iamPolicyRegistry
          );

          this.dependencies.logger.debug(
            `Bound ${component.spec.name} -> ${target.component.spec.name} (${validatedDirective.capability}) ` +
            `[Compliance: ${result.compliance.status}]`
          );

        } catch (error) {
          // Use bindDirective in error message since validatedDirective may not be assigned if validation failed
          const targetDesc = bindDirective.to || (bindDirective.select ? 'selector' : 'unknown');
          throw new Error(
            `Failed to bind ${component.spec.name} -> ${targetDesc}: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        }
      }
    }

    this.dependencies.logger.info(`Applied ${bindings.length} component bindings`);
    return bindings;
  }

  private validateBindingGraph(components: IComponent[], outputsMap: Map<string, any>): void {
    const adjacency = new Map<string, string[]>();

    for (const component of components) {
      const edges: string[] = [];
      const binds = component.spec.binds;
      if (binds && Array.isArray(binds)) {
        for (const bind of binds) {
          const target = this.resolveTarget(bind, outputsMap);
          if (!target) {
            throw new Error(`Cannot resolve binding target for directive: ${JSON.stringify(bind)}`);
          }
          edges.push(target.component.spec.name);
        }
      }
      adjacency.set(component.spec.name, edges);
    }

    const visited = new Set<string>();
    const inStack = new Set<string>();
    const path: string[] = [];

    const visit = (node: string) => {
      visited.add(node);
      inStack.add(node);
      path.push(node);

      for (const neighbor of adjacency.get(node) ?? []) {
        if (!visited.has(neighbor)) {
          visit(neighbor);
        } else if (inStack.has(neighbor)) {
          const cycleStartIndex = path.indexOf(neighbor);
          const cyclePath = path.slice(cycleStartIndex).concat(neighbor);
          throw new Error(`Circular binding dependency detected: ${cyclePath.join(' -> ')}`);
        }
      }

      path.pop();
      inStack.delete(node);
    };

    for (const node of adjacency.keys()) {
      if (!visited.has(node)) {
        visit(node);
      }
    }
  }

  private trackEnvironmentVariables(
    environmentVariables: Record<string, string>,
    binding: { source: string; target: string; capability: string },
    registry: Map<string, { value: string; source: string; target: string }>
  ): void {
    for (const [key, value] of Object.entries(environmentVariables ?? {})) {
      if (registry.has(key)) {
        const existing = registry.get(key)!;
        if (existing.value !== value) {
          this.dependencies.logger.warn(
            `Environment variable conflict for ${key}: ` +
            `${existing.source} -> ${existing.target} (${existing.value}) ` +
            `overwritten by ${binding.source} -> ${binding.target} (${value}).`
          );
        }
      }

      registry.set(key, { value, source: binding.source, target: binding.target });
    }
  }

  private trackIamPolicies(
    iamPolicies: Array<{ statement: any }>,
    binding: { source: string; target: string; capability: string },
    registry: Map<string, { actions: Set<string>; effects: Set<string> }>
  ): void {
    for (const policy of iamPolicies ?? []) {
      const statementJson = policy.statement.toStatementJson();
      const actions = this.normalizePolicyField(statementJson.Action ?? []);
      const resources = this.normalizePolicyField(statementJson.Resource ?? []);
      const effect = statementJson.Effect ?? 'Allow';

      for (const resource of resources) {
        if (!registry.has(resource)) {
          registry.set(resource, { actions: new Set(), effects: new Set() });
        }

        const entry = registry.get(resource)!;
        if (entry.effects.size > 0 && !entry.effects.has(effect)) {
          throw new Error(
            `Conflicting IAM policy effects for ${resource}: ` +
            `${Array.from(entry.effects).join(', ')} vs ${effect} ` +
            `(${binding.source} -> ${binding.target})`
          );
        }

        entry.effects.add(effect);

        for (const action of actions) {
          if (!entry.actions.has(action)) {
            if (entry.actions.size > 0) {
              this.dependencies.logger.info(
                `Merged IAM actions for ${resource}: added ${action} ` +
                `from ${binding.source} -> ${binding.target}.`
              );
            }
            entry.actions.add(action);
          }

          if (action === '*' || action.endsWith(':*')) {
            this.dependencies.logger.warn(
              `Over-privileging detected for ${resource}: action ${action} ` +
              `from ${binding.source} -> ${binding.target}.`
            );
          }
        }
      }
    }
  }

  private normalizePolicyField(value: string | string[]): string[] {
    if (Array.isArray(value)) {
      return value;
    }
    return value ? [value] : [];
  }

  /**
   * Resolve binding target by name or selector
   */
  private resolveTarget(bindDirective: any, outputsMap: Map<string, any>): any | null {
    // Direct reference by name
    if (bindDirective.to) {
      return outputsMap.get(bindDirective.to);
    }

    // Selector-based resolution with ambiguity checking
    if (bindDirective.select) {
      const matchingComponents: any[] = [];

      for (const [componentName, output] of outputsMap.entries()) {
        const component = output.component;

        // Match by type
        if (bindDirective.select.type && component.getType() === bindDirective.select.type) {
          // Match by labels if specified
          if (bindDirective.select.withLabels) {
            const matchesLabels = Object.entries(bindDirective.select.withLabels).every(
              ([key, value]) => component.spec.labels?.[key] === value
            );
            if (matchesLabels) {
              matchingComponents.push(output);
            }
          } else {
            matchingComponents.push(output); // Type match without label requirements
          }
        }
      }

      // Validate selector results
      if (matchingComponents.length === 0) {
        const selectorDesc = JSON.stringify(bindDirective.select);
        throw new Error(`Selector found no matching components for: ${selectorDesc}`);
      }

      if (matchingComponents.length > 1) {
        const componentNames = matchingComponents.map(output => output.component.spec.name).join(', ');
        const selectorDesc = JSON.stringify(bindDirective.select);
        throw new Error(`Ambiguous selector: Found ${matchingComponents.length} components matching ${selectorDesc}: [${componentNames}]. Please make selector more specific.`);
      }

      return matchingComponents[0];
    }

    return null;
  }

  /**
   * Phase 4: Patching  
   * Apply escape hatch modifications if patches.ts exists
   */
  private async applyPatches(
    stack: cdk.Stack,
    components: IComponent[],
    validatedConfig: any
  ): Promise<boolean> {
    this.dependencies.logger.debug('Phase 4: Patching');

    // AC-RS4.1: Check for existence of patches.ts file
    const patchesPath = path.resolve(process.cwd(), 'patches.js');

    if (!fs.existsSync(patchesPath)) {
      this.dependencies.logger.debug('No patches.ts file found - skipping patching phase');
      return false;
    }

    try {
      // AC-RS4.2: If file exists, invoke patch functions
      this.dependencies.logger.info('Applying patches from patches.js');

      // Dynamic import of patches file
      const patchesModule = await import(patchesPath);

      if (typeof patchesModule.applyPatches === 'function') {
        const patchContext = {
          stack,
          components,
          config: validatedConfig,
          constructs: this.buildConstructsMap(components)
        };

        await patchesModule.applyPatches(patchContext);

        this.dependencies.logger.info('Successfully applied patches');

        // Log patch info if available
        if (patchesModule.patchInfo) {
          this.dependencies.logger.info('Patch Info:', { data: patchesModule.patchInfo });
        }

        return true;
      } else {
        this.dependencies.logger.warn('patches.ts exists but does not export applyPatches function');
        return false;
      }

    } catch (error) {
      this.dependencies.logger.error('Failed to apply patches:', error);
      throw new Error(`Patch application failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Build a map of component constructs for patch context
   */
  private buildConstructsMap(components: IComponent[]): Record<string, any> {
    const constructsMap: Record<string, any> = {};

    for (const component of components) {
      // Retrieve the main construct handle stored during the REAL synthesis phase
      const mainConstruct = component.getConstruct('main');
      if (mainConstruct) {
        constructsMap[component.getName()] = mainConstruct;
      } else {
        this.dependencies.logger.warn(`Component ${component.getName()} has no 'main' construct handle`);
      }
    }

    return constructsMap;
  }

  /**
   * Get detailed synthesis report for logging/debugging
   */
  getSynthesisReport(result: SynthesisResult): string {
    const report = [
      '=== Synthesis Report ===',
      `Service: ${result.stacks[0]?.stackName || 'unknown'}`,
      `Components: ${result.components.length}`,
      `Bindings: ${result.bindings.length}`,
      `Patches Applied: ${result.patchesApplied ? 'Yes' : 'No'}`,
      `Synthesis Time: ${result.synthesisTime}ms`,
      '',
      '--- Components ---'
    ];

    result.components.forEach(component => {
      report.push(`  • ${component.spec.name} (${component.getType()})`);
      const capabilities = Object.keys(component.getCapabilities());
      if (capabilities.length > 0) {
        report.push(`    Capabilities: ${capabilities.join(', ')}`);
      }
    });

    if (result.bindings.length > 0) {
      report.push('', '--- Bindings ---');
      result.bindings.forEach(binding => {
        report.push(`  • ${binding.source} -> ${binding.target} (${binding.capability})`);
      });
    }

    return report.join('\n');
  }
}
