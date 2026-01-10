import test from "node:test";
import assert from "node:assert/strict";
import { buildPlan } from "../src/agent/plan.js";
import { reviewAnalysis } from "../src/agent/review.js";

const baseState = {
  goal: "Analyze repo",
  repositoryUrl: "https://example.com/repo.git",
  plan: [],
  readme: "",
  tree: "",
  notes: []
};

test("buildPlan requires analyze_repo tool", () => {
  const tools = [{ name: "analyze_repo" }];
  const plan = buildPlan(baseState, tools);
  assert.ok(plan.length >= 2);
});

test("reviewAnalysis flags missing README", () => {
  const notes = reviewAnalysis({ readme: "", tree: "./README.md\n./src/index.js" });
  assert.ok(notes.some((note) => note.includes("README missing")));
});
