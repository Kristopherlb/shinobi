export enum RiskTier {
  /** Safe, read-only public. */
  R0_INFO = 'R0',

  /** PII/Internal read. */
  R1_READ_SENSITIVE = 'R1',

  /** Reversible updates. */
  R2_WRITE_MUTABLE = 'R2',

  /** Deletes, irreversible. */
  R3_DESTRUCTIVE = 'R3',
}


