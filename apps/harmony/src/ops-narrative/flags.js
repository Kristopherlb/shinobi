import { InMemoryProvider, OpenFeature } from "@openfeature/server-sdk";
import { WorkflowFlagsSchema } from "./schemas.js";

const DEFAULT_FLAGS = {
  "enable-linear-source": true,
  "enable-git-source": true,
  "enable-pagerduty-source": true,
  "enable-slack-delivery": true
};

function parseFlagOverrides() {
  const raw = process.env.ONW_FLAG_OVERRIDES ?? "{}";
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      return parsed;
    }
  } catch (error) {
    return {};
  }
  return {};
}

export async function resolveWorkflowFlags() {
  const overrides = parseFlagOverrides();
  const provider = new InMemoryProvider({
    flags: {
      ...DEFAULT_FLAGS,
      ...overrides
    }
  });

  OpenFeature.setProvider(provider);
  const client = OpenFeature.getClient("ops-narrative-workflow");

  const flags = {
    enableLinearSource: await client.getBooleanValue("enable-linear-source", true),
    enableGitSource: await client.getBooleanValue("enable-git-source", true),
    enablePagerDutySource: await client.getBooleanValue("enable-pagerduty-source", true),
    enableSlackDelivery: await client.getBooleanValue("enable-slack-delivery", true)
  };

  return WorkflowFlagsSchema.parse(flags);
}
