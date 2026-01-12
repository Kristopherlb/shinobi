import {
  DEFAULT_TOOL_LIMIT,
  EMBEDDING_DIMENSIONS,
  getDatabaseUrl,
  getEmbeddingBaseUrl,
  getEmbeddingModel,
  getEmbeddingApiKey
} from "./config.js";
import { retrieveRelevantTools as retrieveFromServices } from "./services.js";
import { HttpEmbeddingProvider } from "./infra/http-embedding-provider.js";
import { PostgresToolStore } from "./infra/postgres-tool-store.js";

export async function retrieveRelevantTools(query, { limit = DEFAULT_TOOL_LIMIT } = {}) {
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
    return await retrieveFromServices({
      query,
      toolStore,
      embeddingProvider,
      limit
    });
  } finally {
    await toolStore.close();
  }
}
