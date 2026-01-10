import { z } from "zod";
import { AgentStateSchema } from "./state.js";
import { buildPlanPrompt } from "../llm/prompts.js";
import { generateStructuredOutput } from "../llm/structured.js";

const PlanSchema = z.object({
  steps: z.array(z.string().min(1)).min(1)
});

export function createPlanner({ llmClient, maxRetries }) {
  return async function buildPlan(state, tools) {
    const parsed = AgentStateSchema.parse(state);
    const hasAnalyzeRepo = tools.some((tool) => tool.name === "analyze_repo");

    if (!hasAnalyzeRepo) {
      throw new Error("analyze_repo tool not available via MCP");
    }

    const prompt = buildPlanPrompt({
      goal: parsed.goal,
      repositoryUrl: parsed.repositoryUrl,
      tools
    });

    const output = await generateStructuredOutput({
      llmClient,
      schema: PlanSchema,
      prompt,
      maxRetries
    });

    return output.steps;
  };
}
