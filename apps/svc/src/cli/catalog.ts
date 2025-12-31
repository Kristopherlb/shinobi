/**
 * Catalog Command Factory
 *
 * Creates a Commander.js command for `shinobi catalog`, which lists all
 * available platform components that are ready for use. The catalog displays:
 *
 * - Component type identifiers (e.g., "s3-bucket", "rds-postgres")
 * - Component descriptions and capabilities
 * - Production readiness status
 * - Component metadata (version, compliance support, etc.)
 *
 * The command can optionally include non-production components and output
 * results as JSON for programmatic consumption.
 *
 * @returns A configured Commander.js Command instance
 */

import { Command } from 'commander';
import { CompositionRoot } from './composition-root.js';
import { Logger } from './console-logger.js';
import { loadComponentCatalog, ComponentCatalogEntry } from './utils/component-catalog.js';
import { loadComponentCreators, ComponentCreatorEntry } from './utils/component-loader.js';

// Extract PlatformComponentCreator type from component-loader
type PlatformComponentCreator = ComponentCreatorEntry['creator'];

interface CatalogOptions {
  all?: boolean;
  json?: boolean;
}

/**
 * Enriched catalog entry with creator and required capabilities
 */
interface EnrichedCatalogEntry {
  entry: ComponentCatalogEntry;
  creator?: PlatformComponentCreator;
  requiredCapabilities?: string[];
}

/**
 * Catalog entry with required capabilities for output
 */
interface CatalogOutputEntry extends ComponentCatalogEntry {
  requiredCapabilities?: string[];
}

/**
 * Result data structure for catalog command
 */
interface CatalogResultData {
  entries: CatalogOutputEntry[];
  count: number;
}

export interface CatalogResult {
  success: boolean;
  exitCode: number;
  data?: CatalogResultData;
  error?: string;
}

export class CatalogCommand {
  constructor(private readonly logger: Logger) {}

  /**
   * Helper method to extract required capabilities from a creator
   */
  private getRequiredCapabilities(creator?: PlatformComponentCreator): string[] {
    if (!creator) {
      return [];
    }

    // Type guard: check if creator has getRequiredCapabilities method
    if (typeof (creator as any).getRequiredCapabilities === 'function') {
      const capabilities = (creator as any).getRequiredCapabilities();
      return Array.isArray(capabilities) ? capabilities : [];
    }

    return [];
  }

  /**
   * Helper method to enrich catalog entries with creator information and required capabilities
   */
  private enrichEntries(
    catalogEntries: ComponentCatalogEntry[],
    creatorMap: Map<string, ComponentCreatorEntry> | undefined
  ): EnrichedCatalogEntry[] {
    return catalogEntries.map(entry => {
      const creatorEntry = creatorMap?.get(entry.componentType);
      const creator = creatorEntry?.creator;
      const requiredCapabilities = this.getRequiredCapabilities(creator);

      return {
        entry,
        creator,
        requiredCapabilities: requiredCapabilities.length > 0 ? requiredCapabilities : undefined
      };
    });
  }

  /**
   * Convert enriched entries to output format
   */
  private toOutputEntries(enrichedEntries: EnrichedCatalogEntry[]): CatalogOutputEntry[] {
    return enrichedEntries.map(({ entry, requiredCapabilities }) => ({
      ...entry,
      requiredCapabilities
    }));
  }

  async execute(options: CatalogOptions): Promise<CatalogResult> {
    try {
      const catalogEntries = await loadComponentCatalog({ includeNonProduction: options.all });

      let creatorMap: Map<string, ComponentCreatorEntry> | undefined;
      try {
        creatorMap = await loadComponentCreators({ 
          includeNonProduction: options.all, 
          autoBuild: false,
          logger: this.logger
        });
      } catch (loadError) {
        const message = loadError instanceof Error ? loadError.message : String(loadError);
        this.logger.warn(`Continuing without component creators: ${message}`);
        creatorMap = undefined;
      }

      // Enrich all entries with creator information and required capabilities
      const enrichedEntries = this.enrichEntries(catalogEntries, creatorMap);

      if (enrichedEntries.length === 0) {
        this.logger.info('No components found in the registry.');
        return {
          success: true,
          exitCode: 0,
          data: { entries: [], count: 0 }
        };
      }

      // Convert to output format (consistent for both JSON and human-readable)
      const outputEntries = this.toOutputEntries(enrichedEntries);

      // Format output
      if (options.json || process.env.CI) {
        // JSON output will be handled by CLI entry point
        return {
          success: true,
          exitCode: 0,
          data: {
            entries: outputEntries,
            count: outputEntries.length
          }
        };
      }

      // Human-readable output
      enrichedEntries
        .sort((a, b) => a.entry.displayName.localeCompare(b.entry.displayName))
        .forEach(({ entry, requiredCapabilities }, index) => {
          const lines: string[] = [];
          lines.push(`${index + 1}. ${entry.displayName} (${entry.componentType})`);
          if (entry.description) {
            lines.push(`   ${entry.description}`);
          }
          lines.push(`   Lifecycle: ${entry.lifecycle}${entry.category ? ` · Category: ${entry.category}` : ''}`);

          const capabilities = entry.capabilities.length > 0
            ? entry.capabilities.map(cap => `     • ${cap}`).join('\n')
            : '     • None documented';
          lines.push('   Capabilities:\n' + capabilities);

          if (requiredCapabilities && requiredCapabilities.length > 0) {
            lines.push(
              '   Requires:\n' + requiredCapabilities.map((cap: string) => `     • ${cap}`).join('\n')
            );
          }

          if (entry.tags.length > 0) {
            lines.push('   Tags: ' + entry.tags.join(', '));
          }

          this.logger.info(lines.join('\n'));
          this.logger.info('');
        });

      this.logger.info(`${enrichedEntries.length} component${enrichedEntries.length === 1 ? '' : 's'} available.`);

      return {
        success: true,
        exitCode: 0,
        data: {
          entries: outputEntries,
          count: outputEntries.length
        }
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        exitCode: 1,
        error: `Failed to load component catalog: ${message}`
      };
    }
  }
}

export const createCatalogCommand = (): Command => {
  const root = new CompositionRoot();
  const command = new Command('catalog');

  command
    .description('List Shinobi platform components that are ready for use')
    .option('--all', 'Include components that are not production-ready')
    .option('--json', 'Emit catalog as JSON')
    .action(async (options: CatalogOptions, cmd) => {
      const parent: any = cmd.parent || {};
      const rootOpts = parent.opts ? parent.opts() : {};
      const dependencies = root.createDependencies({
        verbose: !!rootOpts.verbose,
        ci: !!rootOpts.ci
      });

      const catalogCommand = new CatalogCommand(dependencies.logger);
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
          dependencies.logger.error(result.error || 'Catalog command failed');
        }
        process.exit(result.exitCode);
      }
    });

  return command;
};
