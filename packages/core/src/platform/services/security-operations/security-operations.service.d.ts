export interface SecurityScanContext {
    [key: string]: unknown;
}
export interface SecurityScanResult {
    [key: string]: unknown;
}
export interface ISecurityOperationsService {
    runPreDeployScans?(context: SecurityScanContext): Promise<SecurityScanResult> | SecurityScanResult;
    runPostDeployScans?(context: SecurityScanContext): Promise<SecurityScanResult> | SecurityScanResult;
    registerIntegration?(integration: unknown): void;
}
export declare class SecurityOperationsService implements ISecurityOperationsService {
    runPreDeployScans?(context: SecurityScanContext): Promise<SecurityScanResult>;
    runPostDeployScans?(context: SecurityScanContext): Promise<SecurityScanResult>;
    registerIntegration?(integration: unknown): void;
}
export declare const defaultSecurityOperationsService: SecurityOperationsService;
//# sourceMappingURL=security-operations.service.d.ts.map