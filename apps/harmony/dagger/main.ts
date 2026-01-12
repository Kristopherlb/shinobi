import { dag, Container, Directory, Service, object, func } from "@dagger.io/dagger";

const DEFAULT_NODE_IMAGE = "node:20-alpine";
const TEMPORAL_IMAGE = "temporalio/admin-tools:latest";
const OLLAMA_IMAGE = "ollama/ollama:latest";

function baseNode(source: Directory) {
  return dag
    .container()
    .from(DEFAULT_NODE_IMAGE)
    .withMountedDirectory("/src", source)
    .withWorkdir("/src")
    .withExec(["corepack", "enable"])
    .withExec(["pnpm", "install", "--frozen-lockfile"]);
}

function resolveProviderConfig(aiProvider: string, providerConfigJson?: string) {
  if (providerConfigJson) {
    return providerConfigJson;
  }

  const normalized = aiProvider.toUpperCase();
  if (normalized === "OPENAI") {
    return JSON.stringify({ type: "OPENAI", model: "gpt-4o-mini" });
  }

  if (normalized === "BEDROCK") {
    return JSON.stringify({ type: "BEDROCK", region: "us-east-1", modelId: "anthropic.claude-3-sonnet-20240229-v1:0" });
  }

  return JSON.stringify({ type: "OLLAMA", host: "http://localhost:11434", model: "llama3" });
}

@object()
export class OpsNarrative {
  @func()
  async test(source: Directory): Promise<string> {
    await baseNode(source)
      .withExec(["pnpm", "-C", "apps/harmony", "test:vitest"])
      .sync();

    return "vitest completed";
  }

  @func()
  async runLocal(
    source: Directory,
    aiProvider: string = "OLLAMA",
    model: string = "llama3",
    providerConfigJson?: string
  ): Promise<Container> {
    const temporal = dag
      .container()
      .from(TEMPORAL_IMAGE)
      .withExposedPort(7233)
      .withExposedPort(8233)
      .withExec(["temporal", "server", "start-dev", "--ip", "0.0.0.0", "--ui-port", "8233"])
      .asService();

    let ollamaService: Service | undefined;
    if (aiProvider.toUpperCase() === "OLLAMA") {
      const modelCache = dag.cacheVolume("ollama-models");
      ollamaService = dag
        .container()
        .from(OLLAMA_IMAGE)
        .withMountedCache("/root/.ollama", modelCache)
        .withExposedPort(11434)
        .withExec(["ollama", "serve"])
        .asService();
    }

    let worker = baseNode(source)
      .withWorkdir("/src/apps/harmony")
      .withServiceBinding("temporal", temporal)
      .withEnvVariable("TEMPORAL_ADDRESS", "temporal:7233")
      .withExec(["node", "src/workflow/worker.js"])
      .asService();

    const providerConfig = resolveProviderConfig(aiProvider, providerConfigJson);
    let client = baseNode(source)
      .withWorkdir("/src/apps/harmony")
      .withServiceBinding("temporal", temporal)
      .withServiceBinding("worker", worker)
      .withEnvVariable("TEMPORAL_ADDRESS", "temporal:7233")
      .withEnvVariable("HARMONY_WORKFLOW", "ops-narrative")
      .withEnvVariable("ONW_PROVIDER_CONFIG", providerConfig);

    if (ollamaService) {
      client = client
        .withServiceBinding("ollama", ollamaService)
        .withEnvVariable("ONW_PROVIDER_CONFIG", JSON.stringify({ type: "OLLAMA", host: "http://ollama:11434", model }));
    }

    return client.withExec(["node", "src/workflow/run-local.js"]);
  }
}
