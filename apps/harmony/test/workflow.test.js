import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { TestWorkflowEnvironment } from "@temporalio/testing";
import { Worker } from "@temporalio/worker";
import { createActivities } from "../src/workflow/activities.js";
import { createPlanner } from "../src/agent/plan.js";
import { createReviewer } from "../src/agent/review.js";
import { createLlmClient } from "../src/llm/client.js";
import { runDurableAnalyzer } from "../src/workflow/workflows.js";

function createGate() {
  let resolveGate;
  let rejectGate;
  const promise = new Promise((resolve, reject) => {
    resolveGate = resolve;
    rejectGate = reject;
  });

  return {
    wait: () => promise,
    release: (value) => resolveGate(value),
    fail: (error) => rejectGate(error)
  };
}

test("workflow durability: plan is not re-executed after worker restart", async () => {
  const env = await TestWorkflowEnvironment.createTimeSkipping();
  const taskQueue = "durability-test";
  const workflowDir = dirname(fileURLToPath(import.meta.url));
  const workflowsPath = resolve(workflowDir, "../src/workflow/workflows.js");

  let planCalls = 0;
  const executeGate = createGate();
  let executeStarted;
  const executeStartedPromise = new Promise((resolve) => {
    executeStarted = resolve;
  });

  const llmClient = createLlmClient({
    provider: "mock",
    responder: () => {
      planCalls += 1;
      return JSON.stringify({ steps: ["analyze repo"] });
    }
  });

  const planner = createPlanner({ llmClient, maxRetries: 1 });
  const reviewer = createReviewer({
    llmClient: createLlmClient({
      provider: "mock",
      responder: () => JSON.stringify({ notes: ["ok"] })
    }),
    maxRetries: 1
  });

  const mcpClientFactory = {
    async withClient(callback) {
      const client = {
        async request(payload) {
          if (payload.method === "tools/list") {
            return {
              tools: [{ name: "analyze_repo", description: "Mock tool" }]
            };
          }
          if (payload.method === "tools/call") {
            executeStarted();
            await executeGate.wait();
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify({
                    readme: "README",
                    tree: "./README.md"
                  })
                }
              ]
            };
          }
          throw new Error(`Unexpected MCP method: ${payload.method}`);
        }
      };

      return callback(client);
    }
  };

  const activities = createActivities({ mcpClientFactory, planner, reviewer });

  let worker = await Worker.create({
    connection: env.nativeConnection,
    taskQueue,
    workflowsPath,
    activities
  });
  let workerRun = worker.run();

  const workflowHandle = await env.client.workflow.start(runDurableAnalyzer, {
    taskQueue,
    workflowId: "durability-test-workflow",
    args: [
      {
        goal: "Test durability",
        repositoryUrl: "https://example.com/repo.git"
      }
    ]
  });

  await executeStartedPromise;
  await worker.shutdown();
  await workerRun;

  worker = await Worker.create({
    connection: env.nativeConnection,
    taskQueue,
    workflowsPath,
    activities
  });
  workerRun = worker.run();

  executeGate.release();

  const result = await workflowHandle.result();
  assert.equal(planCalls, 1);
  assert.equal(result.readme, "README");

  await worker.shutdown();
  await workerRun;
  await env.teardown();
});
