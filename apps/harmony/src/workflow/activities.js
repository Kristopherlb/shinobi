import { AgentStateSchema, ToolResultSchema } from "../agent/state.js";
import { analyzeRepository, listTools } from "../mcp/client.js";
import { retrieveRelevantTools } from "../tool-index/retrieval.js";
import { isToolIndexEnabled } from "../tool-index/config.js";

async function selectTools(goal, { mcpClientFactory }) {
  if (!isToolIndexEnabled()) {
    return mcpClientFactory.withClient((client) => listTools(client));
  }

  try {
    return await retrieveRelevantTools(goal);
  } catch {
    return mcpClientFactory.withClient((client) => listTools(client));
  }
}

export function createActivities({ mcpClientFactory, planner, reviewer }) {
  async function discoverToolsActivity(goal) {
    return selectTools(goal, { mcpClientFactory });
  }

  async function generatePlanActivity(state, tools) {
    const parsed = AgentStateSchema.parse(state);
    return {
      ...parsed,
      plan: await planner(parsed, tools)
    };
  }

  async function executeToolActivity(state) {
    const parsed = AgentStateSchema.parse(state);
    const result = await mcpClientFactory.withClient((client) =>
      analyzeRepository(client, parsed.repositoryUrl)
    );
    const toolResult = ToolResultSchema.parse(result);

    return {
      ...parsed,
      readme: toolResult.readme,
      tree: toolResult.tree
    };
  }

  async function reviewActivity(state) {
    const parsed = AgentStateSchema.parse(state);
    return {
      ...parsed,
      notes: await reviewer({
        goal: parsed.goal,
        readme: parsed.readme,
        tree: parsed.tree
      })
    };
  }

  return {
    discoverToolsActivity,
    generatePlanActivity,
    executeToolActivity,
    reviewActivity
  };
}
