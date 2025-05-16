import cookie from 'cookie';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }
  
  // Clear auth cookie
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
  
  res.status(200).json({ message: 'Logout successful' });
}

