import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const configUrl = new URL("../../config/runtime.json", import.meta.url);
const configDir = dirname(fileURLToPath(configUrl));
const appRoot = resolve(configDir, "..");

function readConfigFile() {
  const raw = readFileSync(configUrl, "utf-8");
  return JSON.parse(raw);
}

function overrideValue(value, envValue, mapper = (val) => val) {
  if (envValue === undefined || envValue === "") {
    return value;
  }
  return mapper(envValue);
}

export function loadRuntimeConfig() {
  const base = readConfigFile();

  return {
    app: {
      name: base.app.name
    },
    mcp: {
      clientName: overrideValue(base.mcp.clientName, process.env.HARMONY_MCP_CLIENT_NAME),
      clientVersion: overrideValue(base.mcp.clientVersion, process.env.HARMONY_MCP_CLIENT_VERSION),
      serverName: overrideValue(base.mcp.serverName, process.env.HARMONY_MCP_SERVER_NAME),
      serverVersion: overrideValue(base.mcp.serverVersion, process.env.HARMONY_MCP_SERVER_VERSION),
      serverCommand: overrideValue(base.mcp.serverCommand, process.env.HARMONY_MCP_SERVER_COMMAND),
      serverEntry: overrideValue(base.mcp.serverEntry, process.env.HARMONY_MCP_SERVER_ENTRY)
    },
    temporal: {
      taskQueue: overrideValue(base.temporal.taskQueue, process.env.HARMONY_TEMPORAL_TASK_QUEUE),
      workflowIdPrefix: overrideValue(
        base.temporal.workflowIdPrefix,
        process.env.HARMONY_TEMPORAL_WORKFLOW_PREFIX
      )
    },
    defaults: {
      goal: overrideValue(base.defaults.goal, process.env.HARMONY_DEFAULT_GOAL),
      repositoryUrl: overrideValue(base.defaults.repositoryUrl, process.env.HARMONY_DEFAULT_REPO)
    },
    llm: {
      provider: overrideValue(base.llm.provider, process.env.HARMONY_LLM_PROVIDER),
      model: overrideValue(base.llm.model, process.env.HARMONY_LLM_MODEL),
      temperature: overrideValue(
        base.llm.temperature,
        process.env.HARMONY_LLM_TEMPERATURE,
        Number
      ),
      maxRetries: overrideValue(base.llm.maxRetries, process.env.HARMONY_LLM_MAX_RETRIES, Number),
      apiBaseUrl: overrideValue(base.llm.apiBaseUrl, process.env.HARMONY_LLM_API_BASE_URL)
    },
    paths: {
      appRoot
    }
  };
}

export function resolveFromAppRoot(relativePath) {
  return resolve(appRoot, relativePath);
}
