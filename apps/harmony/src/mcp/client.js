import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import {
  CallToolResultSchema,
  ListToolsResultSchema
} from "@modelcontextprotocol/sdk/types.js";
import { ToolResultSchema } from "../agent/state.js";

export function createMcpClientFactory({ name, version, command, serverEntry }) {
  async function createClient() {
    const client = new Client({ name, version });
    const transport = new StdioClientTransport({
      command,
      args: [serverEntry]
    });

    await client.connect(transport);
    return client;
  }

  async function withClient(callback) {
    const client = await createClient();
    try {
      return await callback(client);
    } finally {
      await client.close();
    }
  }

  return {
    createClient,
    withClient
  };
}

export async function listTools(client) {
  const result = await client.request({ method: "tools/list" }, ListToolsResultSchema);
  return result.tools;
}

export async function analyzeRepository(client, repoUrl) {
  const result = await client.request(
    {
      method: "tools/call",
      params: {
        name: "analyze_repo",
        arguments: {
          repo_url: repoUrl
        }
      }
    },
    CallToolResultSchema
  );

  const textBlock = result.content.find((item) => item.type === "text");

  if (result.isError || !textBlock || typeof textBlock.text !== "string") {
    throw new Error(`MCP Tool Error: ${textBlock?.text || "Unknown tool error or missing payload"}`);
  }

  try {
    const parsed = JSON.parse(textBlock.text);
    return ToolResultSchema.parse(parsed);
  } catch (err) {
    throw new Error(`Failed to parse tool response: ${textBlock.text}`);
  }
}
