export async function generateStructuredOutput({
  llmClient,
  schema,
  prompt,
  maxRetries
}) {
  let lastError = null;
  let currentPrompt = prompt;
  const retries = Number.isFinite(maxRetries) ? maxRetries : 0;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const response = await llmClient.generateText(currentPrompt);
    try {
      const json = JSON.parse(response);
      return schema.parse(json);
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      currentPrompt = `${prompt}\n\nThe previous response failed validation:\n${message}\n\nReturn ONLY valid JSON.`;
    }
  }

  throw lastError ?? new Error("LLM output failed validation.");
}
