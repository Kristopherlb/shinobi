import { AgentStateSchema, ToolResultSchema } from "../agent/state.js";
import { buildPlan } from "../agent/plan.js";
import { reviewAnalysis } from "../agent/review.js";
import { analyzeRepository, createMcpClient } from "../mcp/client.js";
import { retrieveRelevantTools } from "../tool-index/retrieval.js";

export async function planActivity(state) {
  const parsed = AgentStateSchema.parse(state);
  const tools = await retrieveRelevantTools(parsed.goal);

  return {
    ...parsed,
    plan: buildPlan(parsed, tools)
  };
}

export async function executeActivity(state) {
  const parsed = AgentStateSchema.parse(state);
  const client = await createMcpClient();
  const result = await analyzeRepository(client, parsed.repositoryUrl);
  await client.close();

  const toolResult = ToolResultSchema.parse(result);

  return {
    ...parsed,
    readme: toolResult.readme,
    tree: toolResult.tree
  };
}

export async function reviewActivity(state) {
  const parsed = AgentStateSchema.parse(state);
  return {
    ...parsed,
    notes: reviewAnalysis({ readme: parsed.readme, tree: parsed.tree })
  };
}
