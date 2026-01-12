import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { fromNodeProviderChain } from "@aws-sdk/credential-provider-node";
import { trace } from "@opentelemetry/api";
import { AiProviderConfigSchema } from "./schemas.js";

const tracer = trace.getTracer("ops-narrative");

function createBedrockClient(region) {
  return new BedrockRuntimeClient({
    region,
    credentials: fromNodeProviderChain()
  });
}

async function callBedrock({ prompt, modelId, region }) {
  const client = createBedrockClient(region);
  const body = JSON.stringify({
    prompt,
    max_tokens_to_sample: 1024
  });

  const command = new InvokeModelCommand({
    body,
    modelId,
    contentType: "application/json",
    accept: "application/json"
  });

  const response = await client.send(command);
  const payload = new TextDecoder().decode(response.body);
  const parsed = JSON.parse(payload);
  return parsed.completion ?? parsed.output ?? "";
}

async function callOllama({ prompt, host, model }) {
  const url = `${host.replace(/\/$/, "")}/api/generate`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, prompt, stream: false })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Ollama request failed: ${response.status} ${text}`);
  }

  const payload = await response.json();
  return payload.response ?? "";
}

async function callOpenAi({ prompt, model, apiKey }) {
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is required for OpenAI provider");
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenAI request failed: ${response.status} ${text}`);
  }

  const payload = await response.json();
  return payload.choices?.[0]?.message?.content ?? "";
}

export async function generateWithProvider({ prompt, providerConfig }) {
  const config = AiProviderConfigSchema.parse(providerConfig);

  return await tracer.startActiveSpan("ai.generate", async (span) => {
    span.setAttribute("ai.provider", config.type);

    try {
      switch (config.type) {
        case "BEDROCK":
          span.setAttribute("ai.model", config.modelId);
          return await callBedrock({
            prompt,
            modelId: config.modelId,
            region: config.region
          });
        case "OLLAMA":
          span.setAttribute("ai.model", config.model);
          return await callOllama({
            prompt,
            host: config.host,
            model: config.model
          });
        case "OPENAI":
          span.setAttribute("ai.model", config.model);
          return await callOpenAi({
            prompt,
            model: config.model,
            apiKey: process.env.OPENAI_API_KEY ?? ""
          });
        default:
          throw new Error(`Unsupported AI provider: ${config.type}`);
      }
    } catch (error) {
      span.recordException(error);
      throw error;
    } finally {
      span.end();
    }
  });
}
