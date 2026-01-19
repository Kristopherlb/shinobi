export interface IWorkflowContext {
  /** Deterministic time. */
  now(): Date;

  /** Deterministic RNG seeded by the workflow engine. */
  random(): number;

  /** Deterministic sleep handled by the workflow engine. */
  sleep(duration: string): Promise<void>;

  /** Deterministic activity execution boundary. */
  executeActivity<T>(name: string, args: unknown): Promise<T>;
}


