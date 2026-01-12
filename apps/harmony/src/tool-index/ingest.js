import { createMcpClient, listTools } from "../mcp/client.js";
import {
  EMBEDDING_DIMENSIONS,
  getDatabaseUrl,
  getEmbeddingBaseUrl,
  getEmbeddingModel,
  getMcpServerId,
  getEmbeddingApiKey
} from "./config.js";
import { ingestToolDefinitions } from "./services.js";
import { HttpEmbeddingProvider } from "./infra/http-embedding-provider.js";
import { PostgresToolStore } from "./infra/postgres-tool-store.js";

export async function ingestTools() {
  const client = await createMcpClient();
  const tools = await listTools(client);
  await client.close();

  const serverId = getMcpServerId();
  const toolStore = new PostgresToolStore({
    connectionString: getDatabaseUrl(),
    dimensions: EMBEDDING_DIMENSIONS
  });
  const embeddingProvider = new HttpEmbeddingProvider({
    apiKey: getEmbeddingApiKey(),
    baseUrl: getEmbeddingBaseUrl(),
    model: getEmbeddingModel()
  });

  try {
    await ingestToolDefinitions({
      tools,
      toolStore,
      embeddingProvider,
      serverId
    });
  } finally {
    await toolStore.close();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  ingestTools().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
