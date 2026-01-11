import { loadRuntimeConfig, resolveFromAppRoot } from "../config/runtime.js";
import { createMcpClientFactory } from "../mcp/client.js";
import { createLlmClient } from "../llm/client.js";
import { createPlanner } from "../agent/plan.js";
import { createReviewer } from "../agent/review.js";

export function createRuntimeDependencies({ llmResponder } = {}) {
  const config = loadRuntimeConfig();
  const mcpClientFactory = createMcpClientFactory({
    name: config.mcp.clientName,
    version: config.mcp.clientVersion,
    command: config.mcp.serverCommand,
    serverEntry: resolveFromAppRoot(config.mcp.serverEntry)
  });

  const llmClient = createLlmClient({
    provider: config.llm.provider,
    apiKey: process.env.HARMONY_LLM_API_KEY,
    apiBaseUrl: config.llm.apiBaseUrl,
    model: config.llm.model,
    temperature: config.llm.temperature,
    responder: llmResponder
  });

  const planner = createPlanner({ llmClient, maxRetries: config.llm.maxRetries });
  const reviewer = createReviewer({ llmClient, maxRetries: config.llm.maxRetries });

  return {
    config,
    mcpClientFactory,
    llmClient,
    planner,
    reviewer
  };
}
