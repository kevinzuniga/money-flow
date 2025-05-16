/**
 * Error handling middleware and custom error classes
 * 
 * This module provides centralized error handling for the API,
 * including custom error classes and error formatting.
 */

/**
 * Base API Error class that extends Error with additional properties
 */
export class ApiError extends Error {
  constructor(message, statusCode, errors = null) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 400 Bad Request - Used for invalid input, missing required parameters, etc.
 */
export class BadRequestError extends ApiError {
  constructor(message = 'Bad Request', errors = null) {
    super(message, 400, errors);
  }
}

/**
 * 401 Unauthorized - Used for authentication failures
 */
export class UnauthorizedError extends ApiError {
  constructor(message = 'No autorizado', errors = null) {
    super(message, 401, errors);
  }
}

/**
 * 403 Forbidden - Used for authorization failures (authenticated but not allowed)
 */
export class ForbiddenError extends ApiError {
  constructor(message = 'Acceso prohibido', errors = null) {
    super(message, 403, errors);
  }
}

/**
 * 404 Not Found - Used when resource is not found
 */
export class NotFoundError extends ApiError {
  constructor(message = 'Recurso no encontrado', errors = null) {
    super(message, 404, errors);
  }
}

/**
 * 422 Unprocessable Entity - Used for validation errors
 */
export class ValidationError extends ApiError {
  constructor(message = 'Error de validación', errors = null) {
    super(message, 422, errors);
  }
}

/**
 * 429 Too Many Requests - Used for rate limiting
 */
export class RateLimitError extends ApiError {
  constructor(message = 'Demasiadas solicitudes', errors = null) {
    super(message, 429, errors);
  }
}

/**
 * 500 Internal Server Error - Used for server errors
 */
export class InternalServerError extends ApiError {
  constructor(message = 'Error interno del servidor', errors = null) {
    super(message, 500, errors);
  }
}

/**
 * Log an error with contextual information
 * 
 * @param {Error} error - The error to log
 * @param {Object} req - The request object
 */
export const logError = (error, req = null) => {
  const timestamp = new Date().toISOString();
  const errorType = error.name || 'Error';
  const path = req ? `${req.method} ${req.url}` : 'Unknown path';
  const userId = req && req.userId ? req.userId : 'Unauthenticated';
  
  // Basic error information for the log
  const logData = {
    timestamp,
    errorType,
    message: error.message,
    path,
    userId,
    statusCode: error.statusCode || 500
  };
  
  // Add stack trace in development
  if (process.env.NODE_ENV !== 'production') {
    logData.stack = error.stack;
  }
  
  // Add validation errors if available
  if (error.errors) {
    logData.validationErrors = error.errors;
  }
  
  // Log the error
  console.error('API ERROR:', logData);
};

/**
 * Format an error response to be sent to the client
 * 
 * @param {Error} error - The error to format
 * @param {boolean} includeDetails - Whether to include error details (for development)
 * @returns {Object} - Formatted error response
 */
export const formatErrorResponse = (error, includeDetails = false) => {
  // Default error response
  const errorResponse = {
    success: false,
    message: error.message || 'An unexpected error occurred',
    statusCode: error.statusCode || 500
  };
  
  // Include validation errors if available
  if (error.errors) {
    errorResponse.errors = error.errors;
  }
  
  // Include error details in development
  if (includeDetails && process.env.NODE_ENV !== 'production') {
    errorResponse.stack = error.stack;
    errorResponse.name = error.name;
  }
  
  return errorResponse;
};

/**
 * Error handling middleware for API routes
 * 
 * @param {Error} error - The error that occurred
 * @param {Object} req - The request object
 * @param {Object} res - The response object
 * @returns {Object} - Error response
 */
export const handleApiError = (error, req, res) => {
  // Log the error
  logError(error, req);
  
  // Determine error status code (default to 500)
  const statusCode = error.statusCode || 500;
  
  // Format error response including details in non-production environments
  const errorResponse = formatErrorResponse(
    error,
    process.env.NODE_ENV !== 'production'
  );
  
  // Send error response
  return res.status(statusCode).json(errorResponse);
};

/**
 * Middleware to handle specific types of errors in API routes
 * 
 * @param {Function} handler - The API route handler
 * @returns {Function} - Enhanced handler with error handling
 */
export const withErrorHandling = (handler) => {
  return async (req, res) => {
    try {
      return await handler(req, res);
    } catch (error) {
      return handleApiError(error, req, res);
    }
  };
};

