import { trace } from "@opentelemetry/api";
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import {
  GitOpsInputSchema,
  GitOpsOutputSchema,
  LinearInputSchema,
  LinearOutputSchema,
  LocalDeliveryInputSchema,
  LocalDeliveryOutputSchema,
  PagerDutyInputSchema,
  PagerDutyOutputSchema,
  SlackDeliveryInputSchema,
  SlackDeliveryOutputSchema,
  SynthesizeReportInputSchema,
  SynthesizeReportOutputSchema
} from "./schemas.js";
import { fetchJson } from "./http-client.js";
import { generateWithProvider } from "./ai-providers.js";
import { resolveWorkflowFlags } from "./flags.js";

const tracer = trace.getTracer("ops-narrative");

function lookbackIso(hours) {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);
  return since.toISOString();
}

export async function fetchLinearData(input) {
  const payload = LinearInputSchema.parse(input);

  return await tracer.startActiveSpan("linear.fetch_issues", async (span) => {
    span.setAttribute("linear.team_id", payload.teamKey);
    try {
      const token = process.env.LINEAR_API_TOKEN ?? "";
      if (!token) {
        throw new Error("LINEAR_API_TOKEN is required for Linear data fetch");
      }
      const query = {
        query: `query ($teamKey: String!, $since: DateTime!) {\n  issues(filter: { team: { key: { eq: $teamKey } }, completedAt: { gte: $since } }) {\n    nodes { id title url completedAt }\n  }\n}`,
        variables: { teamKey: payload.teamKey, since: lookbackIso(payload.lookbackHours) }
      };

      const { response, body } = await fetchJson("https://api.linear.app/graphql", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token
        },
        body: JSON.stringify(query)
      });

      if (!response.ok) {
        return LinearOutputSchema.parse({ issues: [] });
      }

      const issues = body?.data?.issues?.nodes ?? [];
      return LinearOutputSchema.parse({ issues });
    } catch (error) {
      span.recordException(error);
      throw error;
    } finally {
      span.end();
    }
  });
}

export async function fetchGitOpsData(input) {
  const payload = GitOpsInputSchema.parse(input);

  return await tracer.startActiveSpan("git.fetch_changes", async (span) => {
    span.setAttribute("git.provider", payload.providerType);
    span.setAttribute("git.repo", payload.repoId);
    try {
      if (payload.providerType === "GITLAB") {
        const token = process.env.GITLAB_TOKEN ?? "";
        if (!token) {
          throw new Error("GITLAB_TOKEN is required for GitLab data fetch");
        }
        const url = `https://gitlab.com/api/v4/projects/${encodeURIComponent(payload.repoId)}/merge_requests?state=merged`;
        const { response, body } = await fetchJson(url, {
          headers: { "PRIVATE-TOKEN": token }
        });

        if (!response.ok) {
          return GitOpsOutputSchema.parse({ changes: [] });
        }

        const changes = (body ?? []).map((mr) => ({
          id: String(mr.id),
          title: mr.title,
          url: mr.web_url,
          mergedAt: mr.merged_at,
          author: mr.author?.name
        }));

        return GitOpsOutputSchema.parse({ changes });
      }

      const token = process.env.BITBUCKET_TOKEN ?? "";
      if (!token) {
        throw new Error("BITBUCKET_TOKEN is required for Bitbucket data fetch");
      }
      const url = `https://api.bitbucket.org/2.0/repositories/${payload.repoId}/pullrequests?state=MERGED`;
      const { response, body } = await fetchJson(url, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) {
        return GitOpsOutputSchema.parse({ changes: [] });
      }

      const changes = (body?.values ?? []).map((pr) => ({
        id: String(pr.id),
        title: pr.title,
        url: pr.links?.html?.href,
        mergedAt: pr.updated_on,
        author: pr.author?.display_name
      }));

      return GitOpsOutputSchema.parse({ changes });
    } catch (error) {
      span.recordException(error);
      throw error;
    } finally {
      span.end();
    }
  });
}

