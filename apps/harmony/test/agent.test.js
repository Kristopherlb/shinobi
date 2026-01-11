import test from "node:test";
import assert from "node:assert/strict";
import { createPlanner } from "../src/agent/plan.js";
import { createReviewer } from "../src/agent/review.js";
import { createLlmClient } from "../src/llm/client.js";

const baseState = {
  goal: "Analyze repo",
  repositoryUrl: "https://example.com/repo.git",
  messages: [],
  plan: [],
  readme: "",
  tree: "",
  notes: []
};

test("planner requires analyze_repo tool", async () => {
  const llmClient = createLlmClient({
    provider: "mock",
    responder: () => JSON.stringify({ steps: ["step one"] })
  });
  const planner = createPlanner({ llmClient, maxRetries: 1 });
  const tools = [{ name: "analyze_repo" }];
  const plan = await planner(baseState, tools);
  assert.ok(plan.length >= 1);
});

test("reviewer parses structured notes", async () => {
  const llmClient = createLlmClient({
    provider: "mock",
    responder: () => JSON.stringify({ notes: ["README missing."] })
  });
  const reviewer = createReviewer({ llmClient, maxRetries: 1 });
  const notes = await reviewer({
    goal: baseState.goal,
    readme: "",
    tree: "./README.md\n./src/index.js"
  });
  assert.ok(notes.some((note) => note.includes("README")));
});

test("planner retries on invalid JSON and repairs output", async () => {
  let attempts = 0;
  const llmClient = createLlmClient({
    provider: "mock",
    responder: () => {
      attempts += 1;
      if (attempts === 1) {
        return "not-json";
      }
      return JSON.stringify({ steps: ["repaired"] });
    }
  });
  const planner = createPlanner({ llmClient, maxRetries: 2 });
  const tools = [{ name: "analyze_repo" }];
  const plan = await planner(baseState, tools);
  assert.deepEqual(plan, ["repaired"]);
});
