import { ToolResultSchema } from "./state.js";

export function reviewAnalysis(result) {
  const parsed = ToolResultSchema.parse(result);
  const notes = [];

  if (!parsed.readme.trim()) {
    notes.push("README missing: plan follow-up to locate documentation.");
  } else {
    notes.push("README found: summary ready for further analysis.");
  }

  const treeLines = parsed.tree.split("\n").filter(Boolean).length;
  notes.push(`Repository tree captured (${treeLines} paths).`);

  return notes;
}
