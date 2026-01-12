import { END, START, StateGraph } from "@langchain/langgraph";
import { AgentStateSchema, createInitialState } from "./state.js";
import { listTools, analyzeRepository } from "../mcp/client.js";
import { retrieveRelevantTools } from "../tool-index/retrieval.js";
import { isToolIndexEnabled } from "../tool-index/config.js";

const GraphState = AgentStateSchema;

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

function createPlanNode({ mcpClientFactory, planner }) {
  return async function planNode(state) {
    const tools = await selectTools(state.goal, { mcpClientFactory });

    return {
      ...state,
      plan: await planner(state, tools)
    };
  };
}

function createExecuteNode({ mcpClientFactory }) {
  return async function executeNode(state) {
    const result = await mcpClientFactory.withClient((client) =>
      analyzeRepository(client, state.repositoryUrl)
    );

    return {
      ...state,
      readme: result.readme,
      tree: result.tree
    };
  };
}

function createReviewNode({ reviewer }) {
  return async function reviewNode(state) {
    return {
      ...state,
      notes: await reviewer({ goal: state.goal, readme: state.readme, tree: state.tree })
    };
  };
}

export function createAgentGraph({ mcpClientFactory, planner, reviewer }) {
  const graph = new StateGraph(GraphState)
    .addNode("plan_step", createPlanNode({ mcpClientFactory, planner }))
    .addNode("execute_step", createExecuteNode({ mcpClientFactory }))
    .addNode("review_step", createReviewNode({ reviewer }))
    .addEdge(START, "plan_step")
    .addEdge("plan_step", "execute_step")
    .addEdge("execute_step", "review_step")
    .addEdge("review_step", END);

  return graph.compile();
}

export async function runAgent({ goal, repositoryUrl, mcpClientFactory, planner, reviewer }) {
  const app = createAgentGraph({ mcpClientFactory, planner, reviewer });
  const initialState = createInitialState({ goal, repositoryUrl });
  return app.invoke(initialState);
}
