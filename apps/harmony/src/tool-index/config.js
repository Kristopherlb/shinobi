export const DEFAULT_EMBEDDING_MODEL = "text-embedding-3-small";
export const DEFAULT_TOOL_LIMIT = 5;
export const DEFAULT_EMBEDDING_BASE_URL = "https://api.openai.com/v1";
export const EMBEDDING_DIMENSIONS = 1536;

export function getDatabaseUrl() {
  const url = process.env.TOOL_INDEX_DATABASE_URL;
  if (!url) {
    throw new Error("TOOL_INDEX_DATABASE_URL is required for tool retrieval");
  }
  return url;
}

export function getEmbeddingApiKey() {
  const apiKey = process.env.EMBEDDING_API_KEY;
  if (!apiKey) {
    throw new Error("EMBEDDING_API_KEY is required for tool embeddings");
  }
  return apiKey;
}

export function getEmbeddingModel() {
  return process.env.EMBEDDING_MODEL ?? DEFAULT_EMBEDDING_MODEL;
}

export function getEmbeddingBaseUrl() {
  return process.env.EMBEDDING_BASE_URL ?? DEFAULT_EMBEDDING_BASE_URL;
}

export function getMcpServerId() {
  return process.env.MCP_SERVER_ID ?? "local-stdio";
}
