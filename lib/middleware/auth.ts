/**
 * Authentication Middleware
 * 
 * Provides authentication and authorization middleware
 * for securing API routes, including JWT validation, role-based
 * access control, and rate limiting.
 */

import { NextApiRequest, NextApiResponse } from 'next';
import jwt from 'jsonwebtoken';
import cookie from 'cookie';
import crypto from 'crypto';
import Redis from 'ioredis';
import { z } from 'zod';
import { UnauthorizedError, ForbiddenError, RateLimitError } from '../errors';

// Environment validation
const envSchema = z.object({
  JWT_SECRET: z.string().min(32).default('this-is-a-default-key-minimum-32-chars'),
  REDIS_URL: z.string().url().optional(),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  SESSION_TIMEOUT: z.string().transform(Number).default('3600'), // 1 hour in seconds
});

// Try to parse environment, fall back to defaults if needed
const env = envSchema.parse(process.env);

// Redis client for rate limiting and session management
let redis: Redis;
try {
  redis = env.REDIS_URL
    ? new Redis(env.REDIS_URL)
    : new Redis({
        host: 'localhost',
        port: 6379,
        maxRetriesPerRequest: 3,
      });
  
  // Log successful connection
  redis.on('connect', () => {
    console.log('Connected to Redis successfully');
  });
  
  // Handle Redis errors
  redis.on('error', (error) => {
    console.error('Redis connection error:', error);
    // Fallback to in-memory store for development
    if (env.NODE_ENV !== 'production') {
      console.warn('Using in-memory store as Redis fallback');
    }
  });
} catch (error) {
  console.error('Failed to initialize Redis:', error);
  // Continue without Redis in development
  if (env.NODE_ENV === 'production') {
    throw error;
  }
}

// In-memory fallback store (for development only)
const memoryStore = {
  sessions: new Map<string, string>(),
  rateLimits: new Map<string, { count: number, expiry: number }>(),
};

// Types
export interface AuthenticatedRequest extends NextApiRequest {
  userId: string;
  userEmail: string;
  userRoles: string[];
  session?: {
    id: string;
    isValid: boolean;
    lastAccessed: Date;
  };
}

interface JWTPayload {
  userId: string;
  email: string;
  roles?: string[];
  sessionId?: string;
  iat?: number;
  exp?: number;
}

interface RateLimitOptions {
  maxRequests?: number;
  windowMs?: number;
  keyGenerator?: (req: NextApiRequest) => string;
}

type NextApiHandler = (req: AuthenticatedRequest, res: NextApiResponse) => Promise<void>;
type Middleware = (req: AuthenticatedRequest, res: NextApiResponse, next: () => void) => Promise<void>;

/**
 * Extract JWT token from request
 */
export const extractToken = (req: NextApiRequest): string | null => {
  // Check authorization header
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  // Check cookies
  const cookies = cookie.parse(req.headers.cookie || '');
  return cookies.token || null;
};

/**
 * Verify and decode JWT token
 */
export const verifyToken = (token: string): JWTPayload => {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as JWTPayload;
    
    // Additional validation
    if (!decoded.userId || !decoded.email) {
      throw new UnauthorizedError('Token inválido: falta información requerida');
    }
    
    return decoded;
  } catch (error) {
    throw new UnauthorizedError('Token inválido o expirado');
  }
};

/**
 * Generate a secure session ID
 */
const generateSessionId = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Store session in Redis or memory
 */
const storeSession = async (sessionId: string, userId: string): Promise<void> => {
  const sessionData = JSON.stringify({
    userId,
    createdAt: new Date().toISOString(),
    lastAccessed: new Date().toISOString(),
  });

  if (redis) {
    await redis.setex(
      `session:${sessionId}`,
      env.SESSION_TIMEOUT,
      sessionData
    );
  } else {
    // Fallback to memory store
    memoryStore.sessions.set(sessionId, sessionData);
    // Set expiry
    setTimeout(() => {
      memoryStore.sessions.delete(sessionId);
    }, env.SESSION_TIMEOUT * 1000);
  }
};

