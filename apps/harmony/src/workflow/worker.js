import "../instrumentation.js";
import { Worker } from "@temporalio/worker";
import { Connection } from "@temporalio/client";
import * as activities from "./activities.js";
import * as opsNarrativeActivities from "../ops-narrative/activities.js";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const workflowDir = dirname(fileURLToPath(import.meta.url));

const connection = await Connection.connect({
  address: process.env.TEMPORAL_ADDRESS ?? "localhost:7233"
});

const worker = await Worker.create({
  workflowsPath: resolve(workflowDir, "./workflows.js"),
  activities: { ...activities, ...opsNarrativeActivities },
  taskQueue: "harmony",
  connection
});

await worker.run();
