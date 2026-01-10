import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema
} from "@modelcontextprotocol/sdk/types.js";
import { createDaggerClientFactory, createRepositoryScanner } from "../dagger/scan-repo.js";
import { loadRuntimeConfig } from "../config/runtime.js";

function createToolHandlers({ scanRepository }) {
  return {
    analyze_repo: async (request) => {
      const repoUrl = request.params.arguments?.repo_url;
      if (typeof repoUrl !== "string") {
        throw new Error("repo_url must be a string");
      }

      try {
        console.error(`[MCP Server] Calling scanRepository for ${repoUrl}...`);
        const result = await scanRepository(repoUrl);

        if (!result) {
          console.error(`[MCP Server] scanRepository returned no result.`);
          return {
            isError: true,
            content: [
              {
                type: "text",
                text: "Dagger scan returned no result"
              }
            ]
          };
        }

        console.error(`[MCP Server] scanRepository success.`);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result)
            }
          ]
        };
      } catch (error) {
        console.error(`[MCP Server] Error in tool handler: ${error.stack}`);
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Error analyzing repository: ${error.message}`
            }
          ]
        };
      }
    }
  };
}

export function createMcpServer({ config, scanRepository }) {
  const server = new Server(
    {
      name: config.mcp.serverName,
      version: config.mcp.serverVersion
    },
    {
      capabilities: {
        tools: {}
      }
    }
  );

  const handlers = createToolHandlers({ scanRepository });

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: "analyze_repo",
          description: "Clone a repository with Dagger and return README + file tree.",
          inputSchema: {
            type: "object",
            properties: {
              repo_url: {
                type: "string",
                format: "uri",
                description: "Git repository URL to analyze."
              }
            },
            required: ["repo_url"]
          }
        }
      ]
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const handler = handlers[request.params.name];
    if (!handler) {
      throw new Error(`Unknown tool: ${request.params.name}`);
    }

    return handler(request);
  });

  return server;
}

const config = loadRuntimeConfig();
const daggerClientFactory = createDaggerClientFactory();
const scanRepository = createRepositoryScanner({ daggerClientFactory });
const server = createMcpServer({ config, scanRepository });

const transport = new StdioServerTransport();
await server.connect(transport);
