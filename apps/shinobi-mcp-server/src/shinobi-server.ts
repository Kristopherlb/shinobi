/**
 * Shinobi MCP Server - The Platform Intelligence Brain
 * 
 * A production-grade MCP Server that provides platform intelligence capabilities
 * through a comprehensive set of tools and resources for SRE/DevOps/DPE/Developers
 * and leadership.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { ShinobiConfig } from './config.js';
import { PlatformLogger as Logger } from '@shinobi/core';
import { findWorkspaceRoot } from './utils.js';
import { DomainContext } from './types.js';
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'yaml';

// Import domain modules
import { discoveryDomain } from './discovery.js';
import { topologyDomain } from './topology.js';
import { manifestDomain } from './manifest.js';
import { reliabilityOpsDomain } from './reliability-ops.js';
import { securityDomain } from './security.js';
import { qaTestingDomain } from './qa-testing.js';
import { costFinopsDomain } from './cost-finops.js';
import { developerExperienceDomain } from './developer-experience.js';
import { governanceDomain } from './governance.js';
import { auditToolsDomain } from './audit-tools.js';
import { SHINOBI_RESOURCES, readResource } from './resources.js';

/**
 * Platform KB Types
 */
interface PlatformKBIndex {
  packs: string[];
  observability: string[];
  controls: string[];
  schemas: string[];
}

interface PackMeta {
  id: string;
  name: string;
  description: string;
  file: string;
  tags: string[];
}

interface ComponentPattern {
  id: string;
  name: string;
  description?: string;
  type: string;
  file: string;
  data: any;
}

interface PackRule {
  id: string;
  name: string;
  description: string;
  check: {
    name: string;
    type: 'property' | 'posture';
    assertion?: string;
  };
  services: string[];
  resource_kinds: string[];
  nist_controls: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
}

interface Pack {
  id: string;
  name: string;
  description: string;
  rules: PackRule[];
  metadata: {
    framework?: string;
    service_type?: string;
    tags: string[];
  };
}

interface CompliancePlan {
  packs: string[];
  rules: PackRule[];
  nist_controls: string[];
  service_type: string;
  framework: string;
  gaps?: string[];
}

interface ComponentGenerationRequest {
  componentName: string;
  serviceType: string;
  framework: 'commercial' | 'fedramp-low' | 'fedramp-moderate' | 'fedramp-high';
  packsToInclude?: string[];
  extraControlTags?: string[];
}

/**
 * Shinobi MCP Server Implementation
 */
export class ShinobiMcpServer {
  private server: Server;
  private config: ShinobiConfig;
  private patternCache?: ComponentPattern[];

  constructor(config: ShinobiConfig) {
    this.config = config;
    this.server = new Server({
      name: 'shinobi-mcp-server',
      version: '1.0.0',
    });

    this.setupHandlers();
  }

