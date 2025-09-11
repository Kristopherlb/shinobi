/**
 * Authentication and Authorization Middleware
 * Implements token-based authentication with scoped permissions
 */

import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

export interface AuthToken {
  sub: string; // Subject (user ID)
  name: string; // User name
  email: string; // User email
  scopes: string[]; // Permissions
  iat: number; // Issued at
  exp: number; // Expires at
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
export function authenticateToken(config: AuthConfig) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ 
        error: 'Access token required',
        message: 'Please provide a valid Bearer token'
      });
    }

    try {
      const decoded = jwt.verify(token, config.jwtSecret) as AuthToken;
      req.auth = decoded;
      next();
    } catch (error) {
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
export function requireScopes(requiredScopes: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.auth) {
      return res.status(401).json({ 
        error: 'Authentication required',
        message: 'Request must be authenticated'
      });
    }

    const userScopes = req.auth.scopes || [];
    const hasRequiredScopes = requiredScopes.every(scope => 
      userScopes.includes(scope) || userScopes.includes('admin:platform')
    );

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
export function requireAdmin() {
  return requireScopes(['admin:platform']);
}

/**
 * Read-only access authorization
 */
export function requireReadAccess() {
  return requireScopes(['read:services', 'generate:components', 'admin:platform']);
}

/**
 * Generative access authorization
 */
export function requireGenerativeAccess() {
  return requireScopes(['generate:components', 'admin:platform']);
}

/**
 * Audit logging middleware
 */
export function auditLog(action: string) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
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