/**
 * Validate session from Redis or memory
 */
const validateSession = async (sessionId: string, userId: string): Promise<boolean> => {
  let sessionData: string | null = null;
  
  if (redis) {
    sessionData = await redis.get(`session:${sessionId}`);
  } else {
    sessionData = memoryStore.sessions.get(sessionId) || null;
  }
  
  if (!sessionData) return false;
  
  try {
    const parsed = JSON.parse(sessionData);
    return parsed.userId === userId;
  } catch {
    return false;
  }
};

/**
 * Authentication middleware
 */
export const authenticate = async (
  req: AuthenticatedRequest,
  res: NextApiResponse
): Promise<string> => {
  try {
    const token = extractToken(req);
    if (!token) {
      throw new UnauthorizedError('No se proporcionó token de autenticación');
    }
    
    const decoded = verifyToken(token);
    
    // Validate session if exists
    if (decoded.sessionId) {
      const isValidSession = await validateSession(decoded.sessionId, decoded.userId);
      if (!isValidSession) {
        throw new UnauthorizedError('Sesión inválida o expirada');
      }
    }
    
    // Add user info to request
    req.userId = decoded.userId;
    req.userEmail = decoded.email;
    req.userRoles = decoded.roles || ['user'];
    
    return decoded.userId;
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      throw error;
    }
    throw new UnauthorizedError(`Autenticación fallida: ${error.message}`);
  }
};

/**
 * Role-based access control middleware
 */
export const requireRoles = (roles: string | string[]): Middleware => {
  const requiredRoles = Array.isArray(roles) ? roles : [roles];
  
  return async (req: AuthenticatedRequest, res: NextApiResponse, next: () => void) => {
    try {
      await authenticate(req, res);
      
      const hasRequiredRole = req.userRoles.some(role => 
        requiredRoles.includes(role) || role === 'admin'
      );
      
      if (!hasRequiredRole) {
        throw new ForbiddenError('No tienes permisos para realizar esta acción');
      }
      
      next();
    } catch (error) {
      throw error;
    }
  };
};

/**
 * Rate limiting using Redis or memory
 */
export const rateLimiter = (options: RateLimitOptions = {}): Middleware => {
  const {
    maxRequests = 100,
    windowMs = 60 * 1000,
    keyGenerator = (req) => req.ip || req.headers['x-forwarded-for'] as string || 'unknown'
  } = options;
  
  return async (req: AuthenticatedRequest, res: NextApiResponse, next: () => void) => {
    const key = `ratelimit:${keyGenerator(req)}`;
    let currentRequests = 0;
    
    try {
      if (redis) {
        // Use Redis for rate limiting
        const [current] = await redis
          .multi()
          .incr(key)
          .expire(key, Math.floor(windowMs / 1000))
          .exec();
        
        currentRequests = (current?.[1] as number) || 0;
      } else {
        // Fallback to memory store
        const now = Date.now();
        const record = memoryStore.rateLimits.get(key);
        
        if (record && record.expiry > now) {
          currentRequests = record.count + 1;
        } else {
          currentRequests = 1;
        }
        
        memoryStore.rateLimits.set(key, {
          count: currentRequests,
          expiry: now + windowMs
        });
      }
      
      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - currentRequests));
      res.setHeader('X-RateLimit-Reset', Math.ceil(windowMs / 1000));
      
      if (currentRequests > maxRequests) {
        throw new RateLimitError(
          `Demasiadas solicitudes. Intente de nuevo en ${Math.ceil(windowMs / 1000)} segundos.`
        );
      }
      
      next();
    } catch (error) {
      if (error instanceof RateLimitError) {
        throw error;
      }
      throw new Error(`Rate limiting error: ${error.message}`);
    }
  };
};

