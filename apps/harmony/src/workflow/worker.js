import "../instrumentation.js";
import { Worker } from "@temporalio/worker";
import { Connection } from "@temporalio/client";
import { createActivities } from "./activities.js";
import { createRuntimeDependencies } from "../bootstrap/dependencies.js";
import * as opsNarrativeActivities from "../ops-narrative/activities.js";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const workflowDir = dirname(fileURLToPath(import.meta.url));
const { config, mcpClientFactory, planner, reviewer } = createRuntimeDependencies();
const durableAnalyzerActivities = createActivities({ mcpClientFactory, planner, reviewer });

const connection = await Connection.connect({
  address: process.env.TEMPORAL_ADDRESS ?? config.temporal.address ?? "localhost:7233"
});

const worker = await Worker.create({
  workflowsPath: resolve(workflowDir, "./workflows.js"),
  activities: { ...durableAnalyzerActivities, ...opsNarrativeActivities },
  taskQueue: config.temporal.taskQueue,
  connection
});

await worker.run();
