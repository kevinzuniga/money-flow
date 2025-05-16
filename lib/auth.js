import jwt from 'jsonwebtoken';
import cookie from 'cookie';

/**
 * Authentication middleware that can be reused across API endpoints
 * @param {Object} req - The request object
 * @param {Object} res - The response object
 * @returns {number|null} - The user ID if authenticated, null otherwise
 */
export const authenticate = async (req, res) => {
  try {
    const cookies = cookie.parse(req.headers.cookie || '');
    const token = cookies.token;
    
    if (!token) {
      throw new Error('No authentication token');
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    return decoded.userId;
  } catch (error) {
    res.status(401).json({ message: 'No autorizado' });
    return null;
  }
};

/**
 * Validates transaction input data
 * @param {Object} data - The transaction data
 * @returns {Object} - The validation result with isValid flag and errors
 */
export const validateTransaction = (data) => {
  const { monto, fecha } = data;
  const errors = {};
  
  if (!monto || isNaN(monto) || monto <= 0) {
    errors.monto = 'El monto debe ser un número mayor a cero';
  }
  
  if (!fecha) {
    errors.fecha = 'La fecha es requerida';
  } else {
    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(fecha)) {
      errors.fecha = 'Formato de fecha inválido. Use YYYY-MM-DD';
    } else {
      // Check if it's a valid date
      const dateObj = new Date(fecha);
      if (isNaN(dateObj.getTime())) {
        errors.fecha = 'Fecha inválida';
      }
    }
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Creates a JWT token for a user
 * @param {number} userId - The user's ID
 * @param {string} email - The user's email
 * @returns {string} - The JWT token
 */
export const createToken = (userId, email) => {
  return jwt.sign(
    { 
      userId,
      email
    },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: '8h' }
  );
};

/**
 * Sets the authentication cookie in the response
 * @param {Object} res - The response object
 * @param {string} token - The JWT token
 */
export const setAuthCookie = (res, token) => {
  res.setHeader(
    'Set-Cookie',
    cookie.serialize('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 8 * 60 * 60, // 8 hours
      path: '/',
      sameSite: 'strict',
    })
  );
};

/**
 * Clears the authentication cookie from the response
 * @param {Object} res - The response object
 */
export const clearAuthCookie = (res) => {
  res.setHeader(
    'Set-Cookie',
    cookie.serialize('token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      expires: new Date(0), // Set to epoch to expire immediately
      path: '/',
      sameSite: 'strict',
    })
  );
};
