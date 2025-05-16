/**
 * API Router
 * 
 * Provides utilities for consistent API route handling, including
 * middleware application, response formatting, and error handling.
 */

import { withErrorHandling } from '../middleware/error';
import { secureRoute } from '../middleware/auth';

/**
 * Format a successful API response
 * 
 * @param {any} data - The data to include in the response
 * @param {string} message - Optional success message
 * @param {Object} meta - Optional metadata (pagination, etc.)
 * @returns {Object} - Formatted success response
 */
export const formatSuccess = (data, message = null, meta = null) => {
  const response = {
    success: true
  };
  
  if (message) {
    response.message = message;
  }
  
  if (data !== undefined) {
    response.data = data;
  }
  
  if (meta) {
    response.meta = meta;
  }
  
  return response;
};

/**
 * Format a successful paginated API response
 * 
 * @param {Array} items - The array of items
 * @param {number} page - Current page number
 * @param {number} limit - Items per page
 * @param {number} total - Total number of items
 * @param {string} message - Optional success message
 * @returns {Object} - Formatted paginated response
 */
export const formatPaginated = (items, page, limit, total, message = null) => {
  const totalPages = Math.ceil(total / limit);
  
  return formatSuccess(
    { items },
    message,
    {
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    }
  );
};

/**
 * Log API request details
 * 
 * @param {Object} req - The request object
 */
export const logRequest = (req) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    
    if (req.query && Object.keys(req.query).length > 0) {
      console.log('  Query:', req.query);
    }
    
    if (req.body && Object.keys(req.body).length > 0) {
      console.log('  Body:', JSON.stringify(req.body).substring(0, 200));
    }
    
    if (req.userId) {
      console.log('  User:', req.userId);
    }
  }
};

/**
 * Handle CORS pre-flight requests
 * 
 * @param {Object} req - The request object
 * @param {Object} res - The response object
 * @returns {boolean} - True if handled as preflight, false otherwise
 */
export const handleCors = (req, res) => {
  // Set CORS headers for all responses
  res.setHeader('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-CSRF-Token');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  // Handle OPTIONS pre-flight request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return true;
  }
  
  return false;
};

/**
 * Create a route handler with consistent formatting and middleware
 * 
 * @param {Function} handler - The route handler function
 * @param {Object} options - Options for the route
 * @param {boolean} options.auth - Whether auth is required (default: true)
 * @param {string|string[]} options.roles - Required roles, if any
 * @param {boolean} options.cors - Whether to enable CORS (default: true)
 * @param {boolean} options.csrf - Whether to enable CSRF protection (default: true)
 * @param {Object} options.rateLimit - Rate limiting options, if any
 * @returns {Function} - Enhanced route handler
 */
export const createRoute = (handler, options = {}) => {
  // Default options
  const routeOptions = {
    auth: true,
    cors: true,
    csrf: true,
    ...options
  };
  
  // Create middleware stack based on options
  const middleware = secureRoute(routeOptions);
  
  // Return wrapped handler with middleware and error handling
  return withErrorHandling(async (req, res) => {
    try {
      // Handle CORS if enabled
      if (routeOptions.cors && handleCors(req, res)) {
        return;
      }
      
      // Log request
      logRequest(req);
      
      // Apply middleware
      if (middleware.length > 0) {
        // Convert middleware chain to promise
        await new Promise((resolve, reject) => {
          // Track current middleware index
          let currentIndex = 0;
          
          // Create next function that moves to next middleware or resolves
          const next = (error) => {
            if (error) {
              reject(error);
              return;
            }
            
            currentIndex++;
            if (currentIndex >= middleware.length) {
              resolve();
              return;
            }
            
            try {
              middleware[currentIndex](req, res, next);
            } catch (err) {
              reject(err);
            }
          };
          
          // Start middleware chain
          middleware[0](req, res, next);
        });
      }
      
      // Call the actual route handler
      return await handler(req, res);
    } catch (error) {
      // Let withErrorHandling handle any errors
      throw error;
    }
  });
};

/**
 * Register routes with a router
 * 
 * @param {Object} router - Next.js API router
 * @param {Object} routes - Routes configuration
 * @param {Function} routes.GET - GET request handler
 * @param {Function} routes.POST - POST request handler
 * @param {Function} routes.PUT - PUT request handler
 * @param {Function} routes.DELETE - DELETE request handler
 * @param {Object} options - Options for all routes
 * @returns {Function} - Router handler
 */
export const registerRoutes = (routes, options = {}) => {
  // Return Next.js API route handler
  return async (req, res) => {
    const method = req.method || 'GET';
    
    // Check if method is supported
    if (routes[method]) {
      // Create route handler with options
      const handler = createRoute(routes[method], options);
      // Call handler
      return await handler(req, res);
    }
    
    // Method not allowed
    res.setHeader('Allow', Object.keys(routes));
    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });
  };
};

/**
 * Utility to extract query parameters with defaults
 * 
 * @param {Object} query - Next.js query object
 * @param {Object} defaults - Default values for params
 * @returns {Object} - Processed query parameters
 */
export const extractQueryParams = (query, defaults = {}) => {
  const params = { ...defaults };
  
  // Process page and limit for pagination
  if ('page' in query) {
    params.page = parseInt(query.page, 10) || defaults.page || 1;
  }
  
  if ('limit' in query) {
    params.limit = parseInt(query.limit, 10) || defaults.limit || 10;
  }
  
  // Process dates
  if ('startDate' in query && query.startDate) {
    params.startDate = query.startDate;
  }
  
  if ('endDate' in query && query.endDate) {
    params.endDate = query.endDate;
  }
  
  // Process amount filters
  if ('minAmount' in query && query.minAmount) {
    params.minAmount = parseFloat(query.minAmount);
  }
  
  if ('maxAmount' in query && query.maxAmount) {
    params.maxAmount = parseFloat(query.maxAmount);
  }
  
  // Process sorting
  if ('sortBy' in query && query.sortBy) {
    params.sortBy = query.sortBy;
  }
  
  if ('sortDir' in query && query.sortDir) {
    params.sortDir = query.sortDir.toLowerCase() === 'asc' ? 'asc' : 'desc';
  }
  
  // Process other parameters
  for (const key in query) {
    if (!(key in params)) {
      params[key] = query[key];
    }
  }
  
  return params;
};

/**
 * Common request handlers that can be reused across endpoints
 */
export const handlers = {
  /**
   * Create a simple health check route handler
   */
  healthCheck: (req, res) => {
    res.status(200).json(formatSuccess({ status: 'healthy' }, 'API is running'));
  },
  
  /**
   * Create a simple documentation route handler
   */
  documentation: (docData) => (req, res) => {
    res.status(200).json(formatSuccess(docData, 'API documentation'));
  }
};

