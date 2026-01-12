import { proxyActivities } from "@temporalio/workflow";
import { OpsNarrativeRequestSchema, OpsNarrativeResultSchema } from "./schemas.js";

const {
  fetchLinearData,
  fetchGitOpsData,
  fetchPagerDutyData,
  synthesizeReport,
  sendSlackReport,
  writeLocalReport,
  getWorkflowFlags
} = proxyActivities({
  startToCloseTimeout: "5 minutes"
});

export async function runOpsNarrativeWorkflow(request) {
  const payload = OpsNarrativeRequestSchema.parse(request);
  const flags = await getWorkflowFlags();

  const tasks = [];
  const context = {};

  if (flags.enableLinearSource && payload.linear) {
    tasks.push({ key: "linear", promise: fetchLinearData(payload.linear) });
  }

  if (flags.enableGitSource && payload.git) {
    tasks.push({ key: "git", promise: fetchGitOpsData(payload.git) });
  }

  if (flags.enablePagerDutySource && payload.pagerDuty) {
    tasks.push({ key: "pagerDuty", promise: fetchPagerDutyData(payload.pagerDuty) });
  }

  const settled = await Promise.allSettled(tasks.map((task) => task.promise));
  const normalized = settled.map((result, index) => {
    const key = tasks[index].key;
    if (result.status === "fulfilled") {
      return { key, status: "fulfilled", value: result.value };
    }
    return { key, status: "rejected", reason: result.reason?.message ?? String(result.reason) };
  });

  normalized.forEach((entry, index) => {
    if (entry.status === "fulfilled") {
      context[entry.key] = entry.value;
    }
  });

  context.results = normalized;

  const report = await synthesizeReport({
    rawContext: context,
    providerConfig: payload.providerConfig
  });

  let delivery = payload.output;
  const artifacts = {};

  if (payload.output === "SLACK" && flags.enableSlackDelivery) {
    try {
      const slackResult = await sendSlackReport({ content: report.content });
      artifacts.slack = slackResult;
    } catch (error) {
      const localResult = await writeLocalReport({ content: report.content });
      artifacts.local = localResult;
      delivery = "LOCAL";
    }
  } else {
    const localResult = await writeLocalReport({ content: report.content });
    artifacts.local = localResult;
    delivery = "LOCAL";
  }

  return OpsNarrativeResultSchema.parse({
    content: report.content,
    delivery,
    artifacts
  });
}
