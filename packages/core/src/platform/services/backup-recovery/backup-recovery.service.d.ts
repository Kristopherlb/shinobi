export interface BackupPlan {
    [key: string]: unknown;
}
export interface BackupContext {
    [key: string]: unknown;
}
export interface IBackupRecoveryService {
    createBackupPlan(context: BackupContext): BackupPlan;
}
export declare class BackupRecoveryService implements IBackupRecoveryService {
    createBackupPlan(_context: BackupContext): BackupPlan;
}
export declare const defaultBackupRecoveryService: BackupRecoveryService;
//# sourceMappingURL=backup-recovery.service.d.ts.map