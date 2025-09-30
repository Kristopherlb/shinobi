import { IConstruct } from 'constructs';
export interface SecurityComponentAdapter {
    getType(): string;
    getConstruct(handle: string): IConstruct | undefined;
    readonly node: {
        id: string;
    };
}
export interface ISecurityService {
    getSecurityGroupHandle(component: SecurityComponentAdapter, role: 'source' | 'target'): IConstruct;
    sanitizeProperties<T>(input: T, options?: SanitizeOptions): T;
}
export interface SanitizeOptions {
    sensitiveKeys?: string[];
    sensitivePatterns?: Array<string | RegExp>;
    maskValue?: string;
    maxDepth?: number;
}
export declare class SecurityService implements ISecurityService {
    getSecurityGroupHandle(component: SecurityComponentAdapter, role: 'source' | 'target'): IConstruct;
    private resolveSecurityGroup;
    private extractSecurityGroup;
    sanitizeProperties<T>(input: T, options?: SanitizeOptions): T;
}
export declare const defaultSecurityService: SecurityService;
//# sourceMappingURL=security.service.d.ts.map