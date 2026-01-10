import { Connection, Client } from "@temporalio/client";
import { runDurableAnalyzer } from "./workflows.js";

const connection = await Connection.connect();
const client = new Client({ connection });

const goal = process.env.HARMONY_GOAL ?? "Analyze repository";
const repositoryUrl = process.env.HARMONY_REPO ?? "https://github.com/modelcontextprotocol/servers";

const handle = await client.workflow.start(runDurableAnalyzer, {
  taskQueue: "harmony",
  workflowId: `harmony-${Date.now()}`,
  args: [{ goal, repositoryUrl }]
});

const result = await handle.result();
console.log(JSON.stringify(result, null, 2));
