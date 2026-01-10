/**
 * Binder Catalog Command
 *
 * Creates a Commander.js command for `shinobi binders list` or `shinobi binders catalog`, which lists all
 * available binder strategies with their capabilities, compatibility matrices, access levels, and examples.
 * The catalog displays:
 *
 * - Strategy names
 * - Supported capabilities (e.g., "iot:thing", "iot:certificate")
 * - Compatibility matrix (source types → target capabilities)
 * - Supported access levels (read, write, readwrite, admin, etc.)
 * - Examples from compatibility matrix
 *
 * The command can be filtered by capability, category, or source type, and output
 * results as JSON for programmatic consumption.
 *
 * @returns A configured Commander.js Command instance
 */

import { Command } from 'commander';
import { CompositionRoot } from './composition-root.js';
import { Logger } from './console-logger.js';
import { UnifiedBinderRegistry } from '@shinobi/core';
import { createUnifiedBinderRegistry } from '@shinobi/binders';
import type { IUnifiedBinderStrategy, CompatibilityEntry } from '@shinobi/core';

interface BinderCatalogOptions {
  capability?: string;
  category?: string;
  source?: string;
  json?: boolean;
}

interface BinderCatalogEntry {
  strategyName: string;
  capabilities: string[];
  compatibility: CompatibilityEntry[];
  category?: string;
}

interface BinderCatalogData {
  entries: BinderCatalogEntry[];
  count: number;
}

interface BinderCatalogResult {
  success: boolean;
  exitCode: number;
  error?: string;
  data?: BinderCatalogData;
}


/**
 * Infer category from capability prefix (e.g., "security:kms" -> "security")
 */
function inferCategory(capability: string): string | undefined {
  const parts = capability.split(':');
  if (parts.length > 0 && parts[0]) {
    return parts[0];
  }
  return undefined;
}

/**
 * Get unique categories from capabilities
 */
function getCategory(capabilities: string[]): string | undefined {
  const categories = new Set<string>();
  for (const cap of capabilities) {
    const cat = inferCategory(cap);
    if (cat) {
      categories.add(cat);
    }
  }
  if (categories.size === 1) {
    return Array.from(categories)[0];
  }
  // If multiple categories, return undefined (multi-category strategy)
  return undefined;
}

export class BinderCatalogCommand {
  constructor(private readonly logger: Logger) {}

  /**
   * Build catalog from registry
   */
  private buildCatalog(registry: UnifiedBinderRegistry, options: BinderCatalogOptions): BinderCatalogEntry[] {
    const capabilities = registry.getRegisteredCapabilities();
    const strategyMap = new Map<IUnifiedBinderStrategy, Set<string>>();

    // Group capabilities by strategy
    for (const capability of capabilities) {
      const strategy = registry.findStrategy(capability);
      if (!strategy) {
        continue;
      }

      if (!strategyMap.has(strategy)) {
        strategyMap.set(strategy, new Set());
      }
      strategyMap.get(strategy)!.add(capability);
    }

    // Build catalog entries
    const entries: BinderCatalogEntry[] = [];
    const strategyEntries = Array.from(strategyMap.entries());
    for (const [strategy, capabilitySet] of strategyEntries) {
      const capabilitiesList = Array.from(capabilitySet).sort();
      const category = getCategory(capabilitiesList);

      // Apply filters
      if (options.capability) {
        const matches = capabilitiesList.some(cap =>
          cap.includes(options.capability!) || options.capability!.includes(cap)
        );
        if (!matches) {
          continue;
        }
      }

      if (options.category && category !== options.category) {
        continue;
      }

      // Get compatibility matrix
      const compatibility = strategy.getCompatibilityMatrix();

      // Apply source filter if specified
      let filteredCompatibility = compatibility;
      if (options.source) {
        filteredCompatibility = compatibility.filter((entry: CompatibilityEntry) =>
          entry.sourceType === options.source || entry.sourceType === '*'
        );
        if (filteredCompatibility.length === 0) {
          continue;
        }
      }

      // getStrategyName() is on the base class, not the interface
      const strategyName = ('getStrategyName' in strategy && typeof (strategy as any).getStrategyName === 'function')
        ? (strategy as any).getStrategyName()
        : strategy.constructor?.name || 'Unknown Strategy';

      entries.push({
        strategyName,
        capabilities: capabilitiesList,
        compatibility: filteredCompatibility,
        category
      });
    }

    // Sort by strategy name
    entries.sort((a, b) => a.strategyName.localeCompare(b.strategyName));

    return entries;
  }

