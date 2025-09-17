/**
 * The Resolver & Synthesis Engine
 * Core orchestrator for translating validated configuration into CDK constructs
 */

import * as cdk from 'aws-cdk-lib';
import * as path from 'path';
import * as fs from 'fs';
import { 
  ComponentSpec, 
  ComponentContext,
  IComponent,
  IComponentFactory,
  IComponentRegistry,
  BindingContext,
  IBinderStrategy,
  IPlatformService,
  PlatformServiceContext,
  PlatformServiceRegistry
} from '../platform/contracts';
import { Logger } from './logger';
import { ComponentFactoryProvider } from './component-factory-provider';
import { ComponentBinder, BinderRegistry } from './binding-strategies';
import { ObservabilityService } from '../services/observability.service';

export interface ResolverEngineDependencies {
  logger: Logger;
  binderRegistry?: BinderRegistry;
  componentBinder?: ComponentBinder;
}

export interface SynthesisResult {
  app: cdk.App;
  stacks: cdk.Stack[];
  components: IComponent[];
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
 * Orchestrates the complete 5-phase process of synthesizing and binding components
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

      // Phase 1: Component Instantiation
      const components = await this.instantiateComponents(validatedConfig, stack);
      
      // Phase 2: Synthesis
      const outputsMap = await this.synthesizeComponents(components);
      
      // Phase 2.5: Platform Services Application
      await this.applyPlatformServices(components, validatedConfig);
      
      // Phase 3: Binding
      const bindings = await this.bindComponents(components, outputsMap, validatedConfig);
      
      // Phase 4: Patching
      const patchesApplied = await this.applyPatches(stack, components, validatedConfig);
      
      // Phase 5: Final Assembly
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
  private async instantiateComponents(validatedConfig: any, stack: cdk.Stack): Promise<IComponent[]> {
    this.dependencies.logger.debug('Phase 1: Component Instantiation');

    const complianceFramework = validatedConfig.complianceFramework || 'commercial';
    const factory = ComponentFactoryProvider.createFactory(complianceFramework);
    const registry = factory.createRegistry();

    this.dependencies.logger.info(`Using ${complianceFramework} component factory`);

    const components: IComponent[] = [];

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
  private async synthesizeComponents(components: IComponent[]): Promise<Map<string, any>> {
    this.dependencies.logger.debug('Phase 2: Component Synthesis');

    const outputsMap = new Map<string, any>();

    for (const component of components) {
      try {
        component.synth();
        
        const capabilities = component.getCapabilities();
        outputsMap.set(component.spec.name, {
          construct: component.getConstruct('main'),
          capabilities: capabilities,
          component: component
        });

        this.dependencies.logger.debug(`Synthesized component: ${component.spec.name}`);
        
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
   * Phase 2.5: Platform Services Application
   * Apply cross-cutting concerns like observability, security scanning, etc.
   */
  private async applyPlatformServices(components: IComponent[], validatedConfig: any): Promise<void> {
    this.dependencies.logger.debug('Phase 2.5: Platform Services Application');

    // Create platform service context
    const serviceContext: PlatformServiceContext = {
      serviceName: validatedConfig.service,
      environment: process.env.NODE_ENV || 'dev',
      complianceFramework: validatedConfig.complianceFramework || 'commercial',
      region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
      serviceLabels: validatedConfig.labels || {},
      serviceRegistry: {
        observability: { enabled: true }, // Always enable observability for now
        costManagement: { enabled: false }, // TODO: Implement in future
        securityScanning: { enabled: false }, // TODO: Implement in future
        backupRecovery: { enabled: false }, // TODO: Implement in future
        performanceOptimization: { enabled: false } // TODO: Implement in future
      }
    };

    // Initialize platform services
    const enabledServices: IPlatformService[] = [];
    
    // Add observability service if enabled
    if (serviceContext.serviceRegistry.observability?.enabled) {
      enabledServices.push(new ObservabilityService(serviceContext));
    }

    // Apply each service to all components
    for (const service of enabledServices) {
      this.dependencies.logger.debug(`Applying ${service.name} to components`);
      
      let processedCount = 0;

      for (const component of components) {
        try {
          service.apply(component);
          processedCount++;
        } catch (error) {
          this.dependencies.logger.warn(
            `Failed to apply ${service.name} to component ${component.spec.name}: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
          // Continue with other components rather than failing the entire process
        }
      }

      this.dependencies.logger.info(`${service.name}: Processed ${processedCount} components`);
    }

    this.dependencies.logger.info(`Applied ${enabledServices.length} platform services`);
  }

  /**
   * Phase 3: Binding
   * Resolves component bindings using Strategy pattern
   */
  private async bindComponents(
    components: IComponent[], 
    outputsMap: Map<string, any>,
    validatedConfig: any
  ): Promise<Array<any>> {
    this.dependencies.logger.debug('Phase 3: Component Binding');

    const bindings: Array<any> = [];

    for (const component of components) {
      if (!component.spec.binds || !Array.isArray(component.spec.binds)) {
        continue;
      }

      for (const bindDirective of component.spec.binds) {
        try {
          const target = this.resolveTarget(bindDirective, outputsMap);
          
          if (!target) {
            throw new Error(`Cannot resolve binding target for directive: ${JSON.stringify(bindDirective)}`);
          }

          const bindingContext: BindingContext = {
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
   * Resolve binding target by name or selector with ambiguity checking
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

    const patchesPath = path.resolve(process.cwd(), 'patches.ts');
    
    if (!fs.existsSync(patchesPath)) {
      this.dependencies.logger.debug('No patches.ts file found - skipping patching phase');
      return false;
    }

    try {
      this.dependencies.logger.info('Applying patches from patches.ts');
      
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
   * Build a map of component constructs for patch context (no redundant synthesis)
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