export class GovernanceService {
    resolveGovernance(input) {
        const dataClassification = this.resolveString(input.policy?.logging?.classification, input.logging?.classification, input.serviceLabels?.['data-classification'], input.serviceLabels?.['dataClassification'], input.tags?.['data-classification'], input.tags?.['dataClassification'], 'internal');
        const backupRequired = this.resolveBoolean(input.policy?.governance?.backupRequired, input.logging?.classification === 'cui', input.tags?.['backup-required'], input.tags?.['backupRequired'], true);
        const monitoringLevel = this.resolveString(input.policy?.governance?.monitoringLevel, input.logging?.auditRequired ? 'enhanced' : undefined, input.tags?.['monitoring-level'], input.tags?.['monitoringLevel'], 'standard');
        const auditLoggingRequired = this.resolveBoolean(input.policy?.logging?.auditRequired, input.logging?.auditRequired, input.tags?.['audit-logging-required'], input.tags?.['auditLoggingRequired'], false);
        const logRetentionDays = this.resolveNumber(input.policy?.logging?.retentionDays, input.logging?.retentionDays, input.observability?.logsRetentionDays, 365);
        return {
            dataClassification,
            backupRequired,
            monitoringLevel,
            auditLoggingRequired,
            logRetentionDays
        };
    }
    resolveString(...values) {
        for (const value of values) {
            if (value !== undefined && value !== null) {
                const trimmed = value.toString().trim();
                if (trimmed.length > 0) {
                    return trimmed;
                }
            }
        }
        return '';
    }
    resolveBoolean(...values) {
        for (const value of values) {
            if (value === undefined || value === null) {
                continue;
            }
            if (typeof value === 'boolean') {
                return value;
            }
            const normalized = value.toString().trim().toLowerCase();
            if (['true', '1', 'yes', 'enabled', 'required'].includes(normalized)) {
                return true;
            }
            if (['false', '0', 'no', 'disabled', 'optional', 'recommended'].includes(normalized)) {
                return false;
            }
        }
        return false;
    }
    resolveNumber(...values) {
        for (const value of values) {
            if (value === undefined || value === null) {
                continue;
            }
            if (typeof value === 'number' && Number.isFinite(value)) {
                return value;
            }
            const parsed = Number(value);
            if (Number.isFinite(parsed)) {
                return parsed;
            }
        }
        return 0;
    }
}
export const defaultGovernanceService = new GovernanceService();
//# sourceMappingURL=governance.service.js.map