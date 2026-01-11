import { Connection, Client } from "@temporalio/client";
import { randomUUID } from "node:crypto";
import { runDurableAnalyzer } from "./workflows.js";
import { createRuntimeDependencies } from "../bootstrap/dependencies.js";

const connection = await Connection.connect();
const client = new Client({ connection });
const { config } = createRuntimeDependencies();

const goal = process.env.HARMONY_GOAL ?? config.defaults.goal;
const repositoryUrl = process.env.HARMONY_REPO ?? config.defaults.repositoryUrl;

const handle = await client.workflow.start(runDurableAnalyzer, {
  taskQueue: config.temporal.taskQueue,
  workflowId: `${config.temporal.workflowIdPrefix}-${randomUUID()}`,
  args: [{ goal, repositoryUrl }]
});

const result = await handle.result();
console.log(JSON.stringify(result, null, 2));
