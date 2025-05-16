/**
 * Authentication Middleware
 * 
 * This module provides authentication and authorization middleware
 * for securing API routes, including JWT validation, role-based
 * access control, and rate limiting.
 */

import jwt from 'jsonwebtoken';
import cookie from 'cookie';
import crypto from 'crypto';
import { UnauthorizedError, ForbiddenError, RateLimitError } from './error';

// In-memory cache for rate limiting (use Redis in production)
const rateLimit = {
  requests: {},
  tokens: {}
};

/**
 * Extract JWT token from request
 * 
 * @param {Object} req - The request object
 * @returns {string|null} - JWT token or null if not found
 */
export const extractToken = (req) => {
  // Check authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  // Check cookies
  const cookies = cookie.parse(req.headers.cookie || '');
  if (cookies.token) {
    return cookies.token;
  }
  
  return null;
};

/**
 * Verify and decode JWT token
 * 
 * @param {string} token - JWT token to verify
 * @returns {Object} - Decoded token payload
 * @throws {UnauthorizedError} - If token is invalid
 */
export const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
  } catch (error) {
    throw new UnauthorizedError('Token inválido o expirado');
  }
};

/**
 * Authentication middleware - validates JWT token and adds user info to request
 * 
 * @param {Object} req - The request object
 * @param {Object} res - The response object
 * @param {Function} next - The next middleware function
 * @returns {Promise<void>} - Calls next() if authentication is successful
 * @throws {UnauthorizedError} - If authentication fails
 */
export const authenticate = async (req, res) => {
  try {
    // Extract token
    const token = extractToken(req);
    
    if (!token) {
      throw new UnauthorizedError('No se proporcionó token de autenticación');
    }
    
    // Verify token
    const decoded = verifyToken(token);
    
    // Add user info to request
    req.userId = decoded.userId;
    req.userEmail = decoded.email;
    req.userRoles = decoded.roles || ['user'];
    
    return decoded.userId;
  } catch (error) {
    // If error is already an UnauthorizedError, pass it through
    if (error instanceof UnauthorizedError) {
      throw error;
    }
    
    // Otherwise, wrap it in an UnauthorizedError
    throw new UnauthorizedError('Autenticación fallida: ' + error.message);
  }
};

/**
 * Role-based access control middleware
 * 
 * @param {string|string[]} roles - Required role(s) for access
 * @returns {Function} - Middleware function
 */
export const requireRoles = (roles) => {
  // Convert single role to array
  const requiredRoles = Array.isArray(roles) ? roles : [roles];
  
  return async (req, res, next) => {
    try {
      // First authenticate the user
      await authenticate(req, res);
      
      // Check if user has required role(s)
      const hasRequiredRole = req.userRoles.some(role => 
        requiredRoles.includes(role) || role === 'admin'
      );
      
      if (!hasRequiredRole) {
        throw new ForbiddenError('No tienes permisos para realizar esta acción');
      }
      
      // User has required role, proceed
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Rate limiting middleware to prevent abuse
 * 
 * @param {Object} options - Rate limiting options
 * @param {number} options.maxRequests - Maximum requests per window (default: 100)
 * @param {number} options.windowMs - Time window in milliseconds (default: 60000)
 * @param {string} options.keyGenerator - Function to generate cache key (default: IP address)
 * @returns {Function} - Middleware function
 */
export const rateLimiter = (options = {}) => {
  const {
    maxRequests = 100,
    windowMs = 60 * 1000, // 1 minute
    keyGenerator = (req) => req.ip || req.headers['x-forwarded-for'] || 'unknown'
  } = options;
  
  return (req, res, next) => {
    try {
      // Generate cache key
      const key = keyGenerator(req);
      
      // Initialize or get current requests count
      if (!rateLimit.requests[key]) {
        rateLimit.requests[key] = {
          count: 0,
          resetAt: Date.now() + windowMs
        };
        
        // Set timeout to reset count after window expires
        setTimeout(() => {
          delete rateLimit.requests[key];
        }, windowMs);
      }
      
      // Check if over limit
      if (rateLimit.requests[key].count >= maxRequests) {
        // Calculate remaining time until reset
        const resetIn = rateLimit.requests[key].resetAt - Date.now();
        
        // Set rate limit headers
        res.setHeader('X-RateLimit-Limit', maxRequests);
        res.setHeader('X-RateLimit-Remaining', 0);
        res.setHeader('X-RateLimit-Reset', Math.ceil(resetIn / 1000));
        
        throw new RateLimitError(
          `Demasiadas solicitudes. Intente de nuevo en ${Math.ceil(resetIn / 1000)} segundos.`
        );
      }
      
      // Increment request count
      rateLimit.requests[key].count++;
      
      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader(
        'X-RateLimit-Remaining', 
        Math.max(0, maxRequests - rateLimit.requests[key].count)
      );
      res.setHeader(
        'X-RateLimit-Reset', 
        Math.ceil((rateLimit.requests[key].resetAt - Date.now()) / 1000)
      );
      
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * CSRF protection middleware
 * 
 * @param {Object} req - The request object
 * @param {Object} res - The response object
 * @param {Function} next - The next middleware function
 */
export const csrfProtection = (req, res, next) => {
  // Skip CSRF check for GET, HEAD, OPTIONS requests
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }
  
  try {
    // Get CSRF token from header or form
    const csrfToken = req.headers['x-csrf-token'] || req.body?._csrf;
    
    // Get user's stored CSRF token from session/cookie
    const cookies = cookie.parse(req.headers.cookie || '');
    const storedToken = cookies.csrfToken;
    
    // Validate CSRF token
    if (!csrfToken || !storedToken || csrfToken !== storedToken) {
      throw new ForbiddenError('CSRF token inválido o faltante');
    }
    
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Generate a CSRF token for a user
 * 
 * @param {Object} res - The response object
 * @returns {string} - Generated CSRF token
 */
export const generateCsrfToken = (res) => {
  // Generate random token
  const token = crypto.randomBytes(32).toString('hex');
  
  // Set CSRF cookie (HTTP-only: false so JS can read it)
  res.setHeader(
    'Set-Cookie',
    cookie.serialize('csrfToken', token, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60, // 24 hours
      path: '/',
      sameSite: 'strict',
    })
  );
  
  return token;
};

/**
 * Session validation middleware
 * 
 * @param {Object} req - The request object
 * @param {Object} res - The response object
 * @param {Function} next - The next middleware function
 */
export const validateSession = async (req, res, next) => {
  try {
    // Extract user ID from token
    await authenticate(req, res);
    
    // In a real app, you would check if session is valid in database
    // For simplicity, we'll just check if the token exists
    
    // Add session info to request
    req.session = {
      isValid: true,
      userId: req.userId,
      lastAccessed: new Date()
    };
    
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Combined middleware that applies multiple security features
 * 
 * @param {Object} options - Options for security features
 * @returns {Function[]} - Array of middleware functions
 */
export const secureRoute = (options = {}) => {
  const middleware = [];
  
  // Apply rate limiting if enabled
  if (options.rateLimit !== false) {
    middleware.push(rateLimiter(options.rateLimit));
  }
  
  // Apply CSRF protection if enabled
  if (options.csrf !== false) {
    middleware.push(csrfProtection);
  }
  
  // Apply authentication middleware if enabled
  if (options.auth !== false) {
    middleware.push(validateSession);
  }
  
  // Apply role-based access control if roles are specified
  if (options.roles) {
    middleware.push(requireRoles(options.roles));
  }
  
  return middleware;
};

