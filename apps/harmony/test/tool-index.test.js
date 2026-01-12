import { describe, expect, it, vi, beforeEach } from "vitest";
import { buildToolDocument, toolDefinitionId } from "../src/tool-index/document.js";
import { ingestToolDefinitions, retrieveRelevantTools } from "../src/tool-index/services.js";

const definition = {
  name: "restart_service",
  description: "Restart a service",
  inputSchema: { type: "object", properties: { service: { type: "string" } } }
};

describe("tool-index helpers", () => {
  it("toolDefinitionId builds a stable id", () => {
    expect(toolDefinitionId("aws-mcp", "restart_service")).toBe("aws-mcp:restart_service");
  });

  it("buildToolDocument concatenates name, description, and schema", () => {
    const doc = buildToolDocument(definition);
    expect(doc).toContain("restart_service");
    expect(doc).toContain("Restart a service");
    expect(doc).toContain("\"service\"");
  });
});

describe("tool-index services", () => {
  const toolStore = {
    ensureSchema: vi.fn(),
    upsertToolDefinition: vi.fn(),
    querySimilarTools: vi.fn(),
    close: vi.fn()
  };
  const embeddingProvider = {
    embedText: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("ingestToolDefinitions stores embeddings for each tool", async () => {
    embeddingProvider.embedText.mockResolvedValue([0.1, 0.2]);

    await ingestToolDefinitions({
      tools: [definition],
      toolStore,
      embeddingProvider,
      serverId: "aws-mcp"
    });

    expect(toolStore.ensureSchema).toHaveBeenCalled();
    expect(embeddingProvider.embedText).toHaveBeenCalled();
    expect(toolStore.upsertToolDefinition).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "aws-mcp:restart_service",
        name: "restart_service"
      }),
      [0.1, 0.2]
    );
  });

  it("retrieveRelevantTools queries the store using embedded query", async () => {
    toolStore.querySimilarTools.mockResolvedValue([{ name: "restart_service" }]);
    embeddingProvider.embedText.mockResolvedValue([0.5, 0.6]);

    const results = await retrieveRelevantTools({
      query: "fix server",
      toolStore,
      embeddingProvider,
      limit: 3
    });

    expect(toolStore.ensureSchema).toHaveBeenCalled();
    expect(embeddingProvider.embedText).toHaveBeenCalledWith("fix server");
    expect(toolStore.querySimilarTools).toHaveBeenCalledWith([0.5, 0.6], { limit: 3 });
    expect(results).toEqual([{ name: "restart_service" }]);
  });
});