  async execute(options: BinderCatalogOptions): Promise<BinderCatalogResult> {
    try {
      // Use runtime discovery factory to create registry with all binder strategies
      const registry = await createUnifiedBinderRegistry();

      if (registry.getStrategyCount() === 0) {
        this.logger.info('No binder strategies found.');
        return {
          success: true,
          exitCode: 0,
          data: { entries: [], count: 0 }
        };
      }

      // Build catalog
      const entries = this.buildCatalog(registry, options);

      if (entries.length === 0) {
        this.logger.info('No binders found matching the specified filters.');
        return {
          success: true,
          exitCode: 0,
          data: { entries: [], count: 0 }
        };
      }

      // Format output
      if (options.json || process.env.CI) {
        // JSON output will be handled by CLI entry point
        return {
          success: true,
          exitCode: 0,
          data: {
            entries,
            count: entries.length
          }
        };
      }

      // Human-readable output
      this.logger.info(`Binder Catalog (${entries.length} binder${entries.length === 1 ? '' : 's'})\n`);

      for (const entry of entries) {
        const lines: string[] = [];
        lines.push(`${entry.strategyName}`);
        if (entry.category) {
          lines.push(`  Category: ${entry.category}`);
        }
        lines.push(`  Capabilities: ${entry.capabilities.join(', ')}`);

        // Group compatibility by capability
        const compatibilityByCap = new Map<string, CompatibilityEntry[]>();
        for (const comp of entry.compatibility) {
          if (!compatibilityByCap.has(comp.capability)) {
            compatibilityByCap.set(comp.capability, []);
          }
          compatibilityByCap.get(comp.capability)!.push(comp);
        }

        const compatibilityEntries = Array.from(compatibilityByCap.entries());
        for (const [capability, comps] of compatibilityEntries) {
          lines.push(`  ${capability}:`);
          for (const comp of comps) {
            const accessLevels = comp.supportedAccess.join('/');
            lines.push(`    ${comp.sourceType} -> ${comp.targetType} (${accessLevels})`);
            if (comp.examples && comp.examples.length > 0) {
              for (const example of comp.examples) {
                lines.push(`      Example: ${example}`);
              }
            }
          }
        }

        this.logger.info(lines.join('\n'));
        this.logger.info('');
      }

      return {
        success: true,
        exitCode: 0,
        data: {
          entries,
          count: entries.length
        }
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        exitCode: 1,
        error: `Failed to load binder catalog: ${message}`
      };
    }
  }
}

export const createBindersCatalogCommand = (): Command => {
  const root = new CompositionRoot();
  const command = new Command('catalog').alias('list');

  command
    .description('List all available binder strategies with capabilities, compatibility, and examples')
    .option('--capability <pattern>', 'Filter by capability pattern (e.g., "iot:*", "security:kms")')
    .option('--category <category>', 'Filter by category (e.g., "security", "database", "compute")')
    .option('--source <sourceType>', 'Filter by source type (e.g., "lambda-api", "ecs-task")')
    .option('--json', 'Emit catalog as JSON')
    .action(async (options: BinderCatalogOptions, cmd) => {
      const parent: any = cmd.parent || {};
      const rootOpts = parent.opts ? parent.opts() : {};
      const dependencies = await root.createDependencies({
        verbose: !!rootOpts.verbose,
        ci: !!rootOpts.ci
      });

      const catalogCommand = new BinderCatalogCommand(dependencies.logger);
      const result = await catalogCommand.execute(options);

      if (result.success) {
        if (options.json && result.data) {
          // JSON output to stdout (appropriate for structured output)
          console.log(JSON.stringify(result.data.entries, null, 2));
        }
        process.exit(result.exitCode);
      } else {
        if (options.json && result.error) {
          // JSON error output to stderr (appropriate for structured output)
          console.error(JSON.stringify({ error: result.error }, null, 2));
        } else {
          // Use logger for human-readable error messages
          dependencies.logger.error(result.error || 'Binder catalog command failed');
        }
        process.exit(result.exitCode);
      }
    });

  return command;
};

