import { Worker } from "@temporalio/worker";
import { createActivities } from "./activities.js";
import { createRuntimeDependencies } from "../bootstrap/dependencies.js";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const workflowDir = dirname(fileURLToPath(import.meta.url));
const { config, mcpClientFactory, planner, reviewer } = createRuntimeDependencies();
const activities = createActivities({ mcpClientFactory, planner, reviewer });

const worker = await Worker.create({
  workflowsPath: resolve(workflowDir, "./workflows.js"),
  activities,
  taskQueue: config.temporal.taskQueue
});

await worker.run();
