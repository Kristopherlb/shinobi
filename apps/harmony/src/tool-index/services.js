import { buildToolDocument, toolDefinitionId } from "./document.js";

export async function ingestToolDefinitions({ tools, toolStore, embeddingProvider, serverId }) {
  await toolStore.ensureSchema();

  for (const tool of tools) {
    const definition = {
      id: toolDefinitionId(serverId, tool.name),
      name: tool.name,
      description: tool.description ?? "",
      inputSchema: tool.inputSchema ?? {},
      mcpServerId: serverId
    };

    const document = buildToolDocument(definition);
    const embedding = await embeddingProvider.embedText(document);
    await toolStore.upsertToolDefinition(definition, embedding);
  }
}

export async function retrieveRelevantTools({ query, toolStore, embeddingProvider, limit }) {
  await toolStore.ensureSchema();

  const embedding = await embeddingProvider.embedText(query);
  return toolStore.querySimilarTools(embedding, { limit });
}
