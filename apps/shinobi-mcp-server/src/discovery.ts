/**
 * Discovery & DocOps Domain
 * 
 * Provides component catalog, schemas, capabilities, bindings, and patterns.
 */

import fs from 'node:fs';
import path from 'node:path';
import { ComprehensiveBinderRegistry, PlatformLogger as Logger } from '@shinobi/core';
import { DomainModule, ToolDefinition, DomainContext } from './types.js';

interface ComponentPattern {
  id: string;
  name: string;
  description?: string;
  type: string;
  file: string;
  data: any;
}

// Tool schemas
const DISCOVERY_TOOLS: ToolDefinition[] = [
  {
    name: 'get_component_catalog',
    description: 'Get the catalog of all available components with versions, capabilities, and stability information',
    inputSchema: {
      type: 'object',
      properties: {
        filter: {
          type: 'string',
          description: 'Filter components by name, type, or capability',
          default: ''
        },
        includeVersions: {
          type: 'boolean',
          description: 'Include version information',
          default: true
        }
      }
    }
  },
  {
    name: 'get_component_schema',
    description: 'Get the full JSON Schema for a specific component with examples and gotchas',
    inputSchema: {
      type: 'object',
      properties: {
        componentName: {
          type: 'string',
          description: 'Name of the component to get schema for'
        }
      },
      required: ['componentName']
    }
  },
  {
    name: 'get_capability_catalog',
    description: 'Get the platform capability vocabulary along with supporting binder strategies',
    inputSchema: {
      type: 'object',
      properties: {
        includeAliases: {
          type: 'boolean',
          description: 'Include service type aliases for each capability',
          default: false
        }
      }
    }
  },
  {
    name: 'get_binding_matrix',
    description: 'Retrieve the supported binding matrix derived from registered binder strategies',
    inputSchema: {
      type: 'object',
      properties: {
        includeAliases: {
          type: 'boolean',
          description: 'Include service type aliases in the matrix response',
          default: false
        },
        includeRecommendations: {
          type: 'boolean',
          description: 'Include recommended follow-up actions for each binder',
          default: true
        }
      }
    }
  },
  {
    name: 'get_component_patterns',
    description: 'Get opinionated blueprints and patterns for common use cases',
    inputSchema: {
      type: 'object',
      properties: {
        patternType: {
          type: 'string',
          description: 'Type of pattern to retrieve',
          enum: ['event-driven-api', 'serverless-backend', 'microservices', 'data-pipeline']
        }
      }
    }
  },
  {
    name: 'expand_pattern',
    description: 'Expand a high-level intent into concrete component set and initial manifest',
    inputSchema: {
      type: 'object',
      properties: {
        intent: {
          type: 'string',
          description: 'High-level description of what you want to build'
        },
        environment: {
          type: 'string',
          description: 'Target environment',
          enum: ['development', 'staging', 'production']
        }
      },
      required: ['intent']
    }
  }
];

// Helper functions
async function loadComponentPatterns(workspaceRoot: string): Promise<ComponentPattern[]> {
  const patterns: ComponentPattern[] = [];
  const baseDir = path.join(workspaceRoot, 'platform-kb');
  const targets: Array<{ type: string; dir: string }> = [
    { type: 'observability', dir: path.join(baseDir, 'observability', 'recipes') },
    { type: 'controls', dir: path.join(baseDir, 'controls') },
    { type: 'packs', dir: path.join(baseDir, 'packs') }
  ];

  for (const target of targets) {
    await readPatternDirectory(target.dir, target.type, patterns, workspaceRoot);
  }

  return patterns;
}

async function readPatternDirectory(
  directory: string,
  type: string,
  patterns: ComponentPattern[],
  workspaceRoot: string
): Promise<void> {
  let entries: fs.Dirent[];
  try {
    entries = await fs.promises.readdir(directory, { withFileTypes: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return;
    }
    throw error;
  }

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      await readPatternDirectory(fullPath, type, patterns, workspaceRoot);
      continue;
    }

    if (entry.name.endsWith('.yaml') || entry.name.endsWith('.yml') || entry.name.endsWith('.json')) {
      try {
        const content = await fs.promises.readFile(fullPath, 'utf8');
        const data = entry.name.endsWith('.json') ? JSON.parse(content) : require('yaml').parse(content);
        
        patterns.push({
          id: data.id || entry.name,
          name: data.name || entry.name,
          description: data.description,
          type,
          file: fullPath.replace(workspaceRoot, ''),
          data
        });
      } catch (error) {
        // Skip malformed files
      }
    }
  }
}

