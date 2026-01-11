export function buildPlanPrompt({ goal, repositoryUrl, tools }) {
  const toolList = tools.map((tool) => `- ${tool.name}: ${tool.description ?? ""}`).join("\n");
  return [
    "You are planning a durable workflow for infrastructure automation.",
    `Goal: ${goal}`,
    `Repository URL: ${repositoryUrl}`,
    "Available tools:",
    toolList || "- (no tools provided)",
    "Return JSON with shape: {\"steps\": [\"...\"]}. Ensure each step is concise and actionable."
  ].join("\n");
}

export function buildReviewPrompt({ goal, readme, tree }) {
  return [
    "You are reviewing repository analysis output for gaps and next steps.",
    `Goal: ${goal}`,
    "README:",
    readme || "(empty)",
    "File tree:",
    tree || "(empty)",
    "Return JSON with shape: {\"notes\": [\"...\"]}."
  ].join("\n");
}
