/**
 * MCP Resources Handler
 * 
 * Provides shinobi:// resource endpoints for platform data.
 */

import { DomainContext } from './types.js';

export interface ResourceDefinition {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
}

export const SHINOBI_RESOURCES: ResourceDefinition[] = [
  {
    uri: 'shinobi://components',
    name: 'Component Catalog',
    description: 'Catalog of all available platform components',
    mimeType: 'application/json'
  },
  {
    uri: 'shinobi://capabilities',
    name: 'Capability Vocabulary',
    description: 'Canonical platform capability registry with providers',
    mimeType: 'application/json'
  },
  {
    uri: 'shinobi://bindings',
    name: 'Binding Matrix',
    description: 'Supported bindings between source components and capabilities',
    mimeType: 'application/json'
  }
];

/**
 * Read resource content
 * Delegates to discovery domain tools for actual data
 */
export async function readResource(
  uri: string,
  context: DomainContext,
  getComponentCatalog: (args: any) => Promise<any>,
  getCapabilityCatalog: (args: any) => Promise<any>,
  getBindingMatrix: (args: any) => Promise<any>
): Promise<any> {
  switch (uri) {
    case 'shinobi://components': {
      const data = await getComponentCatalog({});
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(data, null, 2)
          }
        ]
      };
    }

    case 'shinobi://capabilities': {
      const capabilities = await getCapabilityCatalog({ includeAliases: false });
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(capabilities, null, 2)
          }
        ]
      };
    }

    case 'shinobi://bindings': {
      const bindings = await getBindingMatrix({ includeAliases: false, includeRecommendations: true });
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(bindings, null, 2)
          }
        ]
      };
    }

    default:
      throw new Error(`Unknown resource: ${uri}`);
  }
}


