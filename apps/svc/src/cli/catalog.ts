import { Command } from 'commander';
import { loadComponentCatalog } from './utils/component-catalog.js';
import { loadComponentCreators, ComponentCreatorEntry } from './utils/component-loader.js';

interface CatalogOptions {
  all?: boolean;
  json?: boolean;
}

export const createCatalogCommand = (): Command => {
  const command = new Command('catalog');

  command
    .description('List Shinobi platform components that are ready for use')
    .option('--all', 'Include components that are not production-ready')
    .option('--json', 'Emit catalog as JSON')
    .action(async (options: CatalogOptions) => {
      try {
        const catalogEntries = await loadComponentCatalog({ includeNonProduction: options.all });

        let creatorMap: Map<string, ComponentCreatorEntry> | undefined;
        try {
          creatorMap = await loadComponentCreators({ includeNonProduction: options.all, autoBuild: false });
        } catch (loadError) {
          const message = loadError instanceof Error ? loadError.message : String(loadError);
          console.warn(`Continuing without component creators: ${message}`);
          creatorMap = undefined;
        }

        const entries = catalogEntries.map(entry => {
          const creator = creatorMap?.get(entry.componentType)?.creator;
          return { entry, creator };
        });

        if (entries.length === 0) {
          console.log('No components found in the registry.');
          return;
        }

        if (options.json || process.env.CI) {
          console.log(JSON.stringify(entries.map(({ entry }) => entry), null, 2));
          return;
        }

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

            console.log(lines.join('\n'));
            console.log('');
          });

        console.log(`${entries.length} component${entries.length === 1 ? '' : 's'} available.`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Failed to load component catalog: ${message}`);
        process.exit(1);
      }
    });

  return command;
};
