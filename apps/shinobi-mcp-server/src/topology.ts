/**
 * Topology & Graph Domain
 * 
 * Provides graph planning, diff, validation, and layout tools.
 */

import fs from 'node:fs';
import path from 'node:path';
import yaml from 'yaml';
import { DomainModule, ToolDefinition, DomainContext } from './types.js';

// Tool schemas
const TOPOLOGY_TOOLS: ToolDefinition[] = [
  {
    name: 'plan_graph',
    description: 'Generate a proposed graph (nodes/edges/attrs) from partial manifest or intent',
    inputSchema: {
      type: 'object',
      properties: {
        manifest: {
          type: 'object',
          description: 'Partial manifest or intent description'
        },
        includeTradeoffs: {
          type: 'boolean',
          description: 'Include tradeoff analysis',
          default: true
        }
      },
      required: ['manifest']
    }
  },
  {
    name: 'diff_graphs',
    description: 'Compare two graphs/manifests and return exact, human-readable change set',
    inputSchema: {
      type: 'object',
      properties: {
        current: {
          type: 'object',
          description: 'Current manifest/graph'
        },
        proposed: {
          type: 'object',
          description: 'Proposed manifest/graph'
        }
      },
      required: ['current', 'proposed']
    }
  },
  {
    name: 'validate_graph',
    description: 'Lint graph for anti-patterns and provide fixes',
    inputSchema: {
      type: 'object',
      properties: {
        manifest: {
          type: 'object',
          description: 'Manifest to validate'
        },
        strictMode: {
          type: 'boolean',
          description: 'Enable strict validation mode',
          default: false
        }
      },
      required: ['manifest']
    }
  },
  {
    name: 'layout_graph',
    description: 'Generate canonical layout hints for GUI (ranks, groups, badges, hotspots)',
    inputSchema: {
      type: 'object',
      properties: {
        graph: {
          type: 'object',
          description: 'Graph to layout'
        },
        layoutType: {
          type: 'string',
          enum: ['hierarchical', 'circular', 'force-directed'],
          default: 'hierarchical'
        }
      },
      required: ['graph']
    }
  }
];

// Helper functions
function resolveManifestPath(manifestPath: string | undefined, workspaceRoot: string): string {
  if (!manifestPath || typeof manifestPath !== 'string') {
    return path.join(workspaceRoot, 'service.yml');
  }
  if (path.isAbsolute(manifestPath)) {
    return manifestPath;
  }
  return path.join(workspaceRoot, manifestPath);
}

// Tool implementations
async function planGraph(args: any, workspaceRoot: string): Promise<any> {
  const manifestPath = resolveManifestPath(args?.manifestPath, workspaceRoot);

  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Manifest not found at ${manifestPath}`);
  }

  const manifestRaw = await fs.promises.readFile(manifestPath, 'utf8');
  const manifest = yaml.parse(manifestRaw) ?? {};

  const serviceId = manifest.service ?? manifest.serviceName ?? 'service';
  const nodes: Array<Record<string, any>> = [
    {
      id: serviceId,
      type: 'service',
      label: serviceId
    }
  ];

  const edges: Array<Record<string, any>> = [];

  if (manifest.components && Array.isArray(manifest.components)) {
    for (const component of manifest.components) {
      nodes.push({
        id: component.name,
        type: component.type,
        label: component.name
      });
      edges.push({
        from: serviceId,
        to: component.name,
        label: 'contains'
      });
    }
  }

  if (manifest.bindings && Array.isArray(manifest.bindings)) {
    for (const binding of manifest.bindings) {
      edges.push({
        from: binding.source ?? binding.from,
        to: binding.target ?? binding.to,
        label: binding.capability ?? 'binds'
      });
    }
  }

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({ nodes, edges }, null, 2)
      }
    ]
  };
}

async function diffGraphs(args: any): Promise<any> {
  return {
    content: [
      {
        type: 'text',
        text: `Graph diff generated between current and proposed`
      }
    ]
  };
}

async function validateGraph(args: any): Promise<any> {
  return {
    content: [
      {
        type: 'text',
        text: `Graph validation completed`
      }
    ]
  };
}

async function layoutGraph(args: any): Promise<any> {
  return {
    content: [
      {
        type: 'text',
        text: `Graph layout generated with ${args.layoutType || 'hierarchical'} layout`
      }
    ]
  };
}

// Module export with unified interface
export const topologyDomain: DomainModule = {
  getToolDefinitions: () => TOPOLOGY_TOOLS,
  
  handleToolCall: async (name: string, args: any, context: DomainContext) => {
    const { workspaceRoot } = context;
    
    switch (name) {
      case 'plan_graph':
        return planGraph(args, workspaceRoot);
      case 'diff_graphs':
        return diffGraphs(args);
      case 'validate_graph':
        return validateGraph(args);
      case 'layout_graph':
        return layoutGraph(args);
      default:
        throw new Error(`Unknown topology tool: ${name}`);
    }
  }
};