export async function fetchPagerDutyData(input) {
  const payload = PagerDutyInputSchema.parse(input);

  return await tracer.startActiveSpan("pagerduty.fetch_incidents", async (span) => {
    span.setAttribute("pagerduty.service_id", payload.serviceId);
    try {
      const token = process.env.PAGERDUTY_API_TOKEN ?? "";
      if (!token) {
        throw new Error("PAGERDUTY_API_TOKEN is required for PagerDuty data fetch");
      }
      const since = lookbackIso(payload.lookbackHours);
      const url = `https://api.pagerduty.com/incidents?since=${encodeURIComponent(since)}&service_ids[]=${encodeURIComponent(payload.serviceId)}`;
      const { response, body } = await fetchJson(url, {
        headers: {
          Accept: "application/vnd.pagerduty+json;version=2",
          Authorization: `Token token=${token}`
        }
      });

      if (!response.ok) {
        return PagerDutyOutputSchema.parse({ incidents: [] });
      }

      const incidents = (body?.incidents ?? []).map((incident) => ({
        id: incident.id,
        title: incident.title,
        url: incident.html_url,
        status: incident.status,
        createdAt: incident.created_at,
        resolvedAt: incident.resolved_at
      }));

      return PagerDutyOutputSchema.parse({ incidents });
    } catch (error) {
      span.recordException(error);
      throw error;
    } finally {
      span.end();
    }
  });
}

export async function synthesizeReport(input) {
  const payload = SynthesizeReportInputSchema.parse(input);

  return await tracer.startActiveSpan("ai.synthesize_report", async (span) => {
    try {
      const contextText = JSON.stringify(payload.rawContext, null, 2);
      const prompt = `You are OpsNarrative. Summarize the following operational context into a concise report with sections for delivery, incidents, and code changes.\n\nContext:\n${contextText}`;
      const content = await generateWithProvider({
        prompt,
        providerConfig: payload.providerConfig
      });

      return SynthesizeReportOutputSchema.parse({
        content,
        provider: payload.providerConfig.type
      });
    } catch (error) {
      span.recordException(error);
      throw error;
    } finally {
      span.end();
    }
  });
}

export async function sendSlackReport(input) {
  const payload = SlackDeliveryInputSchema.parse(input);

  return await tracer.startActiveSpan("notify.slack", async (span) => {
    try {
      const webhookUrl = payload.webhookUrl ?? process.env.SLACK_WEBHOOK_URL;
      if (!webhookUrl) {
        throw new Error("Slack webhook URL is required");
      }

      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: payload.content })
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Slack delivery failed: ${response.status} ${text}`);
      }

      return SlackDeliveryOutputSchema.parse({
        delivered: true,
        status: response.status
      });
    } catch (error) {
      span.recordException(error);
      throw error;
    } finally {
      span.end();
    }
  });
}

export async function writeLocalReport(input) {
  const payload = LocalDeliveryInputSchema.parse(input);

  return await tracer.startActiveSpan("notify.local", async (span) => {
    try {
      const outputDir = payload.outputDir ?? process.env.ONW_REPORT_OUTPUT_DIR ?? "./out";
      await mkdir(outputDir, { recursive: true });
      const filePath = join(outputDir, `ops-narrative-${Date.now()}.md`);
      await writeFile(filePath, payload.content, "utf-8");

      return LocalDeliveryOutputSchema.parse({
        delivered: true,
        filePath
      });
    } catch (error) {
      span.recordException(error);
      throw error;
    } finally {
      span.end();
    }
  });
}

export async function getWorkflowFlags() {
  return await tracer.startActiveSpan("workflow.flags", async (span) => {
    try {
      return await resolveWorkflowFlags();
    } catch (error) {
      span.recordException(error);
      throw error;
    } finally {
      span.end();
    }
  });
}
