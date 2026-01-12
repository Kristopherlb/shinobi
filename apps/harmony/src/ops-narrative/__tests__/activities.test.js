import { afterEach, describe, expect, it, vi } from "vitest";
import {
  fetchLinearData,
  getWorkflowFlags,
  synthesizeReport
} from "../activities.js";

const originalEnv = { ...process.env };

afterEach(() => {
  vi.restoreAllMocks();
  process.env = { ...originalEnv };
});

describe("OpsNarrative activities", () => {
  it("returns empty issues on Linear 404", async () => {
    process.env.LINEAR_API_TOKEN = "token";
    const response = {
      ok: false,
      status: 404,
      text: vi.fn().mockResolvedValue("")
    };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));

    const result = await fetchLinearData({ teamKey: "UNK" });
    expect(result.issues).toHaveLength(0);
  });

  it("synthesizes report with Ollama provider", async () => {
    const response = {
      ok: true,
      json: vi.fn().mockResolvedValue({ response: "Summary" })
    };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));

    const result = await synthesizeReport({
      rawContext: { incidents: [] },
      providerConfig: { type: "OLLAMA", host: "http://ollama", model: "llama3" }
    });

    expect(result.content).toBe("Summary");
    expect(result.provider).toBe("OLLAMA");
  });

  it("resolves OpenFeature flags from overrides", async () => {
    process.env.ONW_FLAG_OVERRIDES = JSON.stringify({
      "enable-linear-source": false
    });

    const flags = await getWorkflowFlags();
    expect(flags.enableLinearSource).toBe(false);
    expect(flags.enableGitSource).toBe(true);
  });
});
