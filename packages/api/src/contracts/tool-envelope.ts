export type UUID = string;
export type Iso8601String = string;

export interface ToolCallEnvelope<T = unknown> {
  /** Unique ID for this tool call (UUID). */
  id: UUID;

  /** Distributed trace ID (UUID). */
  trace_id: UUID;

  /** Parent event/tool call ID (UUID). */
  causation_id: UUID;

  /** Principal identifier (user/service identity). */
  principal_id: string;

  /** Tool name; intended to match the capability manifest id. */
  tool_name: string;

  /** Tool arguments payload. */
  arguments: T;

  /** Idempotency key for safe retries. */
  idempotency_key: string;

  /** Event timestamp (ISO8601). */
  timestamp: Iso8601String;
}


