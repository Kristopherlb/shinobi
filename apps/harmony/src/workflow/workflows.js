import { proxyActivities } from "@temporalio/workflow";
import { createInitialState } from "../agent/state.js";
import { runOpsNarrativeWorkflow } from "../ops-narrative/workflow.js";

const {
  discoverToolsActivity,
  generatePlanActivity,
  executeToolActivity,
  reviewActivity
} = proxyActivities({
  startToCloseTimeout: "5 minutes"
});

export async function runDurableAnalyzer({ goal, repositoryUrl }) {
  let state = createInitialState({ goal, repositoryUrl });

  const tools = await discoverToolsActivity(goal);
  state = await generatePlanActivity(state, tools);
  state = await executeToolActivity(state);
  state = await reviewActivity(state);

  return state;
}

export { runOpsNarrativeWorkflow };