  /**
   * Start the MCP server with stdio or SSE transport
   */
  async start(): Promise<void> {
    const useSSE = process.env.MCP_USE_SSE === 'true' || process.env.PORT;
    const logger = Logger.getLogger('shinobi-mcp-server');

    if (useSSE) {
      // SSE transport for HTTP-based connections (Docker, production)
      const { SSEServerTransport } = await import('@modelcontextprotocol/sdk/server/sse.js');
      const { Server } = await import('@modelcontextprotocol/sdk/server/index.js');
      const express = await import('express');
      
      const app = express.default();
      const port = parseInt(process.env.PORT || '3000', 10);
      
      // Store dedicated Server instance per session to avoid connection conflicts
      const sessions = new Map<string, { server: any; transport: any }>();

      // Health check endpoint
      app.get('/health', (_req, res) => {
        res.json({ status: 'healthy', service: 'shinobi-mcp-server' });
      });

      // MCP SSE endpoint - establish SSE connection with dedicated Server instance
      app.get('/sse', async (req, res) => {
        logger.info('SSE connection established', {
          data: {
            remoteAddress: req.ip,
            userAgent: req.headers['user-agent']
          }
        });

        // Create dedicated Server instance for this connection
        const dedicatedServer = new Server({
          name: 'shinobi-mcp-server',
          version: '1.0.0',
        });
        
        // Copy all handlers from main server to dedicated instance
        this.setupHandlersForServer(dedicatedServer);
        
        const transport = new SSEServerTransport('/message', res);
        await dedicatedServer.connect(transport);
        
        // Store session with dedicated server and transport
        sessions.set(transport.sessionId, { server: dedicatedServer, transport });
        
        // Clean up on close
        transport.onclose = () => {
          sessions.delete(transport.sessionId);
          logger.info('SSE connection closed', {
            data: { sessionId: transport.sessionId }
          });
        };
      });

      // MCP message endpoint - receive JSON-RPC messages from client
      // Note: Do NOT use express.json() - SSEServerTransport needs raw request stream
      app.post('/message', async (req, res) => {
        const sessionId = req.query.sessionId as string;
        
        if (!sessionId) {
          res.status(400).json({ error: 'Missing sessionId' });
          return;
        }
        
        const session = sessions.get(sessionId);
        if (!session) {
          res.status(404).json({ error: 'Session not found' });
          return;
        }
        
        // Let the transport handle the incoming message (it will parse the body)
        await session.transport.handlePostMessage(req, res);
      });

      app.listen(port, () => {
        logger.info('Shinobi MCP Server started (SSE)', {
          data: {
            service: 'shinobi-mcp-server',
            transport: 'sse',
            port,
            endpoints: {
              health: `http://localhost:${port}/health`,
              sse: `http://localhost:${port}/sse`
            }
          }
        });
      });
    } else {
      // Stdio transport for local development (Cursor stdio mode)
      process.env.MCP_TRANSPORT = 'stdio';
      
      const transport = new StdioServerTransport();
      await this.server.connect(transport);

      logger.info('Shinobi MCP Server started (stdio)', {
        data: {
          service: 'shinobi-mcp-server',
          transport: 'stdio'
        }
      });
    }
  }

  /**
   * Find the workspace root by looking for package.json with workspaces
   */
  private setupHandlers(): void {
    this.setupHandlersForServer(this.server);
  }

  /**
   * Configure MCP protocol handlers for a given server instance
   * Uses modular domain architecture for maintainability
   */
  private setupHandlersForServer(server: Server): void {
    const workspaceRoot = findWorkspaceRoot();
    const context: DomainContext = { workspaceRoot };
    
    // All domain modules
    const domains = [
      discoveryDomain,
      topologyDomain,
      manifestDomain,
      reliabilityOpsDomain,
      securityDomain,
      qaTestingDomain,
      costFinopsDomain,
      developerExperienceDomain,
      governanceDomain,
      auditToolsDomain
    ];
    
    // List available tools (delegated to domain modules)
    server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: domains.flatMap(domain => domain.getToolDefinitions())
      };
    });

    // List available resources
    server.setRequestHandler(ListResourcesRequestSchema, async () => {
      return {
        resources: SHINOBI_RESOURCES
      };
    });

    // Read resources (delegated to resources module)
    server.setRequestHandler(ReadResourceRequestSchema, async (request: any) => {
      const { uri } = request.params;

      // Delegate to resources module with discovery domain tools
      return readResource(
        uri,
        context,
        (args) => discoveryDomain.handleToolCall('get_component_catalog', args, context),
        (args) => discoveryDomain.handleToolCall('get_capability_catalog', args, context),
        (args) => discoveryDomain.handleToolCall('get_binding_matrix', args, context)
      );
    });

    // Handle tool calls (delegated to domain modules)
    server.setRequestHandler(CallToolRequestSchema, async (request: any) => {
      const { name, arguments: args } = request.params;

      try {
        // Find the domain that handles this tool
        for (const domain of domains) {
          const toolDefs = domain.getToolDefinitions();
          if (toolDefs.some(tool => tool.name === name)) {
            return await domain.handleToolCall(name, args, context);
          }
        }
        
        // If no domain handles it, throw error
            throw new Error(`Unknown tool: ${name}`);

      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error executing tool ${name}: ${error instanceof Error ? error.message : String(error)}`
            }
          ],
          isError: true
        };
      }
    });
  }
}
