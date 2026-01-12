import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("../src/tool-index/retrieval.js", () => ({
  retrieveRelevantTools: vi.fn(async () => [{ name: "tool_from_index" }])
}));

vi.mock("../src/mcp/client.js", () => ({
  listTools: vi.fn(async () => [{ name: "tool_from_mcp" }]),
  analyzeRepository: vi.fn(async () => ({ readme: "", tree: "" }))
}));

const originalToolIndexEnabled = process.env.TOOL_INDEX_ENABLED;

describe("tool selection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    if (originalToolIndexEnabled === undefined) {
      delete process.env.TOOL_INDEX_ENABLED;
    } else {
      process.env.TOOL_INDEX_ENABLED = originalToolIndexEnabled;
    }
  });

  it("SelectTools__ToolIndexDisabled__FallsBackToMcpTools", async () => {
    process.env.TOOL_INDEX_ENABLED = "false";

    const { createAgentGraph } = await import("../src/agent/graph.js");
    const { listTools } = await import("../src/mcp/client.js");
    const { retrieveRelevantTools } = await import("../src/tool-index/retrieval.js");

    const mcpClientFactory = {
      withClient: async (fn) => fn({})
    };

    const planner = vi.fn(async (_state, tools) => tools.map((tool) => tool.name));
    const reviewer = vi.fn(async () => []);

    const app = createAgentGraph({ mcpClientFactory, planner, reviewer });

    const result = await app.invoke({
      goal: "do something",
      repositoryUrl: "https://example.com/repo.git",
      messages: [],
      plan: [],
      readme: "",
      tree: "",
      notes: []
    });

    expect(retrieveRelevantTools).not.toHaveBeenCalled();
    expect(listTools).toHaveBeenCalledTimes(1);
    expect(result.plan).toEqual(["tool_from_mcp"]);
  });
});