/**
 * CSRF protection middleware
 */
export const csrfProtection: Middleware = async (req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method || '')) {
    return next();
  }
  
  try {
    const csrfToken = (req.headers['x-csrf-token'] as string) || req.body?._csrf;
    const cookies = cookie.parse(req.headers.cookie || '');
    const storedToken = cookies.csrfToken;
    
    if (!csrfToken || !storedToken) {
      throw new ForbiddenError('CSRF token faltante');
    }
    
    // Use timing-safe comparison to prevent timing attacks
    let isValid = false;
    try {
      isValid = crypto.timingSafeEqual(
        Buffer.from(csrfToken),
        Buffer.from(storedToken)
      );
    } catch {
      isValid = false;
    }
    
    if (!isValid) {
      throw new ForbiddenError('CSRF token inválido');
    }
    
    next();
  } catch (error) {
    if (error instanceof ForbiddenError) {
      throw error;
    }
    throw new ForbiddenError(`CSRF validation error: ${error.message}`);
  }
};

/**
 * Generate CSRF token
 */
export const generateCsrfToken = (res: NextApiResponse): string => {
  const token = crypto.randomBytes(32).toString('hex');
  
  res.setHeader(
    'Set-Cookie',
    cookie.serialize('csrfToken', token, {
      httpOnly: false,
      secure: env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60,
      path: '/',
      sameSite: 'strict',
    })
  );
  
  return token;
};

/**
 * Create a new session and return token
 */
export const createSession = async (userId: string, email: string, roles: string[] = ['user']): Promise<string> => {
  const sessionId = generateSessionId();
  await storeSession(sessionId, userId);
  
  const token = jwt.sign(
    { 
      userId,
      email,
      roles,
      sessionId
    },
    env.JWT_SECRET,
    { expiresIn: '24h' }
  );
  
  return token;
};

/**
 * Combined security middleware
 */
interface SecurityOptions {
  rateLimit?: RateLimitOptions | false;
  csrf?: boolean;
  auth?: boolean;
  roles?: string | string[];
}

export const secureRoute = (options: SecurityOptions = {}): Middleware[] => {
  const middleware: Middleware[] = [];
  
  if (options.rateLimit !== false) {
    middleware.push(rateLimiter(options.rateLimit));
  }
  
  if (options.csrf !== false) {
    middleware.push(csrfProtection);
  }
  
  if (options.auth !== false) {
    middleware.push(async (req, res, next) => {
      await authenticate(req, res);
      next();
    });
  }
  
  if (options.roles) {
    middleware.push(requireRoles(options.roles));
  }
  
  return middleware;
};

/**
 * Helper to apply middleware chain
 */
export const applyMiddleware = (handler: NextApiHandler, middlewares: Middleware[]) => {
  return async (req: AuthenticatedRequest, res: NextApiResponse): Promise<void> => {
    try {
      await middlewares.reduce(
        (promise, middleware) => 
          promise.then(() => new Promise((resolve) => middleware(req, res, resolve))),
        Promise.resolve()
      );
      
      await handler(req, res);
    } catch (error) {
      // Pass to error handler
      throw error;
    }
  };
};

/**
 * Logout user by invalidating session
 */
export const logout = async (req: AuthenticatedRequest): Promise<boolean> => {
  try {
    const token = extractToken(req);
    if (!token) return false;
    
    const decoded = verifyToken(token);
    if (!decoded.sessionId) return false;
    
    if (redis) {
      await redis.del(`session:${decoded.sessionId}`);
    } else {
      memoryStore.sessions.delete(decoded.sessionId);
    }
    
    return true;
  } catch {
    return false;
  }
};

/**
 * Graceful shutdown - close Redis connection
 */
export const shutdown = async (): Promise<void> => {
  if (redis) {
    await redis.quit();
    console.log('Redis connection closed');
  }
};

