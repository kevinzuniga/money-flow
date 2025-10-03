import jwt from 'jsonwebtoken';
import cookie from 'cookie';
import db from '../../../lib/db';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  // Check for token in cookies
  const cookies = cookie.parse(req.headers.cookie || '');
  const token = cookies.token;

  if (!token) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    // Get user from database
    const result = await db.query(
      'SELECT id, email, nombre FROM users WHERE id = $1',
      [decoded.userId]
    );

    const user = result.rows[0];
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Add cache control headers to prevent caching
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    
    // Add Vary header to prevent caching based on different request headers
    res.setHeader('Vary', '*');
    
    // Add ETag that's always different to force revalidation
    res.setHeader('ETag', `W/"${Date.now().toString()}"`);
    
    // Log successful authentication
    console.log(`User authenticated: ${user.email} (${user.id}) at ${new Date().toISOString()}`);
    
    // Add a timestamp to ensure the response is always unique
    res.status(200).json({ 
      user,
      timestamp: new Date().toISOString(),
      requestId: Date.now().toString(),
      fresh: true
    });
  } catch (error) {
    // More detailed error logging
    console.error('Authentication error:', {
      message: error.message,
      name: error.name,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      token: token ? token.substring(0, 10) + '...' : 'none', // Only log part of token for security
      timestamp: new Date().toISOString()
    });
    
    // Clear invalid token
    res.setHeader(
      'Set-Cookie',
      cookie.serialize('token', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        expires: new Date(0),
        path: '/',
        sameSite: 'strict',
      })
    );
    
    // Add cache control headers for error responses as well
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Vary', '*');
    res.setHeader('ETag', `W/"${Date.now().toString()}"`);
    
    res.status(401).json({ 
      message: 'Invalid or expired token',
      timestamp: new Date().toISOString(),
      requestId: Date.now().toString(),
      error: process.env.NODE_ENV === 'development' ? error.message : 'Authentication failed'
    });
  }
}
