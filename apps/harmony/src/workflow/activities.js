import { AgentStateSchema, ToolResultSchema } from "../agent/state.js";
import { analyzeRepository, listTools } from "../mcp/client.js";

export function createActivities({ mcpClientFactory, planner, reviewer }) {
  async function discoverToolsActivity() {
    return mcpClientFactory.withClient((client) => listTools(client));
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
