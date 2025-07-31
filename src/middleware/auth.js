const { admin } = require('../config/firebase');

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    console.log('🔐 Token verification attempt:', {
      tokenLength: token.length,
      tokenStart: token.substring(0, 20) + '...',
      timestamp: new Date().toISOString()
    });
    
    // Verify Firebase JWT token
    const decodedToken = await admin.auth().verifyIdToken(token);
    
    console.log('✅ Token verified successfully:', {
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
    console.error('❌ Firebase token verification error:', {
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
    return res.status(500).json({ error: 'Token verification failed' });
  }
};

// Note: Firebase handles token generation on the client side
// This function is no longer needed for Firebase authentication
const generateToken = (userId, username) => {
  throw new Error('Token generation should be handled by Firebase Auth on the client side');
};

module.exports = {
  authenticateToken,
  generateToken
};