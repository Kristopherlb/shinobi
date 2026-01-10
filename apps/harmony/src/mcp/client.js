import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import {
  CallToolResultSchema,
  ListToolsResultSchema
} from "@modelcontextprotocol/sdk/types.js";
import { ToolResultSchema } from "../agent/state.js";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const currentDir = dirname(fileURLToPath(import.meta.url));
const serverPath = resolve(currentDir, "./server.js");

export async function createMcpClient() {
  const client = new Client({
    name: "shinobi-harmony-client",
    version: "0.1.0"
  });

  const transport = new StdioClientTransport({
    command: "node",
    args: [serverPath]
  });

  await client.connect(transport);
  return client;
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
  if (!textBlock || typeof textBlock.text !== "string") {
    throw new Error("Tool response missing text payload");
  }

  const parsed = JSON.parse(textBlock.text);
  return ToolResultSchema.parse(parsed);
}
