import { z } from "zod";

export const LinearInputSchema = z.object({
  teamKey: z.string().min(1),
  lookbackHours: z.number().int().positive().default(168)
});

export const LinearIssueSchema = z.object({
  id: z.string(),
  title: z.string(),
  url: z.string().url().optional(),
  completedAt: z.string().optional()
});

export const LinearOutputSchema = z.object({
  issues: z.array(LinearIssueSchema)
});

export const GitOpsInputSchema = z.object({
  providerType: z.enum(["GITLAB", "BITBUCKET"]),
  repoId: z.string().min(1)
});

export const GitOpsChangeSchema = z.object({
  id: z.string(),
  title: z.string(),
  url: z.string().url().optional(),
  mergedAt: z.string().optional(),
  author: z.string().optional()
});

export const GitOpsOutputSchema = z.object({
  changes: z.array(GitOpsChangeSchema)
});

export const PagerDutyInputSchema = z.object({
  serviceId: z.string().min(1),
  lookbackHours: z.number().int().positive().default(168)
});

export const PagerDutyIncidentSchema = z.object({
  id: z.string(),
  title: z.string(),
  url: z.string().url().optional(),
  status: z.string().optional(),
  createdAt: z.string().optional(),
  resolvedAt: z.string().optional()
});

export const PagerDutyOutputSchema = z.object({
  incidents: z.array(PagerDutyIncidentSchema)
});

export const AiProviderConfigSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("BEDROCK"),
    region: z.string().min(1),
    modelId: z.string().min(1)
  }),
  z.object({
    type: z.literal("OLLAMA"),
    host: z.string().min(1),
    model: z.string().min(1)
  }),
  z.object({
    type: z.literal("OPENAI"),
    model: z.string().min(1)
  })
]);

export const SynthesizeReportInputSchema = z.object({
  rawContext: z.record(z.unknown()),
  providerConfig: AiProviderConfigSchema
});

export const SynthesizeReportOutputSchema = z.object({
  content: z.string().min(1),
  provider: z.string().min(1)
});

export const SlackDeliveryInputSchema = z.object({
  content: z.string().min(1),
  webhookUrl: z.string().url().optional()
});

export const SlackDeliveryOutputSchema = z.object({
  delivered: z.boolean(),
  status: z.number().int()
});

export const LocalDeliveryInputSchema = z.object({
  content: z.string().min(1),
  outputDir: z.string().optional()
});

export const LocalDeliveryOutputSchema = z.object({
  delivered: z.boolean(),
  filePath: z.string().min(1)
});

export const WorkflowFlagsSchema = z.object({
  enableLinearSource: z.boolean(),
  enableGitSource: z.boolean(),
  enablePagerDutySource: z.boolean(),
  enableSlackDelivery: z.boolean()
});

export const OpsNarrativeRequestSchema = z.object({
  linear: LinearInputSchema.optional(),
  git: GitOpsInputSchema.optional(),
  pagerDuty: PagerDutyInputSchema.optional(),
  output: z.enum(["SLACK", "LOCAL"]),
  providerConfig: AiProviderConfigSchema
});

export const OpsNarrativeResultSchema = z.object({
  content: z.string(),
  delivery: z.enum(["SLACK", "LOCAL"]),
  artifacts: z.record(z.unknown()).optional()
});
