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

export class SecurityOperationsService implements ISecurityOperationsService {
  async runPreDeployScans?(context: SecurityScanContext): Promise<SecurityScanResult> {
    return {};
  }

  async runPostDeployScans?(context: SecurityScanContext): Promise<SecurityScanResult> {
    return {};
  }

  registerIntegration?(integration: unknown): void {}
}

export const defaultSecurityOperationsService = new SecurityOperationsService();