// Tool implementations
async function getComponentCatalog(args: any, workspaceRoot: string): Promise<any> {
  const componentRoot = path.join(workspaceRoot, 'packages', 'components');
  const filter = (args?.filter as string | undefined)?.toLowerCase();
  const specificComponent = (args?.componentName as string | undefined)?.toLowerCase();

  let entries: fs.Dirent[] = [];
  try {
    entries = await fs.promises.readdir(componentRoot, { withFileTypes: true });
  } catch (error) {
    throw new Error(`Failed to read component directory at ${componentRoot}: ${(error as Error).message}`);
  }

  const components = await Promise.all(
    entries
      .filter(entry => entry.isDirectory())
      .map(async entry => {
        const dirName = entry.name;
        const pkgPath = path.join(componentRoot, dirName, 'package.json');
        if (!fs.existsSync(pkgPath)) {
          return null;
        }

        try {
          const pkgRaw = await fs.promises.readFile(pkgPath, 'utf8');
          const pkg = JSON.parse(pkgRaw);
          return {
            name: pkg.name ?? dirName,
            version: pkg.version ?? '0.0.0',
            description: pkg.description ?? '',
            tags: pkg.keywords ?? [],
            component: pkg.component ?? {},
            path: `packages/components/${dirName}`
          };
        } catch (error) {
          Logger.getLogger('shinobi-mcp-server').warn(`Failed to load metadata for component ${dirName}`, {
            data: { componentName: dirName, errorMessage: (error as Error).message }
          });
          return {
            name: dirName,
            version: 'unknown',
            description: 'Failed to read package metadata',
            tags: [],
            component: {},
            path: `packages/components/${dirName}`
          };
        }
      })
  );

  const filteredComponents = components
    .filter((component): component is NonNullable<typeof component> => component !== null)
    .filter(component => {
      const name = (component.name ?? '').toLowerCase();
      if (specificComponent && name !== specificComponent && component.path.toLowerCase() !== `packages/components/${specificComponent}`) {
        return false;
      }
      if (filter) {
        return (
          name.includes(filter) ||
          (component.description ?? '').toLowerCase().includes(filter) ||
          (component.tags ?? []).some((tag: string) => tag.toLowerCase().includes(filter))
        );
      }
      return true;
    });

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({ components: filteredComponents }, null, 2)
      }
    ]
  };
}

async function getComponentSchema(args: any, workspaceRoot: string): Promise<any> {
  const componentName = args?.componentName ?? args?.name;
  if (!componentName || typeof componentName !== 'string') {
    throw new Error('componentName argument is required to retrieve a component schema');
  }

  const componentRoot = path.join(workspaceRoot, 'packages', 'components', componentName);
  const schemaPath = path.join(componentRoot, 'Config.schema.json');

  if (!fs.existsSync(schemaPath)) {
    throw new Error(`Config.schema.json not found for component '${componentName}' at ${schemaPath}`);
  }

  let schema: unknown;
  try {
    const schemaRaw = await fs.promises.readFile(schemaPath, 'utf8');
    schema = JSON.parse(schemaRaw);
  } catch (error) {
    throw new Error(`Failed to load schema for component '${componentName}': ${(error as Error).message}`);
  }

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(schema, null, 2)
      }
    ]
  };
}

