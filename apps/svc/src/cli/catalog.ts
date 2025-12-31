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
import { loadComponentCatalog } from './utils/component-catalog.js';
import { loadComponentCreators, ComponentCreatorEntry } from './utils/component-loader.js';

interface CatalogOptions {
  all?: boolean;
  json?: boolean;
}

export interface CatalogResult {
  success: boolean;
  exitCode: number;
  data?: {
    entries: Array<{ entry: any; creator?: any }>;
    count: number;
  };
  error?: string;
}

export class CatalogCommand {
  constructor(private readonly logger: { info: (msg: string) => void; warn: (msg: string) => void }) {}

  async execute(options: CatalogOptions): Promise<CatalogResult> {
    try {
      const catalogEntries = await loadComponentCatalog({ includeNonProduction: options.all });

      let creatorMap: Map<string, ComponentCreatorEntry> | undefined;
      try {
        creatorMap = await loadComponentCreators({ includeNonProduction: options.all, autoBuild: false });
      } catch (loadError) {
        const message = loadError instanceof Error ? loadError.message : String(loadError);
        this.logger.warn(`Continuing without component creators: ${message}`);
        creatorMap = undefined;
      }

      const entries = catalogEntries.map(entry => {
        const creator = creatorMap?.get(entry.componentType)?.creator;
        return { entry, creator };
      });

      if (entries.length === 0) {
        this.logger.info('No components found in the registry.');
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
            entries: entries.map(({ entry }) => ({ entry })),
            count: entries.length
          }
        };
      }

      // Human-readable output
      entries
        .sort((a, b) => a.entry.displayName.localeCompare(b.entry.displayName))
        .forEach(({ entry, creator }, index) => {
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

          const requiredCapabilities = creator && typeof (creator as any).getRequiredCapabilities === 'function'
            ? (creator as any).getRequiredCapabilities()
            : [];
          if (Array.isArray(requiredCapabilities) && requiredCapabilities.length > 0) {
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

      this.logger.info(`${entries.length} component${entries.length === 1 ? '' : 's'} available.`);

      return {
        success: true,
        exitCode: 0,
        data: { entries, count: entries.length }
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
          console.log(JSON.stringify(result.data.entries.map(({ entry }) => entry), null, 2));
        }
        process.exit(result.exitCode);
      } else {
        if (options.json && result.error) {
          console.error(JSON.stringify({ error: result.error }, null, 2));
        } else {
          dependencies.logger.error(result.error || 'Catalog command failed');
        }
        process.exit(result.exitCode);
      }
    });

  return command;
};
