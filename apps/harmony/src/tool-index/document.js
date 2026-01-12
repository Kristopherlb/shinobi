export function toolDefinitionId(serverId, toolName) {
  return `${serverId}:${toolName}`;
}

export function buildToolDocument(definition) {
  const name = definition?.name ?? "";
  const description = definition?.description ?? "";
  const schema = definition?.inputSchema
    ? JSON.stringify(definition.inputSchema)
    : "";

  return [name, description, schema].filter(Boolean).join("\n");
}
