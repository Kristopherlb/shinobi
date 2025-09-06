/**
 * The Resolver & Synthesis Engine
 * Core orchestrator for translating validated configuration into CDK constructs
 */

import { Logger } from '../utils/logger';
import { ComponentFactoryProvider } from '../patterns/abstract-component-factory';
import { ComponentRegistry, Component, ComponentContext } from '../patterns/component-factory';
import { ComponentBinder, BinderRegistry } from '../patterns/binding-strategies';
import * as cdk from 'aws-cdk-lib';
import * as path from 'path';
import * as fs from 'fs';

export interface ResolverEngineDependencies {
  logger: Logger;
  binderRegistry?: BinderRegistry;
  componentBinder?: ComponentBinder;
}

export interface SynthesisResult {
  app: cdk.App;
  stacks: cdk.Stack[];
  components: Component[];
  bindings: Array<{
    source: string;
    target: string;
    capability: string;
    result: any;
  }>;
  patchesApplied: boolean;
  synthesisTime: number;
}

/**
 * The heart of the platform's infrastructure generation logic
 * Orchestrates the complete two-phase process of synthesizing and binding components
 */
export class ResolverEngine {
  private binderRegistry: BinderRegistry;
  private componentBinder: ComponentBinder;

  constructor(private dependencies: ResolverEngineDependencies) {
    this.binderRegistry = dependencies.binderRegistry || new BinderRegistry();
    this.componentBinder = dependencies.componentBinder || new ComponentBinder(this.binderRegistry);
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
          ComplianceFramework: validatedConfig.complianceFramework || 'commercial',
          Environment: process.env.NODE_ENV || 'dev'
        }
      });

      // Phase 1: Component Instantiation (AC-RS1.1, AC-RS1.2, AC-RS1.3)
      const components = await this.instantiateComponents(validatedConfig, stack);
      
      // Phase 2: Synthesis (AC-RS2.1, AC-RS2.2, AC-RS2.3)  
      const outputsMap = await this.synthesizeComponents(components);
      
      // Phase 3: Binding (AC-RS3.1, AC-RS3.2)
      const bindings = await this.bindComponents(components, outputsMap, validatedConfig);
      
      // Phase 4: Patching (AC-RS4.1, AC-RS4.2)
      const patchesApplied = await this.applyPatches(stack, components, validatedConfig);
      
      // Phase 5: Final Assembly (AC-RS5.1)
      const synthesisTime = Date.now() - startTime;
      
      this.dependencies.logger.success(`Synthesis completed in ${synthesisTime}ms`);
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
  private async instantiateComponents(validatedConfig: any, stack: cdk.Stack): Promise<Component[]> {
    this.dependencies.logger.debug('Phase 1: Component Instantiation');

    // AC-RS1.2: Use ComponentFactoryProvider with correct complianceFramework
    const complianceFramework = validatedConfig.complianceFramework || 'commercial';
    const factory = ComponentFactoryProvider.createFactory(complianceFramework);
    const registry = factory.createRegistry();

    this.dependencies.logger.info(`Using ${complianceFramework} component factory`);

    const components: Component[] = [];

    // AC-RS1.3: Iterate through components array and instantiate via Factory Method
    if (validatedConfig.components && Array.isArray(validatedConfig.components)) {
      for (const componentSpec of validatedConfig.components) {
        const context: ComponentContext = {
          serviceName: validatedConfig.service,
          environment: process.env.NODE_ENV || 'dev',
          complianceFramework: complianceFramework as any,
          scope: stack
        };

        try {
          const component = registry.createComponent(componentSpec, context);
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
  private async synthesizeComponents(components: Component[]): Promise<Map<string, any>> {
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
          this.dependencies.logger.debug(`  Capability: ${capabilityKey}`, capabilities[capabilityKey]);
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
   * Resolves component bindings using Strategy pattern
   */
  private async bindComponents(
    components: Component[], 
    outputsMap: Map<string, any>,
    validatedConfig: any
  ): Promise<Array<any>> {
    this.dependencies.logger.debug('Phase 3: Component Binding');

    const bindings: Array<any> = [];

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

          // Select correct binder using Strategy Pattern
          const bindingContext = {
            source: component,
            target: target.component,
            directive: bindDirective,
            environment: process.env.NODE_ENV || 'dev',
            complianceFramework: validatedConfig.complianceFramework || 'commercial'
          };

          const bindingResult = this.componentBinder.bind(bindingContext);
          
          bindings.push({
            source: component.spec.name,
            target: target.component.spec.name,
            capability: bindDirective.capability,
            result: bindingResult
          });

          this.dependencies.logger.debug(
            `Bound ${component.spec.name} -> ${target.component.spec.name} (${bindDirective.capability})`
          );

        } catch (error) {
          throw new Error(
            `Failed to bind ${component.spec.name} -> ${bindDirective.to || 'selector'}: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        }
      }
    }

    this.dependencies.logger.info(`Applied ${bindings.length} component bindings`);
    return bindings;
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
    components: Component[], 
    validatedConfig: any
  ): Promise<boolean> {
    this.dependencies.logger.debug('Phase 4: Patching');

    // AC-RS4.1: Check for existence of patches.ts file
    const patchesPath = path.resolve(process.cwd(), 'patches.ts');
    
    if (!fs.existsSync(patchesPath)) {
      this.dependencies.logger.debug('No patches.ts file found - skipping patching phase');
      return false;
    }

    try {
      // AC-RS4.2: If file exists, invoke patch functions
      this.dependencies.logger.info('Applying patches from patches.ts');
      
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
        
        this.dependencies.logger.success('Successfully applied patches');
        
        // Log patch info if available
        if (patchesModule.patchInfo) {
          this.dependencies.logger.info('Patch Info:', patchesModule.patchInfo);
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
  private buildConstructsMap(components: Component[]): Record<string, any> {
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