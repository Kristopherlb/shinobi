/**
 * Authentication and Authorization Middleware
 * Implements token-based authentication with scoped permissions
 */
import { Request, Response, NextFunction } from 'express';
export interface AuthToken {
    sub: string;
    name: string;
    email: string;
    scopes: string[];
    iat: number;
    exp: number;
}
export interface AuthenticatedRequest extends Request {
    auth?: AuthToken;
}
export interface AuthConfig {
    jwtSecret: string;
    requiredScopes?: string[];
    allowedRoles?: string[];
}
/**
 * Authentication middleware for JWT token validation
 */
export declare function authenticateToken(config: AuthConfig): (req: AuthenticatedRequest, res: Response, next: NextFunction) => any;
/**
 * Authorization middleware for scope-based access control
 */
export declare function requireScopes(requiredScopes: string[]): (req: AuthenticatedRequest, res: Response, next: NextFunction) => any;
/**
 * Admin-only authorization middleware
 */
export declare function requireAdmin(): (req: AuthenticatedRequest, res: Response, next: NextFunction) => any;
/**
 * Read-only access authorization
 */
export declare function requireReadAccess(): (req: AuthenticatedRequest, res: Response, next: NextFunction) => any;
/**
 * Generative access authorization
 */
export declare function requireGenerativeAccess(): (req: AuthenticatedRequest, res: Response, next: NextFunction) => any;
/**
 * Audit logging middleware
 */
export declare function auditLog(action: string): (req: AuthenticatedRequest, res: Response, next: NextFunction) => void;
