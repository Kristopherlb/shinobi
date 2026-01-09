/**
 * The Resolver & Synthesis Engine
 * Core orchestrator for translating validated configuration into CDK constructs
 */

import { Logger as PlatformLogger } from '../platform/logger/src/index.js';
import { ComponentFactoryBuilder } from '../platform/contracts/components/component-factory.js';
import { IComponent } from '../platform/contracts/index.js';
import { ComponentContext as FactoryComponentContext } from '../platform/contracts/components/component-context.js';
import { Component } from '../platform/contracts/component.js';
import { UnifiedBinderRegistry } from '../platform/binders/registry/unified-binder-registry.js';
import type { BindingContext, EnhancedBindingResult } from '../platform/contracts/platform-binding-trigger-spec.js';
import { DirectiveSchemaValidator } from '../platform/contracts/directive-schema-validator.js';
import { SecurityGroupRulePostProcessor } from './security-group-rule-post-processor.js';
import * as cdk from 'aws-cdk-lib';
import * as path from 'path';
import * as fs from 'fs';

export interface ResolverEngineDependencies {
  logger: PlatformLogger;
  binderRegistry: UnifiedBinderRegistry;
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

      // Phase 2: Synthesis (AC-RS2.1, AC-RS2.2, AC-RS2.3)  
      const outputsMap = await this.synthesizeComponents(components);

      // Phase 3: Binding (AC-RS3.1, AC-RS3.2)
      const bindings = await this.bindComponents(components, outputsMap, validatedConfig);

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

    // AC-RS1.2: Use canonical ComponentFactoryBuilder
    const factory = new ComponentFactoryBuilder().build();
    this.dependencies.logger.info('Using canonical component factory');

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
   * Phase 2: Synthesis  
   * Calls synth() on each component to create CDK constructs and collect capabilities
   */
  private async synthesizeComponents(components: IComponent[]): Promise<Map<string, any>> {
    this.dependencies.logger.debug('Phase 2: Component Synthesis');

    const outputsMap = new Map<string, any>();

    // AC-RS2.1 & AC-RS2.2: Iterate through components and call synth()
    for (const component of components) {
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

    this.dependencies.logger.info(`Synthesized ${components.length} components with capabilities`);
    return outputsMap;
  }

  /**
   * Phase 3: Binding
   * Resolves component bindings using unified binder strategies
   */
  private async bindComponents(
    components: IComponent[],
    outputsMap: Map<string, any>,
    validatedConfig: any
  ): Promise<Array<{ source: string; target: string; capability: string; result: EnhancedBindingResult }>> {
    this.dependencies.logger.debug('Phase 3: Component Binding');

    const bindings: Array<{ source: string; target: string; capability: string; result: EnhancedBindingResult }> = [];
    const envVarRegistry = new Map<string, { value: string; source: string; target: string }>();
    const iamPolicyRegistry = new Map<string, { actions: Set<string>; effects: Set<string> }>();

    this.validateBindingGraph(components, outputsMap);

    // AC-RS3.1: Iterate through components that have binds directive
    for (const component of components) {
      if (!component.spec.binds || !Array.isArray(component.spec.binds)) {
        continue;
      }

      for (const bindDirective of component.spec.binds) {
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
              throw new Error(
                `Directive validation failed for binding ${component.spec.name} -> ${bindDirective.to || bindDirective.select ? 'selector' : 'unknown'}: ${error.message}`
              );
            }
            throw error;
          }

          // Find strategy that can handle this binding
          const strategy = this.dependencies.binderRegistry.findStrategyForBinding(
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
