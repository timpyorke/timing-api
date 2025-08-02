const jwt = require('jsonwebtoken');
const { admin } = require('../config/firebase');

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    // First try JWT token (for admin login)
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'timing_api_jwt_secret_key_2024_secure_random_string_for_production');
      req.user = decoded;
      return next();
    } catch (jwtError) {
      // If JWT fails, try Firebase token
      console.log('🔐 JWT failed, trying Firebase token verification');
    }
    
    console.log('🔐 Firebase token verification attempt:', {
      tokenLength: token.length,
      tokenStart: token.substring(0, 20) + '...',
      timestamp: new Date().toISOString()
    });
    
    // Verify Firebase JWT token
    const decodedToken = await admin.auth().verifyIdToken(token);
    
    console.log('✅ Firebase token verified successfully:', {
      uid: decodedToken.uid,
      email: decodedToken.email,
      exp: decodedToken.exp,
      iat: decodedToken.iat
    });
    
    // Extract user information from Firebase token
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      email_verified: decodedToken.email_verified
    };
    
    next();
  } catch (error) {
    console.debug('my token:', token);
    console.error('❌ Token verification error:', {
      errorCode: error.code,
      errorMessage: error.message,
      tokenLength: token ? token.length : 'undefined',
      timestamp: new Date().toISOString()
    });
    
    if (error.code === 'auth/id-token-expired') {
      return res.status(401).json({ error: 'Token expired' });
    }
    if (error.code === 'auth/argument-error' || error.code === 'auth/invalid-id-token') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
};

const generateToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET || 'timing_api_jwt_secret_key_2024_secure_random_string_for_production', {
    expiresIn: '24h',
  });
};

module.exports = {
  authenticateToken,
  generateToken
};