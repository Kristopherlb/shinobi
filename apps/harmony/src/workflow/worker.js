import { Worker } from "@temporalio/worker";
import * as activities from "./activities.js";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const workflowDir = dirname(fileURLToPath(import.meta.url));

const worker = await Worker.create({
  workflowsPath: resolve(workflowDir, "./workflows.js"),
  activities,
  taskQueue: "harmony"
});

await worker.run();
