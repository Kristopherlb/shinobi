import { proxyActivities } from "@temporalio/workflow";
import { createInitialState } from "../agent/state.js";

const { planActivity, executeActivity, reviewActivity } = proxyActivities({
  startToCloseTimeout: "5 minutes"
});

export async function runDurableAnalyzer({ goal, repositoryUrl }) {
  let state = createInitialState({ goal, repositoryUrl });

  state = await planActivity(state);
  state = await executeActivity(state);
  state = await reviewActivity(state);

  return state;
}
