const DEFAULT_SENSITIVE_KEYS = [
    'password',
    'passcode',
    'secret',
    'token',
    'apikey',
    'api-key',
    'accesskey',
    'access-key',
    'privatekey',
    'private-key',
    'credential',
    'credentials',
    'auth',
    'authorization',
    'sessionid',
    'session-id',
    'ssn',
    'accountnumber',
    'account-number',
    'certificate',
    'clientsecret',
    'client-secret'
];
const DEFAULT_SENSITIVE_PATTERNS = [
    /password/i,
    /secret/i,
    /token/i,
    /api[-_]?key/i,
    /access[-_]?key/i,
    /private[-_]?key/i,
    /credential/i,
    /auth/i,
    /session/i
];
export class SecurityService {
    getSecurityGroupHandle(component, role) {
        const componentType = component.getType();
        const securityGroup = this.resolveSecurityGroup(component, componentType);
        if (!securityGroup) {
            throw new Error(`No security group found for ${componentType} component '${component.node.id}'`);
        }
        return securityGroup;
    }
    resolveSecurityGroup(component, componentType) {
        const tryGet = (handle) => component.getConstruct(handle);
        switch (componentType) {
            case 'lambda-api':
            case 'lambda-worker':
                return this.extractSecurityGroup(tryGet('function'));
            case 'ecs-fargate-service':
            case 'ecs-ec2-service':
                return this.extractSecurityGroup(tryGet('service'));
            case 'ec2-instance':
                return this.extractSecurityGroup(tryGet('instance'));
            case 'alb':
            case 'application-load-balancer':
                return this.extractSecurityGroup(tryGet('loadBalancer'));
            case 'rds-database':
                return this.extractSecurityGroup(tryGet('database'));
            default:
                return undefined;
        }
    }
    extractSecurityGroup(construct) {
        return construct?.connections?.securityGroups?.[0];
    }
    sanitizeProperties(input, options = {}) {
        if (input === null || input === undefined) {
            return input;
        }
        const maskValue = options.maskValue ?? '[REDACTED]';
        const maxDepth = options.maxDepth ?? 8;
        const sensitiveKeySet = new Set([...DEFAULT_SENSITIVE_KEYS, ...(options.sensitiveKeys ?? [])].map(key => key.toLowerCase()));
        const sensitivePatterns = [
            ...DEFAULT_SENSITIVE_PATTERNS,
            ...(options.sensitivePatterns ?? []).map(pattern => typeof pattern === 'string' ? new RegExp(pattern, 'i') : pattern)
        ];
        const visited = new WeakSet();
        const sanitize = (value, depth) => {
            if (value === null || value === undefined) {
                return value;
            }
            if (depth > maxDepth) {
                return maskValue;
            }
            if (Array.isArray(value)) {
                return value.map(item => sanitize(item, depth + 1));
            }
            if (value instanceof Date) {
                return value;
            }
            if (typeof value !== 'object') {
                return value;
            }
            if (visited.has(value)) {
                return maskValue;
            }
            visited.add(value);
            const result = {};
            Object.entries(value).forEach(([key, nestedValue]) => {
                const keyLower = key.toLowerCase();
                const isSensitiveKey = sensitiveKeySet.has(keyLower);
                const isSensitivePattern = sensitivePatterns.some(pattern => pattern.test(key));
                if (isSensitiveKey || isSensitivePattern) {
                    result[key] = maskValue;
                }
                else {
                    result[key] = sanitize(nestedValue, depth + 1);
                }
            });
            return result;
        };
        return sanitize(input, 0);
    }
}
export const defaultSecurityService = new SecurityService();
//# sourceMappingURL=security.service.js.map