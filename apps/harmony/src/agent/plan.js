import { AgentStateSchema } from "./state.js";

export function buildPlan(state, tools) {
  const parsed = AgentStateSchema.parse(state);
  const hasAnalyzeRepo = tools.some((tool) => tool.name === "analyze_repo");

  if (!hasAnalyzeRepo) {
    throw new Error("analyze_repo tool not available via MCP");
  }

  return [
    `Use analyze_repo to fetch README and tree for ${parsed.repositoryUrl}.`,
    "Review README coverage and detect missing documentation.",
    "If README is missing, plan a follow-up file listing step."
  ];
}
