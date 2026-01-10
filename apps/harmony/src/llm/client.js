function assertValue(value, message) {
  if (!value) {
    throw new Error(message);
  }
  return value;
}

function buildOpenAiClient({ apiKey, apiBaseUrl, model, temperature }) {
  const resolvedKey = assertValue(apiKey, "HARMONY_LLM_API_KEY is required for OpenAI.");
  const baseUrl = apiBaseUrl ?? "https://api.openai.com/v1";

  return {
    async generateText(prompt) {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${resolvedKey}`
        },
        body: JSON.stringify({
          model,
          temperature,
          messages: [
            { role: "system", content: "You are a precise JSON-only assistant." },
            { role: "user", content: prompt }
          ]
        })
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`OpenAI request failed: ${response.status} ${text}`);
      }

      const payload = await response.json();
      const content = payload.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error("OpenAI response missing content.");
      }
      return content;
    }
  };
}

function buildMockClient({ responder }) {
  return {
    async generateText(prompt) {
      return responder(prompt);
    }
  };
}

export function createLlmClient({ provider, apiKey, apiBaseUrl, model, temperature, responder }) {
  const factories = {
    openai: () => buildOpenAiClient({ apiKey, apiBaseUrl, model, temperature }),
    mock: () => buildMockClient({ responder })
  };

  const factory = factories[provider];
  if (!factory) {
    throw new Error(`Unsupported LLM provider: ${provider}`);
  }
  return factory();
}
