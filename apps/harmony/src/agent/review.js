import { z } from "zod";
import { ToolResultSchema } from "./state.js";
import { buildReviewPrompt } from "../llm/prompts.js";
import { generateStructuredOutput } from "../llm/structured.js";

const ReviewSchema = z.object({
  notes: z.array(z.string().min(1)).min(1)
});

export function createReviewer({ llmClient, maxRetries }) {
  return async function reviewAnalysis({ goal, readme, tree }) {
    const parsed = ToolResultSchema.parse({ readme, tree });

    const prompt = buildReviewPrompt({
      goal,
      readme: parsed.readme,
      tree: parsed.tree
    });

    const output = await generateStructuredOutput({
      llmClient,
      schema: ReviewSchema,
      prompt,
      maxRetries
    });

    return output.notes;
  };
}
