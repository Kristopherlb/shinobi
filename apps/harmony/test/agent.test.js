import { describe, expect, it } from "vitest";
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

describe("agent planning", () => {
  it("buildPlan requires analyze_repo tool", () => {
    const tools = [{ name: "analyze_repo" }];
    const plan = buildPlan(baseState, tools);
    expect(plan.length).toBeGreaterThanOrEqual(2);
  });

  it("reviewAnalysis flags missing README", () => {
    const notes = reviewAnalysis({ readme: "", tree: "./README.md\n./src/index.js" });
    expect(notes.some((note) => note.includes("README missing"))).toBe(true);
  });
});
