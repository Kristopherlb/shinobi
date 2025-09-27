export interface BackupPlan {
  [key: string]: unknown;
}

export interface BackupContext {
  [key: string]: unknown;
}

export interface IBackupRecoveryService {
  createBackupPlan(context: BackupContext): BackupPlan;
}

export class BackupRecoveryService implements IBackupRecoveryService {
  createBackupPlan(_context: BackupContext): BackupPlan {
    return {};
  }
}

export const defaultBackupRecoveryService = new BackupRecoveryService();
