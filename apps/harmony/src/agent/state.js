import { z } from "zod";

export const AgentStateSchema = z.object({
  goal: z.string().min(1),
  plan: z.array(z.string()).default([]),
  repositoryUrl: z.string().url(),
  readme: z.string().default(""),
  tree: z.string().default(""),
  notes: z.array(z.string()).default([])
});

export const ToolResultSchema = z.object({
  readme: z.string(),
  tree: z.string()
});

export function createInitialState({ goal, repositoryUrl }) {
  return AgentStateSchema.parse({
    goal,
    repositoryUrl,
    plan: [],
    readme: "",
    tree: "",
    notes: []
  });
}
