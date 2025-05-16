/**
 * Centralized error handler for API routes
 * @param {Error} error - The error object
 * @param {Object} res - Express response object
 * @param {string} customMessage - Optional custom error message
 */
export function handleApiError(error, res, customMessage = 'Error interno del servidor') {
  console.error('API Error:', error);
  
  // Send appropriate error response
  return res.status(500).json({
    success: false,
    message: customMessage,
    error: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
}

