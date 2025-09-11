"use strict";
/**
 * Authentication and Authorization Middleware
 * Implements token-based authentication with scoped permissions
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateToken = authenticateToken;
exports.requireScopes = requireScopes;
exports.requireAdmin = requireAdmin;
exports.requireReadAccess = requireReadAccess;
exports.requireGenerativeAccess = requireGenerativeAccess;
exports.auditLog = auditLog;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
/**
 * Authentication middleware for JWT token validation
 */
function authenticateToken(config) {
    return (req, res, next) => {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
        if (!token) {
            return res.status(401).json({
                error: 'Access token required',
                message: 'Please provide a valid Bearer token'
            });
        }
        try {
            const decoded = jsonwebtoken_1.default.verify(token, config.jwtSecret);
            req.auth = decoded;
            next();
        }
        catch (error) {
            return res.status(403).json({
                error: 'Invalid token',
                message: 'Token is invalid or expired'
            });
        }
    };
}
/**
 * Authorization middleware for scope-based access control
 */
function requireScopes(requiredScopes) {
    return (req, res, next) => {
        if (!req.auth) {
            return res.status(401).json({
                error: 'Authentication required',
                message: 'Request must be authenticated'
            });
        }
        const userScopes = req.auth.scopes || [];
        const hasRequiredScopes = requiredScopes.every(scope => userScopes.includes(scope) || userScopes.includes('admin:platform'));
        if (!hasRequiredScopes) {
            return res.status(403).json({
                error: 'Insufficient permissions',
                message: `Required scopes: ${requiredScopes.join(', ')}`,
                userScopes
            });
        }
        next();
    };
}
/**
 * Admin-only authorization middleware
 */
function requireAdmin() {
    return requireScopes(['admin:platform']);
}
/**
 * Read-only access authorization
 */
function requireReadAccess() {
    return requireScopes(['read:services', 'generate:components', 'admin:platform']);
}
/**
 * Generative access authorization
 */
function requireGenerativeAccess() {
    return requireScopes(['generate:components', 'admin:platform']);
}
/**
 * Audit logging middleware
 */
function auditLog(action) {
    return (req, res, next) => {
        // Log the API access for compliance audit trails
        const auditEntry = {
            timestamp: new Date().toISOString(),
            action,
            actor: req.auth ? {
                id: req.auth.sub,
                name: req.auth.name,
                email: req.auth.email
            } : null,
            request: {
                method: req.method,
                path: req.path,
                query: req.query,
                ip: req.ip,
                userAgent: req.headers['user-agent']
            }
        };
        // In a real implementation, this would be sent to a centralized audit log
        console.log('[AUDIT]', JSON.stringify(auditEntry));
        next();
    };
}