async function getCapabilityCatalog(args: { includeAliases?: boolean }): Promise<any> {
  const includeAliases = args?.includeAliases ?? false;
  const registry = new ComprehensiveBinderRegistry();

  const strategyEntries = new Map<object, { primary: string; aliases: Set<string>; capabilities: string[] }>();

  for (const serviceType of registry.getAllServiceTypes()) {
    const strategy = registry.get(serviceType);
    if (!strategy) {
      continue;
    }

    if (!strategyEntries.has(strategy)) {
      strategyEntries.set(strategy, {
        primary: serviceType,
        aliases: new Set<string>(),
        capabilities: strategy.supportedCapabilities
      });
    } else if (includeAliases) {
      strategyEntries.get(strategy)!.aliases.add(serviceType);
    }
  }

  const capabilityMap = new Map<string, { providers: Set<string>; aliases: Set<string> }>();

  for (const entry of strategyEntries.values()) {
    for (const capability of entry.capabilities) {
      if (!capabilityMap.has(capability)) {
        capabilityMap.set(capability, { providers: new Set<string>(), aliases: new Set<string>() });
      }
      const bucket = capabilityMap.get(capability)!;
      bucket.providers.add(entry.primary);
      if (includeAliases) {
        entry.aliases.forEach(alias => bucket.aliases.add(alias));
      }
    }
  }

  const capabilities = Array.from(capabilityMap.entries())
    .map(([capability, data]) => ({
      capability,
      providers: Array.from(data.providers).sort(),
      aliases: includeAliases ? Array.from(data.aliases).sort() : undefined
    }))
    .sort((a, b) => a.capability.localeCompare(b.capability));

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({ capabilities }, null, 2)
      }
    ]
  };
}

async function getBindingMatrix(args: { includeAliases?: boolean; includeRecommendations?: boolean }): Promise<any> {
  const includeAliases = args?.includeAliases ?? false;
  const includeRecommendations = args?.includeRecommendations ?? true;

  const registry = new ComprehensiveBinderRegistry();
  const strategyEntries = new Map<object, { primary: string; aliases: Set<string>; capabilities: string[]; recommendations: string[] }>();

  for (const serviceType of registry.getAllServiceTypes()) {
    const strategy = registry.get(serviceType);
    if (!strategy) {
      continue;
    }

    if (!strategyEntries.has(strategy)) {
      const recommendations = includeRecommendations ? registry.getBindingRecommendations(serviceType) : [];
      strategyEntries.set(strategy, {
        primary: serviceType,
        aliases: new Set<string>(),
        capabilities: strategy.supportedCapabilities,
        recommendations
      });
    } else if (includeAliases) {
      strategyEntries.get(strategy)!.aliases.add(serviceType);
    }
  }

  const bindings = Array.from(strategyEntries.values()).map(entry => ({
    serviceType: entry.primary,
    aliases: includeAliases ? Array.from(entry.aliases).sort() : undefined,
    supportedCapabilities: entry.capabilities,
    recommendations: includeRecommendations ? entry.recommendations : undefined
  }));

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({ bindings }, null, 2)
      }
    ]
  };
}

async function getComponentPatterns(args: any, workspaceRoot: string): Promise<any> {
  const patternType = (args?.patternType as string | undefined)?.toLowerCase();
  const patterns = await loadComponentPatterns(workspaceRoot);

  const filteredPatterns = patternType && patternType !== 'all'
    ? patterns.filter(pattern => pattern.type === patternType)
    : patterns;

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({ patterns: filteredPatterns }, null, 2)
      }
    ]
  };
}

async function expandPattern(args: any, workspaceRoot: string): Promise<any> {
  const patternId = (args?.intent ?? args?.patternId ?? args?.id) as string | undefined;
  if (!patternId) {
    throw new Error('patternId or intent argument is required to expand a component pattern');
  }

  const patterns = await loadComponentPatterns(workspaceRoot);
  const pattern = patterns.find(entry => entry.id === patternId || entry.name === patternId);

  if (!pattern) {
    throw new Error(`Pattern '${patternId}' was not found in the platform knowledge base`);
  }

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(pattern, null, 2)
      }
    ]
  };
}

// Module export with unified interface
export const discoveryDomain: DomainModule = {
  getToolDefinitions: () => DISCOVERY_TOOLS,
  
  handleToolCall: async (name: string, args: any, context: DomainContext) => {
    const { workspaceRoot } = context;
    
    switch (name) {
      case 'get_component_catalog':
        return getComponentCatalog(args, workspaceRoot);
      case 'get_component_schema':
        return getComponentSchema(args, workspaceRoot);
      case 'get_capability_catalog':
        return getCapabilityCatalog(args);
      case 'get_binding_matrix':
        return getBindingMatrix(args);
      case 'get_component_patterns':
        return getComponentPatterns(args, workspaceRoot);
      case 'expand_pattern':
        return expandPattern(args, workspaceRoot);
      default:
        throw new Error(`Unknown discovery tool: ${name}`);
    }
  }
};

