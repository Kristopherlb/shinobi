import { Connection, Client } from "@temporalio/client";
import { randomUUID } from "node:crypto";
import { runDurableAnalyzer, runOpsNarrativeWorkflow } from "./workflows.js";
import { createRuntimeDependencies } from "../bootstrap/dependencies.js";

function resolveTemporalAddress() {
  return process.env.TEMPORAL_ADDRESS ?? "localhost:7233";
}

function buildOpsNarrativeRequest() {
  const raw = process.env.ONW_REQUEST_JSON;
  if (raw) {
    return JSON.parse(raw);
  }

  return {
    linear: process.env.ONW_LINEAR_TEAM
      ? { teamKey: process.env.ONW_LINEAR_TEAM }
      : undefined,
    git: process.env.ONW_GIT_PROVIDER && process.env.ONW_GIT_REPO
      ? { providerType: process.env.ONW_GIT_PROVIDER, repoId: process.env.ONW_GIT_REPO }
      : undefined,
    pagerDuty: process.env.ONW_PD_SERVICE
      ? { serviceId: process.env.ONW_PD_SERVICE }
      : undefined,
    output: process.env.ONW_OUTPUT ?? "LOCAL",
    providerConfig: process.env.ONW_PROVIDER_CONFIG
      ? JSON.parse(process.env.ONW_PROVIDER_CONFIG)
      : { type: "OLLAMA", host: "http://localhost:11434", model: "llama3" }
  };
}

const connection = await Connection.connect({ address: resolveTemporalAddress() });
const client = new Client({ connection });
const { config } = createRuntimeDependencies();

const workflow = process.env.HARMONY_WORKFLOW ?? "durable-analyzer";

let handle;
if (workflow === "ops-narrative") {
  const request = buildOpsNarrativeRequest();
  handle = await client.workflow.start(runOpsNarrativeWorkflow, {
    taskQueue: config.temporal.taskQueue,
    workflowId: `ops-narrative-${randomUUID()}`,
    args: [request]
  });
} else {
  const goal = process.env.HARMONY_GOAL ?? config.defaults.goal;
  const repositoryUrl = process.env.HARMONY_REPO ?? config.defaults.repositoryUrl;

  handle = await client.workflow.start(runDurableAnalyzer, {
    taskQueue: config.temporal.taskQueue,
    workflowId: `${config.temporal.workflowIdPrefix}-${randomUUID()}`,
    args: [{ goal, repositoryUrl }]
  });
}

const result = await handle.result();
console.log(JSON.stringify(result, null, 2));
