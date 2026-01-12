import { END, START, StateGraph } from "@langchain/langgraph";
import { AgentStateSchema, createInitialState } from "./state.js";
import { listTools, analyzeRepository } from "../mcp/client.js";
import { retrieveRelevantTools } from "../tool-index/retrieval.js";

const GraphState = AgentStateSchema;

async function selectTools(goal, { mcpClientFactory }) {
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
    .addNode("plan", createPlanNode({ mcpClientFactory, planner }))
    .addNode("execute", createExecuteNode({ mcpClientFactory }))
    .addNode("review", createReviewNode({ reviewer }))
    .addEdge(START, "plan")
    .addEdge("plan", "execute")
    .addEdge("execute", "review")
    .addEdge("review", END);

  return graph.compile();
}

export async function runAgent({ goal, repositoryUrl, mcpClientFactory, planner, reviewer }) {
  const app = createAgentGraph({ mcpClientFactory, planner, reviewer });
  const initialState = createInitialState({ goal, repositoryUrl });
  return app.invoke(initialState);
}
