import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema
} from "@modelcontextprotocol/sdk/types.js";
import { runScan } from "../dagger/scan-repo.js";

const server = new Server(
  {
    name: "shinobi-harmony",
    version: "0.1.0"
  },
  {
    capabilities: {
      tools: {}
    }
  }
);

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
  if (request.params.name !== "analyze_repo") {
    throw new Error(`Unknown tool: ${request.params.name}`);
  }

  const repoUrl = request.params.arguments?.repo_url;
  if (typeof repoUrl !== "string") {
    throw new Error("repo_url must be a string");
  }

  const result = await runScan(repoUrl);

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(result)
      }
    ]
  };
});

const transport = new StdioServerTransport();
await server.connect(transport);
