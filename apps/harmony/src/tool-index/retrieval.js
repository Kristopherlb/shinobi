import {
  DEFAULT_TOOL_LIMIT,
  EMBEDDING_DIMENSIONS,
  getDatabaseUrl,
  getEmbeddingBaseUrl,
  getEmbeddingModel,
  getEmbeddingApiKey
} from "./config.js";
import { retrieveRelevantTools as retrieveFromServices } from "./services.js";

export async function retrieveRelevantTools(query, { limit = DEFAULT_TOOL_LIMIT } = {}) {
  // Resolve config first so missing env vars fail fast without requiring DB/pg deps
  const connectionString = getDatabaseUrl();
  const apiKey = getEmbeddingApiKey();
  const baseUrl = getEmbeddingBaseUrl();
  const model = getEmbeddingModel();

  const [{ PostgresToolStore }, { HttpEmbeddingProvider }] = await Promise.all([
    import("./infra/postgres-tool-store.js"),
    import("./infra/http-embedding-provider.js")
  ]);

  const toolStore = new PostgresToolStore({
    connectionString,
    dimensions: EMBEDDING_DIMENSIONS
  });
  const embeddingProvider = new HttpEmbeddingProvider({
    apiKey,
    baseUrl,
    model
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
