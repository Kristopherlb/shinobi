import { END, START, StateGraph } from "@langchain/langgraph";
import { AgentStateSchema, createInitialState } from "./state.js";
import { buildPlan } from "./plan.js";
import { reviewAnalysis } from "./review.js";
import { analyzeRepository, createMcpClient, listTools } from "../mcp/client.js";

const GraphState = AgentStateSchema;

async function planNode(state) {
  const client = await createMcpClient();
  const tools = await listTools(client);
  await client.close();

  return {
    ...state,
    plan: buildPlan(state, tools)
  };
}

async function executeNode(state) {
  const client = await createMcpClient();
  const result = await analyzeRepository(client, state.repositoryUrl);
  await client.close();

  return {
    ...state,
    readme: result.readme,
    tree: result.tree
  };
}

async function reviewNode(state) {
  return {
    ...state,
    notes: reviewAnalysis({ readme: state.readme, tree: state.tree })
  };
}

export function createAgentGraph() {
  const graph = new StateGraph(GraphState)
    .addNode("plan", planNode)
    .addNode("execute", executeNode)
    .addNode("review", reviewNode)
    .addEdge(START, "plan")
    .addEdge("plan", "execute")
    .addEdge("execute", "review")
    .addEdge("review", END);

  return graph.compile();
}

export async function runAgent({ goal, repositoryUrl }) {
  const app = createAgentGraph();
  const initialState = createInitialState({ goal, repositoryUrl });
  return app.invoke(initialState);
}
