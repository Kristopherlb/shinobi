import type { ToolCallEnvelope } from '@shinobi/api';

export interface FrozenPlan {
  plan_id: string;
  original_intent: string;
  steps: PlanStep[];
}

export interface PlanStep {
  step_id: string;
  tool_call: ToolCallEnvelope;
  dependencies: string[];
}

/**
 * Invariant: This structure must be immutable once created.
 * No dynamic function calls allowed.
 */


